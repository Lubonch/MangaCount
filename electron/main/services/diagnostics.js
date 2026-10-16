// Armado del diagnóstico que el usuario puede copiar al portapapeles.
// Puro (recibe el texto del log), para testearlo sin FS.

export function tailLines(text, n) {
  const lines = String(text ?? '').split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.slice(-n).join('\n');
}

export function buildDiagnostics({
  version,
  platform,
  arch,
  locale,
  logText,
  maxLines = 100,
  now = new Date(),
} = {}) {
  return [
    `MangaCount v${version} · ${platform}/${arch} · ${locale}`,
    `Fecha: ${now.toISOString()}`,
    '--- últimas líneas de app.txt ---',
    tailLines(logText, maxLines) || '(log vacío)',
  ].join('\n');
}
