import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolveExecPath,
  desktopEntry,
  autostartDesktopPath,
  isAutostartEnabledLinux,
  enableAutostartLinux,
  disableAutostartLinux,
  getAutostart,
  setAutostart,
} from './autostart.js';

describe('services/autostart: Linux', () => {
  let home;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'mchome-'));
  });

  afterEach(() => {
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('resuelve la ruta real del ejecutable (AppImage primero)', () => {
    assert.equal(resolveExecPath({ env: { APPIMAGE: '/tmp/.mount/app.AppImage' }, execPath: '/usr/bin/x' }), '/tmp/.mount/app.AppImage');
    assert.equal(resolveExecPath({ env: {}, execPath: '/usr/bin/x' }), '/usr/bin/x');
  });

  it('genera el .desktop con Exec y --hidden', () => {
    const entry = desktopEntry('/usr/bin/mangacount');
    assert.match(entry, /\[Desktop Entry\]/);
    assert.match(entry, /Exec=\/usr\/bin\/mangacount --hidden/);
    assert.match(entry, /X-GNOME-Autostart-enabled=true/);
  });

  it('activa y desactiva el autostart creando/borrando el .desktop', () => {
    assert.equal(isAutostartEnabledLinux(home), false);
    enableAutostartLinux({ home, execPath: '/usr/bin/mangacount' });
    assert.equal(isAutostartEnabledLinux(home), true);
    assert.ok(fs.existsSync(autostartDesktopPath(home)));
    assert.equal(getAutostart({ app: null, platform: 'linux', home }), true);

    setAutostart(false, { app: null, platform: 'linux', home });
    assert.equal(isAutostartEnabledLinux(home), false);
  });
});

describe('services/autostart: Windows/macOS', () => {
  it('usa la API de Electron y refleja el estado real', () => {
    const calls = [];
    let openAtLogin = false;
    const app = {
      setLoginItemSettings: (opts) => {
        calls.push(opts);
        openAtLogin = opts.openAtLogin;
      },
      getLoginItemSettings: () => ({ openAtLogin }),
    };
    assert.equal(getAutostart({ app, platform: 'win32' }), false);
    assert.equal(setAutostart(true, { app, platform: 'win32' }), true);
    assert.deepEqual(calls[0], { openAtLogin: true, args: ['--hidden'] });
    assert.equal(getAutostart({ app, platform: 'darwin' }), true);
    setAutostart(false, { app, platform: 'darwin' });
    assert.equal(getAutostart({ app, platform: 'darwin' }), false);
  });
});
