import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'

// setup.js mocks CollectionView globally for the rest of the tests; here we use the real one.
vi.unmock('../../components/CollectionView')

vi.mock('../../api/localAdapter', () => ({
  coverAll: vi.fn(),
  coverAuto: vi.fn(),
}))

// Controllable modals to fire onSuccess/onClose from the test.
vi.mock('../../components/AddEntryModal', () => ({
  default: ({ isOpen, onSuccess, onClose, selectedProfile }) =>
    isOpen ? (
      <div>
        <span>edit-entry-open</span>
        <span>entry-profile:{selectedProfile?.id ?? 'none'}</span>
        <button onClick={onSuccess}>confirm-entry</button>
        <button onClick={onClose}>close-entry</button>
      </div>
    ) : null,
}))

vi.mock('../../components/AddMangaModal', () => ({
  default: ({ isOpen, onSuccess, onClose }) =>
    isOpen ? (
      <div>
        <span>edit-manga-open</span>
        <button onClick={onSuccess}>confirm-manga</button>
        <button onClick={onClose}>close-manga</button>
      </div>
    ) : null,
}))

import CollectionView from '../../components/CollectionView'
import { coverAll, coverAuto } from '../../api/localAdapter'

const profile = { id: 1, name: 'Prof' }

const mkManga = (o = {}) => ({
  id: 1,
  name: 'Alpha',
  volumes: 10,
  format: { id: 1, name: 'Tankoubon' },
  publisher: { id: 1, name: 'Ivrea' },
  ...o,
})

const mkEntry = (o = {}) => ({
  id: 1,
  quantity: 5,
  pending: null,
  priority: false,
  manga: mkManga(),
  ...o,
})

const comboboxes = () => screen.getAllByRole('combobox')
const viewSelect = () => comboboxes()[3]
const sortSelect = () => comboboxes()[4]
const statusSelect = () => comboboxes()[2]
const publisherSelect = () => comboboxes()[0]
const formatSelect = () => comboboxes()[1]

const cardTitles = (container) =>
  Array.from(container.querySelectorAll('.manga-title')).map((n) => n.textContent)

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const sortEntries = () => [
  mkEntry({
    id: 1,
    quantity: 5,
    priority: true,
    manga: mkManga({
      id: 1,
      name: 'Alpha',
      volumes: 10,
      publisher: { id: 1, name: 'Zed' },
      format: { id: 1, name: 'Two' },
    }),
  }),
  mkEntry({
    id: 2,
    quantity: 8,
    priority: false,
    manga: mkManga({
      id: 2,
      name: 'Beta',
      volumes: 10,
      publisher: { id: 2, name: 'Alpha' },
      format: { id: 2, name: 'One' },
    }),
  }),
  mkEntry({
    id: 3,
    quantity: 3,
    priority: true,
    manga: mkManga({
      id: 3,
      name: 'Gamma',
      volumes: 0,
      publisher: { id: 3, name: 'Mid' },
      format: { id: 3, name: 'Three' },
    }),
  }),
]

const filterEntries = () => [
  mkEntry({ id: 1, quantity: 10, priority: true, manga: mkManga({ id: 1, name: 'Complete', volumes: 10 }) }),
  mkEntry({ id: 2, quantity: 2, priority: true, manga: mkManga({ id: 2, name: 'PrioInc', volumes: 10 }) }),
  mkEntry({ id: 3, quantity: 2, manga: mkManga({ id: 3, name: 'Incomplete', volumes: 10 }) }),
  mkEntry({ id: 4, quantity: 3, manga: mkManga({ id: 4, name: 'NoVol', volumes: 0 }) }),
  mkEntry({ id: 5, quantity: 1, pending: 'Ordered', manga: mkManga({ id: 5, name: 'WithPending', volumes: 10 }) }),
]

