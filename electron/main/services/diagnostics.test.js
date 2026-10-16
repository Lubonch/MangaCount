import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tailLines, buildDiagnostics } from './diagnostics.js';

describe('services/diagnostics', () => {
  it('tailLines devuelve las últimas N líneas', () => {
    assert.equal(tailLines('a\nb\nc\nd', 2), 'c\nd');
    assert.equal(tailLines('', 5), '');
  });

  it('buildDiagnostics incluye versión/OS/locale y solo las últimas N líneas', () => {
    const log = Array.from({ length: 150 }, (_, i) => `linea ${i}`).join('\n');
    const out = buildDiagnostics({
      version: '1.0.9',
      platform: 'linux',
      arch: 'x64',
      locale: 'es-AR',
      logText: log,
      maxLines: 5,
      now: new Date('2026-01-01T00:00:00Z'),
    });
    assert.match(out, /MangaCount v1\.0\.9 · linux\/x64 · es-AR/);
    assert.match(out, /Fecha: 2026-01-01T00:00:00\.000Z/);
    assert.match(out, /linea 149/);
    assert.doesNotMatch(out, /linea 0\n/);
  });

  it('log vacío → (log vacío)', () => {
    const out = buildDiagnostics({ version: '1', platform: 'linux', arch: 'x64', locale: 'x', logText: '' });
    assert.match(out, /\(log vacío\)/);
  });
});
