import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '../test-utils'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/localAdapter.js', () => ({
  appConfigGet: vi.fn(),
  appConfigSet: vi.fn(),
  appInfo: vi.fn(),
  updateCheck: vi.fn(),
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
}))

vi.mock('../../components/NukeDataModal', () => ({
  default: ({ isOpen, onSuccess }) =>
    isOpen ? <button onClick={onSuccess}>nuke-mock</button> : null,
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
  api.appConfigGet.mockResolvedValue({ startInTray: true, updateCheck: true })
  api.appInfo.mockResolvedValue({ version: '1.0.8', platform: 'linux', arch: 'x64', packaged: true })
  api.updateCheck.mockResolvedValue({ current: '1.0.8', latest: '1.0.8', hasUpdate: false })
  api.backupConfigGet.mockResolvedValue(emptyBackup())
  api.backupList.mockResolvedValue([])
  api.botConfigGet.mockResolvedValue({ enabled: false, guildId: null, allowedUserIds: [], status: 'apagado', hasToken: false })
  api.botAutostartGet.mockResolvedValue({ enabled: false })
}

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
  })

  it('no renderiza nada si está cerrado', () => {
    render(<SettingsModal isOpen={false} onClose={() => {}} selectedProfile={profile} />)
    expect(screen.queryByText('⚙️ Settings')).not.toBeInTheDocument()
  })

  it('muestra las cuatro secciones', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
    expect(screen.getByText('Backup')).toBeInTheDocument()
    expect(screen.getByText('Intercambio')).toBeInTheDocument()
    expect(screen.getByText('Bot (Discord)')).toBeInTheDocument()
    expect(screen.getByLabelText('Choose TSV File')).toBeInTheDocument()
  })

  it('incluye la Danger Zone con la Nuclear Option', async () => {
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText(/Danger Zone/)).toBeInTheDocument())
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

  it('exporta TSV del perfil activo', async () => {
    const user = userEvent.setup()
    api.entryExport.mockResolvedValue('Titulo\nx')
    render(<SettingsModal isOpen onClose={() => {}} selectedProfile={profile} />)
    await waitFor(() => expect(screen.getByText('Intercambio')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Export TSV' }))
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
    await waitFor(() => expect(screen.getByLabelText('Choose TSV File')).toBeInTheDocument())

    const file = new File(['a\tb'], 'test.tsv', { type: 'text/tab-separated-values' })
    await user.upload(screen.getByLabelText('Choose TSV File'), file)

    await waitFor(() => expect(screen.getByText('Import successful!')).toBeInTheDocument())
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
})
