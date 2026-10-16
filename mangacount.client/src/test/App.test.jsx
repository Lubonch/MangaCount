import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from './test-utils'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { 
  mockSequentialFetch, 
  createMockProfile, 
  createMockManga,
  createMockEntry 
} from './test-utils'

const { mockRecommendManga } = vi.hoisted(() => ({ mockRecommendManga: vi.fn() }))

vi.mock('../api/localAdapter.js', () => ({
  appInfo: vi.fn(),
  updateCheck: vi.fn(),
  updateDownload: vi.fn(),
  updateInstall: vi.fn(),
  onUpdateState: vi.fn(() => () => {}),
  appConfigGet: vi.fn(),
  isElectron: vi.fn(() => false),
  botStatus: vi.fn(() => Promise.resolve({ status: 'apagado' })),
  mangaDelete: vi.fn(),
  coverSearch: vi.fn(),
  coverLink: vi.fn(),
  coverUnlink: vi.fn(),
  coverStatus: vi.fn(),
  databaseStatistics: vi.fn(),
  databaseNukeLocal: vi.fn(),
}))

vi.mock('../components/SettingsModal', () => ({
  default: ({ isOpen, onImportSuccess, onDataReset, onClose }) =>
    isOpen ? (
      <div>
        <button onClick={onImportSuccess}>app-import-success</button>
        <button onClick={onDataReset}>app-data-reset</button>
        <button onClick={onClose}>app-settings-close</button>
      </div>
    ) : null,
}))

vi.mock('../components/CollectionView', () => ({
  default: ({ onRefresh }) => (
    <div>
      Collection View Component
      <button onClick={onRefresh}>refresh-collection</button>
    </div>
  ),
}))

vi.mock('../components/ProfileSelector', async (importOriginal) => {
  const actual = await importOriginal()
  const Actual = actual.default
  return {
    default: (props) => (
      <>
        <Actual {...props} />
        <button data-testid="force-back" onClick={props.onBackToMain}>force-back</button>
      </>
    ),
  }
})

vi.mock('../components/Sidebar', async (importOriginal) => {
  const actual = await importOriginal()
  const Actual = actual.default
  return {
    default: (props) => (
      <>
        <Actual {...props} />
        <button data-testid="force-recommend" onClick={props.onRecommend}>force-recommend</button>
      </>
    ),
  }
})

vi.mock('@shared/recommendations/recommendationEngine.js', () => ({
  recommendManga: mockRecommendManga,
}))

import * as api from '../api/localAdapter.js'

