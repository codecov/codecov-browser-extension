import browser from "webextension-polyfill";
import { MessageType } from "../utils/types";
import { print } from "../utils/utils";

async function main(): Promise<void> {
  browser.runtime.onMessage.addListener(handleMessages);
}

main();

function handleMessages(message: { type: MessageType; payload: any }) {
  print(
    `executing ${message.type} with payload: ${JSON.stringify(message.payload)}`
  );
  if (message.type === MessageType.FETCH_REPORT) {
    return fetchReport(message.payload);
  }
}

async function fetchReport(payload: any) {
  const { service, owner, repo, sha, branch, path } = payload;

  const url = new URL(
    `https://codecov.io/api/v2/${service}/${owner}/repos/${repo}/report`
  );

  const params: { [key: string]: string } = {
    path,
  };
  if (branch) {
    params.branch = branch;
  } else if (sha) {
    params.sha = sha;
  }
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url.toString());
  const data = await response.json();

  return {
    ok: response.ok,
    data,
  };
}
