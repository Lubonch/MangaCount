// Recommender memory per profile:
// - `dismiss`/`listDismissed`/`clearDismissal`: "not viable" (permanent dismissal).
// - `markSeen`/`listSeen`/`pruneSeen`: "already seen" with expiry (TTL).
// `SeenAt` is stored as ISO 8601 (UTC) so it can be compared as text against the
// TTL cutoff; `CURRENT_TIMESTAMP` (SQLite format, space-separated) is not
// comparable with an ISO, hence the repository receives the date explicitly.
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

// Seen since `sinceIso` (inclusive). Without `sinceIso` returns all of the profile.
export function listSeen(db, profileId, sinceIso = null) {
  if (sinceIso) {
    return db
      .prepare(`SELECT ${SEEN_SELECT} WHERE ProfileId = ? AND SeenAt >= ?`)
      .all(profileId, sinceIso);
  }
  return db.prepare(`SELECT ${SEEN_SELECT} WHERE ProfileId = ?`).all(profileId);
}

// Prunes seen rows older than `beforeIso` (expired). Returns how many it deleted.
export function pruneSeen(db, profileId, beforeIso) {
  return db
    .prepare('DELETE FROM RecommendationSeen WHERE ProfileId = ? AND SeenAt < ?')
    .run(profileId, beforeIso).changes;
}
