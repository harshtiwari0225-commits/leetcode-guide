/**
 * Bundle-size budget — fails the build if our content script grows past the
 * point where it would noticeably slow LeetCode's pages.
 *
 * IMPORTANT: this test requires `npm run build` to have been run first. CI
 * should run `npm run build && npm test`. If `dist/` is missing, the test
 * is skipped with a clear message rather than failing.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = resolve(__dirname, '../../dist/assets');

// Per the PRD perf budget. These are intentionally generous — we want
// failure here to mean "you accidentally bundled something huge", not
// "you added one button."
const CONTENT_SCRIPT_MAX_GZIP_KB = 80;
const CONTENT_SCRIPT_MAX_RAW_KB = 250;
const TOTAL_DIST_MAX_KB = 800;

const distExists = existsSync(DIST_DIR);

describe.skipIf(!distExists)('perf — bundle budget', () => {
  it('content script gzipped under 80 KB', () => {
    const file = findFile('index.tsx-');
    expect(file, 'content script bundle not found in dist/assets').toBeTruthy();
    const raw = readFileSync(file!);
    const gz = gzipSync(raw);
    const gzKb = gz.length / 1024;
    expect(
      gzKb,
      `Content script gzipped is ${gzKb.toFixed(1)} KB (budget ${CONTENT_SCRIPT_MAX_GZIP_KB} KB)`,
    ).toBeLessThan(CONTENT_SCRIPT_MAX_GZIP_KB);
  });

  it('content script raw under 250 KB', () => {
    const file = findFile('index.tsx-');
    expect(file).toBeTruthy();
    const sizeKb = statSync(file!).size / 1024;
    expect(
      sizeKb,
      `Content script raw is ${sizeKb.toFixed(1)} KB (budget ${CONTENT_SCRIPT_MAX_RAW_KB} KB)`,
    ).toBeLessThan(CONTENT_SCRIPT_MAX_RAW_KB);
  });

  it('total dist under 800 KB', () => {
    const distRoot = resolve(__dirname, '../../dist');
    const totalKb = walkSize(distRoot) / 1024;
    expect(
      totalKb,
      `Total dist is ${totalKb.toFixed(1)} KB (budget ${TOTAL_DIST_MAX_KB} KB)`,
    ).toBeLessThan(TOTAL_DIST_MAX_KB);
  });
});

if (!distExists) {
  console.warn(
    '[perf test] dist/ not found — skipping bundle-budget tests. Run `npm run build` first.',
  );
}

const findFile = (prefix: string): string | null => {
  if (!existsSync(DIST_DIR)) return null;
  const files = readdirSync(DIST_DIR);
  const match = files.find(
    (f: string) => f.startsWith(prefix) && f.endsWith('.js'),
  );
  return match ? join(DIST_DIR, match) : null;
};

const walkSize = (dir: string): number => {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      total += walkSize(full);
    } else {
      total += s.size;
    }
  }
  return total;
};