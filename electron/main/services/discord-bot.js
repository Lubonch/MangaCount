// Bot de Discord embebido en el proceso main (solo consulta).
//
// Reutiliza la misma conexión SQLite y los mismos servicios que la app; el
// despacho es un registro nombre → función, con el seam abierto para sumar un
// comando de escritura (`actualizar`) sin infraestructura nueva. La parte pura
// (autorización, comandos, despacho, sesión) se testea sin conexión real.

import { listEntries } from '../db/repositories/entries.js';
import { listProfiles, getProfileById } from './catalog-base.js';
import { getRecommendations } from './recommendations.js';
import { searchResult, pendingSummary, entryStatus } from './search.js';

export const SLASH_COMMANDS = [
  {
    name: 'perfil',
    description: 'Ver o cambiar el perfil activo',
    options: [{ type: 3, name: 'perfil', description: 'Nombre o id del perfil', required: false }],
  },
  {
    name: 'buscar',
    description: 'Buscar una serie en tu colección',
    options: [{ type: 3, name: 'query', description: 'Título a buscar', required: true }],
  },
  { name: 'pendientes', description: 'Series en curso y volúmenes faltantes' },
  {
    name: 'recomendar',
    description: 'Recomendaciones para el perfil activo',
    options: [
      { type: 4, name: 'limite', description: 'Cantidad (1-10)', required: false, min_value: 1, max_value: 10 },
    ],
  },
];

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

function formatEntryLine(entry) {
  const status = entryStatus(entry);
  const describe =
    status.total > 0
      ? status.complete
        ? '✅ Completo'
        : `📖 ${status.quantity}/${status.total} vol. (${status.pending} pendientes)`
      : `📖 ${status.quantity} vol. (en curso)`;
  const meta = [entry.manga?.format?.name, entry.manga?.publisher?.name].filter(Boolean).join(' · ');
  const priority = entry.priority ? '⭐ ' : '';
  return `${priority}*${entry.manga.name}*\n  ${meta}\n  ${describe}`;
}

export function createCommands({ db, getDb } = {}) {
  const resolveDb = getDb ?? (() => db);
  const entriesFor = (profileId) => listEntries(resolveDb(), profileId);

  function requireProfile(session) {
    if (session.profileId == null) throw new Error('Elegí un perfil primero con /perfil.');
    return session.profileId;
  }

  return {
    async perfil({ session, perfil }) {
      const list = listProfiles(resolveDb());
      if (list.length === 0) return 'No hay perfiles creados en MangaCount.';
      if (perfil) {
        const found =
          list.find((p) => p.name.toLowerCase() === String(perfil).toLowerCase()) ??
          list.find((p) => String(p.id) === String(perfil));
        if (!found) return `No existe un perfil "${perfil}".`;
        session.profileId = found.id;
        return `Perfil activo: *${found.name}*.`;
      }
      const lines = list.map((p) => `${p.id === session.profileId ? '▶️' : '•'} ${p.name}`).join('\n');
      return `Perfiles:\n${lines}`;
    },

    async buscar({ session, query }) {
      const profileId = requireProfile(session);
      const { results, suggestions } = searchResult(entriesFor(profileId), query);
      if (results.length === 0) {
        const hint = suggestions.length
          ? `\n¿Quizás quisiste decir?\n${suggestions.map((t) => `   • ${t}`).join('\n')}`
          : '';
        return `❌ No encontré *${query}* en tu colección.${hint}`;
      }
      return `🔍 Resultados para "*${query}*":\n\n${results.map(formatEntryLine).join('\n\n')}`;
    },

    async pendientes({ session }) {
      const profileId = requireProfile(session);
      const summary = pendingSummary(entriesFor(profileId));
      if (summary.count === 0) return '🎉 ¡No tenés nada pendiente! Colección al día.';
      const lines = summary.entries.map((e) => {
        const priority = e.priority ? '⭐ ' : '';
        return `${priority}*${e.manga.name}*: ${e.quantity}/${e.manga.volumes} (faltan ${e.manga.volumes - e.quantity})`;
      });
      return `📋 Pendientes (${summary.count} series, ${summary.totalPending} vols.):\n\n${lines.join('\n')}`;
    },

    async recomendar({ session, limite }) {
      const profileId = requireProfile(session);
      const response = getRecommendations(resolveDb(), profileId, limite ?? 5);
      if (!response?.isConfident || !response?.inferredCountry) {
        return 'No pude inferir tu mercado local con suficiente confianza. Sumá más series con editoriales no ambiguas y volvé a intentar.';
      }
      const items = response.items ?? [];
      if (items.length === 0) {
        return `No encontré recomendaciones elegibles para ${response.inferredCountry}.`;
      }
      const note =
        response.blockedByImportCount > 0
          ? `\nSe excluyeron ${response.blockedByImportCount} opciones de importación.`
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
        `Recomendaciones para *${profile?.name ?? ''}*\n` +
        `País: ${response.inferredCountry}\n` +
        `Proveedor: ${response.provider || 'local'}${note}\n\n${lines}`
      );
    },
    // (futuro) actualizar: ({ session }) => handlers['entry:upsert']({ db }, ...)  ← escritura
  };
}

