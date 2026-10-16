import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../db/client.js';
import { createProfile, listProfiles } from '../db/repositories/profiles.js';
import { createManga } from '../db/repositories/mangas.js';
import { upsertEntry } from '../db/repositories/entries.js';
import {
  isAuthorized,
  createSessionStore,
  createCommands,
  dispatch,
  createDiscordBot,
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

  it('despacho desconocido no rompe', async () => {
    assert.equal(await dispatch(commands, 'noexiste', {}), 'Comando no disponible.');
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

  it('expone cuatro slash commands', () => {
    assert.deepEqual(SLASH_COMMANDS.map((c) => c.name), ['perfil', 'buscar', 'pendientes', 'recomendar']);
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
