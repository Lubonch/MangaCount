import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as api from '../../api/localAdapter.js'

// ---------------------------------------------------------------------------
// Funciones tipadas — camino Electron (`window.mangaCount.invoke`)
// ---------------------------------------------------------------------------

describe('localAdapter · funciones tipadas (IPC de Electron)', () => {
  let invoke

  beforeEach(() => {
    invoke = vi.fn().mockResolvedValue('IPC-RESULT')
    window.mangaCount = { invoke }
  })

  afterEach(() => {
    delete window.mangaCount
  })

  const ipcCases = [
    ['profileList', () => api.profileList(), 'profile:list', []],
    ['profileGet', () => api.profileGet(7), 'profile:get', [7]],
    ['profileUpsert', () => api.profileUpsert({ id: 1 }), 'profile:upsert', [{ id: 1 }]],
    ['profileDelete', () => api.profileDelete(7), 'profile:delete', [7]],
    [
      'profileUploadPicture',
      () => api.profileUploadPicture(3, 'a.png', new Uint8Array([1, 2])),
      'profile:upload-picture',
      [{ profileId: 3, originalName: 'a.png', buffer: [1, 2] }],
    ],
    ['entryList', () => api.entryList(2), 'entry:list', [2]],
    ['entryGet', () => api.entryGet(4), 'entry:get-by-id', [4]],
    ['entryUpsert', () => api.entryUpsert({ id: 1 }), 'entry:upsert', [{ id: 1 }]],
    ['entryImport', () => api.entryImport(2, 'a\tb'), 'entry:import', [{ profileId: 2, tsv: 'a\tb' }]],
    ['entryExport', () => api.entryExport(2), 'entry:export', [2]],
    ['entryUsedFormats', () => api.entryUsedFormats(2), 'entry:used-formats', [2]],
    ['entryUsedPublishers', () => api.entryUsedPublishers(2), 'entry:used-publishers', [2]],
    ['mangaList', () => api.mangaList(), 'manga:list', []],
    ['mangaGet', () => api.mangaGet(5), 'manga:get', [5]],
    ['mangaUpsert', () => api.mangaUpsert({ id: 5 }), 'manga:upsert', [{ id: 5 }]],
    ['mangaDelete', () => api.mangaDelete(5), 'manga:delete', [5]],
    ['formatList', () => api.formatList(), 'format:list', []],
    ['formatCreate', () => api.formatCreate('A5'), 'format:create', [{ name: 'A5' }]],
    ['publisherList', () => api.publisherList(), 'publisher:list', []],
    ['publisherCreate', () => api.publisherCreate('P'), 'publisher:create', [{ name: 'P' }]],
    ['recommendationGet (limit por defecto)', () => api.recommendationGet(2), 'recommendation:get', [{ profileId: 2, limit: 10 }]],
    ['recommendationGet (limit explícito)', () => api.recommendationGet(2, 5), 'recommendation:get', [{ profileId: 2, limit: 5 }]],
    ['coverSearch', () => api.coverSearch('x'), 'cover:search', [{ query: 'x' }]],
    ['coverSearch (query vacía)', () => api.coverSearch(), 'cover:search', [{ query: undefined }]],
    ['coverLink', () => api.coverLink(5, { id: 1 }), 'cover:link', [{ mangaId: 5, candidate: { id: 1 } }]],
    ['coverFetch', () => api.coverFetch(5, 'u'), 'cover:fetch', [{ mangaId: 5, coverUrl: 'u' }]],
    ['coverUnlink', () => api.coverUnlink(5), 'cover:unlink', [5]],
    ['coverStatus', () => api.coverStatus(5), 'cover:status', [5]],
    ['coverAll', () => api.coverAll(), 'cover:all', []],
    ['coverAuto', () => api.coverAuto(5), 'cover:auto', [5]],
    ['databaseStatistics', () => api.databaseStatistics(), 'database:statistics', []],
    ['databaseNukeLocal', () => api.databaseNukeLocal(), 'database:nuke-local', []],
    ['backupConfigGet', () => api.backupConfigGet(), 'backup:config-get', []],
    ['backupConfigSet', () => api.backupConfigSet({ enabled: true }), 'backup:config-set', [{ enabled: true }]],
    ['backupList', () => api.backupList(), 'backup:list', []],
    ['backupCreate', () => api.backupCreate('/d'), 'backup:create', ['/d']],
    ['backupRestore', () => api.backupRestore('/z'), 'backup:restore', ['/z']],
    ['botConfigGet', () => api.botConfigGet(), 'bot:config-get', []],
    ['botConfigSet', () => api.botConfigSet({ enabled: false }), 'bot:config-set', [{ enabled: false }]],
    ['botSetToken', () => api.botSetToken('t'), 'bot:set-token', ['t']],
    ['botStatus', () => api.botStatus(), 'bot:status', []],
    ['botAutostartGet', () => api.botAutostartGet(), 'bot:autostart-get', []],
    ['botAutostartSet', () => api.botAutostartSet(true), 'bot:autostart-set', [true]],
    ['appConfigGet', () => api.appConfigGet(), 'app:config-get', []],
    ['appConfigSet', () => api.appConfigSet({ startInTray: true }), 'app:config-set', [{ startInTray: true }]],
    ['appInfo', () => api.appInfo(), 'app:info', []],
    ['updateCheck', () => api.updateCheck(), 'update:check', []],
    ['updateState', () => api.updateState(), 'update:get-state', []],
    ['updateDownload', () => api.updateDownload(), 'update:download', []],
    ['updateInstall', () => api.updateInstall(), 'update:install', []],
    ['logError', () => api.logError({ msg: 'x' }), 'log:error', [{ msg: 'x' }]],
    ['diagnosticsCopy', () => api.diagnosticsCopy(), 'diagnostics:copy', []],
    ['openLogs', () => api.openLogs(), 'diagnostics:open-logs', []],
    ['pickDirectory', () => api.pickDirectory(), 'dialog:pick-directory', []],
    ['pickFile (sin filtros)', () => api.pickFile(), 'dialog:pick-file', [undefined]],
    ['pickFile (con filtros)', () => api.pickFile({ types: ['zip'] }), 'dialog:pick-file', [{ types: ['zip'] }]],
  ]

  it.each(ipcCases)('%s delega en el canal correcto', async (_label, run, channel, args) => {
    await expect(run()).resolves.toBe('IPC-RESULT')
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith(channel, ...args)
  })
})

