import { useEffect, useRef, useState } from 'react';
import './SettingsModal.css';
import NukeDataModal from './NukeDataModal';
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
  const [general, setGeneral] = useState({ startInTray: true, autostart: false, updateCheck: true, diagnosticsCopy: true, showAdultCovers: false });
  const [backup, setBackup] = useState(EMPTY_BACKUP);
  const [backups, setBackups] = useState([]);
  const [bot, setBot] = useState({ enabled: false, guildId: '', allowedUserIds: [], status: 'apagado', hasToken: false });
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
        const [appConfig, backupConfig, backupFiles, botConfig, autostart, appMeta] = await Promise.all([
          appConfigGet(),
          backupConfigGet(),
          backupList(),
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
        setBackups(Array.isArray(backupFiles) ? backupFiles : []);
        setBot((b) => ({ ...b, ...botConfig }));
      } catch (err) {
        if (!cancelled) setGeneralMessage(`No se pudo cargar la configuración: ${err.message}`);
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
      setGeneralMessage('Guardado.');
    } catch (err) {
      setGeneralMessage(`No se pudo guardar: ${err.message}`);
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
      setBackupError('Habilitar el backup automático requiere un destino y al menos un disparador.');
      return;
    }
    try {
      const saved = await backupConfigSet(backup);
      setBackup({ ...EMPTY_BACKUP, ...saved, triggers: { ...EMPTY_BACKUP.triggers, ...(saved.triggers ?? {}) } });
      setBackupMessage('Configuración guardada.');
    } catch (err) {
      setBackupError(err.message);
    }
  };

  const runBackupNow = async () => {
    setBusy(true);
    setBackupError('');
    try {
      await backupCreate(backup.destinationDir ?? undefined);
      setBackups(await backupList());
      setBackup(await backupConfigGet());
      setBackupMessage('Backup creado.');
    } catch (err) {
      setBackupError(`Backup falló: ${err.message}`);
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
      setBackupMessage(`Restaurado. Backup de seguridad: ${result?.safetyBackup ?? '—'}`);
      onImportSuccess?.();
    } catch (err) {
      setBackupError(`Restore falló: ${err.message}`);
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
      setBotMessage('Token guardado.');
      pollBotStatus();
    } catch (err) {
      setBotMessage(`No se pudo guardar el token: ${err.message}`);
    }
  };

  const saveBotConfig = async () => {
    setBotMessage('');
    try {
      await botConfigSet({
        enabled: bot.enabled,
        guildId: bot.guildId || null,
        allowedUserIds: bot.allowedUserIds,
      });
      setBotMessage('Configuración del bot guardada.');
      pollBotStatus();
    } catch (err) {
      setBotMessage(`No se pudo guardar: ${err.message}`);
    }
  };

  const runUpdateCheck = async () => {
    setCheckingUpdate(true);
    setUpdateMessage('');
    try {
      const result = await checkUpdatesRequest();
      setUpdate(result);
      setUpdateMessage(
        result?.hasUpdate ? `Hay una versión nueva: v${result.latest}` : 'Estás al día.'
      );
    } catch (err) {
      setUpdateMessage(`No se pudo verificar: ${err.message}`);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const downloadUpdate = async () => {
    setUpdateMessage('');
    try {
      await downloadUpdateRequest();
    } catch (err) {
      setUpdateMessage(`No se pudo descargar: ${err.message}`);
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
      setImportMessage('Please select a TSV file');
      return;
    }
    setIsImporting(true);
    setImportMessage('Importing file...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/entry/import/${selectedProfile.id}`, { method: 'POST', body: formData });
      if (response.ok) {
        setImportMessage('Import successful!');
        onImportSuccess?.();
        event.target.value = '';
      } else {
        const error = await response.json();
        setImportMessage(`Import failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      setImportMessage('Import failed: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const tsv = await entryExport(selectedProfile.id);
      downloadTsv(tsv, `mangacount-${selectedProfile.id}.tsv`);
      setImportMessage('Export ready!');
    } catch (error) {
      setImportMessage('Export failed: ' + error.message);
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

    setCoverBulk({ running: true, done: 0, total: 0, message: 'Buscando mangas…', cooldownLeft: 0 });
    let mangas;
    let covers;
    try {
      [mangas, covers] = await Promise.all([mangaList(), coverAll()]);
    } catch {
      setCoverBulk({ running: false, done: 0, total: 0, message: 'No se pudo leer la colección.', cooldownLeft: 0 });
      return;
    }
    const missing = mangas.filter((manga) => !covers[manga.id]?.url);
    if (missing.length === 0) {
      setCoverBulk({ running: false, done: 0, total: 0, message: 'Todas las portadas ya están vinculadas.', cooldownLeft: 0 });
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
      setCoverBulk({ running: true, done, total: missing.length, message: `${linked} portadas nuevas hasta ahora`, cooldownLeft: 0 });

      if (i === missing.length - 1) break; // terminó: sin espera final

      if (done % batchSize === 0 && cooldownSec > 0) {
        // Pausa larga entre lotes, con cuenta regresiva cancelable.
        for (let s = cooldownSec; s > 0; s -= 1) {
          if (coverBulkCancelRef.current) break;
          setCoverBulk((prev) => ({
            ...prev,
            running: true,
            cooldownLeft: s,
            message: `Lote de ${batchSize} hecho — pausa para no superar el límite de AniList`,
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
      message: `Listo: ${linked} portadas nuevas${coverBulkCancelRef.current ? ' (detenido)' : ''}.`,
      cooldownLeft: 0,
    });
    onImportSuccess?.();
  };

  return (
    <div className="modal-overlay settings-modal-overlay">
      <div className="modal-content settings-modal-content">
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button className="close-button" onClick={onClose} aria-label="Close settings">&times;</button>
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h3>General</h3>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.startInTray}
                onChange={(e) => toggleGeneral('startInTray', e.target.checked)}
              />
              Arrancar en la bandeja
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.autostart}
                onChange={(e) => toggleGeneral('autostart', e.target.checked)}
              />
              Iniciar con el sistema
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.updateCheck}
                onChange={(e) => toggleGeneral('updateCheck', e.target.checked)}
              />
              Buscar actualizaciones al abrir la app
            </label>
            <p className="settings-hint">Versión actual: {version ?? '—'}</p>
            <div className="settings-actions">
              {update?.status === 'downloaded' ? (
                <button type="button" aria-label="Reiniciar para actualizar" onClick={installUpdate}>
                  Reiniciar para actualizar
                </button>
              ) : update?.status === 'downloading' ? (
                <button type="button" disabled>Descargando… {update.percent}%</button>
              ) : update?.hasUpdate && update?.mode === 'auto' ? (
                <button type="button" aria-label="Descargar actualización" onClick={downloadUpdate}>
                  Descargar v{update.latest}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Buscar actualización"
                  onClick={runUpdateCheck}
                  disabled={checkingUpdate}
                >
                  {checkingUpdate ? 'Buscando…' : 'Buscar actualización'}
                </button>
              )}
              {update?.hasUpdate && update?.mode !== 'auto' && update?.url && (
                <a className="settings-link" href={update.url} target="_blank" rel="noreferrer">
                  Descargar v{update.latest}
                </a>
              )}
            </div>
            {updateMessage && <p className="settings-message">{updateMessage}</p>}
            {generalMessage && <p className="settings-message">{generalMessage}</p>}
          </section>

          <section className="settings-section">
            <h3>Backup</h3>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={backup.enabled}
                onChange={(e) => setBackup((b) => ({ ...b, enabled: e.target.checked }))}
              />
              Habilitar backup automático
            </label>

            <label className="settings-field">
              Destino
              <span className="settings-inline">
                <input type="text" value={backup.destinationDir ?? ''} readOnly placeholder="Elegí una carpeta" />
                <button type="button" onClick={chooseDestination}>Elegir…</button>
              </span>
            </label>

            <label className="settings-field">
              Cada (minutos)
              <input
                type="number"
                min="1"
                aria-label="Intervalo de backup"
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
                Al iniciar
              </label>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={backup.triggers.whileRunning}
                  onChange={(e) => setBackup((b) => ({ ...b, triggers: { ...b.triggers, whileRunning: e.target.checked } }))}
                />
                Mientras la app corre
              </label>
            </div>

            <p className="settings-hint">
              {backups.length} backups · último OK: {backup.lastBackupAt ?? '—'}
              {lastStatus && !lastStatus.ok ? ` · último error: ${lastStatus.error}` : ''}
            </p>

            <div className="settings-actions">
              <button type="button" aria-label="Guardar backup" onClick={saveBackup}>Guardar</button>
              <button type="button" aria-label="Backup ahora" onClick={runBackupNow} disabled={busy || !backup.destinationDir}>Backup ahora</button>
              <button type="button" className="danger-button" aria-label="Restaurar" onClick={restore} disabled={busy}>Restaurar…</button>
            </div>

            {backupError && <p className="settings-message error">{backupError}</p>}
            {backupMessage && <p className="settings-message success">{backupMessage}</p>}
          </section>

          <section className="settings-section">
            <h3>Intercambio</h3>
            <div className="import-section">
              <input
                type="file"
                accept=".tsv"
                onChange={handleImport}
                disabled={isImporting || !selectedProfile}
                className="file-input"
                id="settings-tsv-import"
              />
              <label htmlFor="settings-tsv-import" className="file-input-label">
                {isImporting ? 'Importing...' : 'Choose TSV File'}
              </label>
              {!selectedProfile && <small className="import-note">Select a profile first</small>}
              <button type="button" className="action-button" onClick={handleExport} disabled={!selectedProfile}>
                Export TSV
              </button>
              {importMessage && <p className="settings-message">{importMessage}</p>}
            </div>
          </section>

          <section className="settings-section">
            <h3>Portadas (AniList)</h3>
            <p className="settings-hint">
              Busca y vincula las portadas de los mangas que todavía no tienen. Va de a **lotes** (por
              defecto 20) y **pausa** entre lotes, para no acercarse al límite de AniList (~30/min).
            </p>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.showAdultCovers}
                onChange={(e) => toggleGeneral('showAdultCovers', e.target.checked)}
              />
              Incluir resultados +18 (por defecto ocultos)
            </label>
            <div className="settings-field settings-inline">
              <label>
                Tamaño de lote
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
                Pausa entre lotes (min)
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
              <button type="button" className="action-button" onClick={runCoverBulk} disabled={coverBulk.running}>
                {coverBulk.running ? `Buscando… ${coverBulk.done}/${coverBulk.total}` : 'Traer portadas faltantes'}
              </button>
              {coverBulk.running && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    coverBulkCancelRef.current = true;
                  }}
                >
                  Detener
                </button>
              )}
            </div>
            {coverBulk.message && (
              <p className="settings-message">
                {coverBulk.message}
                {coverBulk.cooldownLeft > 0 && ` — reanuda en ${formatClock(coverBulk.cooldownLeft)}`}
              </p>
            )}
          </section>

          <section className="settings-section">
            <h3>Bot (Discord)</h3>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={bot.enabled}
                onChange={(e) => setBot((b) => ({ ...b, enabled: e.target.checked }))}
              />
              Habilitar bot
            </label>

            <label className="settings-field">
              Token
              <span className="settings-inline">
                <input
                  type="password"
                  aria-label="Token de Discord"
                  value={token}
                  placeholder={bot.hasToken ? '••••••••' : 'Sin token'}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button type="button" onClick={saveBotToken}>Guardar token</button>
              </span>
            </label>

            <label className="settings-field">
              Guild ID
              <input
                type="text"
                aria-label="Guild ID"
                value={bot.guildId ?? ''}
                onChange={(e) => setBot((b) => ({ ...b, guildId: e.target.value }))}
              />
            </label>

            <label className="settings-field">
              Usuarios permitidos (separados por coma)
              <input
                type="text"
                aria-label="Usuarios permitidos"
                value={(bot.allowedUserIds ?? []).join(',')}
                onChange={(e) =>
                  setBot((b) => ({
                    ...b,
                    allowedUserIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </label>

            <p className="settings-hint">Estado: {bot.status}</p>
            <div className="settings-actions">
              <button type="button" aria-label="Guardar bot" onClick={saveBotConfig}>Guardar</button>
            </div>
            {botMessage && <p className="settings-message">{botMessage}</p>}
          </section>

          <section className="settings-section">
            <h3>Diagnóstico</h3>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={general.diagnosticsCopy}
                onChange={(e) => toggleGeneral('diagnosticsCopy', e.target.checked)}
              />
              Habilitar diagnóstico
            </label>
            {general.diagnosticsCopy && (
              <div className="settings-actions">
                <button type="button" aria-label="Copiar diagnóstico" onClick={copyDiagnostics}>
                  Copiar diagnóstico
                </button>
                <button type="button" aria-label="Abrir carpeta de logs" onClick={openLogsFolder}>
                  Abrir carpeta de logs
                </button>
              </div>
            )}
            {diagnosticsMessage && <p className="settings-message">{diagnosticsMessage}</p>}
          </section>

          <section className="settings-section danger-zone">
            <h3>⚠️ Danger Zone</h3>
            <div className="danger-actions">
              <button
                type="button"
                className="danger-button nuke-button"
                aria-label="Nuclear Option"
                onClick={() => setShowNuke(true)}
              >
                💥 Nuclear Option
              </button>
              <small className="danger-warning">This will permanently delete ALL data!</small>
            </div>
          </section>
        </div>

        <div className="modal-actions">
          <button type="button" className="cancel-button" onClick={onClose}>Cerrar</button>
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
