import browser from "webextension-polyfill";
import domLoaded from "dom-loaded";
import * as pageDetect from "github-url-detection";
import { css } from "code-tag";

import { CoverageReport, CoverageStatus, MessageType } from "../../types";
import {
  animationAttachmentId,
  animationDefinitionId,
  animationName,
  seenClassName,
  lineSelector,
  colors,
} from "./constants";
import { print } from "../../utils";

const globals: {
  coverageReport?: CoverageReport;
} = {};

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
  await domLoaded;

  if (!pageDetect.hasCode) {
    print("no code on page");
    return;
  }

  print("content script executing");

  try {
    createButton();
  } catch (e: any) {
    print(e);
    return;
  }

  const urlMetadata = getMetadataFromURL();
  const coverageReport = await getCoverageReport(urlMetadata);
  if (!coverageReport.files) {
    print("file not found in report");
    updateButton(`Coverage: N/A`);
    return;
  }
  const fileReport = coverageReport.files[0];
  updateButton(`Coverage: ${fileReport.totals.coverage}%`);

  globals.coverageReport = Object.fromEntries(fileReport.line_coverage);
  animateAndAnnotateLines();
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
      animateAndAnnotateLines();
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

function getMetadataFromURL(): { [key: string]: string } {
  const regexp =
    /github.com\/(?<owner>.+?)\/(?<repo>.+?)\/blob\/(?<ref>.+?)\/(?<path>.+)/;
  const matches = regexp.exec(document.URL);
  const groups = matches?.groups;
  if (!groups) {
    return {};
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
    type: MessageType.FETCH_REPORT,
    payload: {
      ...commonPayload,
      sha: url.ref,
    },
  });

  if (shaResponse.ok) {
    return shaResponse.data;
  }

  const branchResponse = await browser.runtime.sendMessage({
    type: MessageType.FETCH_REPORT,
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
  const status = globals.coverageReport![lineNumber];
  print(`annotating line ${lineNumber} as ${CoverageStatus[status]}`);
  if (status === CoverageStatus.COVERED) {
    line.style.backgroundColor = colors.green;
  } else if (status === CoverageStatus.UNCOVERED) {
    line.style.backgroundColor = colors.red;
  } else if (status === CoverageStatus.PARTIAL) {
    line.style.backgroundColor = colors.yellow;
  } else {
    line.style.backgroundColor = "inherit";
  }
}

function getListener(
  seenMark: string,
  selector: string,
  callback: (element: HTMLElement) => void
) {
  return function (event: AnimationEvent) {
    const target = event.target as HTMLElement;
    // The target can match a selector even if the animation actually happened on a ::before pseudo-element, so it needs an explicit exclusion here
    if (target.classList.contains(seenMark) || !target.matches(selector)) {
      return;
    }

    // Removes this specific element’s animation once it was seen
    target.classList.add(seenMark);

    callback(target);
  };
}

function registerAnimation(animationName: string) {
  const rule = document.createElement("style");
  rule.id = animationDefinitionId;
  rule.textContent = css`
    @keyframes ${animationName} {
    }
  `;
  document.head.append(rule);
}

// This approach taken from refined-github
// https://github.com/refined-github/refined-github/blob/23.2.20/source/helpers/selector-observer.tsx
function animateAndAnnotateLines() {
  registerAnimation(animationName);

  const rule = document.createElement("style");
  rule.id = animationAttachmentId;
  rule.textContent = css`
    :where(${String(lineSelector)}):not(.${seenClassName}) {
      animation: 1ms ${animationName};
    }
  `;
  document.body.prepend(rule);

  window.addEventListener(
    "animationstart",
    getListener(seenClassName, lineSelector, annotateLine)
  );
}

function clearButton() {
  const codecovButton = document.querySelector(
    '[data-testid="coverage-button"]'
  );
  codecovButton?.remove();
}

function clearAnimation() {
  document.getElementById(animationDefinitionId)?.remove();
  document.getElementById(animationAttachmentId)?.remove();
  window.removeEventListener(
    "animationstart",
    getListener(seenClassName, lineSelector, annotateLine)
  );
}

function clearAnnotations() {
  Array.from(document.getElementsByClassName(seenClassName)).map((line) => {
    print(
      `[x] removing annotation for line ${
        parseInt(line.getAttribute("data-key")!) + 1
      }`
    );
    // @ts-ignore
    line.style.backgroundColor = "inherit";
    line.classList.remove(seenClassName);
  });
}

function clearAnimationAndAnnotations() {
  clearAnimation();
  clearAnnotations();
}

function clear() {
  clearButton();
  clearAnimationAndAnnotations();
}
