import _ from "lodash";
import browser from "webextension-polyfill";
import urlJoin from "url-join";

import {
  codecovCloudApiUrl,
  codecovApiTokenStorageKey,
  selfHostedCodecovURLStorageKey,
  selfHostedGitHubURLStorageKey,
  providers,
} from "src/constants";

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

  async listFlags(payload: any, referrer: string): Promise<any> {
    await this.init();
    const { owner, repo } = payload;

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

    return {
      ok: response.ok,
      data,
    };
  }

  async listComponents(payload: any, referrer: string): Promise<any> {
    await this.init();
    const { owner, repo } = payload;

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

    return {
      ok: response.ok,
      data,
    };
  }
}
