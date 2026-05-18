import {
  breadcrumbsIntegration,
  browserApiErrorsIntegration,
  BrowserClient,
  defaultStackParser,
  globalHandlersIntegration,
  makeFetchTransport,
  dedupeIntegration,
  Scope,
} from "@sentry/browser";
import { initSentry } from "./sentry";

// Mock the @sentry/browser module
jest.mock("@sentry/browser", () => ({
  breadcrumbsIntegration: jest.fn(),
  browserApiErrorsIntegration: jest.fn(),
  BrowserClient: jest.fn(),
  defaultStackParser: jest.fn(),
  globalHandlersIntegration: jest.fn(),
  makeFetchTransport: jest.fn(),
  dedupeIntegration: jest.fn(),
  Scope: jest.fn(),
}));

describe("sentry", () => {
  let mockScopeInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a mock scope instance with setClient method
    mockScopeInstance = {
      setClient: jest.fn(),
    };

    // Mock the Scope constructor to return our mock instance
    (Scope as jest.MockedClass<any>).mockImplementation(() => mockScopeInstance);

    // Mock the BrowserClient constructor
    (BrowserClient as jest.MockedClass<any>).mockImplementation(() => ({
      init: jest.fn(),
    }));
  });

  describe("initSentry", () => {
    it("should return undefined when consent is not 'all'", () => {
      const result = initSentry("none");
      expect(result).toBeUndefined();

      const result2 = initSentry("essential");
      expect(result2).toBeUndefined();
    });

    it("should initialize Sentry when consent is 'all'", () => {
      const mockClient = {
        init: jest.fn(),
      };
      (BrowserClient as jest.MockedClass<any>).mockImplementation(() => mockClient);

      const result = initSentry("all");

      expect(BrowserClient).toHaveBeenCalledWith({
        dsn: process.env.SENTRY_DSN,
        transport: makeFetchTransport,
        stackParser: defaultStackParser,
        integrations: [
          breadcrumbsIntegration,
          browserApiErrorsIntegration,
          globalHandlersIntegration,
          dedupeIntegration,
        ],
      });
      expect(Scope).toHaveBeenCalled();
      expect(mockScopeInstance.setClient).toHaveBeenCalledWith(mockClient);
      expect(mockClient.init).toHaveBeenCalled();
      expect(result).toBe(mockScopeInstance);
    });

    it("should pass the correct DSN from environment variable", () => {
      const originalEnv = process.env.SENTRY_DSN;
      process.env.SENTRY_DSN = "https://test-dsn@example.com/123";

      initSentry("all");

      expect(BrowserClient).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test-dsn@example.com/123",
        })
      );

      process.env.SENTRY_DSN = originalEnv;
    });

    it("should configure the correct integrations", () => {
      initSentry("all");

      expect(BrowserClient).toHaveBeenCalledWith(
        expect.objectContaining({
          integrations: [
            breadcrumbsIntegration,
            browserApiErrorsIntegration,
            globalHandlersIntegration,
            dedupeIntegration,
          ],
        })
      );
    });

    it("should use the correct transport and stack parser", () => {
      initSentry("all");

      expect(BrowserClient).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: makeFetchTransport,
          stackParser: defaultStackParser,
        })
      );
    });

    it("should not call setClient or init methods when consent is not 'all'", () => {
      initSentry("none");

      expect(mockScopeInstance.setClient).not.toHaveBeenCalled();
      expect((BrowserClient as jest.MockedClass<any>).mock.instances.length).toBe(0);
    });
  });
});