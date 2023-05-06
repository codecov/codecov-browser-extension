import React from "dom-chef";
import browser from "webextension-polyfill";
import alpha from "color-alpha";
import Drop from "tether-drop";

import { CoverageStatus, FileCoverageReport, MessageType } from "src/types";
import { lineSelector } from "./constants";
import { print } from "src/utils";
import {
  animateAndAnnotateLines,
  clearAnimation,
  clearAnnotations,
} from "../common/animation";
import { colors } from "../common/constants";
import _ from "lodash";

const globals: {
  coverageReport: FileCoverageReport;
  flagsDrop?: Drop;
} = {
  coverageReport: {},
};

// TODO: set up CI
// https://circleci.com/blog/continuously-deploy-a-chrome-extension/

async function main(): Promise<void> {
  injectUtils();
  await execute();
  // this event discovered by "reverse-engineering GitHub"
  // https://github.com/refined-github/refined-github/blob/main/contributing.md#reverse-engineering-github
  // TODO: this event is not fired when navigating using the browser's back and forward buttons
  document.addEventListener("soft-nav:end", () => {
    clear();
    execute();
  });
}

function injectUtils() {
  const dropJs = (
    <>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/tether-drop/1.4.2/js/drop.min.js" />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/tether-drop/1.4.2/css/drop-theme-arrows.min.css"
      />
    </>
  );
  const bassCss = (
    <link
      href="https://unpkg.com/basscss@8.0.2/css/basscss.min.css"
      rel="stylesheet"
    />
  );
  const customCss = (
    <style>
      {`
      .drop-content {
        margin-top: 5px !important;
        background: white !important;
        font-size: 13px !important;
      }
      .drop-content::before {
        visibility: hidden;
        border-bottom-color: white !important;
      }
      .drop-content ul {
        overflow: scroll;
        max-height: 400px;
      }
      `}
    </style>
  );
  document.head.appendChild(dropJs);
  document.head.appendChild(bassCss);
  document.head.appendChild(customCss);
}

async function execute(): Promise<void> {
  const urlMetadata = getMetadataFromURL();
  if (!urlMetadata) {
    print("url does not match file view");
    return;
  }

  print("content script executing");

  createCoverageButton();

  let flags: string[] = [];
  try {
    flags = await getFlags(urlMetadata);
  } catch (e) {}
  if (flags.length > 0) {
    await createFlagsButton(flags);
  }

  const selectedFlags: string[] = await browser.storage.local
    .get("selected_flags")
    .then((result) => result.selected_flags);

  let coverageReport: any;
  if (selectedFlags.length > 0) {
    const coverageReports = await Promise.all(
      selectedFlags.map((flag) => getCoverageReport(urlMetadata, flag))
    );
    coverageReport = coverageReports
      .map((report) => {
        if (report.files?.length) {
          return Object.fromEntries(report.files[0].line_coverage);
        } else {
          return {};
        }
      })
      .reduce((finalReport, currentReport) => {
        return _.mergeWith(finalReport, currentReport, (x, y) => {
          if (x === CoverageStatus.COVERED || y === CoverageStatus.COVERED) {
            return CoverageStatus.COVERED;
          } else if (
            x === CoverageStatus.PARTIAL ||
            y === CoverageStatus.PARTIAL
          ) {
            return CoverageStatus.PARTIAL;
          } else {
            return CoverageStatus.UNCOVERED;
          }
        });
      }, {});
    if (!_.isEmpty(coverageReport)) {
      globals.coverageReport = coverageReport;
      const coveragePct = calculateCoveragePct();
      updateButton(`Coverage: ${coveragePct}%`);
    } else {
      print("file not found in report");
      updateButton(`Coverage: N/A`);
      globals.coverageReport = {};
    }
  } else {
    coverageReport = await getCoverageReport(urlMetadata, undefined);
    if (coverageReport.files?.length) {
      const fileReport = coverageReport.files[0];
      updateButton(`Coverage: ${fileReport.totals.coverage}%`);
      globals.coverageReport = Object.fromEntries(fileReport.line_coverage);
    } else {
      print("file not found in report");
      updateButton(`Coverage: N/A`);
      globals.coverageReport = {};
    }
  }

  animateAndAnnotateLines(lineSelector, annotateLine);
}

