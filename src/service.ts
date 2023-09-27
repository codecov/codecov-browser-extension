import _ from "lodash";
import fetchIntercept from "fetch-intercept";
import browser from "webextension-polyfill";
import urlJoin from "url-join";

import {
  selfHostedCodecovApiToken,
  selfHostedCodecovURLStorageKey,
  selfHostedGitHubURLStorageKey,
  useSelfHostedStorageKey,
} from "src/constants";

export class Codecov {
  static baseUrl = "https://api.codecov.io";
  static checkAuthPath = "/api/v2/github/codecov";
  static cache: { [pullUrl: string]: any } = {};

  static _init() {
    fetchIntercept.register({
      request: async (requestUrl: string, requestConfig: any) => {
        // use request params for auth check
        if (new URL(requestUrl).pathname === this.checkAuthPath) {
          return [requestUrl, requestConfig];
        }
        const result = await browser.storage.sync.get([
          useSelfHostedStorageKey,
          selfHostedCodecovURLStorageKey,
          selfHostedGitHubURLStorageKey,
          selfHostedCodecovApiToken,
        ]);
        const useSelfHosted = result[useSelfHostedStorageKey] || false;
        // self hosted not selected
        if (!useSelfHosted) {
          return [requestUrl, requestConfig];
        }
        const currentURL = new URL(requestConfig?.headers?.Referrer);
        const selfHostedGitHubURL = new URL(
          result[selfHostedGitHubURLStorageKey]
        );
        // not on self hosted github
        if (currentURL.hostname !== selfHostedGitHubURL.hostname) {
          return [requestUrl, requestConfig];
        }
        const codecovUrl = result[selfHostedCodecovURLStorageKey];
        const codecovApiToken = result[selfHostedCodecovApiToken];
        // update url
        const updatedRequestUrl = urlJoin(
          codecovUrl,
          requestUrl.replace(this.baseUrl, "")
        );
        // update auth header
        const updatedRequestConfig = _.merge(requestConfig, {
          headers: {
            Authorization: `bearer ${codecovApiToken}`,
          },
        });
        return [updatedRequestUrl, updatedRequestConfig];
      },
    });
  }

  static async checkAuth(payload: any): Promise<boolean> {
    const { baseUrl, token } = payload;

    const url = urlJoin(baseUrl, this.checkAuthPath);

    const response = await fetch(url, {
      headers: {
        Authorization: `bearer ${token}`,
      },
    });

    return response.ok;
  }

  static async fetchCommitReport(payload: any, referrer: string): Promise<any> {
    const { service, owner, repo, sha, branch, path, flag, component_id } =
      payload;

    const url = new URL(
      `/api/v2/${service}/${owner}/repos/${repo}/report`,
      this.baseUrl
    );

    const params = { path };

    url.search = new URLSearchParams(
      Object.assign(
        params,
        _.omitBy({ branch, sha, flag, component_id }, _.isNil)
      )
    ).toString();

    const response = await fetch(url.toString(), {
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

  static async fetchPRComparison(payload: any, referrer: string): Promise<any> {
    const { service, owner, repo, pullid, isDiff } = payload;

    const url = new URL(
      `/api/v2/${service}/${owner}/repos/${repo}/compare`,
      this.baseUrl
    );
    const params = { pullid };
    url.search = new URLSearchParams(params).toString();

    let response = await Promise.resolve(this.cache[url.toString()]);
    if (!response?.ok) {
      this.cache[url.toString()] = fetch(url.toString(), {
        headers: {
          Referrer: referrer,
        },
      });
    }

    if (!isDiff) {
      return;
    }

    // await promise immediately if requested from diff view
    response = await Promise.resolve(this.cache[url.toString()]);
    return {
      ok: response.ok,
      data: await response.clone().json(),
    };
  }

  static async listFlags(payload: any, referrer: string): Promise<any> {
    const { service, owner, repo } = payload;

    const url = new URL(
      `/api/v2/${service}/${owner}/repos/${repo}/flags`,
      this.baseUrl
    );

    const response = await fetch(url.toString(), {
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

  static async listComponents(payload: any, referrer: string): Promise<any> {
    const { service, owner, repo } = payload;

    const url = new URL(
      `/api/v2/${service}/${owner}/repos/${repo}/components`,
      this.baseUrl
    );

    const response = await fetch(url.toString(), {
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

Codecov._init();
