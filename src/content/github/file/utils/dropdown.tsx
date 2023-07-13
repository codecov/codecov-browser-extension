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
  const editButton = document
    .querySelector('[data-testid="edit-button"]')!
    .closest("div")!;
  const dropdownButton = editButton.cloneNode(true) as HTMLElement;
  const textNode = dropdownButton.querySelector("a")!;
  textNode.innerHTML = "";
  textNode.href = "javascript:void(0)";
  textNode.parentElement!.ariaLabel = tooltip;
  textNode.style.padding = `0 ${title.length * 5}px`;
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
