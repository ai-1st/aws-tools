// tests/common.ts

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../src/logger';
import * as vega from 'vega';
// @ts-expect-error: ignore the linter error for vega-lite import
import * as vegaLite from 'vega-lite';
import { createCanvas } from 'canvas';

export class TestLogger implements Logger {
  log(message: string, ...args: any[]): void {
    console.log(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
  }
  error(message: string, ...args: any[]): void {
    console.error(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
  }
  warn(message: string, ...args: any[]): void {
    console.warn(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
  }
  info(message: string, ...args: any[]): void {
    console.info(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
  }
  debug(message: string, ...args: any[]): void {
    if (process.argv.includes('--verbose') || process.env.VERBOSE === 'true') {
      console.debug(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
    }
  }
}

export function loadTestConfig() {
  const credsFile = path.join(__dirname, '..', '.aws-creds.json');
  const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
  return {
    credentials: {
      accessKeyId: creds.Credentials.AccessKeyId,
      secretAccessKey: creds.Credentials.SecretAccessKey,
      sessionToken: creds.Credentials.SessionToken,
    },
    region: 'us-east-1',
    logger: new TestLogger(),
  };
}

/**
 * Generates PNG and SVG files from a Vega-Lite chart specification
 * @param chartSpec - The Vega-Lite chart specification
 * @param filename - Base filename without extension
 * @param outputDir - Directory to save the files (default: 'tests')
 */
export async function generateChartFiles(chartSpec: any, filename: string, outputDir: string = 'tests'): Promise<void> {
  try {
    // Compile Vega-Lite to Vega specification
    const vegaSpec = vegaLite.compile(chartSpec).spec;

    // Ensure output directories exist
    const svgDir = `${outputDir}/svg`;
    const pngDir = `${outputDir}/png`;
    
    if (!fs.existsSync(svgDir)) {
      fs.mkdirSync(svgDir, { recursive: true });
    }
    if (!fs.existsSync(pngDir)) {
      fs.mkdirSync(pngDir, { recursive: true });
    }

    // Generate SVG file
    const view = new vega.View(vega.parse(vegaSpec), { renderer: 'none' });
    
    const svg = await view.toSVG();
    fs.writeFileSync(`${svgDir}/${filename}.svg`, svg);
    console.log(`SVG file created successfully at ${svgDir}/${filename}.svg`);

    // Generate PNG file using canvas
    const canvasView = new vega.View(vega.parse(vegaSpec), { renderer: 'none' });
    const canvas = await canvasView.toCanvas();
    const out = fs.createWriteStream(`${pngDir}/${filename}.png`);
    const stream = (canvas as any).createPNGStream();
    
    stream.pipe(out);
    
    return new Promise<void>((resolve, reject) => {
      out.on('finish', () => {
        console.log(`PNG file created successfully at ${pngDir}/${filename}.png`);
        resolve();
      });
      out.on('error', reject);
    });
  } catch (error) {
    console.error('Error generating chart files:', error);
    console.log('Chart specification:', JSON.stringify(chartSpec, null, 2));
    // Don't throw the error, just log it and continue
  }
}

 