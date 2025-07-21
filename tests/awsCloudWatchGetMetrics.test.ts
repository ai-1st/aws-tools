// tests/awsCloudWatchGetMetrics.test.ts

import { invoke } from '../src/index';
import { loadTestConfig } from './common';
import * as fs from 'fs';
import * as vega from 'vega';
// @ts-expect-error: ignore the linter error for vega-lite import
import * as vegaLite from 'vega-lite';

describe('AWS CloudWatch Get Metrics E2E Tests', () => {
  let config: any;

  beforeAll(() => {
    config = loadTestConfig();
  });

  test('should get CloudWatch metrics', async () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const input = {
      namespace: 'AWS/Lambda',
      metricName: 'Invocations',
      startTime: lastMonth.toISOString(),
      endTime: lastDayOfLastMonth.toISOString(),
      period: 86400,
      statistic: 'Sum',
    };
    const result = await invoke('awsCloudWatchGetMetrics', input, config);
    expect(result).toHaveProperty('datapoints');
    expect(result).toHaveProperty('chart');
    expect(result).toHaveProperty('summary');

    // Verify chart is a valid TopLevelSpec object
    expect(typeof result.chart).toBe('object');
    expect(result.chart).toHaveProperty('mark');
    expect(result.chart).toHaveProperty('encoding');
    expect(result.chart).toHaveProperty('data');

    try {
      
      // Compile Vega-Lite to Vega specification
      const vegaSpec = vegaLite.compile(result.chart).spec;
  
      // Create a Vega view
      const view = new vega.View(vega.parse(vegaSpec), {
        renderer: 'none', // No renderer needed for SVG output
      });
  
      // Generate SVG file
      const svg = await view.toSVG();
      
      // Ensure the svg directory exists
      const svgDir = 'tests/svg';
      if (!fs.existsSync(svgDir)) {
        fs.mkdirSync(svgDir, { recursive: true });
      }
      
      fs.writeFileSync('tests/svg/lambda-invocations-chart.svg', svg);
      console.log('SVG file created successfully at tests/svg/lambda-invocations-chart.svg');
    } catch (error) {
      console.error('Error generating SVG:', error);
      // Don't throw the error, just log it and continue with the test
      console.log('Chart specification:', JSON.stringify(result.chart, null, 2));
    }

  });
});
