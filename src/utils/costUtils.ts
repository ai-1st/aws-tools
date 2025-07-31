import { subDays, subMonths, startOfMonth, format } from 'date-fns';

export function calculateDateRange(lookBack: number, granularity: 'DAILY' | 'MONTHLY'): { startDate: string; endDate: string } {
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

export function generateSimpleCostSummary(results: any[], granularity: 'DAILY' | 'MONTHLY'): string {
  if (!results || results.length === 0) {
    return 'No cost data found for the specified period.';
  }

  // Get date range
  const startDate = results[0]?.date;
  const endDate = results[results.length - 1]?.date;
  
  // Format dates based on granularity
  const formatDate = (dateStr: string) => {
    if (granularity === 'MONTHLY') {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return dateStr;
  };
  
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  const dateRange = `awsCostPerServicePerRegion data range: ${formattedStartDate} - ${formattedEndDate}`;

  // Aggregate data by service
  const serviceMap = new Map<string, { totalCost: number; dailyCosts: { date: string; cost: number }[] }>();

  results.forEach(result => {
    if (result.dimensions) {
      Object.entries(result.dimensions).forEach(([service, value]) => {
        const cost = parseFloat(value as string) || 0;
        const date = result.date;
        
        // Filter out costs less than $0.01
        if (cost < 0.01) {
          return;
        }
        
        if (!serviceMap.has(service)) {
          serviceMap.set(service, {
            totalCost: 0,
            dailyCosts: []
          });
        }
        
        const serviceData = serviceMap.get(service)!;
        serviceData.totalCost += cost;
        serviceData.dailyCosts.push({ date, cost });
      });
    }
  });

  // Calculate total cost across all services
  const totalCost = Array.from(serviceMap.values()).reduce((sum, service) => sum + service.totalCost, 0);
  
  // Sort services by total cost
  const sortedServices = Array.from(serviceMap.entries())
    .sort(([, a], [, b]) => b.totalCost - a.totalCost);

  // Generate summary lines
  const summaryLines: string[] = [dateRange];
  const periods = results.length;
  const periodLabel = granularity === 'DAILY' ? 'days' : 'months';
  const avgPeriodLabel = granularity === 'DAILY' ? '/day' : '/month';

  sortedServices.forEach(([service, data]) => {
    const avgPeriodCost = data.totalCost / periods;
    const percentage = (data.totalCost / totalCost) * 100;
    
    const line = `${service}: Total cost for ${periods} ${periodLabel} $${data.totalCost.toFixed(2)} (${percentage.toFixed(1)}%), average $${avgPeriodCost.toFixed(2)}${avgPeriodLabel}`;
    summaryLines.push(line);
  });

  return summaryLines.join('\n');
} 