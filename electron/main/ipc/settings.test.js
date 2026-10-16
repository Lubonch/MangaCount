import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { handlers } from './handlers.js';
import { loadResolvedPrefs, loadPrefs } from '../services/prefs.js';
import { listBackups } from '../services/backup.js';

describe('ipc: settings (backup, bot, dialog)', () => {
  let dir;
  let destDir;
  let db;
  let ctx;
  const logged = [];

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcset-'));
    destDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdest-'));
    db = openDb(dir);
    ctx = {
      db,
      dataDir: dir,
      logger: { info() {}, warn() {}, error: (m) => logged.push(m) },
      secrets: { available: true, hasToken: () => false, saveToken() {} },
      bot: undefined,
      autostart: { get: () => false, set: (v) => v },
      dialog: { pickDirectory: async () => destDir, pickFile: async () => null },
    };
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(destDir, { recursive: true, force: true });
  });

  it('config del backup: defaults apagados', () => {
    const config = handlers['backup:config-get'](ctx);
    assert.equal(config.enabled, false);
    assert.equal(config.destinationDir, null);
    assert.equal(config.triggers.onStartup, true);
  });

  it('gate: habilitar sin destino o sin disparador falla', () => {
    assert.throws(() => handlers['backup:config-set'](ctx, { enabled: true }), /destino/);
    assert.throws(
      () =>
        handlers['backup:config-set'](ctx, {
          enabled: true,
          destinationDir: destDir,
          triggers: { onStartup: false, whileRunning: false },
        }),
      /disparador/
    );
  });

  it('gate: guarda una config válida', () => {
    const saved = handlers['backup:config-set'](ctx, {
      enabled: true,
      destinationDir: destDir,
      intervalMinutes: 60,
    });
    assert.equal(saved.enabled, true);
    assert.equal(saved.destinationDir, destDir);
    assert.equal(loadResolvedPrefs(dir).backup.intervalMinutes, 60);
  });

  it('backup:create escribe un zip y actualiza el indicador', async () => {
    handlers['backup:config-set'](ctx, { destinationDir: destDir });
    const result = await handlers['backup:create'](ctx);
    assert.ok(fs.existsSync(result.path));
    assert.equal(result.lastBackupStatus.ok, true);
    assert.equal(listBackups(destDir).length, 1);
    assert.equal(loadResolvedPrefs(dir).backup.lastBackupStatus.ok, true);
  });

  it('backup:create sin destino falla y no rompe', async () => {
    await assert.rejects(() => handlers['backup:create'](ctx), /destino/);
  });

  it('diálogo de directorio devuelve la ruta elegida', async () => {
    assert.equal(await handlers['dialog:pick-directory'](ctx), destDir);
    assert.equal(await handlers['dialog:pick-file'](ctx), null);
  });

  it('config del bot: get/set y token', async () => {
    const initial = handlers['bot:config-get'](ctx);
    assert.equal(initial.enabled, false);
    assert.equal(initial.hasToken, false);
    assert.equal(initial.status, 'apagado');

    const saved = await handlers['bot:config-set'](ctx, { enabled: true, guildId: '123' });
    assert.equal(saved.guildId, '123');
    assert.equal(loadPrefs(dir).bot.guildId, '123');

    const out = await handlers['bot:set-token'](ctx, '  abc  ');
    assert.equal(out.saved, true);
  });

  it('bot:config-set reinicia el bot para aplicar la config en caliente', async () => {
    let restarted = 0;
    ctx.bot = {
      restart: async () => {
        restarted += 1;
      },
    };
    await handlers['bot:config-set'](ctx, { enabled: true });
    assert.equal(restarted, 1);
  });

  it('bot:set-token rechaza vacío', async () => {
    await assert.rejects(() => handlers['bot:set-token'](ctx, '   '), /vacío/i);
  });

  it('autostart get/set pasan por el sistema', () => {
    assert.deepEqual(handlers['bot:autostart-get'](ctx), { enabled: false });
    assert.deepEqual(handlers['bot:autostart-set'](ctx, true), { enabled: true });
  });
});