beforeEach(() => {
  coverAll.mockReset()
  coverAuto.mockReset()
  coverAll.mockResolvedValue({})
  coverAuto.mockResolvedValue(null)
  global.fetch.mockReset()
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('CollectionView: series sin total de tomos', () => {
  it('muestra "owned / ??" y ningún 0 suelto', () => {
    render(
      <CollectionView
        entries={[
          mkEntry({
            id: 1,
            quantity: 9,
            manga: mkManga({
              id: 1,
              name: 'Konosuba',
              volumes: 0,
              format: { name: 'Unknown' },
              publisher: { name: 'Unknown' },
            }),
          }),
        ]}
        mangas={[]}
        selectedProfile={null}
      />
    )
    expect(screen.getByText(/Owned: 9 \/ \?\?/)).toBeInTheDocument()
    expect(screen.queryByText('0', { exact: true })).not.toBeInTheDocument()
  })

  it('muestra "owned / total" cuando hay total', () => {
    render(<CollectionView entries={[mkEntry({ id: 2, quantity: 1 })]} mangas={[]} selectedProfile={null} />)
    expect(screen.getByText(/Owned: 1 \/ 10/)).toBeInTheDocument()
  })

  it('muestra la portada generada (iniciales) cuando no hay vínculo', () => {
    render(<CollectionView entries={[mkEntry({ id: 2, quantity: 1 })]} mangas={[]} selectedProfile={null} />)
    // 'Alpha' -> initials 'A' in the generated cover.
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})

describe('CollectionView: cabecera y estados', () => {
  it('muestra totales y conteo por estado', () => {
    render(<CollectionView entries={sortEntries()} mangas={[]} selectedProfile={null} />)
    expect(screen.getByText(/3 total entries/)).toBeInTheDocument()
    expect(screen.getByText(/Complete: 0/)).toBeInTheDocument()
    expect(screen.getByText(/Priority: 2/)).toBeInTheDocument()
    expect(screen.getByText(/Incomplete: 1/)).toBeInTheDocument()
  })

  it('sin onRefresh no hay botón refresh y muestra empty state sin filtros', () => {
    render(<CollectionView entries={[]} mangas={[]} selectedProfile={null} />)
    expect(screen.queryByTitle('Refresh collection')).not.toBeInTheDocument()
    expect(screen.getByText('No entries found for the selected filters.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Clear All Filters/ })).not.toBeInTheDocument()
  })

  it('refresca con el botón y muestra skeleton en loading', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    const entry = mkEntry({ id: 1 })
    const { container, rerender } = render(
      <CollectionView entries={[entry]} mangas={[]} selectedProfile={null} onRefresh={onRefresh} />
    )
    await user.click(screen.getByTitle('Refresh collection'))
    expect(onRefresh).toHaveBeenCalledTimes(1)

    rerender(<CollectionView entries={[entry]} mangas={[]} selectedProfile={null} onRefresh={onRefresh} loading />)
    expect(container.querySelector('.skeleton-loading')).toBeInTheDocument()
    expect(container.querySelectorAll('.skeleton-item').length).toBe(6)
  })

  it('skeleton table/compact usan distinta cantidad', async () => {
    const user = userEvent.setup()
    const entry = mkEntry({ id: 1 })
    const props = { entries: [entry], mangas: [], selectedProfile: null }
    const { container, rerender } = render(<CollectionView {...props} />)

    await user.selectOptions(viewSelect(), 'table')
    rerender(<CollectionView {...props} loading />)
    expect(container.querySelectorAll('.skeleton-item').length).toBe(10)

    rerender(<CollectionView {...props} />)
    await user.selectOptions(viewSelect(), 'compact')
    rerender(<CollectionView {...props} loading />)
    expect(container.querySelectorAll('.skeleton-item').length).toBe(12)
  })
})

describe('CollectionView: vistas table/compact/cards', () => {
  it('renderiza las tres vistas', async () => {
    const user = userEvent.setup()
    const { container } = render(<CollectionView entries={[mkEntry({ id: 1 })]} mangas={[]} selectedProfile={null} />)
    expect(container.querySelector('.entries-grid')).toBeInTheDocument()

    await user.selectOptions(viewSelect(), 'table')
    expect(container.querySelector('table.entries-table')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()

    await user.selectOptions(viewSelect(), 'compact')
    expect(container.querySelector('.compact-grid')).toBeInTheDocument()

    await user.selectOptions(viewSelect(), 'cards')
    expect(container.querySelector('.entries-grid')).toBeInTheDocument()
  })

  it('tabla: muestra progreso, pending, priority y permite +1', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    const entry = mkEntry({ id: 1, quantity: 5, priority: true, pending: 'Ordered' })
    const { container } = render(
      <CollectionView entries={[entry]} mangas={[]} selectedProfile={null} onRefresh={onRefresh} />
    )
    await user.selectOptions(viewSelect(), 'table')

    expect(container.querySelector('.pending-text').textContent).toBe('Ordered')
    expect(container.querySelector('.priority-indicator')).toBeInTheDocument()
    expect(container.querySelector('.table-progress-bar')).toBeInTheDocument()

    await user.click(screen.getByTitle('Add 1 volume'))
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1))

    await user.click(screen.getByTitle('Edit entry'))
    expect(screen.getByText('edit-entry-open')).toBeInTheDocument()
  })

  it('una serie completa con prioridad no muestra indicadores de prioridad', async () => {
    const user = userEvent.setup()
    const complete = mkEntry({
      id: 1,
      quantity: 10,
      priority: true,
      manga: mkManga({ id: 1, name: 'Complete', volumes: 10 }),
    })
    const { container } = render(
      <CollectionView entries={[complete]} mangas={[]} selectedProfile={null} />
    )

    expect(container.querySelector('.card-cover-priority')).toBeNull()
    expect(container.querySelector('.priority-badge')).toBeNull()

    await user.selectOptions(viewSelect(), 'table')
    expect(container.querySelector('.priority-indicator')).toBeNull()

    await user.selectOptions(viewSelect(), 'compact')
    expect(container.querySelector('.compact-priority')).toBeNull()
  });

  it('tabla: serie completa no muestra +1 ni series sin total barra', async () => {
    const user = userEvent.setup()
    const complete = mkEntry({ id: 1, quantity: 10, manga: mkManga({ id: 1, name: 'Complete', volumes: 10 }) })
    const noVol = mkEntry({ id: 2, quantity: 3, manga: mkManga({ id: 2, name: 'NoVol', volumes: 0 }) })
    const { container } = render(<CollectionView entries={[complete, noVol]} mangas={[]} selectedProfile={null} />)
    await user.selectOptions(viewSelect(), 'table')

    expect(screen.queryByTitle('Add 1 volume')).toBeNull()
    expect(container.querySelectorAll('.table-progress-bar').length).toBe(1)
    expect(container.querySelector('.completion-percent')).toBeInTheDocument()
  })

  it('tabla: actualiza sin refrescar si la respuesta no es ok', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    render(<CollectionView entries={[mkEntry({ id: 1, quantity: 5 })]} mangas={[]} selectedProfile={null} onRefresh={onRefresh} />)
    await user.selectOptions(viewSelect(), 'table')

    await user.click(screen.getByTitle('Add 1 volume'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/entry', expect.objectContaining({ method: 'POST' })))
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('tabla: loguea error si el update falla', async () => {
    const user = userEvent.setup()
    global.fetch.mockRejectedValueOnce(new Error('boom'))
    render(<CollectionView entries={[mkEntry({ id: 1, quantity: 5 })]} mangas={[]} selectedProfile={null} onRefresh={vi.fn()} />)
    await user.selectOptions(viewSelect(), 'table')

    await user.click(screen.getByTitle('Add 1 volume'))
    await waitFor(() => expect(global.console.error).toHaveBeenCalledWith('Error updating quantity:', expect.any(Error)))
  })

  it('compact: badges, pending, barra y +1', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    const entry = mkEntry({ id: 1, quantity: 2, priority: true, pending: 'P', manga: mkManga({ id: 1, name: 'Alpha', volumes: 5 }) })
    const complete = mkEntry({ id: 2, quantity: 10, manga: mkManga({ id: 2, name: 'Done', volumes: 10 }) })
    const { container } = render(
      <CollectionView entries={[entry, complete]} mangas={[]} selectedProfile={null} onRefresh={onRefresh} />
    )
    await user.selectOptions(viewSelect(), 'compact')

    expect(container.querySelector('.compact-priority')).toBeInTheDocument()
    expect(container.querySelector('.compact-pending')).toBeInTheDocument()
    expect(container.querySelector('.compact-bar')).toBeInTheDocument()
    expect(container.querySelector('.compact-status.complete').textContent.trim()).toBe('✅')
    expect(screen.getByTitle('Add 1 volume')).toBeInTheDocument()

    await user.click(screen.getByTitle('Add 1 volume'))
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1))

    await user.click(screen.getAllByTitle('Edit entry')[0])
    expect(screen.getByText('edit-entry-open')).toBeInTheDocument()
  })

  it('compact: sin total no muestra barra ni +1', async () => {
    const user = userEvent.setup()
    const entry = mkEntry({ id: 1, quantity: 2, manga: mkManga({ id: 1, name: 'Alpha', volumes: 0 }) })
    const { container } = render(<CollectionView entries={[entry]} mangas={[]} selectedProfile={null} />)
    await user.selectOptions(viewSelect(), 'compact')

    expect(container.querySelector('.compact-bar')).toBeNull()
    expect(screen.queryByTitle('Add 1 volume')).toBeNull()
  })

  it('cards: usa la portada del mapa cuando existe', async () => {
    coverAll.mockResolvedValue({ 1: { url: 'cover-url.jpg', isAdult: false } })
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    const entry = mkEntry({ id: 1, quantity: 5, priority: true, pending: 'P' })
    const { container } = render(
      <CollectionView entries={[entry]} mangas={[]} selectedProfile={null} onRefresh={onRefresh} />
    )

    await waitFor(() => expect(container.querySelector('.card-cover-img')).toBeTruthy())
    expect(container.querySelector('.card-cover-img').getAttribute('src')).toBe('cover-url.jpg')
    expect(container.querySelector('.card-cover-priority')).toBeInTheDocument()
    expect(container.querySelector('.pending-info')).toBeInTheDocument()
    expect(container.querySelectorAll('.chip').length).toBe(2)

    await user.click(screen.getByTitle('Add 1 volume'))
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1))
  })

  it('cards: tolera coverAll que devuelve null', async () => {
    coverAll.mockResolvedValue(null)
    const { container } = render(<CollectionView entries={[mkEntry({ id: 1 })]} mangas={[]} selectedProfile={null} />)
    expect(container.querySelector('.card-cover-initials')).toBeInTheDocument()
  })

  it('cards: inicial "?" si el título está vacío', () => {
    const entry = mkEntry({ id: 1, quantity: 1, manga: mkManga({ id: 1, name: '', volumes: 0 }) })
    const { container } = render(<CollectionView entries={[entry]} mangas={[]} selectedProfile={null} />)
    expect(container.querySelector('.card-cover-initials').textContent).toBe('?')
  })

  it('cards: chips según format/publisher presentes', () => {
    const onlyFormat = mkEntry({ id: 1, manga: mkManga({ id: 1, name: 'FOnly', volumes: 5, publisher: undefined }) })
    const onlyPublisher = mkEntry({ id: 2, manga: mkManga({ id: 2, name: 'POnly', volumes: 5, format: undefined }) })
    const neither = mkEntry({
      id: 3,
      manga: mkManga({ id: 3, name: 'None', volumes: 5, format: undefined, publisher: undefined }),
    })
    const { container } = render(<CollectionView entries={[onlyFormat, onlyPublisher, neither]} mangas={[]} selectedProfile={null} />)
    expect(container.querySelectorAll('.chip').length).toBe(2)
  })

  it('abre y cierra el modal de edición de entry', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    global.fetch.mockImplementation((url) =>
      String(url).includes('/filters/')
        ? Promise.resolve({ ok: true, json: async () => [] })
        : Promise.resolve({ ok: true, json: async () => ({}) })
    )
    render(<CollectionView entries={[mkEntry({ id: 1 })]} mangas={[]} selectedProfile={profile} onRefresh={onRefresh} />)

    await user.click(screen.getAllByTitle('Edit entry')[0])
    expect(screen.getByText('edit-entry-open')).toBeInTheDocument()
    expect(screen.getByText('entry-profile:1')).toBeInTheDocument()

    await user.click(screen.getByText('close-entry'))
    expect(screen.queryByText('edit-entry-open')).not.toBeInTheDocument()

    await user.click(screen.getAllByTitle('Edit entry')[0])
    await user.click(screen.getByText('confirm-entry'))
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('edit-entry-open')).not.toBeInTheDocument()
  })
})

