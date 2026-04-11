# Manga Recommendations Plan - 2026-04-10

Status: DONE
Execution branch: `develop`
Merge target: `main` via PR

## Context Map: Hybrid AI Recommendations for Unowned Manga

### Primary Files (Direct Modifications)
- `shared/recommendations/catalog.json` - canonical offline catalog of recommendable titles not already owned by the user.
- `shared/recommendations/publisher-countries.json` - canonical publisher-to-country map used to infer the user's country and block imports.
- `shared/recommendations/normalize.js` - shared title and publisher normalization helpers.
- `shared/recommendations/countryInference.js` - shared logic to infer the user's country from owned volumes per publisher.
- `shared/recommendations/recommendationEngine.js` - shared local recommender used by Pages and as the backend fallback in the main system.
- `MangaCount.Server/Services/Contracts/IRecommendationService.cs` - contract for main-system recommendations.
- `MangaCount.Server/Services/Contracts/IRecommendationRankingProvider.cs` - abstraction for optional remote model reranking.
- `MangaCount.Server/Services/RecommendationService.cs` - orchestrates GitHub Models, OpenRouter, and local fallback.
- `MangaCount.Server/Services/GitHubModelsRankingProvider.cs` - primary backend-only reranker.
- `MangaCount.Server/Services/OpenRouterRankingProvider.cs` - free-model backend fallback reranker.
- `MangaCount.Server/Controllers/RecommendationController.cs` - endpoint consumed by the main React app.
- `MangaCount.Server/Configs/CustomExtensions.cs` - dependency injection for the new recommendation services.
- `MangaCount.Server/appsettings.Development.json` - optional non-secret feature flags and timeout defaults for local development.
- `mangacount.client/vite.config.js` - allow the main app to import the shared recommendation fallback module if needed.
- `Pages/vite.config.js` - allow the Pages app to import the same shared recommendation module.
- `mangacount.client/src/App.jsx` - hold modal open state and recommendation results in the main app.
- `mangacount.client/src/components/Sidebar.jsx` - add the discreet recommendation trigger in the main app.
- `mangacount.client/src/components/Sidebar.css` - style the discreet recommendation button.
- `mangacount.client/src/components/RecommendationModal.jsx` - main app recommendation window with close button.
- `mangacount.client/src/components/RecommendationModal.css` - main app modal styling.
- `Pages/src/App.jsx` - hold modal open state and recommendation results in the Pages app.
- `Pages/src/components/Sidebar.jsx` - add the same recommendation trigger in Pages.
- `Pages/src/components/Sidebar.css` - style the Pages recommendation button.
- `Pages/src/components/RecommendationModal.jsx` - Pages recommendation window with close button.
- `Pages/src/components/RecommendationModal.css` - Pages modal styling.
- `Pages/package.json` - add test scripts and test dependencies, because Pages currently has none.
- `Pages/vitest.config.js` - add Pages test runner config.
- `Pages/src/test/setup.js` - shared test bootstrapping for Pages.
- `Pages/src/test/test-utils.jsx` - Pages render helper with providers.
- `.github/workflows/pages.yml` - optionally run Pages tests before building the demo.

### Affected Files (May Need Updates)
- `mangacount.client/src/test/components/Sidebar.test.jsx` - cover the new recommendation trigger in the main app.
- `mangacount.client/src/test/App.test.jsx` - cover modal open/close flow in the main app.
- `mangacount.client/src/test/setup.js` - update mocks if the new modal or endpoint calls affect current tests.
- `MangaCount.Server/Program.cs` - only if HTTP client configuration or named clients are introduced for model providers.
- `Pages/src/components/CollectionView.jsx` - only if the final UX needs the modal to render from collection view instead of `App.jsx`.
- `README.md` - document the shared catalog, backend provider chain, and recommendation rules after implementation.

### Test Coverage
- `MangaCount.Server.Tests/Services/RecommendationServiceTests.cs` - provider-chain tests for GitHub Models fallback to OpenRouter and then local ranking.
- `mangacount.client/src/test/recommendations/recommendationEngine.test.js` - new unit coverage for country inference, unseen-title filtering, and local-only availability.
- `mangacount.client/src/test/components/RecommendationModal.test.jsx` - new UI coverage for result rendering and close behavior.
- `mangacount.client/src/test/components/Sidebar.test.jsx` - extend existing sidebar tests for the discreet button.
- `Pages/src/test/recommendations/recommendationEngine.test.js` - new shared-engine smoke coverage from the Pages app.
- `Pages/src/test/components/RecommendationModal.test.jsx` - new UI coverage for Pages.

