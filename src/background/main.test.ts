import browser from "webextension-polyfill";
import { mocked } from "jest-mock";
import { MessageType } from "src/types"; // Using mapped path which should now work
import {
  registerContentScript,
  unregisterContentScriptIfExists,
} from "./dynamic_content_scripts";

// Mock webextension-polyfill
jest.mock("webextension-polyfill", () => ({
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    getURL: jest.fn(),
  },
  tabs: { create: jest.fn() },
}));

// Mock @sentry/browser
const mockSentryInit = jest.fn();
const mockStartSpan = jest.fn();
jest.mock("@sentry/browser", () => ({
  init: (config: any) => mockSentryInit(config),
  browserTracingIntegration: jest.fn(() => ({})),
  startSpan: (options: any, callback: any) => mockStartSpan(options, callback),
}));

// Mock the Codecov service
const mockGetConsent = jest.fn();
const mockCanOpenConsentTab = jest.fn();
const mockFetchCommitReport = jest.fn();
const mockFetchPRComparison = jest.fn();
const mockListFlags = jest.fn();
const mockListComponents = jest.fn();
const mockCheckAuth = jest.fn();
const mockSetConsent = jest.fn();

jest.mock("src/service", () => ({
  Codecov: class MockCodecov {
    constructor() {}
    getConsent = mockGetConsent;
    canOpenConsentTab = mockCanOpenConsentTab;
    fetchCommitReport = mockFetchCommitReport;
    fetchPRComparison = mockFetchPRComparison;
    listFlags = mockListFlags;
    listComponents = mockListComponents;
    checkAuth = mockCheckAuth;
    setConsent = mockSetConsent;
  },
}));

// Mock dynamic_content_scripts
jest.mock("./dynamic_content_scripts", () => ({
  registerContentScript: jest.fn(),
  unregisterContentScriptIfExists: jest.fn(),
}));

const mockBrowser = mocked(browser);

