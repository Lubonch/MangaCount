import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test-utils';
import RecommendationModal from '../../components/RecommendationModal';

describe('Pages RecommendationModal', () => {
  it('renders local recommendations', () => {
    render(
      <RecommendationModal
        isOpen
        isLoading={false}
        error={null}
        recommendations={{
          provider: 'local',
          inferredCountry: 'Argentina',
          blockedByImportCount: 2,
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
    );

    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Country: Argentina')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 local picks. 2 import candidates were excluded.')).toBeInTheDocument();
    expect(screen.getByText('Pluto')).toBeInTheDocument();
  });

  it('closes when requested', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <RecommendationModal
        isOpen
        isLoading={false}
        error={null}
        recommendations={{ provider: 'local', inferredCountry: 'Argentina', items: [] }}
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Close Recommendations' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});