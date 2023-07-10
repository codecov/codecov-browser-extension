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

  try {
    await unregisterContentScript(payload);
  } catch (error) {
    // noop
  }

  await browser.scripting.registerContentScripts([
    {
      id: dynamicContentScriptRegistrationId,
      matches: [urlJoin(url, "/*")],
      js: ["js/vendor.js", "js/githubFile.js", "js/githubPR.js"],
    },
  ]);

  return true;
}

export async function unregisterContentScript(payload: any): Promise<boolean> {
  const registrations = await browser.scripting.getRegisteredContentScripts({
    ids: [dynamicContentScriptRegistrationId],
  });
  const registeredUrl = _.trimEnd(registrations[0].matches?.[0], "/*");

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]?.url?.startsWith(registeredUrl)) {
    return false;
  }

  await browser.scripting.unregisterContentScripts({
    ids: [dynamicContentScriptRegistrationId],
  });

  return true;
}
