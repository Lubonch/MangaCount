// Guardado del token de Discord.
//
// Con `safeStorage` disponible (keychain en macOS, DPAPI en Windows, libsecret
// en Linux) el token se cifra. Si no está disponible, se cae a texto plano en
// `<userData>/discord-token.bin` para no dejar la función inutilizable; el
// archivo vive en userData (nunca en el repo ni en preferences.json).

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
