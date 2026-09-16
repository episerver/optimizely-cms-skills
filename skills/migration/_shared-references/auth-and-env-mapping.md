# Auth & Environment-Variable Mapping: Remko SDK → Content JS SDK

Single source of truth for how authentication and environment variables map
from the community **Remko SDK** to the official **Content JS SDK**. All names
below are the literal strings found in source, target `src/`, and target docs
(read 2026-09-11). No real key values appear here — placeholders only.

## What each side reads

Extracted via `grep -rhoE "OPTIMIZELY_[A-Z_]+"`:

**Remko — `@remkoj/optimizely-graph-client/src`:**
`OPTIMIZELY_GRAPH_GATEWAY`, `OPTIMIZELY_GRAPH_SINGLE_KEY`, `OPTIMIZELY_GRAPH_APP_KEY`,
`OPTIMIZELY_GRAPH_SECRET`, `OPTIMIZELY_GRAPH_TENANT_ID`, `OPTIMIZELY_GRAPH_SCHEMA`,
`OPTIMIZELY_GRAPH_QUERY_LOG`, plus legacy aliases
`OPTIMIZELY_CONTENTGRAPH_GATEWAY`, `OPTIMIZELY_CONTENTGRAPH_SINGLE_KEY`,
`OPTIMIZELY_CONTENTGRAPH_APP_KEY`, `OPTIMIZELY_CONTENTGRAPH_SECRET`,
`OPTIMIZELY_CONTENTGRAPH_QUERY_LOG`, and `OPTIMIZELY_CMS_URL`, `OPTIMIZELY_CMS_SCHEMA`,
`OPTIMIZELY_PUBLISH_TOKEN`, `OPTIMIZELY_DEBUG`.

**Remko — Integration/CLI packages also use:**
`OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`, `OPTIMIZELY_CMS_USER_ID`.

**Content JS SDK — `@optimizely/cms-sdk/src`:**
`OPTIMIZELY_GRAPH_GATEWAY`, `OPTIMIZELY_GRAPH_SINGLE_KEY`.

**Content JS SDK — CLI src + `docs/*.md`:**
`OPTIMIZELY_GRAPH_GATEWAY`, `OPTIMIZELY_GRAPH_SINGLE_KEY`,
`OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`,
`OPTIMIZELY_CMS_API_URL`, `OPTIMIZELY_CMS_URL`.

## Rename / reconciliation table

