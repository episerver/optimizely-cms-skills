# Remko CMS API to Content JS SDK Migration

Migrate the community **Remko CMS API client** (`@remkoj/optimizely-cms-api`) — a generated OpenAPI REST client for the CMS Integration/Management API — to the official **Content JS SDK** (`@optimizely/cms-sdk`) **and** CLI (`@optimizely/cms-cli`). This is the **straddle skill**: one source package fans into **two** targets, plus honest gaps. Build it **last** — it depends on the SDK client init, code-first schema, and CLI stories being settled by the other skills.

## When to Use

Use this skill when you want to:
- Replace `@remkoj/optimizely-cms-api` with the official SDK + CLI
- Migrate `ContentTypesService` / `DisplayTemplatesService` / `PropertyFormatsService` / `PropertyGroupsService` (management) to `config push` / `config pull` + code-first schemas
- Migrate `ContentService` reads to `getClient()` (with the draft-vs-published caveat)
- Understand why content write/CRUD, changesets, and runtime OAuth have **no equivalent**
- Replace `CmsIntegrationApiClient` / `createClient` calls
- Get a pre-migration assessment of Integration API usage before starting

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate optimizely-cms-api"
- "Replace the Remko CMS API / Integration API client"
- "Convert ContentTypesService / DisplayTemplatesService to the official SDK"
- "Migrate ContentService reads to the official SDK"
- "Replace CmsIntegrationApiClient / createClient"
- "Migrate ChangesetsService"
- "What replaces the Integration API OAuth helpers?"

## Usage Example

```
You: "Migrate our @remkoj/optimizely-cms-api usage to the official SDK"

Agent: [Uses optimizely-remko-cms-api-to-content-js skill]
- Assesses usage and categorizes it by concern (management vs runtime reads
  vs write/changesets/OAuth)
- Management (ContentTypesService / DisplayTemplatesService) → code-first
  contentType() / displayTemplate() + optimizely-cms-cli config push/pull
- Runtime published reads (ContentService.get/list) → getClient() (Graph),
  flagging the draft-vs-published semantic difference
- Content write/CRUD, changesets, runtime OAuth → honest gaps (admin UI, keep
  source package, or raw Integration API REST)
- Decides whether the package can be removed or must be retained
```

```
You: "What's the SDK equivalent of ContentService.create()?"

Agent: [Uses optimizely-remko-cms-api-to-content-js skill]
- Explains there is NO SDK/CLI equivalent for content write/CRUD
- getClient() (Graph) is read-only and published-only — NOT a drop-in for
  ContentService reads either (draft/version access is lost)
- Options: CMS admin UI, keep the source package, or raw Integration API REST
  (/api/episerver/v3.0/content); delete the code path if no longer needed
```

## What It Handles

- **Usage assessment** — Categorizes every Integration API call by concern: management/tooling, runtime read, or write/changeset/OAuth
- **The straddle** — Management → `@optimizely/cms-cli`; published reads → `@optimizely/cms-sdk` `getClient()`; the rest → honest gaps
- **Management migration** — `ContentTypesService` / `DisplayTemplatesService` → code-first `contentType()` / `displayTemplate()` + `config push` / `config pull`
- **Runtime read migration** — `ContentService` reads → `getClient()` (Graph, published-only), with the semantic-difference caveat
- **Honest gaps** — Content write/CRUD, changesets, and runtime OAuth have no official equivalent (admin UI / keep package / raw REST / delete)
- **Conditional teardown** — Decides whether `@remkoj/optimizely-cms-api` can be removed or must remain a residual

## Method Mapping Quick Reference

