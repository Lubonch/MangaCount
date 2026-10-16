// Handlers IPC. Cada entrada es una función pura `(ctx, ...args)` donde
// `ctx = { db }`, para poder testearla con `node --test` sin Electron.
// `registerHandlers(ipcMain, ctx)` las conecta al runtime real.
// Canales según parity-matrix.md (filas 1-15; recommendation y database llegan después).

import { listEntries, getEntryById, upsertEntry, updateEntry } from '../db/repositories/entries.js';
import { deleteManga } from '../db/repositories/mangas.js';
import { importTsv, exportTsv } from '../services/entries.js';
import {
  saveOrUpdateProfile,
  saveOrUpdateManga,
  listProfiles,
  getProfileById,
  deleteProfile,
  listMangas,
  getMangaById,
} from '../services/catalog-base.js';
import { formats, publishers } from '../db/repositories/catalogs.js';
import { getRecommendations } from '../services/recommendations.js';
import { saveProfilePicture } from '../services/files.js';
import { databaseStatistics, nukeLocalData } from '../services/database.js';
import {
  createBackup,
  restoreBackup,
  listBackups,
  pruneBackups,
  DEFAULT_KEEP,
} from '../services/backup.js';
import {
  loadPrefs,
  savePrefs,
  resolvePrefs,
  loadResolvedPrefs,
  validateBackupConfig,
} from '../services/prefs.js';
import { buildDiagnostics } from '../services/diagnostics.js';
import {
  searchManga,
  linkCover,
  refreshCover,
  unlinkCover,
  statusCover,
  coverMap,
  autoMatchCover,
} from '../services/covers.js';
import fs from 'node:fs';
import path from 'node:path';

function requireProfileId(profileId) {
  if (!Number.isInteger(profileId) || profileId <= 0) {
    throw new Error('profileId inválido');
  }
}

// Un perfil borrado (p. ej. tras la "Nuclear Option", que re-siembra el perfil
// por defecto con un id nuevo) deja la UI con un id viejo; validamos para dar un
// mensaje claro en vez de un FOREIGN KEY constraint failed.
function requireProfileExists(db, profileId) {
  if (!getProfileById(db, profileId)) {
    throw new Error('Perfil no encontrado. Volvé a elegir un perfil (la base pudo reiniciarse).');
  }
}

