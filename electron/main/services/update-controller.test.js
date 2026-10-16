import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createUpdateController } from './update-controller.js';

function fakeAutoUpdater() {
  const emitter = new EventEmitter();
  emitter.autoDownload = true;
  emitter.checkForUpdates = async () => {
    emitter.emit('update-available', { version: '2.0.0' });
    return {};
  };
  emitter.downloadUpdate = async () => {};
  let installed = false;
  let installedArgs = null;
  emitter.quitAndInstall = (...args) => {
    installed = true;
    installedArgs = args;
  };
  emitter.wasInstalled = () => installed;
  emitter.wasInstalledArgs = () => installedArgs;
  return emitter;
}

describe('services/update-controller: modo auto', () => {
  it('check → available; descarga → downloading → downloaded; install', async () => {
    const autoUpdater = fakeAutoUpdater();
    const states = [];
    let beforeInstallCalled = false;
    const controller = createUpdateController({
      mode: 'auto',
      autoUpdater,
      getVersion: () => '1.0.11',
      logger: { error() {}, warn() {} },
      onState: (s) => states.push({ ...s }),
      onBeforeInstall: () => {
        beforeInstallCalled = true;
      },
    });

    await controller.check();
    assert.equal(controller.state().status, 'available');
    assert.equal(controller.state().hasUpdate, true);
    assert.equal(controller.state().latest, '2.0.0');

    await controller.download();
    autoUpdater.emit('download-progress', { percent: 42.4 });
    assert.equal(controller.state().status, 'downloading');
    assert.equal(controller.state().percent, 42);

    autoUpdater.emit('update-downloaded', { version: '2.0.0' });
    assert.equal(controller.state().status, 'downloaded');

    controller.install();
    assert.equal(autoUpdater.wasInstalled(), true);
    // isForceRunAfter=true → en AppImage reabre con la versión nueva.
    assert.deepEqual(autoUpdater.wasInstalledArgs(), [false, true]);
    // el hook marca isQuitting antes de instalar (para que el tray no bloquee el quit).
    assert.equal(beforeInstallCalled, true);
    assert.ok(states.length > 0);
  });

  it('no verifica firma y no descarga sola (autoDownload=false)', () => {
    const autoUpdater = fakeAutoUpdater();
    createUpdateController({ mode: 'auto', autoUpdater, getVersion: () => '1.0.11' });
    assert.equal(autoUpdater.autoDownload, false);
  });

  it('error del updater → estado error + log, sin romper', () => {
    const autoUpdater = fakeAutoUpdater();
    const errors = [];
    const controller = createUpdateController({
      mode: 'auto',
      autoUpdater,
      getVersion: () => '1.0.11',
      logger: { error: (m) => errors.push(m), warn() {} },
    });
    autoUpdater.emit('error', new Error('sin red'));
    assert.equal(controller.state().status, 'error');
    assert.match(controller.state().error, /sin red/);
    assert.equal(errors.length, 1);
  });

  it('defaults: onState/onBeforeInstall, getVersion opcional y eventos sin payload', () => {
    const autoUpdater = fakeAutoUpdater();
    const controller = createUpdateController({
      mode: 'auto',
      autoUpdater,
      logger: { error() {}, warn() {} },
    });

    assert.equal(controller.state().current, null);
    assert.equal(controller.state().skipped, false); // isPackaged default = true

    autoUpdater.emit('update-not-available'); // default onState
    assert.equal(controller.state().status, 'idle');
    assert.equal(controller.state().hasUpdate, false);

    autoUpdater.emit('update-available'); // info undefined → latest null
    assert.equal(controller.state().latest, null);
    assert.equal(controller.state().hasUpdate, true);

    autoUpdater.emit('download-progress'); // p undefined → percent 0
    assert.equal(controller.state().percent, 0);

    autoUpdater.emit('error', 'boom'); // sin message → String(err)
    assert.equal(controller.state().error, 'boom');

    controller.install(); // default onBeforeInstall
    assert.equal(autoUpdater.wasInstalled(), true);
  });

  it('update-downloaded sin info conserva el latest previo', () => {
    const autoUpdater = fakeAutoUpdater();
    const controller = createUpdateController({
      mode: 'auto',
      autoUpdater,
      getVersion: () => '1.0.0',
      logger: { error() {}, warn() {} },
    });
    autoUpdater.emit('update-available', { version: '2.0.0' });
    autoUpdater.emit('update-downloaded');
    assert.equal(controller.state().latest, '2.0.0');
    assert.equal(controller.state().status, 'downloaded');
  });
});

describe('services/update-controller: modo link', () => {
  it('en dev (no empaquetada) no hace red y queda skipped', async () => {
    const controller = createUpdateController({
      mode: 'link',
      isPackaged: false,
      getVersion: () => '1.0.11',
      fetchLatestRelease: async () => {
        throw new Error('no debería llamarse');
      },
      compareVersions: () => 0,
    });
    await controller.check();
    assert.equal(controller.state().skipped, true);
  });

  it('usa fetchLatestRelease + compareVersions y setea hasUpdate/url', async () => {
    const controller = createUpdateController({
      mode: 'link',
      getVersion: () => '1.0.11',
      fetchLatestRelease: async () => ({ latest: '2.0.0', url: 'https://x/2.0.0' }),
      compareVersions: (a, b) => (b > a ? 1 : 0),
      logger: { warn() {} },
    });
    await controller.check();
    assert.equal(controller.state().hasUpdate, true);
    assert.equal(controller.state().url, 'https://x/2.0.0');
    // download/install son no-op en link
    await controller.download();
    controller.install();
    assert.equal(controller.state().mode, 'link');
  });

  it('error de red → se loguea, error en estado, sin romper', async () => {
    const warnings = [];
    const controller = createUpdateController({
      mode: 'link',
      getVersion: () => '1.0.11',
      fetchLatestRelease: async () => {
        throw new Error('sin red');
      },
      compareVersions: () => 0,
      logger: { warn: (m) => warnings.push(m) },
    });
    await controller.check();
    assert.match(controller.state().error, /sin red/);
    assert.equal(warnings.length, 1);
  });

  it('error no-Error en link se stringifica', async () => {
    const controller = createUpdateController({
      mode: 'link',
      getVersion: () => '1.0.11',
      fetchLatestRelease: async () => {
        throw 'caída total';
      },
      compareVersions: () => 0,
      logger: { warn() {} },
    });
    await controller.check();
    assert.equal(controller.state().error, 'caída total');
  });

  it('modo auto sin autoUpdater cae al chequeo por link', async () => {
    const controller = createUpdateController({
      mode: 'auto',
      getVersion: () => '1.0.11',
      fetchLatestRelease: async () => ({ latest: '2.0.0', url: 'https://x/2.0.0' }),
      compareVersions: () => 1,
      logger: { warn() {} },
    });
    await controller.check();
    assert.equal(controller.state().hasUpdate, true);
    assert.equal(controller.state().url, 'https://x/2.0.0');
    // download/install sin autoUpdater son no-op
    await controller.download();
    controller.install();
    assert.equal(controller.state().mode, 'auto');
  });
});
