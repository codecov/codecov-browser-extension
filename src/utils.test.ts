import { displayChange, print } from './utils';

describe('Utils Functions', () => {
  describe('displayChange', () => {
    test('should return positive number with plus sign', () => {
      expect(displayChange(5)).toBe('+5.00');
      expect(displayChange(5.5)).toBe('+5.50');
      expect(displayChange(5.55)).toBe('+5.55');
      expect(displayChange(5.555)).toBe('+5.55'); // Rounding behavior (banker's rounding)
    });

    test('should return negative number without plus sign', () => {
      expect(displayChange(-5)).toBe('-5.00');
      expect(displayChange(-5.5)).toBe('-5.50');
    });

    test('should return zero without plus sign', () => {
      expect(displayChange(0)).toBe('0.00');
    });

    test('should handle decimal numbers correctly', () => {
      expect(displayChange(0.1)).toBe('+0.10');
      expect(displayChange(0.01)).toBe('+0.01');
      expect(displayChange(0.99)).toBe('+0.99');
      expect(displayChange(0.999)).toBe('+1.00'); // Rounding behavior
    });
  });

  describe('print', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleTraceSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleTraceSpy = jest.spyOn(console, 'trace').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleTraceSpy.mockRestore();
    });

    test('should log message with emoji prefix when no error provided', () => {
      print('test message');

      expect(consoleLogSpy).toHaveBeenCalledWith('☂️ codecov: test message');
      expect(consoleTraceSpy).not.toHaveBeenCalled();
    });

    test('should log message and trace error when error is provided', () => {
      const testError = new Error('Test error');
      print('test message with error', testError);

      expect(consoleLogSpy).toHaveBeenCalledWith('☂️ codecov: test message with error');
      expect(consoleTraceSpy).toHaveBeenCalledWith(testError);
    });

    test('should handle empty string message', () => {
      print('');

      expect(consoleLogSpy).toHaveBeenCalledWith('☂️ codecov: ');
    });

    test('should handle undefined error', () => {
      // Testing with explicit undefined
      print('message with undefined', undefined);

      expect(consoleLogSpy).toHaveBeenCalledWith('☂️ codecov: message with undefined');
      expect(consoleTraceSpy).not.toHaveBeenCalled();
    });
  });
});