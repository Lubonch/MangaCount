import { inferUserCountry } from './countryInference.js';
import { normalizePublisher, normalizeText, normalizeTitle, tokenizeText } from './normalize.js';

function getEntryTitle(entry) {
    return entry?.manga?.name || entry?.title || '';
}

function getEntryPublisher(entry) {
    return entry?.manga?.publisher?.name || entry?.manga?.publisher || entry?.publisher || '';
}

function getEntryFormat(entry) {
    return entry?.manga?.format?.name || entry?.manga?.format || entry?.format || '';
}

function getEntryQuantity(entry) {
    const rawQuantity = Number(entry?.quantity);
    if (Number.isFinite(rawQuantity)) {
        return Math.max(rawQuantity, 0);
    }

    return entry ? 1 : 0;
}

function addWeight(target, key, weight) {
    if (!key || !weight) {
        return;
    }

    target[key] = (target[key] || 0) + weight;
}

function addTokens(target, value, weight) {
    for (const token of tokenizeText(value)) {
        addWeight(target, token, weight);
    }
}

function addCollection(target, values, weight) {
    for (const value of values || []) {
        addTokens(target, value, weight);
    }
}

function buildCatalogIndex(catalog = []) {
    return new Map(
        catalog.map(item => [normalizeTitle(item.title), item])
    );
}

function buildCandidateTokenWeights(candidate) {
    const tokenWeights = {};

    addTokens(tokenWeights, candidate.title, 2.5);
    addTokens(tokenWeights, candidate.publisher, 1.1);
    addTokens(tokenWeights, candidate.format, 1.2);
    addTokens(tokenWeights, candidate.demographic, 1.8);
    addCollection(tokenWeights, candidate.genres, 2.4);
    addCollection(tokenWeights, candidate.themes, 2.1);
    addTokens(tokenWeights, candidate.summary, 1);

    return tokenWeights;
}

function cosineSimilarity(leftWeights, rightWeights) {
    const leftEntries = Object.entries(leftWeights);
    const rightEntries = Object.entries(rightWeights);

    if (leftEntries.length === 0 || rightEntries.length === 0) {
        return 0;
    }

    let dotProduct = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;

    for (const [, weight] of leftEntries) {
        leftMagnitude += weight * weight;
    }

    for (const [token, weight] of rightEntries) {
        rightMagnitude += weight * weight;
        dotProduct += (leftWeights[token] || 0) * weight;
    }

    if (!leftMagnitude || !rightMagnitude) {
        return 0;
    }

    return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function getTopMatches(profileWeights, candidateWeights, count = 3) {
    return Object.keys(candidateWeights)
        .filter(token => profileWeights[token])
        .sort((left, right) => {
            const rightScore = profileWeights[right] * candidateWeights[right];
            const leftScore = profileWeights[left] * candidateWeights[left];
            return rightScore - leftScore;
        })
        .slice(0, count);
}

export function buildUserTasteProfile(entries = [], catalog = []) {
    const tokenWeights = {};
    const localPublisherWeights = {};
    const formatWeights = {};
    const demographicWeights = {};
    const ownedTitles = new Set(
        entries
            .filter(entry => getEntryQuantity(entry) > 0)
            .map(entry => normalizeTitle(getEntryTitle(entry)))
            .filter(Boolean)
    );
    const catalogIndex = buildCatalogIndex(catalog);

    for (const entry of entries) {
        const quantity = getEntryQuantity(entry);
        if (quantity <= 0) {
            continue;
        }

        const title = getEntryTitle(entry);
        const publisherKey = normalizePublisher(getEntryPublisher(entry));
        const formatKey = normalizeText(getEntryFormat(entry));
        const catalogMatch = catalogIndex.get(normalizeTitle(title));

        addTokens(tokenWeights, title, 0.9 * quantity);
        addWeight(localPublisherWeights, publisherKey, quantity);
        addWeight(formatWeights, formatKey, quantity);

        if (publisherKey) {
            addTokens(tokenWeights, publisherKey, 0.5 * quantity);
        }

        if (formatKey) {
            addTokens(tokenWeights, formatKey, 0.5 * quantity);
        }

        if (!catalogMatch) {
            continue;
        }

        addCollection(tokenWeights, catalogMatch.genres, 2.4 * quantity);
        addCollection(tokenWeights, catalogMatch.themes, 2.1 * quantity);
        addTokens(tokenWeights, catalogMatch.summary, 0.9 * quantity);
        addTokens(tokenWeights, catalogMatch.demographic, 1.3 * quantity);

        const demographicKey = normalizeText(catalogMatch.demographic);
        addWeight(demographicWeights, demographicKey, quantity);
    }

    return {
        tokenWeights,
        localPublisherWeights,
        formatWeights,
        demographicWeights,
        ownedTitles,
    };
}

function scoreCandidate(candidate, profile) {
    const candidateTokenWeights = buildCandidateTokenWeights(candidate);
    const similarity = cosineSimilarity(profile.tokenWeights, candidateTokenWeights);
    const publisherKey = normalizePublisher(candidate.publisher);
    const formatKey = normalizeText(candidate.format);
    const demographicKey = normalizeText(candidate.demographic);
    const publisherBoost = (profile.localPublisherWeights[publisherKey] || 0) * 0.02;
    const formatBoost = (profile.formatWeights[formatKey] || 0) * 0.015;
    const demographicBoost = (profile.demographicWeights[demographicKey] || 0) * 0.02;
    const score = similarity + publisherBoost + formatBoost + demographicBoost;
    const reasons = getTopMatches(profile.tokenWeights, candidateTokenWeights)
        .slice(0, 3)
        .map(token => token.replace(/\b\w/g, character => character.toUpperCase()));

    return {
        score,
        reasons,
    };
}

export function recommendManga({ entries = [], catalog = [], publisherCountries = {}, limit = 10 } = {}) {
    const inference = inferUserCountry(entries, publisherCountries);
    const profile = buildUserTasteProfile(entries, catalog);

    if (!inference.country || !inference.isConfident) {
        return {
            provider: 'local',
            inferredCountry: null,
            isConfident: false,
            availableCount: 0,
            blockedByImportCount: 0,
            items: [],
            limit,
            inference,
        };
    }

    let blockedByImportCount = 0;
    const rankedItems = [];

    for (const candidate of catalog) {
        const normalizedCandidateTitle = normalizeTitle(candidate.title);

        if (profile.ownedTitles.has(normalizedCandidateTitle)) {
            continue;
        }

        if (candidate.publisherCountry !== inference.country) {
            blockedByImportCount += 1;
            continue;
        }

        const { score, reasons } = scoreCandidate(candidate, profile);
        rankedItems.push({
            id: candidate.id,
            title: candidate.title,
            publisher: candidate.publisher,
            publisherCountry: candidate.publisherCountry,
            format: candidate.format,
            demographic: candidate.demographic,
            volumes: candidate.volumes ?? null,
            score: Number(score.toFixed(4)),
            reason: reasons.length > 0
                ? `Matches your collection through ${reasons.join(', ')}`
                : 'Matches your local collection profile',
        });
    }

    rankedItems.sort((left, right) => {
        if (right.score !== left.score) {
            return right.score - left.score;
        }

        return left.title.localeCompare(right.title);
    });

    const items = rankedItems.slice(0, limit);

    return {
        provider: 'local',
        inferredCountry: inference.country,
        isConfident: inference.isConfident,
        availableCount: items.length,
        blockedByImportCount,
        items,
        limit,
        inference,
    };
}

export { normalizeTitle, normalizePublisher, tokenizeText } from './normalize.js';
export { inferUserCountry } from './countryInference.js';