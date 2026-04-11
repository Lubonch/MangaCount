const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');

function formatArchiveDate(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function formatTimestamp(date) {
    return [
        formatArchiveDate(date),
        [
            String(date.getHours()).padStart(2, '0'),
            String(date.getMinutes()).padStart(2, '0'),
            String(date.getSeconds()).padStart(2, '0'),
        ].join(':'),
    ].join(' ');
}

function buildArchivedFileName(fileName, date) {
    const parsedPath = path.parse(fileName);
    return `${parsedPath.name}.${formatArchiveDate(date)}`;
}

function formatArguments(args) {
    return args.map((arg) => {
        if (arg instanceof Error) {
            return arg.stack || arg.message;
        }

        if (typeof arg === 'string') {
            return arg;
        }

        return util.inspect(arg, { depth: 5, breakLength: Infinity });
    }).join(' ');
}

function createLogger(options = {}) {
    const logsDir = path.resolve(options.logsDir || process.env.BOT_LOGS_DIR || path.join(process.cwd(), '..', 'logs'));
    const fileName = options.fileName || 'bot.txt';
    const now = options.now || (() => new Date());
    const consoleTransport = options.consoleTransport || console;

    function rotateIfNeeded(currentDate) {
        const currentFilePath = path.join(logsDir, fileName);
        if (!fs.existsSync(currentFilePath)) {
            return;
        }

        const stats = fs.statSync(currentFilePath);
        if (stats.size === 0) {
            return;
        }

        if (formatArchiveDate(stats.mtime) === formatArchiveDate(currentDate)) {
            return;
        }

        const archivedFilePath = path.join(logsDir, buildArchivedFileName(fileName, stats.mtime));
        if (fs.existsSync(archivedFilePath)) {
            fs.appendFileSync(archivedFilePath, fs.readFileSync(currentFilePath));
            fs.unlinkSync(currentFilePath);
            return;
        }

        fs.renameSync(currentFilePath, archivedFilePath);
    }

    function write(level, consoleMethod, args) {
        const currentDate = now();

        fs.mkdirSync(logsDir, { recursive: true });
        rotateIfNeeded(currentDate);

        const line = `[${formatTimestamp(currentDate)}] [${level}] ${formatArguments(args)}`;
        fs.appendFileSync(path.join(logsDir, fileName), `${line}\n`);

        const sinkMethod = consoleTransport[consoleMethod] || consoleTransport.log;
        sinkMethod.apply(consoleTransport, args);
    }

    return {
        info: (...args) => write('INFO', 'log', args),
        warn: (...args) => write('WARN', 'warn', args),
        error: (...args) => write('ERROR', 'error', args),
    };
}

module.exports = { createLogger };