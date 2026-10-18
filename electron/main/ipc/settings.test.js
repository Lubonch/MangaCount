import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { handlers } from './handlers.js';
import { loadResolvedPrefs, loadPrefs } from '../services/prefs.js';
import { listBackups } from '../services/backup.js';
import { setRemoteFs } from '../services/backup.js';
import { fsOps } from '../services/fs-worker.js';

describe('ipc: settings (backup, bot, dialog)', () => {
  let dir;
  let destDir;
  let db;
  let ctx;
  const logged = [];

  beforeEach(() => {
    setRemoteFs({ call: async (op, args) => fsOps[op](...args) });
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
    assert.equal((await listBackups(destDir)).length, 1);
    assert.equal(loadResolvedPrefs(dir).backup.lastBackupStatus.ok, true);
  });

  it('backup:create sin destino falla y no rompe', async () => {
    await assert.rejects(() => handlers['backup:create'](ctx), /destino/);
  });

  it('entry:import con perfil inexistente da un mensaje claro (no FK crudo)', () => {
    const tsv = 'Titulo\tComprados\tTotal\nBerserk\t1\t41';
    assert.throws(
      () => handlers['entry:import'](ctx, { profileId: 9999, tsv }),
      /Perfil no encontrado/
    );
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

  it('bot:config-set valida los rangos de los límites', async () => {
    await assert.rejects(() => handlers['bot:config-set'](ctx, { pendingLimit: 0 }), /1 y 500/);
    await assert.rejects(() => handlers['bot:config-set'](ctx, { pendingLimit: 501 }), /1 y 500/);
    await assert.rejects(() => handlers['bot:config-set'](ctx, { confirmTtlMinutes: 0 }), /1 y 60/);
    await assert.rejects(() => handlers['bot:config-set'](ctx, { confirmTtlMinutes: 61 }), /1 y 60/);
    await assert.rejects(() => handlers['bot:config-set'](ctx, { recommendLimit: 0 }), /1 y 10/);
    await assert.rejects(() => handlers['bot:config-set'](ctx, { recommendLimit: 11 }), /1 y 10/);

    const saved = await handlers['bot:config-set'](ctx, {
      pendingLimit: 5,
      confirmTtlMinutes: 10,
      recommendLimit: 3,
      ephemeralReplies: true,
    });
    assert.equal(saved.pendingLimit, 5);
    assert.equal(saved.confirmTtlMinutes, 10);
    assert.equal(saved.recommendLimit, 3);
    assert.equal(saved.ephemeralReplies, true);
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

  it('app:config incluye updateCheck (default ON, persistente)', () => {
    assert.equal(handlers['app:config-get'](ctx).updateCheck, true);
    const saved = handlers['app:config-set'](ctx, { updateCheck: false });
    assert.equal(saved.updateCheck, false);
    assert.equal(loadResolvedPrefs(dir).updateCheck, false);
  });

  it('app:info devuelve versión/plataforma/empaquetado', () => {
    const info = handlers['app:info']({ ...ctx, app: { getVersion: () => '1.0.8', isPackaged: true } });
    assert.equal(info.version, '1.0.8');
    assert.equal(info.packaged, true);
    assert.ok(info.platform);
  });

  it('update:check delega en el controller (ctx.update)', async () => {
    const res = await handlers['update:check']({
      ...ctx,
      update: { check: async () => ({ current: '1.0.11', hasUpdate: true, latest: '2.0.0' }) },
    });
    assert.equal(res.hasUpdate, true);
    assert.equal(res.latest, '2.0.0');
  });

  it('log:error escribe el error del renderer en el log', () => {
    handlers['log:error'](ctx, { scope: 'render', message: 'boom', stack: 'at Foo' });
    assert.ok(logged.some((m) => /renderer\/render/.test(m) && /boom/.test(m)));
  });

  it('app:config incluye diagnosticsCopy (default ON)', () => {
    assert.equal(handlers['app:config-get'](ctx).diagnosticsCopy, true);
  });

  it('diagnostics:copy arma el texto y lo copia (clipboard fake)', () => {
    fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'logs', 'app.txt'), 'a\nb\nc\n');
    let copied = null;
    const ctx2 = {
      ...ctx,
      app: { getVersion: () => '1.0.9', getLocale: () => 'es-AR' },
      clipboard: { writeText: (t) => { copied = t; } },
    };
    const res = handlers['diagnostics:copy'](ctx2, 2);
    assert.equal(res.copied, true);
    assert.match(copied, /MangaCount v1\.0\.9/);
    assert.match(copied, /b\nc/);
  });
});
