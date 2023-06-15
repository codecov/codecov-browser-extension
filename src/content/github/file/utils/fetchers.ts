import browser from "webextension-polyfill";
import { MessageType } from "src/types";

export async function getFlags(url: {
  [key: string]: string;
}): Promise<string[]> {
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

export async function getComponents(url: {
  [key: string]: string;
}): Promise<string[]> {
  const payload = {
    service: "github",
    owner: url.owner,
    repo: url.repo,
  };

  const componentsResponse = await browser.runtime.sendMessage({
    type: MessageType.FETCH_COMPONENTS_LIST,
    payload,
  });

  return componentsResponse.data.map((c: any) => c.component_id);
}

export async function getCoverageReport(
  url: { [key: string]: string },
  flag: string | undefined,
  component_id: string | undefined
) {
  const commonPayload = {
    service: "github",
    owner: url.owner,
    repo: url.repo,
    path: url.path,
    flag,
    component_id,
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
