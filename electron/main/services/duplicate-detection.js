const STOP_WORDS = new Set([
  'the', 'a', 'an', 'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'of', 'and', 'y', 'e',
  'to', 'in', 'on', 'for', 'with', 'por', 'para',
]);

const FUZZY_THRESHOLD = 0.86;
const CONTAINMENT_SCORE = 0.9;

export function normalizeTitle(title) {
  return String(title ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function titleTokens(title) {
  return normalizeTitle(title)
    .split(' ')
    .filter((token) => token && !STOP_WORDS.has(token));
}

function numericTokens(tokens) {
  return tokens
    .map((token) => {
      const match = /^(\d+)(?:st|nd|rd|th)?$/.exec(token);
      return match ? match[1] : null;
    })
    .filter(Boolean)
    .sort();
}

function numericGuard(a, b) {
  const left = numericTokens(a);
  const right = numericTokens(b);
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, index) => index);
  let current = new Array(cols);

  for (let i = 1; i < rows; i += 1) {
    current[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    [previous, current] = [current, previous];
  }

  return previous[cols - 1];
}

function containsTokens(shortTokens, longTokens) {
  const longSet = new Set(longTokens);
  return shortTokens.every((token) => longSet.has(token));
}

export function titleSimilarity(left, right) {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  if (!a || !b) return null;
  if (a === b) return { score: 1, reason: 'exact' };

  const tokensA = titleTokens(left);
  const tokensB = titleTokens(right);
  if (tokensA.length === 0 || tokensB.length === 0) return null;
  if (!numericGuard(tokensA, tokensB)) return null;

  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longer = shorter === tokensA ? tokensB : tokensA;
  const shorterNormalized = shorter.join(' ');
  if (shorterNormalized.length >= 4 && containsTokens(shorter, longer)) {
    return { score: CONTAINMENT_SCORE, reason: 'containment' };
  }

  const distance = levenshteinDistance(a, b);
  const score = 1 - distance / Math.max(a.length, b.length, 1);
  if (score >= FUZZY_THRESHOLD) return { score, reason: 'fuzzy' };

  return null;
}

function titleOf(candidate) {
  return candidate?.title ?? candidate?.name ?? candidate?.mangaName ?? '';
}

export function findBestCandidate(title, candidates) {
  let best = null;
  for (const candidate of candidates) {
    const similarity = titleSimilarity(title, titleOf(candidate));
    if (!similarity) continue;
    if (
      !best ||
      similarity.score > best.score ||
      (similarity.score === best.score && titleOf(candidate).length < titleOf(best.candidate).length)
    ) {
      best = { candidate, ...similarity };
    }
  }
  return best;
}

function incomingOf(row) {
  return {
    title: row.mangaName,
    quantity: row.quantity,
    totalVolumes: row.totalVolumes,
    pending: row.pending,
    priority: row.priority,
    formatName: row.formatName,
    publisherName: row.publisherName,
  };
}

function existingCandidates(mangas, entriesByManga) {
  return mangas.map((manga) => ({
    source: 'existing',
    mangaId: manga.id,
    title: manga.name,
    volumes: manga.volumes,
    formatName: manga.format?.name ?? 'Unknown',
    publisherName: manga.publisher?.name ?? 'Unknown',
    entry: entriesByManga.get(manga.id) ?? null,
  }));
}

function batchCandidate(row, rowIndex) {
  return {
    source: 'batch',
    rowIndex,
    lineNumber: rowIndex + 2,
    title: row.mangaName,
    volumes: row.totalVolumes ?? 0,
    quantity: row.quantity,
    pending: row.pending,
    formatName: row.formatName,
    publisherName: row.publisherName,
  };
}

export function detectDuplicateCandidates(rows, mangas, entriesByManga = new Map()) {
  const existing = existingCandidates(mangas, entriesByManga);
  const duplicates = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const candidates = existing.concat(rows.slice(0, rowIndex).map((previous, index) => batchCandidate(previous, index)));
    const best = findBestCandidate(row.mangaName, candidates);
    if (!best) continue;

    duplicates.push({
      rowIndex,
      lineNumber: rowIndex + 2,
      incoming: incomingOf(row),
      source: best.candidate.source,
      candidate: best.candidate,
      score: best.score,
      reason: best.reason,
    });
  }

  return duplicates;
}
