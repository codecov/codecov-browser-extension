import browser from "webextension-polyfill";
import alpha from "color-alpha";

import { FileCoverageReport, CoverageStatus, MessageType } from "src/types";
import { lineSelector } from "./constants";
import { print } from "src/utils";
import {
  animateAndAnnotateLines,
  clearAnimation,
  clearAnnotations,
} from "../common/animation";
import { colors } from "../common/constants";

const globals: {
  coverageReport: FileCoverageReport;
} = {
  coverageReport: {},
};

async function main(): Promise<void> {
  await execute();
  // this event discovered by "reverse-engineering GitHub"
  // https://github.com/refined-github/refined-github/blob/main/contributing.md#reverse-engineering-github
  // TODO: this event is not fired when navigating using the browser's back and forward buttons
  document.addEventListener("soft-nav:end", () => {
    clear();
    execute();
  });
}

async function execute(): Promise<void> {
  const urlMetadata = getMetadataFromURL();
  if (!urlMetadata) {
    print("url does not match file view");
    return;
  }

  print("content script executing");

  createButton();

  const coverageReport = await getCoverageReport(urlMetadata);
  if (coverageReport.files) {
    const fileReport = coverageReport.files[0];
    updateButton(`Coverage: ${fileReport.totals.coverage}%`);
    globals.coverageReport = Object.fromEntries(fileReport.line_coverage);
  } else {
    print("file not found in report");
    updateButton(`Coverage: N/A`);
    globals.coverageReport = {};
  }

  animateAndAnnotateLines(lineSelector, annotateLine);
}

main().catch(console.warn.bind(print));

function createButton() {
  const rawButton = document.querySelector('[data-testid="raw-button"]');
  if (!rawButton) {
    throw "raw button not found";
  }
  const codecovButton = rawButton.cloneNode(true) as HTMLElement;
  codecovButton.setAttribute("data-testid", "coverage-button");
  // codecovButton.setAttribute(
  //   "href",
  //   document.URL.replace("github.com", "app.codecov.io/gh")
  // );
  // codecovButton.setAttribute("target", "_blank");
  // TODO: persist this setting
  codecovButton.addEventListener("click", (event) => {
    event.preventDefault();
    const isInactive = codecovButton.getAttribute("data-inactive");
    if (isInactive == "true") {
      animateAndAnnotateLines(lineSelector, annotateLine);
      codecovButton.removeAttribute("data-inactive");
      codecovButton.style.opacity = "1";
    } else {
      clearAnimationAndAnnotations();
      codecovButton.setAttribute("data-inactive", "true");
      codecovButton.style.opacity = "0.5";
    }
  });
  const textNode = codecovButton.querySelector('[data-component="text"]')!;
  textNode.innerHTML = "Coverage: ...";
  rawButton.parentNode?.prepend(codecovButton);
}

function getMetadataFromURL(): { [key: string]: string } | null {
  const regexp =
    /github.com\/(?<owner>.+?)\/(?<repo>.+?)\/blob\/(?<ref>.+?)\/(?<path>.+)/;
  const matches = regexp.exec(document.URL);
  const groups = matches?.groups;
  if (!groups) {
    return null;
  }
  return groups;
}

async function getCoverageReport(url: { [key: string]: string }) {
  const commonPayload = {
    service: "github",
    owner: url.owner,
    repo: url.repo,
    path: url.path,
  };

  // TODO: check if codecov can figure out whether branch or sha
  const shaResponse = await browser.runtime.sendMessage({
    type: MessageType.FETCH_COMMIT_REPORT,
    payload: {
      ...commonPayload,
      sha: url.ref,
    },
  });

  if (shaResponse.ok) {
    return shaResponse.data;
  }

  const branchResponse = await browser.runtime.sendMessage({
    type: MessageType.FETCH_COMMIT_REPORT,
    payload: {
      ...commonPayload,
      branch: url.ref,
    },
  });

  return branchResponse.data;
}

function updateButton(text: string) {
  const codecovButton = document.querySelector(
    '[data-testid="coverage-button"]'
  )!;
  codecovButton.innerHTML = text;
}

function annotateLine(line: HTMLElement) {
  const lineNumber = parseInt(line.getAttribute("data-key")!) + 1;
  const status = globals.coverageReport[lineNumber];
  print(`annotating line ${lineNumber} as ${CoverageStatus[status]}`);
  if (status === CoverageStatus.COVERED) {
    line.style.backgroundColor = alpha(colors.green, 0.25);
  } else if (status === CoverageStatus.UNCOVERED) {
    line.style.backgroundColor = alpha(colors.red, 0.25);
  } else if (status === CoverageStatus.PARTIAL) {
    line.style.backgroundColor = alpha(colors.yellow, 0.25);
  } else {
    line.style.backgroundColor = "inherit";
  }
}

function clearLineAnnotation(line: HTMLElement) {
  line.style.backgroundColor = "inherit";
}

function clearButton() {
  const codecovButton = document.querySelector(
    '[data-testid="coverage-button"]'
  );
  codecovButton?.remove();
}

function clearAnimationAndAnnotations() {
  clearAnimation(lineSelector, annotateLine);
  clearAnnotations(clearLineAnnotation);
}

function clear() {
  clearButton();
  clearAnimationAndAnnotations();
}
