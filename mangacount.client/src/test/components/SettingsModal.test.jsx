import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent, act } from '../test-utils'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/localAdapter.js', () => ({
  appConfigGet: vi.fn(),
  appConfigSet: vi.fn(),
  appInfo: vi.fn(),
  updateCheck: vi.fn(),
  updateDownload: vi.fn(),
  updateInstall: vi.fn(),
  onUpdateState: vi.fn(() => () => {}),
  diagnosticsCopy: vi.fn(),
  openLogs: vi.fn(),
  backupConfigGet: vi.fn(),
  backupConfigSet: vi.fn(),
  backupList: vi.fn(),
  backupCreate: vi.fn(),
  backupRestore: vi.fn(),
  botConfigGet: vi.fn(),
  botConfigSet: vi.fn(),
  botSetToken: vi.fn(),
  botAutostartGet: vi.fn(),
  botAutostartSet: vi.fn(),
  pickDirectory: vi.fn(),
  pickFile: vi.fn(),
  entryExport: vi.fn(),
  mangaList: vi.fn(),
  coverAll: vi.fn(),
  coverAuto: vi.fn(),
  recommendationConfigGet: vi.fn(),
  recommendationConfigSet: vi.fn(),
}))

vi.mock('../../components/NukeDataModal', () => ({
  default: ({ isOpen, onClose, onSuccess }) =>
    isOpen ? (
      <div>
        <button onClick={onSuccess}>nuke-mock</button>
        <button onClick={onClose}>nuke-close</button>
      </div>
    ) : null,
}))

import * as api from '../../api/localAdapter.js'
import SettingsModal from '../../components/SettingsModal'

const profile = { id: 1, name: 'Test' }

const emptyBackup = () => ({
  enabled: false,
  destinationDir: null,
  intervalMinutes: 1440,
  triggers: { onStartup: true, whileRunning: false },
  lastBackupAt: null,
  lastBackupStatus: null,
})

function setupDefaults() {
  api.appConfigGet.mockResolvedValue({ startInTray: true, updateCheck: true, diagnosticsCopy: true })
  api.appInfo.mockResolvedValue({ version: '1.0.8', platform: 'linux', arch: 'x64', packaged: true })
  api.updateCheck.mockResolvedValue({ current: '1.0.8', latest: '1.0.8', hasUpdate: false })
  api.diagnosticsCopy.mockResolvedValue({ copied: true })
  api.openLogs.mockResolvedValue({ opened: true })
  api.backupConfigGet.mockResolvedValue(emptyBackup())
  api.backupList.mockResolvedValue([])
  api.botConfigGet.mockResolvedValue({ enabled: false, guildId: null, allowedUserIds: [], status: 'apagado', hasToken: false })
  api.botAutostartGet.mockResolvedValue({ enabled: false })
  api.recommendationConfigGet.mockResolvedValue({ enabled: true, limit: 10, seenTtlDays: 30 })
}

