import React from "dom-chef";
import browser from "webextension-polyfill";
import alpha from "color-alpha";
import Drop from "tether-drop";
import _ from "lodash";
import "tether-drop/dist/css/drop-theme-arrows.css";

import "src/basscss.css";
import "./style.css";
import {
  CoverageStatus,
  FileCoverageReport,
  FileCoverageReportResponse,
  FileMetadata,
  MessageType,
} from "src/types";
import {
  componentsStorageKey,
  flagsStorageKey,
  lineSelector,
} from "./utils/constants";
import {
  animateAndAnnotateLines,
  clearAnimation,
  clearAnnotations,
} from "../common/animation";
import { colors } from "../common/constants";
import { createDropdown } from "./utils/dropdown";
import {
  getMetadata,
  getComponents,
  getCommitReport,
  getFlags,
} from "../common/fetchers";
import { print } from "src/utils";

const globals: {
  coverageReport?: FileCoverageReport;
  coverageButton?: HTMLElement;
  flagsButton?: HTMLElement;
  flagsDrop?: Drop;
  componentsButton?: HTMLElement;
  componentsDrop?: Drop;
} = {};

async function execute(): Promise<void> {
  let metadata: FileMetadata;

  try {
    metadata = await getMetadata(document.URL);
  } catch (e) {
    print("file not detected at current URL");
    return;
  }

  globals.coverageButton = createCoverageButton();

  const flags = await getFlags(metadata);

  const selectedFlags: string[] = await browser.storage.local
    .get(flagsStorageKey)
    .then((result) => result[flagsStorageKey] || []);

  // TODO: allow setting selected flags for different files at the same time
  if (
    selectedFlags.length > 0 &&
    _.intersection(flags, selectedFlags).length === 0
  ) {
    await handleFlagClick([]);
  }

  if (flags.length > 0) {
    const { button: flagsButton, list: flagsList } = await createDropdown({
      title: "Flags",
      tooltip: "Filter coverage by flag",
      options: flags,
      previousElement: globals.coverageButton,
      selectedOptions: selectedFlags,
      onClick: handleFlagClick,
    });
    globals.flagsButton = flagsButton;
    globals.flagsDrop = new Drop({
      target: globals.flagsButton,
      content: flagsList,
      classes: "drop-theme-arrows codecov-z1 codecov-bg-white",
      position: "bottom right",
      openOn: "click",
    });
  }

  const components = await getComponents(metadata);

  const selectedComponents: string[] = await browser.storage.local
    .get(componentsStorageKey)
    .then((result) => result[componentsStorageKey] || []);

  // TODO: allow setting selected flags for different files at the same time
  if (
    selectedComponents.length > 0 &&
    _.intersection(components, selectedComponents).length === 0
  ) {
    await handleComponentClick([]);
  }

  if (components.length > 0) {
    const { button: componentsButton, list: componentsList } =
      await createDropdown({
        title: "Components",
        options: components,
        tooltip: "Filter coverage by component",
        previousElement: globals.coverageButton,
        onClick: handleComponentClick,
        selectedOptions: selectedComponents,
      });
    globals.componentsButton = componentsButton;
    globals.componentsDrop = new Drop({
      target: globals.componentsButton,
      content: componentsList,
      classes: "drop-theme-arrows codecov-z1 codecov-bg-white",
      position: "bottom right",
      openOn: "click",
    });
  }

  let coverageReportResponses: Array<FileCoverageReportResponse>;
  if (selectedFlags?.length > 0) {
    coverageReportResponses = await Promise.all(
      selectedFlags.map((flag) => getCommitReport(metadata, flag, undefined))
    );
  } else if (selectedComponents?.length > 0) {
    coverageReportResponses = await Promise.all(
      selectedComponents.map((component) =>
        getCommitReport(metadata, undefined, component)
      )
    );
  } else {
    coverageReportResponses = await Promise.all([
      await getCommitReport(metadata, undefined, undefined),
    ]);
  }

  const coverageReports = coverageReportResponses.map(
    (reportResponse): FileCoverageReport => {
      const file = reportResponse.files?.[0];
      return Object.fromEntries(file?.line_coverage || []);
    }
  );

  const coverageReport = ((): FileCoverageReport => {
    if (coverageReports.length === 1) {
      return coverageReports[0];
    }
    return coverageReports.reduce((finalReport, currentReport) => {
      return _.mergeWith(
        finalReport,
        currentReport,
        (x: CoverageStatus, y: CoverageStatus) => {
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
        }
      );
    }, {});
  })();

  if (!_.isEmpty(coverageReport)) {
    const coveragePct = calculateCoveragePct(coverageReport);
    updateButton(`Coverage: ${coveragePct.toFixed(2)}%`);
  } else {
    updateButton(`Coverage: N/A`);
  }

  globals.coverageReport = coverageReport;
  animateAndAnnotateLines(lineSelector, annotateLine);
}

function createCoverageButton() {
  const rawButton = document.querySelector('[data-testid="raw-button"]');
  if (!rawButton) {
    throw "raw button not found";
  }
  const codecovButton = rawButton.cloneNode(true) as HTMLElement;
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
  return codecovButton;
}

async function handleFlagClick(selectedFlags: string[]) {
  await chrome.storage.local.set({
    [componentsStorageKey]: [],
  });
  await chrome.storage.local.set({
    [flagsStorageKey]: selectedFlags,
  });
  clear();
  await execute();
}

async function handleComponentClick(selectedComponents: string[]) {
  await chrome.storage.local.set({
    [flagsStorageKey]: [],
  });
  await chrome.storage.local.set({
    [componentsStorageKey]: selectedComponents,
  });
  clear();
  await execute();
}

function calculateCoveragePct(coverageReport: FileCoverageReport): number {
  const report = Object.entries(coverageReport);
  const totalLines = report.length;
  const coveredLines = report.filter(
    ([line, status]) => status !== CoverageStatus.UNCOVERED
  ).length;
  return (coveredLines * 100) / totalLines;
}

function updateButton(text: string) {
  globals.coverageButton!.innerHTML = text;
}

function annotateLine(line: HTMLElement) {
  const lineNumber = parseInt(line.getAttribute("data-key")!) + 1;
  const status = globals.coverageReport![lineNumber];
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

function clearButtons() {
  globals.coverageButton?.remove();
  globals.flagsButton?.remove();
  globals.flagsDrop?.remove();
  globals.componentsButton?.remove();
  globals.componentsDrop?.remove();
}

function clearAnimationAndAnnotations() {
  clearAnimation(lineSelector, annotateLine);
  clearAnnotations((line: HTMLElement) => {
    line.style.backgroundColor = "inherit";
  });
}

function clear() {
  clearButtons();
  clearAnimationAndAnnotations();
}

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

main();
