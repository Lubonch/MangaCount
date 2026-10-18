// Memoria del recomendador por perfil:
// - `dismiss`/`listDismissed`/`clearDismissal`: "No viable" (descarte permanente).
// - `markSeen`/`listSeen`/`pruneSeen`: "Ya visto" con vencimiento (TTL).
// `SeenAt` se guarda como ISO 8601 (UTC) para poder compararlo como texto contra
// el corte de TTL; `CURRENT_TIMESTAMP` (formato SQLite, separado por espacio) no
// es comparable con un ISO, por eso el repositorio recibe la fecha explícita.
// DTO: { id, profileId, provider, externalId, createdAt | seenAt }.

const DISMISSAL_SELECT =
  'Id AS id, ProfileId AS profileId, Provider AS provider, ' +
  'ExternalId AS externalId, CreatedAt AS createdAt FROM RecommendationDismissal';

const SEEN_SELECT =
  'Id AS id, ProfileId AS profileId, Provider AS provider, ' +
  'ExternalId AS externalId, SeenAt AS seenAt FROM RecommendationSeen';

export function dismiss(db, profileId, provider, externalId) {
  db.prepare(
    `INSERT INTO RecommendationDismissal (ProfileId, Provider, ExternalId)
     VALUES (?, ?, ?)
     ON CONFLICT(ProfileId, Provider, ExternalId) DO NOTHING`
  ).run(profileId, provider, String(externalId));
  return db
    .prepare(`SELECT ${DISMISSAL_SELECT} WHERE ProfileId = ? AND Provider = ? AND ExternalId = ?`)
    .get(profileId, provider, String(externalId));
}

export function listDismissed(db, profileId) {
  return db.prepare(`SELECT ${DISMISSAL_SELECT} WHERE ProfileId = ?`).all(profileId);
}

export function clearDismissal(db, profileId, provider, externalId) {
  const info = db
    .prepare(
      'DELETE FROM RecommendationDismissal WHERE ProfileId = ? AND Provider = ? AND ExternalId = ?'
    )
    .run(profileId, provider, String(externalId));
  return info.changes > 0;
}

export function markSeen(db, profileId, provider, externalId, seenAt = new Date().toISOString()) {
  db.prepare(
    `INSERT INTO RecommendationSeen (ProfileId, Provider, ExternalId, SeenAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(ProfileId, Provider, ExternalId) DO UPDATE SET SeenAt = excluded.SeenAt`
  ).run(profileId, provider, String(externalId), seenAt);
  return db
    .prepare(`SELECT ${SEEN_SELECT} WHERE ProfileId = ? AND Provider = ? AND ExternalId = ?`)
    .get(profileId, provider, String(externalId));
}

// Vistas desde `sinceIso` (inclusive). Sin `sinceIso` devuelve todas las del perfil.
export function listSeen(db, profileId, sinceIso = null) {
  if (sinceIso) {
    return db
      .prepare(`SELECT ${SEEN_SELECT} WHERE ProfileId = ? AND SeenAt >= ?`)
      .all(profileId, sinceIso);
  }
  return db.prepare(`SELECT ${SEEN_SELECT} WHERE ProfileId = ?`).all(profileId);
}

// Poda las vistas anteriores a `beforeIso` (vencidas). Devuelve cuántas borró.
export function pruneSeen(db, profileId, beforeIso) {
  return db
    .prepare('DELETE FROM RecommendationSeen WHERE ProfileId = ? AND SeenAt < ?')
    .run(profileId, beforeIso).changes;
}
