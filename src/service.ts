import _ from "lodash";
import browser from "webextension-polyfill";
import urlJoin from "url-join";

import {
  codecovCloudApiUrl,
  codecovApiTokenStorageKey,
  selfHostedCodecovURLStorageKey,
  selfHostedGitHubURLStorageKey,
  providers,
  cacheTtlMs,
  allConsentStorageKey,
  onlyEssentialConsentStorageKey,
  consentTabLock,
} from "src/constants";
import { Consent } from "./types";

export class Codecov {
  apiToken: string = "";
  apiUrl: string = codecovCloudApiUrl;
  provider: typeof providers[keyof typeof providers] = providers.github;

  private async init() {
    const result = await browser.storage.sync.get([
      codecovApiTokenStorageKey,
      selfHostedCodecovURLStorageKey,
      selfHostedGitHubURLStorageKey,
    ]);

    const apiToken: string | undefined = result[codecovApiTokenStorageKey];
    if (apiToken) {
      this.apiToken = apiToken;
    }

    const selfHostedCodecovURL: string | undefined =
      result[selfHostedCodecovURLStorageKey];
    if (selfHostedCodecovURL) {
      this.apiUrl = selfHostedCodecovURL;
    }

    const selfHostedGithubURL: string | undefined =
      result[selfHostedGitHubURLStorageKey];
    if (selfHostedGithubURL) {
      this.provider = providers.githubEnterprise;
    }
  }

  async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    // fetch wrapper that adds API token auth if necessary

    if (this.apiToken) {
      console.log("using api token");
      return fetch(input, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          ...init?.headers,
        },
      });
    }

    console.log("using session cookie");

    return fetch(input, init);
  }

  async checkAuth(payload: any): Promise<boolean> {
    // This is for testing config on save, so don't use storage values
    const { baseUrl, token, provider } = payload;

    const url = urlJoin(baseUrl, "/api/v2/", provider, "/");

    // Don't use this.fetch for checkAuth as we don't want any old token to
    // sneak into this request.

    if (token) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Referrer: "https://github.com/codecov/codecov-api",
        },
      });
      return response.ok;
    }

    const response = await fetch(url);
    return response.ok;
  }

  async fetchCommitReport(payload: any, referrer: string): Promise<any> {
    await this.init();
    const { owner, repo, sha, branch, path, flag, component_id } = payload;

    const url = new URL(
      `/api/v2/${this.provider}/${owner}/repos/${repo}/report`,
      this.apiUrl
    );

    const params = { path };

    url.search = new URLSearchParams(
      Object.assign(
        params,
        _.omitBy({ branch, sha, flag, component_id }, _.isNil)
      )
    ).toString();

    const response = await this.fetch(url.toString(), {
      headers: {
        Referrer: referrer,
      },
    });
    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  }

  async fetchPRComparison(payload: any, referrer: string): Promise<any> {
    await this.init();
    const { owner, repo, pullid } = payload;

    const url = new URL(
      `/api/v2/${this.provider}/${owner}/repos/${repo}/compare`,
      this.apiUrl
    );
    const params = { pullid };
    url.search = new URLSearchParams(params).toString();

    const response = await this.fetch(url.toString(), {
      headers: {
        Referrer: referrer,
      },
    });
    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  }

  async getCached(
    type: "flags" | "components",
    owner: string,
    repo: string
  ): Promise<any> {
    const cacheKey = `${owner}/${repo}/${type}`;
    const cacheExpiryKey = `${owner}/${repo}/${type}/expiry`;

    const storage = await browser.storage.local.get([cacheKey, cacheExpiryKey]);

    if (!storage[cacheKey] || !storage[cacheExpiryKey]) {
      // Cache is not set
      return null;
    }

    const value = JSON.parse(storage[cacheKey]);
    const expiry = storage[cacheExpiryKey];

    if (Date.now() <= expiry) {
      // Cache is valid, return cached value
      return value;
    }

    // Cache is expired, clear cache
    await browser.storage.local.remove([cacheKey, cacheExpiryKey]);

    return null;
  }

  async setCached(
    type: "flags" | "components",
    owner: string,
    repo: string,
    data: any
  ): Promise<void> {
    const cacheKey = `${owner}/${repo}/${type}`;
    const cacheExpiryKey = `${owner}/${repo}/${type}/expiry`;

    await browser.storage.local.set({
      [cacheKey]: JSON.stringify(data),
      [cacheExpiryKey]: Date.now() + cacheTtlMs,
    });

    return;
  }

  async listFlags(payload: any, referrer: string): Promise<any> {
    await this.init();
    const { owner, repo } = payload;

    const cachedFlags = await this.getCached("flags", owner, repo);

    if (cachedFlags != null) {
      return {
        ok: true,
        data: cachedFlags,
      };
    }

    const url = new URL(
      `/api/v2/${this.provider}/${owner}/repos/${repo}/flags`,
      this.apiUrl
    );

    const response = await this.fetch(url.toString(), {
      headers: {
        Referrer: referrer,
      },
    });
    const data = await response.json();

    await this.setCached("flags", owner, repo, data);

    return {
      ok: response.ok,
      data,
    };
  }

  async listComponents(payload: any, referrer: string): Promise<any> {
    await this.init();
    const { owner, repo } = payload;

    const cachedComponents = await this.getCached("components", owner, repo);

    if (cachedComponents != null) {
      return {
        ok: true,
        data: cachedComponents,
      };
    }

    const url = new URL(
      `/api/v2/${this.provider}/${owner}/repos/${repo}/components`,
      this.apiUrl
    );

    const response = await this.fetch(url.toString(), {
      headers: {
        Referrer: referrer,
      },
    });
    const data = await response.json();

    await this.setCached("components", owner, repo, data);

    return {
      ok: response.ok,
      data,
    };
  }

  async getConsent(): Promise<Consent> {
    // We only need to get consent for firefox
    // @ts-ignore IS_FIREFOX is populated by Webpack at build time
    if (!IS_FIREFOX) {
      return "all";
    }

    const consents = await browser.storage.local.get([
      allConsentStorageKey,
      onlyEssentialConsentStorageKey,
    ]);

    if (consents[allConsentStorageKey]) {
      return "all";
    } else if (consents[onlyEssentialConsentStorageKey]) {
      return "essential";
    } else {
      return "none";
    }
  }

  async setConsent(consent: Consent): Promise<Consent> {
    const allConsent = consent === "all";
    const essentialConsent = consent === "essential";

    const storageObject: { [id: string]: boolean } = {};
    storageObject[allConsentStorageKey] = allConsent;
    storageObject[onlyEssentialConsentStorageKey] = essentialConsent;

    await browser.storage.local.set(storageObject);

    return consent;
  }

  async canOpenConsentTab(): Promise<Boolean> {
    // Returns whether the consent tab was opened this session. Resolves the
    // case where two consent tabs are opened simultaneously.
    const locked = await browser.storage.local
      .get([consentTabLock])
      .then((res) => res[consentTabLock]);

    if (locked) {
      return false;
    }

    // Acquire the lock and return true

    const storageObject: { [id: string]: boolean } = {};
    storageObject[consentTabLock] = true;

    await browser.storage.local.set(storageObject);

    // After 2 seconds, release the lock
    setTimeout(() => {
      const storageObject: { [id: string]: boolean } = {};
      storageObject[consentTabLock] = false;

      browser.storage.local.set(storageObject);
    }, 2000);

    return true;
  }
}
