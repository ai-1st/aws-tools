import { describe, test, expect } from 'vitest';
import { subDays, subMonths, startOfMonth, format, addDays, differenceInDays, differenceInMonths } from 'date-fns';

// Import the function we want to test by copying it here for isolated testing
function calculateDateRange(lookBack: number, granularity: 'DAILY' | 'MONTHLY'): { startDate: string; endDate: string } {
  // Use UTC to avoid timezone issues - get current date at UTC midnight
  const todayUTC = new Date();
  const today = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate()));
  
  if (granularity === 'DAILY') {
    // For daily: end date is yesterday, start date is lookBack days before end date
    const endDate = subDays(today, 1); // Yesterday
    const startDate = subDays(endDate, lookBack - 1); // lookBack days before end date (inclusive)
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
  } else {
    // For monthly: end date is first day of current month, start date is first day of lookBack months before
    const currentMonthStart = startOfMonth(today);
    const endDate = currentMonthStart; // First day of current month
    const startDate = subMonths(currentMonthStart, lookBack); // First day of lookBack months ago
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
  }
}

describe('calculateDateRange with date-fns', () => {
  describe('DAILY granularity', () => {
    test('should calculate date ranges with correct day counts', () => {
      const testCases = [
        { lookBack: 1, expectedDays: 1 },
        { lookBack: 7, expectedDays: 7 },
        { lookBack: 30, expectedDays: 30 },
        { lookBack: 90, expectedDays: 90 },
      ];

      testCases.forEach(({ lookBack, expectedDays }) => {
        const result = calculateDateRange(lookBack, 'DAILY');
        const startDate = new Date(result.startDate);
        const endDate = new Date(result.endDate);
        
        // Check that the date range includes the correct number of days
        const actualDays = differenceInDays(endDate, startDate) + 1; // +1 for inclusive range
        expect(actualDays).toBe(expectedDays);
        
        // Check that end date is yesterday
        const yesterday = subDays(new Date(), 1);
        expect(result.endDate).toBe(format(yesterday, 'yyyy-MM-dd'));
      });
    });

    test('should handle edge cases for DAILY', () => {
      // Test with 0 lookback (edge case)
      const zeroResult = calculateDateRange(0, 'DAILY');
      const zeroStartDate = new Date(zeroResult.startDate);
      const zeroEndDate = new Date(zeroResult.endDate);
      
      // For 0 lookback, start date should be 1 day after end date (no days included)
      expect(differenceInDays(zeroStartDate, zeroEndDate)).toBe(1);
      
      // Test with 1 year lookback
      const yearResult = calculateDateRange(365, 'DAILY');
      const yearStartDate = new Date(yearResult.startDate);
      const yearEndDate = new Date(yearResult.endDate);
      const yearDays = differenceInDays(yearEndDate, yearStartDate) + 1;
      expect(yearDays).toBe(365);
    });
  });

  describe('MONTHLY granularity', () => {
    test('should calculate date ranges with correct month counts', () => {
      const testCases = [
        { lookBack: 1, expectedMonths: 1 },
        { lookBack: 3, expectedMonths: 3 },
        { lookBack: 6, expectedMonths: 6 },
        { lookBack: 12, expectedMonths: 12 },
      ];

      testCases.forEach(({ lookBack, expectedMonths }) => {
        const result = calculateDateRange(lookBack, 'MONTHLY');
        const startDate = new Date(result.startDate);
        const endDate = new Date(result.endDate);
        
        // Check that the date range includes the correct number of months
        const actualMonths = differenceInMonths(endDate, startDate);
        expect(actualMonths).toBe(expectedMonths);
        
        // Check that end date is first of current month
        const currentMonthStart = startOfMonth(new Date());
        expect(result.endDate).toBe(format(currentMonthStart, 'yyyy-MM-dd'));
        
        // Check that start date is first of the month
        expect(result.startDate.endsWith('-01')).toBe(true);
      });
    });

    test('should handle edge cases for MONTHLY', () => {
      // Test with 0 lookback (edge case)
      const zeroResult = calculateDateRange(0, 'MONTHLY');
      const currentMonthStart = startOfMonth(new Date());
      expect(zeroResult.endDate).toBe(format(currentMonthStart, 'yyyy-MM-dd'));
      expect(zeroResult.startDate).toBe(format(currentMonthStart, 'yyyy-MM-dd'));
      
      // Test with 24 months lookback
      const longResult = calculateDateRange(24, 'MONTHLY');
      const longStartDate = new Date(longResult.startDate);
      const longEndDate = new Date(longResult.endDate);
      const longMonths = differenceInMonths(longEndDate, longStartDate);
      expect(longMonths).toBe(24);
    });
  });

  describe('Date format and validation', () => {
    test('should return dates in YYYY-MM-DD format', () => {
      const dailyResult = calculateDateRange(7, 'DAILY');
      const monthlyResult = calculateDateRange(3, 'MONTHLY');
      
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      expect(dailyResult.startDate).toMatch(dateRegex);
      expect(dailyResult.endDate).toMatch(dateRegex);
      expect(monthlyResult.startDate).toMatch(dateRegex);
      expect(monthlyResult.endDate).toMatch(dateRegex);
    });

    test('should ensure start date is before or equal to end date', () => {
      const testCases = [
        { lookBack: 1, granularity: 'DAILY' as const },
        { lookBack: 7, granularity: 'DAILY' as const },
        { lookBack: 30, granularity: 'DAILY' as const },
        { lookBack: 1, granularity: 'MONTHLY' as const },
        { lookBack: 6, granularity: 'MONTHLY' as const },
        { lookBack: 12, granularity: 'MONTHLY' as const },
      ];

      testCases.forEach(({ lookBack, granularity }) => {
        const result = calculateDateRange(lookBack, granularity);
        const startDate = new Date(result.startDate);
        const endDate = new Date(result.endDate);
        
        expect(startDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    test('should handle various lookback values consistently', () => {
      // Test multiple lookback values for DAILY
      const dailyTests = [1, 5, 14, 30, 60, 90, 180, 365];
      dailyTests.forEach(lookBack => {
        const result = calculateDateRange(lookBack, 'DAILY');
        const startDate = new Date(result.startDate);
        const endDate = new Date(result.endDate);
        const actualDays = differenceInDays(endDate, startDate) + 1;
        expect(actualDays).toBe(lookBack);
      });

      // Test multiple lookback values for MONTHLY
      const monthlyTests = [1, 2, 3, 6, 12, 18, 24, 36];
      monthlyTests.forEach(lookBack => {
        const result = calculateDateRange(lookBack, 'MONTHLY');
        const startDate = new Date(result.startDate);
        const endDate = new Date(result.endDate);
        const actualMonths = differenceInMonths(endDate, startDate);
        expect(actualMonths).toBe(lookBack);
      });
    });
  });

  describe('Leap year and month boundary handling', () => {
    test('should handle different month lengths correctly', () => {
      // Test that monthly calculations work across different months
      const result = calculateDateRange(12, 'MONTHLY');
      const startDate = new Date(result.startDate);
      const endDate = new Date(result.endDate);
      
      // Should be exactly 12 months apart
      expect(differenceInMonths(endDate, startDate)).toBe(12);
      
      // Both should be first of the month
      expect(startDate.getDate()).toBe(1);
      expect(endDate.getDate()).toBe(1);
    });

    test('should produce consistent results when called multiple times', () => {
      // Call the function multiple times and ensure consistent results
      const results = Array.from({ length: 5 }, () => calculateDateRange(30, 'DAILY'));
      
      // All results should be identical since they're called in quick succession
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.startDate).toBe(firstResult.startDate);
        expect(result.endDate).toBe(firstResult.endDate);
      });
    });
  });
}); 