// ---------------------------------------------------------------------------
// Funciones tipadas — fallback `fetch` (navegador)
// ---------------------------------------------------------------------------

describe('localAdapter · fallback fetch (navegador)', () => {
  beforeEach(() => {
    delete window.mangaCount
    global.fetch = vi.fn()
  })

  it('apiCall devuelve el json cuando response.ok', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ a: 1 }) })
    await expect(api.profileList()).resolves.toEqual({ a: 1 })
    expect(global.fetch).toHaveBeenCalledWith('/api/profile', undefined)
  })

  it('apiCall envía el body JSON en el fallback', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 1 }) })
    await expect(api.profileUpsert({ id: 1 })).resolves.toEqual({ id: 1 })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ id: 1 }) })
    )
  })

  it('apiCall lanza un error con el status cuando !response.ok', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 503 })
    await expect(api.profileGet(7)).rejects.toThrow('HTTP 503 en /api/profile/7')
  })
})

// ---------------------------------------------------------------------------
// Helpers y `isElectron`
// ---------------------------------------------------------------------------

describe('localAdapter · isElectron y onUpdateState', () => {
  afterEach(() => {
    delete window.mangaCount
  })

  it('isElectron refleja la presencia de window.mangaCount.invoke', () => {
    expect(api.isElectron()).toBe(false)
    window.mangaCount = { invoke: () => {} }
    expect(api.isElectron()).toBe(true)
  })

  it('onUpdateState devuelve un no-op cuando no hay Electron', () => {
    const off = api.onUpdateState(() => {})
    expect(typeof off).toBe('function')
    expect(() => off()).not.toThrow()
  })

  it('onUpdateState devuelve un no-op si Electron no expone el listener', () => {
    window.mangaCount = { invoke: () => {} }
    const off = api.onUpdateState(() => {})
    expect(typeof off).toBe('function')
    expect(() => off()).not.toThrow()
  })

  it('onUpdateState delega en el listener de Electron', () => {
    const cb = vi.fn()
    const off = vi.fn()
    const onUpdateState = vi.fn(() => off)
    window.mangaCount = { invoke: () => {}, onUpdateState }
    const result = api.onUpdateState(cb)
    expect(onUpdateState).toHaveBeenCalledWith(cb)
    expect(result).toBe(off)
  })
})

// ---------------------------------------------------------------------------
// installApiFetchShim
// ---------------------------------------------------------------------------

