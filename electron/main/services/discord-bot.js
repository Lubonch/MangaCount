// Bot de Discord embebido en el proceso main (solo consulta).
//
// Reutiliza la misma conexión SQLite y los mismos servicios que la app; el
// despacho es un registro nombre → función, con el seam abierto para sumar un
// comando de escritura (`actualizar`) sin infraestructura nueva. La parte pura
// (autorización, comandos, despacho, sesión) se testea sin conexión real.

import { listEntries } from '../db/repositories/entries.js';
import { listProfiles, getProfileById, listMangas } from './catalog-base.js';
import { getRecommendations } from './recommendations.js';
import {
  searchResult,
  pendingSummary,
  entryStatus,
  huecosEntries,
  almostCompleteEntries,
} from './search.js';
import { handlers } from '../ipc/handlers.js';
import { splitMessage } from './discord-messages.js';
import { createAppTranslator, resolveLanguage } from '../../../shared/i18n/index.js';
import { createPaginationStore, renderPage } from './discord-pagination.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Traductor por defecto (tests): sigue el env `MANGACOUNT_LANG`/default.
const fallbackTranslator = () => createAppTranslator(resolveLanguage({}));

export function slashCommands(t = fallbackTranslator()) {
  return [
  {
    name: 'perfil',
    description: t('bot.descPerfil'),
    options: [{ type: 3, name: 'perfil', description: t('bot.optPerfil'), required: false }],
  },
  {
    name: 'buscar',
    description: t('bot.descBuscar'),
    options: [{ type: 3, name: 'query', description: t('bot.optQuery'), required: true, autocomplete: true }],
  },
  { name: 'pendientes', description: t('bot.descPendientes') },
  { name: 'huecos', description: t('bot.descHuecos') },
  { name: 'a-punto', description: t('bot.descAPunto') },
  {
    name: 'recomendar',
    description: t('bot.descRecomendar'),
    options: [
      { type: 4, name: 'limite', description: t('bot.optLimite'), required: false, min_value: 1, max_value: 10 },
    ],
  },
  {
    name: 'tomo',
    description: t('bot.descTomo'),
    options: [{ type: 3, name: 'titulo', description: t('bot.optTitulo'), required: true, autocomplete: true }],
  },
  {
    name: 'actualizar',
    description: t('bot.descActualizar'),
    options: [
      { type: 3, name: 'titulo', description: t('bot.optTitulo'), required: true, autocomplete: true },
      { type: 4, name: 'cantidad', description: t('bot.optCantidad'), required: true, min_value: 0, max_value: 9999 },
    ],
  },
  {
    name: 'pending',
    description: t('bot.descPending'),
    options: [
      { type: 3, name: 'titulo', description: t('bot.optTitulo'), required: true, autocomplete: true },
      { type: 3, name: 'tomos', description: t('bot.optTomos'), required: false },
    ],
  },
  {
    name: 'prioridad',
    description: t('bot.descPrioridad'),
    options: [{ type: 3, name: 'titulo', description: t('bot.optTitulo'), required: true, autocomplete: true }],
  },
  {
    name: 'nuevo',
    description: t('bot.descNuevo'),
    options: [
      { type: 3, name: 'titulo', description: t('bot.optTitulo'), required: true, autocomplete: true },
      { type: 4, name: 'total', description: t('bot.optTotal'), required: false, min_value: 0 },
      { type: 4, name: 'cantidad', description: t('bot.optOwned'), required: false, min_value: 0 },
      { type: 3, name: 'formato', description: t('bot.optFormato'), required: false },
      { type: 3, name: 'editorial', description: t('bot.optEditorial'), required: false },
    ],
  },
    { name: 'stats', description: t('bot.descStats') },
  { name: 'backup', description: t('bot.descBackup') },
  { name: 'status', description: t('bot.descStatus') },
  { name: 'ayuda', description: t('bot.descAyuda') },
  ];
}

export function ayudaText(t = fallbackTranslator()) {
  return [
    t('bot.helpTitle'),
    t('bot.helpPerfil'),
    t('bot.helpBuscar'),
    t('bot.helpPendientes'),
    t('bot.helpHuecos'),
    t('bot.helpAPunto'),
    t('bot.helpStats'),
    t('bot.helpBackup'),
    t('bot.helpStatus'),
    t('bot.helpRecomendar'),
    t('bot.helpTomo'),
    t('bot.helpActualizar'),
    t('bot.helpPending'),
    t('bot.helpPrioridad'),
    t('bot.helpNuevo'),
  ].join('\n');
}

// Autorización por guild/user IDs; allowlist vacía no responde a nadie.
export function isAuthorized(config, { userId, guildId } = {}) {
  if (!config?.guildId || String(config.guildId) !== String(guildId)) return false;
  const allowed = config.allowedUserIds ?? [];
  if (allowed.length === 0) return false;
  return allowed.map(String).includes(String(userId));
}

