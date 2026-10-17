import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/localAdapter.js', () => ({
  coverSearch: vi.fn(),
  coverLink: vi.fn(),
  coverUnlink: vi.fn(),
  coverStatus: vi.fn(),
  coverLocal: vi.fn(),
  pickFile: vi.fn(),
}))

import * as api from '../../api/localAdapter.js'
import LinkCoverModal from '../../components/LinkCoverModal'

const manga = { id: 5, name: 'Berserk' }
const candidate = {
  id: 1,
  title: 'Berserk',
  altTitles: [],
  coverUrl: 'https://img/b.jpg',
  format: 'MANGA',
  year: 1989,
  volumes: 41,
}

describe('LinkCoverModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.coverStatus.mockResolvedValue(null)
  })

  it('busca prellenado con el título local y lista candidatos', async () => {
    api.coverSearch.mockResolvedValue([candidate])
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)
    await waitFor(() => expect(api.coverSearch).toHaveBeenCalledWith('Berserk'))
    expect(await screen.findByText('Berserk')).toBeInTheDocument()
    expect(screen.getByText(/MANGA/)).toBeInTheDocument()
  })

  it('al elegir un candidato vincula y notifica onLinked', async () => {
    api.coverSearch.mockResolvedValue([candidate])
    api.coverLink.mockResolvedValue({
      ref: { externalId: '1' },
      coverUrl: 'mangacount://covers/5.jpg',
    })
    const onLinked = vi.fn()
    const onClose = vi.fn()
    render(<LinkCoverModal manga={manga} onClose={onClose} onLinked={onLinked} />)

    const option = await screen.findByTitle(/Vincular con Berserk/)
    await userEvent.click(option)

    await waitFor(() =>
      expect(api.coverLink).toHaveBeenCalledWith(5, expect.objectContaining({ id: 1 }))
    )
    expect(onLinked).toHaveBeenCalledWith(5, 'mangacount://covers/5.jpg')
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra "Quitar vínculo" solo si hay vínculo', async () => {
    api.coverSearch.mockResolvedValue([])
    api.coverStatus.mockResolvedValue({ provider: 'anilist', externalId: '1', coverUrl: 'x' })
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)
    expect(await screen.findByText('Quitar vínculo')).toBeInTheDocument()
  })

  it('muestra un error si la búsqueda en AniList falla', async () => {
    api.coverSearch.mockRejectedValue(new Error('network'))
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    expect(
      await screen.findByText('No se pudo buscar en AniList (revisá la conexión).')
    ).toBeInTheDocument()
  })

  it('muestra un error si falla la vinculación', async () => {
    api.coverSearch.mockResolvedValue([candidate])
    api.coverLink.mockRejectedValue(new Error('boom'))
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    const option = await screen.findByTitle(/Vincular con Berserk/)
    await userEvent.click(option)

    expect(await screen.findByText('No se pudo descargar la portada.')).toBeInTheDocument()
  })

  it('desvincula una portada vinculada', async () => {
    api.coverSearch.mockResolvedValue([])
    api.coverStatus.mockResolvedValue({ provider: 'anilist', externalId: '1', coverUrl: 'x' })
    api.coverUnlink.mockResolvedValue({ unlinked: true })
    const onLinked = vi.fn()
    const onClose = vi.fn()
    render(<LinkCoverModal manga={manga} onClose={onClose} onLinked={onLinked} />)

    await userEvent.click(await screen.findByText('Quitar vínculo'))

    await waitFor(() => expect(api.coverUnlink).toHaveBeenCalledWith(5))
    expect(onLinked).toHaveBeenCalledWith(5, null)
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra un error si falla el desvincular', async () => {
    api.coverSearch.mockResolvedValue([])
    api.coverStatus.mockResolvedValue({ provider: 'anilist', externalId: '1', coverUrl: 'x' })
    api.coverUnlink.mockRejectedValue(new Error('boom'))
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    await userEvent.click(await screen.findByText('Quitar vínculo'))

    expect(await screen.findByText('No se pudo quitar el vínculo.')).toBeInTheDocument()
  })

  it('permite editar la consulta y buscar con Enter', async () => {
    api.coverSearch.mockResolvedValueOnce([candidate]).mockResolvedValueOnce([candidate])
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    await waitFor(() => expect(api.coverSearch).toHaveBeenCalledWith('Berserk'))

    const input = screen.getByPlaceholderText('Título en AniList…')
    await userEvent.clear(input)
    await userEvent.type(input, 'Vinland')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(api.coverSearch).toHaveBeenCalledWith('Vinland'))
  })

  it('no busca al presionar una tecla distinta de Enter', async () => {
    api.coverSearch.mockResolvedValue([candidate])
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    await waitFor(() => expect(api.coverSearch).toHaveBeenCalledTimes(1))

    await userEvent.type(screen.getByPlaceholderText('Título en AniList…'), 'x')

    expect(api.coverSearch).toHaveBeenCalledTimes(1)
  })

  it('lista candidatos sin portada y sin metadatos', async () => {
    api.coverSearch.mockResolvedValue([
      { id: 2, title: 'Sin datos', coverUrl: null },
    ])
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    expect(await screen.findByText('Sin portada')).toBeInTheDocument()
    expect(screen.getByTitle('Vincular con Sin datos')).toBeInTheDocument()
  })

  it('vincula sin callback onLinked', async () => {
    api.coverSearch.mockResolvedValue([candidate])
    api.coverLink.mockResolvedValue({ coverUrl: 'mangacount://covers/5.jpg' })
    const onClose = vi.fn()
    render(<LinkCoverModal manga={manga} onClose={onClose} />)

    await userEvent.click(await screen.findByTitle(/Vincular con Berserk/))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('desvincula sin callback onLinked', async () => {
    api.coverSearch.mockResolvedValue([])
    api.coverStatus.mockResolvedValue({ provider: 'anilist', externalId: '1', coverUrl: 'x' })
    api.coverUnlink.mockResolvedValue({})
    const onClose = vi.fn()
    render(<LinkCoverModal manga={manga} onClose={onClose} />)

    await userEvent.click(await screen.findByText('Quitar vínculo'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('usa cadena vacía como consulta si el manga no tiene nombre', async () => {
    api.coverSearch.mockResolvedValue([])
    render(<LinkCoverModal manga={{ id: 9 }} onClose={() => {}} onLinked={() => {}} />)

    await waitFor(() => expect(api.coverSearch).toHaveBeenCalledWith(''))
    expect(api.coverStatus).toHaveBeenCalledWith(9)
  })

  it('ignora el error al consultar el estado de la portada', async () => {
    api.coverStatus.mockRejectedValue(new Error('boom'))
    api.coverSearch.mockResolvedValue([])
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    await waitFor(() => expect(api.coverSearch).toHaveBeenCalledWith('Berserk'))
    expect(screen.queryByText('Quitar vínculo')).not.toBeInTheDocument()
  })

  it('no actualiza el estado si se desmonta antes de resolver', async () => {
    let resolveStatus
    api.coverStatus.mockReturnValue(new Promise((resolve) => { resolveStatus = resolve }))
    api.coverSearch.mockResolvedValue([])
    const { unmount } = render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    unmount()
    resolveStatus({ provider: 'anilist', externalId: '1', coverUrl: 'x' })
    await Promise.resolve()
  })

  it('marca los candidatos +18 con un badge', async () => {
    api.coverSearch.mockResolvedValue([
      { id: 1, title: 'Berserk', altTitles: [], coverUrl: 'u', isAdult: true },
      { id: 2, title: 'Vinland Saga', altTitles: [], coverUrl: 'v', isAdult: false },
    ])

    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    expect(await screen.findByText('+18')).toBeInTheDocument()
    expect(screen.getAllByText('+18')).toHaveLength(1) // solo el candidato adulto
  })

  it('vincula una imagen local desde "Buscar en mi PC…"', async () => {
    api.coverSearch.mockResolvedValue([])
    api.pickFile.mockResolvedValue('/home/u/foto.png')
    api.coverLocal.mockResolvedValue({
      ref: { provider: 'local' },
      coverUrl: 'mangacount://covers/5.png',
    })
    const onLinked = vi.fn()
    const onClose = vi.fn()
    render(<LinkCoverModal manga={manga} onClose={onClose} onLinked={onLinked} />)

    await userEvent.click(screen.getByText('Buscar en mi PC…'))

    await waitFor(() =>
      expect(api.pickFile).toHaveBeenCalledWith([
        { name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      ])
    )
    await waitFor(() => expect(api.coverLocal).toHaveBeenCalledWith(5, '/home/u/foto.png'))
    expect(onLinked).toHaveBeenCalledWith(5, 'mangacount://covers/5.png')
    expect(onClose).toHaveBeenCalled()
  })

  it('no vincula nada si se cancela el diálogo', async () => {
    api.coverSearch.mockResolvedValue([])
    api.pickFile.mockResolvedValue(null)
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    await userEvent.click(screen.getByText('Buscar en mi PC…'))

    await waitFor(() => expect(api.pickFile).toHaveBeenCalled())
    expect(api.coverLocal).not.toHaveBeenCalled()
    expect(screen.queryByText(/No se pudo usar esa imagen/)).not.toBeInTheDocument()
  })

  it('muestra un error si falla la imagen local', async () => {
    api.coverSearch.mockResolvedValue([])
    api.pickFile.mockResolvedValue('/x/grande.png')
    api.coverLocal.mockRejectedValue(new Error('demasiado grande'))
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    await userEvent.click(screen.getByText('Buscar en mi PC…'))

    expect(
      await screen.findByText(
        'No se pudo usar esa imagen (formato no soportado o demasiado grande).'
      )
    ).toBeInTheDocument()
  })

  it('deshabilita el botón local mientras está ocupado', async () => {
    api.coverSearch.mockResolvedValue([])
    let resolvePick
    api.pickFile.mockReturnValue(
      new Promise((resolve) => {
        resolvePick = resolve
      })
    )
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    await userEvent.click(screen.getByText('Buscar en mi PC…'))

    const busy = await screen.findByRole('button', { name: 'Leyendo…' })
    expect(busy).toBeDisabled()
    resolvePick(null)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Buscar en mi PC…' })).toBeEnabled()
    )
  })

  it('muestra la procedencia local y el thumbnail de la portada actual', async () => {
    api.coverSearch.mockResolvedValue([])
    api.coverStatus.mockResolvedValue({
      provider: 'local',
      externalId: '',
      coverUrl: 'mangacount://covers/5.png',
    })
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    expect(await screen.findByText('Portada local')).toBeInTheDocument()
    const thumb = document.querySelector('.link-cover-current-thumb')
    expect(thumb).toBeInTheDocument()
    expect(thumb).toHaveAttribute('src', 'mangacount://covers/5.png')
  })

  it('muestra la procedencia de AniList sin thumbnail si no hay imagen', async () => {
    api.coverSearch.mockResolvedValue([])
    api.coverStatus.mockResolvedValue({ provider: 'anilist', externalId: '1', coverUrl: null })
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    expect(await screen.findByText('Portada de AniList')).toBeInTheDocument()
    expect(document.querySelector('.link-cover-current-thumb')).not.toBeInTheDocument()
  })

  it('candidato +18 con la preferencia OFF: difuminado y reveal por click antes de vincular', async () => {
    api.coverSearch.mockResolvedValue([
      { id: 1, title: 'Berserk', altTitles: [], coverUrl: 'u', isAdult: true },
    ])
    api.coverLink.mockResolvedValue({ coverUrl: 'mangacount://covers/5.jpg' })
    const onLinked = vi.fn()
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={onLinked} />)

    const option = await screen.findByTitle('Vincular con Berserk')
    expect(option.className).toContain('cover-candidate--adult')
    expect(option.className).not.toContain('cover-candidate--reveal-hover')

    // 1er click: revela sin vincular.
    await userEvent.click(option)
    await waitFor(() => expect(option.className).toContain('cover-candidate--revealed'))
    expect(api.coverLink).not.toHaveBeenCalled()

    // 2do click: ejecuta la vinculación real.
    await userEvent.click(option)
    await waitFor(() =>
      expect(api.coverLink).toHaveBeenCalledWith(5, expect.objectContaining({ id: 1 }))
    )
    expect(onLinked).toHaveBeenCalledWith(5, 'mangacount://covers/5.jpg')
  })

  it('candidato +18 con la preferencia ON: difuminado, reveal por hover y vincula al click', async () => {
    api.coverSearch.mockResolvedValue([
      { id: 1, title: 'Berserk', altTitles: [], coverUrl: 'u', isAdult: true },
    ])
    api.coverLink.mockResolvedValue({ coverUrl: 'mangacount://covers/5.jpg' })
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} showAdultCovers />)

    const option = await screen.findByTitle('Vincular con Berserk')
    expect(option.className).toContain('cover-candidate--adult')
    expect(option.className).toContain('cover-candidate--reveal-hover')

    await userEvent.click(option)
    await waitFor(() =>
      expect(api.coverLink).toHaveBeenCalledWith(5, expect.objectContaining({ id: 1 }))
    )
  })

  it('candidato no adulto: sin blur ni badge', async () => {
    api.coverSearch.mockResolvedValue([
      { id: 2, title: 'Vinland Saga', altTitles: [], coverUrl: 'v', isAdult: false },
    ])
    render(<LinkCoverModal manga={manga} onClose={() => {}} onLinked={() => {}} />)

    const option = await screen.findByTitle('Vincular con Vinland Saga')
    expect(option.className).not.toContain('cover-candidate--adult')
    expect(screen.queryByText('+18')).not.toBeInTheDocument()
  })
})
