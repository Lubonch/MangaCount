// Pure tray-resident lifecycle logic, kept separate from Electron so it can be
// tested with `node --test` without opening windows or processes.

export const HIDDEN_FLAG = '--hidden';
export const SHOW_FLAG = '--show';

// Hidden start ONLY when autostart asks for it (`--hidden`). A manual launch
// (double click) shows the window; `--show` forces visible anyway.
export function shouldStartHidden(argv = []) {
  if (argv.includes(SHOW_FLAG)) return false;
  return argv.includes(HIDDEN_FLAG);
}

// With the app resident in the tray, closing all windows never quits it: the
// only path to `app.quit()` is the tray *Quit* item (or an OS shutdown).
export function shouldQuitOnAllWindowsClosed() {
  return false;
}

// Tray menu template as pure data; index.js turns it into a `Menu` and adds each
// item's `click`.
export function trayMenuTemplate({ botStatus = 'apagado', autostart = false, t = (key) => key } = {}) {
  return [
    { id: 'open', label: t('tray.open') },
    { id: 'botStatus', label: t('tray.botStatus', { status: botStatus }), enabled: false },
    { id: 'autostart', label: t('tray.autostart'), type: 'checkbox', checked: !!autostart },
    { type: 'separator' },
    { id: 'quit', label: t('tray.quit') },
  ];
}
