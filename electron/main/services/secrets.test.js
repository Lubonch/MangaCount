import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSecrets, tokenPath } from './secrets.js';

describe('services/secrets', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcsec-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('sin safeStorage: fallback en texto plano y round-trip', () => {
    const secrets = createSecrets({ dataDir: dir });
    assert.equal(secrets.available, false);
    assert.equal(secrets.hasToken(), false);
    secrets.saveToken('mi-token');
    assert.equal(secrets.hasToken(), true);
    assert.equal(secrets.getToken(), 'mi-token');
    secrets.clearToken();
    assert.equal(secrets.hasToken(), false);
  });

  it('con safeStorage: cifra al guardar y descifra al leer', () => {
    const safeStorage = {
      isEncryptionAvailable: () => true,
      encryptString: (t) => Buffer.from(`E:${t}`),
      decryptString: (b) => b.toString().slice(2),
    };
    const secrets = createSecrets({ dataDir: dir, safeStorage });
    assert.equal(secrets.available, true);
    secrets.saveToken('tok');
    assert.equal(fs.readFileSync(tokenPath(dir)).toString(), 'E:tok');
    assert.equal(secrets.getToken(), 'tok');
  });

  it('devuelve null si el blob no se puede descifrar', () => {
    const safeStorage = {
      isEncryptionAvailable: () => true,
      encryptString: (t) => Buffer.from(t),
      decryptString: () => {
        throw new Error('keyring no disponible');
      },
    };
    const secrets = createSecrets({ dataDir: dir, safeStorage });
    secrets.saveToken('x');
    assert.equal(secrets.getToken(), null);
  });
});
