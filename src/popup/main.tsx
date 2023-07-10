import React, { ChangeEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import clsx from 'clsx';

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
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    loadPersistedState();
  }, []);

  const loadPersistedState = () => {
    browser.storage.sync
    .get([
      useSelfHostedStorageKey,
      selfHostedCodecovURLStorageKey,
      selfHostedGitHubURLStorageKey,
      selfHostedCodecovApiToken
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
  }

  const resetEphemeralState = () => {
    setIsUrlError(false);
    setIsTokenError(false);
    setIsDone(false);
  }

  const handleTextChange =
    (setter: React.Dispatch<React.SetStateAction<any>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      resetEphemeralState();
      setter(e.target.value);
    };

  const handleSave = async () => {

    if (useSelfHosted) {
      const payload = {
        baseUrl: codecovUrl,
        token: codecovApiToken
      }

      try {
        const isAuthOk = await browser.runtime.sendMessage({
          type: MessageType.CHECK_AUTH,
          payload,
        });

        if (!isAuthOk) {
          setIsTokenError(true);
          return
        }
      } catch (error) {
        setIsUrlError(true);
        return;
      }
    }

    await browser.storage.sync.set({
      [useSelfHostedStorageKey]: useSelfHosted,
      [selfHostedCodecovURLStorageKey]: codecovUrl,
      [selfHostedGitHubURLStorageKey]: githubUrl,
      [selfHostedCodecovApiToken]: codecovApiToken,
    });

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
        <button className="btn btn-ghost text-white" onClick={handleSave} disabled={isDone}>
          {isDone ? "Done" : "Save"}
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
              className="toggle toggle-primary"
              checked={useSelfHosted}
              onChange={handleSelfHostedClick}
            />
          </label>
          {useSelfHosted && (
            <div className="space-y-2 px-4">
              <div>
                <label className="label">
                  <span className="label-text">Codecov URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://codecov.example.com"
                  className={clsx("input input-bordered w-full", isUrlError && "border-2 border-red-500")}
                  value={codecovUrl}
                  onChange={handleTextChange(setCodecovUrl)}
                />
                {isUrlError && (
                  <label className="label">
                    <span className="label-text-alt text-red-500">Request failed</span>
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
                  className={clsx("input input-bordered w-full", isTokenError && "border-2 border-red-500")}
                  value={codecovApiToken}
                  onChange={handleTextChange(setCodecovApiToken)}
                />
                {isTokenError && (
                  <label className="label">
                    <span className="label-text-alt text-red-500">Authentication failed</span>
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
                  className="input input-bordered w-full"
                  value={githubUrl}
                  onChange={handleTextChange(setGitHubUrl)}
                />
              </div>
            </div>
          )}
        </div>
        <div className="divider" />
        <div>
          The Codecov Browser Extension is currently in Beta. <br />
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
