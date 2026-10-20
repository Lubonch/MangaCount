import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTitle,
  titleTokens,
  titleSimilarity,
  findBestCandidate,
  detectDuplicateCandidates,
} from './duplicate-detection.js';

describe('services/duplicate-detection', () => {
  it('normaliza acentos, mayúsculas, puntuación y espacios', () => {
    assert.equal(normalizeTitle('  Nausicaä  of the  Valley!! '), 'nausicaa of the valley');
    assert.equal(normalizeTitle('K-On!'), 'k on');
    assert.equal(normalizeTitle('Steins;Gate'), 'steins gate');
    assert.equal(normalizeTitle('FullMetal & Alchemist'), 'fullmetal and alchemist');
  });

  it('extrae tokens significativos sin stop words', () => {
    assert.deepEqual(titleTokens('The Kamen Rider of Kuuga'), ['kamen', 'rider', 'kuuga']);
  });

  it('detecta coincidencia exacta normalizada', () => {
    assert.deepEqual(titleSimilarity('Nausicaä', 'Nausicaa'), { score: 1, reason: 'exact' });
  });

  it('detecta contención de tokens', () => {
    const result = titleSimilarity('Kuuga', 'Kamen Rider Kuuga');
    assert.equal(result.reason, 'containment');
    assert.ok(result.score >= 0.9);
  });

  it('detecta typos por similitud difusa', () => {
    const result = titleSimilarity('Berserkk', 'Berserk');
    assert.equal(result.reason, 'fuzzy');
    assert.ok(result.score >= 0.86);
  });

  it('no propone partes ni secuelas con números distintos', () => {
    assert.equal(titleSimilarity('Jojos Parte 1', 'Jojos Parte 2'), null);
    assert.equal(titleSimilarity('Another', 'Another 0'), null);
    assert.equal(titleSimilarity('Battle Royale', 'Battle Royale 2'), null);
    assert.equal(titleSimilarity('Chainsaw Man', 'Chainsaw Man 14 Alt'), null);
  });

  it('no propone títulos no relacionados', () => {
    assert.equal(titleSimilarity('Berserk', 'Vagabond'), null);
    assert.equal(titleSimilarity('', 'Berserk'), null);
  });

  it('elige el mejor candidato y desempata por longitud', () => {
    const result = findBestCandidate('Kuuga', [
      { title: 'Kamen Rider Kuuga' },
      { title: 'Kuuga' },
    ]);
    assert.equal(result.candidate.title, 'Kuuga');
    assert.equal(result.score, 1);
  });

  it('detecta candidatos existentes y del lote con metadatos', () => {
    const rows = [
      { mangaName: 'Kuuga', quantity: 5, totalVolumes: 10, pending: null, priority: false, formatName: 'B6', publisherName: 'Panini' },
      { mangaName: 'Kamen Rider Kuuga', quantity: 2, totalVolumes: 10, pending: null, priority: false, formatName: 'B6', publisherName: 'Panini' },
      { mangaName: 'Otro', quantity: 1, totalVolumes: 1, pending: null, priority: false, formatName: 'Unknown', publisherName: 'Unknown' },
    ];
    const mangas = [
      {
        id: 7,
        name: 'Kamen Rider Kuuga',
        volumes: 10,
        format: { name: 'B6' },
        publisher: { name: 'Panini' },
      },
    ];
    const entries = new Map([[7, { quantity: 4, pending: '5' }]]);

    const duplicates = detectDuplicateCandidates(rows, mangas, entries);
    assert.equal(duplicates.length, 2);
    assert.equal(duplicates[0].rowIndex, 0);
    assert.equal(duplicates[0].source, 'existing');
    assert.equal(duplicates[0].candidate.mangaId, 7);
    assert.equal(duplicates[0].candidate.entry.quantity, 4);
    assert.equal(duplicates[0].lineNumber, 2);
    assert.equal(duplicates[1].rowIndex, 1);
    assert.equal(duplicates[1].source, 'existing');
    assert.equal(duplicates[1].candidate.mangaId, 7);
  });

  it('detecta variantes internas del lote cuando no existen en la base', () => {
    const rows = [
      { mangaName: 'Kuuga', quantity: 5, totalVolumes: 10, pending: null, priority: false, formatName: 'B6', publisherName: 'Panini' },
      { mangaName: 'Kamen Rider Kuuga', quantity: 2, totalVolumes: 10, pending: null, priority: false, formatName: 'B6', publisherName: 'Panini' },
    ];

    const duplicates = detectDuplicateCandidates(rows, []);
    assert.equal(duplicates.length, 1);
    assert.equal(duplicates[0].rowIndex, 1);
    assert.equal(duplicates[0].source, 'batch');
    assert.equal(duplicates[0].candidate.rowIndex, 0);
    assert.equal(duplicates[0].lineNumber, 3);
  });
});
