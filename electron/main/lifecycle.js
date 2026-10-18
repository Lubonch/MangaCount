// Lógica pura del ciclo de vida residente en bandeja, separada de Electron
// para poder testearla con `node --test` sin abrir ventanas ni procesos.

export const HIDDEN_FLAG = '--hidden';
export const SHOW_FLAG = '--show';

// Arranque oculto SOLO cuando lo pide el autostart (`--hidden`). Un lanzamiento
// manual (doble clic) muestra la ventana; `--show` fuerza visible igual.
export function shouldStartHidden(argv = []) {
  if (argv.includes(SHOW_FLAG)) return false;
  return argv.includes(HIDDEN_FLAG);
}

// Con la app residente en bandeja, cerrar todas las ventanas nunca la termina:
// el único camino a `app.quit()` es el ítem *Salir* del tray (o el cierre del SO).
export function shouldQuitOnAllWindowsClosed() {
  return false;
}

// Plantilla del menú del tray como datos puros; index.js la traduce a `Menu`
// agregando los `click` de cada ítem.
export function trayMenuTemplate({ botStatus = 'apagado', autostart = false, t = (key) => key } = {}) {
  return [
    { id: 'open', label: t('tray.open') },
    { id: 'botStatus', label: t('tray.botStatus', { status: botStatus }), enabled: false },
    { id: 'autostart', label: t('tray.autostart'), type: 'checkbox', checked: !!autostart },
    { type: 'separator' },
    { id: 'quit', label: t('tray.quit') },
  ];
}
