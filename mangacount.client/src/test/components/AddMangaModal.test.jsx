import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '../test-utils'
import userEvent from '@testing-library/user-event'

// setup.js mockea AddMangaModal globalmente; acá usamos el componente real.
vi.unmock('../../components/AddMangaModal')

import AddMangaModal from '../../components/AddMangaModal'

const formats = [
  { id: 1, name: 'Tankoubon' },
  { id: 2, name: 'Bunko' },
]
const publishers = [{ id: 1, name: 'Ivrea' }]

const catalogFetch = () => {
  global.fetch.mockImplementation((url, options = {}) => {
    const u = String(url)
    const method = (options.method || 'GET').toUpperCase()
    if (u === '/api/format' && method === 'GET') {
      return Promise.resolve({ ok: true, json: async () => formats })
    }
    if (u === '/api/publisher' && method === 'GET') {
      return Promise.resolve({ ok: true, json: async () => publishers })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })
}

const setup = (overrides = {}) => {
  const props = { isOpen: true, onClose: vi.fn(), onSuccess: vi.fn(), ...overrides }
  const utils = render(<AddMangaModal {...props} />)
  return { props, ...utils }
}

const submit = (container) => fireEvent.submit(container.querySelector('form'))

const findCall = (url) => global.fetch.mock.calls.find((c) => c[0] === url)
const bodyOf = (url) => JSON.parse(findCall(url)[1].body)

// El catálogo se carga con GET; estos helpers filtran las mutaciones reales.
const methodCalls = (url, method) =>
  global.fetch.mock.calls.filter(
    (c) => c[0] === url && (c[1]?.method || 'GET').toUpperCase() === method
  )
const postCalls = (url) => methodCalls(url, 'POST')
const lastPostBody = (url) => JSON.parse(postCalls(url).at(-1)[1].body)

const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const waitCatalog = async () =>
  waitFor(() => expect(screen.getByRole('option', { name: 'Tankoubon' })).toBeInTheDocument())

const fillRequired = async (user, { name = 'Naruto', format = '1', publisher = '1' } = {}) => {
  if (name !== null) await user.type(screen.getByLabelText(/Manga Name/), name)
  if (format !== null) await user.selectOptions(screen.getByLabelText(/Format/), format)
  if (publisher !== null) await user.selectOptions(screen.getByLabelText(/Publisher/), publisher)
}

beforeEach(() => {
  global.fetch = vi.fn()
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('AddMangaModal: carga de catálogo', () => {
  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(
      <AddMangaModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('carga formats y publishers al abrir', async () => {
    catalogFetch()
    setup()
    await waitCatalog()
    expect(screen.getByRole('option', { name: 'Bunko' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Ivrea' })).toBeInTheDocument()
  })

  it('no setea el catálogo si la respuesta no es ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => [] })
    setup()
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByRole('option', { name: 'Tankoubon' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Ivrea' })).not.toBeInTheDocument()
  })

  it('captura errores al cargar el catálogo', async () => {
    global.fetch.mockRejectedValue(new Error('boom'))
    setup()
    await waitFor(() =>
      expect(global.console.error).toHaveBeenCalledWith('Error loading formats:', expect.any(Error))
    )
    expect(global.console.error).toHaveBeenCalledWith('Error loading publishers:', expect.any(Error))
  })
})

describe('AddMangaModal: validaciones', () => {
  it('exige el nombre', async () => {
    catalogFetch()
    const { container } = setup()
    await waitCatalog()
    submit(container)
    expect(await screen.findByText('Please enter a manga name')).toBeInTheDocument()
  })

  it('exige el formato', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { container } = setup()
    await waitCatalog()
    await fillRequired(user, { format: null, publisher: null })
    submit(container)
    expect(await screen.findByText('Please select a format')).toBeInTheDocument()
  })

  it('exige la editorial', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { container } = setup()
    await waitCatalog()
    await fillRequired(user, { publisher: null })
    submit(container)
    expect(await screen.findByText('Please select a publisher')).toBeInTheDocument()
  })
})

describe('AddMangaModal: alta', () => {
  it('crea el manga con volúmenes opcionales en 0 y limpia el form', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { props, container } = setup()
    await waitCatalog()
    await fillRequired(user, { name: '  Naruto  ' })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    submit(container)

    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(1))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(findCall('/api/manga')[1].method).toBe('POST')
    expect(bodyOf('/api/manga')).toEqual({
      id: 0,
      name: 'Naruto',
      volumes: 0,
      formatId: 1,
      publisherId: 1,
      isAdult: false,
    })
    expect(screen.getByLabelText(/Manga Name/).value).toBe('')
  })

  it('crea el manga marcado como +18', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { props, container } = setup()
    await waitCatalog()
    await fillRequired(user)
    await user.click(screen.getByLabelText(/Contenido \+18/))
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(bodyOf('/api/manga')).toMatchObject({ isAdult: true })
  });

  it('crea el manga parseando los volúmenes', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { props, container } = setup()
    await waitCatalog()
    await fillRequired(user)
    await user.type(screen.getByLabelText(/Total Volumes/), '42')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(bodyOf('/api/manga').volumes).toBe(42)
  })

  it('muestra el error del backend al crear', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { container } = setup()
    await waitCatalog()
    await fillRequired(user)
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Nope' }) })
    submit(container)
    expect(await screen.findByText('Failed to create manga: Nope')).toBeInTheDocument()
  })

  it('usa "Unknown error" al crear sin mensaje', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { container } = setup()
    await waitCatalog()
    await fillRequired(user)
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    submit(container)
    expect(await screen.findByText('Failed to create manga: Unknown error')).toBeInTheDocument()
  })

  it('captura errores de red al crear', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { container } = setup()
    await waitCatalog()
    await fillRequired(user)
    global.fetch.mockRejectedValueOnce(new Error('boom'))
    submit(container)
    expect(await screen.findByText('Error creating manga: boom')).toBeInTheDocument()
  })
})

