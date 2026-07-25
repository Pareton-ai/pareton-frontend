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
   client import fails the build.
3. **Generated OpenAPI types + hand-narrowed domain types.**
   - `schema.d.ts` — regenerated from `/openapi.json` (path/param contracts).
   - `types.ts` — the ~6 shapes we render (`Campaign`, `SubmissionRow`, …).
     Narrowing happens in `endpoints.ts` so weak FastAPI response schemas cannot
     silently drift into the UI as `object`.
4. **Regenerate when the backend changes:**

   ```bash
   npm run api:types
   ```

   Commit the updated `schema.d.ts`. Then update `types.ts` / parsers if any
   displayed field changed.

## Layout

| File           | Role                                               |
| -------------- | -------------------------------------------------- |
| `config.ts`    | `PARETON_API_URL`, timeout defaults                |
| `client.ts`    | `apiFetch` — URL join, timeout, Next cache, errors |
| `errors.ts`    | `ApiError`, `isNotFound`, `isUnavailable`          |
| `types.ts`     | Domain models + submission/bench display metadata  |
| `endpoints.ts` | One named function per read endpoint               |
| `schema.d.ts`  | Generated OpenAPI types (do not edit by hand)      |

## Env

```bash
# .env.local (or Vercel project env)
PARETON_API_URL=https://api.pareton.ai
```

Server-only — never prefix with `NEXT_PUBLIC_`.

## Caching

Each endpoint sets its own `revalidate` (lists/submissions ~30s to match the
API's `Cache-Control`; closed campaign manifests can stay longer). Prefer
section-level `<Suspense>` + degraded empty/unavailable UI over a whole-page
crash when the API returns 503.
