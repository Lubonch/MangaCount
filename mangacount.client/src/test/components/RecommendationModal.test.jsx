import { describe, expect, it, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '../test-utils'

vi.mock('../../api/localAdapter.js', () => ({
  recommendationDismiss: vi.fn(),
  recommendationOwn: vi.fn(),
  recommendationGet: vi.fn(),
  mangaList: vi.fn(),
}))

import * as api from '../../api/localAdapter.js'
import RecommendationModal from '../../components/RecommendationModal'

describe('RecommendationModal', () => {
  it('renders recommendations, provider, and inferred country', () => {
    render(
      <RecommendationModal
        isOpen
        isLoading={false}
        error={null}
        recommendations={{
          provider: 'local',
          inferredCountry: 'Argentina',
          blockedByImportCount: 3,
          limit: 10,
          items: [
            {
              id: 'pluto',
              title: 'Pluto',
              publisher: 'Ivrea',
              publisherCountry: 'Argentina',
              format: 'Kanzenban',
              reason: 'Matches your collection through Mystery, Robots',
            },
          ],
        }}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Recommendations')).toBeInTheDocument()
    expect(screen.getByText('Country: Argentina')).toBeInTheDocument()
    expect(screen.getByText('Provider: local')).toBeInTheDocument()
    expect(screen.getByText('Showing 1 local picks. 3 import candidates were excluded.')).toBeInTheDocument()
    expect(screen.getByText('Pluto')).toBeInTheDocument()
    expect(screen.getByText('Matches your collection through Mystery, Robots')).toBeInTheDocument()
  })

  it('renders a loading state while recommendations are being requested', () => {
    render(
      <RecommendationModal
        isOpen
        isLoading
        error={null}
        recommendations={null}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Building your recommendations...')).toBeInTheDocument()
  })

  it('closes when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <RecommendationModal
        isOpen
        isLoading={false}
        error={null}
        recommendations={{
          provider: 'local',
          inferredCountry: 'Argentina',
          items: [],
        }}
        onClose={onClose}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Close Recommendations' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <RecommendationModal isOpen={false} recommendations={null} onClose={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the error state when a recommendation error is provided', () => {
    render(
      <RecommendationModal
        isOpen
        isLoading={false}
        error="Recommendation service unavailable"
        recommendations={null}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Recommendation service unavailable')).toBeInTheDocument()
    expect(screen.queryByText('Building your recommendations...')).not.toBeInTheDocument()
  })

  it('uses the singular import phrase when a single candidate was excluded', () => {
    render(
      <RecommendationModal
        isOpen
        isLoading={false}
        error={null}
        recommendations={{
          provider: 'local',
          inferredCountry: 'Argentina',
          blockedByImportCount: 1,
          limit: 10,
          items: [
            {
              id: 'a',
              title: 'A',
              publisher: 'Ivrea',
              publisherCountry: 'Argentina',
            },
          ],
        }}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Showing 1 local picks. 1 import candidate was excluded.')).toBeInTheDocument()
  })

  it('renders an item without a format or reason', () => {
    render(
      <RecommendationModal
        isOpen
        isLoading={false}
        error={null}
        recommendations={{
          provider: 'local',
          inferredCountry: 'Argentina',
          items: [
            {
              id: 'b',
              title: 'Solo Title',
              publisher: 'Panini',
              publisherCountry: 'Mexico',
            },
          ],
        }}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Panini · Mexico')).toBeInTheDocument()
    expect(screen.queryByText(/Matches your collection/)).not.toBeInTheDocument()
  })

  it('closes when the overlay is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    const { container } = render(
      <RecommendationModal
        isOpen
        isLoading={false}
        error={null}
        recommendations={{ provider: 'local', inferredCountry: 'Argentina', items: [] }}
        onClose={onClose}
      />
    )

    await user.click(container.querySelector('.recommendation-overlay'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

const anilistItem = (overrides = {}) => ({
  externalId: '1',
  title: 'Monster',
  coverUrl: 'https://img/m.jpg',
  reason: 'Alfa',
  ...overrides,
})

const openAnilist = (items, overrides = {}) =>
  render(
    <RecommendationModal
      isOpen
      profileId={7}
      isLoading={false}
      error={null}
      recommendations={{ provider: 'anilist', inferredCountry: null, limit: 10, items, ...overrides }}
      onClose={vi.fn()}
    />
  )

describe('RecommendationModal · feedback AniList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('compone la razón "Porque tenés {semilla}" para AniList', () => {
    openAnilist([anilistItem()])
    expect(screen.getByText('Porque tenés Alfa')).toBeInTheDocument()
  })

  it('"No viable" descarta y pide el relleno (limit 1)', async () => {
    const user = userEvent.setup()
    api.recommendationDismiss.mockResolvedValue({ ok: true })
    api.recommendationGet.mockResolvedValue({
      items: [anilistItem({ externalId: '2', title: 'Nueva' })],
      exhausted: false,
    })
    openAnilist([anilistItem()])

    await user.click(screen.getByText('No viable'))

    await waitFor(() =>
      expect(api.recommendationDismiss).toHaveBeenCalledWith({
        profileId: 7,
        provider: 'anilist',
        externalId: '1',
      })
    )
    expect(api.recommendationGet).toHaveBeenCalledWith(7, 1)
    expect(await screen.findByText('Nueva')).toBeInTheDocument()
    expect(screen.queryByText('Monster')).not.toBeInTheDocument()
  })

  it('↻ pide un lote nuevo de `limit`', async () => {
    const user = userEvent.setup()
    api.recommendationGet.mockResolvedValue({ items: [anilistItem({ title: 'Otra' })], exhausted: false })
    openAnilist([anilistItem()])

    await user.click(screen.getByLabelText('Refrescar recomendaciones'))

    await waitFor(() => expect(api.recommendationGet).toHaveBeenCalledWith(7, 10))
    expect(await screen.findByText('Otra')).toBeInTheDocument()
  })

  it('"Ya lo tengo" vincula a un manga existente de la colección', async () => {
    const user = userEvent.setup()
    api.mangaList.mockResolvedValue([{ id: 5, name: 'Monster' }])
    api.recommendationOwn.mockResolvedValue({ id: 5 })
    api.recommendationGet.mockResolvedValue({ items: [], exhausted: true })
    openAnilist([anilistItem()])

    await user.click(screen.getByText('Ya lo tengo'))
    await user.click(await screen.findByRole('button', { name: 'Monster' }))

    await waitFor(() =>
      expect(api.recommendationOwn).toHaveBeenCalledWith({
        profileId: 7,
        provider: 'anilist',
        externalId: '1',
        mangaId: 5,
      })
    )
  })

  it('"Ya lo tengo" permite crear el manga con el nombre del usuario', async () => {
    const user = userEvent.setup()
    api.mangaList.mockResolvedValue([])
    api.recommendationOwn.mockResolvedValue({ id: 9 })
    api.recommendationGet.mockResolvedValue({ items: [], exhausted: true })
    openAnilist([anilistItem()])

    await user.click(screen.getByText('Ya lo tengo'))
    await user.type(screen.getByLabelText('Buscar en tu colección…'), 'Mi nombre')
    await user.click(screen.getByText('Crearlo con este nombre'))

    await waitFor(() =>
      expect(api.recommendationOwn).toHaveBeenCalledWith({
        profileId: 7,
        provider: 'anilist',
        externalId: '1',
        title: 'Mi nombre',
      })
    )
  })

  it('estado agotado: mensaje y ↻ deshabilitado', () => {
    openAnilist([anilistItem()], { exhausted: true })
    expect(screen.getByText('No hay más por ahora.')).toBeInTheDocument()
    expect(screen.getByLabelText('Refrescar recomendaciones')).toBeDisabled()
  })

  it('muestra un error si falla el descarte', async () => {
    const user = userEvent.setup()
    api.recommendationDismiss.mockRejectedValue(new Error('boom'))
    openAnilist([anilistItem()])

    await user.click(screen.getByText('No viable'))

    expect(await screen.findByText('No se pudo descartar. Probá de nuevo.')).toBeInTheDocument()
  })

  it('no muestra acciones para tarjetas locales sin externalId', () => {
    render(
      <RecommendationModal
        isOpen
        profileId={7}
        recommendations={{ provider: 'local', items: [{ id: 'x', title: 'Local', reason: 'r' }] }}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByText('No viable')).not.toBeInTheDocument()
    expect(screen.queryByText('Ya lo tengo')).not.toBeInTheDocument()
  })
})