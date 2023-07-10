import browser from "webextension-polyfill";

import { MessageType } from "src/types";
import { Codecov } from "src/service";
import {
  registerContentScript,
  unregisterContentScript,
} from "./dynamic_content_scripts";

async function main(): Promise<void> {
  browser.runtime.onMessage.addListener(handleMessages);
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
    case MessageType.UNREGISTER_CONTENT_SCRIPTS:
      return unregisterContentScript(message.payload);
  }
}

main().catch(console.log);
