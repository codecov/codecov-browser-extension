import React from "dom-chef";
import _ from "lodash";

import "src/basscss.css";
import { displayChange } from "src/utils";
import { Consent, CoverageStatus, PullCoverageReport } from "src/types";
import {
  animateAndAnnotateLines,
  clearAnimation,
  clearAnnotations,
} from "../common/animation";
import { oldLineSelector, newLineSelector } from "./constants";
import { colors } from "../common/constants";
import { print } from "src/utils";
import { getConsent, getPRReport } from "../common/fetchers";
import { isPrUrl } from "../common/utils";
import { initSentry } from "src/content/common/sentry";

const globals: {
  coverageReport?: PullCoverageReport;
} = {};

let Sentry: ReturnType<typeof initSentry> = undefined;
let consent: Consent = "none";

async function init(): Promise<void> {
  consent = await getConsent();

  Sentry = initSentry(consent);

  return main();
}

async function main() {
  try {
    if (consent === "none") {
      // No data consent, do nothing.
      return;
    }

    document.addEventListener("soft-nav:end", execute);
    await execute();
  } catch (e) {
    if (Sentry) {
      Sentry.captureException(e);
    }
    throw e;
  }
}

async function execute() {
  if (!isPrUrl(document.URL)) {
    print("PR not detected at current URL");
    return;
  }

  const urlMetadata = getMetadataFromURL();

  if (!urlMetadata) {
    print("PR not detected at current URL");
    return;
  }

  createContainer();

  const coverageReport = await getPRReport(urlMetadata);
  if (
    !coverageReport?.files ||
    !coverageReport?.totals?.base?.coverage ||
    !coverageReport?.totals?.head?.coverage ||
    !coverageReport?.totals?.patch?.coverage
  ) {
    showError();
    return;
  }

  const base = coverageReport.totals.base.coverage;
  const head = coverageReport.totals.head.coverage;
  const patch = coverageReport.totals.patch.coverage;
  const change = head - base;

  updateContainer(head, patch, change);

  globals.coverageReport = transformReport(coverageReport.files);

  annotateLines();
}

function isNewExperience() {
  const toolbar = document.querySelector(
    "section[class*=' PullRequestFilesToolbar-module__toolbar']"
  );
  return !!toolbar;
}

function createContainer() {
  const element = (
    <div className="ml-auto" id="coverage-report-data">
      <div className="ml-auto mr-6">Loading coverage report...</div>
    </div>
  );

  if (!isNewExperience()) {
    // Old experience
    const parent = document
      .getElementsByClassName("pr-review-tools")
      .item(0)?.parentElement;

    parent?.insertBefore(element, parent.lastElementChild);

    return;
  }

  // New experience code
  const parent = document.querySelector(
    "section[class*=' PullRequestFilesToolbar-module__toolbar']"
  )!;

  parent.insertBefore(element, parent.lastChild!);
}

function getMetadataFromURL(): { [key: string]: string } | null {
  const regexp = /\/(?<owner>.+?)\/(?<repo>.+?)\/pull\/(?<id>\d+?)\/files/;
  const matches = regexp.exec(window.location.pathname);
  const groups = matches?.groups;
  if (!groups) {
    return null;
  }
  return groups;
}

const handleToggleClick: React.MouseEventHandler = (event) => {
  const button = event.target as HTMLElement;
  const isInactive = button.getAttribute("data-inactive");
  if (isInactive == "true") {
    annotateLines();
    button.removeAttribute("data-inactive");
    button.innerText = "Hide Coverage";
  } else {
    clearAnimationAndAnnotations();
    button.setAttribute("data-inactive", "true");
    button.innerText = "Show Coverage";
  }
};

function updateContainer(head: number, patch: number, change: number) {
  const parent = document.getElementById("coverage-report-data");

  const element = (
    <div className="codecov-flex codecov-items-center">
      <div className="codecov-mr2">
        Head: <strong>{head.toFixed(2)}%</strong>
      </div>
      <div className="codecov-mx2">
        Patch: <strong>{patch.toFixed(2)}%</strong>
      </div>
      <div className="codecov-mx2">
        Change: <strong>{displayChange(change)}%</strong>
      </div>
      <button className="btn btn-sm ml-2" onClick={handleToggleClick}>
        Hide Coverage
      </button>
    </div>
  );

  parent?.replaceChildren(element);
}

function showError() {
  const parent = document.getElementById("coverage-report-data");

  const element = (
    <div className="my-auto mr-6">Coverage report not available</div>
  );

  parent?.replaceChildren(element);
}

function transformReport(filesReport: any) {
  let result = filesReport;
  result = result
    // remove unaffected files
    .filter((file: any) => file.has_diff)
    .map((file: any) => {
      // only keep lines that were added
      const addedLines = file.lines.filter((line: any) => line.added);
      // convert lines array to object (line_number => line)
      const lineDict = _.keyBy(addedLines, (line: any) => line.number.head);
      return Object.assign(file, {
        lines: lineDict,
      });
    });
  result = _.keyBy(result, (o) => o.name.head);
  return result;
}

