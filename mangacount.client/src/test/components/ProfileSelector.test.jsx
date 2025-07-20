import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'
import ProfileSelector from '../../components/ProfileSelector'
import { createMockProfile, mockSuccessfulFetch, mockFailedFetch } from '../test-utils'

describe('ProfileSelector Component', () => {
  const mockOnProfileSelect = vi.fn()
  const mockOnBackToMain = vi.fn()

  const defaultProps = {
    onProfileSelect: mockOnProfileSelect,
    selectedProfileId: null,
    isChangingProfile: false,
    showBackButton: false,
    onBackToMain: mockOnBackToMain,
    lastSelectedProfile: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<ProfileSelector {...defaultProps} />)
    expect(screen.getByText('Loading profiles...')).toBeInTheDocument()
  })

  it('renders profiles when loaded', async () => {
    const mockProfiles = [
      createMockProfile({ id: 1, name: 'Alice' }),
      createMockProfile({ id: 2, name: 'Bob' })
    ]

    mockSuccessfulFetch(mockProfiles)

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    expect(screen.getByText('Choose whose manga collection to explore')).toBeInTheDocument()
  })

  it('handles profile selection', async () => {
    const user = userEvent.setup()
    const mockProfiles = [createMockProfile({ id: 1, name: 'Alice' })]

    mockSuccessfulFetch(mockProfiles)

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Alice'))

    expect(mockOnProfileSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Alice' })
    )
  })

  it('shows back button when changing profiles', async () => {
    const lastProfile = createMockProfile({ id: 1, name: 'Previous Profile' })
    const mockProfiles = [createMockProfile({ id: 2, name: 'Current Profile' })]

    mockSuccessfulFetch(mockProfiles)

    render(
      <ProfileSelector 
        {...defaultProps} 
        isChangingProfile={true}
        showBackButton={true}
        lastSelectedProfile={lastProfile}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("← Back to Previous Profile's Collection")).toBeInTheDocument()
    })
  })

  it('handles back to main action', async () => {
    const user = userEvent.setup()
    const lastProfile = createMockProfile({ id: 1, name: 'Previous Profile' })
    const mockProfiles = [createMockProfile({ id: 2, name: 'Current Profile' })]

    mockSuccessfulFetch(mockProfiles)

    render(
      <ProfileSelector 
        {...defaultProps} 
        isChangingProfile={true}
        showBackButton={true}
        lastSelectedProfile={lastProfile}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("← Back to Previous Profile's Collection")).toBeInTheDocument()
    })

    await user.click(screen.getByText("← Back to Previous Profile's Collection"))

    expect(mockOnBackToMain).toHaveBeenCalled()
  })

  it('shows add new profile option', async () => {
    const mockProfiles = [createMockProfile()]

    mockSuccessfulFetch(mockProfiles)

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Add New')).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    mockFailedFetch('Failed to fetch profiles')

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('⚠️ Error Loading Profiles')).toBeInTheDocument()
      expect(screen.getByText('Failed to load profiles')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('handles profile deletion', async () => {
    const user = userEvent.setup()
    window.confirm = vi.fn(() => true)

    const mockProfiles = [
      createMockProfile({ id: 1, name: 'Profile 1' }),
      createMockProfile({ id: 2, name: 'Profile 2' })
    ]

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Profile deleted' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockProfiles[0]], // Return remaining profiles
      })

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Profile 1')).toBeInTheDocument()
    })

    // Find and click delete button for Profile 2
    const deleteButtons = screen.getAllByTitle('Delete profile')
    await user.click(deleteButtons[1]) // Second profile's delete button

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this profile? This action cannot be undone.'
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/2', {
        method: 'DELETE'
      })
    })
  })

  it('prevents deletion of last profile', async () => {
    const user = userEvent.setup()
    window.alert = vi.fn()

    const mockProfiles = [createMockProfile({ id: 1, name: 'Only Profile' })]

    mockSuccessfulFetch(mockProfiles)

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Only Profile')).toBeInTheDocument()
    })

    // Should not show delete button for the only profile
    expect(screen.queryByTitle('Delete profile')).not.toBeInTheDocument()
  })

  it('shows selected profile with proper styling', async () => {
    const mockProfiles = [
      createMockProfile({ id: 1, name: 'Selected Profile' }),
      createMockProfile({ id: 2, name: 'Other Profile' })
    ]

    mockSuccessfulFetch(mockProfiles)

    render(<ProfileSelector {...defaultProps} selectedProfileId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Selected Profile')).toBeInTheDocument()
    })

    const selectedProfile = screen.getByText('Selected Profile').closest('.profile-circle')
    expect(selectedProfile).toHaveClass('selected')
  })
})