import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test-utils'
import userEvent from '@testing-library/user-event'

// setup.js mockea AddEntryModal globalmente; acá usamos el componente real.
vi.unmock('../../components/AddEntryModal')

import AddEntryModal from '../../components/AddEntryModal'

const mangas = [
  { id: 1, name: 'Alpha', volumes: 10 },
  { id: 2, name: 'Beta', volumes: 0 },
]

const setup = (overrides = {}) => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    mangas,
    selectedProfile: { id: 7, name: 'Prof' },
    ...overrides,
  }
  const utils = render(<AddEntryModal {...props} />)
  return { props, ...utils }
}

const submit = (container) => fireEvent.submit(container.querySelector('form'))

const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const findCall = (url) => global.fetch.mock.calls.find((c) => c[0] === url)

const bodyOf = (url) => JSON.parse(findCall(url)[1].body)

beforeEach(() => {
  global.fetch = vi.fn()
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('AddEntryModal: render y validaciones', () => {
  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(
      <AddEntryModal isOpen={false} onClose={vi.fn()} mangas={[]} onSuccess={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza las opciones con y sin total de volúmenes', () => {
    setup()
    expect(screen.getByRole('option', { name: 'Alpha (10 volumes)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument()
  })

  it('exige manga y cantidad', async () => {
    const { container } = setup()
    submit(container)
    expect(await screen.findByText('Please select a manga and enter quantity')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('exige cantidad aunque haya manga elegido', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    await user.selectOptions(screen.getByLabelText(/Manga/), '1')
    submit(container)
    expect(await screen.findByText('Please select a manga and enter quantity')).toBeInTheDocument()
  })

  it('exige un perfil seleccionado', async () => {
    const user = userEvent.setup()
    const { container } = setup({ selectedProfile: undefined })
    await user.selectOptions(screen.getByLabelText(/Manga/), '1')
    await user.type(screen.getByLabelText(/Quantity Owned/), '3')
    submit(container)
    expect(
      await screen.findByText('Elegí un perfil antes de guardar (volvé a la selección de perfiles).')
    ).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('AddEntryModal: alta', () => {
  it('crea la entrada, llama callbacks y limpia el formulario', async () => {
    const user = userEvent.setup()
    const { props, container } = setup()
    await user.selectOptions(screen.getByLabelText(/Manga/), '1')
    await user.type(screen.getByLabelText(/Quantity Owned/), '5')
    await user.type(screen.getByLabelText(/Pending/), 'Ordered')
    await user.click(screen.getByLabelText(/Priority item/))
    submit(container)

    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(1))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(findCall('/api/entry')[1].method).toBe('POST')
    expect(bodyOf('/api/entry')).toMatchObject({
      id: 0,
      mangaId: 1,
      profileId: 7,
      quantity: 5,
      pending: 'Ordered',
      priority: true,
    })
    expect(bodyOf('/api/entry').manga).toEqual(mangas[0])
    expect(screen.getByLabelText(/Quantity Owned/).value).toBe('')
    expect(screen.getByLabelText(/Pending/).value).toBe('')
    expect(screen.getByLabelText(/Priority item/)).not.toBeChecked()
  })

  it('envía pending null cuando no se completa', async () => {
    const user = userEvent.setup()
    const { props, container } = setup()
    await user.selectOptions(screen.getByLabelText(/Manga/), '2')
    await user.type(screen.getByLabelText(/Quantity Owned/), '1')
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(bodyOf('/api/entry')).toMatchObject({ pending: null, priority: false })
  })

  it('muestra el mensaje de error del backend al crear', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    await user.selectOptions(screen.getByLabelText(/Manga/), '1')
    await user.type(screen.getByLabelText(/Quantity Owned/), '5')
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Nope' }) })
    submit(container)
    expect(await screen.findByText('Failed to create entry: Nope')).toBeInTheDocument()
  })

  it('usa "Unknown error" cuando el backend no da mensaje al crear', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    await user.selectOptions(screen.getByLabelText(/Manga/), '1')
    await user.type(screen.getByLabelText(/Quantity Owned/), '5')
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    submit(container)
    expect(await screen.findByText('Failed to create entry: Unknown error')).toBeInTheDocument()
  })

  it('captura errores de red al crear', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    await user.selectOptions(screen.getByLabelText(/Manga/), '1')
    await user.type(screen.getByLabelText(/Quantity Owned/), '5')
    global.fetch.mockRejectedValueOnce(new Error('boom'))
    submit(container)
    expect(await screen.findByText('Error creating entry: boom')).toBeInTheDocument()
  })
})

describe('AddEntryModal: edición', () => {
  const editEntry = {
    id: 3,
    mangaId: 1,
    quantity: 5,
    pending: 'Ordered',
    priority: true,
    manga: { volumes: 10 },
  }

  it('precarga los datos, muestra acciones rápidas y actualiza', async () => {
    const user = userEvent.setup()
    const { props, container } = setup({ editEntry })
    expect(screen.getByText('Edit Entry')).toBeInTheDocument()
    expect(screen.getByText('Cannot change manga for existing entry')).toBeInTheDocument()
    expect(screen.getByLabelText(/Manga/)).toBeDisabled()
    expect(screen.getByLabelText(/Quantity Owned/)).toHaveValue(5)
    expect(screen.getByLabelText(/Pending/)).toHaveValue('Ordered')
    expect(screen.getByLabelText(/Priority item/)).toBeChecked()
    expect(screen.getByText(/5\/10 volumes/)).toBeInTheDocument()
    expect(screen.getByText(/50% complete/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+1' }))
    expect(screen.getByLabelText(/Quantity Owned/)).toHaveValue(6)
    await user.click(screen.getByRole('button', { name: '-1' }))
    expect(screen.getByLabelText(/Quantity Owned/)).toHaveValue(5)

    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(1))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(bodyOf('/api/entry')).toMatchObject({ id: 3, mangaId: 1, quantity: 5 })
    // en edición no se limpia el formulario
    expect(screen.getByLabelText(/Quantity Owned/)).toHaveValue(5)
  })

  it('deshabilita -1 en 0 y +1 en el máximo', async () => {
    const user = userEvent.setup()
    setup({
      editEntry: { id: 1, mangaId: 1, quantity: 0, pending: '', priority: false, manga: { volumes: 2 } },
    })
    const minus = screen.getByRole('button', { name: '-1' })
    const plus = screen.getByRole('button', { name: '+1' })
    expect(minus).toBeDisabled()
    await user.click(plus)
    expect(screen.getByLabelText(/Quantity Owned/)).toHaveValue(1)
    expect(minus).toBeEnabled()
    await user.click(plus)
    expect(screen.getByLabelText(/Quantity Owned/)).toHaveValue(2)
    expect(plus).toBeDisabled()
  })

  it('no muestra acciones rápidas ni progreso si el manga no tiene volúmenes', () => {
    const { container } = setup({
      editEntry: { id: 1, mangaId: 1, quantity: 3, pending: '', priority: false, manga: { volumes: 0 } },
    })
    expect(container.querySelector('.quick-actions')).toBeNull()
    expect(screen.queryByText(/complete/)).not.toBeInTheDocument()
  })

  it('edita tolerando campos opcionales ausentes', async () => {
    const { props, container } = setup({ editEntry: { id: 9, mangaId: 2, quantity: 2, manga: {} } })
    expect(screen.getByLabelText(/Quantity Owned/)).toHaveAttribute('max', '999')
    expect(screen.getByLabelText(/Pending/)).toHaveValue('')
    expect(screen.getByLabelText(/Priority item/)).not.toBeChecked()
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(bodyOf('/api/entry')).toMatchObject({ id: 9, quantity: 2, pending: null, priority: false })
  })

  it('muestra el mensaje de error del backend al editar', async () => {
    const { container } = setup({ editEntry })
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Nah' }) })
    submit(container)
    expect(await screen.findByText('Failed to update entry: Nah')).toBeInTheDocument()
  })

  it('usa "Unknown error" al editar sin mensaje', async () => {
    const { container } = setup({ editEntry })
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    submit(container)
    expect(await screen.findByText('Failed to update entry: Unknown error')).toBeInTheDocument()
  })

  it('captura errores de red al editar', async () => {
    const { container } = setup({ editEntry })
    global.fetch.mockRejectedValueOnce(new Error('boom'))
    submit(container)
    expect(await screen.findByText('Error updating entry: boom')).toBeInTheDocument()
  })
})

describe('AddEntryModal: estado de envío', () => {
  it('muestra "Creating..." mientras crea', async () => {
    const user = userEvent.setup()
    const def = deferred()
    global.fetch.mockReturnValueOnce(def.promise)
    const { props, container } = setup()
    await user.selectOptions(screen.getByLabelText(/Manga/), '1')
    await user.type(screen.getByLabelText(/Quantity Owned/), '5')
    submit(container)
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
    def.resolve({ ok: true, json: async () => ({}) })
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
  })

  it('muestra "Updating..." mientras edita', async () => {
    const def = deferred()
    global.fetch.mockReturnValueOnce(def.promise)
    const { props, container } = setup({
      editEntry: { id: 3, mangaId: 1, quantity: 5, pending: '', priority: false, manga: { volumes: 10 } },
    })
    submit(container)
    expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled()
    def.resolve({ ok: true, json: async () => ({}) })
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
  })

  it('cierra el modal con el botón de cancelar', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '×' }))
    expect(props.onClose).toHaveBeenCalledTimes(2)
  })
})
