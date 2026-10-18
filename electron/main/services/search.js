// Collection query logic (search/pending), separated from
// presentation as functions that return data, without transport formatting.
// Consumed by the Discord bot and any other consumer; formatting lives
// in the presentation layer.
//
// Input DTO: `{ id, quantity, priority, manga: { name, volumes, format, publisher } }`
// (`listEntries` in db/repositories/entries.js).

export function findEntries(entries, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return [];
  return entries.filter((e) => (e.manga?.name ?? '').toLowerCase().includes(q));
}

// Titles sharing some word (>2) with the query, to suggest.
export function suggestTitles(entries, query, limit = 4) {
  const words = String(query ?? '')
    .toLowerCase()
    .split(' ')
    .filter((w) => w.length > 2);
  if (words.length === 0) return [];
  return entries
    .filter((e) => words.some((w) => (e.manga?.name ?? '').toLowerCase().includes(w)))
    .slice(0, limit)
    .map((e) => e.manga.name);
}

// State derived from an entry: complete when there is a total and it was reached.
export function entryStatus(entry) {
  const total = entry?.manga?.volumes ?? 0;
  const quantity = entry?.quantity ?? 0;
  if (total > 0) {
    return { quantity, total, pending: Math.max(total - quantity, 0), complete: quantity >= total };
  }
  return { quantity, total: 0, pending: null, complete: false };
}

// Ongoing series (with a total) sorted: priority first, then larger pending.
export function pendingEntries(entries) {
  return entries
    .filter((e) => (e?.manga?.volumes ?? 0) > 0 && e.quantity < e.manga.volumes)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return b.manga.volumes - b.quantity - (a.manga.volumes - a.quantity);
    });
}

// Series with gaps: they have a note of non-consecutive volumes.
export function huecosEntries(entries) {
  return (entries ?? []).filter(
    (e) => typeof e?.pending === 'string' && e.pending.trim() !== ''
  );
}

// Series about to complete: known total and 1 or 2 volumes missing.
export function almostCompleteEntries(entries) {
  return (entries ?? [])
    .filter((e) => {
      const total = e?.manga?.volumes ?? 0;
      return total > 0 && e.quantity < total && total - e.quantity <= 2;
    })
    .sort((a, b) => a.manga.volumes - a.quantity - (b.manga.volumes - b.quantity));
}

export function pendingSummary(entries) {
  const pending = pendingEntries(entries);
  return {
    entries: pending,
    count: pending.length,
    totalPending: pending.reduce((acc, e) => acc + (e.manga.volumes - e.quantity), 0),
  };
}

// Search result: matches, or suggestions when there are none.
export function searchResult(entries, query, suggestionLimit = 4) {
  const results = findEntries(entries, query);
  if (results.length > 0) return { results, suggestions: [] };
  return { results: [], suggestions: suggestTitles(entries, query, suggestionLimit) };
}
