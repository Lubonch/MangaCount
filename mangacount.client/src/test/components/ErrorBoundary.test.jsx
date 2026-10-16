import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'

vi.mock('../../api/localAdapter.js', () => ({
  logError: vi.fn(),
  isElectron: vi.fn(),
}))

import * as api from '../../api/localAdapter.js'
import ErrorBoundary from '../../components/ErrorBoundary'

const Boom = () => {
  throw new Error('boom')
}

const BoomString = () => {
  throw 'boom-string'
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.isElectron.mockReturnValue(false)
    api.logError.mockReturnValue(undefined)
  })

  it('renderiza los hijos normalmente', () => {
    render(
      <ErrorBoundary>
        <div>contenido ok</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('contenido ok')).toBeInTheDocument()
  })

  it('muestra el fallback ante un error de render', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText(/Algo salió mal/)).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('muestra el valor lanzado cuando no es un Error', () => {
    render(
      <ErrorBoundary>
        <BoomString />
      </ErrorBoundary>
    )
    expect(screen.getByText('boom-string')).toBeInTheDocument()
  })

  it('reporta el error por IPC cuando está en Electron', async () => {
    api.isElectron.mockReturnValue(true)
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    await waitFor(() => expect(api.logError).toHaveBeenCalledTimes(1))
    expect(api.logError).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'render', message: 'boom', stack: expect.any(String) })
    )
  })

  it('no reporta por IPC cuando no está en Electron', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(api.logError).not.toHaveBeenCalled()
  })

  it('usa error.stack si no hay componentStack', () => {
    api.isElectron.mockReturnValue(true)
    const instance = new ErrorBoundary({ children: null })
    instance.componentDidCatch(new Error('directo'), undefined)
    expect(api.logError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'directo', stack: expect.stringContaining('directo') })
    )
  })

  it('el reporte nunca rompe la UI aunque logError falle', () => {
    api.isElectron.mockReturnValue(true)
    api.logError.mockImplementationOnce(() => {
      throw new Error('log roto')
    })
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText(/Algo salió mal/)).toBeInTheDocument()
  })
})
