// Timeout wrapper over the filesystem worker.
//
// `call(op, args, { timeoutMs })` queues the operation in a worker and resolves with
// the result. If the worker does not respond within the timeout (hung destination), it is
// terminated, a new one is created for the next call and it rejects with an error
// flagged `timedOut: true`.

import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const WORKER_FILE = path.join(__dirname, 'fs-worker.js');

export const LIST_TIMEOUT_MS = 5000;
export const WRITE_TIMEOUT_MS = 60000;

export function createRemoteFs({ workerFile = WORKER_FILE, spawnWorker } = {}) {
  let worker = null;
  let seq = 0;
  const pending = new Map();

  const failPending = (err) => {
    for (const entry of pending.values()) entry.reject(err);
    pending.clear();
  };

  const spawn = () => {
    const instance = spawnWorker ? spawnWorker(workerFile) : new Worker(workerFile);
    instance.on('message', (msg) => {
      const entry = pending.get(msg?.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.ok) entry.resolve(msg.result);
      else entry.reject(new Error(msg.error));
    });
    instance.on('error', (err) => {
      if (worker === instance) worker = null;
      failPending(err);
    });
    instance.on('exit', () => {
      if (worker === instance) worker = null;
      failPending(new Error('worker terminado'));
    });
    return instance;
  };

  const ensure = () => {
    if (!worker) worker = spawn();
    return worker;
  };

  const call = (op, args = [], { timeoutMs = LIST_TIMEOUT_MS } = {}) =>
    new Promise((resolve, reject) => {
      let instance;
      try {
        instance = ensure();
      } catch (err) {
        reject(err);
        return;
      }
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        if (worker === instance) {
          worker = null;
          try {
            instance.terminate();
          } catch {
            /* already finished */
          }
        }
        const err = new Error('timeout del destino');
        err.timedOut = true;
        reject(err);
      }, timeoutMs);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      instance.postMessage({ id, op, args });
    });

  const close = () => {
    const instance = worker;
    worker = null;
    try {
      instance?.terminate();
    } catch {
      /* already finished */
    }
  };

  return { call, close };
}
