// Fotos de perfil: de wwwroot/profiles (servidor) a <userData>/profiles (desktop).
// Paridad con ProfileController.UploadProfilePicture: valida imagen, guarda como
// profile_{id}_{uuid}{ext} y actualiza el perfil (aunque falte, igual devuelve la URL).
// El original persistía una URL http; acá se persiste `mangacount://profiles/<file>`,
// servida por el protocolo custom registrado en main.

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setProfilePicture } from '../db/repositories/profiles.js';

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
export const PROFILE_IMAGE_SCHEME = 'mangacount';
export const profileImageUrl = (fileName) => `${PROFILE_IMAGE_SCHEME}://profiles/${fileName}`;

export function saveProfilePicture(db, dataDir, profileId, { originalName, buffer }) {
  if (!buffer || buffer.length === 0) throw new Error('Archivo vacío');
  const ext = path.extname(originalName ?? '').toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) throw new Error('Solo se permiten imágenes');
  const dir = path.join(dataDir, 'profiles');
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `profile_${profileId}_${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(dir, fileName), buffer);
  const url = profileImageUrl(fileName);
  try {
    setProfilePicture(db, profileId, url);
  } catch {
    // Paridad con el original: el upload vale aunque el perfil no exista.
  }
  return { fileName, url };
}

export function profilePicturePath(dataDir, fileName) {
  return path.join(dataDir, 'profiles', path.basename(fileName));
}