function annotateLines() {
  if (!isNewExperience()) {
    // old selector/annotation logic
    animateAndAnnotateLines(oldLineSelector, oldAnnotateLine);
  } else {
    // new selector/annotation logic
    animateAndAnnotateLines(newLineSelector, newAnnotateLine);
  }
}

function clearAnimationAndAnnotations() {
  if (!isNewExperience()) {
    // old selector/annotation logic
    clearAnimation(oldLineSelector, oldAnnotateLine);
    clearAnnotations((line: HTMLElement) => (line.style.boxShadow = "inherit"));
  } else {
    // new selector/annotation logic
    clearAnimation(newLineSelector, newAnnotateLine);
    clearAnnotations((line: HTMLElement) => {
      if (line.children.length < 3) {
        return;
      }
      let child = line.lastElementChild as HTMLElement;
      if (child.style.boxShadow !== "inherit") {
        child.style.boxShadow = "inherit";
        return;
      }
    });
  }
}

function oldAnnotateLine(line: HTMLElement) {
  if (line.getAttribute("data-split-side") === "left") {
    // split diff view: ignore deleted line
    return;
  }
  const lineNumber = line.parentElement
    ?.querySelector(".js-blob-rnum")
    ?.getAttribute("data-line-number");
  if (!lineNumber) {
    // unified diff view: ignore deleted line
    return;
  }
  const fileNameContainer = line.closest(".js-file")!;
  const fileName = fileNameContainer.getAttribute("data-tagsearch-path")!;
  const status =
    globals.coverageReport![fileName]?.lines[lineNumber]?.coverage["head"];
  if (status == null) {
    return;
  }
  const borderStylePrefix = "inset 2px 0 ";
  if (status === CoverageStatus.COVERED) {
    line.style.boxShadow = `${borderStylePrefix} ${colors.green}`;
  } else if (status === CoverageStatus.UNCOVERED) {
    line.style.boxShadow = `${borderStylePrefix} ${colors.red}`;
  } else if (status === CoverageStatus.PARTIAL) {
    line.style.boxShadow = `${borderStylePrefix} ${colors.yellow}`;
  } else {
    line.style.boxShadow = "inherit";
  }
}

function newAnnotateLine(line: HTMLElement) {
  const secondChild = line.children[1];
  const thirdChild = line.children[2];

  if (!secondChild || !thirdChild) {
    return;
  }

  // If the second child of the row is a line number cell (possibly empty), we're looking at a unified diff.
  const isUnifiedDiff = line
    .querySelectorAll("td[class*=' diff-line-number']")
    .values()
    .toArray()
    .includes(secondChild);

  // New line number cell is in cell 2 in a unified diff and cell 3 in a split diff.
  const newLineNumberCell = isUnifiedDiff ? secondChild : thirdChild;

  // We want to ignore deleted lines.
  // If the new line number cell does not contain a line number, then the line was deleted.
  if (!newLineNumberCell.textContent) {
    return;
  }

  // This is not a deleted line, grab the line number and find coverage value.
  const lineNumber = newLineNumberCell.textContent;

  // Get the file name.
  // Up to the shared root of the file section then down to the file header
  //
  // For some reason the text content here contains three invisible bytes
  // adding up to one utf-8 character, which we need to remove.
  //
  // >> e = new TextEncoder()
  // >> e.encode(newLineNumberCell.textContent)
  // Uint8Array(59) [ 226, 128, 142, 97, 112, 112, 115, 47, 119, 111, … ]
  // >> e.encode("apps/worker/services/test_analytics/ta_process_flakes.py")
  // Uint8Array(56) [ 97, 112, 112, 115, 47, 119, 111, 114, 107, 101, … ]
  // >> e.encode(newLineNumberCell.textContent.slice(1))
  // Uint8Array(56) [ 97, 112, 112, 115, 47, 119, 111, 114, 107, 101, … ]
  //
  // Idk why these are here, but we can just remove them.

  const fileNameContainer = line
    .closest("div[class^='Diff-module__diffTargetable']")
    ?.querySelector("h3[class^='DiffFileHeader-module__file-name']");
  const fileName = fileNameContainer?.textContent?.slice(1);
  if (!fileName) {
    return;
  }

  const status =
    globals.coverageReport?.[fileName]?.lines[lineNumber]?.coverage["head"];
  if (status == null) {
    return;
  }

  const lineContentCell = newLineNumberCell.nextSibling as HTMLElement;
  const borderStylePrefix = "inset 2px 0 ";
  if (status === CoverageStatus.COVERED) {
    lineContentCell.style.boxShadow = `${borderStylePrefix} ${colors.green}`;
  } else if (status === CoverageStatus.UNCOVERED) {
    lineContentCell.style.boxShadow = `${borderStylePrefix} ${colors.red}`;
  } else if (status === CoverageStatus.PARTIAL) {
    lineContentCell.style.boxShadow = `${borderStylePrefix} ${colors.yellow}`;
  } else {
    lineContentCell.style.boxShadow = "inherit";
  }
}

await init();
