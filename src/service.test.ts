import { Codecov } from './service';
import browser from 'webextension-polyfill';

// Mock webextension-polyfill
jest.mock('webextension-polyfill', () => ({
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
  },
}));

// Mock fetch API and Response
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Properly mock Response constructor
class MockResponse {
  status: number;
  ok: boolean;
  json: () => Promise<any>;

  constructor(body?: any, init?: { status?: number }) {
    this.status = init?.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.json = () => Promise.resolve(body);
  }

  static error() {
    return new MockResponse(null, { status: 0 });
  }

  static json(data: any, init?: ResponseInit) {
    return new MockResponse(JSON.stringify(data), init);
  }

  static redirect(url: string | URL, status?: number) {
    return new MockResponse(null, { status: status || 302 });
  }
}
global.Response = MockResponse as any;

// Mock external libraries
jest.mock('url-join', () => {
  // Simple implementation that joins parts and normalizes slashes
  const join = (...parts: string[]): string => {
    // Join all parts with a slash and then normalize multiple slashes to a single slash
    // except for the protocol part like http:// or https://
    const joined = parts.join('/');

    // Replace multiple slashes with single slash, but keep the protocol slashes
    return joined.replace(/([^:]\/)\/+/g, '$1');
  };
  return join; // Export the function directly as default
});

// Mock constants
jest.mock('./constants', () => ({
  codecovCloudApiUrl: 'https://api.codecov.io',
  codecovApiTokenStorageKey: 'codecov_api_token',
  selfHostedCodecovURLStorageKey: 'self_hosted_codecov_url',
  selfHostedGitHubURLStorageKey: 'self_hosted_github_url',
  providers: {
    github: 'github',
    githubEnterprise: 'github_enterprise',
  },
  cacheTtlMs: 300000, // 5 minutes
  allConsentStorageKey: 'all_consent',
  onlyEssentialConsentStorageKey: 'essential_consent',
  consentTabLock: 'consent_tab_lock',
}));

