function normalizeWhatsAppNumber(value) {
    if (!value) {
        return '';
    }

    return String(value)
        .trim()
        .replace(/@.*$/, '')
        .replace(/\D/g, '');
}

function parseAllowedNumbers(rawValue = process.env.WHATSAPP_ALLOWED_NUMBERS || '') {
    const numbers = rawValue
        .split(',')
        .map(normalizeWhatsAppNumber)
        .filter(Boolean);

    return [...new Set(numbers)];
}

function isNumberAllowed(from, rawValue = process.env.WHATSAPP_ALLOWED_NUMBERS || '') {
    const normalizedFrom = normalizeWhatsAppNumber(from);
    const allowedNumbers = parseAllowedNumbers(rawValue);

    if (!normalizedFrom || allowedNumbers.length === 0) {
        return false;
    }

    return allowedNumbers.includes(normalizedFrom);
}

function getAllowedNumberCount(rawValue = process.env.WHATSAPP_ALLOWED_NUMBERS || '') {
    return parseAllowedNumbers(rawValue).length;
}

module.exports = {
    normalizeWhatsAppNumber,
    parseAllowedNumbers,
    isNumberAllowed,
    getAllowedNumberCount,
};