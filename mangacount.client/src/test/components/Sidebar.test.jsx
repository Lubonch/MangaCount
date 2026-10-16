import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/localAdapter.js', () => ({
  isElectron: vi.fn(() => false),
  botStatus: vi.fn(),
  mangaDelete: vi.fn(),
  coverSearch: vi.fn().mockResolvedValue([]),
  coverLink: vi.fn(),
  coverUnlink: vi.fn(),
  coverStatus: vi.fn().mockResolvedValue(null),
}))

// Modales controlables para disparar onSuccess/onClose.
vi.mock('../../components/AddEntryModal', () => ({
  default: ({ isOpen, onSuccess, onClose }) =>
    isOpen ? (
      <div>
        <button onClick={onSuccess}>add-entry-success</button>
        <button onClick={onClose}>close-add-entry</button>
      </div>
    ) : null,
}))

vi.mock('../../components/AddMangaModal', () => ({
  default: ({ isOpen, onSuccess, onClose }) =>
    isOpen ? (
      <div>
        <button onClick={onSuccess}>add-manga-success</button>
        <button onClick={onClose}>close-add-manga</button>
      </div>
    ) : null,
}))

import * as api from '../../api/localAdapter.js'
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
    api.isElectron.mockReturnValue(false)
    api.botStatus.mockResolvedValue({ status: 'apagado' })
    api.mangaDelete.mockResolvedValue({ ok: true })
    api.coverSearch.mockResolvedValue([])
    api.coverStatus.mockResolvedValue(null)
    api.coverLink.mockResolvedValue({ coverUrl: 'cover.jpg' })
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

    expect(screen.getByText('MangaCount')).toBeInTheDocument()
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

  it('deshabilita recomendaciones sin entradas y muestra Thinking...', () => {
    const profile = createMockProfile()
    const { rerender } = render(<Sidebar {...defaultProps} selectedProfile={profile} entries={[]} />)
    expect(screen.getByRole('button', { name: 'Recommendations' })).toBeDisabled()

    rerender(<Sidebar {...defaultProps} selectedProfile={profile} entries={[{ id: 1 }]} recommendationsLoading />)
    const thinking = screen.getByRole('button', { name: 'Thinking...' })
    expect(thinking).toBeDisabled()
  })

  it('opens settings from the gear button', async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()

    render(<Sidebar {...defaultProps} onOpenSettings={onOpenSettings} />)

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('no longer renders the collection import block ni la Danger Zone', () => {
    render(<Sidebar {...defaultProps} selectedProfile={createMockProfile()} />)
    expect(screen.queryByText('Import Collection')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Choose TSV File')).not.toBeInTheDocument()
    // La Nuclear Option se movió a Settings; el sidebar ahora expone el acceso a Settings.
    expect(screen.queryByText('Nuclear Option')).not.toBeInTheDocument()
    expect(screen.queryByText('Danger Zone')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
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

  it('usa placeholder de avatar cuando el perfil no tiene imagen', () => {
    const profile = createMockProfile({ name: 'zeta', profilePicture: null })
    render(<Sidebar {...defaultProps} selectedProfile={profile} />)
    expect(screen.getByText('Z')).toBeInTheDocument()
  })

  it('colapsa y expande el sidebar', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} selectedProfile={createMockProfile()} />)

    const aside = () => document.querySelector('.sidebar')
    expect(aside().className).not.toContain('collapsed')

    await user.click(screen.getByRole('button', { name: 'Colapsar menú' }))
    expect(aside().className).toContain('collapsed')
    expect(screen.getByTitle('Expandir menú')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Colapsar menú' }))
    expect(aside().className).not.toContain('collapsed')
  })

  it('opens add entry modal', async () => {
    const user = userEvent.setup()
    const profile = createMockProfile()

    render(<Sidebar {...defaultProps} selectedProfile={profile} />)

    const addEntryButton = screen.getByRole('button', { name: '+ Add Entry' })
    await user.click(addEntryButton)

    expect(screen.getByText('add-entry-success')).toBeInTheDocument()
  })

  it('cierra el modal de add entry', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} selectedProfile={createMockProfile()} />)

    await user.click(screen.getByRole('button', { name: '+ Add Entry' }))
    await user.click(screen.getByText('close-add-entry'))
    expect(screen.queryByText('add-entry-success')).not.toBeInTheDocument()
  })

  it('agrega entry correctamente y resetea el modal', async () => {
    const user = userEvent.setup()
    const onImportSuccess = vi.fn()
    render(<Sidebar {...defaultProps} selectedProfile={createMockProfile()} onImportSuccess={onImportSuccess} />)

    await user.click(screen.getByRole('button', { name: '+ Add Entry' }))
    await user.click(screen.getByText('add-entry-success'))

    expect(onImportSuccess).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('add-entry-success')).not.toBeInTheDocument()
  })

  it('agrega manga desde el modal', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: '+ Add Manga' }))
    expect(screen.getByText('add-manga-success')).toBeInTheDocument()

    await user.click(screen.getByText('add-manga-success'))
    expect(screen.queryByText('add-manga-success')).not.toBeInTheDocument()
  })

  it('cierra el modal de add manga', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: '+ Add Manga' }))
    await user.click(screen.getByText('close-add-manga'))
    expect(screen.queryByText('add-manga-success')).not.toBeInTheDocument()
  })

  it('usa handlers por defecto de recommend y settings', async () => {
    const user = userEvent.setup()
    render(<Sidebar mangas={[]} entries={[{ id: 1 }]} selectedProfile={createMockProfile()} />)

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('edita un manga desde el Manga Library', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} mangas={[createMockManga({ id: 1, name: 'Berserk' })]} />)

    await user.click(screen.getByTitle('Edit manga info'))
    expect(screen.getByText('add-manga-success')).toBeInTheDocument()

    await user.click(screen.getByText('close-add-manga'))
    expect(screen.queryByText('add-manga-success')).not.toBeInTheDocument()
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

  it('filtra el Manga Library por título', async () => {
    const user = userEvent.setup()
    const mangas = [
      createMockManga({ id: 1, name: 'Berserk' }),
      createMockManga({ id: 2, name: 'Vagabond' }),
    ]

    render(<Sidebar {...defaultProps} mangas={mangas} />)
    await user.type(screen.getByLabelText('Filtrar mangas'), 'bers')

    expect(screen.getByText('Berserk')).toBeInTheDocument()
    expect(screen.queryByText('Vagabond')).not.toBeInTheDocument()
    expect(screen.getByText('Manga Library (1/2)')).toBeInTheDocument()
  })

  it('muestra "Sin coincidencias" cuando el filtro no matchea', async () => {
    const user = userEvent.setup()
    const mangas = [
      createMockManga({ id: 1, name: 'Berserk' }),
      createMockManga({ id: 2, name: 'Vagabond' }),
    ]

    render(<Sidebar {...defaultProps} mangas={mangas} />)
    await user.type(screen.getByLabelText('Filtrar mangas'), 'zzz')

    expect(screen.getByText('Sin coincidencias')).toBeInTheDocument()
    expect(screen.queryByText('Berserk')).not.toBeInTheDocument()
    expect(screen.getByText('Manga Library (0/2)')).toBeInTheDocument()
  })

  it('abre la búsqueda de portada desde el Manga Library', async () => {
    const user = userEvent.setup()
    const mangas = [createMockManga({ id: 1, name: 'Berserk' })]

    render(<Sidebar {...defaultProps} mangas={mangas} />)

    await user.click(screen.getByRole('button', { name: 'Buscar portada de Berserk' }))

    expect(await screen.findByText(/Portada — Berserk/)).toBeInTheDocument()
  })

  it('cierra el modal de portada', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...defaultProps} mangas={[createMockManga({ id: 1, name: 'Berserk' })]} />)

    await user.click(screen.getByRole('button', { name: 'Buscar portada de Berserk' }))
    await user.click(await screen.findByLabelText('Cerrar'))

    expect(screen.queryByText(/Portada — Berserk/)).not.toBeInTheDocument()
  })

  it('notifica onImportSuccess al vincular una portada', async () => {
    const user = userEvent.setup()
    const onImportSuccess = vi.fn()
    api.coverSearch.mockResolvedValue([
      { id: 7, title: 'Berserk', coverUrl: 'u.jpg', format: 'MANGA', year: 1989, volumes: 41 },
    ])
    api.coverLink.mockResolvedValue({ coverUrl: 'cache.jpg' })

    render(
      <Sidebar
        {...defaultProps}
        mangas={[createMockManga({ id: 1, name: 'Berserk' })]}
        onImportSuccess={onImportSuccess}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Buscar portada de Berserk' }))
    await user.click(await screen.findByTitle('Vincular con Berserk'))

    await waitFor(() => expect(onImportSuccess).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/Portada — Berserk/)).not.toBeInTheDocument()
  })

  it('elimina un manga desde el Manga Library (con confirmación)', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onImportSuccess = vi.fn()
    api.mangaDelete.mockResolvedValue({ ok: true })

    render(
      <Sidebar
        {...defaultProps}
        mangas={[createMockManga({ id: 1, name: 'Berserk' })]}
        onImportSuccess={onImportSuccess}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Eliminar Berserk' }))

    await waitFor(() => expect(api.mangaDelete).toHaveBeenCalledWith(1))
    expect(onImportSuccess).toHaveBeenCalled()
  })

  it('no elimina si el usuario cancela', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<Sidebar {...defaultProps} mangas={[createMockManga({ id: 1, name: 'Berserk' })]} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar Berserk' }))

    expect(api.mangaDelete).not.toHaveBeenCalled()
  })

  it('loguea error si falla la eliminación', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onImportSuccess = vi.fn()
    api.mangaDelete.mockRejectedValueOnce(new Error('fail'))

    render(
      <Sidebar
        {...defaultProps}
        mangas={[createMockManga({ id: 1, name: 'Berserk' })]}
        onImportSuccess={onImportSuccess}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Eliminar Berserk' }))

    await waitFor(() =>
      expect(global.console.error).toHaveBeenCalledWith('Error deleting manga:', expect.any(Error))
    )
    expect(onImportSuccess).not.toHaveBeenCalled()
  })

  it('muestra el estado del bot en Electron', async () => {
    api.isElectron.mockReturnValue(true)
    api.botStatus.mockResolvedValue({ status: 'encendido' })

    render(<Sidebar {...defaultProps} />)

    await waitFor(() => expect(screen.getByText(/Bot: encendido/)).toBeInTheDocument())
    expect(api.botStatus).toHaveBeenCalled()
  })

  it('usa apagado si el bot no devuelve estado', async () => {
    api.isElectron.mockReturnValue(true)
    api.botStatus.mockResolvedValue(null)

    render(<Sidebar {...defaultProps} />)

    await waitFor(() => expect(screen.getByText(/Bot: apagado/)).toBeInTheDocument())
  })

  it('mantiene apagado si falla la consulta del bot', async () => {
    api.isElectron.mockReturnValue(true)
    api.botStatus.mockRejectedValueOnce(new Error('offline'))

    render(<Sidebar {...defaultProps} />)

    await waitFor(() => expect(api.botStatus).toHaveBeenCalled())
    expect(screen.getByText(/Bot: apagado/)).toBeInTheDocument()
  })

  it('no actualiza el bot si se desmonta antes de resolver', async () => {
    api.isElectron.mockReturnValue(true)
    let resolveBot
    api.botStatus.mockReturnValue(new Promise((resolve) => { resolveBot = resolve }))

    const { unmount } = render(<Sidebar {...defaultProps} />)
    unmount()
    resolveBot({ status: 'encendido' })
    await Promise.resolve()
    expect(api.botStatus).toHaveBeenCalled()
  })
})
