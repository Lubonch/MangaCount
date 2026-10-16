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
});
