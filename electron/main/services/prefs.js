// Local preferences (replacement of appsettings*.json + part of localStorage).
// Theme and active profile stay in the renderer's localStorage; here goes what the
// main needs: start in tray, backup config and bot config.

import fs from 'node:fs';
import path from 'node:path';

export function prefsPath(dataDir) {
  return path.join(dataDir, 'preferences.json');
}

// Default values: automatic backup and the bot start off.
export const DEFAULT_PREFS = {
  language: 'en',
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
  recommendations: {
    enabled: true,
    limit: 10,
    seenTtlDays: 30,
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

// Fills the config with the defaults (shallow merge + per-block merge).
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
    recommendations: { ...DEFAULT_PREFS.recommendations, ...(prefs.recommendations ?? {}) },
  };
}

export function loadResolvedPrefs(dataDir) {
  return resolvePrefs(loadPrefs(dataDir));
}

// Backup config gate: enabled requires a destination and at least one trigger.
export function validateBackupConfig(backup = {}, t = (key) => key) {
  const errors = [];
  if (backup.enabled) {
    if (!backup.destinationDir) errors.push(t('err.backupNeedsDestination'));
    if (!backup.triggers?.onStartup && !backup.triggers?.whileRunning) {
      errors.push(t('err.backupNeedsTrigger'));
    }
  }
  return errors;
}
