// Automatic backup triggers.
//
// `onStartup` is the robust trigger (a `setInterval` dies when the app closes),
// `whileRunning` complements long sessions. `onQuit` is out of scope.

import { validateBackupConfig } from './prefs.js';

// Should a backup run at startup? Enabled + with destination + `onStartup` + interval elapsed.
export function backupDue(backup, now = Date.now()) {
  if (!backup?.enabled || !backup.destinationDir || !backup.triggers?.onStartup) return false;
  if (!backup.lastBackupAt) return true;
  const last = Date.parse(backup.lastBackupAt);
  if (Number.isNaN(last)) return true;
  const interval = (backup.intervalMinutes ?? 1440) * 60000;
  return now - last >= interval;
}

// Starts the triggers and returns `stop()`. `loadConfig()` returns the resolved
// `backup` block; `runBackup(destinationDir)` runs the backup.
export function startAutoBackup({
  loadConfig,
  runBackup,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  logger = console,
  now = () => Date.now(),
} = {}) {
  let timer = null;

  const stop = () => {
    if (timer) {
      clearIntervalFn(timer);
      timer = null;
    }
  };

  async function tick(reason, force = false) {
    const backup = loadConfig();
    if (validateBackupConfig(backup).length) return;
    if (!force && reason === 'startup' && !backupDue(backup, now())) return;
    try {
      await runBackup(backup.destinationDir);
    } catch (err) {
      logger?.error?.(`backup automático (${reason}) falló: ${err?.message ?? err}`);
    }
  }

  const backup = loadConfig();
  if (backup?.enabled && backup.triggers?.onStartup) tick('startup');
  if (backup?.enabled && backup.triggers?.whileRunning) {
    timer = setIntervalFn(() => tick('interval', true), (backup.intervalMinutes ?? 1440) * 60000);
  }

  return stop;
}
