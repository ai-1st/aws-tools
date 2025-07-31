import { describe, test, expect } from 'vitest';
import { subDays, subMonths, startOfMonth, format, addDays, differenceInDays, differenceInMonths } from 'date-fns';
import { calculateDateRange } from '../src/utils/costUtils.js';

describe('calculateDateRange with date-fns', () => {
  describe('DAILY granularity', () => {
    test('should calculate date ranges with correct day counts', () => {
      const testCases = [
        { lookBack: 0, expectedDays: 0 },
        { lookBack: 1, expectedDays: 1 },
        { lookBack: 7, expectedDays: 7 },
        { lookBack: 30, expectedDays: 30 },
        { lookBack: 90, expectedDays: 90 },
        { lookBack: 365, expectedDays: 365 },
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
  });

}); 