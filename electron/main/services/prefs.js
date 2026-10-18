// Preferencias locales (reemplazo de appsettings*.json + parte de localStorage).
// Tema y perfil activo siguen en localStorage del renderer; aquí va lo que el
// main necesita: arranque en bandeja, config de backup y config del bot.

import fs from 'node:fs';
import path from 'node:path';

export function prefsPath(dataDir) {
  return path.join(dataDir, 'preferences.json');
}

// Valores por defecto: el backup automático y el bot arrancan apagados.
export const DEFAULT_PREFS = {
  startInTray: true,
  updateCheck: true,
  diagnosticsCopy: true,
  showAdultCovers: false,
  backup: {
    enabled: false,
    destinationDir: null,
    intervalMinutes: 1440,
    triggers: { onStartup: true, whileRunning: false },
    lastBackupAt: null,
    lastBackupStatus: null,
  },
  bot: {
    enabled: false,
    guildId: null,
    allowedUserIds: [],
    pendingLimitEnabled: true,
    pendingLimit: 20,
    ephemeralReplies: false,
    confirmTtlMinutes: 5,
    recommendLimit: 5,
  },
};

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

// Completa la config con los defaults (merge superficial + merge por bloque).
export function resolvePrefs(prefs = {}) {
  return {
    ...DEFAULT_PREFS,
    ...prefs,
    backup: {
      ...DEFAULT_PREFS.backup,
      ...(prefs.backup ?? {}),
      triggers: { ...DEFAULT_PREFS.backup.triggers, ...(prefs.backup?.triggers ?? {}) },
    },
    bot: { ...DEFAULT_PREFS.bot, ...(prefs.bot ?? {}) },
  };
}

export function loadResolvedPrefs(dataDir) {
  return resolvePrefs(loadPrefs(dataDir));
}

// Gate de config de backup: habilitado exige destino y al menos un disparador.
export function validateBackupConfig(backup = {}) {
  const errors = [];
  if (backup.enabled) {
    if (!backup.destinationDir) errors.push('El backup automático requiere un destino.');
    if (!backup.triggers?.onStartup && !backup.triggers?.whileRunning) {
      errors.push('El backup automático requiere al menos un disparador.');
    }
  }
  return errors;
}
