// Splitting of bot replies for Discord's message limit.
//
// A Discord message allows 2000 characters; we leave margin for the
// continuation indicator and cut by lines (never in the middle).

export const DISCORD_MESSAGE_LIMIT = 2000;
export const CHUNK_LIMIT = 1900;

export function splitMessage(text, { limit = CHUNK_LIMIT } = {}) {
  const raw = String(text ?? '');
  if (raw.length <= limit) return [raw];

  const chunks = [];
  let current = '';
  const flush = () => {
    if (current) {
      chunks.push(current);
      current = '';
    }
  };

  for (const line of raw.split('\n')) {
    // Indivisible line: split as a last resort.
    if (line.length > limit) {
      flush();
      for (let i = 0; i < line.length; i += limit) chunks.push(line.slice(i, i + limit));
      continue;
    }
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > limit) {
      flush();
      current = line;
    } else {
      current = candidate;
    }
  }
  flush();

  if (chunks.length <= 1) return chunks;
  const total = chunks.length;
  return chunks.map((chunk, index) => `${chunk}\n\n(${index + 1}/${total})`);
}
