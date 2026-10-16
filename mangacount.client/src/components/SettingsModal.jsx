import { useEffect, useState } from 'react';
import './SettingsModal.css';
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
  pickDirectory,
  pickFile,
  entryExport,
} from '../api/localAdapter.js';

const EMPTY_BACKUP = {
  enabled: false,
  destinationDir: null,
  intervalMinutes: 1440,
  triggers: { onStartup: true, whileRunning: false },
  lastBackupAt: null,
  lastBackupStatus: null,
};

function downloadTsv(text, filename) {
  if (typeof URL?.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/tab-separated-values' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const SettingsModal = ({ isOpen, onClose, selectedProfile, onImportSuccess }) => {
  const [general, setGeneral] = useState({ startInTray: true, autostart: false });
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

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [appConfig, backupConfig, backupFiles, botConfig, autostart] = await Promise.all([
          appConfigGet(),
          backupConfigGet(),
          backupList(),
          botConfigGet(),
          botAutostartGet(),
        ]);
        if (cancelled) return;
        setGeneral({ startInTray: !!appConfig?.startInTray, autostart: !!autostart?.enabled });
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

  if (!isOpen) return null;

  const backupInvalid =
    backup.enabled && (!backup.destinationDir || (!backup.triggers.onStartup && !backup.triggers.whileRunning));

  const toggleGeneral = async (key, value) => {
    const next = { ...general, [key]: value };
    setGeneral(next);
    setGeneralMessage('');
    try {
      if (key === 'startInTray') await appConfigSet({ startInTray: value });
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
        </div>

        <div className="modal-actions">
          <button type="button" className="cancel-button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
