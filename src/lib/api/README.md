# Pareton API client (`src/lib/api`)

Server-only read layer for [api.pareton.ai](https://api.pareton.ai). All dashboard
data is fetched in React Server Components — the browser never talks to the API
host directly.

## Rules

1. **All API access goes through `client.ts`.** Pages and components call named
   helpers in `endpoints.ts`. Do not `fetch("https://api.pareton.ai/…")` (or any
   `PARETON_API_URL`) from a page, component, or route handler unless that handler
   is intentionally proxying and still uses `apiFetch` underneath.
2. **Server-only.** `client.ts` and `endpoints.ts` import `server-only`. A stray
   client import fails the build. `parse.ts` and `types.ts` do not, so the wire
   contract stays unit-testable.
3. **Generated OpenAPI types + hand-narrowed domain types.**
   - `schema.d.ts` — regenerated from `/openapi.json`. Use it as a path/param
     reference; nothing in `src/` imports it yet. FastAPI often types response
     bodies as `unknown`, so it does not validate display fields.
   - `types.ts` — the shapes we render (`Campaign`, `SubmissionRow`, …).
   - `parse.ts` — narrows `unknown` bodies into those shapes. Never spread a
     response into a domain type; read named fields.
4. **Regenerate when the backend changes** so the route list stays honest:

   ```bash
   npm run api:types
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

Lists and campaign pages use `revalidate: 30` to match the API's shared
`Cache-Control`. Submission detail and build-log use `revalidate: 0` so the
detail page can poll while `latest_state` is non-terminal (PAR-44); the API
returns `no-store` for those responses until the submission is terminal.
Prefer section-level `<Suspense>` + degraded empty/unavailable UI over a
whole-page crash when the API returns 503.
