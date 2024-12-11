export const codecovApiTokenStorageKey = "self_hosted_codecov_api_token"; // Keeping this key to not break existing installs.
export const selfHostedCodecovURLStorageKey = "self_hosted_codecov_url";
export const selfHostedGitHubURLStorageKey = "self_hosted_github_url";
export const dynamicContentScriptRegistrationId = "dynamic-content-script";

export const codecovCloudApiUrl = "https://api.codecov.io";
export const githubCloudUrl = "https://github.com";

export const providers = {
  github: "github",
  githubEnterprise: "github_enterprise",
} as const;
