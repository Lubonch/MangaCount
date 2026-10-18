// Profile photos: from wwwroot/profiles (server) to <userData>/profiles (desktop).
// Parity with ProfileController.UploadProfilePicture: validates image, saves as
// profile_{id}_{uuid}{ext} and updates the profile (even if missing, it still returns the URL).
// The original persisted an http URL; here `mangacount://profiles/<file>` is persisted,
// served by the custom protocol registered in main.

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
    // Parity with the original: the upload is valid even if the profile does not exist.
  }
  return { fileName, url };
}

export function profilePicturePath(dataDir, fileName) {
  return path.join(dataDir, 'profiles', path.basename(fileName));
}
