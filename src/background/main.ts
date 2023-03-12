import browser from "webextension-polyfill";
import { MessageType } from "../types";
import { print } from "../utils";
import { Codecov } from "../service";

async function main(): Promise<void> {
  browser.runtime.onMessage.addListener(handleMessages);
}

async function handleMessages(message: { type: MessageType; payload: any }) {
  print(
    `executing ${message.type} with payload: ${JSON.stringify(message.payload)}`
  );
  if (message.type === MessageType.FETCH_REPORT) {
    return Codecov.fetchReport(message.payload);
  }
}

main().catch(console.log);
