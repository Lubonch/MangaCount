import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferUserCountry,
  buildUserTasteProfile,
  recommendManga,
  normalizeTitle,
} from '../../../shared/recommendations/recommendationEngine.js';

const publisherCountries = {
  ivrea: 'Argentina',
  'ovni press': 'Argentina',
  norma: 'Spain',
  panini: null,
};

const catalog = [
  {
    id: 'monster',
    title: 'Monster',
    publisher: 'Ivrea',
    publisherCountry: 'Argentina',
    format: 'Kanzenban',
    demographic: 'Seinen',
    genres: ['Mystery', 'Thriller'],
    themes: ['Crime'],
    summary: 'A surgeon hunts a killer.',
    volumes: 9,
  },
  {
    id: 'pluto',
    title: 'Pluto',
    publisher: 'Ivrea',
    publisherCountry: 'Argentina',
    format: 'Kanzenban',
    demographic: 'Seinen',
    genres: ['Mystery', 'Science Fiction'],
    themes: ['Robots'],
    summary: 'A robot detective investigates murders.',
    volumes: 8,
  },
  {
    id: '20th',
    title: '20th Century Boys',
    publisher: 'Ivrea',
    publisherCountry: 'Argentina',
    format: 'Kanzenban',
    demographic: 'Seinen',
    genres: ['Mystery', 'Thriller'],
    themes: ['Conspiracy'],
    summary: 'Friends face a cult.',
    volumes: 11,
  },
  {
    id: 'homunculus',
    title: 'Homunculus',
    publisher: 'Ovni Press',
    publisherCountry: 'Argentina',
    format: 'Tankoubon',
    demographic: 'Seinen',
    genres: ['Drama'],
    themes: ['Identity'],
    summary: 'A drifter gains perception.',
    volumes: 15,
  },
  {
    id: 'vinland',
    title: 'Vinland Saga',
    publisher: 'Norma',
    publisherCountry: 'Spain',
    format: 'Tankoubon',
    demographic: 'Seinen',
    genres: ['Action'],
    themes: ['War'],
    summary: 'A warrior grows.',
    volumes: 13,
  },
];

describe('shared/countryInference', () => {
  it('sin entradas no infiere país y el breakdown queda vacío', () => {
    assert.deepEqual(inferUserCountry([], publisherCountries), {
      country: null,
      isConfident: false,
      breakdown: [],
    });
  });

  it('infiere por editorial contemplando todas las formas del campo', () => {
    const entries = [
      { quantity: 2, manga: { publisher: { name: 'Ivrea' } } }, // object
      { quantity: 1, manga: { publisher: 'Ivrea' } }, // string on manga
      { quantity: 1, publisher: 'Ivrea' }, // top-level
      { quantity: 1, manga: {} }, // no publisher → ''
      { quantity: 1, manga: { publisher: { name: 'Desconocida' } } }, // unmapped
    ];
    const result = inferUserCountry(entries, publisherCountries);
    assert.equal(result.country, 'Argentina');
    assert.equal(result.isConfident, true);
    assert.equal(result.breakdown[0].volumeCount, 4);
    assert.deepEqual(result.breakdown[0].publishers, ['ivrea']);
  });

  it('cantidad no numérica cuenta 1 y entrada nula cuenta 0', () => {
    const entries = [
      { quantity: 'x', manga: { publisher: { name: 'Ivrea' } } }, // NaN → 1
      null, // null country and owned 0
      { quantity: 0, manga: { publisher: { name: 'Ivrea' } } }, // owned ≤ 0 → continue
    ];
    const result = inferUserCountry(entries, publisherCountries);
    assert.equal(result.breakdown[0].volumeCount, 1);
    assert.equal(result.breakdown[0].seriesCount, 1);
  });

  it('ordena por volumen y luego por cantidad de series', () => {
    const porVolumen = inferUserCountry(
      [
        { quantity: 5, manga: { publisher: { name: 'Ivrea' } } },
        { quantity: 3, manga: { publisher: { name: 'Norma' } } },
      ],
      publisherCountries
    );
    assert.equal(porVolumen.breakdown[0].country, 'Argentina');

    const porSeries = inferUserCountry(
      [
        { quantity: 2, manga: { publisher: { name: 'Ivrea' } } },
        { quantity: 1, manga: { publisher: { name: 'Norma' } } },
        { quantity: 1, manga: { publisher: { name: 'Norma' } } },
      ],
      publisherCountries
    );
    assert.equal(porSeries.breakdown[0].country, 'Spain');
    assert.equal(porSeries.breakdown[0].seriesCount, 2);
  });

  it('empate total en volumen y series → país no confiable', () => {
    const result = inferUserCountry(
      [
        { quantity: 1, manga: { publisher: { name: 'Ivrea' } } },
        { quantity: 1, manga: { publisher: { name: 'Norma' } } },
      ],
      publisherCountries
    );
    assert.equal(result.country, null);
    assert.equal(result.isConfident, false);
    assert.equal(result.breakdown.length, 2);
  });
});

