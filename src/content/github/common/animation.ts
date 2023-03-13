// This approach taken from refined-github
// https://github.com/refined-github/refined-github/blob/23.2.20/source/helpers/selector-observer.tsx
import {
  animationAttachmentId,
  animationDefinitionId,
  animationName,
  seenClassName,
} from "./constants";
import { css } from "code-tag";

function registerAnimation(animationName: string) {
  const rule = document.createElement("style");
  rule.id = animationDefinitionId;
  rule.textContent = css`
    @keyframes ${animationName} {
    }
  `;
  document.head.append(rule);
}

function getListener(
  seenMark: string,
  selector: string,
  callback: (element: HTMLElement) => void
) {
  return function (event: AnimationEvent) {
    const target = event.target as HTMLElement;
    // The target can match a selector even if the animation actually happened on a ::before pseudo-element, so it needs an explicit exclusion here
    if (target.classList.contains(seenMark) || !target.matches(selector)) {
      return;
    }

    // Removes this specific element’s animation once it was seen
    target.classList.add(seenMark);

    callback(target);
  };
}

export function animateAndAnnotateLines(
  lineSelector: string,
  cb: (element: HTMLElement) => void
) {
  registerAnimation(animationName);

  const rule = document.createElement("style");
  rule.id = animationAttachmentId;
  rule.textContent = css`
    :where(${String(lineSelector)}):not(.${seenClassName}) {
      animation: 1ms ${animationName};
    }
  `;
  document.body.prepend(rule);

  window.addEventListener(
    "animationstart",
    getListener(seenClassName, lineSelector, cb)
  );
}

export function clearAnimation(
  lineSelector: string,
  cb: (element: HTMLElement) => void
) {
  document.getElementById(animationDefinitionId)?.remove();
  document.getElementById(animationAttachmentId)?.remove();
  window.removeEventListener(
    "animationstart",
    getListener(seenClassName, lineSelector, cb)
  );
}

export function clearAnnotations(cb: (element: HTMLElement) => void) {
  const lines = document.getElementsByClassName(seenClassName);
  // @ts-ignore
  Array.from(lines).map((line: HTMLElement) => {
    line.classList.remove(seenClassName);
    cb(line);
  });
}
