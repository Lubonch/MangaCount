// IPC handlers. Each entry is a pure function `(ctx, ...args)` where
// `ctx = { db }`, so it can be tested with `node --test` without Electron.
// `registerHandlers(ipcMain, ctx)` wires them to the real runtime.
// Channels per parity-matrix.md (rows 1-15; recommendation and database come later).

import { listEntries, getEntryById, upsertEntry, updateEntry } from '../db/repositories/entries.js';
import { deleteManga } from '../db/repositories/mangas.js';
import { importTsv, previewTsvImport, exportTsv } from '../services/entries.js';
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
import { getAnilistRecommendations } from '../services/anilist-recommendations.js';
import { dismiss } from '../db/repositories/recommendation-feedback.js';
import { upsertRef } from '../db/repositories/manga-external-refs.js';
import { createManga } from '../db/repositories/mangas.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/i18n/index.js';
import { getTranslator } from '../services/i18n.js';
import { saveProfilePicture } from '../services/files.js';
import { databaseStatistics, nukeLocalData } from '../services/database.js';
import {
  createBackup,
  restoreBackup,
  listBackups,
  cachedBackups,
  DESTINATION_TIMEOUT,
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
  linkLocalCover,
  refreshCover,
  unlinkCover,
  statusCover,
  coverMap,
  autoMatchCover,
  PROVIDER,
} from '../services/covers.js';
import fs from 'node:fs';
import path from 'node:path';

function requireProfileId(profileId, t = (key) => key) {
  if (!Number.isInteger(profileId) || profileId <= 0) {
    throw new Error(t('err.profileIdInvalid'));
  }
}

// A deleted profile (e.g. after the "Nuclear Option", which re-seeds the default
// profile with a new id) leaves the UI with an old id; we validate to give a
// clear message instead of a FOREIGN KEY constraint failed.
function requireProfileExists(db, profileId, t = (key) => key) {
  if (!getProfileById(db, profileId)) {
    throw new Error(t('err.profileNotFound'));
  }
}

// Ensures the profile has an Entry for the manga without overwriting an existing
// one (unlike `upsertEntry`, which overwrites the purchased quantity).
function ensureEntry(db, profileId, mangaId) {
  const exists = listEntries(db, profileId).some((entry) => entry.mangaId === mangaId);
  if (!exists) upsertEntry(db, { mangaId, profileId, quantity: 0 });
}

