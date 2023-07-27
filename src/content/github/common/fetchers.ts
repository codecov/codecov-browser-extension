import browser from "webextension-polyfill";
import {
  FileCoverageReportResponse,
  FileMetadata,
  MessageType,
} from "src/types";

export async function getMetadata(url: string): Promise<FileMetadata> {
  const response = await fetch(url).then((response) => response.json());
  return {
    owner: response.payload.repo.ownerLogin,
    repo: response.payload.repo.name,
    path: response.payload.path,
    commit: response.payload.refInfo.currentOid,
  };
}

export async function getFlags(metadata: FileMetadata): Promise<string[]> {
  const payload = {
    service: "github",
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
    service: "github",
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
  const payload = {
    service: "github",
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

export async function getPRReport(url: any) {
  const payload = {
    service: "github",
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
