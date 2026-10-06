import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  profileList,
  entryImport,
  recommendationGet,
  isElectron,
} from './localAdapter.js';

describe('localAdapter', () => {
  const invoke = vi.fn();

  beforeEach(() => {
    invoke.mockReset();
    window.mangaCount = { invoke };
  });

  afterEach(() => {
    delete window.mangaCount;
    vi.unstubAllGlobals();
  });

  it('en Electron delega en window.mangaCount.invoke', async () => {
    expect(isElectron()).toBe(true);
    invoke.mockResolvedValue([{ id: 1 }]);
    await expect(profileList()).resolves.toEqual([{ id: 1 }]);
    expect(invoke).toHaveBeenCalledWith('profile:list');
    invoke.mockResolvedValue({ imported: 2 });
    await expect(entryImport(1, 'a\tb')).resolves.toEqual({ imported: 2 });
    expect(invoke).toHaveBeenCalledWith('entry:import', { profileId: 1, tsv: 'a\tb' });
  });

  it('recomendación pasa profileId y limit por IPC', async () => {
    invoke.mockResolvedValue({ items: [] });
    await recommendationGet(3, 5);
    expect(invoke).toHaveBeenCalledWith('recommendation:get', { profileId: 3, limit: 5 });
  });

  it('en navegador usa fetch como fallback', async () => {
    delete window.mangaCount;
    expect(isElectron()).toBe(false);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [{ id: 9 }] }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(profileList()).resolves.toEqual([{ id: 9 }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/profile', undefined);
  });

  it('propaga errores HTTP del fallback', async () => {
    delete window.mangaCount;
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    await expect(profileList()).rejects.toThrow('HTTP 500');
  });
});
