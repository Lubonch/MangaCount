// Controller de actualizaciones: encapsula electron-updater (modo 'auto') y el
// chequeo+link (modo 'link'), con un estado observable. `autoUpdater` y
// `fetchLatestRelease` son inyectables para testear sin red ni Electron.

export function createUpdateController({
  mode,
  autoUpdater,
  getVersion,
  fetchLatestRelease,
  compareVersions,
  isPackaged = true,
  logger = console,
  onState = () => {},
} = {}) {
  let state = {
    mode,
    current: getVersion?.() ?? null,
    latest: null,
    hasUpdate: false,
    status: 'idle',
    percent: 0,
    url: null,
    error: null,
    skipped: !isPackaged,
  };

  const set = (patch) => {
    state = { ...state, ...patch };
    onState(state);
  };

  if (mode === 'auto' && autoUpdater) {
    autoUpdater.autoDownload = false;
    autoUpdater.on('update-available', (info) =>
      set({ hasUpdate: true, latest: info?.version ?? null, status: 'available' })
    );
    autoUpdater.on('update-not-available', () => set({ hasUpdate: false, status: 'idle' }));
    autoUpdater.on('download-progress', (p) =>
      set({ status: 'downloading', percent: Math.round(p?.percent ?? 0) })
    );
    autoUpdater.on('update-downloaded', (info) =>
      set({ status: 'downloaded', latest: info?.version ?? state.latest })
    );
    autoUpdater.on('error', (err) => {
      logger?.error?.(`update: ${err?.message ?? err}`);
      set({ status: 'error', error: err?.message ?? String(err) });
    });
  }

  return {
    mode,
    state: () => state,

    async check() {
      // En desarrollo (no empaquetada) no se chequea: no hay canal de update.
      if (!isPackaged) {
        set({ skipped: true });
        return state;
      }
      if (mode === 'auto' && autoUpdater) {
        set({ status: 'checking', error: null });
        await autoUpdater.checkForUpdates();
        return state;
      }
      try {
        const release = await fetchLatestRelease();
        set({
          hasUpdate: compareVersions(getVersion(), release.latest) > 0,
          latest: release.latest,
          url: release.url,
          error: null,
        });
      } catch (err) {
        logger?.warn?.(`update check falló: ${err?.message ?? err}`);
        set({ error: err?.message ?? String(err) });
      }
      return state;
    },

    async download() {
      if (mode === 'auto' && autoUpdater) await autoUpdater.downloadUpdate();
    },

    install() {
      // isSilent=false, isForceRunAfter=true: reabre la app con la versión nueva
      // (en AppImage, sin isForceRunAfter solo hace la integración y no la relanza).
      if (mode === 'auto' && autoUpdater) autoUpdater.quitAndInstall(false, true);
    },
  };
}
