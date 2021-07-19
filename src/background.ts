import browser from "webextension-polyfill";
import { patternToRegex } from "webext-patterns";
import { MessageType } from "./common";

async function main(): Promise<void> {
  browser.runtime.onMessage.addListener(handleMessages);

  // trigger content script on url changes (navigation)
  browser.tabs.onUpdated.addListener(triggerContentScript);
  // TODO: check why addListener is not accepting filters
  //
  //   browser.tabs.onUpdated.addListener(triggerContentScript, {
  //     properties: ["url"],
  //   });
}

main();

function handleMessages(message: { type: MessageType; payload: any }) {
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

async function triggerContentScript(
  tabId: number,
  changeInfo: browser.Tabs.OnUpdatedChangeInfoType,
  tab: browser.Tabs.Tab
): Promise<void> {
  // don't trigger if URL not in manifest
  const permissions = await browser.permissions.getAll();
  if (
    !permissions.origins?.some((origin) =>
      patternToRegex(origin).test(tab.url || "")
    )
  ) {
    return;
  }

  if (changeInfo.status === "complete") {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["js/content_script.js"],
    });
  }
}
