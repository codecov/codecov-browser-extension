import browser from "webextension-polyfill";
import * as Sentry from "@sentry/browser";

import { MessageType } from "src/types";
import { Codecov } from "src/service";
import {
  registerContentScript,
  unregisterContentScriptIfExists,
} from "./dynamic_content_scripts";

async function main(): Promise<void> {
  browser.runtime.onMessage.addListener(handleMessages);

  Sentry.init({
    // @ts-ignore SENTRY_DSN is populated by Webpack at build time
    dsn: SENTRY_DSN,

    integrations: [
      Sentry.browserTracingIntegration({
        // disable automatic span creation
        instrumentNavigation: false,
        instrumentPageLoad: false,
      }),
    ],

    tracesSampleRate: 1.0,
  });
}

async function handleMessages(message: {
  type: MessageType;
  payload: any;
  referrer?: string;
}) {
  return Sentry.startSpan({ name: message.type }, async () => {
    switch (message.type) {
      case MessageType.FETCH_COMMIT_REPORT:
        return Codecov.fetchCommitReport(message.payload, message.referrer!);
      case MessageType.FETCH_PR_COMPARISON:
        return Codecov.fetchPRComparison(message.payload, message.referrer!);
      case MessageType.FETCH_FLAGS_LIST:
        return Codecov.listFlags(message.payload, message.referrer!);
      case MessageType.FETCH_COMPONENTS_LIST:
        return Codecov.listComponents(message.payload, message.referrer!);
      case MessageType.CHECK_AUTH:
        return Codecov.checkAuth(message.payload);
      case MessageType.REGISTER_CONTENT_SCRIPTS:
        return registerContentScript(message.payload);
      case MessageType.UNREGISTER_CONTENT_SCRIPTS:
        return unregisterContentScriptIfExists(message.payload);
    }
  });
}

main().catch(console.log);
