// Filesystem worker for operations on the backup destination directory.
//
// Runs in a separate `worker_threads` from the main thread: a slow network destination
// (e.g. an rclone FUSE) can block a syscall for a long time, and on
// the main thread that freezes the whole app. Here it is isolated and the wrapper
// (`remote-fs.js`) cuts it with a timeout.
//
// It does not access the DB or main modules: it only receives paths and bytes.

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

// Only when running as a worker (in tests `fsOps` is imported without a listener).
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
