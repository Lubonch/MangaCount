import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'

// setup.js mocks ThemeToggle globally; here we use the real component.
vi.unmock('../../components/ThemeToggle')

import ThemeToggle from '../../components/ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.getItem.mockReset()
    localStorage.setItem.mockReset()
    document.documentElement.removeAttribute('data-theme')
  })

  it('arranca en modo oscuro por defecto', async () => {
    render(<ThemeToggle />)
    // The label indicates the mode it would switch to: in dark it shows "Light".
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('☀️')).toBeInTheDocument()
    expect(screen.getByTitle('Switch to light mode')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    )
    expect(localStorage.setItem).toHaveBeenCalledWith('mangacount-theme', 'dark')
  })

  it('respeta el tema claro guardado', () => {
    localStorage.getItem.mockReturnValue('light')
    render(<ThemeToggle />)
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('🌙')).toBeInTheDocument()
    expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument()
  })

  it('alterna a claro y persiste al hacer click', async () => {
    const user = userEvent.setup()
    localStorage.getItem.mockReturnValue('dark')
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button'))

    expect(await screen.findByText('Dark')).toBeInTheDocument()
    expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    )
    expect(localStorage.setItem).toHaveBeenLastCalledWith('mangacount-theme', 'light')
  })

  it('vuelve a oscuro al alternar de nuevo', async () => {
    const user = userEvent.setup()
    localStorage.getItem.mockReturnValue('light')
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button'))

    expect(await screen.findByText('Light')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    )
    expect(localStorage.setItem).toHaveBeenLastCalledWith('mangacount-theme', 'dark')
  })
})