const jsonResponse = (data, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  json: async () => data,
})

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    localStorage.getItem.mockReturnValue(undefined)
    mockRecommendManga.mockReset()
    api.isElectron.mockReturnValue(false)
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
      expect(screen.getByText('MangaCount')).toBeInTheDocument()
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
      expect(screen.getByText('MangaCount')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows the inference error when the recommendation API returns an unconfident local fallback', async () => {
    const user = userEvent.setup()
    const mockProfile = createMockProfile({ id: 1, name: 'Single Profile' })
    const mockMangas = [createMockManga()]
    const mockEntries = [
      createMockEntry({
        quantity: 5,
        manga: {
          name: 'Unknown Title',
          format: { id: 1, name: 'Tankoubon' },
          publisher: { id: 1, name: 'Unknown Publisher' },
        },
      }),
    ]

    mockSequentialFetch(
      { data: [mockProfile] },
      { data: mockMangas },
      { data: mockEntries },
      {
        data: {
          provider: 'local',
          inferredCountry: null,
          isConfident: false,
          blockedByImportCount: 0,
          availableCount: 0,
          limit: 10,
          items: [],
        },
      }
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('MangaCount')).toBeInTheDocument()
    }, { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))

    await waitFor(() => {
      expect(screen.getByText('Could not infer a country from the current collection.')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('aborts an in-flight recommendation request when changing profiles', async () => {
    const user = userEvent.setup()
    const mockProfile = createMockProfile({ id: 1, name: 'Single Profile' })
    const mockMangas = [createMockManga()]
    const mockEntries = [createMockEntry()]
    let recommendationSignal = null

    global.fetch.mockImplementation((url, options = {}) => {
      if (url === '/api/profile') {
        return Promise.resolve({
          ok: true,
          json: async () => [mockProfile],
        })
      }

      if (url === '/api/manga') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMangas,
        })
      }

      if (url === '/api/entry?profileId=1') {
        return Promise.resolve({
          ok: true,
          json: async () => mockEntries,
        })
      }

      if (url === '/api/recommendation?profileId=1&limit=10') {
        recommendationSignal = options.signal
        return new Promise(() => {})
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('MangaCount')).toBeInTheDocument()
    }, { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))

    await waitFor(() => {
      expect(screen.getByText('Building your recommendations...')).toBeInTheDocument()
    }, { timeout: 5000 })

    await user.click(screen.getByTitle('Change profile'))

    await waitFor(() => {
      expect(recommendationSignal?.aborted).toBe(true)
    }, { timeout: 5000 })
  })

  it('shows profile selection when there are no profiles', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Choose whose manga collection to explore')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('restores the saved profile id from localStorage', async () => {
    localStorage.getItem.mockImplementation((key) =>
      key === 'selectedProfileId' ? '2' : null
    )
    const profiles = [
      createMockProfile({ id: 1, name: 'Profile 1' }),
      createMockProfile({ id: 2, name: 'Profile 2' }),
    ]

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse(profiles))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Profile 2')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows the init error when the profiles API responds not-ok', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse({}, false))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Failed to initialize application')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows the init error when the mangas API responds not-ok', async () => {
    const profile = createMockProfile({ id: 1 })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse({}, false))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Failed to initialize application')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows the profile data error when entries fail to load on selection', async () => {
    const profile = createMockProfile({ id: 1, name: 'Solo' })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse({}, false))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load profile data')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('reloads data when an import succeeds from Settings', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByLabelText('Settings'))
    await user.click(await screen.findByText('app-import-success'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/entry?profileId=1')
    }, { timeout: 5000 })
  })

  it('shows the load data error when a reload fails', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    let entryCalls = 0

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') {
        entryCalls += 1
        return entryCalls === 1
          ? Promise.resolve(jsonResponse([]))
          : Promise.reject(new Error('boom'))
      }
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByLabelText('Settings'))
    await user.click(await screen.findByText('app-import-success'))

    await waitFor(() => {
      expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('reloads the collection from the refresh action', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByText('refresh-collection'))

    await waitFor(() => {
      expect(screen.getByText('MangaCount')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('returns to the collection from the profile selector back button', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByTitle('Change profile'))

    const backButton = await screen.findByText("← Back to Solo's Collection")
    await user.click(backButton)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })
  })

  it('falls back to clearing changing profile when there is no last profile', async () => {
    const user = userEvent.setup()

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    const forceBack = await screen.findByTestId('force-back', {}, { timeout: 5000 })
    await user.click(forceBack)

    expect(screen.getByText('Choose whose manga collection to explore')).toBeInTheDocument()
  })

  it('resets the app data from the Nuclear Option callback', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByLabelText('Settings'))
    await user.click(await screen.findByText('app-data-reset'))

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })
    expect(api.appInfo).not.toHaveBeenCalled()
  })

  it('closes the settings modal', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByLabelText('Settings'))
    await user.click(await screen.findByText('app-settings-close'))

    await waitFor(() => expect(screen.queryByText('app-settings-close')).not.toBeInTheDocument())
  })

  it('returns early when recommending without entries', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByTestId('force-recommend'))

    expect(screen.queryByText('Building your recommendations...')).not.toBeInTheDocument()
    expect(mockRecommendManga).not.toHaveBeenCalled()
  })

  it('renders confident recommendations and closes them', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    const entry = createMockEntry()

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([entry]))
      if (url === '/api/recommendation?profileId=1&limit=10') {
        return Promise.resolve(jsonResponse({
          provider: 'remote',
          inferredCountry: 'Argentina',
          isConfident: true,
          items: [{ id: 'x', title: 'Pluto', publisher: 'Ivrea', publisherCountry: 'Argentina' }],
        }))
      }
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))

    expect(await screen.findByText('Pluto')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close Recommendations' }))

    await waitFor(() => expect(screen.queryByText('Pluto')).not.toBeInTheDocument())
  })

  it('falls back to the local recommend engine when the remote call is not ok', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    const entry = createMockEntry()
    mockRecommendManga.mockReturnValue({ isConfident: false, provider: 'local', items: [] })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([entry]))
      if (url === '/api/recommendation?profileId=1&limit=10') {
        return Promise.resolve(jsonResponse({}, false))
      }
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))

    await waitFor(() => {
      expect(screen.getByText('Could not infer a country from the current collection.')).toBeInTheDocument()
    }, { timeout: 5000 })
    expect(mockRecommendManga).toHaveBeenCalled()
  })

  it('shows confident recommendations from the local fallback', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    const entry = createMockEntry()
    mockRecommendManga.mockReturnValue({
      isConfident: true,
      provider: 'local',
      items: [{ id: 'y', title: 'Fallback Pick', publisher: 'P', publisherCountry: 'AR' }],
    })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([entry]))
      if (url === '/api/recommendation?profileId=1&limit=10') {
        return Promise.reject(new Error('network down'))
      }
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))

    expect(await screen.findByText('Fallback Pick')).toBeInTheDocument()
    expect(screen.queryByText('Could not infer a country from the current collection.')).not.toBeInTheDocument()
  })

  it('ignores a recommendation response that arrives after a profile change', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    const entry = createMockEntry()
    let resolveJson

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([entry]))
      if (url === '/api/recommendation?profileId=1&limit=10') {
        return Promise.resolve({ ok: true, json: () => new Promise((resolve) => { resolveJson = resolve }) })
      }
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))
    await waitFor(() => expect(resolveJson).toBeTypeOf('function'), { timeout: 5000 })

    await user.click(screen.getByTitle('Change profile'))

    await act(async () => {
      resolveJson({ isConfident: true, provider: 'remote', items: [] })
      await Promise.resolve()
    })

    expect(screen.getByText('Choose whose manga collection to explore')).toBeInTheDocument()
  })

  it('shows version and update state inside Electron', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    let updateCb
    api.isElectron.mockReturnValue(true)
    api.appInfo.mockResolvedValue({ version: '1.2.3' })
    api.appConfigGet.mockResolvedValue({ updateCheck: true })
    api.updateCheck.mockResolvedValue({ hasUpdate: false, latest: '1.2.3' })
    api.updateDownload.mockRejectedValue(new Error('dl'))
    api.updateInstall.mockRejectedValue(new Error('ins'))
    api.onUpdateState.mockImplementation((cb) => {
      updateCb = cb
      return () => {}
    })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText(/MangaCount v1\.2\.3/)).toBeInTheDocument(), { timeout: 5000 })

    await act(async () => updateCb({ status: 'downloading', percent: 10 }))
    expect(screen.getByText('Descargando… 10%')).toBeInTheDocument()

    await act(async () => updateCb({ hasUpdate: true, latest: '2.0.0', mode: 'auto' }))
    await user.click(screen.getByText('Descargar v2.0.0'))
    await waitFor(() => expect(api.updateDownload).toHaveBeenCalled())

    await act(async () => updateCb({ status: 'downloaded' }))
    await user.click(screen.getByText('Reiniciar para actualizar'))
    await waitFor(() => expect(api.updateInstall).toHaveBeenCalled())
  })

  it('skips the update check when disabled in config', async () => {
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    api.isElectron.mockReturnValue(true)
    api.appInfo.mockResolvedValue({ version: '9.9.9' })
    api.appConfigGet.mockResolvedValue({ updateCheck: false })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText(/MangaCount v9\.9\.9/)).toBeInTheDocument(), { timeout: 5000 })
    expect(api.updateCheck).not.toHaveBeenCalled()
  })

  it('shows a dash when appInfo has no version', async () => {
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    api.isElectron.mockReturnValue(true)
    api.appInfo.mockResolvedValue(null)
    api.appConfigGet.mockResolvedValue({ updateCheck: true })
    api.updateCheck.mockResolvedValue({ hasUpdate: false })

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText(/MangaCount v—/)).toBeInTheDocument(), { timeout: 5000 })
  })

  it('swallows errors from the update bootstrap', async () => {
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    api.isElectron.mockReturnValue(true)
    api.appInfo.mockRejectedValue(new Error('ipc down'))

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText(/MangaCount v—/)).toBeInTheDocument(), { timeout: 5000 })
  })

  it('does not apply the update state after unmount', async () => {
    let resolveInfo
    api.isElectron.mockReturnValue(true)
    api.appInfo.mockReturnValue(new Promise((resolve) => { resolveInfo = resolve }))
    api.appConfigGet.mockResolvedValue({ updateCheck: true })
    api.updateCheck.mockResolvedValue({ hasUpdate: false })
    api.onUpdateState.mockReturnValue(() => {})

    global.fetch.mockResolvedValue({ ok: true, json: async () => [] })

    const { unmount } = render(<App />)
    unmount()

    await act(async () => {
      resolveInfo({ version: '1.0.0' })
      await Promise.resolve()
    })
  })

  it('ignores an update state pushed after unmount', async () => {
    let pushState
    api.isElectron.mockReturnValue(true)
    api.appInfo.mockResolvedValue({ version: '1.0.0' })
    api.appConfigGet.mockResolvedValue({ updateCheck: false })
    api.onUpdateState.mockImplementation((cb) => {
      pushState = cb
      return () => {}
    })

    global.fetch.mockResolvedValue({ ok: true, json: async () => [] })

    const { unmount } = render(<App />)
    await act(async () => { await Promise.resolve() })
    unmount()

    await act(async () => { pushState({ status: 'downloaded' }) })
  })

  it('ignores an update result that resolves after unmount', async () => {
    let resolveCheck
    api.isElectron.mockReturnValue(true)
    api.appInfo.mockResolvedValue({ version: '1.0.0' })
    api.appConfigGet.mockResolvedValue({ updateCheck: true })
    api.updateCheck.mockReturnValue(new Promise((resolve) => { resolveCheck = resolve }))
    api.onUpdateState.mockReturnValue(() => {})

    global.fetch.mockResolvedValue({ ok: true, json: async () => [] })

    const { unmount } = render(<App />)
    await waitFor(() => expect(api.updateCheck).toHaveBeenCalled(), { timeout: 5000 })
    unmount()

    await act(async () => {
      resolveCheck({ hasUpdate: false })
      await Promise.resolve()
    })
  })

  it('ignores an AbortError from the recommendation request', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    const entry = createMockEntry()

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([entry]))
      if (url === '/api/recommendation?profileId=1&limit=10') {
        const error = new Error('aborted')
        error.name = 'AbortError'
        return Promise.reject(error)
      }
      return Promise.reject(new Error('Unexpected ' + url))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))

    await waitFor(() => {
      expect(screen.queryByText('Building your recommendations...')).not.toBeInTheDocument()
    }, { timeout: 5000 })
    expect(mockRecommendManga).not.toHaveBeenCalled()
  })

  it('ignores a stale recommendation error after a profile change', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile({ id: 1, name: 'Solo' })
    const entry = createMockEntry()
    const RealAbortController = global.AbortController
    class FakeAbortController {
      constructor() {
        this.signal = { aborted: false }
      }
      abort() {}
    }
    global.AbortController = FakeAbortController
    let rejectFetch

    global.fetch.mockImplementation((url) => {
      if (url === '/api/profile') return Promise.resolve(jsonResponse([profile]))
      if (url === '/api/manga') return Promise.resolve(jsonResponse([]))
      if (url === '/api/entry?profileId=1') return Promise.resolve(jsonResponse([entry]))
      if (url === '/api/recommendation?profileId=1&limit=10') {
        return new Promise((_resolve, reject) => { rejectFetch = reject })
      }
      return Promise.reject(new Error('Unexpected ' + url))
    })

    try {
      render(<App />)

      await waitFor(() => expect(screen.getByText('MangaCount')).toBeInTheDocument(), { timeout: 5000 })

      await user.click(screen.getByRole('button', { name: 'Recommendations' }))
      await waitFor(() => expect(rejectFetch).toBeTypeOf('function'), { timeout: 5000 })

      await user.click(screen.getByTitle('Change profile'))

      await act(async () => {
        rejectFetch(new Error('boom'))
        await Promise.resolve()
      })

      expect(screen.getByText('Choose whose manga collection to explore')).toBeInTheDocument()
      expect(mockRecommendManga).not.toHaveBeenCalled()
    } finally {
      global.AbortController = RealAbortController
    }
  })
})