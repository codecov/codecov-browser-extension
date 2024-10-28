import browser from "webextension-polyfill";
import urlJoin from "url-join";
import _ from "lodash";

import { dynamicContentScriptRegistrationId } from "src/constants";

export async function registerContentScript(payload: any): Promise<boolean> {
  const { url } = payload;

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tabs[0]?.url?.startsWith(url)) {
    return false;
  }

  await unregisterContentScriptIfExists(payload);

  if (new URL(url).hostname === "github.com") {
    // content script for github.com already registered in manifest
    return true;
  }

  const urlMatch = urlJoin(url, "/*");

  await browser.scripting.registerContentScripts([
    {
      id: dynamicContentScriptRegistrationId,
      matches: [urlMatch],
      js: ["js/vendor.js", "js/githubFile.js", "js/githubPR.js"],
    },
  ]);

  return true;
}

export async function unregisterContentScriptIfExists(
  payload: any
): Promise<boolean> {
  let registrations: browser.Scripting.RegisteredContentScript[];
  try {
    registrations = await browser.scripting.getRegisteredContentScripts({
      ids: [dynamicContentScriptRegistrationId],
    });
  } catch (error: any) {
    // Safari throws if the script id doesn't exist, so handle that gracefully
    if (
      error instanceof Error &&
      error.message.match(
        /Invalid call to scripting.getRegisteredContentScripts\(\)\. No script with ID '.*'/
      )
    ) {
      return true;
    } else {
      throw error;
    }
  }

  if (registrations.length === 0) {
    return true;
  }

  await browser.scripting.unregisterContentScripts({
    ids: [dynamicContentScriptRegistrationId],
  });

  return true;
}
