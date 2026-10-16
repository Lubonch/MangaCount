import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import ErrorBoundary from '../../components/ErrorBoundary'

const Boom = () => {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
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
  })
})