| Remko env var | Content-JS-SDK env var | purpose |
|---|---|---|
| `OPTIMIZELY_GRAPH_GATEWAY` | `OPTIMIZELY_GRAPH_GATEWAY` | Graph endpoint URL (unchanged). Read by the SDK client and passed as `graphUrl`. |
| `OPTIMIZELY_GRAPH_SINGLE_KEY` | `OPTIMIZELY_GRAPH_SINGLE_KEY` | Public **Single Key** for delivery reads (unchanged). Used by `new GraphClient(key, …)` / `config({ apiKey })`. |
| `OPTIMIZELY_CONTENTGRAPH_GATEWAY` | `OPTIMIZELY_GRAPH_GATEWAY` | Legacy Remko alias → canonical `GRAPH_GATEWAY`. |
| `OPTIMIZELY_CONTENTGRAPH_SINGLE_KEY` | `OPTIMIZELY_GRAPH_SINGLE_KEY` | Legacy Remko alias → canonical `GRAPH_SINGLE_KEY`. |
| `OPTIMIZELY_GRAPH_APP_KEY` | `OPTIMIZELY_GRAPH_APP_KEY` (see note) | HMAC App Key for preview/codegen. Not found in the target SDK `src` grep; treat as ambiguous — verify against the current SDK/CLI docs before relying on this exact name. |
| `OPTIMIZELY_GRAPH_SECRET` | `OPTIMIZELY_GRAPH_SECRET` (see note) | HMAC Secret for preview/codegen. Same ambiguity as App Key — not observed in target `src`; confirm before use. |
| `OPTIMIZELY_CONTENTGRAPH_APP_KEY` / `_SECRET` | (see App Key/Secret rows) | Legacy Remko aliases of the HMAC pair. |
| `OPTIMIZELY_GRAPH_TENANT_ID` | — no direct equivalent | Remko multi-tenant selector; not read by the target SDK `src`. Omit unless a target doc reintroduces it. |
| `OPTIMIZELY_GRAPH_SCHEMA` / `OPTIMIZELY_CMS_SCHEMA` | — no direct equivalent | Remko CMS-schema-version selector; not read by the target SDK. |
| `OPTIMIZELY_GRAPH_QUERY_LOG` / `OPTIMIZELY_DEBUG` | — no direct equivalent | Remko debug/query logging toggles; the target SDK uses its own `./telemetry` surface (docs `observability.md`). |
| `OPTIMIZELY_CMS_URL` | `OPTIMIZELY_CMS_URL` | CMS instance URL (unchanged; appears in target docs). |
| `OPTIMIZELY_CMS_CLIENT_ID` | `OPTIMIZELY_CMS_CLIENT_ID` | CMS Integration/API Client ID for the CLI (`login`, `config push/pull`). Unchanged. |
| `OPTIMIZELY_CMS_CLIENT_SECRET` | `OPTIMIZELY_CMS_CLIENT_SECRET` | CMS Integration/API Client Secret for the CLI. Unchanged. |
| `OPTIMIZELY_CMS_USER_ID` | — no direct equivalent | Remko impersonation user id; not read by the target CLI/SDK. |
| (none) | `OPTIMIZELY_CMS_API_URL` | **New** in the target: overrides the CLI's CMS API base (e.g. non-prod `https://api.cmstest.optimizely.com`). Defaults to `https://api.cms.optimizely.com` (docs `2-setup.md`). |
| `OPTIMIZELY_PUBLISH_TOKEN` | — no direct equivalent | Remko publish/revalidate webhook token; publish wiring is app-owned in the target (see cms-nextjs skill). |

> Ambiguity note: the target SDK `src` only demonstrably reads
> `OPTIMIZELY_GRAPH_GATEWAY` and `OPTIMIZELY_GRAPH_SINGLE_KEY`. The HMAC pair
> (`OPTIMIZELY_GRAPH_APP_KEY` / `OPTIMIZELY_GRAPH_SECRET`) is carried over by
> name from Remko for preview/codegen but was **not** observed in the target
> `src` grep. Confirm the exact target names before hard-coding them in a skill.

## Two credential modes

### Single Key (public delivery reads)

- **`OPTIMIZELY_GRAPH_SINGLE_KEY`** is a public, read-only key for published
  content delivery. This is what the tutorial pages use:
  `new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, { graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY })`
  (docs `6-rendering-react.md`), or `config({ apiKey: … })` then `getClient()`.
- Safe to expose to server-side rendering of published content. Cannot mutate.

### Preview token (Bearer — draft / on-page-edit reads)

**This is the load-bearing correction for anyone wiring a preview route.** The
target `GraphClient` does **NOT** use App Key + Secret HMAC to read drafts. It
authenticates with one of exactly two headers (verified in the target SDK
`src/graph/index.ts`, `request()` auth line):

- `epi-single <apiKey>` — the public Single Key, for **published** delivery reads.
- `Bearer <preview_token>` — a short-lived **preview token**, for **draft /
  on-page-edit** reads.

The `preview_token` is minted by the CMS into the preview URL query string; the
frontend does not hold it as a standing secret. `GraphClient.getPreviewContent(params)`
takes `params: PreviewParams = { preview_token, key, ctx, ver, loc }` (the parsed
preview-URL `searchParams`) and uses `params.preview_token` as the Bearer token
for that one request. Consequences a migrator must not get wrong:

