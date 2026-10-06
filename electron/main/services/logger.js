// Logger con la misma política que WhatsappBot/src/logger.js y DailyTextFileWriter:
// archivo actual app.txt; al cambiar el día se renombra a app.YYYY-MM-DD solo
// si tiene contenido (si está vacío no se rota).

import fs from 'node:fs';
import path from 'node:path';

const pad = (n) => String(n).padStart(2, '0');

export function archiveDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timestamp(date) {
  return `${archiveDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function createLogger({ logsDir, fileName = 'app.txt', now = () => new Date() } = {}) {
  fs.mkdirSync(logsDir, { recursive: true });
  const currentPath = path.join(logsDir, fileName);

  function rotateIfNeeded(date) {
    if (!fs.existsSync(currentPath)) return;
    if (fs.statSync(currentPath).size === 0) return;
    if (archiveDate(fs.statSync(currentPath).mtime) === archiveDate(date)) return;
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    fs.renameSync(currentPath, path.join(logsDir, `${base}.${archiveDate(date)}${ext}`));
  }

  function write(level, args) {
    const date = now();
    rotateIfNeeded(date);
    const line = `${timestamp(date)} [${level}] ${args
      .map((a) => (a instanceof Error ? a.stack ?? a.message : typeof a === 'string' ? a : JSON.stringify(a)))
      .join(' ')}\n`;
    fs.appendFileSync(currentPath, line);
  }

  return {
    info: (...args) => write('INFO', args),
    warn: (...args) => write('WARN', args),
    error: (...args) => write('ERROR', args),
    currentPath,
  };
}
