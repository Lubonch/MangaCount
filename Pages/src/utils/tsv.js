/**
 * Parse a TSV string into an array of entry objects that match the
 * shape expected by CollectionView (same as the server API).
 *
 * TSV columns: Titulo, Comprados, Total, Pendiente(No consecutivos),
 *              Completa, Prioridad, Formato, Editorial
 */
export function parseTSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Build unique format/publisher maps so we can assign stable ids
    const fmtMap = {};
    const pubMap = {};
    let fmtId = 1;
    let pubId = 1;

    return lines.slice(1)
        .map((line, idx) => {
            const cols = line.split('\t');
            const title     = (cols[0] || '').trim();
            if (!title) return null;

            const total     = parseInt(cols[2]) || 0;
            const bought    = parseInt(cols[1]) || 0;
            const pending   = (cols[3] || '').trim();
            const priority  = (cols[5] || '').trim().toUpperCase() === 'TRUE';
            const fmtName   = (cols[6] || '').trim() || 'Unknown';
            const pubName   = (cols[7] || '').trim() || 'Unknown';

            if (!fmtMap[fmtName]) fmtMap[fmtName] = fmtId++;
            if (!pubMap[pubName]) pubMap[pubName] = pubId++;

            return {
                id: idx + 1,
                quantity: bought,
                priority,
                pending,
                manga: {
                    id: idx + 1,
                    name: title,
                    volumes: total || null,
                    format:    { id: fmtMap[fmtName], name: fmtName },
                    publisher: { id: pubMap[pubName], name: pubName },
                },
            };
        })
        .filter(Boolean);
}

/**
 * Serialize entries array back to TSV string.
 */
export function serializeTSV(entries) {
    const header = 'Titulo\tComprados\tTotal\tPendiente(No consecutivos)\tCompleta\tPrioridad\tFormato\tEditorial';
    const lines = entries.map(e => {
        const complete = e.manga.volumes && e.quantity >= e.manga.volumes;
        return [
            e.manga.name,
            e.quantity,
            e.manga.volumes || '',
            e.pending || '',
            complete ? 'TRUE' : 'FALSE',
            e.priority ? 'TRUE' : 'FALSE',
            e.manga.format?.name || '',
            e.manga.publisher?.name || '',
        ].join('\t');
    });
    return [header, ...lines].join('\n');
}
