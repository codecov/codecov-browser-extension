import { oldLineSelector, newLineSelector } from './constants';

describe('PR Constants', () => {
  describe('oldLineSelector', () => {
    it('should be defined', () => {
      expect(oldLineSelector).toBeDefined();
    });

    it('should be a string', () => {
      expect(typeof oldLineSelector).toBe('string');
    });

    it('should have the correct value', () => {
      expect(oldLineSelector).toBe('.js-file-line');
    });

    it('should start with a dot (CSS class selector)', () => {
      expect(oldLineSelector.startsWith('.')).toBe(true);
    });
  });

  describe('newLineSelector', () => {
    it('should be defined', () => {
      expect(newLineSelector).toBeDefined();
    });

    it('should be a string', () => {
      expect(typeof newLineSelector).toBe('string');
    });

    it('should have the correct value', () => {
      expect(newLineSelector).toBe('.diff-line-row');
    });

    it('should start with a dot (CSS class selector)', () => {
      expect(newLineSelector.startsWith('.')).toBe(true);
    });
  });

  describe('Constants comparison', () => {
    it('should have different values', () => {
      expect(oldLineSelector).not.toBe(newLineSelector);
    });

    it('should both be CSS selectors (start with dot)', () => {
      expect(oldLineSelector.startsWith('.')).toBe(true);
      expect(newLineSelector.startsWith('.')).toBe(true);
    });
  });
});