- The preview route uses the **same** `getClient()` (single-key) client as the
  published route — there is **no** `new GraphClient(appKey, { secret })`.
  `GraphOptions` has **no `secret` field**; passing one is a type error.
- `getContentByPath(...)` is **published-only** — it hard-codes an `undefined`
  preview token internally, so it can never read drafts. Drafts flow **only**
  through `getPreviewContent(params)` on the dedicated `/preview` route.
- `getPreviewContent` also calls `setContext({ previewToken, version, locale,
  type, key, mode })` for you — no manual context population needed.
- Remko's catch-all draft escalation
  (`client.updateAuthentication(AuthMode.HMAC)` + `client.enablePreview()` when
  `draftMode().isEnabled`) has **no target equivalent** — those symbols are
  Remko-only. Do not port that escalation onto the target catch-all page.

### App Key + Secret (HMAC — codegen / CLI only)

- The **App Key + Secret** HMAC pair is a **Remko** and **build-tooling**
  concern (schema pull / codegen), **not** a runtime GraphClient concern in the
  target. The runtime target client never sends an HMAC signature.
- If a target CLI/codegen step needs privileged Graph access, keep the Secret
  server-only / in CI. Never ship it to the client.
- In Remko HMAC was `createHmacFetch` inside `optimizely-graph-client/client`;
  the target runtime replaces this entirely with the Bearer `preview_token`
  model above.

## CMS-55679 gotcha (empty renders — CMS-instance credentials, not the frontend)

**Root cause is on the CMS instance, not in the frontend preview client.** If
the **Graph credentials configured on the CMS instance itself** (the keys the
CMS uses to publish its schema to Graph) are invalid or rotated, the CMS
`EnsureSchemaInitializationModule` **aborts at startup**. When that module
aborts, the `_Content` type is never published to Graph, so **every** Graph
render returns empty — published *and* preview — even though the frontend's
Single Key and preview token are valid and the client code is correct.

**Symptom:** blank pages / empty content arrays, not an auth error.

**First check, before debugging the SDK or the preview route:** verify the Graph
credentials **on the CMS instance** are current. This is not the frontend
`.env` Single Key and not the preview token — it is the CMS instance's own Graph
sync configuration. Re-issue and re-sync if rotated. Only after the CMS instance
is confirmed to publish `_Content` should you look at SDK/query/preview code.

## `.env` example (basic-project) — placeholders only

```ini
# --- Graph delivery (public, read-only) ---
OPTIMIZELY_GRAPH_GATEWAY=https://cg.optimizely.com
OPTIMIZELY_GRAPH_SINGLE_KEY=<your-single-key>

# --- Graph HMAC (codegen / CLI only — NOT used by the runtime preview route) ---
# Preview reads use a per-request Bearer preview_token from the CMS preview URL,
# not these keys. Verify exact names against current SDK/CLI docs before relying
# on them, and only include them if a codegen/CLI step actually needs HMAC.
OPTIMIZELY_GRAPH_APP_KEY=<your-app-key>
OPTIMIZELY_GRAPH_SECRET=<your-app-secret>

# --- CMS instance + Integration API (CLI: login / config push,pull) ---
OPTIMIZELY_CMS_URL=https://<your-instance>.cms.optimizely.com
OPTIMIZELY_CMS_CLIENT_ID=<your-cms-client-id>
OPTIMIZELY_CMS_CLIENT_SECRET=<your-cms-client-secret>

# --- Optional: non-production CMS API base (defaults to api.cms.optimizely.com) ---
# OPTIMIZELY_CMS_API_URL=https://api.cmstest.optimizely.com

# --- Optional: local self-signed certs for the CLI ---
# NODE_TLS_REJECT_UNAUTHORIZED="0"
```

> Never commit a real `.env`. Never copy values out of `.env`,
> `dotnet user-secrets`, or any KeyVault into a skill, doc, or commit.

## Related references

- Package/import mapping: `package-and-import-mapping.md`
- Setup, channel init, and DI/registration: `setup-and-di.md`
