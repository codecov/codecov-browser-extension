import {
  allConsentStorageKey,
  onlyEssentialConsentStorageKey,
  consentTabLock,
  codecovApiTokenStorageKey,
  selfHostedCodecovURLStorageKey,
  selfHostedGitHubURLStorageKey,
  dynamicContentScriptRegistrationId,
  codecovCloudApiUrl,
  githubCloudUrl,
  cacheTtlMs,
  providers,
} from "./constants";

describe("Constants", () => {
  describe("Consent storage keys", () => {
    test("allConsentStorageKey should have the correct value", () => {
      expect(allConsentStorageKey).toBe("codecov-consent-0.6.3");
    });

    test("onlyEssentialConsentStorageKey should have the correct value", () => {
      expect(onlyEssentialConsentStorageKey).toBe("codecov-essential-consent-0.6.3");
    });

    test("consentTabLock should have the correct value", () => {
      expect(consentTabLock).toBe("codecov-consent-tab-lock");
    });
  });

  describe("Self-hosted storage keys", () => {
    test("codecovApiTokenStorageKey should have the correct value", () => {
      expect(codecovApiTokenStorageKey).toBe("self_hosted_codecov_api_token");
    });

    test("selfHostedCodecovURLStorageKey should have the correct value", () => {
      expect(selfHostedCodecovURLStorageKey).toBe("self_hosted_codecov_url");
    });

    test("selfHostedGitHubURLStorageKey should have the correct value", () => {
      expect(selfHostedGitHubURLStorageKey).toBe("self_hosted_github_url");
    });

    test("dynamicContentScriptRegistrationId should have the correct value", () => {
      expect(dynamicContentScriptRegistrationId).toBe("dynamic-content-script");
    });
  });

  describe("API URLs", () => {
    test("codecovCloudApiUrl should have the correct value", () => {
      expect(codecovCloudApiUrl).toBe("https://api.codecov.io");
    });

    test("githubCloudUrl should have the correct value", () => {
      expect(githubCloudUrl).toBe("https://github.com");
    });
  });

  describe("Cache TTL", () => {
    test("cacheTtlMs should equal 1 hour in milliseconds", () => {
      expect(cacheTtlMs).toBe(1000 * 60 * 60); // 1 hour in ms
      expect(cacheTtlMs).toBe(3600000); // 1 hour in ms
    });
  });

  describe("Providers", () => {
    test("providers object should have correct values", () => {
      expect(providers.github).toBe("github");
      expect(providers.githubEnterprise).toBe("github_enterprise");
    });

    test("providers object should have correct keys", () => {
      expect(Object.keys(providers)).toEqual(["github", "githubEnterprise"]);
    });
  });
});