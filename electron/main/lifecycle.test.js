// Lógica pura del ciclo de vida residente en bandeja: arranque oculto, no salir
// al cerrar todas las ventanas y la plantilla del menú del tray.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HIDDEN_FLAG,
  SHOW_FLAG,
  shouldStartHidden,
  shouldQuitOnAllWindowsClosed,
  trayMenuTemplate,
} from './lifecycle.js';

describe('lifecycle: arranque oculto', () => {
  it('arranca en tray por defecto (startInTray default true)', () => {
    assert.equal(shouldStartHidden([], {}), true);
    assert.equal(shouldStartHidden(['/usr/bin/mangacount'], {}), true);
  });

  it('respeta startInTray=false', () => {
    assert.equal(shouldStartHidden([], { startInTray: false }), false);
  });

  it('el argumento --hidden fuerza oculto (autostart)', () => {
    assert.equal(shouldStartHidden([HIDDEN_FLAG], { startInTray: false }), true);
  });

  it('el argumento --show fuerza visible', () => {
    assert.equal(shouldStartHidden([SHOW_FLAG], { startInTray: true }), false);
  });
});

describe('lifecycle: ventanas', () => {
  it('nunca sale al cerrar todas las ventanas (app residente)', () => {
    assert.equal(shouldQuitOnAllWindowsClosed(), false);
  });
});

describe('lifecycle: menú del tray', () => {
  it('incluye abrir, estado del bot, autostart y salir', () => {
    const ids = trayMenuTemplate({ botStatus: 'conectado', autostart: true })
      .filter((i) => i.id)
      .map((i) => i.id);
    assert.deepEqual(ids, ['open', 'botStatus', 'autostart', 'quit']);
  });

  it('refleja el estado del bot y del autostart', () => {
    const items = trayMenuTemplate({ botStatus: 'apagado', autostart: false });
    const bot = items.find((i) => i.id === 'botStatus');
    const auto = items.find((i) => i.id === 'autostart');
    assert.match(bot.label, /apagado/);
    assert.equal(bot.enabled, false);
    assert.equal(auto.checked, false);
    assert.equal(auto.type, 'checkbox');
  });
});