// Sesión por usuario de Discord (clave = user id): recuerda el perfil activo.
// `get` devuelve el objeto mutable guardado para que los comandos lo actualicen.
export function createSessionStore() {
  const map = new Map();
  return {
    get(userId) {
      const key = String(userId);
      if (!map.has(key)) map.set(key, { profileId: null });
      return map.get(key);
    },
    clear() {
      map.clear();
    },
  };
}

function formatEntryLine(entry, t = fallbackTranslator()) {
  const status = entryStatus(entry);
  const describe =
    status.total > 0
      ? status.complete
        ? t('bot.formatComplete')
        : t('bot.formatProgress', { quantity: status.quantity, total: status.total, pending: status.pending })
      : t('bot.formatOngoing', { quantity: status.quantity });
  const meta = [entry.manga?.format?.name, entry.manga?.publisher?.name].filter(Boolean).join(' · ');
  const priority = entry.priority ? '⭐ ' : '';
  return `${priority}*${entry.manga.name}*\n  ${meta}\n  ${describe}`;
}

// Perfil de sesión válido: si el id recordado no existe (p. ej. tras una Nuclear
// Option/restore que re-siembra los perfiles), no se opera; se pide /perfil. Si no
// hay perfil y existe uno solo, se auto-selecciona.
export function resolveSessionProfile(session, db) {
  const profiles = listProfiles(db);
  const current = profiles.find((p) => p.id === session.profileId);
  if (current) return current;
  if (profiles.length === 1) {
    session.profileId = profiles[0].id;
    return profiles[0];
  }
  throw new Error(fallbackTranslator()('bot.profileRequired'));
}

// Crea format/editorial por nombre si no existe (mismo criterio que el import:
// vacío → 'Unknown'). Devuelve el id.
function getOrCreateCatalog(kind, db, name) {
  const clean = String(name ?? '').trim() || 'Unknown';
  const key = kind === 'format' ? 'format' : 'publisher';
  const list = handlers[`${key}:list`]({ db });
  const found = list.find((c) => c.name === clean);
  return found ? found.id : handlers[`${key}:create`]({ db }, { name: clean }).id;
}

// Ejecuta una acción de escritura reusando los handlers (validan el perfil).
export function applyWrite(db, action) {
  if (!action || typeof action !== 'object') throw new Error(fallbackTranslator()('bot.writeInvalid'));
  const ctx = { db };
  if (action.type === 'setQuantity') {
    const updated = handlers['entry:upsert'](ctx, { ...action.entry, quantity: action.quantity });
    return {
      summary: fallbackTranslator()('bot.summarySetQuantity', { name: action.entry.manga.name, from: action.entry.quantity, to: action.quantity }),
      entry: updated,
    };
  }
  if (action.type === 'setPending') {
    const updated = handlers['entry:upsert'](ctx, { ...action.entry, pending: action.pending });
    return {
      summary: fallbackTranslator()('bot.summarySetPending', { name: action.entry.manga.name, value: action.pending || '—' }),
      entry: updated,
    };
  }
  if (action.type === 'togglePriority') {
    const priority = !action.entry.priority;
    const updated = handlers['entry:upsert'](ctx, { ...action.entry, priority });
    return {
      summary: fallbackTranslator()('bot.summaryTogglePriority', { name: action.entry.manga.name, state: priority ? fallbackTranslator()('bot.priorityOn') : fallbackTranslator()('bot.priorityOff') }),
      entry: updated,
    };
  }
  if (action.type === 'createMangaEntry') {
    const formatId = action.formato ? getOrCreateCatalog('format', db, action.formato) : null;
    const publisherId = action.editorial ? getOrCreateCatalog('publisher', db, action.editorial) : null;
    let manga = listMangas(db).find((m) => m.name.toLowerCase() === action.name.toLowerCase());
    if (!manga) {
      manga = handlers['manga:upsert'](ctx, {
        name: action.name,
        volumes: action.total ?? 0,
        formatId,
        publisherId,
      });
    }
    const entry = handlers['entry:upsert'](ctx, {
      mangaId: manga.id,
      profileId: action.profileId,
      quantity: action.quantity ?? 0,
    });
    return { summary: fallbackTranslator()('bot.summaryCreated', { name: manga.name, count: action.quantity ?? 0 }), manga, entry };
  }
  throw new Error(`Acción de escritura desconocida: ${action.type}`);
}

// Resuelve un título a una entrada única de la colección. No adivina: 0 o >1 → error.
export function resolveEntry(entries, title, t = fallbackTranslator()) {
  const q = String(title ?? '').trim().toLowerCase();
  if (!q) return { error: t('bot.missingTitle') };
  const exact = entries.filter((e) => (e.manga?.name ?? '').toLowerCase() === q);
  const list = exact.length
    ? exact
    : entries.filter((e) => (e.manga?.name ?? '').toLowerCase().includes(q));
  if (list.length === 0) return { error: t('bot.entryNotFound', { title }) };
  if (list.length > 1) {
    return { error: t('bot.entryAmbiguous', { list: list.map((e) => e.manga.name).join(', ') }) };
  }
  return { entry: list[0] };
}

