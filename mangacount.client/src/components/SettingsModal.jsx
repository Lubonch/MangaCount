import { useEffect, useRef, useState } from 'react';
import './SettingsModal.css';
import NukeDataModal from './NukeDataModal';
import { useI18n } from '../contexts/I18nContext';
import {
  backupConfigGet,
  backupConfigSet,
  backupList,
  backupCreate,
  backupRestore,
  botConfigGet,
  botConfigSet,
  botSetToken,
  botAutostartGet,
  botAutostartSet,
  appConfigGet,
  appConfigSet,
  appInfo,
  updateCheck as checkUpdatesRequest,
  updateDownload as downloadUpdateRequest,
  updateInstall as installUpdateRequest,
  onUpdateState,
  diagnosticsCopy as copyDiagnosticsRequest,
  openLogs as openLogsRequest,
  pickDirectory,
  pickFile,
  entryExport,
  mangaList,
  coverAll,
  coverAuto,
} from '../api/localAdapter.js';

const EMPTY_BACKUP = {
  enabled: false,
  destinationDir: null,
  intervalMinutes: 1440,
  triggers: { onStartup: true, whileRunning: false },
  lastBackupAt: null,
  lastBackupStatus: null,
};

const formatClock = (totalSeconds) =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

function downloadTsv(text, filename) {  if (typeof URL?.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/tab-separated-values' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const SettingsModal = ({ isOpen, onClose, selectedProfile, onImportSuccess, onDataReset }) => {
  const { language, setLanguage, t } = useI18n();
  const [general, setGeneral] = useState({ startInTray: true, autostart: false, updateCheck: true, diagnosticsCopy: true, showAdultCovers: false });
  const [backup, setBackup] = useState(EMPTY_BACKUP);
  const [backups, setBackups] = useState([]);
  const [backupListStatus, setBackupListStatus] = useState('idle');
  const [bot, setBot] = useState({ enabled: false, guildId: '', allowedUserIds: [], pendingLimitEnabled: true, pendingLimit: 20, ephemeralReplies: false, confirmTtlMinutes: 5, recommendLimit: 5, status: 'apagado', hasToken: false });
  const [token, setToken] = useState('');
  const [generalMessage, setGeneralMessage] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [botMessage, setBotMessage] = useState('');
  const [backupError, setBackupError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNuke, setShowNuke] = useState(false);
  const [version, setVersion] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [update, setUpdate] = useState(null);
  const [diagnosticsMessage, setDiagnosticsMessage] = useState('');
  const [coverBulk, setCoverBulk] = useState({ running: false, done: 0, total: 0, message: '', cooldownLeft: 0 });
  const [bulkBatchSize, setBulkBatchSize] = useState(20);
  const [bulkCooldownMin, setBulkCooldownMin] = useState(5);
  const coverBulkCancelRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [appConfig, backupConfig, botConfig, autostart, appMeta] = await Promise.all([
          appConfigGet(),
          backupConfigGet(),
          botConfigGet(),
          botAutostartGet(),
          appInfo(),
        ]);
        if (cancelled) return;
        setVersion(appMeta?.version ?? null);
        setGeneral({
          startInTray: !!appConfig?.startInTray,
          autostart: !!autostart?.enabled,
          updateCheck: appConfig?.updateCheck !== false,
          diagnosticsCopy: appConfig?.diagnosticsCopy !== false,
          showAdultCovers: !!appConfig?.showAdultCovers,
        });
        setBackup({
          ...EMPTY_BACKUP,
          ...backupConfig,
          triggers: { ...EMPTY_BACKUP.triggers, ...(backupConfig?.triggers ?? {}) },
        });
        setBackups([]);
        setBackupListStatus('idle');
        setBot((b) => ({ ...b, ...botConfig }));
      } catch (err) {
        if (!cancelled) setGeneralMessage(t('settings.loadFailed', { error: err.message }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Estado de update en vivo (push del main) mientras el modal está abierto.
  useEffect(() => {
    if (!isOpen) return undefined;
    const off = onUpdateState((state) => setUpdate(state));
    return () => off?.();
  }, [isOpen]);

  if (!isOpen) return null;

  const backupInvalid =
    backup.enabled && (!backup.destinationDir || (!backup.triggers.onStartup && !backup.triggers.whileRunning));

  const changeLanguage = async (next) => {
    setLanguage(next);
    try {
      await appConfigSet({ language: next });
    } catch (err) {
      setGeneralMessage(err.message);
    }
  };

  const toggleGeneral = async (key, value) => {
    const next = { ...general, [key]: value };
    setGeneral(next);
    setGeneralMessage('');
    try {
      if (key === 'startInTray') await appConfigSet({ startInTray: value });
      else if (key === 'updateCheck') await appConfigSet({ updateCheck: value });
      else if (key === 'diagnosticsCopy') await appConfigSet({ diagnosticsCopy: value });
      else if (key === 'showAdultCovers') await appConfigSet({ showAdultCovers: value });
      else await botAutostartSet(value);
      setGeneralMessage(t('settings.saved'));
    } catch (err) {
      setGeneralMessage(t('settings.saveFailed', { error: err.message }));
    }
  };

  const chooseDestination = async () => {
    const dir = await pickDirectory();
    if (dir) setBackup((b) => ({ ...b, destinationDir: dir }));
  };

  const saveBackup = async () => {
    setBackupError('');
    setBackupMessage('');
    if (backupInvalid) {
      setBackupError(t('settings.backupNeedsConfig'));
      return;
    }
    try {
      const saved = await backupConfigSet(backup);
      setBackup({ ...EMPTY_BACKUP, ...saved, triggers: { ...EMPTY_BACKUP.triggers, ...(saved.triggers ?? {}) } });
      setBackupMessage(t('settings.backupSaved'));
    } catch (err) {
      setBackupError(err.message);
    }
  };

  // La lista de backups se pide bajo demanda (no al abrir Settings): el destino
  // puede ser un montaje de red lento.
  const loadBackups = async () => {
    setBackupListStatus('loading');
    try {
      const res = await backupList();
      const status = res?.status ?? 'ok';
      // Si el destino no responde, se conserva la última lista conocida.
      setBackups((prev) => (status === 'unresponsive' ? prev : res?.backups ?? []));
      setBackupListStatus(status);
    } catch {
      setBackupListStatus('error');
    }
  };

  const runBackupNow = async () => {
    setBusy(true);
    setBackupError('');
    try {
      await backupCreate(backup.destinationDir ?? undefined);
      const res = await backupList();
      setBackups(res?.backups ?? []);
      setBackupListStatus(res?.status ?? 'ok');
      setBackup(await backupConfigGet());
      setBackupMessage(t('settings.backupCreated'));
    } catch (err) {
      setBackupError(t('settings.backupFailed', { error: err.message }));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    const zipPath = await pickFile();
    if (!zipPath) return;
    if (!window.confirm('Restaurar reemplazará TODA la colección actual. ¿Continuar?')) return;
    setBusy(true);
    setBackupError('');
    try {
      const result = await backupRestore(zipPath);
      setBackupMessage(t('settings.restoreDone', { path: result?.safetyBackup ?? '—' }));
      onImportSuccess?.();
    } catch (err) {
      setBackupError(t('settings.restoreFailed', { error: err.message }));
    } finally {
      setBusy(false);
    }
  };

  // El estado del bot pasa a 'conectando' y luego 'conectado' de forma asíncrona;
  // reconsultamos unas veces para reflejarlo sin recargar la pantalla.
  const pollBotStatus = (tries = 4) => {
    let n = 0;
    const run = async () => {
      try {
        const data = await botConfigGet();
        setBot((b) => ({ ...b, ...data }));
      } catch {
        /* ignore */
      }
      n += 1;
      if (n < tries) setTimeout(run, 1200);
    };
    run();
  };

  const saveBotToken = async () => {
    setBotMessage('');
    try {
      await botSetToken(token);
      setToken('');
      setBotMessage(t('settings.tokenSaved'));
      pollBotStatus();
    } catch (err) {
      setBotMessage(t('settings.tokenSaveFailed', { error: err.message }));
    }
  };

  const saveBotConfig = async () => {
    setBotMessage('');
    try {
      await botConfigSet({
        enabled: bot.enabled,
        guildId: bot.guildId || null,
        allowedUserIds: bot.allowedUserIds,
        pendingLimitEnabled: bot.pendingLimitEnabled !== false,
        pendingLimit: Number(bot.pendingLimit) || 20,
        ephemeralReplies: bot.ephemeralReplies === true,
        confirmTtlMinutes: Number(bot.confirmTtlMinutes) || 5,
        recommendLimit: Number(bot.recommendLimit) || 5,
      });
      setBotMessage(t('settings.botSaved'));
      pollBotStatus();
    } catch (err) {
      setBotMessage(t('settings.saveFailed', { error: err.message }));
    }
  };

  const runUpdateCheck = async () => {
    setCheckingUpdate(true);
    setUpdateMessage('');
    try {
      const result = await checkUpdatesRequest();
      setUpdate(result);
      setUpdateMessage(
        result?.hasUpdate
          ? t('settings.updateAvailable', { version: result.latest })
          : t('settings.upToDate')
      );
    } catch (err) {
      setUpdateMessage(t('settings.updateCheckFailed', { error: err.message }));
    } finally {
      setCheckingUpdate(false);
    }
  };

  const downloadUpdate = async () => {
    setUpdateMessage('');
    try {
      await downloadUpdateRequest();
    } catch (err) {
      setUpdateMessage(t('settings.updateDownloadFailed', { error: err.message }));
    }
  };

  const installUpdate = () => {
    installUpdateRequest().catch(() => {});
  };

  const copyDiagnostics = async () => {
    setDiagnosticsMessage('');
    try {
      await copyDiagnosticsRequest();
      setDiagnosticsMessage('Copiado ✓');
    } catch (err) {
      setDiagnosticsMessage(`No se pudo copiar: ${err.message}`);
    }
  };

  const openLogsFolder = async () => {
    setDiagnosticsMessage('');
    try {
      await openLogsRequest();
    } catch (err) {
      setDiagnosticsMessage(`No se pudo abrir: ${err.message}`);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.tsv')) {
      setImportMessage(t('settings.importNoFile'));
      return;
    }
    setIsImporting(true);
    setImportMessage(t('settings.importRunning'));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/entry/import/${selectedProfile.id}`, { method: 'POST', body: formData });
      if (response.ok) {
        setImportMessage(t('settings.importOk'));
        onImportSuccess?.();
        event.target.value = '';
      } else {
        const error = await response.json();
        setImportMessage(`Falló la importación: ${error.message || 'error desconocido'}`);
      }
    } catch (error) {
      setImportMessage('Falló la importación: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const tsv = await entryExport(selectedProfile.id);
      downloadTsv(tsv, `mangacount-${selectedProfile.id}.tsv`);
      setImportMessage(t('settings.exportOk'));
    } catch (error) {
      setImportMessage(t('settings.exportFailed', { error: error.message }));
    }
  };

  const lastStatus = backup.lastBackupStatus;

  // Bulk de portadas faltantes: de a lotes para no acercarse al rate limit de
  // AniList (~30 req/min). Dentro del lote espacia ~2.2s; cada N mangas hace una
  // pausa larga (configurable). Se detiene ante un error (incluido 429).
  const COVER_BULK_INTRA_DELAY_MS = 2200;

  const runCoverBulk = async () => {
    const batchSize = Math.min(Math.max(Number.parseInt(bulkBatchSize, 10) || 20, 1), 200);
    const cooldownSec =
      Math.min(Math.max(Number.parseInt(bulkCooldownMin, 10) || 0, 0), 60) * 60;

    setCoverBulk({ running: true, done: 0, total: 0, message: t('settings.bulkSearching'), cooldownLeft: 0 });
    let mangas;
    let covers;
    try {
      [mangas, covers] = await Promise.all([mangaList(), coverAll()]);
    } catch {
      setCoverBulk({ running: false, done: 0, total: 0, message: t('settings.bulkReadFailed'), cooldownLeft: 0 });
      return;
    }
    const missing = mangas.filter((manga) => !covers[manga.id]?.url);
    if (missing.length === 0) {
      setCoverBulk({ running: false, done: 0, total: 0, message: t('settings.bulkAllLinked'), cooldownLeft: 0 });
      return;
    }

    coverBulkCancelRef.current = false;
    setCoverBulk({ running: true, done: 0, total: missing.length, message: '', cooldownLeft: 0 });
    let done = 0;
    let linked = 0;

    for (let i = 0; i < missing.length; i += 1) {
      if (coverBulkCancelRef.current) break;
      try {
        const url = await coverAuto(missing[i].id);
        if (url) linked += 1;
      } catch {
        setCoverBulk({
          running: false,
          done,
          total: missing.length,
          message: `AniList limitó las peticiones (o error de red). Nuevas: ${linked}. Reintentá en un minuto.`,
          cooldownLeft: 0,
        });
        onImportSuccess?.();
        return;
      }
      done += 1;
      setCoverBulk({ running: true, done, total: missing.length, message: t('settings.bulkProgress', { count: linked }), cooldownLeft: 0 });

      if (i === missing.length - 1) break; // terminó: sin espera final

      if (done % batchSize === 0 && cooldownSec > 0) {
        // Pausa larga entre lotes, con cuenta regresiva cancelable.
        for (let s = cooldownSec; s > 0; s -= 1) {
          if (coverBulkCancelRef.current) break;
          setCoverBulk((prev) => ({
            ...prev,
            running: true,
            cooldownLeft: s,
            message: t('settings.bulkBatchDone', { size: batchSize }),
          }));
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, COVER_BULK_INTRA_DELAY_MS));
      }
    }
    setCoverBulk({
      running: false,
      done,
      total: missing.length,
      message: t('settings.bulkDone', { count: linked, stopped: coverBulkCancelRef.current ? t('settings.bulkStopped') : '' }),
      cooldownLeft: 0,
    });
    onImportSuccess?.();
  };

  return (
    <div className="modal-overlay settings-modal-overlay">
      <div className="modal-content settings-modal-content">
        <div className="modal-header">
          <h2>{t('settings.header')}</h2>
          <button className="close-button" onClick={onClose} aria-label="Close settings">&times;</button>
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h3>{t('settings.general')}</h3>

            <label className="settings-field">
              {t('language.label')}
              <select
                aria-label={t('language.label')}
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                <option value="en">{t('language.en')}</option>
                <option value="es">{t('language.es')}</option>
              </select>
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.startInTray}
                onChange={(e) => toggleGeneral('startInTray', e.target.checked)}
              />
              {t('settings.startInTray')}
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.autostart}
                onChange={(e) => toggleGeneral('autostart', e.target.checked)}
              />
              {t('settings.autostart')}
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.updateCheck}
                onChange={(e) => toggleGeneral('updateCheck', e.target.checked)}
              />
              {t('settings.updateCheck')}
            </label>
            <p className="settings-hint">{t('settings.currentVersion', { version: version ?? '—' })}</p>
            <div className="settings-actions">
              {update?.status === 'downloaded' ? (
                <button type="button" aria-label={t('settings.ariaRestartUpdate')} onClick={installUpdate}>
                  {t('settings.restartToUpdate')}
                </button>
              ) : update?.status === 'downloading' ? (
                <button type="button" disabled>{t('settings.downloading', { percent: update.percent })}</button>
              ) : update?.hasUpdate && update?.mode === 'auto' ? (
                <button type="button" aria-label={t('settings.ariaDownloadUpdate')} onClick={downloadUpdate}>
                  {t('settings.downloadVersion', { version: update.latest })}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={t('settings.ariaCheckUpdate')}
                  onClick={runUpdateCheck}
                  disabled={checkingUpdate}
                >
                  {t(checkingUpdate ? 'settings.checking' : 'settings.checkUpdate')}
                </button>
              )}
              {update?.hasUpdate && update?.mode !== 'auto' && update?.url && (
                <a className="settings-link" href={update.url} target="_blank" rel="noreferrer">
                  {t('settings.downloadVersion', { version: update.latest })}
                </a>
              )}
            </div>
            {updateMessage && <p className="settings-message">{updateMessage}</p>}
            {generalMessage && <p className="settings-message">{generalMessage}</p>}
          </section>

          <section className="settings-section">
            <h3>{t('settings.backup')}</h3>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={backup.enabled}
                onChange={(e) => setBackup((b) => ({ ...b, enabled: e.target.checked }))}
              />
              {t('settings.backupEnabled')}
            </label>

            <label className="settings-field">
              {t('settings.destination')}
              <span className="settings-inline">
                <input type="text" value={backup.destinationDir ?? ''} readOnly placeholder={t('settings.destinationPlaceholder')} />
                <button type="button" onClick={chooseDestination}>{t('settings.choose')}</button>
              </span>
            </label>

            <label className="settings-field">
              {t('settings.interval')}
              <input
                type="number"
                min="1"
                aria-label={t('settings.ariaInterval')}
                value={backup.intervalMinutes}
                onChange={(e) => setBackup((b) => ({ ...b, intervalMinutes: Number(e.target.value) }))}
              />
            </label>

            <div className="settings-triggers">
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={backup.triggers.onStartup}
                  onChange={(e) => setBackup((b) => ({ ...b, triggers: { ...b.triggers, onStartup: e.target.checked } }))}
                />
                {t('settings.onStartup')}
              </label>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={backup.triggers.whileRunning}
                  onChange={(e) => setBackup((b) => ({ ...b, triggers: { ...b.triggers, whileRunning: e.target.checked } }))}
                />
                {t('settings.whileRunning')}
              </label>
            </div>

            <p className="settings-hint">
              {t('settings.backupsCount', { count: backups.length, date: backup.lastBackupAt ?? '—' })}
              {lastStatus && !lastStatus.ok ? t('settings.lastError', { error: lastStatus.error }) : ''}
              {backupListStatus === 'unresponsive' ? t('settings.destinationUnresponsive') : ''}
            </p>

            <div className="settings-actions">
              <button type="button" aria-label={t('settings.ariaSaveBackup')} onClick={saveBackup}>{t('settings.save')}</button>
              <button
                type="button"
                aria-label={t('settings.ariaRefreshBackups')}
                onClick={loadBackups}
                disabled={backupListStatus === 'loading'}
              >
                {t(backupListStatus === 'loading' ? 'settings.refreshing' : 'settings.refresh')}
              </button>
              <button type="button" aria-label={t('settings.ariaBackupNow')} onClick={runBackupNow} disabled={busy || !backup.destinationDir}>{t('settings.backupNow')}</button>
              <button type="button" className="settings-btn settings-btn--danger" aria-label={t('settings.ariaRestore')} onClick={restore} disabled={busy}>{t('settings.restore')}</button>
            </div>

            {backupError && <p className="settings-message error">{backupError}</p>}
            {backupMessage && <p className="settings-message success">{backupMessage}</p>}
          </section>

          <section className="settings-section">
            <h3>{t('settings.exchange')}</h3>
            <div className="settings-exchange">
              <input
                type="file"
                accept=".tsv"
                onChange={handleImport}
                disabled={isImporting || !selectedProfile}
                className="settings-file-input"
                id="settings-tsv-import"
              />
              <label htmlFor="settings-tsv-import" className="settings-file-label">
                {t(isImporting ? 'settings.importing' : 'settings.chooseFile')}
              </label>
              {!selectedProfile && <small className="import-note">{t('settings.needProfile')}</small>}
              <button
                type="button"
                className="settings-btn settings-btn--primary"
                onClick={handleExport}
                disabled={!selectedProfile}
              >
                {t('settings.export')}
              </button>
              {importMessage && <p className="settings-message">{importMessage}</p>}
            </div>
          </section>

          <section className="settings-section">
            <h3>{t('settings.covers')}</h3>
            <p className="settings-hint">{t('settings.coversHint')}</p>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.showAdultCovers}
                onChange={(e) => toggleGeneral('showAdultCovers', e.target.checked)}
              />
              {t('settings.showAdult')}
            </label>
            <div className="settings-field settings-inline">
              <label>
                {t('settings.batchSize')}
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={bulkBatchSize}
                  disabled={coverBulk.running}
                  onChange={(e) => setBulkBatchSize(e.target.value)}
                />
              </label>
              <label>
                {t('settings.cooldown')}
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={bulkCooldownMin}
                  disabled={coverBulk.running}
                  onChange={(e) => setBulkCooldownMin(e.target.value)}
                />
              </label>
            </div>
            <div className="settings-actions">
              <button
                type="button"
                className="settings-btn settings-btn--primary"
                onClick={runCoverBulk}
                disabled={coverBulk.running}
              >
                {t(coverBulk.running ? 'settings.bulkRunning' : 'settings.bulkRun', { done: coverBulk.done, total: coverBulk.total })}
              </button>
              {coverBulk.running && (
                <button
                  type="button"
                  className="settings-btn settings-btn--danger"
                  onClick={() => {
                    coverBulkCancelRef.current = true;
                  }}
                >
                  {t('settings.bulkStop')}
                </button>
              )}
            </div>
            {coverBulk.message && (
              <p className="settings-message">
                {coverBulk.message}
                {coverBulk.cooldownLeft > 0 && t('settings.bulkCooldown', { clock: formatClock(coverBulk.cooldownLeft) })}
              </p>
            )}
          </section>

          <section className="settings-section">
            <h3>{t('settings.bot')}</h3>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={bot.enabled}
                onChange={(e) => setBot((b) => ({ ...b, enabled: e.target.checked }))}
              />
              {t('settings.botEnabled')}
            </label>

            <label className="settings-field">
              {t('settings.token')}
              <span className="settings-inline">
                <input
                  type="password"
                  aria-label={t('settings.ariaToken')}
                  value={token}
                  placeholder={bot.hasToken ? '••••••••' : t('settings.noToken')}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button type="button" onClick={saveBotToken}>{t('settings.saveToken')}</button>
              </span>
            </label>

            <label className="settings-field">
              {t('settings.guildId')}
              <input
                type="text"
                aria-label={t('settings.guildId')}
                value={bot.guildId ?? ''}
                onChange={(e) => setBot((b) => ({ ...b, guildId: e.target.value }))}
              />
            </label>

            <label className="settings-field">
              {t('settings.allowlist')}
              <input
                type="text"
                aria-label={t('settings.ariaAllowlist')}
                value={(bot.allowedUserIds ?? []).join(',')}
                onChange={(e) =>
                  setBot((b) => ({
                    ...b,
                    allowedUserIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </label>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={bot.pendingLimitEnabled !== false}
                onChange={(e) => setBot((b) => ({ ...b, pendingLimitEnabled: e.target.checked }))}
              />
              {t('settings.limitPending')}
            </label>

            <label className="settings-field">
              {t('settings.maxSeries')}
              <input
                type="number"
                min="1"
                max="500"
                aria-label={t('settings.ariaMaxSeries')}
                value={bot.pendingLimit ?? 20}
                disabled={bot.pendingLimitEnabled === false}
                onChange={(e) => setBot((b) => ({ ...b, pendingLimit: Number(e.target.value) }))}
              />
            </label>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={bot.ephemeralReplies === true}
                onChange={(e) => setBot((b) => ({ ...b, ephemeralReplies: e.target.checked }))}
              />
              {t('settings.ephemeral')}
            </label>

            <div className="settings-field settings-inline">
              <label>
                {t('settings.confirmTtl')}
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={bot.confirmTtlMinutes ?? 5}
                  onChange={(e) => setBot((b) => ({ ...b, confirmTtlMinutes: Number(e.target.value) }))}
                />
              </label>
              <label>
                {t('settings.recommendLimit')}
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={bot.recommendLimit ?? 5}
                  onChange={(e) => setBot((b) => ({ ...b, recommendLimit: Number(e.target.value) }))}
                />
              </label>
            </div>

            <p className="settings-hint">{t('settings.botStatus', { status: bot.status })}</p>
            <div className="settings-actions">
              <button type="button" aria-label={t('settings.ariaSaveBot')} onClick={saveBotConfig}>{t('settings.save')}</button>
            </div>
            {botMessage && <p className="settings-message">{botMessage}</p>}
          </section>

          <section className="settings-section">
            <h3>{t('settings.diagnostics')}</h3>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.diagnosticsCopy}
                onChange={(e) => toggleGeneral('diagnosticsCopy', e.target.checked)}
              />
              {t('settings.diagnosticsEnabled')}
            </label>
            {general.diagnosticsCopy && (
              <div className="settings-actions">
                <button type="button" aria-label={t('settings.ariaCopyDiagnostics')} onClick={copyDiagnostics}>
                  {t('settings.copyDiagnostics')}
                </button>
                <button type="button" aria-label={t('settings.ariaOpenLogs')} onClick={openLogsFolder}>
                  {t('settings.openLogs')}
                </button>
              </div>
            )}
            {diagnosticsMessage && <p className="settings-message">{diagnosticsMessage}</p>}
          </section>

          <section className="settings-section danger-zone">
            <h3>{t('settings.danger')}</h3>
            <div className="danger-actions">
              <button
                type="button"
                className="settings-btn settings-btn--danger nuke-button"
                aria-label={t('settings.ariaNuke')}
                onClick={() => setShowNuke(true)}
              >
                {t('settings.nuke')}
              </button>
              <small className="danger-warning">{t('settings.nukeWarning')}</small>
            </div>
          </section>
        </div>

        <div className="modal-actions">
          <button type="button" className="cancel-button" onClick={onClose}>{t('settings.close')}</button>
        </div>
      </div>

      <NukeDataModal
        isOpen={showNuke}
        onClose={() => setShowNuke(false)}
        onSuccess={() => {
          setShowNuke(false);
          (onDataReset ?? onImportSuccess)?.();
        }}
      />
    </div>
  );
};

export default SettingsModal;