describe('AddMangaModal: edición', () => {
  const editManga = { id: 3, name: 'Old', volumes: 7, formatId: 2, publisherId: 1 }

  it('precarga los datos y actualiza con PUT', async () => {
    catalogFetch()
    const { props, container } = setup({ editManga })
    await waitCatalog()
    expect(screen.getByText('Edit Manga')).toBeInTheDocument()
    expect(screen.getByLabelText(/Manga Name/)).toHaveValue('Old')
    expect(screen.getByLabelText(/Total Volumes/)).toHaveValue(7)
    expect(screen.getByLabelText(/Format/)).toHaveValue('2')
    expect(screen.getByLabelText(/Publisher/)).toHaveValue('1')

    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(1))
    expect(findCall('/api/manga/3')[1].method).toBe('PUT')
    expect(bodyOf('/api/manga/3')).toMatchObject({ id: 3, name: 'Old', volumes: 7 })
    // en edición no se limpia el formulario
    expect(screen.getByLabelText(/Manga Name/)).toHaveValue('Old')
  })

  it('precarga el flag +18 y permite desmarcarlo', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { props, container } = setup({ editManga: { ...editManga, isAdult: true } })
    await waitCatalog()
    expect(screen.getByLabelText(/Contenido \+18/)).toBeChecked()

    await user.click(screen.getByLabelText(/Contenido \+18/))
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(bodyOf('/api/manga/3')).toMatchObject({ isAdult: false })
  });

  it('precarga vacíos los campos opcionales ausentes', async () => {
    catalogFetch()
    setup({ editManga: { id: 4, name: 'X' } })
    await waitCatalog()
    expect(screen.getByLabelText(/Total Volumes/)).toHaveValue(null)
    expect(screen.getByLabelText(/Format/)).toHaveValue('')
    expect(screen.getByLabelText(/Publisher/)).toHaveValue('')
  })

  it('muestra el error del backend al editar', async () => {
    catalogFetch()
    const { container } = setup({ editManga })
    await waitCatalog()
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Nah' }) })
    submit(container)
    expect(await screen.findByText('Failed to update manga: Nah')).toBeInTheDocument()
  })

  it('captura errores de red al editar', async () => {
    catalogFetch()
    const { container } = setup({ editManga })
    await waitCatalog()
    global.fetch.mockRejectedValueOnce(new Error('boom'))
    submit(container)
    expect(await screen.findByText('Error updating manga: boom')).toBeInTheDocument()
  })
})

