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
})