# WhatsApp Recommendations, Verification, and README Plan - 2026-04-11

Status: DONE
Execution branch: `develop`
Merge target: `main` via the existing PR

## Scope

This plan covers four workstreams:

1. Verify the recommendation feature end to end now that .NET 8 tests can run locally.
2. Add recommendation access to the WhatsApp bot.
3. Add a whitelist configuration so only approved phone numbers can interact with the bot.
4. Rewrite the root README so it is sober, operational, and free of badges, emojis, and marketing copy.

## Task List

### Task 1. Lock the verification baseline and identify any remaining gaps
Goal: confirm the current recommendation feature is green before extending it.

Files to inspect:
- `MangaCount.Server.Tests/**`
- `mangacount.client/package.json`
- `Pages/package.json`
- `.github/workflows/pages.yml`

Verify current state:
```bash
dotnet test MangaCount.Server.Tests --verbosity minimal
cd mangacount.client && npm test -- --run && npm run build
cd ../Pages && npm test -- --run && npm run build
```

Expected result:
- backend recommendation tests pass
- both frontend test suites pass
- both frontend builds pass
- any remaining gap is documented explicitly, not assumed away

Commit boundary:
- no commit unless verification exposes repo changes that need fixing

### Task 2. Add a bot command for recommendations
Goal: allow a WhatsApp user with a selected profile to request recommendations from the backend.

Files:
- `WhatsappBot/src/api.js`
- `WhatsappBot/src/router.js`
- `WhatsappBot/src/commands/recomendar.js` or equivalent new command file

Fail-first check:
- add bot tests for a recommendation command before implementation

Implementation:
- add an API wrapper for `GET /api/recommendation?profileId={id}&limit=10`
- add a bot command such as `recomendar`
- format successful results for chat output
- handle no-results and low-confidence responses clearly

Pass check:
- bot tests for success, empty results, and low-confidence responses pass

Commit:
- `feat: add recommendation command to whatsapp bot`

### Task 3. Add whitelist configuration for allowed WhatsApp numbers
Goal: ensure only approved phone numbers can interact with the bot.

Files:
- `WhatsappBot/index.js`
- `WhatsappBot/src/router.js`
- `WhatsappBot/src/session.js` if needed
- `deployment/deploy-bot.sh`
- `README.md`

Fail-first check:
- add tests that show an unauthorized number is blocked and an authorized number is allowed

Implementation:
- add an env-based whitelist such as `WHATSAPP_ALLOWED_NUMBERS`
- normalize configured numbers and incoming WhatsApp sender IDs before comparison
- reject unauthorized users before profile selection or command handling
- decide and document whether unauthorized users are ignored or sent a short denial message

Pass check:
- authorized flow still works
- unauthorized flow cannot select a profile, query recommendations, or update entries

Commit:
- `feat: add whatsapp bot number whitelist`

### Task 4. Add a minimal automated test harness for the WhatsApp bot
Goal: make bot behavior verifiable without booting WhatsApp Web manually.

Files:
- `WhatsappBot/package.json`
- `WhatsappBot/src/**/*.test.js` or `WhatsappBot/test/**/*.test.js`

Fail-first check:
- introduce the test runner and a first failing spec for routing and whitelist behavior

Implementation:
- add a lightweight Node test runner setup
- mock the bot API wrapper and incoming messages
- cover recommendation command output, whitelist checks, and existing high-risk routing paths

Pass check:
```bash
cd WhatsappBot && npm test
```

Expected result:
- bot tests run locally with no live WhatsApp session required

Commit:
- `test: add whatsapp bot command coverage`

### Task 5. Update deployment and CI glue for the new bot and shared recommendation paths
Goal: make deployment and automation reflect the new behavior.

Files:
- `deployment/deploy-bot.sh`
- `.github/workflows/pages.yml`

Fail-first check:
- confirm the bot deploy script does not yet copy new files automatically if added
- confirm Pages CI still only triggers on `Pages/**`

Implementation:
- update bot deploy copy steps for any new command or test-related runtime file
- keep `.env` preserved on the server
- extend Pages workflow path filters to include shared recommendation assets if needed

Pass check:
```bash
bash -n deployment/deploy-bot.sh
```

Expected result:
- deploy script is syntactically valid
- workflow trigger coverage matches the shared recommendation architecture

Commit:
- `chore: update bot deploy and pages workflow coverage`

### Task 6. Rewrite the root README in a sober operational style
Goal: replace marketing copy with practical project documentation.

Files:
- `README.md`

Rewrite requirements:
- no emojis
- no badges
- no inspirational or promotional phrasing
- explain what the app does
- explain local setup for backend, frontend, database, and bot
- document recommendation behavior and optional provider configuration
- document bot setup, QR login, and whitelist configuration
- keep deployment references that are actually useful

Pass check:
- manual review against the checklist above
- confirm no important setup step was dropped

Commit:
- `docs: rewrite readme in operational style`

### Task 7. Run final verification across all touched surfaces
Goal: finish with one clear verification pass after the implementation is complete.

Automated checks:
```bash
dotnet test MangaCount.Server.Tests --verbosity minimal
cd mangacount.client && npm test -- --run && npm run build
cd ../Pages && npm test -- --run && npm run build
cd ../WhatsappBot && npm test
bash -n ../deployment/deploy-bot.sh
```

Manual checks:
1. Start the backend locally.
2. Start the bot with a test whitelist that includes your phone number.
3. Confirm an allowed number can select a profile and request recommendations.
4. Confirm a blocked number cannot interact with the bot.
5. Confirm recommendation responses are readable on a phone screen and do not overflow into unusable message walls.

Expected result:
- automated checks are green
- bot recommendation flow works from a phone
- whitelist enforcement works in practice

Commit:
- no extra commit unless a final verification fix is required

## Suggested Execution Order

1. Task 1
2. Task 4
3. Task 2
4. Task 3
5. Task 5
6. Task 6
7. Task 7

## Reviewer Focus

1. Recommendation command uses the existing backend contract and handles empty or low-confidence responses correctly.
2. Whitelist checks happen before any session or mutation path.
3. Bot tests are deterministic and do not require a real WhatsApp connection.
4. README is complete, technically accurate, and neutral in tone.

## Notes

- The safest whitelist default is to deny unknown numbers when the whitelist is configured.
- The bot should compare normalized numbers, not raw WhatsApp sender IDs containing `@c.us`.
- The existing Pages workflow likely needs shared-path coverage because recommendations now depend on `shared/recommendations/**`.