describe('shared/recommendationEngine: buildUserTasteProfile', () => {
  it('procesa variantes de entry, salta cantidad ≤ 0 y catálogo ausente', () => {
    const profile = buildUserTasteProfile(
      [
        { title: 'Solo titulo', quantity: 2 }, // top-level title
        { quantity: 'x', manga: { name: 'Nombre', publisher: 'Ivrea' } }, // non-finite quantity → 1
        { quantity: 0, manga: { name: 'Cero' } }, // skip
        null, // null entry
      ],
      []
    );
    assert.ok(profile.tokenWeights.solo > 0);
    assert.ok(profile.localPublisherWeights.ivrea > 0);
    assert.equal(profile.ownedTitles.has('cero'), false);
    assert.equal(profile.ownedTitles.has(normalizeTitle('Solo titulo')), true);
  });

  it('usa el catálogo y acumula peso por formato y demografía', () => {
    const profile = buildUserTasteProfile(
      [
        {
          quantity: 3,
          manga: { name: 'Monster', publisher: { name: 'Ivrea' }, format: { name: 'Omnibus' } },
        },
      ],
      catalog
    );
    assert.equal(profile.formatWeights.omnibus, 3);
    assert.equal(profile.demographicWeights.seinen, 3);
    assert.ok(profile.tokenWeights.mystery > 0);
    assert.ok(profile.tokenWeights.surgeon > 0);
  });

  it('acepta publisher y format como string y a nivel top-level', () => {
    const profile = buildUserTasteProfile(
      [
        { quantity: 1, title: 'A', publisher: 'Ivrea', format: 'Tankoubon' },
        { quantity: 1, manga: { name: 'B', publisher: 'Ivrea', format: 'Integral' } },
      ],
      []
    );
    assert.equal(profile.formatWeights.tankoubon, 1);
    assert.equal(profile.formatWeights.integral, 1);
    assert.equal(profile.localPublisherWeights.ivrea, 2);
  });
});

describe('shared/recommendationEngine: recommendManga', () => {
  it('sin datos devuelve el fallback local no confiable', () => {
    const result = recommendManga();
    assert.equal(result.provider, 'local');
    assert.equal(result.inferredCountry, null);
    assert.equal(result.isConfident, false);
    assert.deepEqual(result.items, []);
    assert.equal(result.limit, 10);
    assert.deepEqual(result.inference.breakdown, []);
  });

  it('no recomienda cuando el país no es inferible', () => {
    const result = recommendManga({
      entries: [{ quantity: 5, manga: { publisher: { name: 'Panini' } } }],
      catalog,
      publisherCountries,
    });
    assert.equal(result.isConfident, false);
    assert.deepEqual(result.items, []);
  });

  it('excluye lo poseído, bloquea importados y rankea locales', () => {
    const result = recommendManga({
      entries: [
        {
          quantity: 3,
          manga: { name: 'Monster', publisher: { name: 'Ivrea' }, format: { name: 'Kanzenban' } },
        },
      ],
      catalog,
      publisherCountries,
      limit: 2,
    });
    assert.equal(result.inferredCountry, 'Argentina');
    assert.ok(result.items.length > 0 && result.items.length <= 2);
    assert.ok(result.items.every((item) => item.publisherCountry === 'Argentina'));
    assert.ok(result.items.every((item) => item.title !== 'Monster'));
    assert.ok(result.blockedByImportCount > 0);
    assert.ok(result.items[0].reason.length > 0);
  });

  it('candidato sin tokens usa la razón por defecto y volumes null', () => {
    const result = recommendManga({
      entries: [{ quantity: 1, manga: { name: 'Base', publisher: { name: 'Ivrea' } } }],
      catalog: [
        {
          id: 'vacio',
          title: '',
          publisher: '',
          publisherCountry: 'Argentina',
          format: '',
          demographic: '',
          genres: [],
          themes: [],
          summary: '',
        },
      ],
      publisherCountries,
    });
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].reason, 'Matches your local collection profile');
    assert.equal(result.items[0].volumes, null);
  });

  it('desempata por título cuando el score empata', () => {
    const result = recommendManga({
      entries: [{ quantity: 1, manga: { name: 'Base', publisher: { name: 'Ivrea' } } }],
      catalog: [
        {
          id: 'z',
          title: 'Zeta',
          publisher: '',
          publisherCountry: 'Argentina',
          format: '',
          demographic: '',
          genres: [],
          themes: [],
          summary: '',
        },
        {
          id: 'a',
          title: 'Alfa',
          publisher: '',
          publisherCountry: 'Argentina',
          format: '',
          demographic: '',
          genres: [],
          themes: [],
          summary: '',
        },
      ],
      publisherCountries,
    });
    assert.deepEqual(
      result.items.map((item) => item.title),
      ['Alfa', 'Zeta']
    );
  });
});
