# CMS API Mapping: Remko SDK → Content JS SDK

Complete mapping of `@remkoj/optimizely-cms-api` exports (v5.2.0, a generated
OpenAPI REST client for the CMS Integration/Management API) to their
`@optimizely/cms-sdk` and `@optimizely/cms-cli` equivalents. Every row is
grounded in the real exports of the source package (a **library, NOT a CLI**,
managing CMS content types, content CRUD, changesets, property formats/groups,
and OAuth) and target packages, verified 2026-09-11.

## The straddle: one source package → TWO target packages (+ honest gaps)

The `@remkoj/optimizely-cms-api` package is a **generated OpenAPI REST client
for the CMS Integration/Management API** (management plane: create/update
content types, content CRUD including drafts/versions, changesets, property
formats/groups). This is fundamentally **different** from the Graph delivery
client (reading published content via GraphQL).

This migration **straddles TWO target packages** because the source covers both:

1. **CMS content-TYPE and display-template MANAGEMENT** (tooling concerns) →
   `@optimizely/cms-cli` `config push`/`config pull` + code-first
   `contentType()`/`displayTemplate()` in `@optimizely/cms-sdk`

2. **Runtime published-content READ** (Graph delivery) →
   `@optimizely/cms-sdk` `getClient()` (Graph client)

3. **Content WRITE/CRUD** (drafts, versions, changesets) and **runtime OAuth**
   → **HONEST GAPS** (no public SDK/CLI equivalent — use admin UI or raw
   Integration API REST)

**CRITICAL**: The Integration API client reads **draft/all versions**. The Graph
client (`getClient()` from `@optimizely/cms-sdk`) reads **published content
only**. This is a **semantic difference** — `getClient()` is NOT a drop-in
replacement for `ContentService` reads.

## Full export mapping (source: `@remkoj/optimizely-cms-api` v5.2.0)

| Remko export (@remkoj/optimizely-cms-api) | purpose | target package | @optimizely equivalent | migration note |
|---|---|---|---|---|
| `CmsIntegrationApiClient` (umbrella client wrapping all services) | Top-level client exposing all service properties | **SPLIT** | `config push`/`config pull` (cms-cli) + `getClient()` (cms-sdk) + admin UI / raw Integration API (gap) | ContentTypes/DisplayTemplates → `config push`/`config pull` + `contentType()`/`displayTemplate()` (see Task 6 cms-cli skill + Task 2 graph-client skill). Content reads (published only) → `getClient()` (Graph). Content writes/changesets → **honest gap** (no equivalent — use admin UI or raw Integration API). |
| `createClient` (default + named export, factory for `CmsIntegrationApiClient`) | Create an Integration API client with auth | **SPLIT** | `config push`/`config pull` (cms-cli) + `getClient()` (cms-sdk) + admin UI / raw Integration API (gap) | Same as `CmsIntegrationApiClient` — straddles cli (management) + cms-sdk (published reads) + gap (writes/changesets). |
| `ContentTypesService` | Manage content types (create, update, delete, list) | `@optimizely/cms-cli` | `config push`, `config pull`, `content delete <key>`, `danger delete-all-content-types` | Link to Task 6 cms-cli skill. Code-first content types authored via `contentType()` in `@optimizely/cms-sdk`, pushed with `config push`. |
| `DisplayTemplatesService` | Manage display templates (create, update, delete, list) | `@optimizely/cms-cli` | `config push`, `config pull` | Code-first display templates authored via `displayTemplate()` in `@optimizely/cms-sdk`, pushed with `config push`. See Task 6 cms-cli skill. |
| `PropertyFormatsService` | Manage property formats (create, update, delete, list) | `@optimizely/cms-cli` | `config push`, `config pull` | Property formats sync through the CLI config. There is **no dedicated code-first factory** (`propertyFormat()` does NOT exist in `@optimizely/cms-sdk`). See Task 6 cms-cli skill. |
| `PropertyGroupsService` | Manage property groups (create, update, delete, list) | `@optimizely/cms-cli` | `config push`, `config pull` | Property groups are declared via the `PropertyGroupType` type in `buildConfig()` and synced through the CLI config. There is **no `propertyGroup()` factory** in `@optimizely/cms-sdk`. See Task 6 cms-cli skill. |
| `ContentService` (content CRUD) | **READ**: Get content by ID/reference (drafts, published, specific versions). **WRITE**: Create, update, delete content items. | **SPLIT** | **READ (published only)**: `getClient()` from `@optimizely/cms-sdk` (Graph delivery). **WRITE/CRUD**: — **no equivalent** | **READ**: Published-content reads → `getClient()` (Graph client, see Task 2 graph-client skill). **CRITICAL semantic difference**: Integration API reads draft/all versions; Graph reads published only. **WRITE**: Content create/update/delete → **honest gap** (no public SDK/CLI equivalent — use admin UI or raw Integration API REST calls). |
| `ChangesetsService` | Manage changesets (create, update, delete, list, apply) | — none (honest gap) | — **no equivalent** | Changesets have no public SDK/CLI equivalent. Use admin UI or raw Integration API REST calls. |
| `OauthService` / `getAccessToken` / `getCmsIntegrationApiConfigFromEnvironment` | OAuth token exchange + config helpers | — none (honest gap, partial coverage in CLI) | `login` command verifies auth; no runtime OAuth helpers | CLI handles auth via `OPTIMIZELY_CMS_CLIENT_ID`/`OPTIMIZELY_CMS_CLIENT_SECRET`/`OPTIMIZELY_CMS_URL` (same env var names as source). No public runtime OAuth helper in cms-sdk — if you need programmatic token exchange, use raw Integration API OAuth endpoints. |
| generated TS types (`ContentItem`, `ContentType`, `ContentReference`, `Changeset`, `ContentMetadata`, `BinaryProperty`, `BooleanProperty`, `ComponentProperty`, `ContentComponent`, etc.) | TypeScript types for Integration API requests/responses | `@optimizely/cms-sdk` (code-first schemas) + `config pull` (generated types) | `config pull` generates TS types from CMS; runtime content typed via `contentType()` schemas | `config pull` generates TypeScript types from CMS content types. Runtime content-type schemas are authored in code via `contentType()` and pushed with `config push`. See Task 2 graph-client skill + Task 6 cms-cli skill. |
| `ApiClient`, `ApiError`, `CancelablePromise`, `OpenAPI` (config const), `BaseHttpRequest`, `FetchHttpRequest` | Low-level OpenAPI-generated plumbing (HTTP client, error handling) | — none (honest gap) | — **no equivalent** | Low-level plumbing for the generated Integration API client. No equivalent in the official SDK (which uses Graph delivery, not Integration API). If you need programmatic Integration API access, use raw REST calls. |