describe('AddMangaModal: agregar formato inline', () => {
  it('agrega un formato nuevo y lo selecciona', async () => {
    const user = userEvent.setup()
    catalogFetch()
    setup()
    await waitCatalog()
    await user.click(screen.getByTitle('Add new format'))
    await user.type(screen.getByPlaceholderText('New format name'), '  Deluxe  ')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 3, name: 'Deluxe' }) })
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(screen.getByRole('option', { name: 'Deluxe' })).toBeInTheDocument())
    expect(screen.getByLabelText(/Format/)).toHaveValue('3')
    expect(screen.queryByPlaceholderText('New format name')).not.toBeInTheDocument()
    expect(lastPostBody('/api/format')).toEqual({ name: 'Deluxe' })
  })

  it('agrega formato con Enter y cancela el panel', async () => {
    const user = userEvent.setup()
    catalogFetch()
    setup()
    await waitCatalog()
    await user.click(screen.getByTitle('Add new format'))
    const input = screen.getByPlaceholderText('New format name')

    // tecla distinta de Enter no dispara el alta
    fireEvent.keyPress(input, { key: 'a', charCode: 97 })
    expect(postCalls('/api/format')).toHaveLength(0)

    await user.type(input, 'Omnibus')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 4, name: 'Omnibus' }) })
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Omnibus' })).toBeInTheDocument())

    await user.click(screen.getByTitle('Add new format'))
    await user.click(within(document.querySelector('.add-new-section')).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByPlaceholderText('New format name')).not.toBeInTheDocument()
  })

  it('ignora el alta si el nombre está vacío o falla la petición', async () => {
    const user = userEvent.setup()
    catalogFetch()
    setup()
    await waitCatalog()
    await user.click(screen.getByTitle('Add new format'))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(postCalls('/api/format')).toHaveLength(0)

    await user.type(screen.getByPlaceholderText('New format name'), 'Broken')
    // respuesta no-ok: no agrega nada y el panel queda abierto
    global.fetch.mockResolvedValueOnce({ ok: false })
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Broken' })).not.toBeInTheDocument())
    expect(screen.getByPlaceholderText('New format name')).toBeInTheDocument()

    global.fetch.mockRejectedValueOnce(new Error('boom'))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() =>
      expect(global.console.error).toHaveBeenCalledWith('Error adding format:', expect.any(Error))
    )
  })
})

describe('AddMangaModal: agregar editorial inline', () => {
  it('agrega una editorial nueva con Enter', async () => {
    const user = userEvent.setup()
    catalogFetch()
    setup()
    await waitCatalog()
    await user.click(screen.getByTitle('Add new publisher'))
    const input = screen.getByPlaceholderText('New publisher name')
    fireEvent.keyPress(input, { key: 'a', charCode: 97 })
    expect(postCalls('/api/publisher')).toHaveLength(0)

    await user.type(input, 'Panini')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 2, name: 'Panini' }) })
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Panini' })).toBeInTheDocument())
    expect(postCalls('/api/publisher')).toHaveLength(1)
    expect(screen.getByLabelText(/Publisher/)).toHaveValue('2')
  })

  it('cancela el panel de editorial', async () => {
    const user = userEvent.setup()
    catalogFetch()
    setup()
    await waitCatalog()
    await user.click(screen.getByTitle('Add new publisher'))
    await user.click(within(document.querySelector('.add-new-section')).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByPlaceholderText('New publisher name')).not.toBeInTheDocument()
  })

  it('ignora el alta si el nombre está vacío o falla la petición', async () => {
    const user = userEvent.setup()
    catalogFetch()
    setup()
    await waitCatalog()
    await user.click(screen.getByTitle('Add new publisher'))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(postCalls('/api/publisher')).toHaveLength(0)

    await user.type(screen.getByPlaceholderText('New publisher name'), 'Broken')
    // respuesta no-ok: no agrega nada y el panel queda abierto
    global.fetch.mockResolvedValueOnce({ ok: false })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Broken' })).not.toBeInTheDocument())
    expect(screen.getByPlaceholderText('New publisher name')).toBeInTheDocument()

    global.fetch.mockRejectedValueOnce(new Error('boom'))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() =>
      expect(global.console.error).toHaveBeenCalledWith('Error adding publisher:', expect.any(Error))
    )
  })
})

describe('AddMangaModal: estado de envío y cierre', () => {
  it('muestra "Creating..." mientras crea', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const def = deferred()
    const { props, container } = setup()
    await waitCatalog()
    await fillRequired(user)
    global.fetch.mockReturnValueOnce(def.promise)
    submit(container)
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
    def.resolve({ ok: true, json: async () => ({}) })
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
  })

  it('muestra "Updating..." mientras edita', async () => {
    catalogFetch()
    const def = deferred()
    const { props, container } = setup({
      editManga: { id: 3, name: 'Old', volumes: 7, formatId: 2, publisherId: 1 },
    })
    await waitCatalog()
    global.fetch.mockReturnValueOnce(def.promise)
    submit(container)
    expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled()
    def.resolve({ ok: true, json: async () => ({}) })
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
  })

  it('cierra el modal con cancelar y con la cruz', async () => {
    const user = userEvent.setup()
    catalogFetch()
    const { props } = setup()
    await waitCatalog()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: '×' }))
    expect(props.onClose).toHaveBeenCalledTimes(2)
  })
})
