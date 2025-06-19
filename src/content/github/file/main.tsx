import browser from "webextension-polyfill";
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
} from "src/types";
import {
  componentsStorageKey,
  flagsStorageKey,
  lineSelector,
  noVirtLineSelector,
} from "./utils/constants";
import {
  animateAndAnnotateLines,
  clearAnimation,
  clearAnnotations,
} from "../common/animation";
import { colors } from "../common/constants";
import { createDropdown } from "./utils/dropdown";
import {
  getComponents,
  getCommitReport,
  getFlags,
  getBranchReport,
  getConsent,
} from "../common/fetchers";
import { print } from "src/utils";
import Sentry from "../../common/sentry";

const globals: {
  coverageReport?: FileCoverageReport;
  coverageButton?: HTMLElement;
  flagsButton?: HTMLElement;
  flagsDrop?: Drop;
  componentsButton?: HTMLElement;
  componentsDrop?: Drop;
  prompt?: HTMLElement;
} = {};

init();

function init(): Promise<void> {
  // this event discovered by "reverse-engineering GitHub"
  // https://github.com/refined-github/refined-github/blob/main/contributing.md#reverse-engineering-github
  // TODO: this event is not fired when navigating using the browser's back and forward buttons
  document.addEventListener("soft-nav:end", () => {
    clear();
    main();
  });

  return main();
}

async function main(): Promise<void> {
  try {
    if (!(await getConsent())) {
      return;
    }

    const urlMetadata = getMetadataFromURL();
    if (!urlMetadata) {
      print("file not detected at current URL");
      return;
    }
    globals.coverageButton = createCoverageButton();
    await process(urlMetadata);
  } catch (e) {
    Sentry.captureException(e);
    throw e;
  }
}

function getMetadataFromURL(): FileMetadata | null {
  const regexp =
    /\/(?<owner>.+?)\/(?<repo>.+?)\/blob\/(?<branch>.+?)\/(?<path>.+?)$/;
  const matches = regexp.exec(window.location.pathname);
  const groups = matches?.groups;
  if (!groups) {
    return null;
  }

  const branch = groups.branch;
  const commitMatch = branch.match(/[\da-f]+/);

  // branch could be a commit sha
  if (
    commitMatch &&
    commitMatch[0].length == branch.length &&
    (groups.branch.length === 40 || branch.length === 7)
  ) {
    // branch is actually a commit sha
    let commit = branch;

    // if it's a short sha, we need to get the full sha
    if (commit.length === 7) {
      const commitLink = document.querySelector(
        `[href^="/${groups.owner}/${groups.repo}/tree/${commit}"]`
      );
      if (!commitLink)
        throw new Error("Could not find commit link from short sha");
      const longSha = commitLink
        .getAttribute("href")
        ?.match(/[\da-f]{40}/)?.[0];
      if (!longSha) throw new Error("Could not get long sha from commit link");
      commit = longSha;
    }

    return {
      ...groups,
      commit,
    };
  }
  return groups;
}

