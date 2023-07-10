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

  const urlMatch = urlJoin(url, "/*")

  await browser.scripting.registerContentScripts([
    {
      id: dynamicContentScriptRegistrationId,
      matches: [urlMatch],
      js: ["js/vendor.js", "js/githubFile.js", "js/githubPR.js"],
    },
  ]);

  return true;
}

export async function unregisterContentScriptIfExists(payload: any): Promise<boolean> {
  const registrations = await browser.scripting.getRegisteredContentScripts({
    ids: [dynamicContentScriptRegistrationId],
  });
  if (registrations.length === 0) {
    return true;
  }

  await browser.scripting.unregisterContentScripts({
    ids: [dynamicContentScriptRegistrationId],
  });

  return true;
}
