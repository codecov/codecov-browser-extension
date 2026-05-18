import browser from "webextension-polyfill";
import urlJoin from "url-join";
import _ from "lodash";

import { dynamicContentScriptRegistrationId } from "../constants";
import {
  registerContentScript,
  unregisterContentScriptIfExists,
} from "./dynamic_content_scripts";

// Mock the required dependencies
jest.mock("webextension-polyfill", () => ({
  __esModule: true,
  default: {
    tabs: {
      query: jest.fn(),
    },
    scripting: {
      registerContentScripts: jest.fn(),
      getRegisteredContentScripts: jest.fn(),
      unregisterContentScripts: jest.fn(),
    },
  },
}));

jest.mock("url-join", () => {
  return jest.fn((base: string, path: string) => `${base}${path}`);
});

jest.mock("../constants", () => ({
  dynamicContentScriptRegistrationId: "test-dynamic-script-id",
}));

// Type assertion for mocked module
const mockBrowser = browser as jest.Mocked<typeof browser>;

describe("Dynamic Content Scripts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (mockBrowser.tabs.query as jest.MockedFunction<any>).mockResolvedValue([]);
    (mockBrowser.scripting.registerContentScripts as jest.MockedFunction<any>).mockResolvedValue(undefined);
    (mockBrowser.scripting.getRegisteredContentScripts as jest.MockedFunction<any>).mockResolvedValue([]);
    (mockBrowser.scripting.unregisterContentScripts as jest.MockedFunction<any>).mockResolvedValue(undefined);
  });

  describe("registerContentScript", () => {
    it("should return false when no active tab exists", async () => {
      (mockBrowser.tabs.query as jest.MockedFunction<any>).mockResolvedValue([]);
      
      const result = await registerContentScript({ url: "https://example.com" });
      
      expect(result).toBe(false);
      expect(mockBrowser.scripting.registerContentScripts).not.toHaveBeenCalled();
    });

    it("should return false when tab URL doesn't match the payload URL", async () => {
      (mockBrowser.tabs.query as jest.MockedFunction<any>).mockResolvedValue([
        { url: "https://another-site.com/page" },
      ]);
      
      const result = await registerContentScript({ url: "https://example.com" });
      
      expect(result).toBe(false);
      expect(mockBrowser.scripting.registerContentScripts).not.toHaveBeenCalled();
    });

    it("should return true without registering when hostname is github.com", async () => {
      (mockBrowser.tabs.query as jest.MockedFunction<any>).mockResolvedValue([
        { url: "https://github.com/user/repo" },
      ]);
      
      const result = await registerContentScript({ url: "https://github.com" });
      
      expect(result).toBe(true);
      expect(mockBrowser.scripting.registerContentScripts).not.toHaveBeenCalled();
      expect(mockBrowser.scripting.getRegisteredContentScripts).toHaveBeenCalled();
    });

    it("should unregister existing content script and register new one", async () => {
      (mockBrowser.tabs.query as jest.MockedFunction<any>).mockResolvedValue([
        { url: "https://example.com/page" },
      ]);
      
      (mockBrowser.scripting.getRegisteredContentScripts as jest.MockedFunction<any>)
        .mockResolvedValue([{ id: "test-dynamic-script-id", matches: [] }]);
      
      (urlJoin as jest.MockedFunction<any>).mockReturnValue("https://example.com/*");
      
      const result = await registerContentScript({ url: "https://example.com" });
      
      expect(result).toBe(true);
      expect(mockBrowser.scripting.getRegisteredContentScripts).toHaveBeenCalledWith({
        ids: ["test-dynamic-script-id"],
      });
      expect(mockBrowser.scripting.unregisterContentScripts).toHaveBeenCalledWith({
        ids: ["test-dynamic-script-id"],
      });
      expect(mockBrowser.scripting.registerContentScripts).toHaveBeenCalledWith([
        {
          id: "test-dynamic-script-id",
          matches: ["https://example.com/*"],
          js: ["js/vendor.js", "js/githubFile.js", "js/githubPR.js"],
        },
      ]);
    });

    it("should register content script without unregistering when none exists", async () => {
      (mockBrowser.tabs.query as jest.MockedFunction<any>).mockResolvedValue([
        { url: "https://example.com/page" },
      ]);
      
      (mockBrowser.scripting.getRegisteredContentScripts as jest.MockedFunction<any>)
        .mockResolvedValue([]);
      
      (urlJoin as jest.MockedFunction<any>).mockReturnValue("https://example.com/*");
      
      const result = await registerContentScript({ url: "https://example.com" });
      
      expect(result).toBe(true);
      expect(mockBrowser.scripting.getRegisteredContentScripts).toHaveBeenCalledWith({
        ids: ["test-dynamic-script-id"],
      });
      expect(mockBrowser.scripting.unregisterContentScripts).not.toHaveBeenCalled();
      expect(mockBrowser.scripting.registerContentScripts).toHaveBeenCalledWith([
        {
          id: "test-dynamic-script-id",
          matches: ["https://example.com/*"],
          js: ["js/vendor.js", "js/githubFile.js", "js/githubPR.js"],
        },
      ]);
    });

    it("should handle URL construction properly", async () => {
      (mockBrowser.tabs.query as jest.MockedFunction<any>).mockResolvedValue([
        { url: "https://subdomain.example.com/path" },
      ]);
      
      (mockBrowser.scripting.getRegisteredContentScripts as jest.MockedFunction<any>)
        .mockResolvedValue([]);
      
      (urlJoin as jest.MockedFunction<any>).mockReturnValue("https://subdomain.example.com/*");
      
      const result = await registerContentScript({ url: "https://subdomain.example.com" });
      
      expect(result).toBe(true);
      expect(urlJoin).toHaveBeenCalledWith("https://subdomain.example.com", "/*");
      expect(mockBrowser.scripting.registerContentScripts).toHaveBeenCalledWith([
        {
          id: "test-dynamic-script-id",
          matches: ["https://subdomain.example.com/*"],
          js: ["js/vendor.js", "js/githubFile.js", "js/githubPR.js"],
        },
      ]);
    });
  });

  describe("unregisterContentScriptIfExists", () => {
    it("should return true when no registered content scripts exist", async () => {
      (mockBrowser.scripting.getRegisteredContentScripts as jest.MockedFunction<any>)
        .mockResolvedValue([]);
      
      const result = await unregisterContentScriptIfExists({ url: "https://example.com" });
      
      expect(result).toBe(true);
      expect(mockBrowser.scripting.getRegisteredContentScripts).toHaveBeenCalledWith({
        ids: ["test-dynamic-script-id"],
      });
      expect(mockBrowser.scripting.unregisterContentScripts).not.toHaveBeenCalled();
    });

    it("should unregister existing content script", async () => {
      (mockBrowser.scripting.getRegisteredContentScripts as jest.MockedFunction<any>)
        .mockResolvedValue([{ id: "test-dynamic-script-id", matches: ["https://example.com/*"] }]);
      
      const result = await unregisterContentScriptIfExists({ url: "https://example.com" });
      
      expect(result).toBe(true);
      expect(mockBrowser.scripting.getRegisteredContentScripts).toHaveBeenCalledWith({
        ids: ["test-dynamic-script-id"],
      });
      expect(mockBrowser.scripting.unregisterContentScripts).toHaveBeenCalledWith({
        ids: ["test-dynamic-script-id"],
      });
    });

    it("should handle Safari error gracefully when script ID doesn't exist", async () => {
      const safariError = new Error(
        "Invalid call to scripting.getRegisteredContentScripts(). No script with ID 'test-dynamic-script-id'"
      );
      
      (mockBrowser.scripting.getRegisteredContentScripts as jest.MockedFunction<any>)
        .mockRejectedValue(safariError);
      
      const result = await unregisterContentScriptIfExists({ url: "https://example.com" });
      
      expect(result).toBe(true);
      expect(mockBrowser.scripting.getRegisteredContentScripts).toHaveBeenCalledWith({
        ids: ["test-dynamic-script-id"],
      });
      expect(mockBrowser.scripting.unregisterContentScripts).not.toHaveBeenCalled();
    });

    it("should re-throw non-Safari related errors", async () => {
      const otherError = new Error("Some other scripting error");
      
      (mockBrowser.scripting.getRegisteredContentScripts as jest.MockedFunction<any>)
        .mockRejectedValue(otherError);
      
      await expect(unregisterContentScriptIfExists({ url: "https://example.com" })).rejects.toThrow(
        "Some other scripting error"
      );
    });

    it("should handle regex matching with different script IDs in the error message", async () => {
      const errorWithDifferentId = new Error(
        "Invalid call to scripting.getRegisteredContentScripts(). No script with ID 'different-script-id123'"
      );

      (mockBrowser.scripting.getRegisteredContentScripts as jest.MockedFunction<any>)
        .mockRejectedValue(errorWithDifferentId);

      const result = await unregisterContentScriptIfExists({ url: "https://example.com" });

      expect(result).toBe(true);
      expect(mockBrowser.scripting.getRegisteredContentScripts).toHaveBeenCalledWith({
        ids: ["test-dynamic-script-id"],
      });
      expect(mockBrowser.scripting.unregisterContentScripts).not.toHaveBeenCalled();
    });
  });
});