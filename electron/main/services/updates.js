// Update-check client against GitHub Releases.
//
// We don't use electron-updater (it clashes with .deb/pacman): we only compare the latest
// published release with the local version and notify. Isolated from the runtime so it can
// be tested with an injected `fetch`.

const RELEASES_URL = 'https://api.github.com/repos/Lubonch/MangaCount/releases/latest';

function parseVersion(value) {
  return String(value ?? '')
    .trim()
    .replace(/^v/i, '')
    .split('-')[0] // ignores pre-release/build
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

// >0 if `b` is newer than `a`; 0 if equal; <0 if `a` is newer.
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

// Update mode per channel:
// - 'auto' only where the executable can be replaced (Windows NSIS or AppImage with $APPIMAGE).
// - 'link' in dev and where the package manager rules (.deb, makepkg in /opt).
export function resolveUpdateMode({ isPackaged = false, platform = process.platform, env = process.env } = {}) {
  if (!isPackaged) return 'link';
  if (platform === 'win32') return 'auto';
  if (platform === 'linux' && env.APPIMAGE) return 'auto';
  return 'link';
}