describe('Codecov Service', () => {
  let codecov: Codecov;

  beforeEach(() => {
    codecov = new Codecov();
    jest.clearAllMocks();
    
    // Reset the internal state
    codecov.apiToken = '';
    codecov.apiUrl = 'https://api.codecov.io';
    codecov.provider = 'github';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('init', () => {
    it('initializes with default values when no storage values exist', async () => {
      (browser.storage.sync.get as jest.Mock).mockResolvedValue({});
      
      await (codecov as any).init();
      
      expect(codecov.apiToken).toBe('');
      expect(codecov.apiUrl).toBe('https://api.codecov.io');
      expect(codecov.provider).toBe('github');
    });

    it('uses stored API token if available', async () => {
      (browser.storage.sync.get as jest.Mock).mockResolvedValue({
        codecov_api_token: 'test-token',
      });
      
      await (codecov as any).init();
      
      expect(codecov.apiToken).toBe('test-token');
    });

    it('uses stored self-hosted URL if available', async () => {
      (browser.storage.sync.get as jest.Mock).mockResolvedValue({
        self_hosted_codecov_url: 'https://mycompany.codecov.io',
      });
      
      await (codecov as any).init();
      
      expect(codecov.apiUrl).toBe('https://mycompany.codecov.io');
    });

    it('uses GitHub Enterprise provider when self-hosted GitHub URL is present', async () => {
      (browser.storage.sync.get as jest.Mock).mockResolvedValue({
        self_hosted_github_url: 'https://github.mycompany.com',
      });
      
      await (codecov as any).init();
      
      expect(codecov.provider).toBe('github_enterprise');
    });
  });

  describe('fetch', () => {
    it('uses API token authentication when token is present', async () => {
      codecov.apiToken = 'test-token';
      const mockResponse = new Response('OK', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await codecov.fetch('/test');

      expect(mockFetch).toHaveBeenCalledWith('/test', {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
      expect(result).toBe(mockResponse);
    });

    it('uses session cookie when no API token is present', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await codecov.fetch('/test');

      expect(mockFetch).toHaveBeenCalledWith('/test', undefined);
      expect(result).toBe(mockResponse);
    });

    it('merges existing headers with auth header when using API token', async () => {
      codecov.apiToken = 'test-token';
      const mockResponse = new Response('OK', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await codecov.fetch('/test', {
        headers: { 'X-Custom': 'value' },
      });

      expect(mockFetch).toHaveBeenCalledWith('/test', {
        headers: {
          Authorization: 'Bearer test-token',
          'X-Custom': 'value',
        },
      });
      expect(result).toBe(mockResponse);
    });
  });

  describe('checkAuth', () => {
    it('returns true for successful auth check with token', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await codecov.checkAuth({
        baseUrl: 'https://api.codecov.io',
        token: 'test-token',
        provider: 'github',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.codecov.io/api/v2/github/', {
        headers: {
          Authorization: 'Bearer test-token',
          Referrer: 'https://github.com/codecov/codecov-api',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false for failed auth check with token', async () => {
      const mockResponse = new Response('Unauthorized', { status: 401 });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await codecov.checkAuth({
        baseUrl: 'https://api.codecov.io',
        token: 'test-token',
        provider: 'github',
      });

      expect(result).toBe(false);
    });

    it('returns true for successful auth check without token', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await codecov.checkAuth({
        baseUrl: 'https://api.codecov.io',
        token: '',
        provider: 'github',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.codecov.io/api/v2/github/');
      expect(result).toBe(true);
    });
  });

  describe('fetchCommitReport', () => {
    it('fetches commit report with SHA', async () => {
      (browser.storage.sync.get as jest.Mock).mockResolvedValue({});
      const mockResponse = { json: jest.fn().mockResolvedValue({ coverage: 95 }) };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await codecov.fetchCommitReport(
        { owner: 'owner', repo: 'repo', sha: 'abc123' },
        'https://github.com'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.codecov.io/api/v2/github/owner/repos/repo/report?path=undefined&sha=abc123',
        { headers: { Referrer: 'https://github.com' } }
      );
      expect(result).toEqual({ ok: undefined, data: { coverage: 95 } });
    });

    it('fetches commit report with branch', async () => {
      (browser.storage.sync.get as jest.Mock).mockResolvedValue({});
      const mockResponse = { json: jest.fn().mockResolvedValue({ coverage: 90 }) };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await codecov.fetchCommitReport(
        { owner: 'owner', repo: 'repo', branch: 'main' },
        'https://github.com'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.codecov.io/api/v2/github/owner/repos/repo/report?path=undefined&branch=main',
        { headers: { Referrer: 'https://github.com' } }
      );
      expect(result).toEqual({ ok: undefined, data: { coverage: 90 } });
    });

    it('includes path parameter when provided', async () => {
      (browser.storage.sync.get as jest.Mock).mockResolvedValue({});
      const mockResponse = { json: jest.fn().mockResolvedValue({ coverage: 85 }) };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await codecov.fetchCommitReport(
        { owner: 'owner', repo: 'repo', sha: 'abc123', path: 'src/' },
        'https://github.com'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.codecov.io/api/v2/github/owner/repos/repo/report?path=src%2F&sha=abc123',
        { headers: { Referrer: 'https://github.com' } }
      );
      expect(result).toEqual({ ok: undefined, data: { coverage: 85 } });
    });

    it('includes flag and component_id when provided', async () => {
      (browser.storage.sync.get as jest.Mock).mockResolvedValue({});
      const mockResponse = { json: jest.fn().mockResolvedValue({ coverage: 80 }) };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await codecov.fetchCommitReport(
        { owner: 'owner', repo: 'repo', sha: 'abc123', flag: 'flag1', component_id: 'comp1' },
        'https://github.com'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.codecov.io/api/v2/github/owner/repos/repo/report?path=undefined&sha=abc123&flag=flag1&component_id=comp1',
        { headers: { Referrer: 'https://github.com' } }
      );
      expect(result).toEqual({ ok: undefined, data: { coverage: 80 } });
    });
  });

  describe('fetchPRComparison', () => {
    it('fetches PR comparison', async () => {
      (browser.storage.sync.get as jest.Mock).mockResolvedValue({});
      const mockResponse = { json: jest.fn().mockResolvedValue({ diff: {} }) };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await codecov.fetchPRComparison(
        { owner: 'owner', repo: 'repo', pullid: '123' },
        'https://github.com'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.codecov.io/api/v2/github/owner/repos/repo/compare?pullid=123',
        { headers: { Referrer: 'https://github.com' } }
      );
      expect(result).toEqual({ ok: undefined, data: { diff: {} } });
    });
  });

  describe('cache methods', () => {
    describe('getCached', () => {
      it('returns null when cache does not exist', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});

        const result = await codecov.getCached('flags', 'owner', 'repo');

        expect(result).toBeNull();
      });

      it('returns null when cache is expired', async () => {
        const pastTime = Date.now() - 600000; // 10 minutes ago
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
          'owner/repo/flags': JSON.stringify(['flag1', 'flag2']),
          'owner/repo/flags/expiry': pastTime,
        });

        const result = await codecov.getCached('flags', 'owner', 'repo');

        expect(browser.storage.local.remove).toHaveBeenCalledWith([
          'owner/repo/flags',
          'owner/repo/flags/expiry'
        ]);
        expect(result).toBeNull();
      });

      it('returns cached value when valid', async () => {
        const futureTime = Date.now() + 600000; // 10 minutes from now
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
          'owner/repo/flags': JSON.stringify(['flag1', 'flag2']),
          'owner/repo/flags/expiry': futureTime,
        });

        const result = await codecov.getCached('flags', 'owner', 'repo');

        expect(result).toEqual(['flag1', 'flag2']);
      });
    });

    describe('setCached', () => {
      it('sets cache with expiry', async () => {
        const setTime = Date.now();
        
        await codecov.setCached('flags', 'owner', 'repo', ['flag1', 'flag2']);

        expect(browser.storage.local.set).toHaveBeenCalledWith({
          'owner/repo/flags': JSON.stringify(['flag1', 'flag2']),
          'owner/repo/flags/expiry': setTime + 300000, // TTL of 5 minutes
        });
      });
    });

    describe('listFlags', () => {
      it('returns cached flags when available', async () => {
        const futureTime = Date.now() + 600000;
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
          'owner/repo/flags': JSON.stringify(['flag1', 'flag2']),
          'owner/repo/flags/expiry': futureTime,
        });

        const result = await codecov.listFlags(
          { owner: 'owner', repo: 'repo' },
          'https://github.com'
        );

        expect(result).toEqual({
          ok: true,
          data: ['flag1', 'flag2'],
        });
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('fetches flags when not cached', async () => {
        (browser.storage.sync.get as jest.Mock).mockResolvedValue({});
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});
        const mockResponse = { json: jest.fn().mockResolvedValue(['flag1', 'flag2']) };
        mockFetch.mockResolvedValueOnce(mockResponse as any);

        const result = await codecov.listFlags(
          { owner: 'owner', repo: 'repo' },
          'https://github.com'
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.codecov.io/api/v2/github/owner/repos/repo/flags',
          { headers: { Referrer: 'https://github.com' } }
        );
        expect(result).toEqual({
          ok: undefined,
          data: ['flag1', 'flag2'],
        });
      });
    });

    describe('listComponents', () => {
      it('returns cached components when available', async () => {
        const futureTime = Date.now() + 600000;
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
          'owner/repo/components': JSON.stringify(['comp1', 'comp2']),
          'owner/repo/components/expiry': futureTime,
        });

        const result = await codecov.listComponents(
          { owner: 'owner', repo: 'repo' },
          'https://github.com'
        );

        expect(result).toEqual({
          ok: true,
          data: ['comp1', 'comp2'],
        });
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('fetches components when not cached', async () => {
        (browser.storage.sync.get as jest.Mock).mockResolvedValue({});
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});
        const mockResponse = { json: jest.fn().mockResolvedValue(['comp1', 'comp2']) };
        mockFetch.mockResolvedValueOnce(mockResponse as any);

        const result = await codecov.listComponents(
          { owner: 'owner', repo: 'repo' },
          'https://github.com'
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.codecov.io/api/v2/github/owner/repos/repo/components',
          { headers: { Referrer: 'https://github.com' } }
        );
        expect(result).toEqual({
          ok: undefined,
          data: ['comp1', 'comp2'],
        });
      });
    });
  });

  describe('consent methods', () => {
    beforeEach(() => {
      // Mock the IS_FIREFOX global variable
      Object.defineProperty(global, 'IS_FIREFOX', {
        writable: true,
        value: true,
      });
    });

    describe('getConsent', () => {
      it('returns "all" when all consent is given', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
          all_consent: true,
          essential_consent: false,
        });

        const result = await codecov.getConsent();

        expect(result).toBe('all');
      });

      it('returns "essential" when only essential consent is given', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
          all_consent: false,
          essential_consent: true,
        });

        const result = await codecov.getConsent();

        expect(result).toBe('essential');
      });

      it('returns "none" when no consent is given', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
          all_consent: false,
          essential_consent: false,
        });

        const result = await codecov.getConsent();

        expect(result).toBe('none');
      });

      it('returns "all" by default when not in Firefox', async () => {
        Object.defineProperty(global, 'IS_FIREFOX', {
          writable: true,
          value: false,
        });

        const result = await codecov.getConsent();

        expect(result).toBe('all');
      });
    });

    describe('setConsent', () => {
      it('stores all consent when set to "all"', async () => {
        await codecov.setConsent('all');

        expect(browser.storage.local.set).toHaveBeenCalledWith({
          all_consent: true,
          essential_consent: false,
        });
      });

      it('stores essential consent when set to "essential"', async () => {
        await codecov.setConsent('essential');

        expect(browser.storage.local.set).toHaveBeenCalledWith({
          all_consent: false,
          essential_consent: true,
        });
      });

      it('stores no consent when set to "none"', async () => {
        await codecov.setConsent('none');

        expect(browser.storage.local.set).toHaveBeenCalledWith({
          all_consent: false,
          essential_consent: false,
        });
      });
    });
  });

  describe('canOpenConsentTab', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Mock the IS_FIREFOX global variable
      Object.defineProperty(global, 'IS_FIREFOX', {
        writable: true,
        value: true,
      });
    });

    it('returns false when consent tab is already locked', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({
        consent_tab_lock: true,
      });

      const result = await codecov.canOpenConsentTab();

      expect(result).toBe(false);
      expect(browser.storage.local.set).not.toHaveBeenCalled();
    });

    it('acquires lock and returns true when not locked', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({
        consent_tab_lock: false,
      });

      const result = await codecov.canOpenConsentTab();

      expect(result).toBe(true);
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        consent_tab_lock: true,
      });

      // Advance timer to trigger the timeout callback
      jest.advanceTimersByTime(2000);

      // Check that the lock is released after 2 seconds
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        consent_tab_lock: false,
      });
    });

    it('returns true when consent tab is unlocked (null value)', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({
        consent_tab_lock: null,
      });

      const result = await codecov.canOpenConsentTab();

      expect(result).toBe(true);
    });
  });
});