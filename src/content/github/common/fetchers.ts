import browser from "webextension-polyfill";
import {
  Consent,
  FileCoverageReportResponse,
  FileMetadata,
  MessageType,
} from "src/types";

export async function getFlags(metadata: FileMetadata): Promise<string[]> {
  const payload = {
    owner: metadata.owner,
    repo: metadata.repo,
  };

  const response = await browser.runtime.sendMessage({
    type: MessageType.FETCH_FLAGS_LIST,
    payload,
    referrer: window.location.href,
  });

  const flags = response.ok ? response.data.results : [];

  return flags.map((f: any) => f.flag_name);
}

export async function getComponents(metadata: FileMetadata): Promise<string[]> {
  const payload = {
    owner: metadata.owner,
    repo: metadata.repo,
  };

  const response = await browser.runtime.sendMessage({
    type: MessageType.FETCH_COMPONENTS_LIST,
    payload,
    referrer: window.location.href,
  });

  const components = response.ok ? response.data : [];

  return components.map((c: any) => c.component_id);
}

export async function getCommitReport(
  metadata: FileMetadata,
  flag: string | undefined,
  component_id: string | undefined
): Promise<FileCoverageReportResponse> {
  // metadata.commit must be defined, check it before calling
  if (!metadata.commit) {
    throw new Error("getCommitReport called without commit sha");
  }

  const payload = {
    owner: metadata.owner,
    repo: metadata.repo,
    path: metadata.path,
    sha: metadata.commit,
    flag,
    component_id,
  };

  const response = await browser.runtime.sendMessage({
    type: MessageType.FETCH_COMMIT_REPORT,
    payload,
    referrer: window.location.href,
  });

  return response.data;
}

export async function getBranchReport(
  metadata: FileMetadata
): Promise<FileCoverageReportResponse> {
  const payload = {
    owner: metadata.owner,
    repo: metadata.repo,
    path: metadata.path,
    branch: metadata.branch,
  };

  const response = await browser.runtime.sendMessage({
    type: MessageType.FETCH_COMMIT_REPORT,
    payload,
    referrer: window.location.href,
  });

  return response.data;
}

export async function getPRReport(url: any) {
  const payload = {
    owner: url.owner,
    repo: url.repo,
    pullid: url.id,
  };

  const response = await browser.runtime.sendMessage({
    type: MessageType.FETCH_PR_COMPARISON,
    payload: payload,
    referrer: window.location.href,
  });

  return response.data;
}

export async function getConsent(): Promise<Consent> {
  const response = await browser.runtime.sendMessage({
    type: MessageType.GET_CONSENT,
  });

  return response;
}
