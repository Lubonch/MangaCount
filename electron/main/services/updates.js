// Cliente de chequeo de actualizaciones contra GitHub Releases.
//
// No usamos electron-updater (choca con .deb/pacman): solo comparamos la última
// release publicada con la versión local y avisamos. Aislado del runtime para
// poder testearlo con un `fetch` inyectado.

const RELEASES_URL = 'https://api.github.com/repos/Lubonch/MangaCount/releases/latest';

function parseVersion(value) {
  return String(value ?? '')
    .trim()
    .replace(/^v/i, '')
    .split('-')[0] // ignora pre-release/build
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

// >0 si `b` es más nueva que `a`; 0 si son iguales; <0 si `a` es más nueva.
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function fetchLatestRelease({ fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(RELEASES_URL, {
      headers: { 'User-Agent': 'MangaCount', Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const data = await res.json();
    return {
      latest: String(data.tag_name ?? '').replace(/^v/i, ''),
      url: data.html_url ?? null,
      name: data.name ?? null,
      publishedAt: data.published_at ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export { RELEASES_URL };

// Modo de actualización según el canal:
// - 'auto' solo donde el ejecutable se puede reemplazar (Windows NSIS o AppImage con $APPIMAGE).
// - 'link' en dev y donde manda el gestor de paquetes (.deb, makepkg en /opt).
export function resolveUpdateMode({ isPackaged = false, platform = process.platform, env = process.env } = {}) {
  if (!isPackaged) return 'link';
  if (platform === 'win32') return 'auto';
  if (platform === 'linux' && env.APPIMAGE) return 'auto';
  return 'link';
}
