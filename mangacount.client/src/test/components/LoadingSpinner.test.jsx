import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import LoadingSpinner from '../../components/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renderiza por defecto tamaño medium con mensaje', () => {
    const { container } = render(<LoadingSpinner />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(container.querySelector('.loading-spinner.spinner-medium')).toBeInTheDocument()
    expect(container.querySelector('.loading-fullscreen')).not.toBeInTheDocument()
  })

  it('aplica los tamaños small y large', () => {
    const { container, rerender } = render(<LoadingSpinner size="small" />)
    expect(container.querySelector('.spinner-small')).toBeInTheDocument()

    rerender(<LoadingSpinner size="large" />)
    expect(container.querySelector('.spinner-large')).toBeInTheDocument()
  })

  it('oculta el mensaje cuando showMessage=false', () => {
    render(<LoadingSpinner showMessage={false} />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('muestra un mensaje personalizado', () => {
    render(<LoadingSpinner message="Cargando datos…" />)
    expect(screen.getByText('Cargando datos…')).toBeInTheDocument()
  })

  it('en modo fullScreen envuelve el contenido', () => {
    const { container } = render(<LoadingSpinner fullScreen />)
    expect(container.querySelector('.loading-fullscreen')).toBeInTheDocument()
    expect(container.querySelector('.loading-fullscreen .loading-container')).toBeInTheDocument()
  })

  it('acepta className adicional', () => {
    const { container } = render(<LoadingSpinner className="extra" />)
    expect(container.querySelector('.loading-container.extra')).toBeInTheDocument()
  })
})
