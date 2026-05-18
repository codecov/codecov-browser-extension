import browser from "webextension-polyfill";
import {
  getFlags,
  getComponents,
  getCommitReport,
  getBranchReport,
  getPRReport,
  getConsent,
} from "./fetchers";
import { FileMetadata, MessageType, FileCoverageReportResponse, Consent } from "src/types";

// Mock the webextension-polyfill module
jest.mock("webextension-polyfill", () => ({
  runtime: {
    sendMessage: jest.fn(),
  },
}));

describe("fetchers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getFlags", () => {
    it("should fetch flags successfully", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
      };
      const mockResponse = {
        ok: true,
        data: {
          results: [
            { flag_name: "flag1" },
            { flag_name: "flag2" },
            { flag_name: "flag3" },
          ],
        },
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue(mockResponse);

      const result = await getFlags(mockMetadata);

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.FETCH_FLAGS_LIST,
        payload: {
          owner: "test-owner",
          repo: "test-repo",
        },
        referrer: window.location.href,
      });
      expect(result).toEqual(["flag1", "flag2", "flag3"]);
    });

    it("should return empty array when response is not ok", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
      };
      const mockResponse = {
        ok: false,
        data: null,
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue(mockResponse);

      const result = await getFlags(mockMetadata);

      expect(result).toEqual([]);
    });

    it("should handle empty results gracefully", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
      };
      const mockResponse = {
        ok: true,
        data: {
          results: [],
        },
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue(mockResponse);

      const result = await getFlags(mockMetadata);

      expect(result).toEqual([]);
    });
  });

  describe("getComponents", () => {
    it("should fetch components successfully", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
      };
      const mockResponse = {
        ok: true,
        data: [
          { component_id: "comp1" },
          { component_id: "comp2" },
        ],
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue(mockResponse);

      const result = await getComponents(mockMetadata);

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.FETCH_COMPONENTS_LIST,
        payload: {
          owner: "test-owner",
          repo: "test-repo",
        },
        referrer: window.location.href,
      });
      expect(result).toEqual(["comp1", "comp2"]);
    });

    it("should return empty array when response is not ok", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
      };
      const mockResponse = {
        ok: false,
        data: null,
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue(mockResponse);

      const result = await getComponents(mockMetadata);

      expect(result).toEqual([]);
    });
  });

  describe("getCommitReport", () => {
    it("should fetch commit report with flag and component_id", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
        path: "path/to/file.js",
        commit: "abc123",
      };
      const expectedResponse: FileCoverageReportResponse = {
        files: [{ line_coverage: [[1, 0], [2, 1]] }],
        commit_file_url: "https://example.com/file",
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue({ data: expectedResponse });

      const result = await getCommitReport(mockMetadata, "test-flag", "test-component");

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.FETCH_COMMIT_REPORT,
        payload: {
          owner: "test-owner",
          repo: "test-repo",
          path: "path/to/file.js",
          sha: "abc123",
          flag: "test-flag",
          component_id: "test-component",
        },
        referrer: window.location.href,
      });
      expect(result).toEqual(expectedResponse);
    });

    it("should fetch commit report with only flag", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
        path: "path/to/file.js",
        commit: "abc123",
      };
      const expectedResponse: FileCoverageReportResponse = {
        files: [{ line_coverage: [] }],
        commit_file_url: "https://example.com/file",
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue({ data: expectedResponse });

      const result = await getCommitReport(mockMetadata, "test-flag", undefined);

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.FETCH_COMMIT_REPORT,
        payload: {
          owner: "test-owner",
          repo: "test-repo",
          path: "path/to/file.js",
          sha: "abc123",
          flag: "test-flag",
          component_id: undefined,
        },
        referrer: window.location.href,
      });
      expect(result).toEqual(expectedResponse);
    });

    it("should fetch commit report with only component_id", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
        path: "path/to/file.js",
        commit: "abc123",
      };
      const expectedResponse: FileCoverageReportResponse = {
        files: [{ line_coverage: [] }],
        commit_file_url: "https://example.com/file",
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue({ data: expectedResponse });

      const result = await getCommitReport(mockMetadata, undefined, "test-component");

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.FETCH_COMMIT_REPORT,
        payload: {
          owner: "test-owner",
          repo: "test-repo",
          path: "path/to/file.js",
          sha: "abc123",
          flag: undefined,
          component_id: "test-component",
        },
        referrer: window.location.href,
      });
      expect(result).toEqual(expectedResponse);
    });

    it("should throw error when commit is not provided", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
        path: "path/to/file.js",
        // commit is missing
      };

      await expect(getCommitReport(mockMetadata, undefined, undefined)).rejects.toThrow(
        "getCommitReport called without commit sha"
      );
    });
  });

  describe("getBranchReport", () => {
    it("should fetch branch report successfully", async () => {
      const mockMetadata: FileMetadata = {
        owner: "test-owner",
        repo: "test-repo",
        path: "path/to/file.js",
        branch: "main",
      };
      const expectedResponse: FileCoverageReportResponse = {
        files: [{ line_coverage: [] }],
        commit_file_url: "https://example.com/file",
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue({ data: expectedResponse });

      const result = await getBranchReport(mockMetadata);

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.FETCH_COMMIT_REPORT,
        payload: {
          owner: "test-owner",
          repo: "test-repo",
          path: "path/to/file.js",
          branch: "main",
        },
        referrer: window.location.href,
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe("getPRReport", () => {
    it("should fetch PR report successfully", async () => {
      const mockUrl = {
        owner: "test-owner",
        repo: "test-repo",
        id: "123",
      };
      const expectedResponse = {
        result: "pr-report-data",
      };

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue({ data: expectedResponse });

      const result = await getPRReport(mockUrl);

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.FETCH_PR_COMPARISON,
        payload: {
          owner: "test-owner",
          repo: "test-repo",
          pullid: "123",
        },
        referrer: window.location.href,
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe("getConsent", () => {
    it("should fetch consent successfully", async () => {
      const expectedResponse: Consent = "all";

      (browser.runtime.sendMessage as jest.MockedFunction<typeof browser.runtime.sendMessage>).mockResolvedValue(expectedResponse);

      const result = await getConsent();

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.GET_CONSENT,
      });
      expect(result).toEqual(expectedResponse);
    });
  });
});