import browser from "webextension-polyfill";
import {
  init as sentryInit,
  browserTracingIntegration,
  startSpan,
} from "@sentry/browser";

import { MessageType } from "src/types";
import { Codecov } from "src/service";
import {
  registerContentScript,
  unregisterContentScriptIfExists,
} from "./dynamic_content_scripts";

async function handleConsent(): Promise<void> {
  const consent = await new Codecov().getConsent();
  if (!consent) {
    const url = browser.runtime.getURL("consent.html");
    await browser.tabs.create({ url, active: true });
  }
}

async function main(): Promise<void> {
  browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
    switch (reason) {
      case "install": {
        await handleConsent();
      }
      case "update": {
        await handleConsent();
      }
    }
  });

  browser.runtime.onMessage.addListener(handleMessages);
}

async function handleMessages(message: {
  type: MessageType;
  payload: any;
  referrer?: string;
}) {
  const codecov = new Codecov();
  if (await codecov.getConsent()) {
    console.log("Have data consent, initializing Sentry");
    sentryInit({
      dsn: process.env.SENTRY_DSN,

      integrations: [
        browserTracingIntegration({
          // disable automatic span creation
          instrumentNavigation: false,
          instrumentPageLoad: false,
        }),
      ],

      tracesSampleRate: 1.0,
    });
  } else {
    console.log("Do not have data consent, not initializing Sentry");
  }

  return startSpan({ name: message.type }, async () => {
    switch (message.type) {
      case MessageType.FETCH_COMMIT_REPORT:
        return codecov.fetchCommitReport(message.payload, message.referrer!);
      case MessageType.FETCH_PR_COMPARISON:
        return codecov.fetchPRComparison(message.payload, message.referrer!);
      case MessageType.FETCH_FLAGS_LIST:
        return codecov.listFlags(message.payload, message.referrer!);
      case MessageType.FETCH_COMPONENTS_LIST:
        return codecov.listComponents(message.payload, message.referrer!);
      case MessageType.CHECK_AUTH:
        return codecov.checkAuth(message.payload);
      case MessageType.GET_CONSENT:
        return codecov.getConsent();
      case MessageType.SET_CONSENT:
        return codecov.setConsent(message.payload);
      case MessageType.REGISTER_CONTENT_SCRIPTS:
        return registerContentScript(message.payload);
      case MessageType.UNREGISTER_CONTENT_SCRIPTS:
        return unregisterContentScriptIfExists(message.payload);
    }
  });
}

main().catch(console.log);
