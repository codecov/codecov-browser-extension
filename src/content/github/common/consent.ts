import { print } from "src/utils";
import { consentStorageKey, consentDialogCopy } from "./constants";

export async function ensureConsent(
  { checkOnly }: { checkOnly: boolean } = { checkOnly: false }
): Promise<boolean> {
  // We only need to get consent for firefox
  // @ts-ignore IS_FIREFOX is populated by Webpack at build time
  console.log("hi", IS_FIREFOX);
  // @ts-ignore IS_FIREFOX is populated by Webpack at build time
  if (!IS_FIREFOX) {
    return true;
  }

  let consent: boolean = await chrome.storage.local
    .get(consentStorageKey)
    .then((res) => res[consentStorageKey]);

  if (consent) {
    return consent;
  }

  if (!checkOnly) {
    consent = window.confirm(consentDialogCopy);
  }

  if (!consent) {
    print("no consent was given, so the extension will not run");
    return consent;
  }

  const storageObject: { [id: string]: boolean } = {};
  storageObject[consentStorageKey] = consent;

  chrome.storage.local.set(storageObject);

  return consent;
}