describe('CollectionView: orden', () => {
  it.each([
    ['name', ['Alpha', 'Beta', 'Gamma']],
    ['quantity', ['Beta', 'Alpha', 'Gamma']],
    ['completion', ['Beta', 'Alpha', 'Gamma']],
    ['priority', ['Alpha', 'Gamma', 'Beta']],
    ['publisher', ['Beta', 'Gamma', 'Alpha']],
    ['format', ['Beta', 'Gamma', 'Alpha']],
  ])('ordena por %s', async (value, expected) => {
    const user = userEvent.setup()
    const { container } = render(<CollectionView entries={sortEntries()} mangas={[]} selectedProfile={null} />)
    await user.selectOptions(sortSelect(), value)
    expect(cardTitles(container)).toEqual(expected)
  })

  it('ordena por completion con series sin total como operandos', async () => {
    const user = userEvent.setup()
    const noVol = mkEntry({ id: 1, quantity: 1, manga: mkManga({ id: 1, name: 'NoVol', volumes: 0 }) })
    const mid = mkEntry({ id: 2, quantity: 5, manga: mkManga({ id: 2, name: 'Mid', volumes: 10 }) })
    const top = mkEntry({ id: 3, quantity: 10, manga: mkManga({ id: 3, name: 'Top', volumes: 10 }) })
    const { container } = render(<CollectionView entries={[noVol, mid, top]} mangas={[]} selectedProfile={null} />)
    await user.selectOptions(sortSelect(), 'completion')
    expect(cardTitles(container)).toEqual(['Top', 'Mid', 'NoVol'])
  })

  it('ordena por prioridad sin contar series completas', async () => {
    const user = userEvent.setup()
    const completa = mkEntry({
      id: 1,
      quantity: 10,
      priority: true,
      manga: mkManga({ id: 1, name: 'Complete', volumes: 10 }),
    })
    const incompleta = mkEntry({
      id: 2,
      quantity: 1,
      priority: true,
      manga: mkManga({ id: 2, name: 'Prio', volumes: 10 }),
    })
    const { container } = render(
      <CollectionView entries={[completa, incompleta]} mangas={[]} selectedProfile={null} />
    )
    await user.selectOptions(sortSelect(), 'priority')
    expect(cardTitles(container)).toEqual(['Prio', 'Complete'])
  });

  it('ordena por publisher/format tolerando campos ausentes', async () => {
    const user = userEvent.setup()
    const a = mkEntry({ id: 1, manga: mkManga({ id: 1, name: 'AAA', volumes: 5, publisher: undefined, format: undefined }) })
    const b = mkEntry({ id: 2, manga: mkManga({ id: 2, name: 'BBB', volumes: 5, publisher: undefined, format: undefined }) })
    const { container } = render(<CollectionView entries={[a, b]} mangas={[]} selectedProfile={null} />)

    await user.selectOptions(sortSelect(), 'publisher')
    expect(cardTitles(container)).toEqual(['AAA', 'BBB'])

    await user.selectOptions(sortSelect(), 'format')
    expect(cardTitles(container)).toEqual(['AAA', 'BBB'])
  })
})

