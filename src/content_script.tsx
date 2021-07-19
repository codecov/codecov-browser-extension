import browser from "webextension-polyfill";
import { MessageType } from "./common";

async function main(): Promise<void> {
  // since github uses pjax for navigation and DOM updates (no full reload),
  // we trigger the content script from the background script
  // and must clear any changes introduced on previous URLs
  clear();

  // create "Coverage: ..." button
  createButton();
  // get metadata for codecov API call from URL
  const urlMetadata = getMetadataFromURL();
  // get coverage report from codecov
  const coverageReport = await getCoverageReport(urlMetadata);
  if (!coverageReport.files) {
    // requested file not found in coverage report
    return;
  }
  const fileReport = coverageReport.files[0];
  // update coverage percentage in button
  updateButton(fileReport.totals.coverage);

  // color lines based on coverage report
  annotateLines(fileReport.line_coverage);
}

main().catch(console.error.bind(console));

function createButton() {
  const rawButton = document.querySelector('[data-testid="raw-button"]');
  if (!rawButton) {
    return;
  }
  const codecovButton = rawButton.cloneNode(true) as HTMLElement;
  codecovButton.setAttribute("data-testid", "coverage-button");
  codecovButton.setAttribute(
    "href",
    document.URL.replace("github.com", "app.codecov.io/gh")
  );
  codecovButton.setAttribute("target", "_blank");
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

function updateButton(coverage: number) {
  const codecovButton = document.querySelector(
    '[data-testid="coverage-button"]'
  )!;
  codecovButton.innerHTML = `Coverage: ${coverage}%`;
}

const colors = {
  red: "rgb(245,32,32,0.25)",
  green: "rgb(33,181,119,0.25)",
  yellow: "rgb(244,176,27,0.25)",
};

function annotateLines(lineCoverage: any) {
  const linesContainer = document.querySelector(".react-code-lines");
  if (!linesContainer) {
    return;
  }
  const lines = linesContainer.children as HTMLCollectionOf<HTMLElement>;
  for (const [lineNumber, status] of lineCoverage) {
    const line = lines[lineNumber - 1];
    if (status === 0) {
      line.style.backgroundColor = colors.green;
    } else if (status === 1) {
      line.style.backgroundColor = colors.red;
    } else if (status === 2) {
      line.style.backgroundColor = colors.yellow;
    }
  }
}

function clearButton() {
  const codecovButton = document.querySelector(
    '[data-testid="coverage-button"]'
  );
  codecovButton?.remove();
}

function clearLineAnnotations() {
  const linesContainer = document.querySelector(".react-code-lines");
  if (!linesContainer) {
    return;
  }
  const lines = linesContainer.children as HTMLCollectionOf<HTMLElement>;
  for (const line of lines) {
    line.style.backgroundColor = "inherit";
  }
}

function clear() {
  clearButton();
  clearLineAnnotations();
}
