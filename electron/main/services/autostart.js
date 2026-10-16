// Autostart con el sistema operativo.
//
// Windows/macOS usan la API de Electron (`app.setLoginItemSettings`). Linux no
// la soporta: se escribe/elimina `~/.config/autostart/mangacount.desktop`
// resolviendo la ruta real del ejecutable (con AppImage la ruta del mount
// cambia en cada arranque, por eso se usa `process.env.APPIMAGE`).

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

// Ruta estable del ejecutable: AppImage monta en /tmp y cambia por arranque,
// así que se prefiere `process.env.APPIMAGE`; en su defecto, el binario actual.
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

// Estado real del autostart, leyendo el sistema (no asumido).
export function getAutostart({ app, platform = process.platform, home } = {}) {
  if (platform === 'linux') return isAutostartEnabledLinux(home);
  return app.getLoginItemSettings().openAtLogin === true;
}

// Activa/desactiva el autostart en el sistema operativo correspondiente.
// `args` permite decidir si el arranque del sistema abre oculto (`--hidden`).
export function setAutostart(enabled, { app, platform = process.platform, home, execPath, args } = {}) {
  if (platform === 'linux') {
    if (enabled) enableAutostartLinux({ home, execPath, args });
    else disableAutostartLinux(home);
    return getAutostart({ app, platform, home });
  }
  app.setLoginItemSettings({ openAtLogin: !!enabled, args: args ?? AUTOSTART_ARGS });
  return getAutostart({ app, platform, home });
}
