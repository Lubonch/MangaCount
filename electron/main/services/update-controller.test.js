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
    const controller = createUpdateController({
      mode: 'auto',
      autoUpdater,
      getVersion: () => '1.0.11',
      logger: { error() {}, warn() {} },
      onState: (s) => states.push({ ...s }),
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
});
