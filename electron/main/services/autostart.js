// Autostart with the operating system.
//
// Windows/macOS use the Electron API (`app.setLoginItemSettings`). Linux does not
// support it: it writes/removes `~/.config/autostart/mangacount.desktop`
// resolving the real executable path (with AppImage the mount path
// changes on every boot, hence `process.env.APPIMAGE` is used).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const AUTOSTART_DESKTOP = 'mangacount.desktop';
export const AUTOSTART_ARGS = ['--hidden'];

export function autostartDir(home = os.homedir()) {
  return path.join(home, '.config', 'autostart');
}

export function autostartDesktopPath(home = os.homedir()) {
  return path.join(autostartDir(home), AUTOSTART_DESKTOP);
}

// Stable executable path: AppImage mounts in /tmp and changes per boot,
// so `process.env.APPIMAGE` is preferred; otherwise, the current binary.
export function resolveExecPath({ env = process.env, execPath = process.execPath } = {}) {
  return env.APPIMAGE || execPath;
}

export function desktopEntry(execPath, args = AUTOSTART_ARGS) {
  return (
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=MangaCount',
      `Exec=${execPath}${args.length ? ` ${args.join(' ')}` : ''}`,
      'X-GNOME-Autostart-enabled=true',
      'Terminal=false',
    ].join('\n') + '\n'
  );
}

export function isAutostartEnabledLinux(home = os.homedir()) {
  return fs.existsSync(autostartDesktopPath(home));
}

export function enableAutostartLinux({ home = os.homedir(), execPath, args } = {}) {
  fs.mkdirSync(autostartDir(home), { recursive: true });
  fs.writeFileSync(autostartDesktopPath(home), desktopEntry(execPath ?? resolveExecPath(), args));
}

export function disableAutostartLinux(home = os.homedir()) {
  fs.rmSync(autostartDesktopPath(home), { force: true });
}

// Real autostart state, reading the system (not assumed).
export function getAutostart({ app, platform = process.platform, home } = {}) {
  if (platform === 'linux') return isAutostartEnabledLinux(home);
  return app.getLoginItemSettings().openAtLogin === true;
}

// Enables/disables autostart in the corresponding operating system.
// `args` allows deciding whether the system boot opens hidden (`--hidden`).
export function setAutostart(enabled, { app, platform = process.platform, home, execPath, args } = {}) {
  if (platform === 'linux') {
    if (enabled) enableAutostartLinux({ home, execPath, args });
    else disableAutostartLinux(home);
    return getAutostart({ app, platform, home });
  }
  app.setLoginItemSettings({ openAtLogin: !!enabled, args: args ?? AUTOSTART_ARGS });
  return getAutostart({ app, platform, home });
}