## Capability gaps

### Content write/CRUD (ContentService write methods)

The `ContentService` in `@remkoj/optimizely-cms-api` provides **create,
update, delete** methods for content items (drafts, versions). The official
SDK **has NO content write/CRUD equivalent** — `getClient()` (Graph) is
read-only for **published content**.

**Net migration for content WRITE/CRUD:**

- **DELETE**: Code paths that create/update/delete content via
  `ContentService.create()` / `.update()` / `.delete()`.

- **REPLACE WITH**: CMS admin UI for manual content authoring. If programmatic
  content CRUD is required, use raw Integration API REST calls (keep the
  `@remkoj/optimizely-cms-api` package or call the Integration API directly).

### Changesets (ChangesetsService)

The official SDK and CLI **have NO changeset management equivalent**.

**Net migration for changesets:**

- **DELETE**: Code paths that manage changesets via `ChangesetsService`.

- **REPLACE WITH**: CMS admin UI for manual changeset management. If
  programmatic changeset access is required, use raw Integration API REST
  calls.

### Runtime OAuth helpers (getAccessToken, getCmsIntegrationApiConfigFromEnvironment)

The `@remkoj/optimizely-cms-api` package provides `getAccessToken` (OAuth token
exchange) and `getCmsIntegrationApiConfigFromEnvironment` (config from env
vars). The official CLI handles auth internally (`login` command verifies CMS
credentials), but there is **NO runtime OAuth helper in `@optimizely/cms-sdk`**.

**Net migration for runtime OAuth:**

- **DELETE**: Code paths that call `getAccessToken` or
  `getCmsIntegrationApiConfigFromEnvironment`.

- **REPLACE WITH**: If you need programmatic token exchange (e.g., for a custom
  Integration API client), use raw Integration API OAuth endpoints
  (`/oauth/token`). The CLI's `login` command is for verification only, not
  runtime use.

## Environment variables

The `@remkoj/optimizely-cms-api` package uses **the same CMS Integration API
credentials** as the official `@optimizely/cms-cli`. The env var names are
**unchanged**.

| env var | used by | purpose |
|---|---|---|
| `OPTIMIZELY_CMS_URL` | `@remkoj/optimizely-cms-api`, `optimizely-cms-cli` | CMS instance URL (e.g., `https://<your-instance>.cms.optimizely.com`). Optional in source (default `https://example.cms.optimizely.com`). Required in target CLI. |
| `OPTIMIZELY_CMS_CLIENT_ID` | `@remkoj/optimizely-cms-api`, `optimizely-cms-cli` | CMS Integration API Client ID (mandatory in both source and target). |
| `OPTIMIZELY_CMS_CLIENT_SECRET` | `@remkoj/optimizely-cms-api`, `optimizely-cms-cli` | CMS Integration API Client Secret (mandatory in both source and target). |
| `OPTIMIZELY_CMS_USER_ID` | `@remkoj/optimizely-cms-api` | Optional actAs user ID for impersonation (source only; no equivalent in target CLI). |
| `OPTIMIZELY_DEBUG` | `@remkoj/optimizely-cms-api` | Optional debug logging flag (source only; no equivalent in target CLI — use CLI's `--verbose` flag instead). |
| `OPTIMIZELY_CMS_SCHEMA` | `@remkoj/optimizely-cms-api` | CMS schema version (CMS12/CMS13, default CMS13; source only; no equivalent in target CLI). |
| `OPTIMIZELY_CMS_API_URL` | `optimizely-cms-cli` | Optional override for CMS API base (defaults to `https://api.cms.optimizely.com`; use for non-production, e.g., `https://api.cmstest.optimizely.com`; target CLI only). |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `optimizely-cms-cli` | Optional bypass for self-signed cert validation (set to `"0"` for local dev only; never set in production; target CLI only). |

**CRITICAL**: The env var names `OPTIMIZELY_CMS_CLIENT_ID`,
`OPTIMIZELY_CMS_CLIENT_SECRET`, `OPTIMIZELY_CMS_URL` are **identical** in source
and target. Do NOT rename or duplicate them.

**Note**: The runtime Graph client (`getClient()` from `@optimizely/cms-sdk`)
uses **DIFFERENT credentials** (`OPTIMIZELY_GRAPH_SINGLE_KEY` or
`OPTIMIZELY_GRAPH_APP_KEY` + `OPTIMIZELY_GRAPH_SECRET`) for fetching published
content. These are **separate** from the CMS Integration API credentials used
by the source package and target CLI.

## Related references

- Package/import mapping: `../_shared-references/package-and-import-mapping.md`
- Setup, channel init, and DI/registration: `../_shared-references/setup-and-di.md`
- Auth & environment variables: `../_shared-references/auth-and-env-mapping.md`