function writeProposal(summary, action) {
  return { kind: 'write', summary, action };
}

// Escritura pendiente de confirmación por usuario (token + expiración).
export function beginPendingWrite(session, { summary, action, ttlMs = 300000, now = Date.now, token } = {}) {
  const t = token ?? Math.random().toString(36).slice(2, 10);
  session.pending = { token: t, summary, action, expiresAt: now() + ttlMs };
  return session.pending;
}

export function consumePendingWrite(session, token, now = Date.now) {
  const pending = session.pending;
  if (!pending || String(pending.token) !== String(token)) {
    return { error: 'La operación no está disponible o ya se usó.' };
  }
  session.pending = null;
  if (now() > pending.expiresAt) return { error: 'La operación expiró. Volvé a intentar.' };
  return { pending };
}

export function createCommands({
  db,
  getDb,
  getConfig = () => ({}),
  getT = fallbackTranslator,
  pagination = createPaginationStore(),
  runBackup = async () => ({ ok: false }),
  getStatus = () => ({}),
  getRecommendations: recommend = getRecommendations,
} = {}) {
  const t = (key, params) => getT()(key, params);
  const resolveDb = getDb ?? (() => db);
  const entriesFor = (profileId) => listEntries(resolveDb(), profileId);

  function activeProfile(session) {
    return resolveSessionProfile(session, resolveDb());
  }

  // Tamaño de página: el tope configurado, o todo si está desactivado.
  function pageSizeFor(config, count) {
    const enabled = config?.pendingLimitEnabled !== false;
    const limit = Number.isInteger(config?.pendingLimit) ? config.pendingLimit : 20;
    return enabled ? limit : Math.max(count, 1);
  }

  function pagedResult({ lines, userId, header, config }) {
    const token = pagination.create({
      lines,
      pageSize: pageSizeFor(config, lines.length),
      userId,
      header,
    });
    return { kind: 'paged', token };
  }

  return {
    async perfil({ session, perfil }) {
      const list = listProfiles(resolveDb());
      if (list.length === 0) return t('bot.noProfiles');
      if (perfil) {
        const found =
          list.find((p) => p.name.toLowerCase() === String(perfil).toLowerCase()) ??
          list.find((p) => String(p.id) === String(perfil));
        if (!found) return t('bot.profileNotFound', { name: perfil });
        session.profileId = found.id;
        return t('bot.profileActive', { name: found.name });
      }
      const lines = list.map((p) => `${p.id === session.profileId ? '▶️' : '•'} ${p.name}`).join('\n');
      return t('bot.profileList', { lines });
    },

    async buscar({ session, query }) {
      const profileId = activeProfile(session).id;
      const { results, suggestions } = searchResult(entriesFor(profileId), query);
      if (results.length === 0) {
        const hint = suggestions.length
          ? t('bot.searchHint', { list: suggestions.map((s) => `   • ${s}`).join('\n') })
          : '';
        return t('bot.searchNotFound', { query, hint });
      }
      const content = t('bot.searchResults', { query, lines: results.map((e) => formatEntryLine(e, getT())).join('\n\n') });
      if (results.length === 1) {
        return { kind: 'entry', entryId: results[0].id, content };
      }
      return content;
    },

    async pendientes({ session, userId }) {
      const profileId = activeProfile(session).id;
      const summary = pendingSummary(entriesFor(profileId));
      if (summary.count === 0) return t('bot.nothingPending');
      const config = getConfig() ?? {};
      const limitEnabled = config.pendingLimitEnabled !== false;
      const limit = Number.isInteger(config.pendingLimit) ? config.pendingLimit : 20;
      const lines = summary.entries.map((e) => {
        const priority = e.priority ? '⭐ ' : '';
        const parts = [t('bot.pendingDetail', { quantity: e.quantity, total: e.manga.volumes, missing: e.manga.volumes - e.quantity })];
        if (e.pending) parts.push(t('bot.pendingNote', { value: e.pending }));
        const meta = [e.manga?.format?.name, e.manga?.publisher?.name].filter(
          (n) => n && n !== 'Unknown'
        );
        if (meta.length) parts.push(meta.join(' · '));
        return `${priority}*${e.manga.name}*: ${parts.join(' · ')}`;
      });
      return pagedResult({
        lines,
        userId,
        config,
        header: t('bot.pendingHeader', { count: summary.count, vols: summary.totalPending }),
      });
    },

    async huecos({ session, userId }) {
      const profileId = activeProfile(session).id;
      const entries = huecosEntries(entriesFor(profileId));
      if (entries.length === 0) return t('bot.noHuecos');
      const lines = entries.map((e) =>
        t('bot.huecosLine', {
          name: e.manga.name,
          quantity: e.quantity,
          total: e.manga.volumes,
          pending: e.pending,
        })
      );
      return pagedResult({
        lines,
        userId,
        config: getConfig(),
        header: t('bot.huecosHeader', { count: entries.length }),
      });
    },

    async 'a-punto'({ session, userId }) {
      const profileId = activeProfile(session).id;
      const entries = almostCompleteEntries(entriesFor(profileId));
      if (entries.length === 0) return t('bot.noAPunto');
      const lines = entries.map((e) =>
        t('bot.aPuntoLine', {
          name: e.manga.name,
          quantity: e.quantity,
          total: e.manga.volumes,
          missing: e.manga.volumes - e.quantity,
        })
      );
      return pagedResult({
        lines,
        userId,
        config: getConfig(),
        header: t('bot.aPuntoHeader', { count: entries.length }),
      });
    },

    async recomendar({ session, limite }) {
      const profileId = activeProfile(session).id;
      const response = await recommend(resolveDb(), profileId, limite ?? getConfig()?.recommendLimit ?? 5);
      if (!response?.isConfident || !response?.inferredCountry) {
        const breakdown = response?.inference?.breakdown ?? [];
        const owned = entriesFor(profileId).filter((e) => (e.quantity ?? 0) > 0).length;
        const mapped = breakdown.reduce((acc, b) => acc + b.seriesCount, 0);
        const noCountry = Math.max(owned - mapped, 0);
        const detected = breakdown.length
          ? breakdown
              .map((b) => t('bot.recDetectedLine', { country: b.country, series: b.seriesCount, volumes: b.volumeCount }))
              .join('\n')
          : t('bot.recNoPublisher');
        return (
          `${t('bot.recNoConfidence')}\n` +
          `${t('bot.recDetected')}\n${detected}\n` +
          `${t('bot.recUnmapped', { count: noCountry })}\n` +
          t('bot.recAdvice')
        );
      }
      const items = response.items ?? [];
      if (items.length === 0) {
        return t('bot.recNone', { country: response.inferredCountry });
      }
      const note =
        response.blockedByImportCount > 0
          ? t('bot.recExcluded', { count: response.blockedByImportCount })
          : '';
      const lines = items
        .map((item, index) => {
          const meta = [item.publisher, item.publisherCountry].filter(Boolean).join(' · ');
          const reason = item.reason ? `\n   ${item.reason}` : '';
          return `${index + 1}. *${item.title}*\n   ${meta}${reason}`;
        })
        .join('\n\n');
      const profile = getProfileById(resolveDb(), profileId);
      return (
        `${t('bot.recHeader', { name: profile?.name ?? '' })}\n` +
        `${t('bot.recCountry', { country: response.inferredCountry })}\n` +
        `${t('bot.recProvider', { provider: response.provider || 'local' })}${note}\n\n${lines}`
      );
    },
    async tomo({ session, titulo }) {
      const profile = activeProfile(session);
      const r = resolveEntry(entriesFor(profile.id), titulo, t());
      if (r.error) return r.error;
      const e = r.entry;
      return writeProposal(t('bot.summarySetQuantity', { name: e.manga.name, from: e.quantity, to: e.quantity + 1 }), {
        type: 'setQuantity',
        entry: e,
        quantity: e.quantity + 1,
      });
    },

    async actualizar({ session, titulo, cantidad }) {
      const profile = activeProfile(session);
      const n = Number.parseInt(cantidad, 10);
      if (!Number.isInteger(n) || n < 0) return t('bot.invalidQuantity');
      const r = resolveEntry(entriesFor(profile.id), titulo, t());
      if (r.error) return r.error;
      const e = r.entry;
      return writeProposal(t('bot.summarySetQuantity', { name: e.manga.name, from: e.quantity, to: n }), {
        type: 'setQuantity',
        entry: e,
        quantity: n,
      });
    },

    async pending({ session, titulo, tomos }) {
      const profile = activeProfile(session);
      const r = resolveEntry(entriesFor(profile.id), titulo, t());
      if (r.error) return r.error;
      const e = r.entry;
      const value = String(tomos ?? '').trim();
      // Sin texto: abrir el modal precargado con la nota actual.
      if (value === '') {
        return { kind: 'modal', entryId: e.id, value: e.pending ?? '' };
      }
      return writeProposal(t('bot.summarySetPending', { name: e.manga.name, value }), {
        type: 'setPending',
        entry: e,
        pending: value,
      });
    },

    async prioridad({ session, titulo }) {
      const profile = activeProfile(session);
      const r = resolveEntry(entriesFor(profile.id), titulo, t());
      if (r.error) return r.error;
      const e = r.entry;
      return writeProposal(t('bot.proposalPriority', { name: e.manga.name, action: e.priority ? t('bot.removePriority') : t('bot.addPriority') }), {
        type: 'togglePriority',
        entry: e,
      });
    },

    async nuevo({ session, titulo, total, cantidad, formato, editorial }) {
      const profile = activeProfile(session);
      const name = String(titulo ?? '').trim();
      if (!name) return t('bot.missingTitle');
      const existing = entriesFor(profile.id).find(
        (e) => e.manga.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) return t('bot.alreadyExists', { name: existing.manga.name });
      return writeProposal(t('bot.proposalAdd', { name, quantity: cantidad ?? 0, total: total ?? '??' }), {
        type: 'createMangaEntry',
        name,
        total: total ?? null,
        quantity: cantidad ?? 0,
        formato: formato ?? null,
        editorial: editorial ?? null,
        profileId: profile.id,
      });
    },

    async stats({ session }) {
      const profile = activeProfile(session);
      const entries = entriesFor(profile.id);
      const volumes = entries.reduce((acc, e) => acc + (e.quantity ?? 0), 0);
      const complete = entries.filter((e) => entryStatus(e).complete).length;
      const countBy = (pick) => {
        const map = new Map();
        for (const e of entries) {
          const key = pick(e);
          if (key && key !== 'Unknown') map.set(key, (map.get(key) ?? 0) + 1);
        }
        return [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => `${name} (${count})`)
          .join(', ');
      };
      return {
        kind: 'stats',
        title: t('bot.statsTitle', { name: profile.name }),
        fields: [
          t('bot.statsVolumes', { count: volumes }),
          t('bot.statsSeries', { total: entries.length, complete, ongoing: entries.length - complete }),
          t('bot.statsFormats', { list: countBy((e) => e.manga?.format?.name) || t('bot.none') }),
          t('bot.statsPublishers', { list: countBy((e) => e.manga?.publisher?.name) || t('bot.none') }),
        ],
      };
    },

    async backup({ session }) {
      const pending = beginPendingWrite(session, {
        summary: t('bot.backupConfirm'),
        action: { type: 'backup' },
      });
      return { kind: 'backup', token: pending.token };
    },

    async status() {
      return { kind: 'status', data: getStatus() };
    },

    async ayuda() {
      return ayudaText(getT());
    },
  };
}

