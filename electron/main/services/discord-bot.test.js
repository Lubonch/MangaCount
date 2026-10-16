import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createProfile } from '../db/repositories/profiles.js';
import { createManga } from '../db/repositories/mangas.js';
import { upsertEntry, listEntries } from '../db/repositories/entries.js';
import { formats, publishers } from '../db/repositories/catalogs.js';
import {
  isAuthorized,
  createSessionStore,
  createCommands,
  dispatch,
  createDiscordBot,
  resolveSessionProfile,
  applyWrite,
  resolveEntry,
  beginPendingWrite,
  consumePendingWrite,
  SLASH_COMMANDS,
} from './discord-bot.js';

describe('discord-bot: autorización', () => {
  const config = { guildId: 'g1', allowedUserIds: ['u1', 'u2'] };
  it('solo autoriza guild + usuario de la allowlist', () => {
    assert.equal(isAuthorized(config, { guildId: 'g1', userId: 'u1' }), true);
    assert.equal(isAuthorized(config, { guildId: 'g1', userId: 'x' }), false);
    assert.equal(isAuthorized(config, { guildId: 'otro', userId: 'u1' }), false);
  });
  it('allowlist vacía no responde a nadie', () => {
    assert.equal(isAuthorized({ guildId: 'g1', allowedUserIds: [] }, { guildId: 'g1', userId: 'u1' }), false);
  });
});

describe('discord-bot: sesión', () => {
  it('devuelve el mismo objeto mutable por usuario', () => {
    const store = createSessionStore();
    const s = store.get('u1');
    s.profileId = 7;
    assert.equal(store.get('u1').profileId, 7);
    assert.equal(store.get('u2').profileId, null);
  });
});

describe('discord-bot: comandos', () => {
  let dir;
  let db;
  let profile;
  let commands;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdisc-'));
    db = openDb(dir);
    profile = createProfile(db, 'Lucas');
    const manga = createManga(db, { name: 'Berserk', volumes: 41 });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 40, priority: true });
    commands = createCommands({ db });
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('lista y cambia el perfil activo', async () => {
    const session = { profileId: null };
    const list = await commands.perfil({ session });
    assert.match(list, /Lucas/);
    const changed = await commands.perfil({ session, perfil: 'Lucas' });
    assert.match(changed, /activo/i);
    assert.equal(session.profileId, profile.id);
  });

  it('exige perfil activo', async () => {
    const reply = await dispatch(commands, 'pendientes', { session: { profileId: null } });
    assert.match(reply, /perfil/i);
  });

  it('busca por título', async () => {
    const reply = await commands.buscar({ session: { profileId: profile.id }, query: 'berserk' });
    assert.match(reply, /Berserk/);
    assert.match(reply, /40\/41/);
  });

  it('sugiere cuando no encuentra', async () => {
    const reply = await commands.buscar({ session: { profileId: profile.id }, query: 'berserk zzz' });
    assert.match(reply, /no encontr/i);
  });

  it('lista pendientes con prioridad', async () => {
    const reply = await commands.pendientes({ session: { profileId: profile.id } });
    assert.match(reply, /Berserk/);
    assert.match(reply, /1 vols\./);
  });

  it('/pendientes detalla pending, formato y editorial', async () => {
    const format = formats.create(db, 'Tankoubon');
    const publisher = publishers.create(db, 'Ivrea');
    const manga = createManga(db, { name: 'Vagabond', volumes: 37, formatId: format.id, publisherId: publisher.id });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 10, pending: '5,7' });

    const reply = await commands.pendientes({ session: { profileId: profile.id } });
    assert.match(reply, /Vagabond/);
    assert.match(reply, /pending: 5,7/);
    assert.ok(reply.includes(`${format.name} · ${publisher.name}`));
  });

  it('/pendientes acota la salida (20 series + resto)', async () => {
    for (let i = 0; i < 25; i += 1) {
      const manga = createManga(db, { name: `Serie ${i}`, volumes: 10 });
      upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    }
    const reply = await commands.pendientes({ session: { profileId: profile.id } });
    assert.match(reply, /…y \d+ series más\./);
  });

  it('despacho desconocido no rompe', async () => {
    assert.equal(await dispatch(commands, 'noexiste', {}), 'Comando no disponible.');
  });

  it('/tomo propone sumar 1 tomo', async () => {
    const out = await commands.tomo({ session: { profileId: profile.id }, titulo: 'Berserk' });
    assert.equal(out.kind, 'write');
    assert.equal(out.action.type, 'setQuantity');
    assert.equal(out.action.quantity, 41);
  });

  it('/actualizar valida la cantidad', async () => {
    const out = await commands.actualizar({ session: { profileId: profile.id }, titulo: 'Berserk', cantidad: -1 });
    assert.match(out, /inválida/i);
  });

  it('/tomo con título inexistente no escribe', async () => {
    const out = await commands.tomo({ session: { profileId: profile.id }, titulo: 'zzz' });
    assert.match(out, /No encontré/);
  });

  it('/nuevo avisa si ya existe y propone crear si no', async () => {
    assert.match(await commands.nuevo({ session: { profileId: profile.id }, titulo: 'Berserk' }), /Ya tenés/);
    const out = await commands.nuevo({ session: { profileId: profile.id }, titulo: 'Dandadan', total: 0, cantidad: 0 });
    assert.equal(out.kind, 'write');
    assert.equal(out.action.type, 'createMangaEntry');
  });

  it('/ayuda lista los comandos', async () => {
    assert.match(await commands.ayuda(), /\/tomo/);
  });
});