describe('SettingsModal', () => {
  let updateStateCallback

  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
    api.onUpdateState.mockImplementation((cb) => {
      updateStateCallback = cb
      return () => {}
    })
  })

  it('no renderiza nada si está cerrado', () => {
    render(<SettingsModal isOpen={false} onClose={() => {}} selectedProfile={profile} />)
    expect(screen.queryByText('⚙️ Settings')).not.toBeInTheDocument()
  })

  it('muestra las cuatro secciones', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
    expect(screen.getByText('Backup')).toBeInTheDocument()
    expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument()
    expect(screen.getByText('Bot (Discord)')).toBeInTheDocument()
    expect(screen.getByLabelText('Elegir archivo TSV')).toBeInTheDocument()
  })

  it('incluye la Danger Zone con la Nuclear Option', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText(/Zona de peligro/)).toBeInTheDocument())
    expect(screen.getByLabelText('Nuclear Option')).toBeInTheDocument()
  })

  it('la Nuclear Option llama a onDataReset (recargar perfiles tras re-sembrar)', async () => {
    const user = userEvent.setup()
    const onDataReset = vi.fn()
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} onDataReset={onDataReset} />)
    await waitFor(() => expect(screen.getByLabelText('Nuclear Option')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Nuclear Option'))
    await user.click(screen.getByText('nuke-mock'))

    expect(onDataReset).toHaveBeenCalledTimes(1)
  })

  it('gate: no guarda backup habilitado sin destino ni disparador', async () => {
    const user = userEvent.setup()
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Habilitar backup automático'))
    await user.click(screen.getByLabelText('Guardar backup'))

    expect(api.backupConfigSet).not.toHaveBeenCalled()
    expect(screen.getByText(/requiere un destino/i)).toBeInTheDocument()
  })

  it('guarda una config de backup válida', async () => {
    const user = userEvent.setup()
    api.pickDirectory.mockResolvedValue('/mnt/backup')
    api.backupConfigSet.mockImplementation(async (c) => c)
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    const section = screen.getByText('Backup').closest('section')
    await user.click(section.querySelector('input[type=checkbox]'))
    await user.click(within(section).getByText('Elegir…'))
    await user.click(screen.getByLabelText('Guardar backup'))

    await waitFor(() => expect(api.backupConfigSet).toHaveBeenCalled())
    expect(api.backupConfigSet.mock.calls[0][0].destinationDir).toBe('/mnt/backup')
  })

  it('dispara Backup ahora contra el destino', async () => {
    const user = userEvent.setup()
    api.backupConfigGet.mockResolvedValue({ ...emptyBackup(), destinationDir: '/mnt/backup' })
    api.backupCreate.mockResolvedValue({ path: '/mnt/backup/x.zip' })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Backup ahora'))
    await waitFor(() => expect(api.backupCreate).toHaveBeenCalledWith('/mnt/backup'))
  })

  it('no pide la lista de backups al abrir Settings', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())
    expect(api.backupList).not.toHaveBeenCalled()
  })

  it('Refrescar carga la lista de backups bajo demanda', async () => {
    const user = userEvent.setup()
    api.backupList.mockResolvedValue({
      backups: [
        { fileName: 'mangacount-backup-2026-01-02-0300.zip', size: 10, createdAt: '2026-01-02T03:00:00.000Z' },
      ],
      status: 'ok',
    })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Refrescar backups'))
    expect(await screen.findByText(/1 backups/)).toBeInTheDocument()
  })

  it('avisa cuando el destino de backup no responde', async () => {
    const user = userEvent.setup()
    api.backupList.mockResolvedValue({ backups: [], status: 'unresponsive' })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Refrescar backups'))
    expect(await screen.findByText(/el destino no responde/)).toBeInTheDocument()
  })

  it('exporta TSV del perfil activo', async () => {
    const user = userEvent.setup()
    api.entryExport.mockResolvedValue('Titulo\nx')
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Exportar TSV' }))
    await waitFor(() => expect(api.entryExport).toHaveBeenCalledWith(1))
  })

  it('restaura un backup tras confirmar la acción destructiva', async () => {
    const user = userEvent.setup()
    api.pickFile.mockResolvedValue('/b/x.zip')
    api.backupRestore.mockResolvedValue({ restored: true, safetyBackup: '/b/safety.zip' })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByLabelText('Restaurar')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Restaurar'))

    await waitFor(() => expect(api.backupRestore).toHaveBeenCalledWith('/b/x.zip'))
    expect(confirmSpy).toHaveBeenCalled()
  })

  it('muestra el indicador de último backup fallido', async () => {
    api.backupConfigGet.mockResolvedValue({
      ...emptyBackup(),
      lastBackupAt: '2026-01-01T00:00:00Z',
      lastBackupStatus: { ok: false, at: '2026-01-02T00:00:00Z', error: 'disco lleno' },
    })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText(/último error: disco lleno/)).toBeInTheDocument())
  })

  it('importa TSV del perfil activo desde Settings', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} onImportSuccess={() => {}} />)
    await waitFor(() => expect(screen.getByLabelText('Elegir archivo TSV')).toBeInTheDocument())

    const file = new File(['a\tb'], 'test.tsv', { type: 'text/tab-separated-values' })
    await user.upload(screen.getByLabelText('Elegir archivo TSV'), file)

    await waitFor(() => expect(screen.getByText('¡Importación exitosa!')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/entry/import/1', expect.objectContaining({ method: 'POST' }))
  })

  it('guarda el token del bot', async () => {
    const user = userEvent.setup()
    api.botSetToken.mockResolvedValue({ saved: true })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Bot (Discord)')).toBeInTheDocument())

    await user.type(screen.getByLabelText('Token de Discord'), 'abc123')
    await user.click(screen.getByText('Guardar token'))

    await waitFor(() => expect(api.botSetToken).toHaveBeenCalledWith('abc123'))
  })

  it('guarda la config del bot', async () => {
    const user = userEvent.setup()
    api.botConfigSet.mockResolvedValue({ enabled: true, guildId: 'g1', allowedUserIds: ['u1'] })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Bot (Discord)')).toBeInTheDocument())

    await user.type(screen.getByLabelText('Guild ID'), 'g1')
    await user.type(screen.getByLabelText('Usuarios permitidos'), 'u1')
    await user.click(screen.getByLabelText('Guardar bot'))

    await waitFor(() => expect(api.botConfigSet).toHaveBeenCalled())
    expect(api.botConfigSet.mock.calls[0][0]).toMatchObject({ guildId: 'g1', allowedUserIds: ['u1'] })
  })

  it('configura el límite de /pendientes', async () => {
    const user = userEvent.setup()
    api.botConfigGet.mockResolvedValue({
      enabled: true,
      guildId: 'g1',
      allowedUserIds: ['u1'],
      pendingLimitEnabled: true,
      pendingLimit: 20,
      status: 'apagado',
      hasToken: false,
    })
    api.botConfigSet.mockResolvedValue({})
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Bot (Discord)')).toBeInTheDocument())

    const limitInput = screen.getByLabelText('Series máximas en /pendientes')
    expect(limitInput).toHaveValue(20)
    await user.clear(limitInput)
    await user.type(limitInput, '5')
    await user.click(screen.getByLabelText('Guardar bot'))
    await waitFor(() => expect(api.botConfigSet).toHaveBeenCalled())
    expect(api.botConfigSet.mock.calls[0][0]).toMatchObject({ pendingLimitEnabled: true, pendingLimit: 5 })
  })

  it('deshabilita la cantidad cuando el tope está apagado', async () => {
    const user = userEvent.setup()
    api.botConfigGet.mockResolvedValue({
      enabled: true,
      guildId: 'g1',
      allowedUserIds: [],
      pendingLimitEnabled: true,
      pendingLimit: 20,
      status: 'apagado',
      hasToken: false,
    })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Bot (Discord)')).toBeInTheDocument())

    await user.click(screen.getByLabelText(/Limitar \/pendientes/))
    expect(screen.getByLabelText('Series máximas en /pendientes')).toBeDisabled()
  })

  it('configura efímeras, TTL y recomendaciones del bot', async () => {
    const user = userEvent.setup()
    api.botConfigGet.mockResolvedValue({
      enabled: true,
      guildId: 'g1',
      allowedUserIds: [],
      pendingLimitEnabled: true,
      pendingLimit: 20,
      ephemeralReplies: false,
      confirmTtlMinutes: 5,
      recommendLimit: 5,
      status: 'apagado',
      hasToken: false,
    })
    api.botConfigSet.mockResolvedValue({})
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Bot (Discord)')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Respuestas efímeras'))
    const ttl = screen.getByLabelText('Minutos para confirmar escrituras')
    await user.clear(ttl)
    await user.type(ttl, '10')
    await user.click(screen.getByLabelText('Guardar bot'))
    await waitFor(() => expect(api.botConfigSet).toHaveBeenCalled())
    expect(api.botConfigSet.mock.calls[0][0]).toMatchObject({
      ephemeralReplies: true,
      confirmTtlMinutes: 10,
      recommendLimit: 5,
    })
  })

  it('cambia el idioma desde Settings', async () => {
    const user = userEvent.setup()
    api.appConfigSet.mockResolvedValue({ language: 'en' })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText('Idioma'), 'en')
    await waitFor(() => expect(api.appConfigSet).toHaveBeenCalledWith({ language: 'en' }))
  })

  it('toggle de arranque en bandeja persiste', async () => {
    const user = userEvent.setup()
    api.appConfigSet.mockResolvedValue({ startInTray: false })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Arrancar en la bandeja'))
    await waitFor(() => expect(api.appConfigSet).toHaveBeenCalledWith({ startInTray: false }))
  })

  it('toggle de autostart persiste', async () => {
    const user = userEvent.setup()
    api.botAutostartSet.mockResolvedValue({ enabled: true })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Iniciar con el sistema'))
    await waitFor(() => expect(api.botAutostartSet).toHaveBeenCalledWith(true))
  })

  it('el botón Buscar actualización consulta y refleja el estado', async () => {
    const user = userEvent.setup()
    api.updateCheck.mockResolvedValue({ hasUpdate: true, latest: '1.1.0', url: 'https://x/1.1.0' })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Buscar actualización'))

    await waitFor(() => expect(api.updateCheck).toHaveBeenCalled())
    expect(screen.getByText(/versión nueva: v1\.1\.0/)).toBeInTheDocument()
  })

  it('toggle de updateCheck persiste', async () => {
    const user = userEvent.setup()
    api.appConfigSet.mockResolvedValue({ updateCheck: false })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Buscar actualizaciones al abrir la app'))
    await waitFor(() => expect(api.appConfigSet).toHaveBeenCalledWith({ updateCheck: false }))
  })

  it('el botón Copiar diagnóstico llama al IPC y confirma', async () => {
    const user = userEvent.setup()
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Diagnóstico')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Copiar diagnóstico'))

    await waitFor(() => expect(api.diagnosticsCopy).toHaveBeenCalled())
    expect(screen.getByText('Copiado ✓')).toBeInTheDocument()
  })

  it('con el toggle Diagnóstico OFF no muestra los botones', async () => {
    api.appConfigGet.mockResolvedValue({ startInTray: true, updateCheck: true, diagnosticsCopy: false })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Diagnóstico')).toBeInTheDocument())

    expect(screen.queryByLabelText('Copiar diagnóstico')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Habilitar diagnóstico')).not.toBeChecked()
  })

  it('bulk de portadas: recorre sólo los mangas sin portada', async () => {
    const user = userEvent.setup()
    api.mangaList.mockResolvedValue([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    api.coverAll.mockResolvedValue({ 1: { url: 'mangacount://covers/1.jpg', isAdult: false } }) // 1 already has one
    api.coverAuto.mockResolvedValue('mangacount://covers/2.jpg')
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} onImportSuccess={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /Traer portadas faltantes/ }))

    await waitFor(() => expect(api.coverAuto).toHaveBeenCalledWith(2))
    expect(api.coverAuto).toHaveBeenCalledTimes(1) // does not touch the one it already has
    expect(await screen.findByText(/1 portadas nuevas/)).toBeInTheDocument()
  })

  it('muestra error si no se puede guardar un toggle general', async () => {
    const user = userEvent.setup()
    api.appConfigSet.mockRejectedValue(new Error('boom'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Arrancar en la bandeja'))

    expect(await screen.findByText(/No se pudo guardar: boom/)).toBeInTheDocument()
  })

  it('persiste el toggle de diagnóstico', async () => {
    const user = userEvent.setup()
    api.appConfigSet.mockResolvedValue({ diagnosticsCopy: false })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Diagnóstico')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Habilitar diagnóstico'))

    await waitFor(() => expect(api.appConfigSet).toHaveBeenCalledWith({ diagnosticsCopy: false }))
  })

  it('muestra error si falla el autostart', async () => {
    const user = userEvent.setup()
    api.botAutostartSet.mockRejectedValue(new Error('nope'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Iniciar con el sistema'))

    expect(await screen.findByText(/No se pudo guardar: nope/)).toBeInTheDocument()
  })

  it('tolera metadatos y config incompletos', async () => {
    api.appInfo.mockResolvedValue(null)
    api.backupConfigGet.mockResolvedValue(undefined)
    api.backupList.mockResolvedValue(null)
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)

    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
    expect(screen.getByText(/Versión actual: —/)).toBeInTheDocument()
    expect(screen.getByText(/0 backups/)).toBeInTheDocument()
  })

  it('muestra un mensaje si falla la carga de configuración', async () => {
    api.appConfigGet.mockRejectedValue(new Error('cfg fail'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)

    expect(await screen.findByText(/No se pudo cargar la configuración: cfg fail/)).toBeInTheDocument()
  })

  it('no aplica la configuración si se desmonta antes de resolver', async () => {
    let resolveConfig
    api.appConfigGet.mockReturnValue(new Promise((resolve) => { resolveConfig = resolve }))
    const { unmount } = render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)

    unmount()
    await act(async () => {
      resolveConfig({ startInTray: true })
      await Promise.resolve()
    })
  })

  it('muestra Reiniciar cuando hay una actualización descargada', async () => {
    const user = userEvent.setup()
    api.updateInstall.mockResolvedValue({})
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await act(async () => updateStateCallback({ status: 'downloaded' }))
    await user.click(screen.getByLabelText('Reiniciar para actualizar'))

    await waitFor(() => expect(api.updateInstall).toHaveBeenCalled())
  })

  it('muestra el progreso mientras descarga', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await act(async () => updateStateCallback({ status: 'downloading', percent: 42 }))

    expect(screen.getByText('Descargando… 42%')).toBeInTheDocument()
  })

  it('permite descargar cuando la actualización es automática', async () => {
    const user = userEvent.setup()
    api.updateDownload.mockResolvedValue({})
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await act(async () => updateStateCallback({ hasUpdate: true, latest: '2.0', mode: 'auto' }))
    await user.click(screen.getByLabelText('Descargar actualización'))

    await waitFor(() => expect(api.updateDownload).toHaveBeenCalled())
  })

  it('muestra error si falla la descarga de la actualización', async () => {
    const user = userEvent.setup()
    api.updateDownload.mockRejectedValue(new Error('dl'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await act(async () => updateStateCallback({ hasUpdate: true, latest: '2.0', mode: 'auto' }))
    await user.click(screen.getByLabelText('Descargar actualización'))

    expect(await screen.findByText(/No se pudo descargar: dl/)).toBeInTheDocument()
  })

  it('muestra el link de descarga manual', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await act(async () =>
      updateStateCallback({ hasUpdate: true, latest: '3.0', mode: 'manual', url: 'https://x/3.0' })
    )

    expect(screen.getByRole('link', { name: 'Descargar v3.0' })).toHaveAttribute('href', 'https://x/3.0')
  })

  it('informa que está al día', async () => {
    const user = userEvent.setup()
    api.updateCheck.mockResolvedValue({ current: '1.0.8', latest: '1.0.8', hasUpdate: false })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Buscar actualización'))

    expect(await screen.findByText('Estás al día.')).toBeInTheDocument()
  })

  it('muestra error si falla el chequeo de actualización', async () => {
    const user = userEvent.setup()
    api.updateCheck.mockRejectedValue(new Error('net'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Buscar actualización'))

    expect(await screen.findByText(/No se pudo verificar: net/)).toBeInTheDocument()
  })

  it('no cambia el destino si no se elige carpeta', async () => {
    const user = userEvent.setup()
    api.pickDirectory.mockResolvedValue(null)
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(screen.getByText('Elegir…'))

    expect(screen.getByPlaceholderText('Elegí una carpeta')).toHaveValue('')
  })

  it('muestra error si falla guardar la config de backup', async () => {
    const user = userEvent.setup()
    api.pickDirectory.mockResolvedValue('/mnt/backup')
    api.backupConfigSet.mockRejectedValue(new Error('save fail'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    const section = screen.getByText('Backup').closest('section')
    await user.click(section.querySelector('input[type=checkbox]'))
    await user.click(within(section).getByText('Elegir…'))
    await user.click(screen.getByLabelText('Guardar backup'))

    expect(await screen.findByText('save fail')).toBeInTheDocument()
  })

  it('guarda backup aunque la respuesta no incluya triggers', async () => {
    const user = userEvent.setup()
    api.pickDirectory.mockResolvedValue('/mnt/backup')
    api.backupConfigSet.mockResolvedValue({ enabled: true, destinationDir: '/mnt/backup', triggers: undefined })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    const section = screen.getByText('Backup').closest('section')
    await user.click(section.querySelector('input[type=checkbox]'))
    await user.click(within(section).getByText('Elegir…'))
    await user.click(screen.getByLabelText('Guardar backup'))

    expect(await screen.findByText('Configuración guardada.')).toBeInTheDocument()
  })

  it('gate: destino sin disparadores no es válido', async () => {
    const user = userEvent.setup()
    api.pickDirectory.mockResolvedValue('/mnt/backup')
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    const section = screen.getByText('Backup').closest('section')
    await user.click(section.querySelector('input[type=checkbox]'))
    await user.click(within(section).getByText('Elegir…'))
    await user.click(screen.getByLabelText('Al iniciar')) // deja ambos triggers en false
    await user.click(screen.getByLabelText('Guardar backup'))

    expect(api.backupConfigSet).not.toHaveBeenCalled()
    expect(screen.getByText(/requiere un destino y al menos un disparador/i)).toBeInTheDocument()
  })

  it('permite editar intervalo y disparadores', async () => {
    const user = userEvent.setup()
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Intervalo de backup'), { target: { value: '30' } })
    await user.click(screen.getByLabelText('Mientras la app corre'))
    await user.click(screen.getByLabelText('Al iniciar'))

    expect(screen.getByLabelText('Intervalo de backup')).toHaveValue(30)
    expect(screen.getByLabelText('Mientras la app corre')).toBeChecked()
  })

  it('muestra error si falla el backup manual', async () => {
    const user = userEvent.setup()
    api.backupConfigGet.mockResolvedValue({ ...emptyBackup(), destinationDir: '/mnt/backup' })
    api.backupCreate.mockRejectedValue(new Error('bk fail'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(await screen.findByLabelText('Backup ahora'))

    expect(await screen.findByText(/Backup falló: bk fail/)).toBeInTheDocument()
  })

  it('no restaura si no se elige archivo', async () => {
    const user = userEvent.setup()
    api.pickFile.mockResolvedValue(null)
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Restaurar'))

    await waitFor(() => expect(api.pickFile).toHaveBeenCalled())
    expect(api.backupRestore).not.toHaveBeenCalled()
    expect(window.confirm).not.toHaveBeenCalled()
  })

  it('no restaura si se cancela la confirmación', async () => {
    const user = userEvent.setup()
    api.pickFile.mockResolvedValue('/b/x.zip')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Restaurar'))

    await waitFor(() => expect(confirmSpy).toHaveBeenCalled())
    expect(api.backupRestore).not.toHaveBeenCalled()
  })

  it('restaura aunque no haya backup de seguridad', async () => {
    const user = userEvent.setup()
    api.pickFile.mockResolvedValue('/b/x.zip')
    api.backupRestore.mockResolvedValue(null)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Restaurar'))

    expect(await screen.findByText(/Backup de seguridad: —/)).toBeInTheDocument()
  })

  it('muestra error si falla el restore', async () => {
    const user = userEvent.setup()
    api.pickFile.mockResolvedValue('/b/x.zip')
    api.backupRestore.mockRejectedValue(new Error('rst fail'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Backup')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Restaurar'))

    expect(await screen.findByText(/Restore falló: rst fail/)).toBeInTheDocument()
  })

  it('rechaza archivos que no son TSV', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(screen.getByLabelText('Elegir archivo TSV'), { target: { files: [file] } })

    expect(await screen.findByText('Seleccioná un archivo TSV')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('ignora el cambio de archivo sin archivo', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Elegir archivo TSV'), { target: { files: [] } })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.queryByText(/Importando|Importación/)).not.toBeInTheDocument()
  })

  it('muestra el mensaje del servidor si falla el import', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'bad format' }) })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

    const file = new File(['a\tb'], 'test.tsv', { type: 'text/tab-separated-values' })
    await user.upload(screen.getByLabelText('Elegir archivo TSV'), file)

    expect(await screen.findByText('Falló la importación: bad format')).toBeInTheDocument()
  })

  it('usa "error desconocido" cuando el servidor no informa detalle', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

    const file = new File(['a\tb'], 'test.tsv', { type: 'text/tab-separated-values' })
    await user.upload(screen.getByLabelText('Elegir archivo TSV'), file)

    expect(await screen.findByText('Falló la importación: error desconocido')).toBeInTheDocument()
  })

  it('muestra error si el import lanza', async () => {
    const user = userEvent.setup()
    global.fetch.mockRejectedValueOnce(new Error('net'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

    const file = new File(['a\tb'], 'test.tsv', { type: 'text/tab-separated-values' })
    await user.upload(screen.getByLabelText('Elegir archivo TSV'), file)

    expect(await screen.findByText('Falló la importación: net')).toBeInTheDocument()
  })

  it('muestra error si falla la exportación', async () => {
    const user = userEvent.setup()
    api.entryExport.mockRejectedValue(new Error('exp'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Exportar TSV' }))

    expect(await screen.findByText('Falló la exportación: exp')).toBeInTheDocument()
  })

  it('no intenta descargar si createObjectURL no está disponible', async () => {
    const user = userEvent.setup()
    const originalCreate = global.URL.createObjectURL
    global.URL.createObjectURL = undefined
    api.entryExport.mockResolvedValue('Titulo\tx')
    try {
      render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
      await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Exportar TSV' }))

      expect(await screen.findByText('¡Exportación lista!')).toBeInTheDocument()
    } finally {
      global.URL.createObjectURL = originalCreate
    }
  })

  it('descarga el TSV exportado', async () => {
    const user = userEvent.setup()
    const createSpy = vi.fn(() => 'blob:mangacount')
    const revokeSpy = vi.fn()
    const originalCreate = global.URL.createObjectURL
    const originalRevoke = global.URL.revokeObjectURL
    global.URL.createObjectURL = createSpy
    global.URL.revokeObjectURL = revokeSpy
    api.entryExport.mockResolvedValue('Titulo\tx')
    try {
      render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
      await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Exportar TSV' }))

      await waitFor(() => expect(createSpy).toHaveBeenCalled())
      expect(revokeSpy).toHaveBeenCalledWith('blob:mangacount')
      expect(await screen.findByText('¡Exportación lista!')).toBeInTheDocument()
    } finally {
      global.URL.createObjectURL = originalCreate
      global.URL.revokeObjectURL = originalRevoke
    }
  })

  it('deshabilita el intercambio sin perfil seleccionado', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={null} />)
    await waitFor(() => expect(screen.getByText('Importar / Exportar (TSV)')).toBeInTheDocument())

    expect(screen.getByText('Elegí un perfil primero')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar TSV' })).toBeDisabled()
  })

  it('muestra error si falla guardar el token del bot', async () => {
    const user = userEvent.setup()
    api.botSetToken.mockRejectedValue(new Error('tok'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Bot (Discord)')).toBeInTheDocument())

    await user.type(screen.getByLabelText('Token de Discord'), 'abc')
    await user.click(screen.getByText('Guardar token'))

    expect(await screen.findByText(/No se pudo guardar el token: tok/)).toBeInTheDocument()
  })

  it('muestra error si falla guardar la config del bot', async () => {
    const user = userEvent.setup()
    api.botConfigSet.mockRejectedValue(new Error('cfg'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Bot (Discord)')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Guardar bot'))

    expect(await screen.findByText(/No se pudo guardar: cfg/)).toBeInTheDocument()
  })

  it('guarda el bot sin guildId usando null', async () => {
    const user = userEvent.setup()
    api.botConfigSet.mockResolvedValue({})
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Bot (Discord)')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Guardar bot'))

    await waitFor(() => expect(api.botConfigSet).toHaveBeenCalled())
    expect(api.botConfigSet.mock.calls[0][0]).toMatchObject({ guildId: null, allowedUserIds: [] })
  })

  it('refleja token y usuarios permitidos del bot', async () => {
    const user = userEvent.setup()
    api.botConfigGet.mockResolvedValue({
      enabled: true,
      guildId: 'g1',
      allowedUserIds: null,
      status: 'conectado',
      hasToken: true,
    })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Bot (Discord)')).toBeInTheDocument())

    expect(screen.getByLabelText('Token de Discord')).toHaveAttribute('placeholder', '••••••••')
    expect(screen.getByLabelText('Usuarios permitidos')).toHaveValue('')
    expect(screen.getByText('Estado: conectado')).toBeInTheDocument()
    expect(screen.getByLabelText('Habilitar bot')).toBeChecked()

    await user.click(screen.getByLabelText('Habilitar bot'))
    expect(screen.getByLabelText('Habilitar bot')).not.toBeChecked()
  })

  it('muestra error si falla copiar el diagnóstico', async () => {
    const user = userEvent.setup()
    api.diagnosticsCopy.mockRejectedValue(new Error('cp'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Diagnóstico')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Copiar diagnóstico'))

    expect(await screen.findByText(/No se pudo copiar: cp/)).toBeInTheDocument()
  })

  it('abre la carpeta de logs', async () => {
    const user = userEvent.setup()
    api.openLogs.mockResolvedValue({ opened: true })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Diagnóstico')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Abrir carpeta de logs'))

    await waitFor(() => expect(api.openLogs).toHaveBeenCalled())
  })

  it('muestra error si falla abrir los logs', async () => {
    const user = userEvent.setup()
    api.openLogs.mockRejectedValue(new Error('ol'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Diagnóstico')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Abrir carpeta de logs'))

    expect(await screen.findByText(/No se pudo abrir: ol/)).toBeInTheDocument()
  })

  it('la Nuclear Option cae a onImportSuccess si no hay onDataReset', async () => {
    const user = userEvent.setup()
    const onImportSuccess = vi.fn()
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} onImportSuccess={onImportSuccess} />)
    await waitFor(() => expect(screen.getByLabelText('Nuclear Option')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Nuclear Option'))
    await user.click(screen.getByText('nuke-mock'))

    expect(onImportSuccess).toHaveBeenCalledTimes(1)
  })

  it('cierra el modal de Nuclear Option sin borrar', async () => {
    const user = userEvent.setup()
    const onDataReset = vi.fn()
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} onDataReset={onDataReset} />)
    await waitFor(() => expect(screen.getByLabelText('Nuclear Option')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Nuclear Option'))
    await user.click(screen.getByText('nuke-close'))

    await waitFor(() => expect(screen.queryByText('nuke-close')).not.toBeInTheDocument())
    expect(onDataReset).not.toHaveBeenCalled()
  })

  it('bulk de portadas: informa cuando todas ya están vinculadas', async () => {
    const user = userEvent.setup()
    api.mangaList.mockResolvedValue([{ id: 1, name: 'A' }])
    api.coverAll.mockResolvedValue({ 1: { url: 'mangacount://covers/1.jpg', isAdult: false } })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)

    await user.click(await screen.findByRole('button', { name: /Traer portadas faltantes/ }))

    expect(await screen.findByText('Todas las portadas ya están vinculadas.')).toBeInTheDocument()
  })

  it('bulk de portadas: informa si no puede leer la colección', async () => {
    const user = userEvent.setup()
    api.mangaList.mockRejectedValue(new Error('x'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)

    await user.click(await screen.findByRole('button', { name: /Traer portadas faltantes/ }))

    expect(await screen.findByText('No se pudo leer la colección.')).toBeInTheDocument()
  })

  it('bulk de portadas: se detiene ante un error y notifica', async () => {
    const user = userEvent.setup()
    const onImportSuccess = vi.fn()
    api.mangaList.mockResolvedValue([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    api.coverAll.mockResolvedValue({})
    api.coverAuto.mockRejectedValue(new Error('429'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} onImportSuccess={onImportSuccess} />)

    await user.click(await screen.findByRole('button', { name: /Traer portadas faltantes/ }))

    expect(await screen.findByText(/AniList limitó las peticiones/)).toBeInTheDocument()
    expect(onImportSuccess).toHaveBeenCalled()
  })

  it('bulk de portadas: cuenta cero nuevas si coverAuto no devuelve url', async () => {
    const user = userEvent.setup()
    api.mangaList.mockResolvedValue([{ id: 1, name: 'A' }])
    api.coverAll.mockResolvedValue({})
    api.coverAuto.mockResolvedValue(null)
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)

    await user.click(await screen.findByRole('button', { name: /Traer portadas faltantes/ }))

    expect(await screen.findByText(/Listo: 0 portadas nuevas/)).toBeInTheDocument()
  })

  it('bulk de portadas: usa defaults si los campos están vacíos', async () => {
    const user = userEvent.setup()
    api.mangaList.mockResolvedValue([{ id: 1, name: 'A' }])
    api.coverAll.mockResolvedValue({})
    api.coverAuto.mockResolvedValue('u')
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)

    fireEvent.change(screen.getByLabelText('Tamaño de lote'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Pausa entre lotes (min)'), { target: { value: '' } })

    await user.click(screen.getByRole('button', { name: /Traer portadas faltantes/ }))

    expect(await screen.findByText(/Listo: 1 portadas nuevas/)).toBeInTheDocument()
  })

  it('bulk de portadas: aplica la espera intra-lote cuando no hay pausa configurada', async () => {
    const user = userEvent.setup()
    api.mangaList.mockResolvedValue([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    api.coverAll.mockResolvedValue({})
    api.coverAuto.mockResolvedValue('u')
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)

    fireEvent.change(screen.getByLabelText('Pausa entre lotes (min)'), { target: { value: '0' } })

    await user.click(await screen.findByRole('button', { name: /Traer portadas faltantes/ }))

    await waitFor(
      () => expect(screen.getByText(/Listo: 2 portadas nuevas/)).toBeInTheDocument(),
      { timeout: 8000 }
    )
    expect(api.coverAuto).toHaveBeenCalledTimes(2)
  })

  it('bulk de portadas: recorre varios mangas con pausa entre lotes y se puede detener', async () => {
    vi.useFakeTimers()
    try {
      api.mangaList.mockResolvedValue([{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }])
      api.coverAll.mockResolvedValue({})
      api.coverAuto.mockResolvedValue('u')
      const onImportSuccess = vi.fn()
      render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} onImportSuccess={onImportSuccess} />)

      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })

      fireEvent.change(screen.getByLabelText('Tamaño de lote'), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText('Pausa entre lotes (min)'), { target: { value: '1' } })
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Traer portadas faltantes/ }))
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(screen.getByText(/reanuda en 1:00/)).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Detener' }))
        await vi.advanceTimersByTimeAsync(1000)
      })

      expect(screen.getByText(/Listo: 1 portadas nuevas/)).toBeInTheDocument()
      expect(onImportSuccess).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('toggle de contenido +18 persiste showAdultCovers', async () => {
    const user = userEvent.setup()
    api.appConfigGet.mockResolvedValue({
      startInTray: true,
      updateCheck: true,
      diagnosticsCopy: true,
      showAdultCovers: false,
    })
    api.appConfigSet.mockResolvedValue({ showAdultCovers: true })

    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)

    await user.click(await screen.findByLabelText(/Incluir resultados \+18/))

    await waitFor(() => expect(api.appConfigSet).toHaveBeenCalledWith({ showAdultCovers: true }))
  })

  it('guarda la config de recomendaciones', async () => {
    const user = userEvent.setup()
    api.recommendationConfigSet.mockResolvedValue({ enabled: true, limit: 5, seenTtlDays: 60 })
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Recomendaciones (AniList)')).toBeInTheDocument())

    const limit = screen.getByLabelText('Cantidad de recomendaciones')
    await user.clear(limit)
    await user.type(limit, '5')
    await user.click(screen.getByLabelText('Guardar recomendaciones'))

    await waitFor(() => expect(api.recommendationConfigSet).toHaveBeenCalled())
    expect(api.recommendationConfigSet.mock.calls[0][0]).toMatchObject({ enabled: true, limit: 5 })
    expect(await screen.findByText('Configuración de recomendaciones guardada.')).toBeInTheDocument()
  })

  it('muestra error si falla guardar la config de recomendaciones', async () => {
    const user = userEvent.setup()
    api.recommendationConfigSet.mockRejectedValue(new Error('rec fail'))
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByLabelText('Guardar recomendaciones')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Guardar recomendaciones'))

    expect(await screen.findByText('No se pudo guardar: rec fail')).toBeInTheDocument()
  })
})
