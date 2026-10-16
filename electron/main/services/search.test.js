import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findEntries,
  suggestTitles,
  entryStatus,
  pendingEntries,
  pendingSummary,
  searchResult,
} from './search.js';

const entry = (name, quantity, volumes, priority = false) => ({
  id: name,
  quantity,
  priority,
  manga: { name, volumes },
});

const collection = () => [
  entry('Berserk', 41, 41),
  entry('Berserk Max', 3, 20, true),
  entry('Monster', 5, 9),
  entry('Vagabond', 0, 0),
];

describe('services/search: buscar', () => {
  it('encuentra por subcadena (case-insensitive)', () => {
    assert.equal(findEntries(collection(), 'berserk').length, 2);
    assert.equal(findEntries(collection(), 'BER').length, 2);
    assert.equal(findEntries(collection(), '  ').length, 0);
  });

  it('sugiere títulos por palabra cuando no hay coincidencia', () => {
    const result = searchResult(collection(), 'berserk vagabond');
    assert.equal(result.results.length, 0);
    // 'berserk' no matchea ninguno como subcadena completa... sí: 'berserk vagabond' no está contenido
    assert.ok(result.suggestions.includes('Berserk'));
  });

  it('devuelve coincidencias sin sugerencias', () => {
    const result = searchResult(collection(), 'monster');
    assert.equal(result.results.length, 1);
    assert.deepEqual(result.suggestions, []);
  });

  it('suggestTitles ignora palabras cortas', () => {
    assert.deepEqual(suggestTitles(collection(), 'de la'), []);
  });
});

describe('services/search: estado', () => {
  it('deriva completo/en curso/desconocido', () => {
    assert.deepEqual(entryStatus(entry('a', 41, 41)), { quantity: 41, total: 41, pending: 0, complete: true });
    assert.deepEqual(entryStatus(entry('b', 3, 20)), { quantity: 3, total: 20, pending: 17, complete: false });
    assert.deepEqual(entryStatus(entry('c', 2, 0)), { quantity: 2, total: 0, pending: null, complete: false });
  });
});

describe('services/search: pendientes', () => {
  it('filtra en curso y ordena prioridad > mayor pendiente', () => {
    const pending = pendingEntries(collection()).map((e) => e.manga.name);
    assert.deepEqual(pending, ['Berserk Max', 'Monster']);
  });

  it('resume count y total pendiente', () => {
    const summary = pendingSummary(collection());
    assert.equal(summary.count, 2);
    assert.equal(summary.totalPending, 17 + 4);
  });
});
