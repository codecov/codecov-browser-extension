import React from "dom-chef";
import browser from "webextension-polyfill";
import _ from "lodash";

import "src/basscss.css";
import { displayChange } from "src/utils";
import { CoverageStatus, PullCoverageReport } from "src/types";
import {
  animateAndAnnotateLines,
  clearAnimation,
  clearAnnotations,
} from "../common/animation";
import { lineSelector } from "./constants";
import { colors } from "../common/constants";
import { print } from "src/utils";
import { getPRReport } from "../common/fetchers";
import { isPrUrl } from "../common/utils";

const globals: {
  coverageReport?: PullCoverageReport;
} = {};

async function main() {
  document.addEventListener("soft-nav:end", execute);

  await execute();
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
  if (!coverageReport.files) {
    showError();
    return;
  }

  const base = coverageReport.totals.base.coverage;
  const head = coverageReport.totals.head.coverage;
  const patch = coverageReport.totals.patch.coverage;
  const change = head - base;

  updateContainer(head, patch, change);

  globals.coverageReport = transformReport(coverageReport.files);
  animateAndAnnotateLines(lineSelector, annotateLine);
}

function createContainer() {
  const parent = document.getElementsByClassName("pr-review-tools").item(0)!;

  const element = (
    <div className="codecov-flex float-left mr-4" id="coverage-report-data">
      <div className="my-auto mr-6">Loading coverage report...</div>
    </div>
  );

  parent.prepend(element);
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
    animateAndAnnotateLines(lineSelector, annotateLine);
    button.removeAttribute("data-inactive");
    button.innerText = "Hide Coverage";
  } else {
    clearAnimationAndAnnotations();
    button.setAttribute("data-inactive", "true");
    button.innerText = "Show Coverage";
  }
};

function updateContainer(head: number, patch: number, change: number) {
  const parent = document.getElementById("coverage-report-data")!;

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

  parent.replaceChildren(element);
}

function showError() {
  const parent = document.getElementById("coverage-report-data")!;

  const element = (
    <div className="my-auto mr-6">Coverage report not available</div>
  );

  parent.replaceChildren(element);
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

function annotateLine(line: HTMLElement) {
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

function clearAnimationAndAnnotations() {
  clearAnimation(lineSelector, annotateLine);
  clearAnnotations((line: HTMLElement) => (line.style.boxShadow = "inherit"));
}

main();
