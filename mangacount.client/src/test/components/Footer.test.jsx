import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test-utils'
import userEvent from '@testing-library/user-event'
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

  it('modo auto: muestra Descargar y llama onDownload', async () => {
    const user = userEvent.setup()
    const onDownload = vi.fn()
    render(
      <Footer
        version="1.0.11"
        update={{ mode: 'auto', status: 'available', hasUpdate: true, latest: '1.2.0' }}
        onDownload={onDownload}
      />
    )
    await user.click(screen.getByRole('button', { name: /Descargar v1\.2\.0/ }))
    expect(onDownload).toHaveBeenCalled()
  })

  it('modo auto: muestra el progreso y Reiniciar para actualizar', async () => {
    const user = userEvent.setup()
    const onInstall = vi.fn()
    const { rerender } = render(
      <Footer version="1.0.11" update={{ mode: 'auto', status: 'downloading', percent: 42 }} />
    )
    expect(screen.getByText(/Descargando… 42%/)).toBeInTheDocument()

    rerender(<Footer version="1.0.11" update={{ mode: 'auto', status: 'downloaded' }} onInstall={onInstall} />)
    await user.click(screen.getByRole('button', { name: 'Reiniciar para actualizar' }))
    expect(onInstall).toHaveBeenCalled()
  })
})

