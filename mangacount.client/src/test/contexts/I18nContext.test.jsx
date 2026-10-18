import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import { I18nProvider, useI18n, useT } from '../../contexts/I18nContext'

vi.mock('../../api/localAdapter', () => ({ appConfigGet: vi.fn() }))
import { appConfigGet } from '../../api/localAdapter'

const Probe = () => {
  const { language } = useI18n()
  const t = useT()
  return <span>{`${language}:${t('language.label')}`}</span>
}

describe('I18nContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin provider usa el idioma de los tests (es)', () => {
    render(<Probe />)
    expect(screen.getByText('es:Idioma')).toBeInTheDocument()
  })

  it('sin idioma en la config mantiene el default de tests', async () => {
    appConfigGet.mockResolvedValue({})
    render(<I18nProvider><Probe /></I18nProvider>)
    await waitFor(() => expect(appConfigGet).toHaveBeenCalled())
    expect(screen.getByText('es:Idioma')).toBeInTheDocument()
  })

  it('toma el idioma de la config', async () => {
    appConfigGet.mockResolvedValue({ language: 'en' })
    render(<I18nProvider><Probe /></I18nProvider>)
    await waitFor(() => expect(screen.getByText('en:Language')).toBeInTheDocument())
  })

  it('tolera el fallo al leer la config', async () => {
    appConfigGet.mockRejectedValue(new Error('sin config'))
    render(<I18nProvider><Probe /></I18nProvider>)
    await waitFor(() => expect(appConfigGet).toHaveBeenCalled())
    expect(screen.getByText('es:Idioma')).toBeInTheDocument()
  })
})
