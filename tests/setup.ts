import '@testing-library/jest-dom/vitest';
import { vi, afterEach } from 'vitest';

// In-memory mock for chrome.storage.local; reused across all tests.
const store: Record<string, unknown> = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(
        (
          key: string | string[] | Record<string, unknown> | null,
          cb: (result: Record<string, unknown>) => void,
        ) => {
          if (key === null || key === undefined) {
            cb({ ...store });
            return;
          }
          if (typeof key === 'string') {
            cb({ [key]: store[key] });
            return;
          }
          if (Array.isArray(key)) {
            const out: Record<string, unknown> = {};
            for (const k of key) out[k] = store[k];
            cb(out);
            return;
          }
          // object with defaults
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(key)) {
            out[k] = store[k] ?? v;
          }
          cb(out);
        },
      ),
      set: vi.fn((items: Record<string, unknown>, cb?: () => void) => {
        Object.assign(store, items);
        cb?.();
      }),
      remove: vi.fn((key: string | string[], cb?: () => void) => {
        const keys = Array.isArray(key) ? key : [key];
        for (const k of keys) delete store[k];
        cb?.();
      }),
      clear: vi.fn((cb?: () => void) => {
        for (const k of Object.keys(store)) delete store[k];
        cb?.();
      }),
    },
  },
  runtime: {
    lastError: undefined as chrome.runtime.LastError | undefined,
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    getManifest: vi.fn(() => ({ version: '0.1.0' })),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    sendMessage: vi.fn(),
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn((_q, cb: (tabs: chrome.tabs.Tab[]) => void) => cb([])),
    onUpdated: { addListener: vi.fn() },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
};

// @ts-expect-error — partial mock is sufficient for our use cases
globalThis.chrome = chromeMock;

afterEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
});