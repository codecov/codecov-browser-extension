import browser from "webextension-polyfill";
import { MessageType } from "src/types";
import { print } from "src/utils";
import { Codecov } from "src/service";

async function main(): Promise<void> {
  browser.runtime.onMessage.addListener(handleMessages);
}

async function handleMessages(message: { type: MessageType; payload: any }) {
  print(
    `executing ${message.type} with payload: ${JSON.stringify(message.payload)}`
  );
  switch (message.type) {
    case MessageType.FETCH_COMMIT_REPORT:
      return Codecov.fetchCommitReport(message.payload);
    case MessageType.FETCH_PR_COMPARISON:
      return Codecov.fetchPRComparison(message.payload);
  }
}

main().catch(console.log);