describe('localAdapter · installApiFetchShim', () => {
  let realFetch
  let savedFetch

  const fakeFile = (name, bytes, text) => ({
    name,
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
    text: async () => text,
  })
  const formBody = (file) => ({ get: (key) => (key === 'file' ? file : null) })

  function install() {
    delete window.__mangaCountFetchShim
    realFetch = vi.fn().mockResolvedValue('REAL')
    window.fetch = realFetch
    const invoke = vi.fn().mockResolvedValue({ ok: true })
    window.mangaCount = { invoke }
    api.installApiFetchShim(window)
    return invoke
  }

  beforeEach(() => {
    savedFetch = window.fetch
  })

  afterEach(() => {
    window.fetch = savedFetch
    delete window.__mangaCountFetchShim
    delete window.mangaCount
  })

  it('no hace nada fuera de Electron', () => {
    delete window.mangaCount
    window.fetch = realFetch = vi.fn()
    api.installApiFetchShim(window)
    expect(window.fetch).toBe(realFetch)
    expect(window.__mangaCountFetchShim).toBeUndefined()
  })

  it('no hace nada si el target es falsy', () => {
    window.mangaCount = { invoke: vi.fn() }
    window.fetch = realFetch = vi.fn()
    api.installApiFetchShim(null)
    expect(window.fetch).toBe(realFetch)
  })

  it('usa el target por defecto (window) cuando no se pasa argumento', () => {
    delete window.mangaCount
    window.fetch = realFetch = vi.fn()
    api.installApiFetchShim()
    expect(window.fetch).toBe(realFetch)
  })

  it('es idempotente si ya está instalado', () => {
    window.mangaCount = { invoke: vi.fn() }
    window.fetch = realFetch = vi.fn()
    window.__mangaCountFetchShim = true
    api.installApiFetchShim(window)
    expect(window.fetch).toBe(realFetch)
  })

  it('instala el shim y devuelve una respuesta tipo Response', async () => {
    const invoke = install()
    invoke.mockResolvedValue({ hello: 'world' })
    const res = await window.fetch('/api/profile')
    expect(invoke).toHaveBeenCalledWith('profile:list')
    expect(res.ok).toBe(true)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ hello: 'world' })
  })

  const routeCases = [
    { url: '/api/profile', method: 'GET', channel: 'profile:list' },
    { url: '/api/profile', method: 'POST', body: JSON.stringify({ name: 'n' }), channel: 'profile:upsert', args: [{ name: 'n' }] },
    { url: '/api/profile/9', method: 'DELETE', channel: 'profile:delete', args: [9] },
    { url: '/api/entry/filters/formats?profileId=3', method: 'GET', channel: 'entry:used-formats', args: [3] },
    { url: '/api/entry/filters/formats', method: 'GET', channel: 'entry:used-formats', args: [null] },
    { url: '/api/entry/filters/publishers?profileId=', method: 'GET', channel: 'entry:used-publishers', args: [null] },
    { url: '/api/entry?profileId=2', method: 'GET', channel: 'entry:list', args: [2] },
    { url: '/api/entry', method: 'POST', body: JSON.stringify({ x: 1 }), channel: 'entry:upsert', args: [{ x: 1 }] },
    { url: '/api/manga', method: 'GET', channel: 'manga:list' },
    { url: '/api/manga', method: 'POST', body: JSON.stringify({ name: 'm' }), channel: 'manga:upsert', args: [{ name: 'm' }] },
    { url: '/api/manga/7', method: 'PUT', body: JSON.stringify({ name: 'm' }), channel: 'manga:upsert', args: [{ name: 'm', id: 7 }] },
    { url: '/api/format', method: 'GET', channel: 'format:list' },
    { url: '/api/format', method: 'POST', body: JSON.stringify({ name: 'A5' }), channel: 'format:create', args: [{ name: 'A5' }] },
    { url: '/api/publisher', method: 'GET', channel: 'publisher:list' },
    { url: '/api/publisher', method: 'POST', body: JSON.stringify({ name: 'P' }), channel: 'publisher:create', args: [{ name: 'P' }] },
    { url: '/api/recommendation?profileId=2', method: 'GET', channel: 'recommendation:get', args: [{ profileId: 2, limit: 10 }] },
    { url: '/api/recommendation?profileId=2&limit=5', method: 'GET', channel: 'recommendation:get', args: [{ profileId: 2, limit: 5 }] },
    { url: '/api/database/statistics', method: 'GET', channel: 'database:statistics' },
    { url: '/api/database/nuke', method: 'POST', body: '{}', channel: 'database:nuke-local' },
  ]

  it.each(routeCases)('$method $url → $channel', async (testCase) => {
    const invoke = install()
    const res = await window.fetch(testCase.url, { method: testCase.method, body: testCase.body })
    expect(res.ok).toBe(true)
    expect(res.status).toBe(200)
    expect(invoke).toHaveBeenCalledWith(testCase.channel, ...(testCase.args ?? []))
  })

  it('normaliza el método a mayúsculas', async () => {
    const invoke = install()
    await window.fetch('/api/profile', { method: 'get' })
    expect(invoke).toHaveBeenCalledWith('profile:list')
  })

  it('usa GET cuando no se especifica método', async () => {
    const invoke = install()
    await window.fetch('/api/profile')
    expect(invoke).toHaveBeenCalledWith('profile:list')
  })

  it('acepta un input con forma { url }', async () => {
    const invoke = install()
    await window.fetch({ url: '/api/profile' })
    expect(invoke).toHaveBeenCalledWith('profile:list')
  })

  it('sube la imagen al canal profile:upload-picture', async () => {
    const invoke = install()
    const body = formBody(fakeFile('a.png', [1, 2, 3], ''))
    await window.fetch('/api/profile/upload-picture/5', { method: 'POST', body })
    expect(invoke).toHaveBeenCalledWith('profile:upload-picture', {
      profileId: 5,
      originalName: 'a.png',
      buffer: [1, 2, 3],
    })
  })

  it('importa el TSV al canal entry:import', async () => {
    const invoke = install()
    const body = formBody(fakeFile('in.tsv', [], 'a\tb\nc\td'))
    await window.fetch('/api/entry/import/4', { method: 'POST', body })
    expect(invoke).toHaveBeenCalledWith('entry:import', { profileId: 4, tsv: 'a\tb\nc\td' })
  })

  it('rechaza la subida cuando no hay fichero', async () => {
    install()
    await expect(
      window.fetch('/api/profile/upload-picture/5', { method: 'POST', body: { get: () => null } })
    ).rejects.toThrow('No file uploaded')
  })

  it('rechaza la importación cuando no hay fichero', async () => {
    install()
    await expect(window.fetch('/api/entry/import/4', { method: 'POST', body: {} })).rejects.toThrow(
      'No file uploaded'
    )
  })

  it('devuelve {} cuando el body no es JSON válido', async () => {
    const invoke = install()
    await window.fetch('/api/entry', { method: 'POST', body: '{invalid' })
    expect(invoke).toHaveBeenCalledWith('entry:upsert', {})
  })

  it('devuelve {} cuando no hay body', async () => {
    const invoke = install()
    await window.fetch('/api/profile', { method: 'POST' })
    expect(invoke).toHaveBeenCalledWith('profile:upsert', {})
  })

  it('delega en el fetch real para rutas que no son /api/*', async () => {
    install()
    const out = await window.fetch('/no-api')
    expect(out).toBe('REAL')
    expect(realFetch).toHaveBeenCalledWith('/no-api', {})
  })

  it('delega en el fetch real con input vacío', async () => {
    install()
    const out = await window.fetch('')
    expect(out).toBe('REAL')
  })

  it('delega en el fetch real cuando no hay input', async () => {
    install()
    const out = await window.fetch()
    expect(out).toBe('REAL')
  })

  it('rechaza las rutas /api sin canal IPC', async () => {
    install()
    await expect(window.fetch('/api/unknown')).rejects.toThrow('Ruta /api sin canal IPC')
  })

  it('rechaza cuando el método no coincide con ninguna ruta', async () => {
    install()
    await expect(window.fetch('/api/profile', { method: 'DELETE' })).rejects.toThrow(
      'Ruta /api sin canal IPC'
    )
  })

  it('usa globalThis.fetch cuando el target no tiene fetch', async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true })
    window.mangaCount = { invoke }
    const globalFetch = vi.fn().mockResolvedValue('REAL')
    global.fetch = globalFetch
    const target = { mangaCount: window.mangaCount }
    api.installApiFetchShim(target)
    await expect(target.fetch('/no-api')).resolves.toBe('REAL')
    expect(globalFetch).toHaveBeenCalledWith('/no-api', {})
  })
})
