import React from "dom-chef";
import browser from "webextension-polyfill";
import clsx from "clsx";
import _ from "lodash";

import { displayChange, print } from "src/utils";
import { CoverageStatus, MessageType, PullCoverageReport } from "src/types";
import {
  animateAndAnnotateLines,
  clearAnimation,
  clearAnnotations,
} from "../common/animation";
import { lineSelector } from "./constants";
import { colors } from "../common/constants";

const globals: {
  coverageReport?: PullCoverageReport;
} = {};

async function main() {
  injectStyles();

  document.addEventListener("soft-nav:end", execute);

  await execute();
}

async function execute() {
  const urlMetadata = getMetadataFromURL();
  if (!urlMetadata) {
    print("url does not match PR view");
    return;
  }

  createContainer();

  const coverageReport = await getPRComparison(urlMetadata);
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
    <div className="float-left mr-4 flex text-muted" id="coverage-report-data">
      <div className="my-auto mr-6">Loading coverage report...</div>
    </div>
  );

  parent.prepend(element);
}

function getMetadataFromURL(): { [key: string]: string } | null {
  const regexp =
    /github.com\/(?<owner>.+?)\/(?<repo>.+?)\/pull\/(?<id>\d+?)\/files/;
  const matches = regexp.exec(document.URL);
  const groups = matches?.groups;
  if (!groups) {
    return null;
  }
  return groups;
}

async function getPRComparison(url: any) {
  const payload = {
    service: "github",
    owner: url.owner,
    repo: url.repo,
    pullid: url.id,
  };

  const response = await browser.runtime.sendMessage({
    type: MessageType.FETCH_PR_COMPARISON,
    payload: payload,
  });

  return response.data;
}

function injectStyles() {
  const head = document.getElementsByTagName("head").item(0)!;
  const styles = (
    <link
      href="https://unpkg.com/basscss@8.0.2/css/basscss.min.css"
      rel="stylesheet"
    />
  );
  head.append(styles);
}

const handleToggleClick: React.MouseEventHandler = (event) => {
  const button = event.target as HTMLElement;
  const isInactive = button.getAttribute("data-inactive");
  if (isInactive == "true") {
    animateAndAnnotateLines(lineSelector, annotateLine);
    button.removeAttribute("data-inactive");
    button.innerText = "Hide Coverage"
  } else {
    clearAnimationAndAnnotations();
    button.setAttribute("data-inactive", "true");
    button.innerText = "Show Coverage"
  }
};

function updateContainer(head: number, patch: number, change: number) {
  const parent = document.getElementById("coverage-report-data")!;

  const element = (
    <>
      <div className="mr2">
        Head: <strong>{head.toFixed(2)}%</strong>
      </div>
      <div className="mx2">
        Patch: <strong>{patch.toFixed(2)}%</strong>
      </div>
      <div className="mx2">
        Change:{" "}
        <strong
          className={clsx(
            change > 0 && "bg-green-300",
            change < 0 && "bg-red-300"
          )}
        >
          {displayChange(change)}%
        </strong>
      </div>
      <button className="btn btn-sm ml2" onClick={handleToggleClick}>
        Hide Coverage
      </button>
    </>
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
  const button = line.querySelector("button")!;
  const file = button.getAttribute("data-path")!;
  const lineNumber = button.getAttribute("data-line")!;
  const status =
    globals.coverageReport![file]?.lines[lineNumber]?.coverage["head"];
  if (status == null) {
    return;
  }
  const borderStylePrefix = "2px solid ";
  if (status === CoverageStatus.COVERED) {
    line.style.borderLeft = `${borderStylePrefix} ${colors.green}`;
  } else if (status === CoverageStatus.UNCOVERED) {
    line.style.borderLeft = `${borderStylePrefix} ${colors.red}`;
  } else if (status === CoverageStatus.PARTIAL) {
    line.style.borderLeft = `${borderStylePrefix} ${colors.yellow}`;
  } else {
    line.style.borderLeft = "inherit";
  }
}

function clearLineAnnotation(line: HTMLElement) {
  line.style.borderLeft = "inherit";
}

function clearAnimationAndAnnotations() {
  clearAnimation(lineSelector, annotateLine);
  clearAnnotations(clearLineAnnotation);
}

main().catch(console.warn.bind(print));