### Suggested Change Order
1. Add the shared offline data and scoring contract.
2. Add the shared local recommendation engine and its first failing tests.
3. Add the backend provider chain for the main system: GitHub Models, then OpenRouter, then local fallback.
4. Integrate the main React app with the backend endpoint and cover the button/modal flow.
5. Add a minimal test harness to Pages.
6. Integrate the shared local engine into Pages and cover the button/modal flow there.
7. Add CI and docs updates.
8. Run final verification, push `develop`, and open a PR into `main`.

### Risks
- There is no existing unseen-title catalog in the repo, so this feature cannot work in Pages without a checked-in dataset.
- GitHub Models and OpenRouter are not truly `no-key`; both require server-side credentials and quota management. They must remain optional enhancements, not the only implementation path.
- GitHub Pages cannot safely call GitHub Models or OpenRouter directly because the keys would ship to the browser.
- Publisher names such as `Panini` can be country-ambiguous; the country map must either disambiguate them or exclude them from country inference weight.
- The requirement says `prevent imports`, so the engine must prefer returning fewer than 10 results over showing foreign titles when the local catalog is too small.
- Free-tier model availability and latency can fluctuate, so the backend must fail fast into the local ranking path.
- Pages currently has no automated tests, so parity will drift unless a minimal test harness is added during the feature work.

## Finalized Product Decisions

1. The system recommends manga the user does not already own. Ownership is determined by normalized title comparison against the current collection.
2. The recommendation pool comes from a checked-in offline catalog shared by the main app and the Pages app. This remains mandatory because Pages has no backend and the loaded TSV only contains owned titles.
3. The AI architecture is hybrid. The main system may optionally rerank candidates through GitHub Models first and free OpenRouter models second, but only from the backend and only when credentials are present.
4. The shared local engine remains mandatory. It is the only engine used by Pages and the final fallback used by the main system when remote providers are unavailable, disabled, or over quota.
5. All secrets stay server-side in environment variables. No provider keys are stored in the React app, the Pages app, or tracked config files.
6. The user's country is inferred by summing owned volumes per publisher country. The dominant country wins.
7. Imports are blocked strictly. Any candidate whose publisher country does not match the inferred country is excluded before any remote model sees the candidate list.
8. If fewer than 10 in-country unseen titles remain after filtering, the UI shows the available count with a note explaining that imports were blocked.
9. The UI surface is a small secondary button that opens a modal-style window containing the recommendations and a close button. Closing the window returns the user to the collection with no state reset.

## Provider Strategy

1. The shared local engine performs all hard rules: ownership exclusion, country inference, publisher-country filtering, and base scoring.
2. In the main system only, the backend can pass the top local candidates to GitHub Models for reranking.
3. If GitHub Models fails, times out, or is disabled, the backend tries a free OpenRouter model.
4. If OpenRouter fails, times out, or is disabled, the backend returns the local ranking unchanged.
5. Pages never calls a remote model provider. It always uses the shared local engine directly.

## Shared Data Contract

### Catalog Shape
Each entry in `shared/recommendations/catalog.json` should include at least:

```json
{
  "id": "monster-perfect-edition",
  "title": "Monster",
  "publisher": "Planeta Comic",
  "publisherCountry": "Spain",
  "format": "Kanzenban",
  "demographic": "Seinen",
  "genres": ["Mystery", "Thriller", "Psychological"],
  "themes": ["Crime", "Conspiracy", "Medical"],
  "volumes": 9,
  "summary": "A surgeon becomes entangled in a long-running serial murder case."
}
```

### Publisher Country Map Shape
`shared/recommendations/publisher-countries.json` should map normalized publisher names to a single country or `null` when ambiguous:

```json
{
  "ivrea": "Argentina",
  "ovni press": "Argentina",
  "norma editorial": "Spain",
  "ecc ediciones": "Spain",
  "panini": null
}
```

### Shared Engine API
`shared/recommendations/recommendationEngine.js` should expose:

```js
export function normalizeTitle(title) {}
export function inferUserCountry(entries, publisherCountries) {}
export function buildUserTasteProfile(entries, catalog) {}
export function recommendManga({ entries, catalog, publisherCountries, limit = 10 }) {}
```

### Backend Provider API
`MangaCount.Server` should expose:

