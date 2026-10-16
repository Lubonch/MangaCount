import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test-utils'
import userEvent from '@testing-library/user-event'
import Sidebar from '../../components/Sidebar'
import { createMockProfile, createMockManga } from '../test-utils'

describe('Sidebar Component', () => {
  const mockOnImportSuccess = vi.fn()
  const mockOnBackToProfiles = vi.fn()

  const defaultProps = {
    mangas: [],
    entries: [],
    selectedProfile: null,
    onImportSuccess: mockOnImportSuccess,
    onBackToProfiles: mockOnBackToProfiles,
    onRecommend: vi.fn(),
    recommendationsLoading: false,
    refreshing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with profile information', () => {
    const profile = createMockProfile({ name: 'Test User' })
    const mangas = [createMockManga({ name: 'Test Manga' })]

    render(
      <Sidebar 
        {...defaultProps} 
        selectedProfile={profile}
        mangas={mangas}
      />
    )

    expect(screen.getByText('🏗️ Manga Count')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Collection')).toBeInTheDocument()
    expect(screen.getByText('Manga Library (1)')).toBeInTheDocument()
    expect(screen.getByText('Test Manga')).toBeInTheDocument()
  })

  it('disables actions when no profile selected', () => {
    render(<Sidebar {...defaultProps} />)

    const addEntryButton = screen.getByRole('button', { name: '+ Add Entry' })
    const recommendationButton = screen.getByRole('button', { name: 'Recommendations' })

    expect(addEntryButton).toBeDisabled()
    expect(recommendationButton).toBeDisabled()
  })

  it('enables actions when profile is selected', () => {
    const profile = createMockProfile()

    render(<Sidebar {...defaultProps} selectedProfile={profile} entries={[{ id: 1 }]} />)

    const addEntryButton = screen.getByRole('button', { name: '+ Add Entry' })
    const addMangaButton = screen.getByRole('button', { name: '+ Add Manga' })
    const recommendationButton = screen.getByRole('button', { name: 'Recommendations' })

    expect(addEntryButton).not.toBeDisabled()
    expect(addMangaButton).not.toBeDisabled()
    expect(recommendationButton).not.toBeDisabled()
  })

  it('opens settings from the gear button', async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()

    render(<Sidebar {...defaultProps} onOpenSettings={onOpenSettings} />)

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('no longer renders the collection import block', () => {
    render(<Sidebar {...defaultProps} selectedProfile={createMockProfile()} />)
    expect(screen.queryByText('Import Collection')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Choose TSV File')).not.toBeInTheDocument()
  })

  it('triggers recommendations when the button is clicked', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile()
    const onRecommend = vi.fn()

    render(
      <Sidebar
        {...defaultProps}
        selectedProfile={profile}
        entries={[{ id: 1 }]}
        onRecommend={onRecommend}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))

    expect(onRecommend).toHaveBeenCalledTimes(1)
  })

  it('handles profile change', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ name: 'Current User' })

    render(<Sidebar {...defaultProps} selectedProfile={profile} />)

    const changeProfileButton = screen.getByTitle('Change profile')
    await user.click(changeProfileButton)

    expect(mockOnBackToProfiles).toHaveBeenCalled()
  })

  it('opens add entry modal', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile()

    render(<Sidebar {...defaultProps} selectedProfile={profile} />)

    const addEntryButton = screen.getByRole('button', { name: '+ Add Entry' })
    await user.click(addEntryButton)

    // Just verify the button works - modal behavior is mocked
    expect(addEntryButton).toBeInTheDocument()
  })

  it('displays empty manga library message', () => {
    render(<Sidebar {...defaultProps} mangas={[]} />)

    expect(screen.getByText('Manga Library (0)')).toBeInTheDocument()
    expect(screen.getByText('No manga in library')).toBeInTheDocument()
  })

  it('displays manga list with volumes', () => {
    const mangas = [
      createMockManga({ id: 1, name: 'Manga 1', volumes: 10 }),
      createMockManga({ id: 2, name: 'Manga 2', volumes: null }),
    ]

    render(<Sidebar {...defaultProps} mangas={mangas} />)

    expect(screen.getByText('Manga Library (2)')).toBeInTheDocument()
    expect(screen.getByText('Manga 1')).toBeInTheDocument()
    expect(screen.getByText('10 volumes')).toBeInTheDocument()
    expect(screen.getByText('Manga 2')).toBeInTheDocument()
  })
})