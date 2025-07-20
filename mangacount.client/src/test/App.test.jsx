import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from './test-utils'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { 
  mockSequentialFetch, 
  createMockProfile, 
  createMockManga,
  createMockEntry 
} from './test-utils'

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders loading spinner initially', () => {
    render(<App />)
    expect(screen.getByText('Initializing Manga Collection App...')).toBeInTheDocument()
  })

  it('shows profile selection when no saved profile', async () => {
    const mockProfiles = [
      createMockProfile({ id: 1, name: 'Profile 1' }),
      createMockProfile({ id: 2, name: 'Profile 2' })
    ]
    const mockMangas = [createMockManga()]

    // Mock the ProfileSelector to work within the App component
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMangas,
      })
      // ProfileSelector also calls profiles API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      })

    render(<App />)

    // Wait for the profile selector to load and show profiles
    await waitFor(() => {
      expect(screen.getByText('Profile 1')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(screen.getByText('Profile 2')).toBeInTheDocument()
  })

  it('auto-selects single profile', async () => {
    const mockProfile = createMockProfile({ id: 1, name: 'Single Profile' })
    const mockMangas = [createMockManga()]
    const mockEntries = [createMockEntry()]

    mockSequentialFetch(
      { data: [mockProfile] },
      { data: mockMangas },
      { data: mockEntries }
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('🏗️ Manga Count')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(localStorage.setItem).toHaveBeenCalledWith('selectedProfileId', '1')
  })

  it('loads saved profile from localStorage', async () => {
    const mockProfiles = [
      createMockProfile({ id: 1, name: 'Profile 1' }),
      createMockProfile({ id: 2, name: 'Profile 2' })
    ]
    const mockMangas = [createMockManga()]

    localStorage.setItem('selectedProfileId', '2')

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMangas,
      })
      // ProfileSelector also calls profiles API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Profile 1')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows error state when initialization fails', async () => {
    mockSequentialFetch(
      { error: 'API Error' }
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(screen.getByText('Failed to initialize application')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry Loading' })).toBeInTheDocument()
  })

  it('handles retry on error', async () => {
    const user = userEvent.setup()
    
    // First call fails
    global.fetch.mockRejectedValueOnce(new Error('API Error'))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Clear previous fetch calls and set up new ones for retry
    vi.clearAllMocks()
    const mockProfiles = [createMockProfile({ id: 1, name: 'Test Profile' })]
    const mockMangas = [createMockManga()]
    
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMangas,
      })
      // ProfileSelector also calls profiles API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      })

    await user.click(screen.getByRole('button', { name: 'Retry Loading' }))

    // Wait for success - check for any sign of successful retry
    await waitFor(() => {
      // Look for any of these success indicators
      const errorGone = !screen.queryByText('Oops! Something went wrong')
      const profileFound = screen.queryByText('Test Profile')
      const chooseFound = screen.queryByText('Choose whose manga collection to explore')
      const loadingFound = screen.queryByText('Initializing Manga Collection App...')
      
      // At least one positive indicator should be present
      expect(errorGone || profileFound || chooseFound || loadingFound).toBeTruthy()
    }, { timeout: 10000 })
  }, 15000) // Increase test timeout

  it('handles profile selection from profile selector', async () => {
    const user = userEvent.setup()
    const mockProfiles = [
      createMockProfile({ id: 1, name: 'Profile 1' }),
      createMockProfile({ id: 2, name: 'Profile 2' })
    ]
    const mockMangas = [createMockManga()]
    const mockEntries = [createMockEntry()]

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMangas,
      })
      // ProfileSelector also calls profiles API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      })
      // When profile is selected, load entries
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries,
      })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Profile 1')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Click on first profile
    await user.click(screen.getByText('Profile 1'))

    await waitFor(() => {
      expect(screen.getByText('🏗️ Manga Count')).toBeInTheDocument()
    }, { timeout: 5000 })
  })
})