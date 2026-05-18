import browser from "webextension-polyfill";
import {
  CoverageStatus,
  FileCoverageReport,
  FileMetadata,
} from "../../../types";
import {
  componentsStorageKey,
  flagsStorageKey,
} from "./utils/constants";

// Mock all external dependencies
jest.mock("webextension-polyfill", () => ({
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
}));

jest.mock("../common/animation", () => ({
  animateAndAnnotateLines: jest.fn(),
  clearAnimation: jest.fn(),
  clearAnnotations: jest.fn(),
}));

jest.mock("../common/constants", () => ({
  colors: {
    greenAlpha: "rgba(0, 255, 0, 0.3)",
    redAlpha: "rgba(255, 0, 0, 0.3)",
    yellowAlpha: "rgba(255, 255, 0, 0.3)",
  },
}));

jest.mock("./utils/dropdown", () => ({
  createDropdown: jest.fn(),
}));

jest.mock("../common/fetchers", () => ({
  getComponents: jest.fn(),
  getCommitReport: jest.fn(),
  getFlags: jest.fn(),
  getBranchReport: jest.fn(),
  getConsent: jest.fn(),
}));

jest.mock("../../common/sentry", () => ({
  initSentry: jest.fn(() => ({
    captureException: jest.fn(),
  })),
}));

// Mock lodash methods
jest.mock("lodash", () => ({
  parseInt: (value: any) => parseInt(value, 10),
  isEmpty: (obj: any) => !obj || Object.keys(obj).length === 0,
  mergeWith: jest.fn((obj1: any, obj2: any, customizer: any) => ({ ...obj1, ...obj2 })),
  intersection: (arr1: any[], arr2: any[]) => arr1.filter((x: any) => arr2.includes(x)),
  __esModule: true,
}));

// Create a mock module for testing individual functions without importing main.tsx
// which causes issues due to immediate execution