```csharp
public interface IRecommendationService
{
  Task<RecommendationResponse> GetRecommendationsAsync(int profileId, int limit = 10, CancellationToken ct = default);
}

public interface IRecommendationRankingProvider
{
  Task<IReadOnlyList<RecommendationCandidate>> RerankAsync(RecommendationContext context, CancellationToken ct);
}
```

The backend service should:
1. Load the user's entries.
2. Build the safe candidate list locally.
3. Attempt reranking through GitHub Models.
4. Fall back to OpenRouter if the first provider fails.
5. Fall back to the local ranking if both remote providers fail.

### Scoring Rules
1. Normalize owned titles and remove any candidate already in the collection.
2. Infer the user's country from owned volumes grouped by publisher country.
3. Exclude candidates whose `publisherCountry` does not match the inferred country.
4. Build a taste vector from owned-title metadata using tokens from `title`, `genres`, `themes`, `demographic`, `format`, `publisher`, and `summary`.
5. Score unseen in-country candidates with cosine similarity against the user's taste vector.
6. Add a small boost for the user's dominant local publishers so the system gives priority to the publishers of the inferred country.
7. In the main system only, optionally rerank the best local candidates through GitHub Models and then OpenRouter.
8. Sort descending and return the top 10 or fewer if the strict no-import filter leaves fewer matches.

### Country Tie Breaker
If volume totals tie across countries:
1. Break ties by number of owned series from that country.
2. If still tied, prefer the country of the most recently added owned title when data exists.
3. If no tie can be broken, show `Country could not be inferred confidently` and do not display recommendations until the collection contains enough unambiguous publisher data.

## Task Breakdown

### Task 1. Start on `develop` and create the shared recommendation scaffold
Goal: establish the branch and file layout that both frontends can consume.

Files:
- `shared/recommendations/catalog.json`
- `shared/recommendations/publisher-countries.json`
- `shared/recommendations/normalize.js`
- `shared/recommendations/countryInference.js`
- `shared/recommendations/recommendationEngine.js`
- `mangacount.client/vite.config.js`
- `Pages/vite.config.js`

Test first:
- Confirm the current branch flow before editing.

Commands:
```bash
git checkout develop
git pull origin develop
git branch --show-current
```

Expected output:
- Final command prints `develop`.

Implement:
- Create the shared recommendation folder.
- Seed a small catalog with enough in-country titles to return meaningful results.
- Add publisher-country mappings, marking ambiguous names as `null`.
- Update both Vite configs to allow imports from the shared folder.

Verify pass:
```bash
cd mangacount.client && npm run build
cd ../Pages && npm run build
```

Expected output:
- Both builds complete without path resolution errors.

Suggested commit:
```bash
git add shared/recommendations mangacount.client/vite.config.js Pages/vite.config.js
git commit -m "feat: add shared offline recommendation dataset scaffold"
```

### Task 2. Write failing engine tests in the main app
Goal: lock the business rules before implementing the scorer.

Files:
- `mangacount.client/src/test/recommendations/recommendationEngine.test.js`

Test first:
- Add tests that fail because the shared engine is still a stub.

Required failing cases:
1. `inferUserCountry` picks the country with the highest owned-volume total.
2. `recommendManga` excludes titles already owned by normalized title match.
3. `recommendManga` excludes foreign-country titles when `prevent imports` is enabled.
4. `recommendManga` returns fewer than 10 results instead of using imports.
5. Ambiguous publishers do not decide the country on their own.

Commands:
```bash
cd mangacount.client
npm test -- --run recommendationEngine.test.js
```

Expected output:
- Test run fails with missing implementation or assertion failures.

Implement:
- Fill `normalize.js`, `countryInference.js`, and `recommendationEngine.js` with pure functions.
- Keep the scorer dependency-free so it works in both Vite apps and in Vitest.

Verify pass:
```bash
cd mangacount.client
npm test -- --run recommendationEngine.test.js
```

Expected output:
- All recommendation engine tests pass.

Suggested commit:
```bash
git add shared/recommendations mangacount.client/src/test/recommendations/recommendationEngine.test.js
git commit -m "feat: add local recommendation engine for unowned manga"
```

### Task 3. Add the backend provider chain and recommendation endpoint
Goal: let the main system use GitHub Models with OpenRouter fallback without exposing secrets to the client.