// Groups formats/publishers used by the collection as {id, name, count}[],
// sorted by name: same shape as EntryController.GetUsedFormats/Publishers.
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
  'manga:create-from-candidate': async ({ db, dataDir }, payload = {}) => {
    const t = getTranslator(dataDir);
    const { candidate, name, volumes, formatId, publisherId, isAdult } = payload ?? {};
    if (!candidate?.id) throw new Error(t('err.candidateInvalid'));
    const title = String(name ?? candidate.title ?? '').trim();
    if (!title) throw new Error(t('err.mangaTitleRequired'));
    if (!formatId || !publisherId) throw new Error(t('err.mangaCatalogRequired'));
    const manga = saveOrUpdateManga(db, {
      id: 0,
      name: title,
      volumes,
      formatId,
      publisherId,
      isAdult,
    });
    let coverUrl = null;
    let coverError = false;
    try {
      const linked = await linkCover(db, dataDir, { mangaId: manga.id, candidate });
      coverUrl = linked?.coverUrl ?? null;
    } catch {
      coverError = true;
    }
    return { manga: getMangaById(db, manga.id) ?? manga, coverUrl, coverError };
  },
  'manga:delete': ({ db, dataDir }, id) => {
    const t = getTranslator(dataDir);
    if (!Number.isInteger(id) || id <= 0) throw new Error(t('err.mangaIdInvalid'));
    return { ok: deleteManga(db, id) };
  },
  'format:list': ({ db }) => formats.list(db),
  'format:create': ({ db }, { name }) => formats.create(db, name),
  'publisher:list': ({ db }) => publishers.list(db),
  'publisher:create': ({ db }, { name }) => publishers.create(db, name),
  // Recommendations: AniList if enabled; if it returns `null` (no resolvable
  // seeds or a total failure) it falls back to the local engine with `provider: 'local'`.
  'recommendation:get': async ({ db, dataDir }, { profileId, limit } = {}) => {
    const prefs = dataDir ? loadResolvedPrefs(dataDir) : resolvePrefs({});
    if (prefs.recommendations.enabled) {
      const anilist = await getAnilistRecommendations(db, profileId, {
        limit: limit ?? prefs.recommendations.limit,
        seenTtlDays: prefs.recommendations.seenTtlDays,
        includeAdult: prefs.showAdultCovers,
      });
      if (anilist) return anilist;
    }
    return getRecommendations(db, profileId, limit);
  },
  'recommendation:dismiss': ({ db, dataDir }, { profileId, provider = PROVIDER, externalId } = {}) => {
    const t = getTranslator(dataDir);
    requireProfileId(profileId, t);
    if (externalId == null || externalId === '') throw new Error(t('err.externalIdRequired'));
    dismiss(db, profileId, provider, externalId);
    return { ok: true };
  },
  'recommendation:own': (
    { db, dataDir },
    { profileId, provider = PROVIDER, externalId, mangaId, title } = {}
  ) => {
    const t = getTranslator(dataDir);
    requireProfileId(profileId, t);
    requireProfileExists(db, profileId, t);
    if (externalId == null || externalId === '') throw new Error(t('err.externalIdRequired'));
    if (mangaId != null) {
      const id = Number.parseInt(mangaId, 10);
      const manga = getMangaById(db, id);
      if (!manga) throw new Error(t('err.mangaIdInvalid'));
      upsertRef(db, { mangaId: id, provider, externalId });
      ensureEntry(db, profileId, id);
      return manga;
    }
    const name = typeof title === 'string' ? title.trim() : '';
    if (!name) throw new Error(t('err.mangaTitleRequired'));
    const manga = createManga(db, { name });
    upsertEntry(db, { mangaId: manga.id, profileId, quantity: 0 });
    upsertRef(db, { mangaId: manga.id, provider, externalId });
    return manga;
  },
  'recommendation:config-get': ({ dataDir }) => loadResolvedPrefs(dataDir).recommendations,
  'recommendation:config-set': ({ dataDir }, config = {}) => {
    const t = getTranslator(dataDir);
    const prefs = resolvePrefs(loadPrefs(dataDir));
    const limit = Number(config.limit ?? prefs.recommendations.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error(t('err.recLimitRange'));
    const seenTtlDays = Number(config.seenTtlDays ?? prefs.recommendations.seenTtlDays);
    if (!Number.isInteger(seenTtlDays) || seenTtlDays < 1 || seenTtlDays > 365) {
      throw new Error(t('err.seenTtlRange'));
    }
    const recommendations = {
      enabled: config.enabled ?? prefs.recommendations.enabled,
      limit,
      seenTtlDays,
    };
    savePrefs(dataDir, { ...prefs, recommendations });
    return recommendations;
  },
  'profile:upload-picture': ({ db, dataDir }, { profileId, originalName, buffer }) =>
    saveProfilePicture(db, dataDir, profileId, {
      originalName,
      buffer: Buffer.from(buffer),
    }),
  'database:statistics': ({ db }) => databaseStatistics(db),
  'database:nuke-local': ({ db }) => nukeLocalData(db),
  'entry:list': ({ db, dataDir }, profileId = null) => {
    const t = getTranslator(dataDir);
    if (profileId != null) requireProfileId(profileId, t);
    return listEntries(db, profileId);
  },
  'entry:get-by-id': ({ db }, id) => getEntryById(db, id),
  'entry:upsert': ({ db, dataDir }, entry) => {
    const t = getTranslator(dataDir);
    requireProfileId(entry?.profileId, t);
    requireProfileExists(db, entry.profileId, t);
    return entry?.id ? updateEntry(db, entry) : upsertEntry(db, entry);
  },
  'entry:import-preview': ({ db, dataDir }, { profileId, tsv } = {}) => {
    const t = getTranslator(dataDir);
    requireProfileId(profileId, t);
    requireProfileExists(db, profileId, t);
    if (typeof tsv !== 'string' || tsv.length === 0) throw new Error(t('err.tsvEmpty'));
    return previewTsvImport(db, tsv, profileId);
  },
  'entry:import': ({ db, dataDir }, { profileId, tsv, decisions } = {}) => {
    const t = getTranslator(dataDir);
    requireProfileId(profileId, t);
    requireProfileExists(db, profileId, t);
    if (typeof tsv !== 'string' || tsv.length === 0) throw new Error(t('err.tsvEmpty'));
    try {
      return importTsv(db, tsv, profileId, Array.isArray(decisions) ? decisions : null);
    } catch (err) {
      if (typeof err?.code === 'string' && err.code.startsWith('err.')) {
        throw new Error(t(err.code));
      }
      throw err;
    }
  },
  'entry:export': ({ db, dataDir }, profileId) => {
    const t = getTranslator(dataDir);
    requireProfileId(profileId, t);
    return exportTsv(db, profileId);
  },
  'entry:used-formats': ({ db }, profileId = null) => usedCatalog(listEntries(db, profileId), (e) => e.manga?.format),
  'entry:used-publishers': ({ db }, profileId = null) => usedCatalog(listEntries(db, profileId), (e) => e.manga?.publisher),

  // Covers + external link (AniList, no key). Only the link is stored; the local
  // manga name is not touched. Adult content follows the preference.
  'cover:search': ({ db, dataDir }, { query } = {}) =>
    searchManga(query, { includeAdult: loadResolvedPrefs(dataDir).showAdultCovers }),
  'cover:link': ({ db, dataDir }, { mangaId, candidate } = {}) =>
    linkCover(db, dataDir, { mangaId, candidate }),
  'cover:local': ({ db, dataDir, localFileGrants }, { mangaId, sourcePath } = {}) => {
    const t = getTranslator(dataDir);
    if (!localFileGrants?.consume(sourcePath)) {
      throw new Error(t('err.sourceNotAuthorized'));
    }
    return linkLocalCover(db, dataDir, { mangaId, sourcePath });
  },
  'cover:fetch': ({ db, dataDir }, { mangaId, coverUrl } = {}) =>
    refreshCover(db, dataDir, { mangaId, coverUrl }),
  'cover:unlink': ({ db, dataDir }, mangaId) => unlinkCover(db, dataDir, mangaId),
  'cover:status': ({ db }, mangaId) => statusCover(db, mangaId),
  'cover:all': ({ db }) => coverMap(db),
  'cover:auto': ({ db, dataDir }, mangaId) =>
    autoMatchCover(db, dataDir, mangaId, {
      includeAdult: loadResolvedPrefs(dataDir).showAdultCovers,
    }),

  'backup:config-get': ({ dataDir }) => loadResolvedPrefs(dataDir).backup,
  'backup:config-set': ({ dataDir }, config = {}) => {
    const prefs = resolvePrefs(loadPrefs(dataDir));
    const backup = {
      ...prefs.backup,
      ...config,
      triggers: { ...prefs.backup.triggers, ...(config.triggers ?? {}) },
    };
    const errors = validateBackupConfig(backup, getTranslator(dataDir));
    if (errors.length) throw new Error(errors.join(' '));
    savePrefs(dataDir, { ...prefs, backup });
    return backup;
  },
  'backup:list': async ({ dataDir }) => {
    const { backup } = loadResolvedPrefs(dataDir);
    if (!backup.destinationDir) return { backups: [], status: 'unset' };
    try {
      return { backups: await listBackups(backup.destinationDir), status: 'ok' };
    } catch (err) {
      if (err?.code === DESTINATION_TIMEOUT) {
        return { backups: cachedBackups(backup.destinationDir), status: 'unresponsive' };
      }
      throw err;
    }
  },
  'backup:create': async (ctx, destinationDir) => {
    const { db, dataDir, logger } = ctx;
    const prefs = resolvePrefs(loadPrefs(dataDir));
    const dest = destinationDir ?? prefs.backup.destinationDir;
    if (!dest) throw new Error(getTranslator(dataDir)('err.backupNoDestination'));
    const at = new Date().toISOString();
    try {
      const result = await createBackup(db, dataDir, dest);
      await pruneBackups(dest, DEFAULT_KEEP);
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
    bot.pendingLimitEnabled = bot.pendingLimitEnabled !== false;
    const pendingLimit = Number(bot.pendingLimit);
    if (!Number.isInteger(pendingLimit) || pendingLimit < 1 || pendingLimit > 500) {
      throw new Error(getTranslator(ctx.dataDir)('err.pendingLimitRange'));
    }
    bot.pendingLimit = pendingLimit;
    const confirmTtlMinutes = Number(bot.confirmTtlMinutes);
    if (!Number.isInteger(confirmTtlMinutes) || confirmTtlMinutes < 1 || confirmTtlMinutes > 60) {
      throw new Error(getTranslator(ctx.dataDir)('err.confirmTtlRange'));
    }
    bot.confirmTtlMinutes = confirmTtlMinutes;
    const recommendLimit = Number(bot.recommendLimit);
    if (!Number.isInteger(recommendLimit) || recommendLimit < 1 || recommendLimit > 10) {
      throw new Error(getTranslator(ctx.dataDir)('err.recommendLimitRange'));
    }
    bot.recommendLimit = recommendLimit;
    bot.ephemeralReplies = bot.ephemeralReplies === true;
    savePrefs(ctx.dataDir, { ...prefs, bot });
    try {
      await ctx.bot?.restart?.();
    } catch (err) {
      ctx.logger?.warn?.(`el bot no pudo reiniciarse: ${err?.message ?? err}`);
    }
    return bot;
  },
  'bot:set-token': async (ctx, token) => {
    if (typeof token !== 'string' || token.trim().length === 0) throw new Error(getTranslator(ctx.dataDir)('err.tokenEmpty'));
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

  'bot:autostart-get': (ctx) => ({ enabled: !!ctx.autostart?.get?.() }),
  'bot:autostart-set': (ctx, enabled) => ({ enabled: !!ctx.autostart?.set?.(!!enabled) }),

  'app:config-get': ({ dataDir }) => {
    const prefs = loadResolvedPrefs(dataDir);
    return {
      language: prefs.language,
      startInTray: prefs.startInTray,
      updateCheck: prefs.updateCheck,
      diagnosticsCopy: prefs.diagnosticsCopy,
      showAdultCovers: prefs.showAdultCovers,
    };
  },
  'app:config-set': ({ dataDir, autostart }, config = {}) => {
    const prefs = resolvePrefs(loadPrefs(dataDir));
    if (config.language != null && !SUPPORTED_LANGUAGES.includes(config.language)) {
      throw new Error(getTranslator(dataDir)('err.languageUnsupported', { language: config.language }));
    }
    const next = {
      ...prefs,
      language: config.language ?? prefs.language,
      startInTray: config.startInTray ?? prefs.startInTray,
      updateCheck: config.updateCheck ?? prefs.updateCheck,
      diagnosticsCopy: config.diagnosticsCopy ?? prefs.diagnosticsCopy,
      showAdultCovers: config.showAdultCovers ?? prefs.showAdultCovers,
    };
    savePrefs(dataDir, next);
  // If "Start in tray" changed and autostart is active, rewrite the entry so it
  // starts hidden (or not) according to the preference.
    if (autostart?.get?.()) autostart.set(true);
    return {
      language: next.language,
      startInTray: next.startInTray,
      updateCheck: next.updateCheck,
      diagnosticsCopy: next.diagnosticsCopy,
      showAdultCovers: next.showAdultCovers,
    };
  },

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
  'update:check': (ctx) => ctx.update.check(),
  'update:get-state': (ctx) => ctx.update.state(),
  'update:download': (ctx) => ctx.update.download(),
  'update:install': (ctx) => ctx.update.install(),

  'dialog:pick-directory': async (ctx) =>
    ctx.dialog?.pickDirectory ? ctx.dialog.pickDirectory() : null,
  'dialog:pick-file': async (ctx, filters) => {
    if (!ctx.dialog?.pickFile) return null;
    const picked = await ctx.dialog.pickFile(filters);
    if (picked) ctx.localFileGrants?.grant(picked);
    return picked;
  },
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
