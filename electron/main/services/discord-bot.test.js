import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import { openDb } from '../db/client.js';
import { createAppTranslator, resolveLanguage } from '../../../shared/i18n/index.js';
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
  readInteraction,
  registerGuildCommands,
  slashCommands,
} from './discord-bot.js';
import { createPaginationStore, renderPage } from './discord-pagination.js';

const t = createAppTranslator(resolveLanguage({}));
const pageContent = (pagination, result) => renderPage(pagination.get(result.token), 1, t).content;

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
  it('guarda contra config ausente o sin guild/allowlist', () => {
    assert.equal(isAuthorized(undefined, { guildId: 'g1', userId: 'u1' }), false);
    assert.equal(isAuthorized({}, { guildId: 'g1', userId: 'u1' }), false);
    assert.equal(isAuthorized({ guildId: 'g1' }, { guildId: 'g1', userId: 'u1' }), false);
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
  let pagination;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcdisc-'));
    db = openDb(dir);
    profile = createProfile(db, 'Lucas');
    const manga = createManga(db, { name: 'Berserk', volumes: 41 });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 40, priority: true });
    pagination = createPaginationStore();
    commands = createCommands({ db, pagination });
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
    createProfile(db, 'Otro'); // con ≥2 perfiles no auto-selecciona
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
    const result = await commands.pendientes({ session: { profileId: profile.id } });
    const reply = pageContent(pagination, result);
    assert.match(reply, /Berserk/);
    assert.match(reply, /1 vols\./);
  });

  it('/pendientes detalla pending, formato y editorial', async () => {
    const format = formats.create(db, 'Tankoubon');
    const publisher = publishers.create(db, 'Ivrea');
    const manga = createManga(db, { name: 'Vagabond', volumes: 37, formatId: format.id, publisherId: publisher.id });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 10, pending: '5,7' });

    const result = await commands.pendientes({ session: { profileId: profile.id } });
    const reply = pageContent(pagination, result);
    assert.match(reply, /Vagabond/);
    assert.match(reply, /pending: 5,7/);
    assert.ok(reply.includes(`${format.name} · ${publisher.name}`));
  });

  it('/pendientes pagina con el tope por defecto', async () => {
    for (let i = 0; i < 25; i += 1) {
      const manga = createManga(db, { name: `Serie ${i}`, volumes: 10 });
      upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    }
    const result = await commands.pendientes({ session: { profileId: profile.id } });
    const item = pagination.get(result.token);
    const first = renderPage(item, 1, t);
    assert.equal(first.pages, 2);
    assert.match(first.content, /Página 1 de 2/);
    assert.ok(!first.content.includes('Serie 24*'));
    assert.ok(renderPage(item, 2, t).content.includes('Serie 24*'));
    assert.equal(first.prevDisabled, true);
  });

  it('/pendientes respeta un tope configurado distinto de 20', async () => {
    for (let i = 0; i < 25; i += 1) {
      const manga = createManga(db, { name: `Serie ${i}`, volumes: 10 });
      upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    }
    const store = createPaginationStore();
    const custom = createCommands({ db, pagination: store, getConfig: () => ({ pendingLimitEnabled: true, pendingLimit: 5 }) });
    const result = await custom.pendientes({ session: { profileId: profile.id } });
    const first = renderPage(store.get(result.token), 1, t);
    assert.match(first.content, /Página 1 de 6/);
    assert.ok(!first.content.includes('Serie 5*'));
  });

  it('/pendientes sin tope lista todas las series en una página', async () => {
    for (let i = 0; i < 25; i += 1) {
      const manga = createManga(db, { name: `Serie ${i}`, volumes: 10 });
      upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    }
    const store = createPaginationStore();
    const full = createCommands({ db, pagination: store, getConfig: () => ({ pendingLimitEnabled: false }) });
    const result = await full.pendientes({ session: { profileId: profile.id } });
    const page = renderPage(store.get(result.token), 1, t);
    assert.equal(page.pages, 1);
    assert.ok(page.content.includes('Serie 24*'));
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
    const names = slashCommands().map((c) => c.name);
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
    createProfile(db, 'Lucas');
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('auto-selecciona si hay un único perfil', () => {
    const session = { profileId: null };
    const resolved = resolveSessionProfile(session, db);
    assert.equal(resolved.name, 'Lucas');
    assert.equal(session.profileId, resolved.id);
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

  it('usa recommendLimit como cantidad por defecto y respeta el limite explícito', async () => {
    const calls = [];
    const commands = createCommands({
      db,
      getConfig: () => ({ recommendLimit: 3 }),
      getRecommendations: async (_db, _profileId, limit) => {
        calls.push(limit);
        return { isConfident: true, inferredCountry: 'Argentina', provider: 'local', blockedByImportCount: 0, items: [] };
      },
    });
    await commands.recomendar({ session: { profileId: profile.id } });
    await commands.recomendar({ session: { profileId: profile.id }, limite: 7 });
    assert.deepEqual(calls, [3, 7]);
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

describe('discord-bot: sesión (clear)', () => {
  it('clear vacía el store', () => {
    const store = createSessionStore();
    store.get('u1').profileId = 5;
    store.clear();
    assert.equal(store.get('u1').profileId, null);
    assert.equal(store.get('u2').profileId, null);
  });
});

describe('discord-bot: readInteraction', () => {
  it('extrae todos los argumentos', () => {
    const interaction = {
      commandName: 'actualizar',
      user: { id: 'u1' },
      guildId: 'g1',
      options: {
        getString: (n) =>
          ({
            perfil: 'P',
            query: 'q',
            titulo: 'Berserk',
            tomos: '5,7',
            formato: 'Tankoubon',
            editorial: 'Ivrea',
          })[n] ?? null,
        getInteger: (n) => ({ limite: 3, cantidad: 7, total: 41 })[n] ?? null,
      },
    };
    assert.deepEqual(readInteraction(interaction), {
      name: 'actualizar',
      userId: 'u1',
      guildId: 'g1',
      perfil: 'P',
      query: 'q',
      limite: 3,
      titulo: 'Berserk',
      cantidad: 7,
      tomos: '5,7',
      total: 41,
      formato: 'Tankoubon',
      editorial: 'Ivrea',
    });
  });

  it('devuelve null cuando faltan opciones o accessors', () => {
    const expected = {
      name: undefined,
      userId: undefined,
      guildId: undefined,
      perfil: null,
      query: null,
      limite: null,
      titulo: null,
      cantidad: null,
      tomos: null,
      total: null,
      formato: null,
      editorial: null,
    };
    assert.deepEqual(readInteraction({}), expected);
    assert.deepEqual(readInteraction({ options: {} }), expected);
  });
});

describe('discord-bot: resolveEntry', () => {
  const entry = (name) => ({ manga: { name } });

  it('exige un título', () => {
    assert.equal(resolveEntry([entry('Berserk')], '   ').error, 'Falta el título.');
  });

  it('no encuentra por título', () => {
    assert.match(resolveEntry([entry('Berserk')], 'zzz').error, /No encontré/);
  });

  it('es ambiguo con varias coincidencias parciales', () => {
    const r = resolveEntry([entry('Berserk'), entry('Berserk Deluxe')], 'ber');
    assert.match(r.error, /Encontré varias/);
  });

  it('prefiere la coincidencia exacta', () => {
    const r = resolveEntry([entry('Berserk Deluxe'), entry('Berserk')], 'berserk');
    assert.equal(r.entry.manga.name, 'Berserk');
  });

  it('tolera título ausente y entradas sin manga', () => {
    assert.equal(resolveEntry([], undefined).error, 'Falta el título.');
    assert.match(resolveEntry([{}, {}], 'q').error, /No encontré/);
  });
});

describe('discord-bot: comandos de escritura y bordes', () => {
  let dir;
  let db;
  let profile;
  let session;
  let commands;
  let pagination;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcedge-'));
    db = openDb(dir);
    profile = createProfile(db, 'P');
    const berserk = createManga(db, { name: 'Berserk', volumes: 41 });
    upsertEntry(db, { mangaId: berserk.id, profileId: profile.id, quantity: 40, priority: true });
    const deluxe = createManga(db, { name: 'Berserk Deluxe', volumes: 42 });
    upsertEntry(db, { mangaId: deluxe.id, profileId: profile.id, quantity: 10 });
    session = { profileId: profile.id };
    pagination = createPaginationStore();
    commands = createCommands({ db, pagination });
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('/actualizar propone la cantidad válida', async () => {
    const out = await commands.actualizar({ session, titulo: 'Berserk', cantidad: 42 });
    assert.equal(out.kind, 'write');
    assert.equal(out.action.type, 'setQuantity');
    assert.equal(out.action.quantity, 42);
    assert.match(out.summary, /40 → 42/);
  });

  it('/pending propone pending y lo limpia vacío', async () => {
    const out = await commands.pending({ session, titulo: 'Berserk', tomos: '5,7' });
    assert.equal(out.action.type, 'setPending');
    assert.equal(out.action.pending, '5,7');
    const cleared = await commands.pending({ session, titulo: 'Berserk', tomos: '  ' });
    assert.equal(cleared.action.pending, null);
    assert.match(cleared.summary, /pending: —/);
  });

  it('/prioridad propone alternar según el estado', async () => {
    const on = await commands.prioridad({ session, titulo: 'Berserk' });
    assert.equal(on.action.type, 'togglePriority');
    assert.match(on.summary, /quitar prioridad/);
    const off = await commands.prioridad({ session, titulo: 'Berserk Deluxe' });
    assert.match(off.summary, /activar prioridad/);
  });

  it('/nuevo exige título', async () => {
    assert.equal(await commands.nuevo({ session, titulo: '   ' }), 'Falta el título.');
    assert.equal(await commands.nuevo({ session }), 'Falta el título.');
  });

  it('los títulos inexistentes no escriben en los comandos de escritura', async () => {
    assert.match(await commands.actualizar({ session, titulo: 'zzz', cantidad: 5 }), /No encontré/);
    assert.match(await commands.pending({ session, titulo: 'zzz' }), /No encontré/);
    assert.match(await commands.prioridad({ session, titulo: 'zzz' }), /No encontré/);
  });

  it('/pending sin tomos limpia el campo', async () => {
    const out = await commands.pending({ session, titulo: 'Berserk' });
    assert.equal(out.action.pending, null);
    assert.match(out.summary, /pending: —/);
  });

  it('los títulos ambiguos no escriben', async () => {
    const out = await commands.tomo({ session, titulo: 'ber' });
    assert.match(out, /Encontré varias/);
  });

  it('/buscar formatea series en curso, completas y con catálogos', async () => {
    const format = formats.create(db, 'Tankoubon');
    const publisher = publishers.create(db, 'Ivrea');
    const enCurso = createManga(db, { name: 'Serie A', volumes: 0 });
    upsertEntry(db, { mangaId: enCurso.id, profileId: profile.id, quantity: 3 });
    const completo = createManga(db, { name: 'Serie B', volumes: 5 });
    upsertEntry(db, { mangaId: completo.id, profileId: profile.id, quantity: 5, priority: true });
    const conMeta = createManga(db, {
      name: 'Serie C',
      volumes: 10,
      formatId: format.id,
      publisherId: publisher.id,
    });
    upsertEntry(db, { mangaId: conMeta.id, profileId: profile.id, quantity: 1 });
    const out = await commands.buscar({ session, query: 'serie' });
    assert.match(out, /en curso/);
    assert.match(out, /✅ Completo/);
    assert.match(out, /⭐/);
    assert.match(out, /Tankoubon · Ivrea/);
  });

  it('/buscar sin sugerencias omite la pista', async () => {
    const out = await commands.buscar({ session, query: 'qqqq' });
    assert.match(out, /No encontré/);
    assert.doesNotMatch(out, /Quisiste decir/);
  });

  it('/pendientes sin nada pendiente felicita', async () => {
    const vacio = createProfile(db, 'Vacío');
    const out = await commands.pendientes({ session: { profileId: vacio.id } });
    assert.match(out, /nada pendiente/);
  });

  it('/perfil por id, inexistente y marca el activo', async () => {
    const byId = await commands.perfil({ session: {}, perfil: String(profile.id) });
    assert.match(byId, /activo/i);
    const missing = await commands.perfil({ session: {}, perfil: 'nope' });
    assert.match(missing, /No existe/);
    const list = await commands.perfil({ session: { profileId: profile.id } });
    assert.match(list, /▶️/);
  });

  it('/perfil sin perfiles creados', async () => {
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mcnoperfil-'));
    const db2 = openDb(dir2);
    try {
      const c = createCommands({ db: db2 });
      assert.match(await c.perfil({ session: {} }), /No hay perfiles/);
    } finally {
      db2.close();
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });

  it('/nuevo sin total usa el placeholder', async () => {
    const out = await commands.nuevo({ session, titulo: 'Nueva Serie' });
    assert.equal(out.action.total, null);
    assert.equal(out.action.quantity, 0);
    assert.match(out.summary, /0\/\?\? tomos/);
  });

  it('createCommands acepta getDb inyectable', async () => {
    const c = createCommands({ getDb: () => db });
    assert.match(await c.perfil({ session: {} }), /P/);
  });

  it('/recomendar sin items elegibles', async () => {
    const rec = createCommands({
      db,
      getRecommendations: async () => ({ isConfident: true, inferredCountry: 'Argentina', items: [] }),
    });
    const out = await rec.recomendar({ session });
    assert.match(out, /No encontré recomendaciones elegibles para Argentina/);
  });

  it('/recomendar sin desglose de editoriales', async () => {
    const rec = createCommands({
      db,
      getRecommendations: async () => ({ isConfident: false, inferredCountry: null, items: [] }),
    });
    const out = await rec.recomendar({ session });
    assert.match(out, /ninguna editorial reconocida/);
    assert.match(out, /Series sin editorial reconocida: 2\./);
  });

  it('/recomendar incluye nota de importación y proveedor por defecto', async () => {
    const rec = createCommands({
      db,
      getRecommendations: async () => ({
        isConfident: true,
        inferredCountry: 'Argentina',
        blockedByImportCount: 2,
        items: [{ title: 'Monster', publisher: 'Ivrea', reason: 'porque sí' }],
      }),
    });
    const out = await rec.recomendar({ session });
    assert.match(out, /Se excluyeron 2 opciones/);
    assert.match(out, /Monster/);
    assert.match(out, /porque sí/);
    assert.match(out, /Proveedor: local/);
  });

  it('/recomendar respeta el límite pedido y tolera respuesta nula', async () => {
    let received;
    const rec = createCommands({
      db,
      getRecommendations: async (_db, _profileId, limite) => {
        received = limite;
        return null;
      },
    });
    const out = await rec.recomendar({ session, limite: 3 });
    assert.equal(received, 3);
    assert.match(out, /No pude inferir/);
    assert.match(out, /ninguna editorial reconocida/);
  });

  it('/recomendar confiable sin campo items', async () => {
    const rec = createCommands({
      db,
      getRecommendations: async () => ({ isConfident: true, inferredCountry: 'AR' }),
    });
    const out = await rec.recomendar({ session });
    assert.match(out, /No encontré recomendaciones elegibles para AR/);
  });

  it('/recomendar confiable sin país inferido', async () => {
    const rec = createCommands({
      db,
      getRecommendations: async () => ({ isConfident: true, items: [] }),
    });
    const out = await rec.recomendar({ session });
    assert.match(out, /No pude inferir/);
  });

  it('/recomendar tolera perfil desaparecido tras recomendar', async () => {
    const rec = createCommands({
      db,
      getRecommendations: async (d, pid) => {
        d.prepare('DELETE FROM Profile WHERE Id = ?').run(pid);
        return { isConfident: true, inferredCountry: 'AR', items: [{ title: 'X' }] };
      },
    });
    const out = await rec.recomendar({ session });
    assert.match(out, /Recomendaciones para \*/);
  });

  it('/nuevo con formato y editorial los propaga', async () => {
    const out = await commands.nuevo({
      session,
      titulo: 'Con Meta',
      total: 3,
      cantidad: 1,
      formato: 'Tankoubon',
      editorial: 'Ivrea',
    });
    assert.equal(out.action.formato, 'Tankoubon');
    assert.equal(out.action.editorial, 'Ivrea');
  });

  it('/pendientes omite editoriales Unknown', async () => {
    const unknown = formats.create(db, 'Unknown');
    const manga = createManga(db, { name: 'Serie U', volumes: 10, formatId: unknown.id });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    const result = await commands.pendientes({ session });
    const out = pageContent(pagination, result);
    assert.match(out, /Serie U/);
    assert.doesNotMatch(out, /Unknown/);
  });
});

describe('discord-bot: applyWrite (bordes)', () => {
  let dir;
  let db;
  let profile;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcwrite2-'));
    db = openDb(dir);
    profile = createProfile(db, 'P');
    const manga = createManga(db, { name: 'Berserk', volumes: 41 });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 40, priority: true });
  });

  afterEach(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rechaza acciones inválidas o desconocidas', () => {
    assert.throws(() => applyWrite(db, null), /Acción de escritura inválida/);
    assert.throws(() => applyWrite(db, 'x'), /Acción de escritura inválida/);
    assert.throws(() => applyWrite(db, { type: 'desconocida' }), /desconocida/);
  });

  it('togglePriority desactiva si estaba activa', () => {
    const entry = listEntries(db, profile.id)[0];
    const result = applyWrite(db, { type: 'togglePriority', entry });
    assert.match(result.summary, /prioridad: desactivada/);
    assert.equal(listEntries(db, profile.id)[0].priority, false);
  });

  it('setPending limpia con valor nulo', () => {
    const entry = listEntries(db, profile.id)[0];
    const result = applyWrite(db, { type: 'setPending', entry: { ...entry, pending: '5' }, pending: null });
    assert.match(result.summary, /pending: —/);
    assert.equal(listEntries(db, profile.id)[0].pending, null);
  });

  it('createMangaEntry crea format/editorial y reutiliza existentes', () => {
    const first = applyWrite(db, {
      type: 'createMangaEntry',
      name: 'Dandadan',
      total: 5,
      quantity: 2,
      formato: 'Tankoubon',
      editorial: 'Ivrea',
      profileId: profile.id,
    });
    assert.match(first.summary, /Dandadan/);
    const created = listEntries(db, profile.id).find((e) => e.manga.name === 'Dandadan');
    assert.equal(created.manga.format.name, 'Tankoubon');
    assert.equal(created.manga.publisher.name, 'Ivrea');

    const second = applyWrite(db, {
      type: 'createMangaEntry',
      name: 'Sakamoto Days',
      total: 0,
      quantity: 0,
      formato: 'Tankoubon',
      editorial: 'Ivrea',
      profileId: profile.id,
    });
    assert.match(second.summary, /Sakamoto Days/);
  });

  it('createMangaEntry reutiliza un manga existente', () => {
    const result = applyWrite(db, {
      type: 'createMangaEntry',
      name: 'berserk',
      total: 0,
      quantity: 0,
      profileId: profile.id,
    });
    assert.match(result.summary, /Berserk/);
    assert.equal(result.entry.profileId, profile.id);
  });

  it('createMangaEntry con formato/editorial vacíos usa Unknown', () => {
    applyWrite(db, {
      type: 'createMangaEntry',
      name: 'Sin Catálogo',
      total: 0,
      quantity: 0,
      formato: '   ',
      editorial: '   ',
      profileId: profile.id,
    });
    const created = listEntries(db, profile.id).find((e) => e.manga.name === 'Sin Catálogo');
    assert.equal(created.manga.format.name, 'Unknown');
    assert.equal(created.manga.publisher.name, 'Unknown');
  });

  it('createMangaEntry sin total ni cantidad usa 0', () => {
    const result = applyWrite(db, {
      type: 'createMangaEntry',
      name: 'Minimal',
      profileId: profile.id,
    });
    assert.match(result.summary, /agregado \(0 tomos\)/);
    const created = listEntries(db, profile.id).find((e) => e.manga.name === 'Minimal');
    assert.equal(created.quantity, 0);
  });
});

describe('discord-bot: pending write (defaults)', () => {
  it('beginPendingWrite sin argumentos usa defaults', () => {
    const session = {};
    const pending = beginPendingWrite(session);
    assert.equal(typeof pending.token, 'string');
    assert.ok(pending.token.length > 0);
    assert.equal(pending.summary, undefined);
  });
});

describe('discord-bot: dispatch de errores sin mensaje', () => {
  it('tolera errores sin message', async () => {
    const commands = {
      boom: async () => {
        throw undefined;
      },
      str: async () => {
        throw 'texto';
      },
    };
    assert.equal(await dispatch(commands, 'boom', {}), '⚠️ No pude procesar el comando.');
    assert.equal(await dispatch(commands, 'str', {}), '⚠️ No pude procesar el comando.');
  });
});

describe('discord-bot: registerGuildCommands', () => {
  it('registra los comandos del guild vía REST (mock, sin red)', async () => {
    const original = getGlobalDispatcher();
    const agent = new MockAgent();
    agent.disableNetConnect();
    agent.get('https://discord.com').intercept({ path: /.*/, method: 'PUT' }).reply(200, []);
    setGlobalDispatcher(agent);
    try {
      await registerGuildCommands({ token: 'tok', applicationId: 'app', guildId: 'g1' });
    } finally {
      setGlobalDispatcher(original);
      await agent.close();
    }
  });
});

// Fake mínimo de discord.js para ejercitar el ciclo del bot sin conexión real.
function makeFakeDiscord({ restGet } = {}) {
  const clients = [];
  class ButtonBuilder {
    setCustomId(id) {
      this.customId = id;
      return this;
    }
    setLabel(label) {
      this.label = label;
      return this;
    }
    setStyle(style) {
      this.style = style;
      return this;
    }
    setDisabled(disabled) {
      this.disabled = disabled;
      return this;
    }
  }
  class ActionRowBuilder {
    addComponents(...components) {
      this.components = components;
      return this;
    }
  }
  class Client {
    constructor(options) {
      this.options = options;
      this.handlers = {};
      this.onceHandlers = {};
      this.rest = { get: restGet ?? (() => Promise.resolve({ ok: true })) };
      this.destroyed = false;
      clients.push(this);
    }
    on(event, handler) {
      this.handlers[event] = handler;
      return this;
    }
    once(event, handler) {
      this.onceHandlers[event] = handler;
      return this;
    }
    async login(token) {
      this.token = token;
      return this;
    }
    destroy() {
      this.destroyed = true;
    }
  }
  return {
    module: {
      Client,
      GatewayIntentBits: { Guilds: 1 },
      Events: { InteractionCreate: 'interactionCreate', ClientReady: 'ready' },
      ActionRowBuilder,
      ButtonBuilder,
      ButtonStyle: { Success: 3, Secondary: 2 },
    },
    clients,
  };
}

describe('discord-bot: interacciones con discord inyectado', () => {
  let dir;
  let db;
  let profile;
  let bot;
  let clients;
  let errors;
  let warns;
  let infos;
  let statuses;
  let original;
  let agent;

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const chat = (over = {}) => ({
    isButton: () => false,
    isChatInputCommand: () => true,
    commandName: 'ayuda',
    user: { id: 'u1' },
    guildId: 'g1',
    options: { getString: () => null, getInteger: () => null },
    reply: async () => {},
    ...over,
  });
  const button = (customId, over = {}) => ({
    isButton: () => true,
    user: { id: 'u1' },
    guildId: 'g1',
    customId,
    update: async () => {},
    ...over,
  });
  const tokenFrom = (payload) => payload.components[0].components[0].customId.split(':')[2];

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcmock-'));
    db = openDb(dir);
    profile = createProfile(db, 'P');
    const manga = createManga(db, { name: 'Berserk', volumes: 41 });
    upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 40, priority: true });
    errors = [];
    warns = [];
    infos = [];
    statuses = [];
    const fake = makeFakeDiscord();
    clients = fake.clients;
    original = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    agent.get('https://discord.com').intercept({ path: /.*/, method: 'PUT' }).reply(200, []);
    setGlobalDispatcher(agent);
    bot = createDiscordBot({
      getConfig: () => ({ enabled: true, guildId: 'g1', allowedUserIds: ['u1'], pendingLimitEnabled: true, pendingLimit: 20, ephemeralReplies: true }),
      getToken: () => 'tok',
      followUpDelayMs: 0,
      db,
      logger: {
        error: (m) => errors.push(m),
        warn: (m) => warns.push(m),
        info: (m) => infos.push(m),
      },
      onStatusChange: (s) => statuses.push(s),
      loadDiscord: async () => fake.module,
    });
    await bot.start();
    await clients[0].onceHandlers.ready({ application: { id: 'app' } });
  });

  afterEach(async () => {
    bot?.stop();
    setGlobalDispatcher(original);
    await agent.close();
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('arranca conectado y registra los comandos', () => {
    assert.equal(bot.status(), 'conectado');
    assert.equal(warns.length, 0);
    assert.ok(statuses.includes('conectando'));
    assert.ok(statuses.includes('conectado'));
  });

  it('responde a un comando de solo lectura', async () => {
    const replies = [];
    await clients[0].handlers.interactionCreate(chat({ reply: async (p) => replies.push(p) }));
    await flush();
    assert.match(replies[0].content, /\/tomo/);
    assert.equal(replies[0].ephemeral, true);
  });

  it('/pendientes responde paginado con botones', async () => {
    for (let i = 0; i < 30; i += 1) {
      const manga = createManga(db, { name: `Serie ${i}`, volumes: 10 });
      upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    }
    const replies = [];
    await clients[0].handlers.interactionCreate(
      chat({ commandName: 'pendientes', reply: async (p) => replies.push(p) })
    );
    for (let i = 0; i < 20 && replies.length === 0; i += 1) await flush();
    assert.equal(replies.length, 1);
    assert.match(replies[0].content, /Página 1 de 2/);
    assert.ok(replies[0].components?.length >= 1);

    // Navegar a la página 2 con el botón Siguiente.
    const nextId = replies[0].components[0].components[1].customId;
    const updates = [];
    await clients[0].handlers.interactionCreate(button(nextId, { update: async (p) => updates.push(p) }));
    for (let i = 0; i < 20 && updates.length === 0; i += 1) await flush();
    assert.match(updates[0].content, /Página 2 de 2/);
    assert.equal(updates[0].components[0].components[1].disabled, true);
  });

  it('avisa cuando la paginación expiró', async () => {
    const updates = [];
    await clients[0].handlers.interactionCreate(
      button('mc:pend:noexiste:2', { update: async (p) => updates.push(p) })
    );
    for (let i = 0; i < 20 && updates.length === 0; i += 1) await flush();
    assert.match(updates[0].content, /expiró/i);
  });

  it('reparte en varios mensajes una respuesta larga de /buscar', async () => {
    for (let i = 0; i < 120; i += 1) {
      const manga = createManga(db, { name: `Serie ${i}`, volumes: 10 });
      upsertEntry(db, { mangaId: manga.id, profileId: profile.id, quantity: 1 });
    }
    const replies = [];
    const followUps = [];
    await clients[0].handlers.interactionCreate(
      chat({
        commandName: 'buscar',
        options: { getString: (n) => (n === 'query' ? 'Serie' : null), getInteger: () => null },
        reply: async (p) => replies.push(p),
        followUp: async (p) => followUps.push(p),
      })
    );
    for (let i = 0; i < 40 && followUps.length === 0; i += 1) await flush();
    assert.equal(replies.length, 1);
    assert.ok(followUps.length >= 1);
    assert.match(followUps[followUps.length - 1].content, /\(\d+\/\d+\)/);
  });

  it('ignora interacciones no autorizadas', async () => {
    const replies = [];
    await clients[0].handlers.interactionCreate(
      chat({ user: { id: 'x' }, reply: async (p) => replies.push(p) })
    );
    await flush();
    assert.equal(replies.length, 0);
  });

  it('ignora interacciones que no son comandos ni botones', async () => {
    await clients[0].handlers.interactionCreate({ isButton: () => false, isChatInputCommand: () => false });
    await clients[0].handlers.interactionCreate({});
    await flush();
    assert.equal(errors.length, 0);
  });

  it('propone una escritura y la confirma', async () => {
    const replies = [];
    await clients[0].handlers.interactionCreate(
      chat({
        commandName: 'tomo',
        options: { getString: (n) => (n === 'titulo' ? 'Berserk' : null), getInteger: () => null },
        reply: async (p) => replies.push(p),
      })
    );
    await flush();
    const payload = replies[0];
    assert.match(payload.content, /Confirmás/);
    assert.equal(payload.ephemeral, true);
    const token = tokenFrom(payload);

    const updates = [];
    await clients[0].handlers.interactionCreate(
      button(`mc:confirm:${token}`, { update: async (p) => updates.push(p) })
    );
    await flush();
    assert.match(updates[0].content, /✅/);
    assert.equal(listEntries(db, profile.id).find((e) => e.manga.name === 'Berserk').quantity, 41);
    assert.ok(infos.some((m) => m.startsWith('bot write:')));
  });

  it('cancela una escritura pendiente', async () => {
    const replies = [];
    await clients[0].handlers.interactionCreate(
      chat({
        commandName: 'tomo',
        options: { getString: (n) => (n === 'titulo' ? 'Berserk' : null), getInteger: () => null },
        reply: async (p) => replies.push(p),
      })
    );
    await flush();
    const token = tokenFrom(replies[0]);
    const updates = [];
    await clients[0].handlers.interactionCreate(
      button(`mc:cancel:${token}`, { update: async (p) => updates.push(p) })
    );
    await flush();
    assert.equal(updates[0].content, 'Cancelado.');
  });

  it('rechaza un token inexistente o ya usado', async () => {
    const updates = [];
    await clients[0].handlers.interactionCreate(
      button('mc:confirm:nope', { update: async (p) => updates.push(p) })
    );
    await flush();
    assert.match(updates[0].content, /no está disponible/);
  });

  it('ignora botones no autorizados o con id inválido', async () => {
    const updates = [];
    await clients[0].handlers.interactionCreate(
      button('mc:confirm:t', { user: { id: 'x' }, update: async (p) => updates.push(p) })
    );
    await clients[0].handlers.interactionCreate(
      button('otro', { update: async (p) => updates.push(p) })
    );
    await clients[0].handlers.interactionCreate(
      button(undefined, { update: async (p) => updates.push(p) })
    );
    await flush();
    assert.equal(updates.length, 0);
  });

  it('reporta el error al aplicar la escritura', async () => {
    const replies = [];
    await clients[0].handlers.interactionCreate(
      chat({
        commandName: 'tomo',
        options: { getString: (n) => (n === 'titulo' ? 'Berserk' : null), getInteger: () => null },
        reply: async (p) => replies.push(p),
      })
    );
    await flush();
    const token = tokenFrom(replies[0]);
    // El perfil desaparece entre la propuesta y la confirmación.
    db.prepare('DELETE FROM Profile WHERE Id = ?').run(profile.id);
    const updates = [];
    await clients[0].handlers.interactionCreate(
      button(`mc:confirm:${token}`, { update: async (p) => updates.push(p) })
    );
    await flush();
    assert.match(updates[0].content, /⚠️/);
  });

  it('loguea interacciones que fallan', async () => {
    await clients[0].handlers.interactionCreate(
      chat({
        commandName: 'ayuda',
        reply: async () => {
          throw new Error('reply roto');
        },
      })
    );
    await clients[0].handlers.interactionCreate(
      chat({
        commandName: undefined,
        reply: async () => {
          throw 'boom';
        },
      })
    );
    await flush();
    assert.ok(errors.some((m) => /falló tras \d+ms/.test(m)));
    assert.ok(errors.some((m) => m.includes('interacción ?')));
    assert.ok(errors.some((m) => m.endsWith('boom')));
  });

  it('avisa si falla el registro de comandos al conectar', async () => {
    const failing = new MockAgent();
    failing.disableNetConnect();
    setGlobalDispatcher(failing);
    try {
      await clients[0].onceHandlers.ready({ application: { id: 'app' } });
    } finally {
      setGlobalDispatcher(agent);
      await failing.close();
    }
    assert.ok(warns.some((m) => /no se pudieron registrar/.test(m)));
  });

  it('keepWarm reprograma el ping si ya estaba activo', async () => {
    await clients[0].onceHandlers.ready({ application: { id: 'app' } });
    assert.equal(bot.status(), 'conectado');
  });

  it('restart reinicia la conexión', async () => {
    await bot.restart();
    assert.equal(bot.status(), 'conectando');
    assert.equal(clients.length, 2);
  });

  it('stop tolera fallos de destroy', () => {
    clients[0].destroy = () => {
      throw new Error('destroy roto');
    };
    assert.doesNotThrow(() => bot.stop());
  });

  it('stop tolera cliente sin destroy', () => {
    clients[0].destroy = undefined;
    assert.doesNotThrow(() => bot.stop());
  });
});

