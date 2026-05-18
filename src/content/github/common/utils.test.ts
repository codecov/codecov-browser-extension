import { isFileUrl, isPrUrl } from './utils';

describe('GitHub URL utilities', () => {
  describe('isFileUrl', () => {
    test('returns true for valid file URLs', () => {
      expect(isFileUrl('/codecov/gazebo/blob/main/src/App.jsx')).toBe(true);
      expect(isFileUrl('/owner/repo/blob/master/index.js')).toBe(true);
      expect(isFileUrl('/user/project/blob/branch/folder/file.ts')).toBe(true);
      expect(isFileUrl('/a/b/blob/c/d/e/f')).toBe(true);
      expect(isFileUrl('/some-org/some-repo/blob/main/some/deep/nested/path/file.ext')).toBe(true);
    });

    test('returns false for PR URLs', () => {
      expect(isFileUrl('/codecov/gazebo/pull/2435/files')).toBe(false);
      expect(isFileUrl('/owner/repo/pull/123/files')).toBe(false);
      expect(isFileUrl('/user/project/pull/999/files')).toBe(false);
    });

    test('returns false for invalid URLs', () => {
      expect(isFileUrl('')).toBe(false);
      expect(isFileUrl('/invalid/url/format')).toBe(false);
      expect(isFileUrl('/too/short')).toBe(false);
      expect(isFileUrl('/owner/repo/invalid/main/file.ext')).toBe(false);
      expect(isFileUrl('not-a-url')).toBe(false);
      expect(isFileUrl('https://example.com')).toBe(false);
    });
  });

  describe('isPrUrl', () => {
    test('returns true for valid PR URLs', () => {
      expect(isPrUrl('/codecov/gazebo/pull/2435/files')).toBe(true);
      expect(isPrUrl('/owner/repo/pull/123/files')).toBe(true);
      expect(isPrUrl('/user/project/pull/999/files/diff')).toBe(true); // with additional path
      expect(isPrUrl('/a/b/pull/1/files')).toBe(true);
      expect(isPrUrl('/some-org/some-repo/pull/99999/files/something')).toBe(true); // with additional path
    });

    test('returns false for file URLs', () => {
      expect(isPrUrl('/codecov/gazebo/blob/main/src/App.jsx')).toBe(false);
      expect(isPrUrl('/owner/repo/blob/master/index.js')).toBe(false);
      expect(isPrUrl('/user/project/blob/branch/file.ts')).toBe(false);
    });

    test('returns false for invalid URLs', () => {
      expect(isPrUrl('')).toBe(false);
      expect(isPrUrl('/invalid/url/format')).toBe(false);
      expect(isPrUrl('/too/short')).toBe(false);
      expect(isPrUrl('/owner/repo/invalid/main/file.ext')).toBe(false);
      expect(isPrUrl('not-a-url')).toBe(false);
      expect(isPrUrl('https://example.com')).toBe(false);
    });
  });
});