describe('discord-bot: pending write (confirmación)', () => {
  it('begin/consume con token válido', () => {
    const session = {};
    const pending = beginPendingWrite(session, { summary: 'x', action: { type: 'setQuantity' }, token: 'tok' });
    assert.equal(pending.token, 'tok');
    const consumed = consumePendingWrite(session, 'tok');
    assert.equal(consumed.pending.action.type, 'setQuantity');
    assert.equal(session.pending, null);
  });

  it('token inválido devuelve error', () => {
    const session = {};
    beginPendingWrite(session, { summary: 'x', action: {}, token: 'a' });
    assert.match(consumePendingWrite(session, 'b').error, /no está disponible/);
  });

  it('expira por timeout', () => {
    const session = {};
    let now = 1000;
    beginPendingWrite(session, { summary: 'x', action: {}, token: 'a', ttlMs: 10, now: () => now });
    now = 2000;
    assert.match(consumePendingWrite(session, 'a', () => now).error, /expiró/);
  });
});

describe('discord-bot: ciclo de vida sin conexión', () => {
  it('apagado si el bot está deshabilitado', async () => {
    const bot = createDiscordBot({
      getConfig: () => ({ enabled: false }),
      getToken: () => 'token',
      db: null,
    });
    await bot.start();
    assert.equal(bot.status(), 'apagado');
  });

  it('sin token si no hay token configurado', async () => {
    const bot = createDiscordBot({
      getConfig: () => ({ enabled: true, guildId: 'g', allowedUserIds: ['u'] }),
      getToken: () => null,
      db: null,
    });
    await bot.start();
    assert.equal(bot.status(), 'sin token');
  });

  it('expone los slash commands de lectura y escritura', () => {
    const names = SLASH_COMMANDS.map((c) => c.name);
    for (const expected of [
      'perfil',
      'buscar',
      'pendientes',
      'recomendar',
      'tomo',
      'actualizar',
      'pending',
      'prioridad',
      'nuevo',
      'ayuda',
    ]) {
      assert.ok(names.includes(expected), `falta el comando ${expected}`);
    }
  });

  it('no rompe si discord.js falla al cargar', async () => {
    const errors = [];
    const bot = createDiscordBot({
      getConfig: () => ({ enabled: true, guildId: 'g', allowedUserIds: ['u'] }),
      getToken: () => 'token',
      db: {},
      logger: { error: (m) => errors.push(m), warn() {} },
      loadDiscord: async () => {
        throw new Error('sin red');
      },
    });
    await bot.start();
    assert.equal(bot.status(), 'error');
    assert.ok(errors.length >= 1);
  });
});

