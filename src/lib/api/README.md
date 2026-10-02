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
refresh just its availability. The proxy returns `{ mode, url, downloadable,
revealAt }`. It validates the campaign/hash and checks the artifact
allowlist on the server, where `PARETON_ARTIFACT_BASE_URL` is available. It never
forwards backend error diagnostics. It reads the backend's campaign-scoped
`/v1/campaigns/{id}/submissions/{hash}/patch-availability` endpoint. A deadline
request may cause the backend to create the public copy; there is no scheduled
backend publisher in this change.

A future deadline uses one timer, re-armed in chunks for waits beyond the browser
timeout limit. Hidden tabs pause requests and refresh on return. A measured entry
with no deadline polls every 15 seconds until round finalization supplies one.
Publication failures retry at that same cadence while the patch control displays
a temporary error. Client requests time out after 12 seconds, do not overlap,
and are aborted on unmount. Once the URL arrives, checks stop. Pipeline polling,
build-log polling, and campaign-list caching are unchanged.

## Campaign-controlled patch disclosure

Campaign and submission models include `patch_visibility`: `private`, or
`public_after_reveal` with `reveal_delay_s`. The effective policy returned with
submission detail controls the artifact UI and proxy; the campaign response is
used to display campaign terms. Missing, unknown, or malformed policy defaults
to private, including during a mixed-version rollout. Old URL fields alone never
enable a download.

The restored Patch artifact row shows private, awaiting-finalized-evaluation,
scheduled, downloadable, and retry states. The availability proxy derives this
from the explicit backend availability endpoint, checks the artifact URL allowlist,
and uses `Cache-Control: no-store`. Public pages check for policy/deadline edits every
15 seconds while visible and at the reveal deadline, with one in-flight request
and a 65-second browser timeout around the proxy's 60-second backend read.
Private pages do not poll; they recheck once when the tab becomes visible.
Switching to private removes a displayed link on the next successful refresh.
Published files themselves cannot be revoked by this UI.

Ordinary backend submission list/detail reads withhold download locations and
never contact S3. A revealed patch's initial render therefore refreshes its
availability through the proxy; only this request or a direct patch download can
publish/check the object. S3 outages cannot hold up the initial page's API reads.

Deploy the backend migration and compatible API before enabling public campaigns.
See the companion backend `docs/patch-visibility.md` and this PR's rollout steps.
