const { contextBridge, ipcRenderer } = require('electron');

// Preload runs in CommonJS: with Electron's default `sandbox`, `import` is not
// allowed in the preload; `require('electron')` is, and exposes
// contextBridge/ipcRenderer.
const channels = [
  'profile:list', 'profile:get', 'profile:upsert', 'profile:delete',
  'entry:list', 'entry:get-by-id', 'entry:upsert', 'entry:import', 'entry:import-preview', 'entry:export',
  'entry:used-formats', 'entry:used-publishers',
  'cover:search', 'cover:link', 'cover:local', 'cover:fetch', 'cover:unlink', 'cover:status', 'cover:all', 'cover:auto',
  'manga:list', 'manga:get', 'manga:upsert', 'manga:create-from-candidate', 'manga:delete',
  'format:list', 'format:create', 'publisher:list', 'publisher:create',
  'recommendation:get',
  'recommendation:dismiss', 'recommendation:own',
  'recommendation:config-get', 'recommendation:config-set',
  'profile:upload-picture',
  'database:statistics', 'database:nuke-local',
  'backup:create', 'backup:restore', 'backup:list', 'backup:config-get', 'backup:config-set',
  'bot:config-get', 'bot:config-set', 'bot:set-token', 'bot:status',
  'bot:autostart-get', 'bot:autostart-set',
  'app:config-get', 'app:config-set',
  'app:info', 'update:check', 'log:error',
  'update:get-state', 'update:download', 'update:install',
  'diagnostics:copy', 'diagnostics:open-logs',
  'dialog:pick-directory', 'dialog:pick-file',
];

contextBridge.exposeInMainWorld('mangaCount', {
  availableChannels: [...channels],
  invoke: (channel, ...args) => {
    if (!channels.includes(channel)) {
      return Promise.reject(new Error(`Canal IPC no registrado: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  onUpdateState: (cb) => {
    const listener = (_event, state) => cb(state);
    ipcRenderer.on('update:state', listener);
    return () => ipcRenderer.removeListener('update:state', listener);
  },
});
