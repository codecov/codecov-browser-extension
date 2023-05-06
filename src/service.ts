import _ from "lodash";

export class Codecov {
  static baseUrl = "https://api.codecov.io/api/v2";

  static async checkAuth(token: string): Promise<boolean> {
    const url = `${this.baseUrl}/github/codecov`;
    const response = await fetch(url, {
      headers: {
        Authorization: `bearer ${token}`,
      },
    });
    return response.ok;
  }

  static async fetchCommitReport(payload: any): Promise<any> {
    const { service, owner, repo, sha, branch, path, flag } = payload;

    const url = new URL(
      `${this.baseUrl}/${service}/${owner}/repos/${repo}/report`
    );

    const params = { path };

    url.search = new URLSearchParams(
      Object.assign(params, _.omitBy({ branch, sha, flag }, _.isNil))
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
      `${this.baseUrl}/${service}/${owner}/repos/${repo}/compare`
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
      `${this.baseUrl}/${service}/${owner}/repos/${repo}/flags`
    );

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  }
}
