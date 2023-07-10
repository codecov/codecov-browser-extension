import React from "dom-chef";
import browser from "webextension-polyfill";
import alpha from "color-alpha";
import Drop from "tether-drop";
import _ from "lodash";
import "tether-drop/dist/css/drop-theme-arrows.css";

import "src/basscss.css";
import "./style.css";
import { CoverageStatus, FileCoverageReport, MessageType } from "src/types";
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
import { getComponents, getCoverageReport, getFlags } from "./utils/fetchers";
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
  const urlMetadata = getMetadataFromURL();
  if (!urlMetadata) {
    print("file not detected at current URL")
    return;
  }

  globals.coverageButton = createCoverageButton();

  const flags = await getFlags(urlMetadata);
  if (flags.length > 0) {
    const { button: flagsButton, list: flagsList } = await createDropdown({
      title: "Flags",
      tooltip: "Filter coverage by flag",
      options: flags,
      previousElement: globals.coverageButton,
      storageKey: flagsStorageKey,
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

  const components = await getComponents(urlMetadata);
  if (components.length > 0) {
    const { button: componentsButton, list: componentsList } =
      await createDropdown({
        title: "Components",
        options: components,
        tooltip: "Filter coverage by component",
        previousElement: globals.coverageButton,
        onClick: handleComponentClick,
        storageKey: componentsStorageKey,
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

  // TODO: allow setting selected flags / components for different files at the same time

  const selectedFlags: string[] = await browser.storage.local
    .get(flagsStorageKey)
    .then((result) => result[flagsStorageKey] || []);
  if (
    selectedFlags.length > 0 &&
    _.intersection(flags, selectedFlags).length === 0
  ) {
    await handleFlagClick([]);
  }

  const selectedComponents: string[] = await browser.storage.local
    .get(componentsStorageKey)
    .then((result) => result[componentsStorageKey] || []);
  if (
    selectedComponents.length > 0 &&
    _.intersection(components, selectedComponents).length === 0
  ) {
    await handleComponentClick([]);
  }

  let coverageReport: any;
  if (selectedFlags?.length > 0 || selectedComponents?.length > 0) {
    let coverageReports = [];
    if (selectedFlags.length > 0) {
      coverageReports = await Promise.all(
        selectedFlags.map((flag) =>
          getCoverageReport(urlMetadata, flag, undefined)
        )
      );
    } else {
      coverageReports = await Promise.all(
        selectedComponents.map((component) =>
          getCoverageReport(urlMetadata, undefined, component)
        )
      );
    }
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
      updateButton(`Coverage: ${coveragePct.toFixed(2)}%`);
    } else {
      updateButton(`Coverage: N/A`);
      globals.coverageReport = {};
    }
  } else {
    coverageReport = await getCoverageReport(urlMetadata, undefined, undefined);
    if (coverageReport.files?.length) {
      const fileReport = coverageReport.files[0];
      updateButton(`Coverage: ${fileReport.totals.coverage}%`);
      globals.coverageReport = Object.fromEntries(fileReport.line_coverage);
    } else {
      updateButton(`Coverage: N/A`);
      globals.coverageReport = {};
    }
  }

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

function calculateCoveragePct(): number {
  const x = Object.entries(globals.coverageReport!);
  const totalLines = x.length;
  const coveredLines = x.filter(
    ([line, status]) => status !== CoverageStatus.UNCOVERED
  ).length;
  return (coveredLines * 100) / totalLines;
}

function getMetadataFromURL(): { [key: string]: string } | null {
  const regexp =
    /\/(?<owner>.+?)\/(?<repo>.+?)\/blob\/(?<ref>.+?)\/(?<path>.+)/;
  const matches = regexp.exec(window.location.pathname);
  const groups = matches?.groups;
  if (!groups) {
    return null;
  }
  return groups;
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
