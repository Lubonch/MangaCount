// Lógica de consulta de la colección (buscar/pendientes), separada de la
// presentación como funciones que devuelven datos, sin formato de transporte.
// La consumen el bot de Discord y cualquier otro consumidor; el formateo vive
// en la capa de presentación.
//
// DTO de entrada: `{ id, quantity, priority, manga: { name, volumes, format, publisher } }`
// (`listEntries` en db/repositories/entries.js).

export function findEntries(entries, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return [];
  return entries.filter((e) => (e.manga?.name ?? '').toLowerCase().includes(q));
}

// Títulos que comparten alguna palabra (>2) con el query, para sugerir.
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

// Estado derivado de una entry: completo cuando hay total y se alcanzó.
export function entryStatus(entry) {
  const total = entry?.manga?.volumes ?? 0;
  const quantity = entry?.quantity ?? 0;
  if (total > 0) {
    return { quantity, total, pending: Math.max(total - quantity, 0), complete: quantity >= total };
  }
  return { quantity, total: 0, pending: null, complete: false };
}

// Series en curso (con total) ordenadas: primero prioridad, luego mayor pendiente.
export function pendingEntries(entries) {
  return entries
    .filter((e) => (e?.manga?.volumes ?? 0) > 0 && e.quantity < e.manga.volumes)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return b.manga.volumes - b.quantity - (a.manga.volumes - a.quantity);
    });
}

export function pendingSummary(entries) {
  const pending = pendingEntries(entries);
  return {
    entries: pending,
    count: pending.length,
    totalPending: pending.reduce((acc, e) => acc + (e.manga.volumes - e.quantity), 0),
  };
}

// Resultado de búsqueda: coincidencias o sugerencias cuando no hay ninguna.
export function searchResult(entries, query, suggestionLimit = 4) {
  const results = findEntries(entries, query);
  if (results.length > 0) return { results, suggestions: [] };
  return { results: [], suggestions: suggestTitles(entries, query, suggestionLimit) };
}