describe('discord-bot: sesión de perfil válida', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcsess-'));
    db = openDb(dir);
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('auto-selecciona si hay un único perfil', () => {
    const session = { profileId: null };
    const profile = resolveSessionProfile(session, db);
    assert.equal(profile.name, 'Default Profile');
    assert.equal(session.profileId, profile.id);
  });

  it('rechaza un perfil inexistente cuando hay varios', () => {
    createProfile(db, 'A');
    createProfile(db, 'B');
    assert.throws(() => resolveSessionProfile({ profileId: 999 }, db), /perfil/i);
  });

  it('devuelve el perfil válido', () => {
    const profile = createProfile(db, 'X');
    assert.equal(resolveSessionProfile({ profileId: profile.id }, db).id, profile.id);
  });
});

describe('discord-bot: /recomendar espera el resultado', () => {
  let dir;
  let db;
  let profile;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcrec-'));
    db = openDb(dir);
    profile = createProfile(db, 'P');
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('devuelve recomendaciones cuando el mercado es confiable (regresión de await)', async () => {
    const commands = createCommands({
      db,
      getRecommendations: async () => ({
        isConfident: true,
        inferredCountry: 'Argentina',
        provider: 'local',
        blockedByImportCount: 0,
        items: [{ title: 'Monster', publisher: 'Ivrea', publisherCountry: 'Argentina' }],
      }),
    });
    const out = await commands.recomendar({ session: { profileId: profile.id } });
    assert.match(out, /Monster/);
    assert.match(out, /Argentina/);
    assert.doesNotMatch(out, /No pude inferir/);
  });

  it('muestra el desglose de mercado cuando no hay confianza', async () => {
    const commands = createCommands({
      db,
      getRecommendations: async () => ({
        isConfident: false,
        inferredCountry: null,
        items: [],
        inference: {
          country: null,
          isConfident: false,
          breakdown: [{ country: 'Argentina', volumeCount: 5, seriesCount: 1, publishers: ['ivrea'] }],
        },
      }),
    });
    const out = await commands.recomendar({ session: { profileId: profile.id } });
    assert.match(out, /No pude inferir/);
    assert.match(out, /Argentina: 1 series/);
    assert.match(out, /sin editorial reconocida/);
  });
});

describe('discord-bot: applyWrite', () => {
  let dir;
  let db;
  let profile;
  let entry;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcwrite-'));
    db = openDb(dir);
    profile = createProfile(db, 'P');
    const manga = createManga(db, { name: 'Berserk', volumes: 41 });
    entry = upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 40, priority: false });
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const reload = (id) => listEntries(db, profile.id).find((e) => e.id === id);

  it('setQuantity actualiza la entry', () => {
    const result = applyWrite(db, { type: 'setQuantity', entry, quantity: 41 });
    assert.match(result.summary, /40 → 41/);
    assert.equal(reload(entry.id).quantity, 41);
  });

  it('togglePriority invierte', () => {
    const result = applyWrite(db, { type: 'togglePriority', entry });
    assert.match(result.summary, /prioridad: activada/);
    assert.equal(reload(entry.id).priority, true);
  });

  it('setPending setea el campo', () => {
    applyWrite(db, { type: 'setPending', entry, pending: '5,7' });
    assert.equal(reload(entry.id).pending, '5,7');
  });

  it('createMangaEntry crea manga + entry en 0', () => {
    const result = applyWrite(db, {
      type: 'createMangaEntry',
      name: 'Dandadan',
      total: 0,
      quantity: 0,
      profileId: profile.id,
    });
    assert.match(result.summary, /Dandadan/);
    const created = listEntries(db, profile.id).find((e) => e.manga.name === 'Dandadan');
    assert.ok(created);
    assert.equal(created.quantity, 0);
  });
});
