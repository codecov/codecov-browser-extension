import browser from "webextension-polyfill";
import urlJoin from "url-join";

import { MessageType } from "src/types";
import { Codecov } from "src/service";

async function main(): Promise<void> {
  browser.runtime.onMessage.addListener(handleMessages);
}

async function registerContentScript(payload: any): Promise<boolean> {
  const { url } = payload;

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]?.url?.startsWith(url)) {
    return false;
  }

  try {
    await browser.scripting.unregisterContentScripts({
      ids: [url]
    })
  } catch (error) {
    // noop
  }

  await browser.scripting.registerContentScripts([{
    id: url,
    matches: [urlJoin(url, "/*")],
    "js": ["js/vendor.js", "js/githubFile.js", "js/githubPR.js"]
  }])

  return true;
}

async function handleMessages(message: { type: MessageType; payload: any }) {
  switch (message.type) {
    case MessageType.CHECK_AUTH:
      return Codecov.checkAuth(message.payload);
    case MessageType.FETCH_COMMIT_REPORT:
      return Codecov.fetchCommitReport(message.payload);
    case MessageType.FETCH_PR_COMPARISON:
      return Codecov.fetchPRComparison(message.payload);
    case MessageType.FETCH_FLAGS_LIST:
      return Codecov.listFlags(message.payload);
    case MessageType.FETCH_COMPONENTS_LIST:
      return Codecov.listComponents(message.payload);
    case MessageType.REGISTER_CONTENT_SCRIPTS:
      return registerContentScript(message.payload);
  }
}

main().catch(console.log);
