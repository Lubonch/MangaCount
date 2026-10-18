import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitMessage, CHUNK_LIMIT, DISCORD_MESSAGE_LIMIT } from './discord-messages.js';

describe('services/discord-messages', () => {
  it('texto corto devuelve un solo bloque', () => {
    assert.deepEqual(splitMessage('hola'), ['hola']);
    assert.deepEqual(splitMessage(''), ['']);
  });

  it('reparte por líneas sin cortar ninguna y agrega el indicador', () => {
    const lines = Array.from(
      { length: 120 },
      (_, i) => `Serie ${i}: 1/10 (faltan 9) · Tankoubon · Panini`
    ).join('\n');
    const chunks = splitMessage(lines);
    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((c) => c.length <= DISCORD_MESSAGE_LIMIT));
    assert.ok(chunks.every((c) => /\(\d+\/\d+\)$/.test(c.trimEnd())));
    // No line was split.
    assert.ok(!chunks.some((c) => /\nSerie \d+: 1\/10 \(falta$/.test(c)));
    // All the content is present.
    const joined = chunks.join('\n');
    assert.ok(joined.includes('Serie 0:'));
    assert.ok(joined.includes('Serie 119:'));
  });

  it('parte una línea individual que supera el límite', () => {
    const chunks = splitMessage('x'.repeat(4500));
    assert.equal(chunks.length, 3);
    assert.ok(chunks.every((c) => c.length <= DISCORD_MESSAGE_LIMIT));
  });

  it('respeta un límite custom', () => {
    const chunks = splitMessage('a\nb\nc\nd', { limit: 3 });
    assert.ok(chunks.length > 1);
    assert.equal(CHUNK_LIMIT, 1900);
  });
});
