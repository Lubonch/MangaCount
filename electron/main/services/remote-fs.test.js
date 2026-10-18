import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRemoteFs, LIST_TIMEOUT_MS } from './remote-fs.js';

describe('services/remote-fs', () => {
  let instance = null;

  afterEach(() => {
    instance?.close();
    instance = null;
  });

  it('ejecuta las ops en el worker real (list/mkdir/write/rename/rm)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-remote-fs-'));
    instance = createRemoteFs();
    try {
      await instance.call('mkdir', [dir]);
      const file = path.join(dir, 'mangacount-backup-2026-01-02-0300.zip');
      await instance.call('writeFile', [file, new Uint8Array([1, 2, 3])], { timeoutMs: 60000 });
      assert.deepEqual(await instance.call('listBackupFiles', [dir]), [path.basename(file)]);
      const listed = await instance.call('listBackups', [dir]);
      assert.equal(listed.length, 1);
      assert.equal(listed[0].size, 3);
      assert.ok(listed[0].createdAt);

      const moved = path.join(dir, 'mangacount-backup-2026-01-02-0301.zip');
      await instance.call('rename', [file, moved], { timeoutMs: 60000 });
      await instance.call('rm', [moved], { timeoutMs: 60000 });
      assert.deepEqual(await instance.call('listBackupFiles', [dir]), []);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('propaga el error de una op desconocida', async () => {
    instance = createRemoteFs();
    await assert.rejects(() => instance.call('noExiste', []), /op desconocida/);
  });

  it('corta con timeout y marca timedOut cuando el worker no responde', async () => {
    // Fake worker that never answers.
    const fake = new EventEmitter();
    fake.postMessage = () => {};
    fake.terminate = () => {};
    instance = createRemoteFs({ spawnWorker: () => fake });

    await assert.rejects(
      () => instance.call('listBackupFiles', ['/x'], { timeoutMs: 50 }),
      (err) => err.timedOut === true
    );
  });

  it('usa el timeout de listado por defecto', () => {
    assert.equal(LIST_TIMEOUT_MS, 5000);
  });
});
