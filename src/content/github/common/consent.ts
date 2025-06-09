import { consentStorageKey, consentDialogCopy } from "./constants";

export async function ensureConsent(
  { checkOnly }: { checkOnly: boolean } = { checkOnly: false }
) {
  let consent: boolean = await chrome.storage.local
    .get(consentStorageKey)
    .then((res) => res[consentStorageKey]);

  if (consent) {
    return;
  }

  if (!checkOnly) {
    consent = window.confirm(consentDialogCopy);
  }

  if (!consent) {
    throw new Error("Codecov extension data collection consent not given.");
  }

  const storageObject: { [id: string]: boolean } = {};
  storageObject[consentStorageKey] = consent;

  chrome.storage.local.set(storageObject);

  return Promise.resolve();
}
