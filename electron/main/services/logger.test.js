import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { archiveDate, createLogger } from './logger.js';

describe('services/logger', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mclog-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('archiveDate formatea YYYY-MM-DD', () => {
    assert.equal(archiveDate(new Date(2026, 0, 2, 5, 6, 7)), '2026-01-02');
  });

  it('escribe INFO/WARN/ERROR con timestamp y expone currentPath', () => {
    const logger = createLogger({ logsDir: dir });
    logger.info('hola');
    logger.warn('ojo');
    logger.error('boom');

    assert.equal(logger.currentPath, path.join(dir, 'app.txt'));
    const text = fs.readFileSync(logger.currentPath, 'utf8');
    assert.match(text, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \[INFO\] hola$/m);
    assert.match(text, /\[WARN\] ojo/);
    assert.match(text, /\[ERROR\] boom/);
  });

  it('serializa Error (sin stack), strings y objetos', () => {
    const logger = createLogger({ logsDir: dir });
    const err = new Error('falla');
    err.stack = undefined; // fuerza la rama `a.stack ?? a.message`
    logger.error(err);
    logger.info({ a: 1 }, 42);

    const text = fs.readFileSync(logger.currentPath, 'utf8');
    assert.match(text, /\[ERROR\] falla/);
    assert.match(text, /\[INFO\] \{"a":1\} 42/);
  });

  it('rota al cambiar de día solo si el archivo tiene contenido', () => {
    let now = new Date(2026, 0, 2, 3, 0, 0);
    const logger = createLogger({ logsDir: dir, now: () => now });
    logger.info('día uno');
    // el mtime real no coincide con `now()`; lo forzamos para que la rotación sea determinista
    fs.utimesSync(logger.currentPath, new Date(2026, 0, 2, 1, 0, 0), new Date(2026, 0, 2, 1, 0, 0));

    now = new Date(2026, 0, 3, 3, 0, 0);
    logger.info('día dos');

    const files = fs.readdirSync(dir).sort();
    assert.ok(files.includes('app.2026-01-03.txt'));
    assert.ok(files.includes('app.txt'));
    assert.match(fs.readFileSync(path.join(dir, 'app.2026-01-03.txt'), 'utf8'), /día uno/);
    const current = fs.readFileSync(logger.currentPath, 'utf8');
    assert.match(current, /día dos/);
    assert.doesNotMatch(current, /día uno/);
  });

  it('no rota un archivo vacío ni cuando es el mismo día', () => {
    const logger = createLogger({ logsDir: dir, now: () => new Date(2026, 0, 2, 3, 0, 0) });

    // archivo vacío preexistente: no rota aunque cambie el día
    fs.writeFileSync(logger.currentPath, '');
    fs.utimesSync(logger.currentPath, new Date(2026, 0, 1, 0, 0, 0), new Date(2026, 0, 1, 0, 0, 0));
    logger.info('uno');
    assert.deepEqual(fs.readdirSync(dir), ['app.txt']);

    // mismo día: no rota
    fs.utimesSync(logger.currentPath, new Date(2026, 0, 2, 1, 0, 0), new Date(2026, 0, 2, 1, 0, 0));
    logger.info('dos');
    assert.deepEqual(fs.readdirSync(dir), ['app.txt']);
  });
});