describe('CollectionView: filtros de estado', () => {
  it('por defecto muestra todo', () => {
    const { container } = render(<CollectionView entries={filterEntries()} mangas={[]} selectedProfile={null} />)
    expect(cardTitles(container)).toEqual(['Complete', 'Incomplete', 'NoVol', 'PrioInc', 'WithPending'])
  })

  it.each([
    ['complete', ['Complete']],
    ['incomplete', ['Incomplete', 'NoVol', 'WithPending']],
    ['priority-incomplete', ['PrioInc']],
    ['priority', ['PrioInc']],
    ['pending', ['WithPending']],
  ])('filtra por estado %s', async (value, expected) => {
    const user = userEvent.setup()
    const { container } = render(<CollectionView entries={filterEntries()} mangas={[]} selectedProfile={null} />)
    await user.selectOptions(statusSelect(), value)
    expect(cardTitles(container)).toEqual(expected)
  })

  it('muestra empty state y limpia filtros desde el estado vacío', async () => {
    const user = userEvent.setup()
    render(<CollectionView entries={[mkEntry({ id: 1, quantity: 5 })]} mangas={[]} selectedProfile={null} />)
    await user.selectOptions(statusSelect(), 'complete')

    expect(screen.getByText('No entries found for the selected filters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Clear All Filters/ }))
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  it('limpia filtros con el botón del header', async () => {
    const user = userEvent.setup()
    const { container } = render(<CollectionView entries={filterEntries()} mangas={[]} selectedProfile={null} />)
    await user.selectOptions(statusSelect(), 'priority')

    await user.click(screen.getByRole('button', { name: /Clear Filters/ }))
    expect(cardTitles(container).length).toBe(5)
    expect(screen.queryByRole('button', { name: /Clear Filters/ })).not.toBeInTheDocument()
  })
})

describe('CollectionView: filtros de editorial y formato', () => {
  const mockFilterFetch = () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url)
      if (u.includes('/filters/publishers')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: 'Ivrea', count: 1 }, { id: 2, name: 'Panini', count: 1 }] })
      }
      if (u.includes('/filters/formats')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: 'Tankoubon', count: 1 }, { id: 2, name: 'Bunko', count: 1 }] })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  }

  const catalogEntries = () => [
    mkEntry({
      id: 1,
      manga: mkManga({ id: 1, name: 'Alpha', publisher: { id: 1, name: 'Ivrea' }, format: { id: 1, name: 'Tankoubon' } }),
    }),
    mkEntry({
      id: 2,
      manga: mkManga({ id: 2, name: 'Beta', publisher: { id: 2, name: 'Panini' }, format: { id: 2, name: 'Bunko' } }),
    }),
  ]

  it('carga opciones y filtra por editorial y formato', async () => {
    const user = userEvent.setup()
    mockFilterFetch()
    const { container } = render(<CollectionView entries={catalogEntries()} mangas={[]} selectedProfile={profile} />)

    await waitFor(() => expect(screen.getByText('Ivrea (1)')).toBeInTheDocument())
    expect(screen.getByText('Bunko (1)')).toBeInTheDocument()

    await user.selectOptions(publisherSelect(), '2')
    expect(cardTitles(container)).toEqual(['Beta'])

    await user.selectOptions(publisherSelect(), 'all')
    await user.selectOptions(formatSelect(), '1')
    expect(cardTitles(container)).toEqual(['Alpha'])
  })

  it('filtra usando publisherId/formatId cuando falta el objeto', async () => {
    const user = userEvent.setup()
    mockFilterFetch()
    const orphan = mkEntry({
      id: 1,
      manga: { id: 1, name: 'Orphan', volumes: 5, publisherId: 2, formatId: 2 },
    })
    const { container } = render(<CollectionView entries={[orphan]} mangas={[]} selectedProfile={profile} />)

    await waitFor(() => expect(screen.getByText('Panini (1)')).toBeInTheDocument())
    await user.selectOptions(publisherSelect(), '2')
    expect(cardTitles(container)).toEqual(['Orphan'])
    await user.selectOptions(formatSelect(), '2')
    expect(cardTitles(container)).toEqual(['Orphan'])
  })

  it('no setea opciones si la respuesta no es ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => [] })
    render(<CollectionView entries={[mkEntry()]} mangas={[]} selectedProfile={profile} />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByText('Ivrea (1)')).not.toBeInTheDocument()
    expect(screen.getByText('All Publishers')).toBeInTheDocument()
  })

  it('captura errores al cargar las opciones', async () => {
    global.fetch.mockRejectedValue(new Error('nope'))
    render(<CollectionView entries={[mkEntry()]} mangas={[]} selectedProfile={profile} />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.getByText('All Formats')).toBeInTheDocument()
    expect(global.console.error).toHaveBeenCalledWith('Error loading filter options:', expect.any(Error))
  })
})

