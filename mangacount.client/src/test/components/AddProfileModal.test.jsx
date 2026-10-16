import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test-utils'
import userEvent from '@testing-library/user-event'

// setup.js mockea AddProfileModal globalmente; acá usamos el componente real.
vi.unmock('../../components/AddProfileModal')

import AddProfileModal from '../../components/AddProfileModal'

const setup = (overrides = {}) => {
  const props = { isOpen: true, onClose: vi.fn(), onSuccess: vi.fn(), ...overrides }
  const utils = render(<AddProfileModal {...props} />)
  return { props, ...utils }
}

const submit = (container) => fireEvent.submit(container.querySelector('form'))

const findCall = (url) => global.fetch.mock.calls.find((c) => c[0] === url)
const bodyOf = (url) => JSON.parse(findCall(url)[1].body)

const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

// Enrutador determinista de fetch para el modal de perfiles.
const routeFetch = (handlers = {}) => {
  global.fetch.mockImplementation((url, options = {}) => {
    const u = String(url)
    const method = (options.method || 'GET').toUpperCase()
    if (handlers.default) return handlers.default(u, method, options)
    if (u === '/api/profile' && method === 'GET') {
      return Promise.resolve(handlers.profiles ?? { ok: true, json: async () => [] })
    }
    if (u.startsWith('/api/profile/upload-picture/')) {
      return Promise.resolve(handlers.upload ?? { ok: true })
    }
    if (u === '/api/profile' && method === 'POST') {
      return Promise.resolve(handlers.create ?? { ok: true, json: async () => ({}) })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })
}

const uploadPicture = async (user) => {
  // La etiqueta cambia entre "Upload Picture" y "Change Picture".
  const input = screen.getByLabelText(/Picture/)
  const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
  await user.upload(input, file)
  await waitFor(() => expect(document.querySelector('img.preview-image')).toBeInTheDocument())
}

beforeEach(() => {
  global.fetch = vi.fn()
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('AddProfileModal: render y previsualización', () => {
  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(
      <AddProfileModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('muestra "?" sin nombre y la inicial en mayúscula al escribir', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    expect(container.querySelector('.preview-placeholder').textContent).toBe('?')
    await user.type(screen.getByLabelText(/Profile Name/), 'ana')
    expect(container.querySelector('.preview-placeholder').textContent).toBe('A')
  })

  it('precarga un perfil en edición con su imagen', () => {
    const { container } = setup({
      editProfile: { id: 5, name: 'Old', profilePicture: '/p.jpg', createdDate: '2020-01-01' },
    })
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    expect(screen.getByLabelText(/Profile Name/)).toHaveValue('Old')
    expect(container.querySelector('img.preview-image').getAttribute('src')).toBe('/p.jpg')
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('en edición sin imagen usa la inicial del nombre', () => {
    const { container } = setup({ editProfile: { id: 6, name: 'NoPic' } })
    expect(container.querySelector('img.preview-image')).toBeNull()
    expect(container.querySelector('.preview-placeholder').textContent).toBe('N')
  })

  it('valida que el nombre no esté vacío', async () => {
    const { container } = setup()
    submit(container)
    expect(await screen.findByText('Please enter a profile name')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('AddProfileModal: alta', () => {
  it('crea el perfil sin foto y limpia el formulario', async () => {
    const user = userEvent.setup()
    routeFetch()
    const { props, container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), '  Ana  ')
    submit(container)

    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(bodyOf('/api/profile')).toMatchObject({
      id: 0,
      name: 'Ana',
      profilePicture: null,
      isActive: true,
    })
    expect(typeof bodyOf('/api/profile').createdDate).toBe('string')
    expect(screen.getByLabelText(/Profile Name/).value).toBe('')
    expect(container.querySelector('img.preview-image')).toBeNull()
  })

  it('crea el perfil con foto, obtiene el id más reciente y la sube', async () => {
    const user = userEvent.setup()
    routeFetch({
      profiles: { ok: true, json: async () => [{ id: 1 }, { id: 11 }] },
    })
    const { props, container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), 'Ana')
    await uploadPicture(user)
    submit(container)

    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(findCall('/api/profile/upload-picture/11')).toBeTruthy()
    expect(findCall('/api/profile/upload-picture/11')[1].body).toBeInstanceOf(FormData)
  })

  it('usa id 1 si la lista de perfiles viene vacía', async () => {
    const user = userEvent.setup()
    routeFetch({ profiles: { ok: true, json: async () => [] } })
    const { props, container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), 'Ana')
    await uploadPicture(user)
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(findCall('/api/profile/upload-picture/1')).toBeTruthy()
  })

  it('usa id 1 si la consulta de perfiles no es ok', async () => {
    const user = userEvent.setup()
    routeFetch({ profiles: { ok: false, json: async () => [] } })
    const { props, container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), 'Ana')
    await uploadPicture(user)
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(findCall('/api/profile/upload-picture/1')).toBeTruthy()
  })

  it('usa id 1 si falla la consulta de perfiles', async () => {
    const user = userEvent.setup()
    routeFetch({
      default: (u, method) => {
        if (u === '/api/profile' && method === 'GET') return Promise.reject(new Error('boom'))
        if (u.startsWith('/api/profile/upload-picture/')) return Promise.resolve({ ok: true })
        return Promise.resolve({ ok: true, json: async () => ({}) })
      },
    })
    const { props, container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), 'Ana')
    await uploadPicture(user)
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(findCall('/api/profile/upload-picture/1')).toBeTruthy()
    expect(global.console.error).toHaveBeenCalledWith('Error getting latest profile ID:', expect.any(Error))
  })

  it('propaga el fallo de subida de la foto', async () => {
    const user = userEvent.setup()
    routeFetch({ upload: { ok: false } })
    const { props, container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), 'Ana')
    await uploadPicture(user)
    submit(container)
    expect(
      await screen.findByText('Error creating profile: Failed to upload profile picture')
    ).toBeInTheDocument()
    expect(props.onSuccess).not.toHaveBeenCalled()
  })

  it('muestra el error del backend al crear y el fallback', async () => {
    const user = userEvent.setup()
    routeFetch({ create: { ok: false, json: async () => ({ message: 'Nope' }) } })
    const { container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), 'Ana')
    submit(container)
    expect(await screen.findByText('Failed to create profile: Nope')).toBeInTheDocument()
  })

  it('usa "Unknown error" al crear sin mensaje', async () => {
    const user = userEvent.setup()
    routeFetch({ create: { ok: false, json: async () => ({}) } })
    const { container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), 'Ana')
    submit(container)
    expect(await screen.findByText('Failed to create profile: Unknown error')).toBeInTheDocument()
  })

  it('captura errores de red al crear', async () => {
    const user = userEvent.setup()
    global.fetch.mockRejectedValueOnce(new Error('boom'))
    const { container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), 'Ana')
    submit(container)
    expect(await screen.findByText('Error creating profile: boom')).toBeInTheDocument()
  })
})

describe('AddProfileModal: edición', () => {
  const editProfile = { id: 5, name: 'Old', profilePicture: '/p.jpg', createdDate: '2020-01-01' }

  it('actualiza el perfil sin nueva foto y conserva la imagen', async () => {
    routeFetch()
    const { props, container } = setup({ editProfile })
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(bodyOf('/api/profile')).toEqual({
      id: 5,
      name: 'Old',
      profilePicture: '/p.jpg',
      createdDate: '2020-01-01',
      isActive: true,
    })
    expect(findCall('/api/profile/upload-picture/5')).toBeUndefined()
    expect(screen.getByLabelText(/Profile Name/)).toHaveValue('Old')
  })

  it('sube la nueva foto usando el id de edición', async () => {
    const user = userEvent.setup()
    routeFetch()
    const { props, container } = setup({ editProfile })
    await uploadPicture(user)
    submit(container)
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
    expect(findCall('/api/profile/upload-picture/5')).toBeTruthy()
  })

  it('muestra el error del backend al editar', async () => {
    routeFetch({ create: { ok: false, json: async () => ({ message: 'Nah' }) } })
    const { container } = setup({ editProfile })
    submit(container)
    expect(await screen.findByText('Failed to update profile: Nah')).toBeInTheDocument()
  })

  it('captura errores de red al editar', async () => {
    global.fetch.mockRejectedValueOnce(new Error('boom'))
    const { container } = setup({ editProfile })
    submit(container)
    expect(await screen.findByText('Error updating profile: boom')).toBeInTheDocument()
  })

  it('quita la foto con el botón Remove', async () => {
    const user = userEvent.setup()
    const { container } = setup({ editProfile })
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(container.querySelector('img.preview-image')).toBeNull()
    expect(container.querySelector('.preview-placeholder').textContent).toBe('O')
  })

  it('ignora un cambio de archivo sin archivo seleccionado', () => {
    const { container } = setup()
    const input = screen.getByLabelText('Upload Picture')
    fireEvent.change(input, { target: { files: [] } })
    expect(container.querySelector('img.preview-image')).toBeNull()
    expect(container.querySelector('.preview-placeholder').textContent).toBe('?')
  })
})

describe('AddProfileModal: estado de envío y cierre', () => {
  it('muestra "Creating..." mientras crea', async () => {
    const user = userEvent.setup()
    const def = deferred()
    const { props, container } = setup()
    await user.type(screen.getByLabelText(/Profile Name/), 'Ana')
    global.fetch.mockReturnValueOnce(def.promise)
    submit(container)
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
    def.resolve({ ok: true, json: async () => ({}) })
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
  })

  it('muestra "Updating..." mientras edita', async () => {
    const def = deferred()
    global.fetch.mockReturnValueOnce(def.promise)
    const { props, container } = setup({
      editProfile: { id: 5, name: 'Old', profilePicture: '', createdDate: '2020' },
    })
    submit(container)
    expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled()
    def.resolve({ ok: true, json: async () => ({}) })
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled())
  })

  it('cierra el modal con cancelar y con la cruz', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: '×' }))
    expect(props.onClose).toHaveBeenCalledTimes(2)
  })
})
