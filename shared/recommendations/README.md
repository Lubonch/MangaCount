# Recommendation Data Contract

This folder contains the offline data that powers the recommendation feature in both frontends and the local fallback in the backend.

For the full system design, teaching-oriented explanation, and architecture diagrams, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Files

- `catalog.json`: known manga titles with metadata used for scoring and ranking.
- `publisher-countries.json`: normalized publisher-to-country map used to infer the user's market and block imports.

## Catalog Rules

Each catalog entry should include:

- `id`: stable slug used for reranking.
- `title`: display name of the manga.
- `publisher`: publisher name as shown in the UI.
- `publisherCountry`: country used by the import-blocking rule.
- `format`: edition or print format.
- `demographic`: shonen, seinen, shojo, josei, or equivalent.
- `genres`: short genre labels.
- `themes`: short theme labels.
- `volumes`: optional total volume count.
- `summary`: short text used for token overlap scoring.

## Country Inference Rule

1. Normalize the owned publishers.
2. Map them through `publisher-countries.json`.
3. Sum owned volumes per country.
4. Pick the country with the highest total.
5. If the top countries tie on both volumes and series count, do not infer a country.

## Hard Recommendation Rules

1. Never recommend a manga the user already owns.
2. Never recommend a title whose publisher country differs from the inferred country.
3. Return fewer than 10 results if the local market does not contain enough valid options.

## Backend Provider Chain

The backend recommendation endpoint always builds a safe local candidate list first.

Provider order:

1. `github-models`
2. `openrouter`
3. local fallback

Remote providers are optional and must be configured only through environment variables.

Expected environment variables:

- `MANGACOUNT_GITHUB_MODELS_ENDPOINT`
- `MANGACOUNT_GITHUB_MODELS_API_KEY`
- `MANGACOUNT_GITHUB_MODELS_MODEL`
- `MANGACOUNT_OPENROUTER_API_KEY`
- `MANGACOUNT_OPENROUTER_MODEL`
- `MANGACOUNT_OPENROUTER_ENDPOINT` (optional because the default OpenRouter endpoint is bundled)

Never place provider secrets in tracked frontend files or `appsettings.json`.