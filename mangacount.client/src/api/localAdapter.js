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

// Base local (fila 15)
export const databaseStatistics = () => apiCall('database:statistics', '/api/database/statistics');
export const databaseNukeLocal = () => apiCall('database:nuke-local', '/api/database/nuke', json({}));

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
