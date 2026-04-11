import { describe, expect, it } from 'vitest';
import { recommendManga } from '@shared/recommendations/recommendationEngine.js';

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
  },
  {
    id: 'vinland-saga',
    title: 'Vinland Saga',
    publisher: 'Norma Editorial',
    publisherCountry: 'Spain',
    format: 'Tankoubon',
    demographic: 'Seinen',
    genres: ['Historical'],
    themes: ['War'],
    summary: 'A warrior grows through violence.',
  },
];

const publisherCountries = {
  ivrea: 'Argentina',
  'norma editorial': 'Spain',
};

describe('Pages shared recommendation engine', () => {
  it('returns only local-market unseen titles', () => {
    const result = recommendManga({
      entries: [
        {
          id: 1,
          quantity: 9,
          manga: {
            name: 'Monster',
            publisher: { name: 'Ivrea' },
            format: { name: 'Kanzenban' },
          },
        },
      ],
      catalog,
      publisherCountries,
      limit: 10,
    });

    expect(result.inferredCountry).toBe('Argentina');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Pluto');
  });
});