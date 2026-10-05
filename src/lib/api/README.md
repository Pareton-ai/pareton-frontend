# Pareton API client (`src/lib/api`)

Server-only read layer for [api.pareton.ai](https://api.pareton.ai). All dashboard
data is fetched in React Server Components or through frontend proxies for the
build log and patch availability. The browser never talks to the API host directly.

## Rules

1. **All API access goes through `client.ts`.** Pages and components call named
   helpers in `endpoints.ts`. Do not `fetch("https://api.pareton.ai/…")` (or any
   `PARETON_API_URL`) from a page, component, or route handler unless that handler
   is intentionally proxying and still uses `apiFetch` underneath.
2. **Server-only.** `client.ts` and `endpoints.ts` import `server-only`. A stray
   client import fails the build. `parse.ts` and `types.ts` do not, so the wire
   contract stays unit-testable.
3. **Generated OpenAPI types + hand-narrowed domain types.**
   - `schema.d.ts` — regenerated from `/openapi.json`. `types.ts` imports the
     `SubmissionState` union from it, so the pipeline vocabulary has exactly one
     definition (the backend `gate/types.py` enum). The rest is a path/param
     reference: FastAPI types most response bodies as `unknown`, so it does not
     validate display fields.
   - `types.ts` — the shapes we render (`Campaign`, `SubmissionRow`, …).
   - `parse.ts` — narrows `unknown` bodies into those shapes. Never spread a
     response into a domain type; read named fields.
4. **Regenerate when the backend changes** so the route list and the pipeline
   state union stay honest:

   ```bash
   npm run api:types   # reads the deployed API
   ```

   Before the backend deploys, generate from the local app instead. Otherwise
   you overwrite `schema.d.ts` with a version that lacks the new routes and
   the current `SubmissionState` union, and break the build:

   ```bash
   (cd ../pareton && .venv/bin/python -c \
     "import json; from api.server import app; print(json.dumps(app.openapi()))" \
     > /tmp/pareton-openapi.json)
   npx openapi-typescript /tmp/pareton-openapi.json -o src/lib/api/schema.d.ts
   ```

   Commit the updated `schema.d.ts`. Then update `types.ts` / `parse.ts` if any
   displayed field changed.

## Layout

| File           | Role                                               |
| -------------- | -------------------------------------------------- |
| `config.ts`    | `PARETON_API_URL`, timeout defaults                |
| `client.ts`    | `apiFetch` — URL join, timeout, Next cache, errors |
| `artifacts.ts` | Allowlist for miner-supplied `retrieval_url`       |
| `errors.ts`    | `ApiError`, `isNotFound`, `isUnavailable`          |
| `types.ts`     | Domain models + submission/bench display metadata  |
| `parse.ts`     | `unknown` → domain narrowing (pure, testable)      |
| `endpoints.ts` | One named function per read endpoint               |
| `schema.d.ts`  | Generated OpenAPI reference (do not edit by hand)  |

## Tests

```bash
npm run test       # parser contract tests against captured live fixtures
npm run test:live  # opt-in: same assertions against the deployed API
```

`__tests__/fixtures/` holds verbatim API responses. Re-capture them when the
backend changes a response shape.

## Env

```bash
# .env.local (or Vercel project env)
PARETON_API_URL=https://api.pareton.ai
PARETON_ARTIFACT_BASE_URL=
```

Server-only — never prefix with `NEXT_PUBLIC_`.

`PARETON_ARTIFACT_BASE_URL` mirrors the backend's `PARETON_S3_PUBLIC_BASE_URL`.
A `retrieval_url` outside that host renders as plain text instead of a link,
so keep the two in step when artifact hosting moves.

## Caching

Lists and campaign pages use `revalidate: 30`. Submission detail and build-log
use `revalidate: 0`, including terminal submission details. The patch availability
proxy calls that same uncached `getSubmission` helper and returns `no-store`, so
a deadline check reaches the backend instead of reusing a withheld URL. The
backend also returns `no-store` for submissions enrolled in delayed patch reveal.

## Patch reveal contract

The submission detail response carries these fields inside `submission`:

| Field                | Before reveal                                             | After successful publication            |
| -------------------- | --------------------------------------------------------- | --------------------------------------- |
| `retrieval_url`      | Empty string                                              | Permanent, unsigned public artifact URL |
| `patch_reveal_at`    | Null until a qualifying evaluation, then an ISO timestamp | The same deadline                       |
| `patch_download_url` | Null                                                      | Campaign-qualified API redirect path    |

The parser retains both reveal fields as nullable strings, including when an
older backend omits them. The UI links to the allowlisted `retrieval_url`, as
before; it does not turn the relative API redirect path into a frontend route.
The API remains responsible for eligibility and publication. Client clocks and
timers never authorize downloads or construct a public URL.

The client patch control calls
`GET /api/campaigns/{id}/submissions/{hash}/patch`, a frontend JSON proxy, to
refresh just its availability. The proxy returns `{ url, revealAt, downloadable,
awaitingRevealTime }`. It validates the campaign/hash and checks the artifact
allowlist on the server, where `PARETON_ARTIFACT_BASE_URL` is available. It never
forwards backend error diagnostics. A deadline request may cause the backend to
create the public copy; there is no scheduled backend publisher in this change.

A future deadline uses one timer, re-armed in chunks for waits beyond the browser
timeout limit. Hidden tabs pause requests and refresh on return. A measured entry
with no deadline polls every 15 seconds until round finalization supplies one.
Publication failures retry at that same cadence while the patch control displays
a temporary error. Client requests time out after 12 seconds, do not overlap,
and are aborted on unmount. Once the URL arrives, checks stop. Pipeline polling,
build-log polling, and campaign-list caching are unchanged.

## Concurrency and tier completion reports (v5)

Companion backend: [Pareton PR #187](https://github.com/Pareton-ai/pareton/pull/187).
Deploy this frontend before activating a v5 campaign. Either code deployment can
happen first: historical interval/median reports remain supported. No frontend
ranking or scoring calculation changes the authoritative API score.

- V5 workload parsing accepts `request_concurrency` without
  requiring `request_interval_ms`. Campaign details show natural EOS, the output
  ceiling and the 90% baseline-token minimum.
- Weighted reports retain every tier's weight, eligible count, baseline and
  candidate duration, raw speedup, eligible speedup and failure deduction.
  Incomplete arithmetic stays unavailable; missing fields never become zeros.
- Per-request comparisons are diagnostics under the weighted rule. Tier durations
  include client queueing from group start, and the API's `eligible_speedup`
  captures the failure cap before `failure_penalty * failure_rate` is deducted.
- Optional observed concurrency shows each repetition/group's requested cap,
  effective cap, peak and time-weighted mean; it does not promise full occupancy
  during final drain or after baseline exclusions.
- Plan version 3 adds two natural-output qualification starts before measured
  baseline, second baseline, candidates and scorer. Versions 1 and 2 retain
  their historical ordering, including completed reports without a live phase.
- The generated workload and score-breakdown models were refreshed from PR
  #187's local OpenAPI schema. Existing unrelated API declarations remain intact
  while patch-visibility work evolves independently.

### Local preview

Synthetic fixtures only; these are not GPU qualification evidence. Enable both
mock variables only for local review, never in production:

```bash
npm ci
PARETON_USE_MOCKS=1 PARETON_MOCK_SCORING=v5 npm run build
PARETON_USE_MOCKS=1 PARETON_MOCK_SCORING=v5 npm start -- --hostname 127.0.0.1 --port 3015
```

Open `/dashboard/campaigns/mock-campaign/rounds/3/entries/2` for the failure-cap
example, `/dashboard/campaigns/mock-campaign/rounds/1/entries/3` for a successful
weighted report, and entry `1` for the baseline without a score breakdown.
The v5 switch changes campaign/report previews; other mock lists remain their
legacy illustrative data. Omit `PARETON_MOCK_SCORING` to review historical reports.
