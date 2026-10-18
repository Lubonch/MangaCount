import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '../test-utils'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/localAdapter.js', () => ({
  databaseStatistics: vi.fn(),
  databaseNukeLocal: vi.fn(),
}))

import * as api from '../../api/localAdapter.js'
import NukeDataModal from '../../components/NukeDataModal'

const stats = { mangas: 10, entries: 20, profiles: 2, formats: 5, publishers: 3 }

// Calls React's onClick bypassing the DOM `disabled` attribute: the
// nuke button is disabled with the wrong text, but we want to cover
// the handler's defensive guard.
async function forceReactClick(element) {
  const propsKey = Object.keys(element).find((key) => key.startsWith('__reactProps$'))
  const handler = propsKey && element[propsKey]?.onClick
  expect(typeof handler).toBe('function')
  await act(async () => {
    handler()
  })
}

async function renderAtStep(user, step) {
  render(<NukeDataModal isOpen onClose={() => {}} onSuccess={() => {}} />)
  await waitFor(() => expect(screen.getByText(/WARNING/)).toBeInTheDocument())
  for (let i = 1; i < step; i += 1) {
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
  }
}

describe('NukeDataModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.databaseStatistics.mockResolvedValue(stats)
    api.databaseNukeLocal.mockResolvedValue({ ok: true })
  })

  it('no renderiza nada si está cerrado', () => {
    render(<NukeDataModal isOpen={false} onClose={() => {}} onSuccess={() => {}} />)
    expect(screen.queryByText(/Nuclear Option/)).not.toBeInTheDocument()
  })

  it('al abrir carga estadísticas y las muestra en el paso 1', async () => {
    render(<NukeDataModal isOpen onClose={() => {}} onSuccess={() => {}} />)
    await waitFor(() => expect(api.databaseStatistics).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(/Nuclear Option/)).toBeInTheDocument()
    const items = document.querySelectorAll('.data-item')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('10 manga entries')
    expect(items[1]).toHaveTextContent('20 reading entries')
    expect(items[2]).toHaveTextContent('2 user profiles')
    expect(items[3]).toHaveTextContent('5 formats')
    expect(items[4]).toHaveTextContent('3 publishers')
  })

  it('registra en consola si falla la carga de estadísticas', async () => {
    api.databaseStatistics.mockRejectedValueOnce(new Error('sin conexión'))
    render(<NukeDataModal isOpen onClose={() => {}} onSuccess={() => {}} />)
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(screen.getByText(/Nuclear Option/)).toBeInTheDocument()
  })

  it('navega hacia adelante y hacia atrás entre pasos', async () => {
    const user = userEvent.setup()
    render(<NukeDataModal isOpen onClose={() => {}} onSuccess={() => {}} />)
    await waitFor(() => expect(screen.getByText(/WARNING/)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText(/absolutely sure/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText(/WARNING/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText(/Final Confirmation/)).toBeInTheDocument()
  })

  it('el close-button llama a onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<NukeDataModal isOpen onClose={onClose} onSuccess={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Nuclear Option/)).toBeInTheDocument())
    await user.click(document.querySelector('.close-button'))
    expect(onClose).toHaveBeenCalled()
  })

  it('el botón Cancel llama a onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<NukeDataModal isOpen onClose={onClose} onSuccess={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Nuclear Option/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('rechaza el nuke si el texto no coincide exactamente', async () => {
    const user = userEvent.setup()
    await renderAtStep(user, 3)

    const nuke = screen.getByRole('button', { name: /BORRAR BASE DE DATOS/ })
    expect(nuke).toBeDisabled()

    await forceReactClick(nuke)
    expect(await screen.findByText(/You must type exactly/)).toBeInTheDocument()
    expect(api.databaseNukeLocal).not.toHaveBeenCalled()
  })

  it('borra los datos al confirmar el texto correcto', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    render(<NukeDataModal isOpen onClose={onClose} onSuccess={onSuccess} />)
    await waitFor(() => expect(screen.getByText(/WARNING/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.type(screen.getByRole('textbox'), 'DELETE ALL DATA')
    await user.click(screen.getByRole('button', { name: /BORRAR BASE DE DATOS/ }))

    await waitFor(() => expect(api.databaseNukeLocal).toHaveBeenCalledTimes(1))
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra el estado "Borrando…" mientras borra', async () => {
    const user = userEvent.setup()
    let resolveNuke
    api.databaseNukeLocal.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNuke = resolve
      })
    )
    await renderAtStep(user, 3)
    await user.type(screen.getByRole('textbox'), 'DELETE ALL DATA')
    await user.click(screen.getByRole('button', { name: /BORRAR BASE DE DATOS/ }))

    expect(await screen.findByText('Borrando…')).toBeInTheDocument()

    resolveNuke({ ok: true })
    await waitFor(() => expect(api.databaseNukeLocal).toHaveBeenCalled())
  })

  it('muestra un error si falla el borrado', async () => {
    const user = userEvent.setup()
    api.databaseNukeLocal.mockRejectedValueOnce(new Error('boom'))
    await renderAtStep(user, 3)
    await user.type(screen.getByRole('textbox'), 'DELETE ALL DATA')
    await user.click(screen.getByRole('button', { name: /BORRAR BASE DE DATOS/ }))

    expect(await screen.findByText('Error clearing local data: boom')).toBeInTheDocument()
  })

  it('el input marca su clase valid con el texto correcto', async () => {
    const user = userEvent.setup()
    await renderAtStep(user, 3)
    const input = screen.getByRole('textbox')
    expect(input).not.toHaveClass('valid')
    await user.type(input, 'DELETE ALL DATA')
    expect(input).toHaveClass('valid')
  })
})
