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

  static _init() {
    fetchIntercept.register({
      request: async (url: string, config: any) => {
        const result = await browser.storage.sync.get([
          useSelfHostedStorageKey,
          selfHostedCodecovURLStorageKey,
          selfHostedGitHubURLStorageKey,
          selfHostedCodecovApiToken
        ])
        const useSelfHosted = result[useSelfHostedStorageKey] || false;
        // self hosted not active, or is being updated
        if (!useSelfHosted || config?.headers?.Authorization) {
          return [url, config];
        }
        const codecovUrl = result[selfHostedCodecovURLStorageKey];
        const codecovApiToken = result[selfHostedCodecovApiToken];
        // update url
        const updatedURL = urlJoin(codecovUrl, url.replace(this.baseUrl, ''))
        // update auth header
        const updatedConfig = _.merge(config, {
          headers: {
            Authorization: `bearer ${codecovApiToken}`
          }
        })
        return [updatedURL, updatedConfig];
      }
    })
  }

  static async checkAuth(payload: any): Promise<boolean> {
    const { baseUrl, token } = payload;

    const url = urlJoin(baseUrl, '/api/v2/github/codecov');

    const response = await fetch(url, {
      headers: {
        Authorization: `bearer ${token}`,
      },
    });

    return response.ok;
  }

  static async fetchCommitReport(payload: any): Promise<any> {
    const { service, owner, repo, sha, branch, path, flag, component_id } =
      payload;

    const url = new URL(`/api/v2/${service}/${owner}/repos/${repo}/report`, this.baseUrl);

    const params = { path };

    url.search = new URLSearchParams(
      Object.assign(
        params,
        _.omitBy({ branch, sha, flag, component_id }, _.isNil)
      )
    ).toString();

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  }

  static async fetchPRComparison(payload: any): Promise<any> {
    const { service, owner, repo, pullid } = payload;

    const url = new URL(`/api/v2/${service}/${owner}/repos/${repo}/compare`, this.baseUrl);
    const params = { pullid };
    url.search = new URLSearchParams(params).toString();

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  }

  static async listFlags(payload: any): Promise<any> {
    const { service, owner, repo } = payload;

    const url = new URL(`/api/v2/${service}/${owner}/repos/${repo}/flags`, this.baseUrl);

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  }

  static async listComponents(payload: any): Promise<any> {
    const { service, owner, repo } = payload;

    const url = new URL(`/api/v2/${service}/${owner}/repos/${repo}/components`, this.baseUrl);

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  }
}

Codecov._init();
