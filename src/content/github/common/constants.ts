// The version number here should represent the last version where consent requirement was updated.
// We must update the key's version to re-request consent whenever the data we collect changes.
export const consentStorageKey = "codecov-consent-0.5.9";
export const consentDialogCopy =
  "By clicking OK, you agree to the Codecov browser extension's privacy policy (https://addons.mozilla.org/en-US/firefox/addon/codecov/privacy/). This message will reappear if you click Cancel. If you do not wish to agree, please uninstall the extension.";

export const animationName = "codecov-gh-observer";

export const animationDefinitionId = `${animationName}-keyframe`;

export const animationAttachmentId = `${animationName}-attachment`;

export const seenClassName = "codecov-seen-mark";

export const colors = {
  redAlpha: "rgba(245,32,32,0.25)",
  greenAlpha: "rgba(33,181,119,0.25)",
  yellowAlpha: "rgba(244,176,27,0.25)",
  red: "rgb(245,32,32)",
  green: "rgb(33,181,119)",
  yellow: "rgb(244,176,27)",
};