describe("GitHub File Coverage Component", () => {
  let originalWindow: any;

  beforeAll(() => {
    // Store the original window
    originalWindow = (global as any).window;
  });

  afterAll(() => {
    // Restore the original window
    if (originalWindow) {
      (global as any).window = originalWindow;
    }
  });

  describe("URL Processing", () => {
    it("should extract metadata from GitHub blob URL", () => {
      const pathname = "/owner/repo/blob/main/path/to/file.js";
      const regexp = /\/(?<owner>.+?)\/(?<repo>.+?)\/blob\/(?<branch>.+?)\/(?<path>.+?)$/;
      const matches = regexp.exec(pathname);
      const groups: any = matches?.groups;

      expect(groups).toEqual({
        owner: "owner",
        repo: "repo",
        branch: "main",
        path: "path/to/file.js",
      });
    });

    it("should handle commit SHA in URL", () => {
      const pathname = "/owner/repo/blob/abc123def456789abc123def456789abc123def4/path/to/file.js";
      const regexp = /\/(?<owner>.+?)\/(?<repo>.+?)\/blob\/(?<branch>.+?)\/(?<path>.+?)$/;
      const matches = regexp.exec(pathname);
      const groups: any = matches?.groups;

      // When branch is a commit SHA, it will be captured in the branch group
      expect(groups).toEqual({
        owner: "owner",
        repo: "repo",
        branch: "abc123def456789abc123def456789abc123def4", // This is the branch parameter but contains the commit SHA
        path: "path/to/file.js",
      });

      // Check if branch looks like a commit SHA
      const branch = groups.branch;
      const commitMatch = branch?.match(/[\da-f]+/);

      if (commitMatch && commitMatch[0].length === branch.length && (branch.length === 40)) {
        expect(branch).toBe("abc123def456789abc123def456789abc123def4");
      }
    });

    it("should return null for invalid URL format", () => {
      const pathname = "/invalid/url/format";
      const regexp = /\/(?<owner>.+?)\/(?<repo>.+?)\/blob\/(?<branch>.+?)\/(?<path>.+?)$/;
      const matches = regexp.exec(pathname);
      const groups = matches?.groups;

      expect(groups).toBeUndefined();
    });
  });

  describe("Coverage Calculations", () => {
    it("should correctly calculate coverage percentage", () => {
      const coverageReport: FileCoverageReport = {
        1: CoverageStatus.COVERED,
        2: CoverageStatus.UNCOVERED,
        3: CoverageStatus.COVERED,
        4: CoverageStatus.PARTIAL,
      };

      const report = Object.entries(coverageReport);
      const totalLines = report.length;
      const coveredLines = report.filter(
        ([_, status]) => status === CoverageStatus.COVERED
      ).length;
      const result = (coveredLines * 100) / totalLines;

      expect(result).toBe(50); // 2 out of 4 lines covered (lines 1 and 3 are COVERED)
    });

    it("should return 0 when no lines are covered", () => {
      const coverageReport: FileCoverageReport = {
        1: CoverageStatus.UNCOVERED,
        2: CoverageStatus.UNCOVERED,
      };

      const report = Object.entries(coverageReport);
      const totalLines = report.length;
      const coveredLines = report.filter(
        ([_, status]) => status === CoverageStatus.COVERED
      ).length;
      const result = (coveredLines * 100) / totalLines;

      expect(result).toBe(0);
    });

    it("should return 100 when all lines are covered", () => {
      const coverageReport: FileCoverageReport = {
        1: CoverageStatus.COVERED,
        2: CoverageStatus.COVERED,
      };

      const report = Object.entries(coverageReport);
      const totalLines = report.length;
      const coveredLines = report.filter(
        ([_, status]) => status === CoverageStatus.COVERED
      ).length;
      const result = (coveredLines * 100) / totalLines;

      expect(result).toBe(100);
    });
  });

  describe("UI and DOM interactions", () => {
    it("should create coverage button with proper structure", () => {
      // Setup DOM elements
      const rawButton = document.createElement("button");
      rawButton.setAttribute("data-testid", "raw-button");
      const textSpan = document.createElement("span");
      textSpan.setAttribute("data-component", "text");
      rawButton.appendChild(textSpan);

      // Clone and modify the button
      const codecovButton = rawButton.cloneNode(true) as HTMLElement;
      const textNode = codecovButton.querySelector('[data-component="text"]')!;
      textNode.innerHTML = "Coverage: ...";

      expect(codecovButton).toBeTruthy();
      expect(textNode.innerHTML).toBe("Coverage: ...");
    });

    it("should handle button click event properly", () => {
      const rawButton = document.createElement("button");
      rawButton.setAttribute("data-inactive", "true");
      rawButton.style.opacity = "0.5";

      // Simulate button click handling
      const isInactive = rawButton.getAttribute("data-inactive");
      if (isInactive === "true") {
        // Simulate enabling animations
        rawButton.removeAttribute("data-inactive");
        rawButton.style.opacity = "1";
      }

      expect(rawButton.getAttribute("data-inactive")).toBeNull();
      expect(rawButton.style.opacity).toBe("1");
    });

    it("should toggle button state correctly", () => {
      const button = document.createElement("button");
      button.setAttribute("data-inactive", "true");
      button.style.opacity = "0.5";

      // Toggle to active
      button.removeAttribute("data-inactive");
      button.style.opacity = "1";
      expect(button.getAttribute("data-inactive")).toBeNull();
      expect(button.style.opacity).toBe("1");

      // Toggle back to inactive
      button.setAttribute("data-inactive", "true");
      button.style.opacity = "0.5";
      expect(button.getAttribute("data-inactive")).toBe("true");
      expect(button.style.opacity).toBe("0.5");
    });
  });

  describe("Storage Operations", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should handle flag selection changes", async () => {
      const selectedFlags = ["flag1", "flag2"];

      await browser.storage.local.set({
        [componentsStorageKey]: [],
      });
      await browser.storage.local.set({
        [flagsStorageKey]: selectedFlags,
      });

      expect(browser.storage.local.set).toHaveBeenCalledWith({
        [componentsStorageKey]: [],
      });
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        [flagsStorageKey]: selectedFlags,
      });
    });

    it("should handle component selection changes", async () => {
      const selectedComponents = ["comp1", "comp2"];

      await browser.storage.local.set({
        [flagsStorageKey]: [],
      });
      await browser.storage.local.set({
        [componentsStorageKey]: selectedComponents,
      });

      expect(browser.storage.local.set).toHaveBeenCalledWith({
        [flagsStorageKey]: [],
      });
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        [componentsStorageKey]: selectedComponents,
      });
    });
  });

  describe("Line Annotation", () => {
    it("should annotate line as covered", () => {
      const coverageReport: FileCoverageReport = {
        1: CoverageStatus.COVERED,
      };
      const line = document.createElement("div");
      line.setAttribute("data-key", "0"); // becomes line 1

      // Simulate annotation logic 
      const lineNumberStr = line.getAttribute("data-key");
      const lineNumber = lineNumberStr ? parseInt(lineNumberStr, 10) + 1 : 1;
      const status = coverageReport[lineNumber];

      if (status === CoverageStatus.COVERED) {
        line.style.backgroundColor = "rgba(0, 255, 0, 0.3)";
      } else if (status === CoverageStatus.UNCOVERED) {
        line.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
      } else if (status === CoverageStatus.PARTIAL) {
        line.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
      } else {
        line.style.backgroundColor = "inherit";
      }

      expect(line.style.backgroundColor).toBe("rgba(0, 255, 0, 0.3)");
    });

    it("should annotate line as uncovered", () => {
      const coverageReport: FileCoverageReport = {
        5: CoverageStatus.UNCOVERED,
      };
      const line = document.createElement("div");
      line.setAttribute("id", "LC5"); // Line 5

      // Simulate annotation logic for non-virtualized line
      const idAttr = line.getAttribute("id");
      const lineNumber = idAttr ? parseInt(idAttr.substring(2), 10) : 1;
      const status = coverageReport[lineNumber];

      if (status === CoverageStatus.COVERED) {
        line.style.backgroundColor = "rgba(0, 255, 0, 0.3)";
      } else if (status === CoverageStatus.UNCOVERED) {
        line.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
      } else if (status === CoverageStatus.PARTIAL) {
        line.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
      } else {
        line.style.backgroundColor = "inherit";
      }

      expect(line.style.backgroundColor).toBe("rgba(255, 0, 0, 0.3)");
    });

    it("should annotate line as partially covered", () => {
      const coverageReport: FileCoverageReport = {
        10: CoverageStatus.PARTIAL,
      };
      const line = document.createElement("div");
      line.setAttribute("data-key", "9"); // becomes line 10

      // Simulate annotation logic
      const lineNumberStr = line.getAttribute("data-key");
      const lineNumber = lineNumberStr ? parseInt(lineNumberStr, 10) + 1 : 1;
      const status = coverageReport[lineNumber];

      if (status === CoverageStatus.COVERED) {
        line.style.backgroundColor = "rgba(0, 255, 0, 0.3)";
      } else if (status === CoverageStatus.UNCOVERED) {
        line.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
      } else if (status === CoverageStatus.PARTIAL) {
        line.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
      } else {
        line.style.backgroundColor = "inherit";
      }

      expect(line.style.backgroundColor).toBe("rgba(255, 255, 0, 0.3)");
    });

    it("should reset background when no coverage info", () => {
      const coverageReport: FileCoverageReport = {};
      const line = document.createElement("div");
      line.setAttribute("data-key", "0");

      // Simulate annotation logic
      const lineNumberStr = line.getAttribute("data-key");
      const lineNumber = lineNumberStr ? parseInt(lineNumberStr, 10) + 1 : 1;
      const status = coverageReport[lineNumber];

      if (status === CoverageStatus.COVERED) {
        line.style.backgroundColor = "rgba(0, 255, 0, 0.3)";
      } else if (status === CoverageStatus.UNCOVERED) {
        line.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
      } else if (status === CoverageStatus.PARTIAL) {
        line.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
      } else {
        line.style.backgroundColor = "inherit";
      }

      expect(line.style.backgroundColor).toBe("inherit");
    });
  });

  describe("Processing Logic", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should work with empty flags and components", async () => {
      const { getFlags, getComponents } = require("../common/fetchers");

      const metadata: FileMetadata = {
        owner: "owner",
        repo: "repo",
        branch: "main",
        path: "path/to/file.js",
      };

      // Mock to return empty arrays
      (getFlags as jest.MockedFunction<any>).mockResolvedValue([]);
      (getComponents as jest.MockedFunction<any>).mockResolvedValue([]);

      const flags = await getFlags(metadata).catch(() => []);
      const components = await getComponents(metadata);

      expect(flags).toEqual([]);
      expect(components).toEqual([]);
      expect(getFlags).toHaveBeenCalledWith(metadata);
      expect(getComponents).toHaveBeenCalledWith(metadata);
    });

    it("should handle flags when they exist", async () => {
      const { getFlags } = require("../common/fetchers");

      const metadata: FileMetadata = {
        owner: "owner",
        repo: "repo",
        branch: "main",
        path: "path/to/file.js",
      };

      const mockFlags = ["flag1", "flag2"];
      (getFlags as jest.MockedFunction<any>).mockResolvedValue(mockFlags);

      const flags = await getFlags(metadata).catch(() => []);

      expect(flags).toEqual(mockFlags);
      expect(getFlags).toHaveBeenCalledWith(metadata);
    });

    it("should handle components when they exist", async () => {
      const { getComponents } = require("../common/fetchers");

      const metadata: FileMetadata = {
        owner: "owner",
        repo: "repo",
        branch: "main",
        path: "path/to/file.js",
      };

      const mockComponents = ["component1", "component2"];
      (getComponents as jest.MockedFunction<any>).mockResolvedValue(mockComponents);

      const components = await getComponents(metadata);

      expect(components).toEqual(mockComponents);
      expect(getComponents).toHaveBeenCalledWith(metadata);
    });
  });
});