describe("background/main.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("runtime behavior", () => {
    it("should register install and message listeners when loaded", () => {
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      // Require the module to trigger the main function execution
      require("./main");

      // Check that the event listeners have been registered
      expect(mockBrowser.runtime.onInstalled.addListener).toHaveBeenCalled();
      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalled();

      console.log = originalConsoleLog;
    });
  });

  describe("handleConsent behavior", () => {
    it("should open consent tab when consent is none and can open consent tab", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      // Call the callback that was registered with onInstalled
      const callbackArgs = (mockBrowser.runtime.onInstalled.addListener as any).mock.calls;
      if (callbackArgs.length > 0) {
        const callback = callbackArgs[0][0];
        
        // Setup mocks
        mockGetConsent.mockResolvedValue("none");
        mockCanOpenConsentTab.mockResolvedValue(true);
        const mockUrl = "chrome-extension://test/consent.html";
        (mockBrowser.runtime.getURL as jest.MockedFunction<any>).mockReturnValue(mockUrl);
        
        // Call the install callback
        await callback({ reason: "install", temporary: false });
        
        // Check that tab creation was called with the correct URL
        expect(mockBrowser.runtime.getURL).toHaveBeenCalledWith("consent.html");
        expect(mockBrowser.tabs.create).toHaveBeenCalledWith({ 
          url: mockUrl, 
          active: true 
        });
      }
      
      console.log = originalConsoleLog;
    });

    it("should not open consent tab when consent is not none", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const callbackArgs = (mockBrowser.runtime.onInstalled.addListener as any).mock.calls;
      if (callbackArgs.length > 0) {
        const callback = callbackArgs[0][0];
        
        // Setup mocks
        mockGetConsent.mockResolvedValue("all");
        const createTabSpy = jest.spyOn(mockBrowser.tabs, "create");
        
        // Call the install callback
        await callback({ reason: "install", temporary: false });
        
        // Tab should not be created when consent is not "none"
        expect(createTabSpy).not.toHaveBeenCalled();
      }
      
      console.log = originalConsoleLog;
    });

    it("should not open consent tab when consent is none but cannot open consent tab", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const callbackArgs = (mockBrowser.runtime.onInstalled.addListener as any).mock.calls;
      if (callbackArgs.length > 0) {
        const callback = callbackArgs[0][0];
        
        // Setup mocks
        mockGetConsent.mockResolvedValue("none");
        mockCanOpenConsentTab.mockResolvedValue(false);
        const createTabSpy = jest.spyOn(mockBrowser.tabs, "create");
        
        // Call the install callback
        await callback({ reason: "install", temporary: false });
        
        // Tab should not be created when can't open consent tab
        expect(createTabSpy).not.toHaveBeenCalled();
      }
      
      console.log = originalConsoleLog;
    });
  });

  describe("message handling", () => {
    it("should handle FETCH_COMMIT_REPORT message", async () => {
      // Reset modules to clear any previous registrations
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      // Get the registered message handler
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        // Setup mocks
        const mockPayload = { repo: "test-repo", commit: "abc123" };
        const mockReferrer = "github.com";
        const expectedResponse = { coverage: 95 };
        mockGetConsent.mockResolvedValue("all"); // For Sentry initialization
        mockFetchCommitReport.mockResolvedValue(expectedResponse);
        
        // Call the message handler
        const result = await messageHandler({
          type: MessageType.FETCH_COMMIT_REPORT,
          payload: mockPayload,
          referrer: mockReferrer,
        });
        
        // Assertions
        expect(mockGetConsent).toHaveBeenCalled();
        expect(mockFetchCommitReport).toHaveBeenCalledWith(mockPayload, mockReferrer);
        expect(result).toEqual(expectedResponse);
      }
      
      console.log = originalConsoleLog;
    });

    it("should handle FETCH_PR_COMPARISON message", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const mockPayload = { repo: "test-repo", prNumber: 123 };
        const mockReferrer = "github.com";
        const expectedResponse = { comparison: "data" };
        mockGetConsent.mockResolvedValue("all");
        mockFetchPRComparison.mockResolvedValue(expectedResponse);
        
        const result = await messageHandler({
          type: MessageType.FETCH_PR_COMPARISON,
          payload: mockPayload,
          referrer: mockReferrer,
        });
        
        expect(mockGetConsent).toHaveBeenCalled();
        expect(mockFetchPRComparison).toHaveBeenCalledWith(mockPayload, mockReferrer);
        expect(result).toEqual(expectedResponse);
      }
      
      console.log = originalConsoleLog;
    });

    it("should handle FETCH_FLAGS_LIST message", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const mockPayload = { repo: "test-repo" };
        const mockReferrer = "github.com";
        const expectedResponse = { flags: ["flag1", "flag2"] };
        mockGetConsent.mockResolvedValue("all");
        mockListFlags.mockResolvedValue(expectedResponse);
        
        const result = await messageHandler({
          type: MessageType.FETCH_FLAGS_LIST,
          payload: mockPayload,
          referrer: mockReferrer,
        });
        
        expect(mockGetConsent).toHaveBeenCalled();
        expect(mockListFlags).toHaveBeenCalledWith(mockPayload, mockReferrer);
        expect(result).toEqual(expectedResponse);
      }
      
      console.log = originalConsoleLog;
    });

    it("should handle FETCH_COMPONENTS_LIST message", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const mockPayload = { repo: "test-repo" };
        const mockReferrer = "github.com";
        const expectedResponse = { components: ["component1", "component2"] };
        mockGetConsent.mockResolvedValue("all");
        mockListComponents.mockResolvedValue(expectedResponse);
        
        const result = await messageHandler({
          type: MessageType.FETCH_COMPONENTS_LIST,
          payload: mockPayload,
          referrer: mockReferrer,
        });
        
        expect(mockGetConsent).toHaveBeenCalled();
        expect(mockListComponents).toHaveBeenCalledWith(mockPayload, mockReferrer);
        expect(result).toEqual(expectedResponse);
      }
      
      console.log = originalConsoleLog;
    });

    it("should handle CHECK_AUTH message", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const mockPayload = { token: "token123" };
        const expectedResponse = { authenticated: true };
        mockGetConsent.mockResolvedValue("all");
        mockCheckAuth.mockResolvedValue(expectedResponse);
        
        const result = await messageHandler({
          type: MessageType.CHECK_AUTH,
          payload: mockPayload,
        });
        
        expect(mockGetConsent).toHaveBeenCalled();
        expect(mockCheckAuth).toHaveBeenCalledWith(mockPayload);
        expect(result).toEqual(expectedResponse);
      }
      
      console.log = originalConsoleLog;
    });

    it("should handle GET_CONSENT message", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const expectedResponse = "all";
        mockGetConsent.mockResolvedValue(expectedResponse);
        
        const result = await messageHandler({
          type: MessageType.GET_CONSENT,
          payload: null,
        });
        
        expect(mockGetConsent).toHaveBeenCalled();
        expect(result).toEqual(expectedResponse);
      }
      
      console.log = originalConsoleLog;
    });

    it("should handle SET_CONSENT message", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const mockPayload = "all";
        const expectedResponse = { success: true };
        mockGetConsent.mockResolvedValue("all");
        mockSetConsent.mockResolvedValue(expectedResponse);
        
        const result = await messageHandler({
          type: MessageType.SET_CONSENT,
          payload: mockPayload,
        });
        
        expect(mockGetConsent).toHaveBeenCalled();
        expect(mockSetConsent).toHaveBeenCalledWith(mockPayload);
        expect(result).toEqual(expectedResponse);
      }
      
      console.log = originalConsoleLog;
    });

    it("should handle REGISTER_CONTENT_SCRIPTS message", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const mockPayload = { scriptName: "test-script" };
        const expectedResponse = { registered: true };
        mockGetConsent.mockResolvedValue("all");
        (registerContentScript as jest.MockedFunction<any>).mockResolvedValue(expectedResponse);
        
        const result = await messageHandler({
          type: MessageType.REGISTER_CONTENT_SCRIPTS,
          payload: mockPayload,
        });
        
        expect(mockGetConsent).toHaveBeenCalled();
        expect(registerContentScript).toHaveBeenCalledWith(mockPayload);
        expect(result).toEqual(expectedResponse);
      }
      
      console.log = originalConsoleLog;
    });

    it("should handle UNREGISTER_CONTENT_SCRIPTS message", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const mockPayload = { scriptName: "test-script" };
        const expectedResponse = { unregistered: true };
        mockGetConsent.mockResolvedValue("all");
        (unregisterContentScriptIfExists as jest.MockedFunction<any>).mockResolvedValue(expectedResponse);
        
        const result = await messageHandler({
          type: MessageType.UNREGISTER_CONTENT_SCRIPTS,
          payload: mockPayload,
        });
        
        expect(mockGetConsent).toHaveBeenCalled();
        expect(unregisterContentScriptIfExists).toHaveBeenCalledWith(mockPayload);
        expect(result).toEqual(expectedResponse);
      }
      
      console.log = originalConsoleLog;
    });

    it("should initialize Sentry when consent is all", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const mockPayload = { token: "token123" };
        const expectedResponse = { authenticated: true };
        mockGetConsent.mockResolvedValue("all");
        mockCheckAuth.mockResolvedValue(expectedResponse);
        
        await messageHandler({
          type: MessageType.CHECK_AUTH,
          payload: mockPayload,
        });
        
        expect(mockSentryInit).toHaveBeenCalled();
      }
      
      console.log = originalConsoleLog;
    });

    it("should not initialize Sentry when consent is not all", async () => {
      jest.resetModules();
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      require("./main");
      
      const messageHandlerArgs = (mockBrowser.runtime.onMessage.addListener as any).mock.calls;
      if (messageHandlerArgs.length > 0) {
        const messageHandler = messageHandlerArgs[0][0];
        
        const mockPayload = { token: "token123" };
        const expectedResponse = { authenticated: true };
        mockGetConsent.mockResolvedValue("none");
        mockCheckAuth.mockResolvedValue(expectedResponse);
        
        await messageHandler({
          type: MessageType.CHECK_AUTH,
          payload: mockPayload,
        });
        
        expect(mockSentryInit).not.toHaveBeenCalled();
      }
      
      console.log = originalConsoleLog;
    });
  });
});