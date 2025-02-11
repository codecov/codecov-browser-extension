export const codecovApiTokenStorageKey = "self_hosted_codecov_api_token";
export const selfHostedCodecovURLStorageKey = "self_hosted_codecov_url";
export const selfHostedGitHubURLStorageKey = "self_hosted_github_url";
export const dynamicContentScriptRegistrationId = "dynamic-content-script";

export const codecovCloudApiUrl = "https://api.codecov.io";
export const githubCloudUrl = "https://github.com";

export const cacheTtlMs = 1000 * 60 * 60; // 1 hour

export const providers = {
  github: "github",
  githubEnterprise: "github_enterprise",
} as const;
