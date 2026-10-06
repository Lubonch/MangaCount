// Preferencias locales (reemplazo de appsettings*.json + parte de localStorage).
// Tema y perfil activo siguen en localStorage del renderer; aquí va lo que el
// main necesita: reranking opcional, última ruta de import, etc.

import fs from 'node:fs';
import path from 'node:path';

export function prefsPath(dataDir) {
  return path.join(dataDir, 'preferences.json');
}

export function loadPrefs(dataDir) {
  try {
    return JSON.parse(fs.readFileSync(prefsPath(dataDir), 'utf8'));
  } catch {
    return {};
  }
}

export function savePrefs(dataDir, prefs) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(prefsPath(dataDir), JSON.stringify(prefs, null, 2));
}
