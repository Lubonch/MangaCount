import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext'

const Probe = () => {
  const { isDarkMode, toggleTheme } = useTheme()
  return <button onClick={toggleTheme}>{isDarkMode ? 'dark' : 'light'}</button>
}

const renderProvider = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  )

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.getItem.mockReset()
    localStorage.setItem.mockReset()
    document.documentElement.removeAttribute('data-theme')
  })

  it('useTheme lanza si se usa fuera del ThemeProvider', () => {
    expect(() => render(<Probe />)).toThrow('useTheme must be used within a ThemeProvider')
  })

  it('por defecto arranca en modo oscuro y lo persiste', async () => {
    renderProvider()
    expect(screen.getByText('dark')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    )
    expect(localStorage.setItem).toHaveBeenCalledWith('mangacount-theme', 'dark')
  })

  it('respeta el tema claro guardado en localStorage', async () => {
    localStorage.getItem.mockReturnValue('light')
    renderProvider()
    expect(screen.getByText('light')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    )
    expect(localStorage.setItem).toHaveBeenCalledWith('mangacount-theme', 'light')
  })

  it('respeta el tema oscuro guardado en localStorage', () => {
    localStorage.getItem.mockReturnValue('dark')
    renderProvider()
    expect(screen.getByText('dark')).toBeInTheDocument()
  })

  it('toggleTheme alterna el tema y lo persiste', async () => {
    const user = userEvent.setup()
    localStorage.getItem.mockReturnValue('dark')
    renderProvider()

    await user.click(screen.getByText('dark'))

    expect(await screen.findByText('light')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    )
    expect(localStorage.setItem).toHaveBeenLastCalledWith('mangacount-theme', 'light')
  })

  it('toggleTheme vuelve a oscuro', async () => {
    const user = userEvent.setup()
    localStorage.getItem.mockReturnValue('light')
    renderProvider()

    await user.click(screen.getByText('light'))

    expect(await screen.findByText('dark')).toBeInTheDocument()
    expect(localStorage.setItem).toHaveBeenLastCalledWith('mangacount-theme', 'dark')
  })
})
