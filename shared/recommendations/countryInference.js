import { normalizePublisher } from './normalize.js';

function getPublisherName(entry) {
    return entry?.manga?.publisher?.name || entry?.manga?.publisher || entry?.publisher || '';
}

function getOwnedVolumes(entry) {
    const rawQuantity = Number(entry?.quantity);
    if (Number.isFinite(rawQuantity)) {
        return Math.max(rawQuantity, 0);
    }

    return entry ? 1 : 0;
}

export function inferUserCountry(entries = [], publisherCountries = {}) {
    const totalsByCountry = new Map();

    for (const entry of entries) {
        const publisherKey = normalizePublisher(getPublisherName(entry));
        const country = publisherCountries[publisherKey] || null;
        const ownedVolumes = getOwnedVolumes(entry);

        if (!country || ownedVolumes <= 0) {
            continue;
        }

        const current = totalsByCountry.get(country) || {
            country,
            volumeCount: 0,
            seriesCount: 0,
            publishers: new Set(),
        };

        current.volumeCount += ownedVolumes;
        current.seriesCount += 1;
        current.publishers.add(publisherKey);
        totalsByCountry.set(country, current);
    }

    const breakdown = Array.from(totalsByCountry.values())
        .map(item => ({
            country: item.country,
            volumeCount: item.volumeCount,
            seriesCount: item.seriesCount,
            publishers: Array.from(item.publishers).sort(),
        }))
        .sort((left, right) => {
            if (right.volumeCount !== left.volumeCount) {
                return right.volumeCount - left.volumeCount;
            }

            if (right.seriesCount !== left.seriesCount) {
                return right.seriesCount - left.seriesCount;
            }

            return left.country.localeCompare(right.country);
        });

    const leader = breakdown[0] || null;
    const runnerUp = breakdown[1] || null;

    if (!leader) {
        return {
            country: null,
            isConfident: false,
            breakdown,
        };
    }

    const tiedOnVolumes = runnerUp && runnerUp.volumeCount === leader.volumeCount;
    const tiedOnSeries = runnerUp && runnerUp.seriesCount === leader.seriesCount;

    if (tiedOnVolumes && tiedOnSeries) {
        return {
            country: null,
            isConfident: false,
            breakdown,
        };
    }

    return {
        country: leader.country,
        isConfident: leader.volumeCount > 0,
        breakdown,
    };
}