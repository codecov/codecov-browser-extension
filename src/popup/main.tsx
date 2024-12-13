import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import clsx from "clsx";
import urlJoin from "url-join";

import "./styles.css";
import {
  codecovApiTokenStorageKey,
  selfHostedCodecovURLStorageKey,
  selfHostedGitHubURLStorageKey,
  codecovCloudApiUrl,
  providers,
} from "src/constants";
import { MessageType } from "src/types";

interface ToggleUrlInputProps {
  showInputLabel: string;
  showInput: boolean;
  setShowInput: (value: boolean) => void;
  urlInputLabel: string;
  urlInputPlaceholder: string;
  url: string;
  setUrl: (value: string) => void;
  errorMessage?: string;
  showError?: boolean;
}

function ToggleUrlInput({
  showInputLabel,
  showInput,
  setShowInput,
  urlInputLabel,
  urlInputPlaceholder,
  url,
  setUrl,
  errorMessage,
}: ToggleUrlInputProps) {
  const handleToggle = () => {
    setShowInput(!showInput);
    setUrl("");
  };

  const handleSpace: React.KeyboardEventHandler = (e) => {
    if (e.key === " ") {
      setShowInput(!showInput);
      setUrl("");
    }
  };

  return (
    <>
      <div className={clsx("rounded-md bg-black/10")}>
        <div
          className={clsx(
            "flex justify-between items-center cursor-pointer hover:bg-black/20 rounded-md p-2 pr-4"
          )}
          onClick={handleToggle}
          onKeyDown={handleSpace}
          tabIndex={0}
        >
          <label className="cursor-pointer">{showInputLabel}</label>
          <input
            type="checkbox"
            checked={showInput}
            onChange={handleToggle}
            tabIndex={-1}
          />
        </div>
        {showInput ? (
          <div className="flex flex-col px-2 pb-2">
            <label>{urlInputLabel}</label>
            <input
              type="text"
              placeholder={urlInputPlaceholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={clsx({
                "border-red-500": errorMessage,
              })}
            />
            {errorMessage ? (
              <p className="text-red-500 text-sm p-1">{errorMessage}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function Popup() {
  const [codecovApiToken, setCodecovApiToken] = useState("");
  const [useSelfHosted, setUseSelfHosted] = useState(false);
  const [codecovUrl, setCodecovUrl] = useState("");
  const [useGithubEnterprise, setUseGithubEnterprise] = useState(false);
  const [githubUrl, setGitHubUrl] = useState("");

  const [apiTokenError, setApiTokenError] = useState("");
  const [codecovUrlError, setCodecovUrlError] = useState("");
  const [githubUrlError, setGithubUrlError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPersistedState();
  }, []);

  const withDetectChanges = (setter: (value: string) => void) => {
    return (value: string) => {
      setHasChanges(true);
      setter(value);
    };
  };

  const loadPersistedState = () => {
    browser.storage.sync
      .get([
        selfHostedCodecovURLStorageKey,
        selfHostedGitHubURLStorageKey,
        codecovApiTokenStorageKey,
      ])
      .then((result) => {
        const _codecovApiToken = result[codecovApiTokenStorageKey];
        if (_codecovApiToken) {
          setCodecovApiToken(_codecovApiToken);
        }
        const _codecovUrl = result[selfHostedCodecovURLStorageKey];
        if (_codecovUrl) {
          setUseSelfHosted(true);
          setCodecovUrl(_codecovUrl);
        }
        const _githubUrl = result[selfHostedGitHubURLStorageKey];
        if (_githubUrl) {
          setUseGithubEnterprise(true);
          setGitHubUrl(_githubUrl);
        }
      });
  };

  const handleSave = async () => {
    if (useSelfHosted) {
      const urlMatch = urlJoin(codecovUrl, "/*");
      await browser.permissions.request({
        origins: [urlMatch],
      });
    }

    if (codecovApiToken && !isValidTokenFormat(codecovApiToken)) {
      setApiTokenError(
        "Invalid token format. Token should be a 32 hex digit UUID. See this input's placeholder value for en example."
      );
      return;
    }

    try {
      const payload = {
        baseUrl: useSelfHosted ? codecovUrl : codecovCloudApiUrl,
        token: codecovApiToken,
        provider: useGithubEnterprise
          ? providers.githubEnterprise
          : providers.github,
      };

      const isAuthOk = await browser.runtime.sendMessage({
        type: MessageType.CHECK_AUTH,
        payload,
      });

      if (!isAuthOk) {
        setApiTokenError(
          "API token authentication failed. Make sure your token is correct."
        );
        if (useSelfHosted) {
          setCodecovUrlError(
            "API token authentication failed. Make sure your self-hosted URL is correct."
          );
        }
        return;
      }
      setApiTokenError("");
      setCodecovUrlError("");
    } catch (error) {
      setCodecovUrlError(
        "Invalid URL. Make sure your self-hosted URL is correct."
      );
      return;
    }

    if (useGithubEnterprise) {
      const isScriptRegistered = await registerContentScripts(githubUrl);
      if (!isScriptRegistered) {
        setGithubUrlError(
          "This URL must be loaded in the active tab when you press Save."
        );
        return;
      }
    } else {
      await unregisterContentScripts();
    }
    setGithubUrlError("");

    await browser.storage.sync.set({
      [codecovApiTokenStorageKey]: codecovApiToken,
      [selfHostedCodecovURLStorageKey]: codecovUrl,
      [selfHostedGitHubURLStorageKey]: githubUrl,
    });

    setHasChanges(false);
  };

  return (
    <div className="w-[28rem] rounded-md">
      <div className="w-full h-12 bg-codecov-pink flex justify-between items-center p-4 text-white">
        <CodecovLogo />
        <button
          disabled={!hasChanges}
          className="text-sm rounded-md hover:bg-black/20 active:bg-black/30 p-2 disabled:text-black/30 disabled:bg-black/20"
          onClick={handleSave}
        >
          Save
        </button>
      </div>
      <div className="px-6 py-2 flex flex-col gap-4">
        <div className="flex flex-col">
          <label>Codecov API token</label>
          <input
            type="text"
            placeholder="1a2bc3de-f45g-6hi7-8j90-12k3l45mn678"
            value={codecovApiToken}
            onChange={(e) =>
              withDetectChanges(setCodecovApiToken)(e.target.value)
            }
            className={clsx({
              "border-red-500": apiTokenError,
            })}
          />
          {apiTokenError ? (
            <p className="text-red-500 text-sm p-1">{apiTokenError}</p>
          ) : null}
        </div>
        <ToggleUrlInput
          showInputLabel="Using self-hosted Codecov?"
          showInput={useSelfHosted}
          setShowInput={setUseSelfHosted}
          urlInputLabel="Self-hosted Codecov URL"
          urlInputPlaceholder="https://codecov.your-company.com"
          url={codecovUrl}
          setUrl={withDetectChanges(setCodecovUrl)}
          errorMessage={codecovUrlError}
        />
        <ToggleUrlInput
          showInputLabel="Using GitHub Enterprise?"
          showInput={useGithubEnterprise}
          setShowInput={setUseGithubEnterprise}
          urlInputLabel="GitHub Enterprise URL"
          urlInputPlaceholder="https://github.your-company.com"
          url={githubUrl}
          setUrl={withDetectChanges(setGitHubUrl)}
          errorMessage={githubUrlError}
        />
      </div>
      <div className="px-6 pb-2 text-sm">
        Issues and feedback are welcome on{" "}
        <a
          href="https://github.com/codecov/codecov-browser-extension/issues"
          target="_blank"
        >
          GitHub
        </a>
        !
      </div>
    </div>
  );
}

const CodecovLogo = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="80" height="80" fill="#F01F7A" />
    <path
      d="M40.0713 9.40002C22.3964 9.40002 8 23.6539 8 41.0437V41.1862L13.4165 44.3221H13.559C16.98 42.0415 21.1136 41.1862 25.2472 41.8989C28.098 42.4691 30.8062 43.7519 32.9443 45.7475L33.9421 46.6027L34.5123 45.4624C35.0824 44.3221 35.6526 43.3243 36.2227 42.3265C36.5078 41.8989 36.7929 41.6138 37.078 41.1862L37.6481 40.4735L36.9354 39.9034C33.9421 37.4802 30.3786 35.7697 26.5301 35.057C22.8241 34.3443 19.118 34.4869 15.6971 35.6272C18.2628 24.3666 28.2405 16.3844 40.0713 16.3844C46.7706 16.3844 53.0423 18.9501 57.7461 23.6539C61.167 26.9323 63.4477 31.066 64.4454 35.6272C62.3074 34.9145 60.0267 34.6294 57.7461 34.6294H57.3185C56.4633 34.6294 55.608 34.772 54.6102 34.772H54.4677C54.1826 34.772 53.755 34.9145 53.4699 34.9145C52.8998 35.057 52.4722 35.057 51.902 35.1996L51.4744 35.3421C51.0468 35.4847 50.6192 35.6272 50.1915 35.7697H50.049C49.0512 36.0548 48.196 36.4824 47.1982 36.91C46.7706 37.0526 46.343 37.3377 45.9154 37.6227H45.7728C43.6347 38.9056 41.6392 40.4735 40.0713 42.4691L39.9287 42.7541C39.5011 43.3243 39.216 43.7519 38.931 44.037C38.6459 44.3221 38.5033 44.7497 38.2183 45.1773L38.0757 45.4624C37.7906 45.89 37.6481 46.3176 37.5056 46.6027V46.7452C37.0779 47.6005 36.6503 48.5982 36.3653 49.596V49.7386C35.6526 52.0192 35.2249 54.4423 35.2249 57.008V57.2931C35.2249 57.5782 35.2249 58.0058 35.2249 58.2909C35.2249 58.4334 35.2249 58.576 35.2249 58.7185C35.2249 58.861 35.2249 59.1461 35.2249 59.2887V59.4312V59.7163C35.2249 60.0014 35.3675 60.429 35.3675 60.7141C36.0802 64.135 37.6481 67.4134 40.0713 70.4067L40.2138 70.5492L40.3563 70.4067C41.3541 69.2664 43.6347 65.7029 43.9198 63.5648C42.7795 61.4268 42.2094 59.0036 42.2094 56.723C42.2094 48.7408 48.4811 42.0415 56.6058 41.6138H57.1759C60.4543 41.4713 63.7327 42.4691 66.441 44.3221H66.5835L72 41.1862V41.0437C72 32.6339 68.7216 24.6517 62.5924 18.6651C56.6058 12.6784 48.6236 9.40002 40.0713 9.40002Z"
      fill="white"
    />
  </svg>
);

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

const isValidTokenFormat = (token: string) => {
  return /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(token);
};

createRoot(document.getElementById("app")!).render(
  <>
    <Popup />
  </>
);
