import browser from "webextension-polyfill";
import _ from "lodash";
import React from "dom-chef";

export async function createDropdown({
  title,
  tooltip,
  options,
  onClick,
  previousElement,
  selectedOptions,
}: {
  title: string;
  tooltip: string;
  options: string[];
  onClick: (selectedOptions: string[]) => void;
  previousElement: HTMLElement;
  selectedOptions: string[];
}) {
  // Build the button out of the Raw/copy/download button group
  const rawButton = document
    .querySelector('[data-testid="download-raw-button"]')!
    .closest("div");
  if (!rawButton) throw new Error("Could not find raw button group");
  const dropdownButton = rawButton.cloneNode(true) as HTMLElement;
  // Remove copy button
  const copyButton = dropdownButton.querySelector(
    '[data-testid="copy-raw-button"]'
  );
  if (!copyButton) throw new Error("Could not find copy button");
  dropdownButton.removeChild(copyButton);
  // Replace download button with dropdown button
  const downloadButton = dropdownButton.querySelector(
    '[data-testid="download-raw-button"]'
  );
  if (!downloadButton || !downloadButton.firstChild)
    throw new Error("Could not find download button or it is missing children");
  const triangleDownSvg = document.querySelector(".octicon-triangle-down");
  if (!triangleDownSvg) throw new Error("Could not find triangle down svg");
  downloadButton.replaceChild(triangleDownSvg, downloadButton.firstChild);

  const textNode = dropdownButton.querySelector('[data-testid="raw-button"]');
  if (!textNode || !textNode.parentElement)
    throw new Error("Could not find textNode");
  textNode.innerHTML = "";
  textNode.ariaDisabled = "false";
  textNode.parentElement.ariaLabel = tooltip;
  textNode.appendChild(<span>{title}</span>);
  previousElement.insertAdjacentElement("afterend", dropdownButton);

  const allSelected = _.isEqual(options, selectedOptions);

  const optionsList = (
    <ul className="codecov-list-reset">
      <li
        className="cursor-pointer codecov-px1"
        onClick={() => onClick(allSelected ? [] : options)}
      >
        Select {allSelected ? "None" : "All"}
      </li>
      {options.map((option: string) => {
        const isSelected = selectedOptions.indexOf(option) > -1;
        return (
          <>
            <hr className="codecov-my1 codecov-mxn2" />
            <li
              className="cursor-pointer"
              onClick={() =>
                onClick(
                  isSelected
                    ? _.without(selectedOptions, option)
                    : selectedOptions.concat(option)
                )
              }
            >
              <input
                type="checkbox"
                className="codecov-align-middle"
                checked={isSelected}
              />
              <span className="codecov-pl1 codecov-align-middle">{option}</span>
            </li>
          </>
        );
      })}
    </ul>
  );

  return { button: dropdownButton, list: optionsList };
}
