// División de respuestas del bot para el límite de mensajes de Discord.
//
// Un mensaje de Discord admite 2000 caracteres; dejamos margen para el
// indicador de continuación y cortamos por líneas (nunca por la mitad).

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
    // Línea indivisible: se parte como último recurso.
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
