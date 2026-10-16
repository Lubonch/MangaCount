import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, fetchLatestRelease, RELEASES_URL } from './updates.js';

describe('services/updates: compareVersions', () => {
  it('detecta versiones más nuevas', () => {
    assert.ok(compareVersions('1.0.8', '1.1.0') > 0);
    assert.ok(compareVersions('1.0.8', '2.0.0') > 0);
    assert.ok(compareVersions('1.2.0', '1.1.9') < 0);
    assert.equal(compareVersions('1.0.8', '1.0.8'), 0);
  });

  it('ignora el prefijo v y el pre-release', () => {
    assert.equal(compareVersions('v1.0.8', '1.0.8'), 0);
    assert.equal(compareVersions('1.0.8', '1.0.8-beta.1'), 0);
    assert.equal(compareVersions('1.0', '1.0.0'), 0);
  });
});

describe('services/updates: fetchLatestRelease', () => {
  it('parsea la última release (fetch fake)', async () => {
    const fetchImpl = async (url, opts) => {
      assert.equal(url, RELEASES_URL);
      assert.equal(opts.headers['User-Agent'], 'MangaCount');
      return {
        ok: true,
        json: async () => ({
          tag_name: 'v1.1.0',
          html_url: 'https://github.com/Lubonch/MangaCount/releases/tag/v1.1.0',
          name: '1.1.0',
          published_at: '2026-01-01T00:00:00Z',
        }),
      };
    };
    const release = await fetchLatestRelease({ fetchImpl });
    assert.equal(release.latest, '1.1.0');
    assert.match(release.url, /releases\/tag/);
    assert.equal(release.publishedAt, '2026-01-01T00:00:00Z');
  });

  it('tira si la API responde con error', async () => {
    const fetchImpl = async () => ({ ok: false, status: 403 });
    await assert.rejects(() => fetchLatestRelease({ fetchImpl }), /GitHub 403/);
  });
});
