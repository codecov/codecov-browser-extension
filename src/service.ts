import _ from "lodash";
import fetchIntercept from "fetch-intercept";
import browser from "webextension-polyfill";

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
        if (!useSelfHosted) {
          return [url, config];
        }
        const codecovUrl = result[selfHostedCodecovURLStorageKey];
        const codecovApiToken = result[selfHostedCodecovApiToken];
        url = url.replace(this.baseUrl, codecovUrl);
        config = _.merge(config, {
          headers: {
            Authorization: `bearer ${codecovApiToken}`
          }
        })
        return [url, config];
      }
    })
  }

  static async checkAuth(token: string): Promise<boolean> {
    const url = `${this.baseUrl}/api/v2/github/codecov`;
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

    const url = new URL(
      `${this.baseUrl}/api/v2/${service}/${owner}/repos/${repo}/report`
    );

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

    const url = new URL(
      `${this.baseUrl}/api/v2/${service}/${owner}/repos/${repo}/compare`
    );

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

    const url = new URL(
      `${this.baseUrl}/api/v2/${service}/${owner}/repos/${repo}/flags`
    );

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  }

  static async listComponents(payload: any): Promise<any> {
    const { service, owner, repo } = payload;

    const url = new URL(
      `${this.baseUrl}/api/v2/${service}/${owner}/repos/${repo}/components`
    );

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  }
}

Codecov._init();
