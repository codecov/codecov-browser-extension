/**
 * Thrown by waitForElement when the element does not appear within the timeout.
 */
export class ElementNotFoundError extends Error {
  constructor(selector: string, timeoutMs: number) {
    super(`Element "${selector}" not found within ${timeoutMs}ms`);
    this.name = "ElementNotFoundError";
  }
}

/**
 * Waits for a DOM element matching `selector` to appear in the document.
 * Uses MutationObserver for efficiency. Resolves with the element when found,
 * or rejects with an ElementNotFoundError after `timeoutMs` milliseconds.
 */
export function waitForElement(
  selector: string,
  timeoutMs = 5000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new ElementNotFoundError(selector, timeoutMs));
    }, timeoutMs);
  });
}