// Despacho nombre → función; los errores se convierten en respuesta, sin romper el bot.
export async function dispatch(commands, name, args) {
  const fn = commands[name];
  if (!fn) return 'Comando no disponible.';
  try {
    return await fn(args);
  } catch (err) {
    return `⚠️ ${err?.message ?? 'No pude procesar el comando.'}`;
  }
}

// Extrae los argumentos de una interacción como objeto plano (testeable).
export function readInteraction(interaction) {
  return {
    name: interaction.commandName,
    userId: interaction.user?.id,
    guildId: interaction.guildId,
    perfil: interaction.options?.getString?.('perfil') ?? null,
    query: interaction.options?.getString?.('query') ?? null,
    limite: interaction.options?.getInteger?.('limite') ?? null,
  };
}

export async function registerGuildCommands({ token, applicationId, guildId, commands = SLASH_COMMANDS }) {
  const { REST, Routes } = await import('discord.js');
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: commands });
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
} = {}) {
  let client = null;
  let status = 'apagado';
  const session = createSessionStore();
  const commands = createCommands({ getDb, db });
  const load = loadDiscord ?? (() => import('discord.js'));

  const setStatus = (next) => {
    status = next;
    onStatusChange(next);
  };

  async function handleInteraction(interaction) {
    if (!interaction.isChatInputCommand?.()) return;
    const config = getConfig();
    const args = readInteraction(interaction);
    if (!isAuthorized(config, args)) return;
    const reply = await dispatch(commands, args.name, {
      session: session.get(args.userId),
      perfil: args.perfil,
      query: args.query,
      limite: args.limite,
    });
    await interaction.reply(reply);
  }

  function stop() {
    if (client) {
      try {
        client.destroy?.();
      } catch {
        /* ignore */
      }
      client = null;
    }
  }

  async function start() {
    stop();
    const config = getConfig();
    if (!config?.enabled) return setStatus('apagado');
    const token = getToken();
    if (!token) return setStatus('sin token');
    try {
      const { Client, GatewayIntentBits, Events } = await load();
      client = new Client({ intents: [GatewayIntentBits.Guilds] });
      client.on(Events.InteractionCreate, (interaction) => {
        handleInteraction(interaction).catch((err) =>
          logger?.error?.(`interacción de Discord falló: ${err?.message ?? err}`)
        );
      });
      client.once(Events.ClientReady, async (ready) => {
        setStatus('conectado');        try {
          await registerGuildCommands({
            token,
            applicationId: ready.application.id,
            guildId: config.guildId,
          });
        } catch (err) {
          logger?.warn?.(`no se pudieron registrar los comandos: ${err?.message ?? err}`);
        }
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