| Remko (`@remkoj/optimizely-cms-api`) | Content JS SDK / CLI |
|---------------------------------------|-----------------------|
| `CmsIntegrationApiClient` / `createClient` | straddles all concerns below — no single target |
| `ContentTypesService.*` (management) | `contentType()` + `optimizely-cms-cli config push` / `config pull` |
| `DisplayTemplatesService.*` (management) | `displayTemplate()` + `initDisplayTemplateRegistry` + `config push` |
| `PropertyFormatsService` / `PropertyGroupsService` | sync via CLI config (`PropertyGroupType` in `buildConfig()`) — no dedicated factory |
| `ContentService.get*()` / `.list()` (published read) | `getClient().getContent()` / `getContentByPath()` (Graph, **published-only**) |
| `ContentService.create()` / `.update()` / `.delete()` | — no equivalent (admin UI / keep package / raw REST) |
| `ChangesetsService.*` | — no equivalent (admin UI / keep package / raw REST) |
| `getAccessToken` / `getCmsIntegrationApiConfigFromEnvironment` | — no runtime OAuth helper (CLI handles its own auth) |
| generated types (`ContentItem`, `ContentType`, …) | code-first schemas + `config pull` (generates TS types) |
| `OPTIMIZELY_CMS_CLIENT_ID` / `_CLIENT_SECRET` / `_URL` | **reused** (same names) by the official CLI |

## Important Notes

- **One source, two targets, plus gaps.** `@remkoj/optimizely-cms-api` is a single package that straddles `@optimizely/cms-cli` (management/tooling) **and** `@optimizely/cms-sdk` (runtime published reads) — and content write/changesets/OAuth land in neither. Do not assume the whole package maps to one target.
- **`getClient()` is NOT a drop-in for `ContentService` reads.** The Integration API reads **draft / all versions**; the Graph client reads **published content only**. This is a *semantic* difference, not just an API shape change. Code that depends on draft or version access cannot migrate to `getClient()`.
- **Content write/CRUD and changesets have no equivalent.** The official SDK/CLI expose no content write, draft/version management, or changeset APIs. Do not fabricate one — state the gap and give the options: CMS admin UI, keep the source package, raw Integration API REST (`/api/episerver/v3.0/content`), or delete the path.
- **Auth env vars are reused — but the runtime Graph client's are not.** `OPTIMIZELY_CMS_CLIENT_ID` / `_CLIENT_SECRET` / `_URL` keep the same names for the CLI. The runtime `getClient()` uses **different** credentials: `OPTIMIZELY_GRAPH_SINGLE_KEY` (public) or `OPTIMIZELY_GRAPH_APP_KEY` + `OPTIMIZELY_GRAPH_SECRET` (authenticated).
- **Do not delete the package too early.** If the project has any write/CRUD, changeset, or runtime-OAuth usage, keep `@remkoj/optimizely-cms-api` (or rewrite those paths to raw REST). Strip it only after confirming none of those concerns remain — this skill owns that decision.
- **Generated types are a different shape.** The source package's OpenAPI-generated types (`ContentItem`, `ContentType`, …) are not the SDK's code-first schema types. Do not import the old generated types into the SDK; use `contentType()` / `displayTemplate()` + `config pull`.
- **`config push` needs `optimizely.config.mjs`.** The CLI reads `buildConfig({ components: [...] })` from `./optimizely.config.mjs` to discover content types. Missing that file makes `config push` fail. `getClient()` also requires a one-time `config(buildConfig())` at app startup.

## Related Skills

- [`optimizely-remko-graph-client-to-content-js`](optimizely-remko-graph-client-to-content-js.md) — Graph client init + code-first schema patterns (**complete alongside or before this**)
- [`optimizely-remko-cms-cli-to-content-js`](optimizely-remko-cms-cli-to-content-js.md) — Shares the same target CLI (`@optimizely/cms-cli`)
- [`optimizely-remko-cms-react-to-content-js`](optimizely-remko-cms-react-to-content-js.md) — React rendering surface and `contentType()` components
- [`optimizely-remko-graph-functions-to-content-js`](optimizely-remko-graph-functions-to-content-js.md) — Runtime query generation (typed collection queries)
- [`optimizely-content-fetching`](optimizely-content-fetching.md) — Fetching patterns with the official SDK
