import { describe, it, expect } from 'vitest';
import {
  getFontLevel,
  getPanelHeight,
  getPanelSide,
  getPanelWidth,
  getTabTop,
  getThemePreference,
  setFontLevel,
  setPanelHeight,
  setPanelSideStored,
  setPanelWidth,
  setTabTop,
  setThemePreference,
} from '@/services/storage';

describe('storage — UI preferences (panel width)', () => {
  it('returns null for an unset panel width', async () => {
    expect(await getPanelWidth()).toBeNull();
  });

  it('round-trips a panel width', async () => {
    await setPanelWidth(420);
    expect(await getPanelWidth()).toBe(420);
  });

  it('rounds fractional widths to integers', async () => {
    await setPanelWidth(412.7);
    expect(await getPanelWidth()).toBe(413);
  });
});

describe('storage — UI preferences (font level)', () => {
  it('returns null for an unset font level', async () => {
    expect(await getFontLevel()).toBeNull();
  });

  it('round-trips a font level', async () => {
    await setFontLevel(3);
    expect(await getFontLevel()).toBe(3);
  });

  it('round-trips level 0 (smallest)', async () => {
    await setFontLevel(0);
    expect(await getFontLevel()).toBe(0);
  });
});

describe('storage — UI preferences (tab top position)', () => {
  it('returns null for an unset tab top', async () => {
    expect(await getTabTop()).toBeNull();
  });

  it('round-trips a tab top position', async () => {
    await setTabTop(180);
    expect(await getTabTop()).toBe(180);
  });

  it('rounds fractional pixel values to integers', async () => {
    await setTabTop(217.6);
    expect(await getTabTop()).toBe(218);
  });
});

describe('storage — UI preferences (panel height)', () => {
  it('returns null for an unset panel height', async () => {
    expect(await getPanelHeight()).toBeNull();
  });

  it('round-trips a pixel height', async () => {
    await setPanelHeight(720);
    expect(await getPanelHeight()).toBe(720);
  });

  it('rounds fractional heights to integers', async () => {
    await setPanelHeight(640.4);
    expect(await getPanelHeight()).toBe(640);
  });

  it('stores 0 to represent "fill viewport"', async () => {
    await setPanelHeight(0);
    expect(await getPanelHeight()).toBe(0);
  });
});

describe('storage — UI preferences (panel side)', () => {
  it('returns null for an unset panel side', async () => {
    expect(await getPanelSide()).toBeNull();
  });

  it('round-trips left', async () => {
    await setPanelSideStored('left');
    expect(await getPanelSide()).toBe('left');
  });

  it('round-trips right', async () => {
    await setPanelSideStored('right');
    expect(await getPanelSide()).toBe('right');
  });
});

describe('storage — UI preferences (theme)', () => {
  it('returns null for an unset theme', async () => {
    expect(await getThemePreference()).toBeNull();
  });

  it('round-trips auto', async () => {
    await setThemePreference('auto');
    expect(await getThemePreference()).toBe('auto');
  });

  it('round-trips light', async () => {
    await setThemePreference('light');
    expect(await getThemePreference()).toBe('light');
  });

  it('round-trips dark', async () => {
    await setThemePreference('dark');
    expect(await getThemePreference()).toBe('dark');
  });
});
