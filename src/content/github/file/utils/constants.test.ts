import {
  lineSelector,
  noVirtLineSelector,
  flagsStorageKey,
  componentsStorageKey,
} from './constants';

describe('Constants', () => {
  test('lineSelector should have the correct value', () => {
    expect(lineSelector).toBe('.react-code-line-contents');
  });

  test('noVirtLineSelector should have the correct value', () => {
    expect(noVirtLineSelector).toBe('.react-code-line-contents-no-virtualization');
  });

  test('flagsStorageKey should have the correct value', () => {
    expect(flagsStorageKey).toBe('selected_flags');
  });

  test('componentsStorageKey should have the correct value', () => {
    expect(componentsStorageKey).toBe('selected_components');
  });
});