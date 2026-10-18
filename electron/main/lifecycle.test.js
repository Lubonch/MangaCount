// Pure tray-resident lifecycle logic: hidden start, not quitting when all
// windows close, and the tray menu template.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HIDDEN_FLAG,
  SHOW_FLAG,
  shouldStartHidden,
  shouldQuitOnAllWindowsClosed,
  trayMenuTemplate,
} from './lifecycle.js';
import { createAppTranslator } from '../../shared/i18n/index.js';

const t = createAppTranslator('es');

describe('lifecycle: arranque oculto', () => {
  it('un lanzamiento manual muestra la ventana', () => {
    assert.equal(shouldStartHidden([]), false);
    assert.equal(shouldStartHidden(['/usr/bin/mangacount']), false);
  });

  it('--hidden (autostart) arranca oculto', () => {
    assert.equal(shouldStartHidden([HIDDEN_FLAG]), true);
  });

  it('--show fuerza visible aunque venga --hidden', () => {
    assert.equal(shouldStartHidden([SHOW_FLAG, HIDDEN_FLAG]), false);
  });
});

describe('lifecycle: ventanas', () => {
  it('nunca sale al cerrar todas las ventanas (app residente)', () => {
    assert.equal(shouldQuitOnAllWindowsClosed(), false);
  });
});

describe('lifecycle: menú del tray', () => {
  it('incluye abrir, estado del bot, autostart y salir', () => {
    const ids = trayMenuTemplate({ botStatus: 'conectado', autostart: true, t })
      .filter((i) => i.id)
      .map((i) => i.id);
    assert.deepEqual(ids, ['open', 'botStatus', 'autostart', 'quit']);
  });

  it('refleja el estado del bot y del autostart', () => {
    const items = trayMenuTemplate({ botStatus: 'apagado', autostart: false, t });
    const bot = items.find((i) => i.id === 'botStatus');
    const auto = items.find((i) => i.id === 'autostart');
    assert.match(bot.label, /apagado/);
    assert.equal(bot.enabled, false);
    assert.equal(auto.checked, false);
    assert.equal(auto.type, 'checkbox');
  });
});
