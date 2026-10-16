import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/localAdapter.js', () => ({
  coverSearch: vi.fn(),
  coverLink: vi.fn(),
  coverUnlink: vi.fn(),
  coverStatus: vi.fn(),
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
})
