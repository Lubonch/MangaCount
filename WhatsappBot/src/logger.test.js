const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createLogger } = require('./logger');

function createTempDirectory() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'mangacount-bot-logs-'));
}

function createConsoleSink() {
    const calls = [];

    return {
        calls,
        log: (...args) => calls.push({ level: 'info', args }),
        warn: (...args) => calls.push({ level: 'warn', args }),
        error: (...args) => calls.push({ level: 'error', args }),
    };
}

test('createLogger rotates a non-empty current file when the date changes', () => {
    const logsDir = createTempDirectory();
    let now = new Date('2026-04-11T10:00:00');
    const logger = createLogger({
        logsDir,
        fileName: 'bot.txt',
        now: () => now,
        consoleTransport: createConsoleSink(),
    });

    logger.info('first line');

    const currentFilePath = path.join(logsDir, 'bot.txt');
    fs.utimesSync(currentFilePath, new Date('2026-04-11T09:00:00'), new Date('2026-04-11T09:00:00'));

    now = new Date('2026-04-12T08:00:00');
    logger.info('second line');

    const archivedFilePath = path.join(logsDir, 'bot.2026-04-11');
    assert.equal(fs.existsSync(archivedFilePath), true);
    assert.match(fs.readFileSync(archivedFilePath, 'utf8'), /first line/);
    assert.match(fs.readFileSync(currentFilePath, 'utf8'), /second line/);

    fs.rmSync(logsDir, { recursive: true, force: true });
});

test('createLogger does not rotate an empty current file when the date changes', () => {
    const logsDir = createTempDirectory();
    const currentFilePath = path.join(logsDir, 'bot.txt');
    fs.writeFileSync(currentFilePath, '');
    fs.utimesSync(currentFilePath, new Date('2026-04-11T09:00:00'), new Date('2026-04-11T09:00:00'));

    const logger = createLogger({
        logsDir,
        fileName: 'bot.txt',
        now: () => new Date('2026-04-12T08:00:00'),
        consoleTransport: createConsoleSink(),
    });

    logger.warn('today line');

    assert.equal(fs.existsSync(path.join(logsDir, 'bot.2026-04-11')), false);
    assert.match(fs.readFileSync(currentFilePath, 'utf8'), /today line/);

    fs.rmSync(logsDir, { recursive: true, force: true });
});

test('createLogger writes to the current file and mirrors to the console sink', () => {
    const logsDir = createTempDirectory();
    const consoleSink = createConsoleSink();
    const logger = createLogger({
        logsDir,
        fileName: 'bot.txt',
        now: () => new Date('2026-04-12T08:00:00'),
        consoleTransport: consoleSink,
    });

    logger.error('failure', new Error('boom'));

    const contents = fs.readFileSync(path.join(logsDir, 'bot.txt'), 'utf8');
    assert.match(contents, /failure/);
    assert.match(contents, /boom/);
    assert.equal(consoleSink.calls.length, 1);
    assert.equal(consoleSink.calls[0].level, 'error');

    fs.rmSync(logsDir, { recursive: true, force: true });
});