// Agrupa formatos/editoriales usados por la colección como {id, name, count}[],
// ordenados por nombre: misma forma que EntryController.GetUsedFormats/Publishers.
function usedCatalog(entries, pick) {
  const byId = new Map();
  for (const entry of entries) {
    const item = pick(entry);
    if (!item) continue;
    const current = byId.get(item.id) ?? { id: item.id, name: item.name, count: 0 };
    current.count += 1;
    byId.set(item.id, current);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const handlers = {
  'profile:list': ({ db }) => listProfiles(db),
  'profile:get': ({ db }, id) => getProfileById(db, id),
  'profile:upsert': ({ db }, profile) => saveOrUpdateProfile(db, profile),
  'profile:delete': ({ db }, id) => {
    deleteProfile(db, id);
    return { ok: true };
  },
  'manga:list': ({ db }) => listMangas(db),
  'manga:get': ({ db }, id) => getMangaById(db, id),
  'manga:upsert': ({ db }, manga) => saveOrUpdateManga(db, manga),
  'manga:delete': ({ db }, id) => {
    if (!Number.isInteger(id) || id <= 0) throw new Error('mangaId inválido');
    return { ok: deleteManga(db, id) };
  },
  'format:list': ({ db }) => formats.list(db),
  'format:create': ({ db }, { name }) => formats.create(db, name),
  'publisher:list': ({ db }) => publishers.list(db),
  'publisher:create': ({ db }, { name }) => publishers.create(db, name),
  'recommendation:get': ({ db }, { profileId, limit } = {}) =>
    getRecommendations(db, profileId, limit),
  'profile:upload-picture': ({ db, dataDir }, { profileId, originalName, buffer }) =>
    saveProfilePicture(db, dataDir, profileId, {
      originalName,
      buffer: Buffer.from(buffer),
    }),
  'database:statistics': ({ db }) => databaseStatistics(db),
  'database:nuke-local': ({ db }) => nukeLocalData(db),
  'entry:list': ({ db }, profileId = null) => {
    if (profileId != null) requireProfileId(profileId);
    return listEntries(db, profileId);
  },
  'entry:get-by-id': ({ db }, id) => getEntryById(db, id),
  'entry:upsert': ({ db }, entry) => {
    requireProfileId(entry?.profileId);
    requireProfileExists(db, entry.profileId);
    return entry?.id ? updateEntry(db, entry) : upsertEntry(db, entry);
  },
  'entry:import': ({ db }, { profileId, tsv }) => {
    requireProfileId(profileId);
    requireProfileExists(db, profileId);
    if (typeof tsv !== 'string' || tsv.length === 0) throw new Error('TSV vacío');
    return importTsv(db, tsv, profileId);
  },
  'entry:export': ({ db }, profileId) => {
    requireProfileId(profileId);
    return exportTsv(db, profileId);
  },
  'entry:used-formats': ({ db }, profileId = null) => usedCatalog(listEntries(db, profileId), (e) => e.manga?.format),
  'entry:used-publishers': ({ db }, profileId = null) => usedCatalog(listEntries(db, profileId), (e) => e.manga?.publisher),

  // Portadas + vínculo externo (AniList, sin key). Guarda solo el vínculo; el
  // nombre local del manga no se toca.
  'cover:search': ({ db }, { query } = {}) => searchManga(query),
  'cover:link': ({ db, dataDir }, { mangaId, candidate } = {}) =>
    linkCover(db, dataDir, { mangaId, candidate }),
  'cover:fetch': ({ db, dataDir }, { mangaId, coverUrl } = {}) =>
    refreshCover(db, dataDir, { mangaId, coverUrl }),
  'cover:unlink': ({ db, dataDir }, mangaId) => unlinkCover(db, dataDir, mangaId),
  'cover:status': ({ db }, mangaId) => statusCover(db, mangaId),
  'cover:all': ({ db }) => coverMap(db),
  'cover:auto': ({ db, dataDir }, mangaId) => autoMatchCover(db, dataDir, mangaId),

  // Backup y restore del sistema.
  'backup:config-get': ({ dataDir }) => loadResolvedPrefs(dataDir).backup,
  'backup:config-set': ({ dataDir }, config = {}) => {
    const prefs = resolvePrefs(loadPrefs(dataDir));
    const backup = {
      ...prefs.backup,
      ...config,
      triggers: { ...prefs.backup.triggers, ...(config.triggers ?? {}) },
    };
    const errors = validateBackupConfig(backup);
    if (errors.length) throw new Error(errors.join(' '));
    savePrefs(dataDir, { ...prefs, backup });
    return backup;
  },
  'backup:list': ({ dataDir }) => {
    const { backup } = loadResolvedPrefs(dataDir);
    return backup.destinationDir ? listBackups(backup.destinationDir) : [];
  },
  'backup:create': async (ctx, destinationDir) => {
    const { db, dataDir, logger } = ctx;
    const prefs = resolvePrefs(loadPrefs(dataDir));
    const dest = destinationDir ?? prefs.backup.destinationDir;
    if (!dest) throw new Error('No hay destino de backup configurado.');
    const at = new Date().toISOString();
    try {
      const result = await createBackup(db, dataDir, dest);
      pruneBackups(dest, DEFAULT_KEEP);
      const lastBackupStatus = { ok: true, at };
      savePrefs(dataDir, {
        ...prefs,
        backup: { ...prefs.backup, lastBackupAt: at, lastBackupStatus },
      });
      return { ...result, lastBackupStatus };
    } catch (err) {
      const lastBackupStatus = { ok: false, at, error: err?.message ?? String(err) };
      savePrefs(dataDir, { ...prefs, backup: { ...prefs.backup, lastBackupStatus } });
      logger?.error?.(`backup falló: ${lastBackupStatus.error}`);
      throw err;
    }
  },
  'backup:restore': async (ctx, zipPath) => {
    const { db, dataDir, logger } = ctx;
    const result = await restoreBackup(db, dataDir, zipPath, { logger });
    ctx.db = result.db;
    return { restored: true, safetyBackup: result.safetyBackup, manifest: result.manifest };
  },

  // Config del bot de Discord.
  'bot:config-get': (ctx) => {
    const { bot: config } = loadResolvedPrefs(ctx.dataDir);
    return {
      ...config,
      hasToken: !!ctx.secrets?.hasToken?.(),
      secretsAvailable: !!ctx.secrets?.available,
      status: ctx.bot?.status?.() ?? 'apagado',
    };
  },
  'bot:config-set': async (ctx, config = {}) => {
    const prefs = resolvePrefs(loadPrefs(ctx.dataDir));
    const bot = { ...prefs.bot, ...config };
    savePrefs(ctx.dataDir, { ...prefs, bot });
    try {
      await ctx.bot?.restart?.();
    } catch (err) {
      ctx.logger?.warn?.(`el bot no pudo reiniciarse: ${err?.message ?? err}`);
    }
    return bot;
  },
  'bot:set-token': async (ctx, token) => {
    if (typeof token !== 'string' || token.trim().length === 0) throw new Error('Token vacío.');
    ctx.secrets?.saveToken(token.trim());
    const prefs = resolvePrefs(loadPrefs(ctx.dataDir));
    try {
      await ctx.bot?.restart?.(prefs.bot);
    } catch (err) {
      ctx.logger?.warn?.(`el bot no pudo reiniciarse: ${err?.message ?? err}`);
    }
    return { saved: true, secretsAvailable: !!ctx.secrets?.available };
  },
  'bot:status': (ctx) => ({ status: ctx.bot?.status?.() ?? 'apagado' }),

  // Autostart por sistema operativo.
  'bot:autostart-get': (ctx) => ({ enabled: !!ctx.autostart?.get?.() }),
  'bot:autostart-set': (ctx, enabled) => ({ enabled: !!ctx.autostart?.set?.(!!enabled) }),

  // Config general de la app (arranque en bandeja, chequeo de updates).
  'app:config-get': ({ dataDir }) => {
    const prefs = loadResolvedPrefs(dataDir);
    return {
      startInTray: prefs.startInTray,
      updateCheck: prefs.updateCheck,
      diagnosticsCopy: prefs.diagnosticsCopy,
    };
  },
  'app:config-set': ({ dataDir, autostart }, config = {}) => {
    const prefs = resolvePrefs(loadPrefs(dataDir));
    const next = {
      ...prefs,
      startInTray: config.startInTray ?? prefs.startInTray,
      updateCheck: config.updateCheck ?? prefs.updateCheck,
      diagnosticsCopy: config.diagnosticsCopy ?? prefs.diagnosticsCopy,
    };
    savePrefs(dataDir, next);
    // Si cambió "Arranque en bandeja" y el autostart está activo, reescribe la
    // entrada para que arranque (o no) oculto según la preferencia.
    if (autostart?.get?.()) autostart.set(true);
    return {
      startInTray: next.startInTray,
      updateCheck: next.updateCheck,
      diagnosticsCopy: next.diagnosticsCopy,
    };
  },

  // Diagnóstico: copiar estado+log o abrir la carpeta de logs.
  'diagnostics:copy': ({ dataDir, app, clipboard }, maxLines = 100) => {
    const logPath = path.join(dataDir, 'logs', 'app.txt');
    const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
    const text = buildDiagnostics({
      version: app?.getVersion?.() ?? null,
      platform: process.platform,
      arch: process.arch,
      locale: app?.getLocale?.() ?? null,
      logText,
      maxLines,
    });
    clipboard?.writeText?.(text);
    return { copied: true, preview: text.slice(0, 600) };
  },
  'diagnostics:open-logs': ({ dataDir, shell }) => {
    shell?.openPath?.(path.join(dataDir, 'logs'));
    return { opened: true };
  },

  // Errores del renderer → log del main.
  'log:error': ({ logger }, payload = {}) => {
    const scope = payload?.scope ? `/${payload.scope}` : '';
    const where = payload?.component ? ` (${payload.component})` : '';
    const stack = payload?.stack ? `\n${payload.stack}` : '';
    logger?.error?.(`renderer${scope}${where}: ${payload?.message ?? ''}${stack}`);
    return { ok: true };
  },
  'app:info': ({ app }) => ({
    version: app?.getVersion?.() ?? null,
    platform: process.platform,
    arch: process.arch,
    packaged: !!app?.isPackaged,
  }),
  // Chequeo y aplicación de actualizaciones (controller en ctx.update).
  'update:check': (ctx) => ctx.update.check(),
  'update:get-state': (ctx) => ctx.update.state(),
  'update:download': (ctx) => ctx.update.download(),
  'update:install': (ctx) => ctx.update.install(),

  // Diálogos nativos de archivo.
  'dialog:pick-directory': async (ctx) =>
    ctx.dialog?.pickDirectory ? ctx.dialog.pickDirectory() : null,
  'dialog:pick-file': async (ctx, filters) =>
    ctx.dialog?.pickFile ? ctx.dialog.pickFile(filters) : null,
};

export function channelNames() {
  return Object.keys(handlers);
}

export function registerHandlers(ipcMain, ctx) {
  for (const [channel, fn] of Object.entries(handlers)) {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        return await fn(ctx, ...args);
      } catch (err) {
        ctx.logger?.error?.(`IPC ${channel} falló: ${err?.message ?? err}`);
        throw err;
      }
    });
  }
}
