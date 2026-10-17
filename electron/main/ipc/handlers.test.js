// Tests de los handlers IPC como funciones puras `(ctx, ...args)`: sin Electron,
// con `openDb` sobre un tmpdir y stubs de `fetch`/secrets/bot/dialog según el
// canal. Cubre validaciones, ramas de error y los canales de
// covers/backup/bot/diagnostics/dialog, además de channelNames/registerHandlers.

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { loadResolvedPrefs } from '../services/prefs.js';
import { createLocalFileGrants } from '../services/local-file-grants.js';
import { handlers, channelNames, registerHandlers } from './handlers.js';

const imageResponse = (type = 'image/png', bytes = [1, 2, 3]) => ({
  ok: true,
  status: 200,
  headers: { get: () => type },
  arrayBuffer: async () => new Uint8Array(bytes).buffer,
});

describe('ipc handlers (ctx puro)', () => {
  let dir;
  let db;
  let ctx;
  let realFetch;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mchand-'));
    db = openDb(dir);
    ctx = { db, dataDir: dir, localFileGrants: createLocalFileGrants() };
    realFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    for (const handle of [db, ctx?.db]) {
      try {
        handle?.close();
      } catch {
        // ya cerrada (p. ej. tras backup:restore)
      }
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('profile/manga/catálogo CRUD por canal (con validaciones)', () => {
    assert.deepEqual(handlers['profile:list'](ctx), []);
    const profile = handlers['profile:upsert'](ctx, { name: 'cole' });
    assert.ok(profile.id > 0);
    assert.equal(handlers['profile:get'](ctx, profile.id).name, 'cole');
    assert.equal(handlers['profile:get'](ctx, 9999), null);
    assert.deepEqual(handlers['profile:delete'](ctx, profile.id), { ok: true });

    assert.deepEqual(handlers['manga:list'](ctx), []);
    const manga = handlers['manga:upsert'](ctx, { name: 'doro', volumes: 23 });
    assert.equal(handlers['manga:get'](ctx, manga.id).volumes, 23);
    assert.deepEqual(handlers['manga:delete'](ctx, manga.id), { ok: true });
    assert.throws(() => handlers['manga:delete'](ctx, 0), /mangaId inválido/);
    assert.throws(() => handlers['manga:delete'](ctx, 'x'), /mangaId inválido/);

    assert.deepEqual(handlers['format:list'](ctx), []);
    assert.equal(handlers['format:create'](ctx, { name: 'B6' }).name, 'B6');
    assert.deepEqual(handlers['publisher:list'](ctx), []);
    assert.equal(handlers['publisher:create'](ctx, { name: 'Ivrea' }).name, 'Ivrea');
  });

  it('recommendation:get acepta argumentos y su default', async () => {
    const profile = handlers['profile:upsert'](ctx, { name: 'rec' });
    const rec = await handlers['recommendation:get'](ctx, { profileId: profile.id, limit: 3 });
    assert.equal(rec.limit, 3);
    await assert.rejects(() => handlers['recommendation:get'](ctx), /profileId inválido/);
  });

  it('profile:upload-picture y database:*', () => {
    const profile = handlers['profile:upsert'](ctx, { name: 'foto' });
    const { fileName } = handlers['profile:upload-picture'](ctx, {
      profileId: profile.id,
      originalName: 'f.png',
      buffer: Buffer.from([1]),
    });
    assert.match(fileName, /\.png$/);
    assert.equal(handlers['database:statistics'](ctx).profiles, 1);
    assert.equal(handlers['database:nuke-local'](ctx).profiles, 0);
  });

  it('entry:* validaciones, upsert, get, import/export', () => {
    assert.throws(() => handlers['entry:list'](ctx, 0), /profileId inválido/);
    const profile = handlers['profile:upsert'](ctx, { name: 'u' });
    assert.throws(() => handlers['entry:upsert'](ctx, { profileId: 0 }), /profileId inválido/);
    assert.throws(() => handlers['entry:upsert'](ctx, { profileId: 9999 }), /Perfil no encontrado/);
    assert.throws(() => handlers['entry:import'](ctx, { profileId: profile.id, tsv: '' }), /TSV vacío/);
    assert.throws(
      () => handlers['entry:import'](ctx, { profileId: profile.id, tsv: 123 }),
      /TSV vacío/
    );
    assert.throws(() => handlers['entry:export'](ctx, 0), /profileId inválido/);

    const manga = handlers['manga:upsert'](ctx, { name: 'berserk', volumes: 41 });
    const created = handlers['entry:upsert'](ctx, {
      mangaId: manga.id,
      profileId: profile.id,
      quantity: 2,
    });
    assert.equal(created.quantity, 2);
    const updated = handlers['entry:upsert'](ctx, {
      id: created.id,
      mangaId: manga.id,
      profileId: profile.id,
      quantity: 5,
    });
    assert.equal(updated.quantity, 5);
    assert.equal(handlers['entry:get-by-id'](ctx, created.id).quantity, 5);
    assert.equal(handlers['entry:list'](ctx).length, 1);
    assert.ok(handlers['entry:export'](ctx, profile.id).includes('berserk'));

    const tsv = 'Titulo\tComprados\tTotal\nNaruto\t1\t72';
    assert.deepEqual(handlers['entry:import'](ctx, { profileId: profile.id, tsv }), {
      imported: 1,
    });
  });

  it('entry:used-formats/publishers omiten entradas sin catálogo, agrupan y ordenan', () => {
    const format = handlers['format:create'](ctx, { name: 'Tankoubon' });
    const otherFormat = handlers['format:create'](ctx, { name: 'Aizoban' });
    const publisher = handlers['publisher:create'](ctx, { name: 'Panini' });
    const profile = handlers['profile:upsert'](ctx, { name: 'u' });
    const m1 = handlers['manga:upsert'](ctx, {
      name: 'a',
      formatId: format.id,
      publisherId: publisher.id,
    });
    const m2 = handlers['manga:upsert'](ctx, {
      name: 'b',
      formatId: format.id,
      publisherId: publisher.id,
    });
    const m4 = handlers['manga:upsert'](ctx, { name: 'd', formatId: otherFormat.id });
    const m3 = handlers['manga:upsert'](ctx, { name: 'c' }); // sin catálogos: se omite
    for (const m of [m1, m2, m3, m4]) {
      handlers['entry:upsert'](ctx, { mangaId: m.id, profileId: profile.id, quantity: 1 });
    }
    const usedFormats = handlers['entry:used-formats'](ctx, profile.id);
    assert.equal(usedFormats.length, 2);
    assert.deepEqual(
      usedFormats.map((f) => f.name),
      ['Aizoban', 'Tankoubon']
    );
    assert.equal(usedFormats.find((f) => f.name === 'Tankoubon').count, 2);
    assert.equal(handlers['entry:used-publishers'](ctx, profile.id)[0].count, 2);
    assert.deepEqual(handlers['entry:used-formats'](ctx), usedFormats);
  });

  it('cover:search mapea candidatos y acepta el default sin argumento', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          Page: {
            media: [
              {
                id: 1,
                title: { romaji: 'Berserk' },
                coverImage: { large: 'https://i/b.jpg' },
                format: 'MANGA',
                volumes: 41,
                startDate: { year: 1989 },
              },
            ],
          },
        },
      }),
    });
    const out = await handlers['cover:search'](ctx, { query: 'Berserk' });
    assert.equal(out[0].id, 1);
    assert.equal(out[0].coverUrl, 'https://i/b.jpg');
    assert.equal((await handlers['cover:search'](ctx)).length, 1);
  });

  it('covers: link, status, all, fetch y unlink', async () => {
    const manga = handlers['manga:upsert'](ctx, { name: 'berserk', volumes: 41 });
    globalThis.fetch = async () => imageResponse();
    const linked = await handlers['cover:link'](ctx, {
      mangaId: manga.id,
      candidate: { id: 30013, coverUrl: 'https://img/x.png' },
    });
    assert.equal(linked.coverUrl, `mangacount://covers/${manga.id}.png`);
    assert.equal((await handlers['cover:status'](ctx, manga.id)).coverUrl, linked.coverUrl);
    const all = await handlers['cover:all'](ctx);
    assert.deepEqual(all[manga.id], { url: linked.coverUrl, isAdult: false });
    const refreshed = await handlers['cover:fetch'](ctx, {
      mangaId: manga.id,
      coverUrl: 'https://img/y.png',
    });
    assert.equal(refreshed.coverUrl, linked.coverUrl);
    assert.deepEqual(await handlers['cover:unlink'](ctx, manga.id), { ok: true });
    assert.equal(await handlers['cover:status'](ctx, manga.id), null);
  });

  it('cover:auto hace match único y descarga la portada', async () => {
    const manga = handlers['manga:upsert'](ctx, { name: 'Berserk', volumes: 41 });
    globalThis.fetch = async (_url, opts = {}) => {
      if (opts.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              Page: {
                media: [
                  {
                    id: 5,
                    title: { romaji: 'Berserk' },
                    coverImage: { large: 'https://i/b.png' },
                    format: 'MANGA',
                    volumes: 41,
                    startDate: { year: 1989 },
                  },
                ],
              },
            },
          }),
        };
      }
      return imageResponse();
    };
    assert.equal(
      await handlers['cover:auto'](ctx, manga.id),
      `mangacount://covers/${manga.id}.png`
    );
  });

  it('cover:local vincula una portada local y figura en channelNames', async () => {
    assert.ok(channelNames().includes('cover:local'));
    const manga = handlers['manga:upsert'](ctx, { name: 'local', volumes: 1 });
    const src = path.join(dir, 'portada.png');
    fs.writeFileSync(
      src,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    );
    ctx.localFileGrants.grant(src);
    const out = await handlers['cover:local'](ctx, { mangaId: manga.id, sourcePath: src });
    assert.equal(out.ref.provider, 'local');
    assert.equal(out.coverUrl, `mangacount://covers/${manga.id}.png`);
    assert.equal((await handlers['cover:status'](ctx, manga.id)).provider, 'local');
  });

  it('cover:local rechaza rutas no elegidas por el diálogo y no escribe', async () => {
    const manga = handlers['manga:upsert'](ctx, { name: 'sin grant', volumes: 1 });
    const src = path.join(dir, 'portada.png');
    fs.writeFileSync(
      src,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    );

    assert.throws(
      () => handlers['cover:local'](ctx, { mangaId: manga.id, sourcePath: src }),
      /no autorizado/
    );
    assert.equal(fs.existsSync(path.join(dir, 'covers', `${manga.id}.png`)), false);
  });

  it('dialog:pick-file otorga un permiso de un solo uso para cover:local', async () => {
    const manga = handlers['manga:upsert'](ctx, { name: 'grant', volumes: 1 });
    const src = path.join(dir, 'portada.png');
    fs.writeFileSync(
      src,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    );
    const c = { ...ctx, dialog: { pickFile: async () => src } };

    assert.equal(await handlers['dialog:pick-file'](c), src);
    const out = await handlers['cover:local'](c, { mangaId: manga.id, sourcePath: src });
    assert.equal(out.ref.provider, 'local');
    assert.throws(
      () => handlers['cover:local'](c, { mangaId: manga.id, sourcePath: src }),
      /no autorizado/
    );
  });

  it('cover:local es fail-closed sin registro de permisos', async () => {
    const manga = handlers['manga:upsert'](ctx, { name: 'failclosed', volumes: 1 });
    const src = path.join(dir, 'portada.png');
    fs.writeFileSync(
      src,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    );

    assert.throws(
      () => handlers['cover:local']({ db, dataDir: dir }, { mangaId: manga.id, sourcePath: src }),
      /no autorizado/
    );
  });

  it('backup:list vacío sin destino y con backups listados', async () => {
    assert.equal(handlers['backup:config-get'](ctx).enabled, false);
    assert.deepEqual(handlers['backup:list'](ctx), []);
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'mchbdest-'));
    try {
      handlers['backup:config-set'](ctx, { destinationDir: dest });
      await handlers['backup:create'](ctx);
      assert.equal(handlers['backup:list'](ctx).length, 1);
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it('backup:config-set rechaza una config inválida', () => {
    assert.throws(() => handlers['backup:config-set'](ctx, { enabled: true }), /destino/);
    assert.throws(
      () =>
        handlers['backup:config-set'](ctx, {
          enabled: true,
          destinationDir: dir,
          triggers: { onStartup: false, whileRunning: false },
        }),
      /disparador/
    );
  });

  it('backup:create sin destino y con error sin mensaje', async () => {
    await assert.rejects(() => handlers['backup:create'](ctx), /destino/);
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'mchbstr-'));
    try {
      handlers['backup:config-set'](ctx, { destinationDir: dest });
      const c = {
        ...ctx,
        db: {
          backup: async () => {
            throw 'fallo-sin-mensaje';
          },
        },
        logger: { error() {} },
      };
      await assert.rejects(() => handlers['backup:create'](c), (err) => err === 'fallo-sin-mensaje');
      assert.equal(loadResolvedPrefs(dir).backup.lastBackupStatus.error, 'fallo-sin-mensaje');
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it('backup:create falla con destino inválido, registra el estado y no rompe', async () => {
    const bad = path.join(dir, 'no-es-dir');
    fs.writeFileSync(bad, 'x');
    const errored = [];
    const c = { ...ctx, logger: { error: (m) => errored.push(m) } };
    handlers['backup:config-set'](c, { destinationDir: path.join(bad, 'sub') });
    await assert.rejects(() => handlers['backup:create'](c));
    assert.equal(loadResolvedPrefs(dir).backup.lastBackupStatus.ok, false);
    assert.equal(errored.length, 1);
  });

  it('backup:restore reemplaza la base y devuelve el manifest', async () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'mchbrest-'));
    try {
      handlers['backup:config-set'](ctx, { destinationDir: dest });
      const created = await handlers['backup:create'](ctx);
      handlers['profile:upsert'](ctx, { name: 'temporal' });
      const restored = await handlers['backup:restore'](ctx, created.path);
      assert.equal(restored.restored, true);
      assert.equal(restored.manifest.app, 'MangaCount');
      assert.ok(ctx.db);
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it('bot:config-get combina prefs, secrets y estado', () => {
    const minimal = handlers['bot:config-get'](ctx);
    assert.equal(minimal.hasToken, false);
    assert.equal(minimal.secretsAvailable, false);
    assert.equal(minimal.status, 'apagado');
    const full = handlers['bot:config-get']({
      ...ctx,
      secrets: { hasToken: () => true, available: true },
      bot: { status: () => 'encendido' },
    });
    assert.equal(full.hasToken, true);
    assert.equal(full.secretsAvailable, true);
    assert.equal(full.status, 'encendido');
  });

  it('bot:config-set guarda la config y tolera el fallo del restart', async () => {
    const warned = [];
    const c = {
      ...ctx,
      logger: { warn: (m) => warned.push(m) },
      bot: {
        restart: async () => {
          throw new Error('boom');
        },
      },
    };
    const saved = await handlers['bot:config-set'](c, { enabled: true });
    assert.equal(saved.enabled, true);
    assert.equal(warned.length, 1);
  });

  it('bot:config-set sin bot y con restart que falla sin mensaje', async () => {
    const saved = await handlers['bot:config-set'](ctx, { enabled: false });
    assert.equal(saved.enabled, false);
    const warned = [];
    const c = {
      ...ctx,
      logger: { warn: (m) => warned.push(m) },
      bot: {
        restart: async () => {
          throw 'sin-mensaje';
        },
      },
    };
    await handlers['bot:config-set'](c, { enabled: true });
    assert.match(warned[0], /sin-mensaje/);
  });

  it('bot:set-token tolera un restart que falla sin mensaje', async () => {
    const warned = [];
    const c = {
      ...ctx,
      secrets: { available: false, saveToken() {} },
      logger: { warn: (m) => warned.push(m) },
      bot: {
        restart: async () => {
          throw 'sin-mensaje';
        },
      },
    };
    const out = await handlers['bot:set-token'](c, 'abc');
    assert.equal(out.saved, true);
    assert.match(warned[0], /sin-mensaje/);
  });

  it('bot:set-token valida, guarda y tolera el fallo del restart', async () => {
    await assert.rejects(() => handlers['bot:set-token'](ctx, '   '), /vacío/i);
    let savedToken = null;
    const warned = [];
    const c = {
      ...ctx,
      secrets: {
        available: true,
        saveToken: (t) => {
          savedToken = t;
        },
      },
      logger: { warn: (m) => warned.push(m) },
      bot: {
        restart: async () => {
          throw new Error('nope');
        },
      },
    };
    const out = await handlers['bot:set-token'](c, '  abc  ');
    assert.equal(out.saved, true);
    assert.equal(out.secretsAvailable, true);
    assert.equal(savedToken, 'abc');
    assert.equal(warned.length, 1);
    // Sin secrets ni bot: no rompe y reporta secrets no disponibles.
    assert.deepEqual(await handlers['bot:set-token'](ctx, 'xyz'), {
      saved: true,
      secretsAvailable: false,
    });
  });

  it('bot:status y autostart get/set', () => {
    assert.deepEqual(handlers['bot:status']({ ...ctx, bot: { status: () => 'online' } }), {
      status: 'online',
    });
    assert.deepEqual(handlers['bot:status'](ctx), { status: 'apagado' });
    assert.deepEqual(handlers['bot:autostart-get'](ctx), { enabled: false });
    assert.deepEqual(handlers['bot:autostart-get']({ ...ctx, autostart: { get: () => true } }), {
      enabled: true,
    });
    assert.deepEqual(handlers['bot:autostart-set'](ctx, true), { enabled: false });
    assert.deepEqual(
      handlers['bot:autostart-set']({ ...ctx, autostart: { set: (v) => v } }, true),
      { enabled: true }
    );
  });

  it('app:config get/set con defaults y autostart activo', () => {
    assert.deepEqual(handlers['app:config-get'](ctx), {
      startInTray: true,
      updateCheck: true,
      diagnosticsCopy: true,
      showAdultCovers: false,
    });
    assert.deepEqual(
      handlers['app:config-set'](ctx, {
        startInTray: false,
        updateCheck: false,
        diagnosticsCopy: false,
        showAdultCovers: true,
      }),
      { startInTray: false, updateCheck: false, diagnosticsCopy: false, showAdultCovers: true }
    );
    let autostart = false;
    const partial = handlers['app:config-set'](
      {
        ...ctx,
        autostart: {
          get: () => true,
          set: () => {
            autostart = true;
          },
        },
      },
      {}
    );
    assert.equal(partial.startInTray, false); // conserva lo guardado
    assert.equal(partial.showAdultCovers, true); // conserva lo guardado
    assert.equal(autostart, true);
  });

  it('diagnostics:copy lee el log o usa vacío; open-logs abre la carpeta', () => {
    let copied = null;
    const c = {
      ...ctx,
      app: { getVersion: () => '9.9.9', getLocale: () => 'es-AR' },
      clipboard: {
        writeText: (t) => {
          copied = t;
        },
      },
    };
    const withoutLog = handlers['diagnostics:copy'](c);
    assert.equal(withoutLog.copied, true);
    assert.match(copied, /\(log vacío\)/);

    fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'logs', 'app.txt'), 'uno\ndos\ntres\n');
    handlers['diagnostics:copy'](c, 1);
    assert.match(copied, /tres/);
    assert.ok(!copied.includes('dos'));

    // Sin app ni clipboard: no rompe.
    assert.equal(handlers['diagnostics:copy'](ctx).copied, true);
    assert.equal(handlers['diagnostics:copy']({ ...ctx, clipboard: null }).copied, true);

    let opened = null;
    const res = handlers['diagnostics:open-logs']({
      ...ctx,
      shell: {
        openPath: (p) => {
          opened = p;
        },
      },
    });
    assert.equal(res.opened, true);
    assert.match(opened, /logs$/);
    assert.equal(handlers['diagnostics:open-logs'](ctx).opened, true);
  });

  it('log:error arma el mensaje con y sin contexto', () => {
    const errs = [];
    const c = { ...ctx, logger: { error: (m) => errs.push(m) } };
    handlers['log:error'](c, {
      scope: 'render',
      component: 'App',
      message: 'boom',
      stack: 'at x',
    });
    assert.match(errs[0], /renderer\/render \(App\): boom\nat x/);
    handlers['log:error'](c);
    assert.match(errs[1], /renderer: /);
  });

  it('app:info incluye versión/plataforma y tolera app ausente', () => {
    const info = handlers['app:info']({
      ...ctx,
      app: { getVersion: () => '1.2.3', isPackaged: true },
    });
    assert.equal(info.version, '1.2.3');
    assert.equal(info.packaged, true);
    const bare = handlers['app:info'](ctx);
    assert.equal(bare.version, null);
    assert.equal(bare.packaged, false);
  });

  it('update:* delega en el controller', async () => {
    const c = {
      ...ctx,
      update: {
        check: async () => ({ ok: 1 }),
        state: () => ({ state: 1 }),
        download: async () => ({ downloaded: 1 }),
        install: async () => ({ installed: 1 }),
      },
    };
    assert.deepEqual(await handlers['update:check'](c), { ok: 1 });
    assert.deepEqual(handlers['update:get-state'](c), { state: 1 });
    assert.deepEqual(await handlers['update:download'](c), { downloaded: 1 });
    assert.deepEqual(await handlers['update:install'](c), { installed: 1 });
  });

  it('dialog:pick-* devuelve la ruta o null sin dialog', async () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'mchpick-'));
    try {
      const c = {
        ...ctx,
        dialog: { pickDirectory: async () => dest, pickFile: async () => 'f.txt' },
      };
      assert.equal(await handlers['dialog:pick-directory'](c), dest);
      assert.equal(await handlers['dialog:pick-file'](c), 'f.txt');
      assert.equal(await handlers['dialog:pick-directory'](ctx), null);
      assert.equal(await handlers['dialog:pick-file'](ctx), null);
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it('channelNames y registerHandlers conectan y loguean errores', async () => {
    assert.ok(channelNames().includes('profile:list'));
    const registered = {};
    const ipcMain = {
      handle: (channel, fn) => {
        registered[channel] = fn;
      },
    };
    registerHandlers(ipcMain, ctx);
    assert.equal(typeof registered['profile:list'], 'function');
    assert.deepEqual(await registered['profile:list']({}), []);

    const errs = [];
    registerHandlers(ipcMain, { ...ctx, logger: { error: (m) => errs.push(m) } });
    await assert.rejects(() => registered['manga:delete']({}, 0), /mangaId inválido/);
    assert.equal(errs.length, 1);

    // Error sin `.message`: usa String(err) en el log.
    const bareErrs = [];
    registerHandlers(ipcMain, {
      ...ctx,
      db: {
        prepare: () => {
          throw 'sin-mensaje';
        },
      },
      logger: { error: (m) => bareErrs.push(m) },
    });
    await assert.rejects(() => registered['profile:list']({}), (err) => err === 'sin-mensaje');
    assert.match(bareErrs[0], /sin-mensaje/);
  });
});
