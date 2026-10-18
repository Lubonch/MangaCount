import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { backupDue, startAutoBackup } from './auto-backup.js';

const base = (over = {}) => ({
  enabled: true,
  destinationDir: '/dest',
  intervalMinutes: 60,
  triggers: { onStartup: true, whileRunning: false },
  lastBackupAt: null,
  ...over,
});

describe('services/auto-backup: backupDue', () => {
  it('false si está deshabilitado, sin destino o sin onStartup', () => {
    assert.equal(backupDue(base({ enabled: false })), false);
    assert.equal(backupDue(base({ destinationDir: null })), false);
    assert.equal(backupDue(base({ triggers: { onStartup: false, whileRunning: true } })), false);
  });

  it('true sin lastBackupAt o con intervalo vencido', () => {
    assert.equal(backupDue(base(), Date.now()), true);
    const now = Date.parse('2026-01-02T04:00:00Z');
    assert.equal(backupDue(base({ lastBackupAt: '2026-01-02T02:30:00Z' }), now), true);
    assert.equal(backupDue(base({ lastBackupAt: '2026-01-02T03:45:00Z' }), now), false);
  });

  it('tolera config nula, fecha inválida y usa intervalo default de 1440', () => {
    assert.equal(backupDue(undefined), false);
    assert.equal(backupDue({ enabled: true, destinationDir: '/d' }), false); // triggers missing
    assert.equal(backupDue(base({ lastBackupAt: 'no-es-fecha' })), true);
    const now = Date.parse('2026-01-02T04:00:00Z');
    assert.equal(
      backupDue(
        {
          enabled: true,
          destinationDir: '/d',
          triggers: { onStartup: true },
          lastBackupAt: '2026-01-02T03:00:00Z',
        },
        now
      ),
      false
    );
    assert.equal(
      backupDue(
        {
          enabled: true,
          destinationDir: '/d',
          triggers: { onStartup: true },
          lastBackupAt: '2026-01-01T03:00:00Z',
        },
        now
      ),
      true
    );
  });
});

describe('services/auto-backup: startAutoBackup', () => {
  it('dispara al iniciar cuando el intervalo venció', async () => {
    const calls = [];
    startAutoBackup({
      loadConfig: () => base({ lastBackupAt: '2020-01-01T00:00:00Z' }),
      runBackup: async (dest) => calls.push(dest),
      now: () => Date.parse('2026-01-02T04:00:00Z'),
      logger: { error() {} },
    });
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(calls, ['/dest']);
  });

  it('no dispara al iniciar si el intervalo no venció', async () => {
    const calls = [];
    startAutoBackup({
      loadConfig: () => base({ lastBackupAt: '2026-01-02T03:59:00Z' }),
      runBackup: async (dest) => calls.push(dest),
      now: () => Date.parse('2026-01-02T04:00:00Z'),
      logger: { error() {} },
    });
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(calls, []);
  });

  it('programa whileRunning y lo limpia en stop', () => {
    let captured = null;
    const cleared = [];
    const stop = startAutoBackup({
      loadConfig: () => base({ triggers: { onStartup: false, whileRunning: true } }),
      runBackup: async () => {},
      setIntervalFn: (fn, ms) => {
        captured = { fn, ms };
        return 42;
      },
      clearIntervalFn: (id) => cleared.push(id),
      logger: { error() {} },
    });
    assert.equal(captured.ms, 60 * 60000);
    stop();
    assert.deepEqual(cleared, [42]);
  });

  it('config inválida no dispara', async () => {
    const calls = [];
    startAutoBackup({
      loadConfig: () => base({ destinationDir: null }),
      runBackup: async (dest) => calls.push(dest),
      logger: { error() {} },
    });
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(calls, []);
  });

  it('loguea el error si el backup al iniciar falla', async () => {
    const errors = [];
    startAutoBackup({
      loadConfig: () => base({ lastBackupAt: '2020-01-01T00:00:00Z' }),
      runBackup: async () => {
        throw new Error('disco lleno');
      },
      now: () => Date.parse('2026-01-02T04:00:00Z'),
      logger: { error: (m) => errors.push(m) },
    });
    await new Promise((r) => setImmediate(r));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /disco lleno/);
  });

  it('el tick por intervalo fuerza el backup y loguea errores', async () => {
    let captured = null;
    const errors = [];
    const stop = startAutoBackup({
      loadConfig: () =>
        base({
          lastBackupAt: '2026-01-02T03:59:00Z',
          triggers: { onStartup: false, whileRunning: true },
        }),
      runBackup: async () => {
        throw new Error('interval falló');
      },
      setIntervalFn: (fn, ms) => {
        captured = { fn, ms };
        return 7;
      },
      clearIntervalFn: () => {},
      now: () => Date.parse('2026-01-02T04:00:00Z'),
      logger: { error: (m) => errors.push(m) },
    });
    captured.fn();
    await new Promise((r) => setImmediate(r));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /interval falló/);
    stop();
  });

  it('stop sin timer no rompe y config deshabilitada no programa nada', () => {
    const stop = startAutoBackup({
      loadConfig: () => base({ enabled: false }),
      runBackup: async () => {},
    });
    stop();
    stop();
  });

  it('config ausente o sin triggers no dispara', async () => {
    const calls = [];
    startAutoBackup({
      loadConfig: () => undefined,
      runBackup: async (dest) => calls.push(dest),
      logger: { error() {} },
    });
    startAutoBackup({
      loadConfig: () => ({ enabled: true, destinationDir: '/d' }),
      runBackup: async (dest) => calls.push(dest),
      logger: { error() {} },
    });
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(calls, []);
  });

  it('programa whileRunning con intervalo default si falta intervalMinutes', () => {
    let captured = null;
    startAutoBackup({
      loadConfig: () => ({
        enabled: true,
        destinationDir: '/d',
        triggers: { onStartup: false, whileRunning: true },
      }),
      runBackup: async () => {},
      setIntervalFn: (fn, ms) => {
        captured = { fn, ms };
        return 1;
      },
      clearIntervalFn: () => {},
      logger: { error() {} },
    });
    assert.equal(captured.ms, 1440 * 60000);
  });

  it('usa el reloj real por defecto al iniciar', async () => {
    const calls = [];
    startAutoBackup({
      loadConfig: () => base({ lastBackupAt: '2020-01-01T00:00:00Z' }),
      runBackup: async (dest) => calls.push(dest),
      logger: { error() {} },
    });
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(calls, ['/dest']);
  });
});
