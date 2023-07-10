import React, { ChangeEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import "./styles.css";
import {
  selfHostedCodecovApiToken,
  selfHostedCodecovURLStorageKey,
  selfHostedGitHubURLStorageKey,
  useSelfHostedStorageKey,
} from "src/content/github/file/utils/constants";

const Popup = () => {
  const [useSelfHosted, setUseSelfHosted] = useState(false);
  const [codecovUrl, setCodecovUrl] = useState("");
  const [githubUrl, setGitHubUrl] = useState("");
  const [codecovApiToken, setCodecovApiToken] = useState("");

  useEffect(() => {
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
  }, []);

  const handleTextChange =
    (setter: React.Dispatch<React.SetStateAction<any>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
    };

  const handleSave = async () => {
    await browser.storage.sync.set({
      [useSelfHostedStorageKey]: useSelfHosted,
      [selfHostedCodecovURLStorageKey]: codecovUrl,
      [selfHostedGitHubURLStorageKey]: githubUrl,
      [selfHostedCodecovApiToken]: codecovApiToken,
    });
  };

  const handleSelfHostedClick = () => {
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
        <button className="btn btn-ghost text-white" onClick={handleSave}>
          Save
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
                  className="input input-bordered w-full"
                  value={codecovUrl}
                  onChange={handleTextChange(setCodecovUrl)}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Codecov API Token</span>
                </label>
                <input
                  type="text"
                  placeholder="1a2bc3de-f45g-6hi7-8j90-12k3l45mn678"
                  className="input input-bordered w-full"
                  value={codecovApiToken}
                  onChange={handleTextChange(setCodecovApiToken)}
                />
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
