// Discord token storage.
//
// With `safeStorage` available (keychain on macOS, DPAPI on Windows, libsecret
// on Linux) the token is encrypted. If it is not available, it falls back to plain text in
// `<userData>/discord-token.bin` so the feature is not left unusable; the
// file lives in userData (never in the repo nor in preferences.json).

import fs from 'node:fs';
import path from 'node:path';

export const TOKEN_FILE = 'discord-token.bin';

export function tokenPath(dataDir) {
  return path.join(dataDir, TOKEN_FILE);
}

export function createSecrets({ dataDir, safeStorage } = {}) {
  const available = !!safeStorage?.isEncryptionAvailable?.();
  const file = tokenPath(dataDir);

  return {
    available,
    hasToken: () => fs.existsSync(file),
    saveToken(token) {
      fs.mkdirSync(dataDir, { recursive: true });
      const data = available ? safeStorage.encryptString(token) : Buffer.from(token, 'utf8');
      fs.writeFileSync(file, data);
    },
    getToken() {
      if (!fs.existsSync(file)) return null;
      const buf = fs.readFileSync(file);
      if (!available) return buf.toString('utf8');
      try {
        return safeStorage.decryptString(buf);
      } catch {
        return null;
      }
    },
    clearToken() {
      fs.rmSync(file, { force: true });
    },
  };
}