main().catch(console.warn.bind(print));

function createCoverageButton() {
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
  rawButton.parentNode?.parentNode?.prepend(codecovButton);
}

async function handleFlagClick(
  selected_flags: string[],
  input_flags: string[],
  add: Boolean
) {
  if (add) {
    selected_flags = selected_flags.concat(input_flags);
  } else {
    selected_flags = selected_flags.filter(
      (flag) => !input_flags.includes(flag)
    );
  }
  await chrome.storage.local.set({
    selected_flags,
  });
  clear();
  execute();
}

async function createFlagsButton(flags: string[]) {
  const editButton = document
    .querySelector('[data-testid="edit-button"]')!
    .closest("div")!;
  const flagsButton = editButton.cloneNode(true) as HTMLElement;
  flagsButton.setAttribute("data-testid", "flags-button");
  const textNode = flagsButton.querySelector("a")!;
  textNode.innerHTML = "";
  textNode.href = "javascript:void(0)";
  textNode.parentElement!.ariaLabel = "Filter coverage by flag";
  textNode.style.padding = "0 30px";
  textNode.appendChild(<span>Flags</span>);
  const coverageButton = document.querySelector(
    '[data-testid="coverage-button"]'
  )!;
  coverageButton.insertAdjacentElement("afterend", flagsButton);

  const selected_flags = await browser.storage.local
    .get("selected_flags")
    .then((result) => result.selected_flags || []);

  // if (flag) {
  //   flagsButton.style.border = "1px solid rgb(45, 164, 78)";
  //   flagsButton.style.borderRadius = "7px";
  // }

  const allSelected = _.isEqual(flags, selected_flags);

  const flagsList = (
    <ul className="list-reset">
      <li
        className="cursor-pointer px1"
        onClick={() => handleFlagClick([], flags, !allSelected)}
      >
        Select {allSelected ? "None" : "All"}
      </li>
      {flags.map((flag: string) => {
        const isSelected = selected_flags.indexOf(flag) > -1;
        return (
          <>
            <hr className="my1 mxn2" />
            <li
              className="cursor-pointer"
              onClick={() =>
                handleFlagClick(selected_flags, [flag], !isSelected)
              }
            >
              <input
                type="checkbox"
                className="align-middle"
                checked={isSelected}
              />
              <span className="pl1 align-middle">{flag}</span>
            </li>
          </>
        );
      })}
    </ul>
  );

  globals.flagsDrop = new Drop({
    target: flagsButton,
    content: flagsList,
    classes: "drop-theme-arrows z1 bg-white",
    position: "bottom right",
    openOn: "click",
  });
}

function calculateCoveragePct(): number {
  const x = Object.entries(globals.coverageReport);
  const totalLines = x.length;
  const coveredLines = x.filter(
    ([line, status]) => status !== CoverageStatus.UNCOVERED
  ).length;
  return (coveredLines * 100) / totalLines;
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

async function getFlags(url: { [key: string]: string }): Promise<string[]> {
  const payload = {
    service: "github",
    owner: url.owner,
    repo: url.repo,
  };

  const flagsResponse = await browser.runtime.sendMessage({
    type: MessageType.FETCH_FLAGS_LIST,
    payload,
  });

  return flagsResponse.data.results.map((f: any) => f.flag_name);
}

async function getCoverageReport(
  url: { [key: string]: string },
  flag: string | undefined
) {
  const commonPayload = {
    service: "github",
    owner: url.owner,
    repo: url.repo,
    path: url.path,
    flag,
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

function clearButtons() {
  document.querySelector('[data-testid="coverage-button"]')?.remove();
  document.querySelector('[data-testid="flags-button"]')?.remove();
  globals.flagsDrop?.remove();
}

function clearAnimationAndAnnotations() {
  clearAnimation(lineSelector, annotateLine);
  clearAnnotations(clearLineAnnotation);
}

function clear() {
  clearButtons();
  clearAnimationAndAnnotations();
}