Files:
- `MangaCount.Server/Services/Contracts/IRecommendationService.cs`
- `MangaCount.Server/Services/Contracts/IRecommendationRankingProvider.cs`
- `MangaCount.Server/Services/RecommendationService.cs`
- `MangaCount.Server/Services/GitHubModelsRankingProvider.cs`
- `MangaCount.Server/Services/OpenRouterRankingProvider.cs`
- `MangaCount.Server/Controllers/RecommendationController.cs`
- `MangaCount.Server/Configs/CustomExtensions.cs`
- `MangaCount.Server/appsettings.Development.json`
- `MangaCount.Server.Tests/Services/RecommendationServiceTests.cs`

Test first:
- Add failing service tests for provider order, timeout fallback, and strict no-import filtering.

Commands:
```bash
dotnet test MangaCount.Server.Tests --filter RecommendationServiceTests
```

Expected output:
- Tests fail because the service and providers do not exist yet.

Implement:
- Build the recommendation service around the shared local engine.
- Filter and score candidates locally first.
- Add GitHub Models reranking as the first optional provider.
- Add OpenRouter free-model reranking as the second optional provider.
- Keep both providers disabled unless their environment variables are present.
- Return the local ranking when both providers fail or are unavailable.

Verify pass:
```bash
dotnet test MangaCount.Server.Tests --filter RecommendationServiceTests
```

Expected output:
- Recommendation service tests pass, including fallback-chain assertions.

Suggested commit:
```bash
git add MangaCount.Server/Services MangaCount.Server/Controllers/RecommendationController.cs MangaCount.Server/Configs/CustomExtensions.cs MangaCount.Server/appsettings.Development.json MangaCount.Server.Tests/Services/RecommendationServiceTests.cs
git commit -m "feat: add backend recommendation provider chain"
```

### Task 4. Add the main-app button and modal flow
Goal: surface recommendations in the API-backed app without changing collection state.

Files:
- `mangacount.client/src/App.jsx`
- `mangacount.client/src/components/Sidebar.jsx`
- `mangacount.client/src/components/Sidebar.css`
- `mangacount.client/src/components/RecommendationModal.jsx`
- `mangacount.client/src/components/RecommendationModal.css`
- `mangacount.client/src/test/components/Sidebar.test.jsx`
- `mangacount.client/src/test/components/RecommendationModal.test.jsx`

Test first:
- Extend existing sidebar tests with a recommendation button assertion.
- Add modal tests for open, render top results, and close.

Commands:
```bash
cd mangacount.client
npm test -- --run Sidebar.test.jsx RecommendationModal.test.jsx
```

Expected output:
- Tests fail because the button and modal do not exist yet.

Implement:
- Add a small secondary button in `Sidebar.jsx`, disabled only when the collection has insufficient data.
- Call the backend recommendation endpoint from the main app.
- If the endpoint fails, optionally fall back to the shared local engine so the feature still works in local development.
- Render a modal window with exactly the recommendation list, inferred country, provider used, and a close button.
- Preserve the current collection view state when the modal closes.

Verify pass:
```bash
cd mangacount.client
npm test -- --run Sidebar.test.jsx RecommendationModal.test.jsx
npm run build
```

Expected output:
- UI tests pass and the build succeeds.

Suggested commit:
```bash
git add mangacount.client/src/App.jsx mangacount.client/src/components/Sidebar.jsx mangacount.client/src/components/Sidebar.css mangacount.client/src/components/RecommendationModal.jsx mangacount.client/src/components/RecommendationModal.css mangacount.client/src/test/components/Sidebar.test.jsx mangacount.client/src/test/components/RecommendationModal.test.jsx
git commit -m "feat: add recommendation modal to main client"
```

### Task 5. Add a minimal Pages test harness
Goal: make the Pages demo verifiable before wiring the same feature there.

Files:
- `Pages/package.json`
- `Pages/vitest.config.js`
- `Pages/src/test/setup.js`
- `Pages/src/test/test-utils.jsx`

Test first:
- Add a smoke test command before the harness exists.

Commands:
```bash
cd Pages
npm test -- --run
```

Expected output:
- The command fails because there is no test script yet.

Implement:
- Add `vitest`, Testing Library, `jsdom`, and a `test` script.
- Add a minimal test config and setup file mirroring the main app pattern.

Verify pass:
```bash
cd Pages
npm install
npm test -- --run
```

Expected output:
- Vitest starts successfully, even if there are no feature tests yet.

Suggested commit:
```bash
git add Pages/package.json Pages/package-lock.json Pages/vitest.config.js Pages/src/test/setup.js Pages/src/test/test-utils.jsx
git commit -m "test: add vitest harness for pages demo"
```

### Task 6. Add the Pages button and modal flow using the same engine
Goal: keep feature parity between the Pages demo and the main app.

