// Worker de filesystem para operaciones sobre el directorio de destino de backup.
//
// Corre en un `worker_threads` aparte del hilo principal: un destino de red lento
// (p. ej. un FUSE de rclone) puede bloquear un syscall durante mucho tiempo, y en
// el hilo principal eso congela toda la app. Acá queda aislado y la envoltura
// (`remote-fs.js`) lo corta con timeout.
//
// No accede a la base ni a módulos del main: sólo recibe rutas y bytes.

import { parentPort } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';

const isBackupFileName = (name) => /^mangacount-backup-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/.test(name);

export const fsOps = {
  listBackupFiles(dir) {
    if (!dir || !fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(isBackupFileName);
  },
  listBackups(dir) {
    return fsOps
      .listBackupFiles(dir)
      .sort()
      .map((fileName) => {
        const full = path.join(dir, fileName);
        const stat = fs.statSync(full);
        return { fileName, path: full, size: stat.size, createdAt: stat.mtime.toISOString() };
      });
  },
  mkdir(dir) {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  },
  writeFile(file, bytes) {
    fs.writeFileSync(file, Buffer.from(bytes));
    return true;
  },
  rename(from, to) {
    fs.renameSync(from, to);
    return true;
  },
  rm(file) {
    fs.rmSync(file, { force: true });
    return true;
  },
  stat(file) {
    const stat = fs.statSync(file);
    return { size: stat.size, mtime: stat.mtime.toISOString() };
  },
};

// Sólo cuando corre como worker (en tests se importa `fsOps` sin listener).
if (parentPort) {
  parentPort.on('message', ({ id, op, args = [] }) => {
    try {
      const fn = fsOps[op];
      if (!fn) throw new Error(`op desconocida: ${op}`);
      parentPort.postMessage({ id, ok: true, result: fn(...args) });
    } catch (err) {
      parentPort.postMessage({ id, ok: false, error: err?.message ?? String(err) });
    }
  });
}
