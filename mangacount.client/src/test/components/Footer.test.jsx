import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import Footer from '../../components/Footer'

describe('Footer', () => {
  it('muestra la versión actual y sin enlace cuando no hay update', () => {
    render(<Footer version="1.0.8" update={{ hasUpdate: false }} />)
    expect(screen.getByText(/MangaCount v1\.0\.8/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('muestra el enlace a la nueva versión cuando hay update', () => {
    render(<Footer version="1.0.8" update={{ hasUpdate: true, latest: '1.1.0', url: 'https://x/1.1.0' }} />)
    const link = screen.getByRole('link', { name: /v1\.1\.0/ })
    expect(link).toHaveAttribute('href', 'https://x/1.1.0')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