Files:
- `Pages/src/App.jsx`
- `Pages/src/components/Sidebar.jsx`
- `Pages/src/components/Sidebar.css`
- `Pages/src/components/RecommendationModal.jsx`
- `Pages/src/components/RecommendationModal.css`
- `Pages/src/test/recommendations/recommendationEngine.test.js`
- `Pages/src/test/components/RecommendationModal.test.jsx`

Test first:
- Add Pages tests for the modal and shared-engine smoke behavior.

Commands:
```bash
cd Pages
npm test -- --run recommendationEngine.test.js RecommendationModal.test.jsx
```

Expected output:
- Tests fail because the Pages integration does not exist yet.

Implement:
- Reuse the shared engine with locally parsed TSV entries.
- Add the same discreet button and modal behavior as the main app.
- Keep the Pages demo fully client-side and in-memory.

Verify pass:
```bash
cd Pages
npm test -- --run recommendationEngine.test.js RecommendationModal.test.jsx
npm run build
```

Expected output:
- Pages tests pass and `dist/` builds successfully.

Suggested commit:
```bash
git add Pages/src/App.jsx Pages/src/components/Sidebar.jsx Pages/src/components/Sidebar.css Pages/src/components/RecommendationModal.jsx Pages/src/components/RecommendationModal.css Pages/src/test/recommendations/recommendationEngine.test.js Pages/src/test/components/RecommendationModal.test.jsx
git commit -m "feat: add recommendation modal to pages demo"
```

### Task 7. Add CI coverage and document the hybrid provider contract
Goal: keep the Pages demo from regressing and explain how the dataset and backend provider chain must be maintained.

Files:
- `.github/workflows/pages.yml`
- `README.md`
- `shared/recommendations/README.md`

Test first:
- Review the current Pages workflow, which only installs and builds.

Commands:
```bash
sed -n '1,220p' .github/workflows/pages.yml
```

Expected output:
- The workflow shows build-only behavior.

Implement:
- Add `npm test -- --run` before `npm run build` in the Pages workflow.
- Document how to update `catalog.json` and `publisher-countries.json`.
- Document the backend provider chain: GitHub Models, then OpenRouter, then local fallback.
- Document the strict no-import behavior and the fallback when fewer than 10 results exist.
- Document that provider secrets must come from environment variables only.

Verify pass:
```bash
cd Pages && npm test -- --run && npm run build
cd .. && git diff -- .github/workflows/pages.yml README.md shared/recommendations/README.md
```

Expected output:
- Pages tests and build pass; docs clearly describe the feature and data files.

Suggested commit:
```bash
git add .github/workflows/pages.yml README.md shared/recommendations/README.md
git commit -m "docs: document hybrid recommendation system"
```

### Task 8. Final full-repo verification and PR handoff
Goal: verify the finished feature before opening the PR.

Commands:
```bash
cd /mnt/Files-2tb/repos/MangaCount
git status --short
cd mangacount.client && npm test -- --run && npm run build
cd ../Pages && npm test -- --run && npm run build
```

Expected output:
- Clean, intentional file list in `git status`.
- All main-client tests pass.
- All Pages tests pass.
- Both builds succeed.

Push and PR:
```bash
cd /mnt/Files-2tb/repos/MangaCount
git push origin develop
```

PR target:
- Source branch: `develop`
- Target branch: `main`
- Suggested PR title: `feat: add offline country-aware manga recommendations`

## Review Checklist

1. Recommendations never include titles already owned by the user.
2. Recommendations never include publishers outside the inferred country.
3. The inferred country is explainable from the owned collection breakdown.
4. The main system uses the provider chain in this order: GitHub Models, then OpenRouter, then local fallback.
5. Pages never exposes provider credentials and always uses the local engine.
6. The button is discreet and does not disrupt the current collection view.
7. The modal can be closed cleanly in both apps.
8. Pages and the main app produce the same results when the main app falls back to the local engine.
9. The feature still works when there are fewer than 10 valid local titles.

## Execution Notes

- Do not add backend schema changes in v1. The Pages requirement is still best served by a shared offline dataset and a local recommendation engine.
- GitHub Models and OpenRouter should be treated as optional backend rerankers, not as the only recommendation implementation.
- Provider credentials must be injected through environment variables and never committed to `appsettings.json`, the React app, or the Pages app.
- All hard business rules must execute locally before any remote model is called.
- If ambiguous publisher names become a real accuracy problem, a follow-up phase can normalize publisher country in the backend database, but that is not required to ship the first version.