// Despacho nombre → función; los errores se convierten en respuesta, sin romper el bot.
export async function dispatch(commands, name, args, t = fallbackTranslator()) {
  const fn = commands[name];
  if (!fn) return t('bot.unknownCommand');
  try {
    return await fn(args);
  } catch (err) {
    return t('bot.error', { message: err?.message ?? t('bot.dispatchError').replace('⚠️ ', '') });
  }
}

// Extrae los argumentos de una interacción como objeto plano (testeable).
export function readInteraction(interaction) {
  const opt = interaction.options;
  return {
    name: interaction.commandName,
    userId: interaction.user?.id,
    guildId: interaction.guildId,
    perfil: opt?.getString?.('perfil') ?? null,
    query: opt?.getString?.('query') ?? null,
    limite: opt?.getInteger?.('limite') ?? null,
    titulo: opt?.getString?.('titulo') ?? null,
    cantidad: opt?.getInteger?.('cantidad') ?? null,
    tomos: opt?.getString?.('tomos') ?? null,
    total: opt?.getInteger?.('total') ?? null,
    formato: opt?.getString?.('formato') ?? null,
    editorial: opt?.getString?.('editorial') ?? null,
  };
}

export async function registerGuildCommands({
  token,
  applicationId,
  guildId,
  commands,
  getT = fallbackTranslator,
}) {
  const { REST, Routes } = await import('discord.js');
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
    body: commands ?? slashCommands(getT()),
  });
}

