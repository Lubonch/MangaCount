import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test-utils'
import userEvent from '@testing-library/user-event'
import ProfileSelector from '../../components/ProfileSelector'
import { createMockProfile, mockSuccessfulFetch, mockFailedFetch } from '../test-utils'

vi.mock('../../components/AddProfileModal', () => ({
  default: ({ isOpen, onClose, onSuccess }) =>
    isOpen ? (
      <div>
        <button onClick={onSuccess}>mock-profile-success</button>
        <button onClick={onClose}>mock-profile-close</button>
      </div>
    ) : null,
}))

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

  it('shows error when the profiles API responds not-ok', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('⚠️ Error Loading Profiles')).toBeInTheDocument()
      expect(screen.getByText('Failed to load profiles')).toBeInTheDocument()
    })
  })

  it('retries loading profiles from the error state', async () => {
    const user = userEvent.setup()

    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('⚠️ Error Loading Profiles')).toBeInTheDocument())

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [createMockProfile({ id: 1, name: 'Retry Profile' })],
    })

    await user.click(screen.getByRole('button', { name: 'Try Again' }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
  })

  it('alerts when deleting a profile fails with a non-ok response', async () => {
    const user = userEvent.setup()
    window.confirm = vi.fn(() => true)
    window.alert = vi.fn()

    const mockProfiles = [
      createMockProfile({ id: 1, name: 'Profile 1' }),
      createMockProfile({ id: 2, name: 'Profile 2' }),
    ]

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfiles })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('Profile 1')).toBeInTheDocument())

    await user.click(screen.getAllByTitle('Delete profile')[1])

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to delete profile'))
  })

  it('alerts when deleting a profile throws', async () => {
    const user = userEvent.setup()
    window.confirm = vi.fn(() => true)
    window.alert = vi.fn()

    const mockProfiles = [
      createMockProfile({ id: 1, name: 'Profile 1' }),
      createMockProfile({ id: 2, name: 'Profile 2' }),
    ]

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfiles })
      .mockRejectedValueOnce(new Error('network'))

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('Profile 1')).toBeInTheDocument())

    await user.click(screen.getAllByTitle('Delete profile')[1])

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error deleting profile'))
  })

  it('does not delete when the confirmation is rejected', async () => {
    const user = userEvent.setup()
    window.confirm = vi.fn(() => false)

    const mockProfiles = [
      createMockProfile({ id: 1, name: 'Profile 1' }),
      createMockProfile({ id: 2, name: 'Profile 2' }),
    ]

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockProfiles })

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('Profile 1')).toBeInTheDocument())

    await user.click(screen.getAllByTitle('Delete profile')[1])

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
  })

  it('resolves the different profile picture formats', async () => {
    const mockProfiles = [
      createMockProfile({ id: 1, name: 'HttpPic', profilePicture: 'http://cdn.example/x.jpg' }),
      createMockProfile({ id: 2, name: 'ProtoPic', profilePicture: 'mangacount://covers/x.jpg' }),
      createMockProfile({ id: 3, name: 'RelPic', profilePicture: '/uploads/x.jpg' }),
      createMockProfile({ id: 4, name: 'PlainPic', profilePicture: 'plain.jpg' }),
      createMockProfile({ id: 5, name: 'NoPic', profilePicture: null }),
    ]

    mockSuccessfulFetch(mockProfiles)

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('HttpPic')).toBeInTheDocument())

    expect(screen.getByAltText('HttpPic')).toHaveAttribute('src', 'http://cdn.example/x.jpg')
    expect(screen.getByAltText('ProtoPic')).toHaveAttribute('src', 'mangacount://covers/x.jpg')
    expect(screen.getByAltText('RelPic')).toHaveAttribute('src', '/uploads/x.jpg')
    expect(screen.getByAltText('PlainPic')).toHaveAttribute('src', '/profiles/plain.jpg')
    expect(screen.queryByAltText('NoPic')).not.toBeInTheDocument()
    expect(screen.getByText(/NoPic: No image/)).toBeInTheDocument()
  })

  it('hides the image when it fails to load', async () => {
    mockSuccessfulFetch([createMockProfile({ id: 1, name: 'Broken' })])

    render(<ProfileSelector {...defaultProps} />)

    const img = await screen.findByAltText('Broken')
    fireEvent.error(img)

    expect(img.style.display).toBe('none')
  })

  it('hides the placeholder when the image loads', async () => {
    mockSuccessfulFetch([createMockProfile({ id: 1, name: 'Loaded' })])

    render(<ProfileSelector {...defaultProps} />)

    const img = await screen.findByAltText('Loaded')
    fireEvent.load(img)

    expect(img.previousElementSibling.style.opacity).toBe('0')
  })

  it('handles an image load without a placeholder sibling', async () => {
    mockSuccessfulFetch([createMockProfile({ id: 1, name: 'NoSibling' })])

    render(<ProfileSelector {...defaultProps} />)

    const img = await screen.findByAltText('NoSibling')
    img.previousElementSibling.remove()
    fireEvent.load(img)

    expect(screen.getByAltText('NoSibling')).toBeInTheDocument()
  })

  it('reloads and closes when a new profile is created', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [createMockProfile({ id: 1, name: 'Alice' })],
    })

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    await user.click(screen.getByText('Add New'))
    await user.click(await screen.findByText('mock-profile-success'))

    await waitFor(() => expect(screen.queryByText('mock-profile-success')).not.toBeInTheDocument())
  })

  it('closes the add profile modal', async () => {
    const user = userEvent.setup()
    mockSuccessfulFetch([createMockProfile({ id: 1, name: 'Alice' })])

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    await user.click(screen.getByText('Add New'))
    await user.click(await screen.findByText('mock-profile-close'))

    await waitFor(() => expect(screen.queryByText('mock-profile-close')).not.toBeInTheDocument())
  })

  it('opens the editor and reloads when the profile is updated', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        createMockProfile({ id: 1, name: 'Alice' }),
        createMockProfile({ id: 2, name: 'Bob' }),
      ],
    })

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    await user.click(screen.getAllByTitle('Edit profile')[0])
    await user.click(await screen.findByText('mock-profile-success'))

    await waitFor(() => expect(screen.queryByText('mock-profile-success')).not.toBeInTheDocument())
  })

  it('closes the edit profile modal', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        createMockProfile({ id: 1, name: 'Alice' }),
        createMockProfile({ id: 2, name: 'Bob' }),
      ],
    })

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    await user.click(screen.getAllByTitle('Edit profile')[0])
    await user.click(await screen.findByText('mock-profile-close'))

    await waitFor(() => expect(screen.queryByText('mock-profile-close')).not.toBeInTheDocument())
  })

  it('selects a profile when its avatar is clicked', async () => {
    const user = userEvent.setup()
    mockSuccessfulFetch([createMockProfile({ id: 1, name: 'Alice' })])

    render(<ProfileSelector {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    const avatar = screen.getByText('Alice').closest('.profile-circle').querySelector('.profile-circle-avatar')
    await user.click(avatar)

    expect(mockOnProfileSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })
})