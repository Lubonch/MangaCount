const { contextBridge, ipcRenderer } = require('electron');

// Preload en CommonJS: con `sandbox` (default de Electron) no se admiten
// `import` en el preload; `require('electron')` sí está permitido y expone
// contextBridge/ipcRenderer. Superficie IPC hacia el renderer.
const channels = [
  'profile:list', 'profile:get', 'profile:upsert', 'profile:delete',
  'entry:list', 'entry:get-by-id', 'entry:upsert', 'entry:import', 'entry:export',
  'entry:used-formats', 'entry:used-publishers',
  'manga:list', 'manga:get', 'manga:upsert',
  'format:list', 'format:create', 'publisher:list', 'publisher:create',
  'recommendation:get',
  'profile:upload-picture',
  'database:statistics', 'database:nuke-local',
];

contextBridge.exposeInMainWorld('mangaCount', {
  availableChannels: [...channels],
  invoke: (channel, ...args) => {
    if (!channels.includes(channel)) {
      return Promise.reject(new Error(`Canal IPC no registrado: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
});