// Cliente de Discord. `loadDiscord` es inyectable para no conectar en tests.
export function createDiscordBot({
  getConfig,
  getToken,
  getDb,
  db,
  logger = console,
  onStatusChange = () => {},
  loadDiscord,
  followUpDelayMs = 350,
  getT = fallbackTranslator,
  runBackup = async () => ({ ok: false }),
  getStatus = () => ({}),
} = {}) {
  let client = null;
  let status = 'apagado';
  const session = createSessionStore();
  const pagination = createPaginationStore();
  const commands = createCommands({ getDb, db, getConfig, getT, pagination, getStatus });
  const load = loadDiscord ?? (() => import('discord.js'));
  const resolveDb = getDb ?? (() => db);
  let discordMod = null;
  let warmTimer = null;
  let httpAgent = null;

  const setStatus = (next) => {
    status = next;
    onStatusChange(next);
  };

  const buildPager = (page) => {
    if (!discordMod) return [];
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = discordMod;
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(page.prevId)
          .setLabel(getT()('bot.pagerPrev'))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page.prevDisabled),
        new ButtonBuilder()
          .setCustomId(page.nextId)
          .setLabel(getT()('bot.pagerNext'))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page.nextDisabled)
      ),
    ];
  };

  const embedOf = ({ title, fields }) => {
    if (!discordMod?.EmbedBuilder) return null;
    const embed = new discordMod.EmbedBuilder().setTitle(title);
    if (fields?.length) embed.addFields(...fields.map((value) => ({ name: '\u200b', value })));
    return embed;
  };

  const backupRow = (token) => {
    if (!discordMod) return [];
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = discordMod;
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`mc:backup:confirm:${token}`)
          .setLabel(getT()('bot.confirmLabel'))
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`mc:backup:cancel:${token}`)
          .setLabel(getT()('bot.cancelLabel'))
          .setStyle(ButtonStyle.Secondary)
      ),
    ];
  };

  const entryActions = (entryId) => {
    if (!discordMod) return [];
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = discordMod;
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`mc:entry:tomo:${entryId}`)
          .setLabel(getT()('bot.actionAddVolume'))
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`mc:entry:prioridad:${entryId}`)
          .setLabel(getT()('bot.actionTogglePriority'))
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`mc:entry:pending:${entryId}`)
          .setLabel(getT()('bot.actionEditPending'))
          .setStyle(ButtonStyle.Secondary)
      ),
    ];
  };

  const pendingModal = (entryId, value) => {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = discordMod;
    return new ModalBuilder()
      .setCustomId(`mc:pending:${entryId}`)
      .setTitle(getT()('bot.pendingModalTitle'))
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('pending')
            .setLabel(getT()('bot.pendingModalLabel'))
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(String(value ?? ''))
        )
      );
  };

  const confirmRow = (token, { withEditNote = false } = {}) => {
    if (!discordMod) return [];
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = discordMod;
    const buttons = [
      new ButtonBuilder()
        .setCustomId(`mc:confirm:${token}`)
        .setLabel(getT()('bot.confirmLabel'))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`mc:cancel:${token}`)
        .setLabel(getT()('bot.cancelLabel'))
        .setStyle(ButtonStyle.Secondary),
    ];
    if (withEditNote) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`mc:confirmedit:${token}`)
          .setLabel(getT()('bot.confirmAndEdit'))
          .setStyle(ButtonStyle.Primary)
      );
    }
    return [new ActionRowBuilder().addComponents(...buttons)];
  };

  async function handleAutocomplete(interaction) {
    const config = getConfig();
    const args = { userId: interaction.user?.id, guildId: interaction.guildId };
    if (!isAuthorized(config, args)) {
      await interaction.respond([]);
      return;
    }
    const focused = interaction.options?.getFocused?.(true)?.value ?? '';
    const query = String(focused).trim().toLowerCase();
    const options = listMangas(resolveDb())
      .filter((manga) => !query || manga.name.toLowerCase().includes(query))
      .sort(
        (a, b) =>
          Number(b.name.toLowerCase().startsWith(query)) -
          Number(a.name.toLowerCase().startsWith(query))
      )
      .slice(0, 25)
      .map((manga) => ({ name: manga.name.slice(0, 100), value: manga.name.slice(0, 100) }));
    await interaction.respond(options);
  }

  async function handleModal(interaction) {
    const config = getConfig();
    const args = { userId: interaction.user?.id, guildId: interaction.guildId };
    if (!isAuthorized(config, args)) return;
    const match = /^mc:pending:(\d+)$/.exec(interaction.customId ?? '');
    if (!match) return;
    const entryId = Number(match[1]);
    const value = String(interaction.fields?.getTextInputValue?.('pending') ?? '').trim();
    try {
      const ctx = { db: resolveDb() };
      const current = handlers['entry:get-by-id'](ctx, entryId);
      if (!current) throw new Error(getT()('bot.entryNotFound', { title: entryId }));
      handlers['entry:upsert'](ctx, { ...current, pending: value === '' ? null : value });
      await interaction.reply({ content: getT()('bot.pendingUpdated'), ephemeral: true });
    } catch (err) {
      await interaction.reply({
        content: getT()('bot.error', { message: err?.message ?? err }),
        ephemeral: true,
      });
    }
  }

  async function handleInteraction(interaction) {
    if (interaction.isAutocomplete?.()) return handleAutocomplete(interaction);
    if (interaction.isModalSubmit?.()) return handleModal(interaction);
    if (interaction.isButton?.()) return handleButton(interaction);
    if (!interaction.isChatInputCommand?.()) return;
    const config = getConfig();
    const args = readInteraction(interaction);
    if (!isAuthorized(config, args)) return;
    const userSession = session.get(args.userId);
    const reply = await dispatch(commands, args.name, { session: userSession, ...args }, getT());
    if (reply && typeof reply === 'object' && reply.kind === 'write') {
      const pending = beginPendingWrite(userSession, {
        ...reply,
        ttlMs: (Number(config.confirmTtlMinutes) || 5) * 60000,
      });
      await interaction.reply({
        content: getT()('bot.confirm', { summary: pending.summary }),
        ephemeral: true,
        components: confirmRow(pending.token, {
          withEditNote:
            reply.action?.type === 'setQuantity' && Boolean(reply.action.entry?.pending),
        }),
      });
      return;
    }
    if (reply && typeof reply === 'object' && reply.kind === 'stats') {
      const embed = embedOf({ title: reply.title, fields: reply.fields });
      await interaction.reply(
        embed ? { embeds: [embed], ephemeral: config.ephemeralReplies === true } : reply.fields.join('\n')
      );
      return;
    }
    if (reply && typeof reply === 'object' && reply.kind === 'status') {
      const d = reply.data ?? {};
      const fields = [
        getT()('bot.statusVersion', { version: d.version ?? getT()('bot.none') }),
        getT()('bot.statusDb', { count: d.entries ?? getT()('bot.none') }),
        getT()('bot.statusLastBackup', { date: d.lastBackupAt ?? getT()('bot.none') }),
      ];
      const embed = embedOf({ title: getT()('bot.statusTitle'), fields });
      await interaction.reply(
        embed ? { embeds: [embed], ephemeral: config.ephemeralReplies === true } : fields.join('\n')
      );
      return;
    }
    if (reply && typeof reply === 'object' && reply.kind === 'backup') {
      await interaction.reply({
        content: getT()('bot.backupConfirm'),
        components: backupRow(reply.token),
        ephemeral: true,
      });
      return;
    }
    if (reply && typeof reply === 'object' && reply.kind === 'entry') {
      await interaction.reply({
        content: reply.content,
        components: entryActions(reply.entryId),
        ephemeral: config.ephemeralReplies === true,
      });
      return;
    }
    if (reply && typeof reply === 'object' && reply.kind === 'modal') {
      await interaction.showModal(pendingModal(reply.entryId, reply.value));
      return;
    }
    if (reply && typeof reply === 'object' && reply.kind === 'paged') {
      const item = pagination.get(reply.token);
      if (!item) {
        await interaction.reply(getT()('bot.pagerExpired'));
        return;
      }
      const page = renderPage(item, 1, getT());
      await interaction.reply({
        content: page.content,
        components: buildPager(page),
        ephemeral: config.ephemeralReplies === true,
      });
      return;
    }

    const ephemeral = config.ephemeralReplies === true;
    const payload = (content) => (ephemeral ? { content, ephemeral: true } : content);
    const chunks = splitMessage(String(reply));
    await interaction.reply(payload(chunks[0]));
    for (let i = 1; i < chunks.length; i += 1) {
      await sleep(followUpDelayMs);
      await interaction.followUp(payload(chunks[i]));
    }
  }

  async function handleButton(interaction) {
    const config = getConfig();
    const args = { userId: interaction.user?.id, guildId: interaction.guildId };
    if (!isAuthorized(config, args)) return;
    const userSession = session.get(args.userId);
    const editNote = /^mc:confirmedit:(.+)$/.exec(interaction.customId ?? '');
    if (editNote) {
      const consumed = consumePendingWrite(userSession, editNote[1]);
      if (consumed.error) {
        await interaction.update({ content: consumed.error, components: [] });
        return;
      }
      try {
        const result = applyWrite(resolveDb(), consumed.pending.action);
        await interaction.showModal(pendingModal(result.entry?.id, result.entry?.pending ?? ''));
      } catch (err) {
        await interaction.update({
          content: getT()('bot.error', { message: err?.message ?? err }),
          components: [],
        });
      }
      return;
    }

    const backupAction = /^mc:backup:(confirm|cancel):(.+)$/.exec(interaction.customId ?? '');
    if (backupAction) {
      const [, action, token] = backupAction;
      const consumed = consumePendingWrite(userSession, token);
      if (consumed.error) {
        await interaction.update({ content: consumed.error, components: [] });
        return;
      }
      if (action === 'cancel') {
        await interaction.update({ content: getT()('bot.cancelled'), components: [] });
        return;
      }
      await interaction.update({ content: getT()('bot.backupStarted'), components: [] });
      try {
        const result = await runBackup();
        await interaction.editReply({
          content: result?.fileName
            ? getT()('bot.backupOk', { file: result.fileName })
            : getT()('bot.backupOk', { file: getT()('bot.none') }),
        });
      } catch (err) {
        await interaction.editReply({
          content: getT()('bot.backupFailed', { error: err?.message ?? err }),
        });
      }
      return;
    }

    const entryAction = /^mc:entry:(tomo|prioridad|pending):(\d+)$/.exec(interaction.customId ?? '');
    if (entryAction) {
      const [, action, idStr] = entryAction;
      const entryId = Number(idStr);
      const ctx = { db: resolveDb() };
      const entry = handlers['entry:get-by-id'](ctx, entryId);
      if (!entry) {
        await interaction.update({ content: getT()('bot.entryNotFound', { title: entryId }), components: [] });
        return;
      }
      if (action === 'pending') {
        await interaction.showModal(pendingModal(entryId, entry.pending ?? ''));
        return;
      }
      try {
        const result = applyWrite(
          resolveDb(),
          action === 'tomo'
            ? { type: 'setQuantity', entry, quantity: entry.quantity + 1 }
            : { type: 'togglePriority', entry }
        );
        await interaction.update({
          content: `${formatEntryLine(result.entry, getT())}\n\n${result.summary}`,
          components: entryActions(entryId),
        });
      } catch (err) {
        await interaction.update({
          content: getT()('bot.error', { message: err?.message ?? err }),
          components: [],
        });
      }
      return;
    }

    const pend = /^mc:pend:([^:]+):(\d+)$/.exec(interaction.customId ?? '');
    if (pend) {
      const [, token, pageStr] = pend;
      const item = pagination.get(token);
      if (!item) {
        await interaction.update({ content: getT()('bot.pagerExpired'), components: [] });
        return;
      }
      const page = renderPage(item, Number(pageStr), getT());
      await interaction.update({ content: page.content, components: buildPager(page) });
      return;
    }

    const match = /^mc:(confirm|cancel):(.+)$/.exec(interaction.customId ?? '');
    if (!match) return;
    const [, action, token] = match;
    const consumed = consumePendingWrite(userSession, token);
    if (consumed.error) {
      await interaction.update({ content: consumed.error, components: [] });
      return;
    }
    if (action === 'cancel') {
      await interaction.update({ content: getT()('bot.cancelled'), components: [] });
      return;
    }
    try {
      const result = applyWrite(resolveDb(), consumed.pending.action);
      logger?.info?.(`bot write: ${result.summary}`);
      await interaction.update({ content: getT()('bot.applied', { summary: result.summary }), components: [] });
    } catch (err) {
      await interaction.update({ content: getT()('bot.error', { message: err?.message ?? err }), components: [] });
    }
  }

  function stop() {
    if (warmTimer) {
      clearInterval(warmTimer);
      warmTimer = null;
    }
    if (client) {
      try {
        client.destroy?.();
      } catch {
        /* ignore */
      }
      client = null;
    }
    if (httpAgent) {
      try {
        httpAgent.close?.();
      } catch {
        /* ignore */
      }
      httpAgent = null;
    }
  }

  // Agent HTTP con keep-alive largo. En redes con DNS/resolución lenta, reconectar
  // puede tardar >3s y la respuesta a la interacción llegaría tarde (Unknown
  // interaction); con la conexión caliente se reusa.
  async function createHttpAgent() {
    try {
      const { Agent } = await import('undici');
      return new Agent({
        keepAliveTimeout: 120000,
        keepAliveMaxTimeout: 600000,
        connect: { timeout: 15000 },
      });
    } catch {
      return undefined;
    }
  }

  // Ping liviano para no dejar cerrar la conexión REST entre comandos.
  function keepWarm() {
    if (warmTimer) clearInterval(warmTimer);
    warmTimer = setInterval(() => {
      client?.rest?.get?.('/gateway')?.catch?.(() => {});
    }, 90000);
    warmTimer.unref?.();
  }

  async function start() {
    stop();
    const config = getConfig();
    if (!config?.enabled) return setStatus('apagado');
    const token = getToken();
    if (!token) return setStatus('sin token');
    try {
      const discord = await load();
      discordMod = discord;
      const { Client, GatewayIntentBits, Events } = discord;
      httpAgent = await createHttpAgent();
      client = new Client({
        intents: [GatewayIntentBits.Guilds],
        rest: httpAgent ? { agent: httpAgent } : undefined,
      });
      client.on(Events.InteractionCreate, (interaction) => {
        const started = Date.now();
        handleInteraction(interaction).catch((err) =>
          logger?.error?.(
            `interacción ${interaction?.commandName ?? '?'} falló tras ${Date.now() - started}ms: ${err?.message ?? err}`
          )
        );
      });
      client.once(Events.ClientReady, async (ready) => {
        setStatus('conectado');
        try {
          await registerGuildCommands({
            token,
            applicationId: ready.application.id,
            guildId: config.guildId,
            getT,
          });
        } catch (err) {
          logger?.warn?.(`no se pudieron registrar los comandos: ${err?.message ?? err}`);
        }
        keepWarm();
      });
      setStatus('conectando');
      await client.login(token);
    } catch (err) {
      logger?.error?.(`el bot de Discord no arrancó: ${err?.message ?? err}`);
      setStatus('error');
    }
  }

  return {
    start,
    stop,
    restart: async () => {
      await start();
    },
    status: () => status,
    commands,
  };
}
