import { describe, expect, it } from 'vitest'
import {
  inferUserCountry,
  recommendManga,
} from '@shared/recommendations/recommendationEngine.js'

const publisherCountries = {
  ivrea: 'Argentina',
  'ovni press': 'Argentina',
  'norma editorial': 'Spain',
  panini: null,
}

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
    id: 'homunculus',
    title: 'Homunculus',
    publisher: 'Ovni Press',
    publisherCountry: 'Argentina',
    format: 'Tankoubon',
    demographic: 'Seinen',
    genres: ['Psychological', 'Drama'],
    themes: ['Identity'],
    summary: 'A drifter gains terrifying perception.',
  },
  {
    id: 'vinland-saga',
    title: 'Vinland Saga',
    publisher: 'Norma Editorial',
    publisherCountry: 'Spain',
    format: 'Tankoubon',
    demographic: 'Seinen',
    genres: ['Historical', 'Action'],
    themes: ['War'],
    summary: 'A warrior grows through violence.',
  },
]

function createEntry({ title, publisher, quantity = 1, format = 'Tankoubon' }) {
  return {
    id: Math.random(),
    quantity,
    manga: {
      id: Math.random(),
      name: title,
      format: { id: 1, name: format },
      publisher: { id: 1, name: publisher },
    },
  }
}

describe('recommendationEngine', () => {
  it('infers the user country from the publisher with the most owned volumes', () => {
    const entries = [
      createEntry({ title: 'Monster', publisher: 'Ivrea', quantity: 10 }),
      createEntry({ title: 'Homunculus', publisher: 'Ovni Press', quantity: 4 }),
      createEntry({ title: 'Vinland Saga', publisher: 'Norma Editorial', quantity: 3 }),
    ]

    const result = inferUserCountry(entries, publisherCountries)

    expect(result.country).toBe('Argentina')
    expect(result.isConfident).toBe(true)
    expect(result.breakdown[0]).toMatchObject({ country: 'Argentina', volumeCount: 14 })
  })

  it('does not recommend titles the user already owns after title normalization', () => {
    const entries = [
      createEntry({ title: 'Monster (Perfect Edition)', publisher: 'Ivrea', quantity: 9 }),
    ]

    const result = recommendManga({
      entries,
      catalog,
      publisherCountries,
      limit: 10,
    })

    expect(result.items.map(item => item.title)).not.toContain('Monster')
  })

  it('blocks imported titles from other countries before ranking', () => {
    const entries = [
      createEntry({ title: 'Monster', publisher: 'Ivrea', quantity: 9 }),
    ]

    const result = recommendManga({
      entries,
      catalog,
      publisherCountries,
      limit: 10,
    })

    expect(result.inferredCountry).toBe('Argentina')
    expect(result.items.every(item => item.publisherCountry === 'Argentina')).toBe(true)
    expect(result.items.map(item => item.title)).not.toContain('Vinland Saga')
  })

  it('returns fewer than ten results instead of filling with imports', () => {
    const entries = [
      createEntry({ title: 'Monster', publisher: 'Ivrea', quantity: 9 }),
      createEntry({ title: 'Homunculus', publisher: 'Ovni Press', quantity: 15 }),
    ]

    const result = recommendManga({
      entries,
      catalog,
      publisherCountries,
      limit: 10,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Pluto')
    expect(result.availableCount).toBe(1)
    expect(result.blockedByImportCount).toBeGreaterThan(0)
  })

  it('does not infer a country from ambiguous publishers alone', () => {
    const entries = [
      createEntry({ title: 'Random A', publisher: 'Panini', quantity: 20 }),
      createEntry({ title: 'Random B', publisher: 'Panini', quantity: 15 }),
    ]

    const result = inferUserCountry(entries, publisherCountries)

    expect(result.country).toBeNull()
    expect(result.isConfident).toBe(false)
  })

  it('ignores zero-quantity entries when deciding ownership and taste', () => {
    const entries = [
      createEntry({ title: 'Monster', publisher: 'Ivrea', quantity: 0, format: 'Kanzenban' }),
      createEntry({ title: 'Homunculus', publisher: 'Ovni Press', quantity: 15 }),
    ]

    const result = recommendManga({
      entries,
      catalog,
      publisherCountries,
      limit: 10,
    })

    expect(result.inferredCountry).toBe('Argentina')
    expect(result.items.map(item => item.title)).toContain('Monster')
  })
})