describe('CollectionView: portadas automáticas', () => {
  it('tolera fallo de coverAll', async () => {
    coverAll.mockRejectedValueOnce(new Error('no cover service'))
    const { container } = render(<CollectionView entries={[mkEntry({ id: 1 })]} mangas={[]} selectedProfile={null} />)
    await waitFor(() => expect(coverAll).toHaveBeenCalled())
    expect(container.querySelector('.card-cover-initials')).toBeInTheDocument()
  })

  it('ignora coverAll resuelto tras desmontar', async () => {
    const def = deferred()
    coverAll.mockReturnValue(def.promise)
    const { unmount } = render(<CollectionView entries={[]} mangas={[]} selectedProfile={null} />)
    unmount()
    def.resolve({ 1: 'x' })
    await Promise.resolve()
    expect(coverAll).toHaveBeenCalled()
  })

  it('auto-vincula la portada de un manga nuevo', async () => {
    coverAuto.mockResolvedValue('auto-cover.jpg')
    const e1 = mkEntry({ id: 1, manga: mkManga({ id: 1, name: 'Alpha' }) })
    const e2 = mkEntry({ id: 2, manga: mkManga({ id: 2, name: 'Beta' }) })
    const props = { mangas: [], selectedProfile: null }
    const { container, rerender } = render(<CollectionView entries={[e1]} {...props} />)

    rerender(<CollectionView entries={[e1, e2]} {...props} />)
    await waitFor(() => expect(coverAuto).toHaveBeenCalledWith(2))
    await waitFor(() => expect(container.querySelector('.card-cover-img')).toBeTruthy())
  })

  it('no vincula nada si coverAuto no devuelve url', async () => {
    coverAuto.mockResolvedValue(null)
    const e1 = mkEntry({ id: 1, manga: mkManga({ id: 1, name: 'Alpha' }) })
    const e2 = mkEntry({ id: 2, manga: mkManga({ id: 2, name: 'Beta' }) })
    const props = { mangas: [], selectedProfile: null }
    const { container, rerender } = render(<CollectionView entries={[e1]} {...props} />)

    rerender(<CollectionView entries={[e1, e2]} {...props} />)
    await waitFor(() => expect(coverAuto).toHaveBeenCalledWith(2))
    expect(container.querySelector('.card-cover-img')).toBeNull()
  })

  it('detiene la cola si coverAuto falla', async () => {
    coverAuto.mockRejectedValueOnce(new Error('429'))
    const e1 = mkEntry({ id: 1, manga: mkManga({ id: 1, name: 'Alpha' }) })
    const e2 = mkEntry({ id: 2, manga: mkManga({ id: 2, name: 'Beta' }) })
    const props = { mangas: [], selectedProfile: null }
    const { rerender } = render(<CollectionView entries={[e1]} {...props} />)

    rerender(<CollectionView entries={[e1, e2]} {...props} />)
    await waitFor(() => expect(coverAuto).toHaveBeenCalledWith(2))
  })

  it('cancela la cola al desmontar', async () => {
    const def = deferred()
    coverAuto.mockReturnValue(def.promise)
    const e1 = mkEntry({ id: 1, manga: mkManga({ id: 1, name: 'Alpha' }) })
    const e2 = mkEntry({ id: 2, manga: mkManga({ id: 2, name: 'Beta' }) })
    const e3 = mkEntry({ id: 3, manga: mkManga({ id: 3, name: 'Gamma' }) })
    const props = { mangas: [], selectedProfile: null }
    const { rerender, unmount } = render(<CollectionView entries={[e1]} {...props} />)

    rerender(<CollectionView entries={[e1, e2, e3]} {...props} />)
    await waitFor(() => expect(coverAuto).toHaveBeenCalledWith(2))
    unmount()
    def.resolve(null)
    await waitFor(() => expect(coverAuto).toHaveBeenCalledTimes(1))
  })

  it('no re-consulta si no hay mangas nuevos', async () => {
    const e1 = mkEntry({ id: 1, manga: mkManga({ id: 1, name: 'Alpha' }) })
    const props = { mangas: [], selectedProfile: null }
    const { rerender } = render(<CollectionView entries={[e1]} {...props} />)

    rerender(<CollectionView entries={[e1]} {...props} />)
    await Promise.resolve()
    expect(coverAuto).not.toHaveBeenCalled()
  })
})

