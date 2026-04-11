export function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\b(kanzenban|deluxe|perfect edition|perfect|edition|edicion|volumen|volumes|volume|part|parte)\b/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeTitle(title) {
    return normalizeText(title);
}

export function normalizePublisher(publisher) {
    return normalizeText(publisher);
}

export function tokenizeText(value) {
    return normalizeText(value)
        .split(' ')
        .map(token => token.trim())
        .filter(token => token.length > 1);
}