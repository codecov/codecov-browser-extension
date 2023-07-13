import React, { ChangeEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import clsx from "clsx";
import urlJoin from "url-join";

import "./styles.css";
import {
  selfHostedCodecovApiToken,
  selfHostedCodecovURLStorageKey,
  selfHostedGitHubURLStorageKey,
  useSelfHostedStorageKey,
} from "src/constants";
import { MessageType } from "src/types";

const Popup = () => {
  // persisted state
  const [useSelfHosted, setUseSelfHosted] = useState(false);
  const [codecovUrl, setCodecovUrl] = useState("");
  const [githubUrl, setGitHubUrl] = useState("");
  const [codecovApiToken, setCodecovApiToken] = useState("");

  // ephemeral state
  const [isUrlError, setIsUrlError] = useState(false);
  const [isTokenError, setIsTokenError] = useState(false);
  const [isTabError, setIsTabError] = useState(false);
  const [isUnregisterTabError, setIsUnregisterTabError] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const isFormInvalid =
    useSelfHosted && !(codecovUrl && codecovApiToken && githubUrl);
  const isError =
    isUrlError || isTokenError || isTabError || isUnregisterTabError;

  useEffect(() => {
    loadPersistedState();
  }, []);

  const loadPersistedState = () => {
    browser.storage.sync
      .get([
        useSelfHostedStorageKey,
        selfHostedCodecovURLStorageKey,
        selfHostedGitHubURLStorageKey,
        selfHostedCodecovApiToken,
      ])
      .then((result) => {
        const _useSelfHosted = result[useSelfHostedStorageKey] || false;
        setUseSelfHosted(_useSelfHosted);
        const _codecovUrl = result[selfHostedCodecovURLStorageKey] || "";
        setCodecovUrl(_codecovUrl);
        const _githubUrl = result[selfHostedGitHubURLStorageKey] || "";
        setGitHubUrl(_githubUrl);
        const _codecovApiToken = result[selfHostedCodecovApiToken] || "";
        setCodecovApiToken(_codecovApiToken);
      });
  };

  const resetEphemeralState = () => {
    setIsUrlError(false);
    setIsTokenError(false);
    setIsTabError(false);
    setIsUnregisterTabError(false);
    setIsDone(false);
  };

  const handleTextChange =
    (setter: React.Dispatch<React.SetStateAction<any>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      resetEphemeralState();
      setter(e.target.value);
    };

  const registerContentScripts = async (url: string) => {
    const payload = {
      url,
    };

    return browser.runtime.sendMessage({
      type: MessageType.REGISTER_CONTENT_SCRIPTS,
      payload,
    });
  };

  const unregisterContentScripts = async () => {
    const payload = {};

    return browser.runtime.sendMessage({
      type: MessageType.UNREGISTER_CONTENT_SCRIPTS,
      payload,
    });
  };

  const handleSave = async () => {
    if (useSelfHosted) {
      try {
        const payload = {
          baseUrl: codecovUrl,
          token: codecovApiToken,
        };

        const isAuthOk = await browser.runtime.sendMessage({
          type: MessageType.CHECK_AUTH,
          payload,
        });

        if (!isAuthOk) {
          setIsTokenError(true);
          return;
        }
      } catch (error) {
        setIsUrlError(true);
        return;
      }

      const isScriptRegistered = await registerContentScripts(githubUrl);
      if (!isScriptRegistered) {
        setIsTabError(true);
        return;
      }
    }

    if (!useSelfHosted) {
      const isScriptUnregistered = await unregisterContentScripts();
      if (!isScriptUnregistered) {
        setIsUnregisterTabError(true);
        return;
      }
    }

    await browser.storage.sync.set({
      [useSelfHostedStorageKey]: useSelfHosted,
      [selfHostedCodecovURLStorageKey]: codecovUrl,
      [selfHostedGitHubURLStorageKey]: githubUrl,
      [selfHostedCodecovApiToken]: codecovApiToken,
    });

    resetEphemeralState();
    setIsDone(true);
  };

  const handleSelfHostedClick = () => {
    resetEphemeralState();
    setUseSelfHosted((x) => !x);
    setCodecovUrl("");
    setGitHubUrl("");
    setCodecovApiToken("");
  };

  return (
    <div data-theme="light">
      <div className="navbar bg-primary flex justify-between">
        <a
          className="btn btn-ghost normal-case text-lg text-white"
          href="https://about.codecov.io/"
          target="_blank"
        >
          Codecov
        </a>
        <button
          onClick={handleSave}
          className={clsx(
            "btn btn-ghost text-white",
            // custom disabled state for styling
            (isDone || isFormInvalid || isError) &&
              "cursor-not-allowed text-opacity-50"
          )}
        >
          {isDone ? "Done" : isError ? "Error" : "Save"}
        </button>
        {/*<div className="pr-4">*/}
        {/*  <FontAwesomeIcon icon={faCircleNotch} spin color="white" size="xl" />*/}
        {/*</div>*/}
      </div>
      <div className="w-[28rem] px-6 py-4">
        <div>
          <label className="label cursor-pointer">
            <span className="label-text font-semibold">
              Use self hosted instance
            </span>
            <input
              type="checkbox"
              className={clsx("toggle toggle-primary")}
              checked={useSelfHosted}
              onChange={handleSelfHostedClick}
            />
          </label>
          {/* <div className={clsx("hidden", isError && "!block")}>
            <label className="label">
              <span className="label-text text-red-500">
                An error occurred
              </span>
            </label>
          </div> */}
          {useSelfHosted && (
            <div className="space-y-2 px-4">
              <div>
                <label className="label">
                  <span className="label-text">Codecov URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://codecov.example.com"
                  className={clsx(
                    "input input-bordered w-full",
                    (isUrlError || isTokenError) && "border-2 border-red-500"
                  )}
                  value={codecovUrl}
                  onChange={handleTextChange(setCodecovUrl)}
                />
                {isUrlError && (
                  <label className="label">
                    <span className="label-text-alt text-red-500">
                      Request failed
                    </span>
                  </label>
                )}
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Codecov API Token</span>
                </label>
                <input
                  type="text"
                  placeholder="1a2bc3de-f45g-6hi7-8j90-12k3l45mn678"
                  className={clsx(
                    "input input-bordered w-full",
                    isTokenError && "border-2 border-red-500"
                  )}
                  value={codecovApiToken}
                  onChange={handleTextChange(setCodecovApiToken)}
                />
                {isTokenError && (
                  <label className="label">
                    <span className="label-text-alt text-red-500">
                      Authentication failed
                    </span>
                  </label>
                )}
              </div>
              <div>
                <label className="label">
                  <span className="label-text">GitHub URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://github.example.com"
                  className={clsx(
                    "input input-bordered w-full",
                    isTabError && "border-2 border-red-500"
                  )}
                  value={githubUrl}
                  onChange={handleTextChange(setGitHubUrl)}
                />
                <label className="label">
                  <span
                    className={clsx(
                      "label-text-alt",
                      isTabError && "text-red-500"
                    )}
                  >
                    This URL must be loaded in the active tab
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
        <div className="divider" />
        <div>
          Issues and feedback are welcome at{" "}
          <a
            href="https://github.com/codecov/codecov-browser-extension/issues"
            target="_blank"
            className="text-primary"
          >
            https://github.com/codecov/codecov-browser-extension/issues{" "}
          </a>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById("app")!).render(<Popup />);