describe('discord-bot: keepWarm', () => {
  it('pinguea el gateway periódicamente', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcwarm-'));
    const db = openDb(dir);
    let getCalls = 0;
    const fake = makeFakeDiscord({
      restGet: () => {
        getCalls += 1;
        return Promise.resolve({ ok: true });
      },
    });
    const original = getGlobalDispatcher();
    const agent = new MockAgent();
    agent.disableNetConnect();
    agent.get('https://discord.com').intercept({ path: /.*/, method: 'PUT' }).reply(200, []);
    setGlobalDispatcher(agent);
    const bot = createDiscordBot({
      getConfig: () => ({ enabled: true, guildId: 'g1', allowedUserIds: ['u1'], pendingLimitEnabled: true, pendingLimit: 20, ephemeralReplies: true }),
      getToken: () => 'tok',
      followUpDelayMs: 0,
      db,
      getDb: () => db,
      logger: { error() {}, warn() {}, info() {} },
      loadDiscord: async () => fake.module,
    });
    try {
      await bot.start();
      await fake.clients[0].onceHandlers.ready({ application: { id: 'app' } });
      t.mock.timers.tick(90000);
      assert.equal(getCalls, 1);
    } finally {
      bot.stop();
      setGlobalDispatcher(original);
      await agent.close();
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('discord-bot: defaults del constructor', () => {
  it('usa onStatusChange por defecto', async () => {
    const bot = createDiscordBot({ getConfig: () => ({ enabled: false }), getToken: () => 't' });
    await bot.start();
    assert.equal(bot.status(), 'apagado');
  });

  it('arranca apagado si no hay config', async () => {
    const bot = createDiscordBot({ getConfig: () => undefined, getToken: () => 't' });
    await bot.start();
    assert.equal(bot.status(), 'apagado');
  });

  it('usa console por defecto al fallar la carga', async () => {
    const original = console.error;
    const logged = [];
    console.error = (m) => logged.push(m);
    try {
      const bot = createDiscordBot({
        getConfig: () => ({ enabled: true, guildId: 'g', allowedUserIds: ['u'] }),
        getToken: () => 't',
        db: {},
        loadDiscord: async () => {
          throw new Error('sin red');
        },
      });
      await bot.start();
      assert.equal(bot.status(), 'error');
      assert.ok(logged.length >= 1);
    } finally {
      console.error = original;
    }
  });
});
