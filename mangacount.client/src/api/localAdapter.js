// Adaptador de transporte para el renderer.
//
// Dos superficies:
// 1. Funciones tipadas (`profileList`, `entryImport`, …) que delegan en
//    `window.mangaCount.invoke(canal, ...args)` dentro de Electron y conservan
//    `fetch` como fallback en navegador (dev web).
// 2. `installApiFetchShim()`: reemplaza `window.fetch` para las rutas `/api/*`
//    y las enruta a IPC devolviendo un objeto tipo `Response` (`ok`, `status`,
//    `json()`). Así los componentes existentes (`response.ok` / `response.json()`)
//    no necesitan reescribirse. Canales según parity-matrix.md.

const isElectron = () =>
  typeof window !== 'undefined' && typeof window.mangaCount?.invoke === 'function';

export async function apiCall(channel, fallbackUrl, options, ...args) {
  if (isElectron()) {
    return window.mangaCount.invoke(channel, ...args);
  }
  const response = await fetch(fallbackUrl, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} en ${fallbackUrl}`);
  }
  return response.json();
}

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// Perfiles (matriz filas 1-4)
export const profileList = () => apiCall('profile:list', '/api/profile');
export const profileGet = (id) => apiCall('profile:get', `/api/profile/${id}`, undefined, id);
export const profileUpsert = (profile) =>
  apiCall('profile:upsert', '/api/profile', json(profile), profile);
export const profileDelete = (id) =>
  apiCall('profile:delete', `/api/profile/${id}`, { method: 'DELETE' }, id);
export const profileUploadPicture = (profileId, originalName, bytes) =>
  apiCall(
    'profile:upload-picture',
    `/api/profile/upload-picture/${profileId}`,
    undefined,
    { profileId, originalName, buffer: Array.from(bytes) }
  );

// Entries (filas 5-9)
export const entryList = (profileId) =>
  apiCall('entry:list', `/api/entry?profileId=${profileId}`, undefined, profileId);
export const entryGet = (id) => apiCall('entry:get-by-id', `/api/entry/${id}`, undefined, id);
export const entryUpsert = (entry) => apiCall('entry:upsert', '/api/entry', json(entry), entry);
export const entryImport = (profileId, tsv) =>
  apiCall('entry:import', `/api/entry/import/${profileId}`, undefined, { profileId, tsv });
export const entryExport = (profileId) =>
  apiCall('entry:export', `/api/entry/export/${profileId}`, undefined, profileId);
export const entryUsedFormats = (profileId) =>
  apiCall('entry:used-formats', `/api/entry/filters/formats?profileId=${profileId}`, undefined, profileId);
export const entryUsedPublishers = (profileId) =>
  apiCall('entry:used-publishers', `/api/entry/filters/publishers?profileId=${profileId}`, undefined, profileId);

// Mangas + catálogos (filas 10-13)
export const mangaList = () => apiCall('manga:list', '/api/manga');
export const mangaGet = (id) => apiCall('manga:get', `/api/manga/${id}`, undefined, id);
export const mangaUpsert = (manga) => apiCall('manga:upsert', '/api/manga', json(manga), manga);
export const mangaDelete = (id) =>
  apiCall('manga:delete', `/api/manga/${id}`, { method: 'DELETE' }, id);
export const formatList = () => apiCall('format:list', '/api/format');
export const formatCreate = (name) => apiCall('format:create', '/api/format', json({ name }), { name });
export const publisherList = () => apiCall('publisher:list', '/api/publisher');
export const publisherCreate = (name) =>
  apiCall('publisher:create', '/api/publisher', json({ name }), { name });

// Recomendaciones (fila 14)
export const recommendationGet = (profileId, limit = 10) =>
  apiCall(
    'recommendation:get',
    `/api/recommendation?profileId=${profileId}&limit=${limit}`,
    undefined,
    { profileId, limit }
  );
export const recommendationDismiss = ({ profileId, provider, externalId }) =>
  apiCall('recommendation:dismiss', '/api/recommendation/dismiss', json({ profileId, provider, externalId }), {
    profileId,
    provider,
    externalId,
  });
export const recommendationOwn = (payload) =>
  apiCall('recommendation:own', '/api/recommendation/own', json(payload), payload);
export const recommendationConfigGet = () =>
  apiCall('recommendation:config-get', '/api/recommendation/config');
export const recommendationConfigSet = (config) =>
  apiCall('recommendation:config-set', '/api/recommendation/config', json(config), config);

// Portadas + vínculo externo (AniList)
export const coverSearch = (query) =>
  apiCall('cover:search', `/api/cover/search?query=${encodeURIComponent(query ?? '')}`, undefined, {
    query,
  });
export const coverLink = (mangaId, candidate) =>
  apiCall('cover:link', '/api/cover/link', json({ mangaId, candidate }), { mangaId, candidate });
export const coverLocal = (mangaId, sourcePath) =>
  apiCall('cover:local', '/api/cover/local', json({ mangaId, sourcePath }), { mangaId, sourcePath });
export const coverFetch = (mangaId, coverUrl) =>
  apiCall('cover:fetch', '/api/cover/fetch', json({ mangaId, coverUrl }), { mangaId, coverUrl });
export const coverUnlink = (mangaId) =>
  apiCall('cover:unlink', `/api/cover/unlink/${mangaId}`, { method: 'DELETE' }, mangaId);
export const coverStatus = (mangaId) =>
  apiCall('cover:status', `/api/cover/status/${mangaId}`, undefined, mangaId);
export const coverAll = () => apiCall('cover:all', '/api/cover');
export const coverAuto = (mangaId) =>
  apiCall('cover:auto', `/api/cover/auto/${mangaId}`, undefined, mangaId);

// Base local (fila 15)
export const databaseStatistics = () => apiCall('database:statistics', '/api/database/statistics');
export const databaseNukeLocal = () => apiCall('database:nuke-local', '/api/database/nuke', json({}));

// Backup y restore del sistema (Settings)
export const backupConfigGet = () => apiCall('backup:config-get', '/api/backup/config');
export const backupConfigSet = (config) =>
  apiCall('backup:config-set', '/api/backup/config', json(config), config);
export const backupList = () => apiCall('backup:list', '/api/backup');
export const backupCreate = (destinationDir) =>
  apiCall('backup:create', '/api/backup', json({}), destinationDir);
export const backupRestore = (zipPath) =>
  apiCall('backup:restore', '/api/backup/restore', json({ zipPath }), zipPath);

// Bot de Discord (Settings)
export const botConfigGet = () => apiCall('bot:config-get', '/api/bot/config');
export const botConfigSet = (config) =>
  apiCall('bot:config-set', '/api/bot/config', json(config), config);
export const botSetToken = (token) =>
  apiCall('bot:set-token', '/api/bot/token', json({ token }), token);
export const botStatus = () => apiCall('bot:status', '/api/bot/status');
export const botAutostartGet = () => apiCall('bot:autostart-get', '/api/bot/autostart');
export const botAutostartSet = (enabled) =>
  apiCall('bot:autostart-set', '/api/bot/autostart', json({ enabled }), enabled);

// Config general de la app
export const appConfigGet = () => apiCall('app:config-get', '/api/app/config');
export const appConfigSet = (config) =>
  apiCall('app:config-set', '/api/app/config', json(config), config);

// Info de la app y actualizaciones
export const appInfo = () => apiCall('app:info', '/api/app/info');
export const updateCheck = () => apiCall('update:check', '/api/update/check');
export const updateState = () => apiCall('update:get-state', '/api/update/state');
export const updateDownload = () => apiCall('update:download', '/api/update/download');
export const updateInstall = () => apiCall('update:install', '/api/update/install');

// Estado de update en vivo (push del main). Devuelve un `off`.
export const onUpdateState = (cb) => {
  if (isElectron() && typeof window.mangaCount?.onUpdateState === 'function') {
    return window.mangaCount.onUpdateState(cb);
  }
  return () => {};
};

// Diagnóstico (errores del renderer → main)
export const logError = (payload) =>
  apiCall('log:error', '/api/log/error', json(payload), payload);

// Diagnóstico (copiar estado+log / abrir logs)
export const diagnosticsCopy = () => apiCall('diagnostics:copy', '/api/diagnostics/copy');
export const openLogs = () => apiCall('diagnostics:open-logs', '/api/diagnostics/open-logs');

// Diálogos nativos de archivo
export const pickDirectory = () => apiCall('dialog:pick-directory', '/api/dialog/directory');
export const pickFile = (filters) =>
  apiCall('dialog:pick-file', '/api/dialog/file', json(filters ?? {}), filters);

// ---------------------------------------------------------------------------
// Shim de `window.fetch` para rutas /api/* (Electron)
// ---------------------------------------------------------------------------

const toIntOrNull = (value) => (value == null || value === '' ? null : Number(value));

const jsonBody = (options) => {
  try {
    return JSON.parse(options?.body ?? '{}');
  } catch {
    return {};
  }
};

const formFile = (options) => options?.body?.get?.('file') ?? null;

async function uploadArgs(profileId, options) {
  const file = formFile(options);
  if (!file) throw new Error('No file uploaded');
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { profileId, originalName: file.name, buffer: Array.from(bytes) };
}

async function importArgs(profileId, options) {
  const file = formFile(options);
  if (!file) throw new Error('No file uploaded');
  return { profileId, tsv: await file.text() };
}

// Orden: las rutas más específicas antes que las genéricas.
const routes = [
  { method: 'GET', pattern: /^\/api\/profile$/, build: () => ['profile:list'] },
  { method: 'POST', pattern: /^\/api\/profile$/, build: (_m, o) => ['profile:upsert', jsonBody(o)] },
  { method: 'DELETE', pattern: /^\/api\/profile\/(\d+)$/, build: (m) => ['profile:delete', Number(m[1])] },
  { method: 'POST', pattern: /^\/api\/profile\/upload-picture\/(\d+)$/, build: async (m, o) => ['profile:upload-picture', await uploadArgs(Number(m[1]), o)] },
  { method: 'GET', pattern: /^\/api\/entry\/filters\/formats$/, build: (_m, _o, u) => ['entry:used-formats', toIntOrNull(u.searchParams.get('profileId'))] },
  { method: 'GET', pattern: /^\/api\/entry\/filters\/publishers$/, build: (_m, _o, u) => ['entry:used-publishers', toIntOrNull(u.searchParams.get('profileId'))] },
  { method: 'GET', pattern: /^\/api\/entry$/, build: (_m, _o, u) => ['entry:list', toIntOrNull(u.searchParams.get('profileId'))] },
  { method: 'POST', pattern: /^\/api\/entry\/import\/(\d+)$/, build: async (m, o) => ['entry:import', await importArgs(Number(m[1]), o)] },
  { method: 'POST', pattern: /^\/api\/entry$/, build: (_m, o) => ['entry:upsert', jsonBody(o)] },
  { method: 'GET', pattern: /^\/api\/manga$/, build: () => ['manga:list'] },
  { method: 'POST', pattern: /^\/api\/manga$/, build: (_m, o) => ['manga:upsert', jsonBody(o)] },
  { method: 'PUT', pattern: /^\/api\/manga\/(\d+)$/, build: (m, o) => ['manga:upsert', { ...jsonBody(o), id: Number(m[1]) }] },
  { method: 'GET', pattern: /^\/api\/format$/, build: () => ['format:list'] },
  { method: 'POST', pattern: /^\/api\/format$/, build: (_m, o) => ['format:create', jsonBody(o)] },
  { method: 'GET', pattern: /^\/api\/publisher$/, build: () => ['publisher:list'] },
  { method: 'POST', pattern: /^\/api\/publisher$/, build: (_m, o) => ['publisher:create', jsonBody(o)] },
  { method: 'GET', pattern: /^\/api\/recommendation$/, build: (_m, _o, u) => ['recommendation:get', { profileId: Number(u.searchParams.get('profileId')), limit: Number(u.searchParams.get('limit') ?? 10) }] },
  { method: 'POST', pattern: /^\/api\/recommendation\/dismiss$/, build: (_m, o) => ['recommendation:dismiss', jsonBody(o)] },
  { method: 'POST', pattern: /^\/api\/recommendation\/own$/, build: (_m, o) => ['recommendation:own', jsonBody(o)] },
  { method: 'GET', pattern: /^\/api\/recommendation\/config$/, build: () => ['recommendation:config-get'] },
  { method: 'POST', pattern: /^\/api\/recommendation\/config$/, build: (_m, o) => ['recommendation:config-set', jsonBody(o)] },
  { method: 'GET', pattern: /^\/api\/database\/statistics$/, build: () => ['database:statistics'] },
  { method: 'POST', pattern: /^\/api\/database\/nuke$/, build: () => ['database:nuke-local'] },
];

function responseLike(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

// Reemplaza `fetch` en el renderer de Electron: `/api/*` → IPC (Response-like),
// el resto delega en el fetch real. No-op fuera de Electron o si ya se instaló.
export function installApiFetchShim(target = typeof window !== 'undefined' ? window : undefined) {
  if (!target || !isElectron() || target.__mangaCountFetchShim) return;
  const realFetch =
    typeof target.fetch === 'function'
      ? target.fetch.bind(target)
      : globalThis.fetch.bind(globalThis);
  target.fetch = async (input, options = {}) => {
    const raw = typeof input === 'string' ? input : input?.url;
    if (!raw || !raw.startsWith('/api/')) return realFetch(input, options);
    const url = new URL(raw, 'http://localhost');
    const method = (options.method ?? 'GET').toUpperCase();
    const route = routes.find((r) => r.method === method && r.pattern.test(url.pathname));
    if (!route) return Promise.reject(new Error(`Ruta /api sin canal IPC: ${method} ${url.pathname}`));
    const match = route.pattern.exec(url.pathname);
    const [channel, ...args] = await route.build(match, options, url);
    return responseLike(await target.mangaCount.invoke(channel, ...args));
  };
  target.__mangaCountFetchShim = true;
}

export { isElectron };
