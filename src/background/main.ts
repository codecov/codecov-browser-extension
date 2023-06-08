import browser from "webextension-polyfill";

import { MessageType } from "src/types";
import { Codecov } from "src/service";

async function main(): Promise<void> {
  browser.runtime.onMessage.addListener(handleMessages);
}

async function handleMessages(message: { type: MessageType; payload: any }) {
  switch (message.type) {
    case MessageType.FETCH_COMMIT_REPORT:
      return Codecov.fetchCommitReport(message.payload);
    case MessageType.FETCH_PR_COMPARISON:
      return Codecov.fetchPRComparison(message.payload);
    case MessageType.FETCH_FLAGS_LIST:
      return Codecov.listFlags(message.payload);
    case MessageType.FETCH_COMPONENTS_LIST:
      return Codecov.listComponents(message.payload);
  }
}

main().catch(console.log);