async function process(metadata: FileMetadata): Promise<void> {
  const flags = await getFlags(metadata).catch((e) => {
    print("error while fetching flags", e);
    return [];
  });

  const selectedFlags: string[] = await browser.storage.local
    .get(flagsStorageKey)
    .then((result) => result[flagsStorageKey] || [])
    .catch((e) => {
      print("error while fetching selected flags", e);
      return [];
    });

  // TODO: allow setting selected flags for different files at the same time
  if (
    selectedFlags.length > 0 &&
    _.intersection(flags, selectedFlags).length === 0
  ) {
    await handleFlagClick([]);
    return;
  }

  if (flags.length > 0) {
    createDropdown({
      title: "Flags",
      tooltip: "Filter coverage by flag",
      options: flags,
      previousElement: globals.coverageButton!,
      selectedOptions: selectedFlags,
      onClick: handleFlagClick,
    }).then(({ button, list }) => {
      globals.flagsButton = button;
      globals.flagsDrop = new Drop({
        target: button,
        content: list,
        classes: "drop-theme-arrows codecov-z1 codecov-bg-white",
        position: "bottom right",
        openOn: "click",
      });
    });
  }

  const components = await getComponents(metadata);

  const selectedComponents: string[] = await browser.storage.local
    .get(componentsStorageKey)
    .then((result) => result[componentsStorageKey] || [])
    .catch((e) => {
      print("error while fetching selected components", e);
      return [];
    });

  // TODO: allow setting selected components for different files at the same time
  if (
    selectedComponents.length > 0 &&
    _.intersection(components, selectedComponents).length === 0
  ) {
    await handleComponentClick([]);
    return;
  }

  if (components.length > 0) {
    createDropdown({
      title: "Components",
      options: components,
      tooltip: "Filter coverage by component",
      previousElement: globals.coverageButton!,
      onClick: handleComponentClick,
      selectedOptions: selectedComponents,
    }).then(({ button, list }) => {
      globals.componentsButton = button;
      globals.componentsDrop = new Drop({
        target: button,
        content: list,
        classes: "drop-theme-arrows codecov-z1 codecov-bg-white",
        position: "bottom right",
        openOn: "click",
      });
    });
  }

  // If commit sha is defined use that, otherwise just branch name
  const getReportFn = metadata.commit ? getCommitReport : getBranchReport;

  let coverageReportResponses: Array<FileCoverageReportResponse>;
  try {
    if (selectedFlags?.length > 0 && selectedComponents?.length > 0) {
      coverageReportResponses = await Promise.all(
        selectedFlags.flatMap((flag) =>
          selectedComponents.map((component) =>
            getReportFn(metadata, flag, component)
          )
        )
      );
    } else if (selectedFlags?.length > 0) {
      coverageReportResponses = await Promise.all(
        selectedFlags.map((flag) => getReportFn(metadata, flag, undefined))
      );
    } else if (selectedComponents?.length > 0) {
      coverageReportResponses = await Promise.all(
        selectedComponents.map((component) =>
          getReportFn(metadata, undefined, component)
        )
      );
    } else {
      coverageReportResponses = [
        await getReportFn(metadata, undefined, undefined),
      ];
    }
  } catch (e) {
    updateButton(`Coverage: ⚠`);
    throw e;
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

  if (_.isEmpty(coverageReport)) {
    updateButton(`Coverage: N/A`);
    globals.coverageReport = {};
    return;
  }

  const coveragePct = calculateCoveragePct(coverageReport);
  updateButton(`Coverage: ${coveragePct.toFixed(2)}%`);

  globals.coverageReport = coverageReport;
  animateAndAnnotateLines(lineSelector, annotateLine);
  animateAndAnnotateLines(noVirtLineSelector, annotateLine);
}

function createCoverageButton() {
  const rawButton = document.querySelector('[data-testid="raw-button"]');
  if (!rawButton) {
    throw new Error("Raw button not found");
  }
  const codecovButton = rawButton.cloneNode(true) as HTMLElement;
  codecovButton.addEventListener("click", (event) => {
    event.preventDefault();
    const isInactive = codecovButton.getAttribute("data-inactive");
    if (isInactive == "true") {
      animateAndAnnotateLines(lineSelector, annotateLine);
      animateAndAnnotateLines(noVirtLineSelector, annotateLine);
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
  rawButton.parentNode?.parentNode?.parentNode?.prepend(codecovButton);
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
  await main();
}

async function handleComponentClick(selectedComponents: string[]) {
  await chrome.storage.local.set({
    [flagsStorageKey]: [],
  });
  await chrome.storage.local.set({
    [componentsStorageKey]: selectedComponents,
  });
  clear();
  await main();
}

function calculateCoveragePct(coverageReport: FileCoverageReport): number {
  const report = Object.entries(coverageReport);
  const totalLines = report.length;
  const coveredLines = report.filter(
    ([line, status]) => status === CoverageStatus.COVERED
  ).length;
  return (coveredLines * 100) / totalLines;
}

function updateButton(text: string) {
  globals.coverageButton!.innerHTML = text;
}

function annotateLine(line: HTMLElement) {
  let lineNumber = _.parseInt(line.getAttribute("data-key")!) + 1;
  const lineNumberString = line.getAttribute("data-key");
  if (lineNumberString) {
    lineNumber = _.parseInt(lineNumberString) + 1; // Virtualized lines have data-key="{number - 1}"
  } else {
    const noVirtLineNumberString = line.getAttribute("id");
    if (!noVirtLineNumberString) return;
    lineNumber = _.parseInt(noVirtLineNumberString.slice(2)); // Non-virtualized lines have id="LC{number}"
  }
  // called from "Coverage: N/A" button on-click handler
  if (!globals.coverageReport) {
    return;
  }
  const status = globals.coverageReport[lineNumber];
  if (status === CoverageStatus.COVERED) {
    line.style.backgroundColor = colors.greenAlpha;
  } else if (status === CoverageStatus.UNCOVERED) {
    line.style.backgroundColor = colors.redAlpha;
  } else if (status === CoverageStatus.PARTIAL) {
    line.style.backgroundColor = colors.yellowAlpha;
  } else {
    line.style.backgroundColor = "inherit";
  }
}

function clearElements() {
  globals.coverageButton?.remove();
  globals.flagsButton?.remove();
  globals.flagsDrop?.remove();
  globals.componentsButton?.remove();
  globals.componentsDrop?.remove();
  globals.prompt?.remove();
}

function clearAnimationAndAnnotations() {
  clearAnimation(lineSelector, annotateLine);
  clearAnimation(noVirtLineSelector, annotateLine);
  clearAnnotations((line: HTMLElement) => {
    line.style.backgroundColor = "inherit";
  });
}

function clear() {
  clearElements();
  clearAnimationAndAnnotations();
}
