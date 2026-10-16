// Lógica pura del ciclo de vida residente en bandeja, separada de Electron
// para poder testearla con `node --test` sin abrir ventanas ni procesos.

export const HIDDEN_FLAG = '--hidden';
export const SHOW_FLAG = '--show';

// Arranque oculto: `startInTray` (default true) rige salvo que `--show` lo
// fuerce visible o `--hidden` lo fuerce oculto (autostart).
export function shouldStartHidden(argv = [], { startInTray = true } = {}) {
  if (argv.includes(SHOW_FLAG)) return false;
  if (argv.includes(HIDDEN_FLAG)) return true;
  return startInTray !== false;
}

// Con la app residente en bandeja, cerrar todas las ventanas nunca la termina:
// el único camino a `app.quit()` es el ítem *Salir* del tray (o el cierre del SO).
export function shouldQuitOnAllWindowsClosed() {
  return false;
}

// Plantilla del menú del tray como datos puros; index.js la traduce a `Menu`
// agregando los `click` de cada ítem.
export function trayMenuTemplate({ botStatus = 'apagado', autostart = false } = {}) {
  return [
    { id: 'open', label: 'Abrir' },
    { id: 'botStatus', label: `Estado del bot: ${botStatus}`, enabled: false },
    { id: 'autostart', label: 'Iniciar con el sistema', type: 'checkbox', checked: !!autostart },
    { type: 'separator' },
    { id: 'quit', label: 'Salir' },
  ];
}