describe('CollectionView: portadas +18 (blur y reveal)', () => {
  const adultEntry = () => mkEntry({ id: 1, manga: mkManga({ id: 1, name: 'Adult' }) })

  it('card +18: aplica la clase de blur y el badge +18', async () => {
    coverAll.mockResolvedValue({ 1: { url: 'adult.jpg', isAdult: true } })
    const { container } = render(<CollectionView entries={[adultEntry()]} mangas={[]} selectedProfile={null} />)

    await waitFor(() => expect(container.querySelector('.card-cover-img')).toBeTruthy())
    expect(container.querySelector('.card-cover').className).toContain('card-cover--adult')
    expect(container.querySelector('.card-cover-adult')).toHaveTextContent('+18')
  })

  it('card no adulta: sin blur ni badge', async () => {
    coverAll.mockResolvedValue({ 1: { url: 'safe.jpg', isAdult: false } })
    const { container } = render(<CollectionView entries={[adultEntry()]} mangas={[]} selectedProfile={null} />)

    await waitFor(() => expect(container.querySelector('.card-cover-img')).toBeTruthy())
    expect(container.querySelector('.card-cover').className).not.toContain('card-cover--adult')
    expect(container.querySelector('.card-cover-adult')).toBeNull()
  })

  it('con la preferencia ON el reveal es por hover', async () => {
    coverAll.mockResolvedValue({ 1: { url: 'adult.jpg', isAdult: true } })
    const { container } = render(
      <CollectionView entries={[adultEntry()]} mangas={[]} selectedProfile={null} showAdultCovers />
    )

    await waitFor(() => expect(container.querySelector('.card-cover-img')).toBeTruthy())
    const cover = container.querySelector('.card-cover')
    expect(cover.className).toContain('card-cover--reveal-hover')
    expect(cover.className).not.toContain('card-cover--revealed')
  })

  it('con la preferencia OFF el click revela y vuelve a difuminar sin abrir la card', async () => {
    coverAll.mockResolvedValue({ 1: { url: 'adult.jpg', isAdult: true } })
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    const { container } = render(
      <CollectionView entries={[adultEntry()]} mangas={[]} selectedProfile={null} onRefresh={onRefresh} />
    )

    await waitFor(() => expect(container.querySelector('.card-cover-img')).toBeTruthy())
    const cover = () => container.querySelector('.card-cover')

    await user.click(cover())
    await waitFor(() => expect(cover().className).toContain('card-cover--revealed'))
    // The reveal click does not fire the card's real action.
    expect(screen.queryByText('edit-entry-open')).not.toBeInTheDocument()

    await user.click(cover())
    expect(cover().className).not.toContain('card-cover--revealed')
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('el auto-match (string) se pinta como portada no adulta', async () => {
    coverAuto.mockResolvedValue('auto-cover.jpg')
    const e1 = mkEntry({ id: 1, manga: mkManga({ id: 1, name: 'Alpha' }) })
    const e2 = mkEntry({ id: 2, manga: mkManga({ id: 2, name: 'Beta' }) })
    const props = { mangas: [], selectedProfile: null }
    const { container, rerender } = render(<CollectionView entries={[e1]} {...props} />)

    rerender(<CollectionView entries={[e1, e2]} {...props} />)
    await waitFor(() => expect(container.querySelector('.card-cover-img')).toBeTruthy())
    expect(container.querySelector('.card-cover-img').getAttribute('src')).toBe('auto-cover.jpg')
    expect(container.querySelector('.card-cover').className).not.toContain('card-cover--adult')
  })
})
