import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '../test-utils'
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