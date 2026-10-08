# Package & Import Mapping: Remko SDK → Optimizely Content JS SDK

This is the single source of truth for how community **Remko SDK**
(`@remkoj/optimizely-*`) packages and their export subpaths map onto the
official **Content JS SDK** (`@optimizely/*`). Every one of the migration
skills links here rather than restating these facts.

All rows are derived from the real `exports` maps in each package's
`package.json` (source: `@remkoj/optimizely-*`, target: `@optimizely/cms-sdk`
+ `@optimizely/cms-cli`), read on 2026-09-11.

> **Version grounding — verify before you migrate.** The `@remkoj/*` mappings
> here were read against source **v5.2.0**. Real apps commonly pin a newer
> range (e.g. `~5.4.x`), and **function signatures can drift between minors**.
> Before trusting any signature in these references, check the version actually
> installed in the app you are migrating (`cat node_modules/@remkoj/optimizely-graph-client/package.json | grep '"version"'`,
> or your lockfile) and open the real `.d.ts` in `node_modules` if it differs.
> The **package/subpath fan-in below is stable across 5.x**; it is the
> per-function argument shapes (documented in the owned skills) that need
> re-verification. The official target was read against the current
> `@optimizely/cms-sdk`; its React/Next peer requirement is called out in the
> owned React/Next.js skills.

## How the package set collapses

The community SDK ships **seven** packages. The official SDK consolidates the
runtime/library surface into a **single** package, `@optimizely/cms-sdk`, plus
two tooling packages (`@optimizely/cms-cli`, `@optimizely/cms-create-app`).

| @remkoj package | @optimizely equivalent |
|---|---|
| `@remkoj/optimizely-graph-client` | `@optimizely/cms-sdk` (`.`, fetching/`GraphClient`) |
| `@remkoj/optimizely-cms-react` | `@optimizely/cms-sdk` (`./react/*`) |
| `@remkoj/optimizely-cms-nextjs` | `@optimizely/cms-sdk` (root `.`, `./react/nextjs`, `./react/server`, `./react/client`; publish/preview wiring is app-owned) |
| `@remkoj/optimizely-graph-functions` | `@optimizely/cms-cli` (codegen is now CLI-driven) — no runtime import equivalent |
| `@remkoj/optimizely-cms-api` | `@optimizely/cms-cli` + `@optimizely/cms-sdk` (see straddle skill) |
| `@remkoj/optimizely-cms-cli` (`opti-cms`) | `@optimizely/cms-cli` (`optimizely-cms-cli`) |
| `@remkoj/optimizely-graph-cli` (`opti-graph`) | `@optimizely/cms-cli` (`optimizely-cms-cli`) |

## Subpath-level import mapping

One row per **source export subpath**. The "typical imported symbol(s)" column
lists symbols actually exported from that subpath's source (`src/`). Where the
official SDK has no drop-in for a subpath, the row is marked
`— no direct equivalent (see owned skill)` and the migration is handled by the
skill that owns that package.

### `@remkoj/optimizely-graph-client`

Source exports: `.`, `./client`, `./config`, `./router`, `./channels`, `./admin`, `./codegen`, `./utils`

| @remkoj source subpath | typical imported symbol(s) | @optimizely target subpath | notes |
|---|---|---|---|
| `.` | `createClient` (default), `ContentGraphClient`, `Services` | `@optimizely/cms-sdk` (`.`) | Root re-exports client + config + services. Target root exports `GraphClient`, `getClient`, `config`. |
| `./client` | `ContentGraphClient`, `createClient`, `createHmacFetch`, `isContentGraphClient` | `@optimizely/cms-sdk` (`.`) | `new ContentGraphClient(config)` → `new GraphClient(singleKey, { graphUrl })` or `getClient()`. HMAC fetch is internal to the target client. |
| `./config` | `readEnvironmentVariables`, `applyConfigDefaults`, `validateConfig`, `OptiCmsSchema`, `SchemaVersion` | `@optimizely/cms-sdk` (`.`) → `config()` | Env-var reading + validation is folded into `config()` / `getClient()`. See `auth-and-env-mapping.md`. |
| `./router` | `RouteResolver` (default), routing types | `@optimizely/cms-sdk` (`.`) → `GraphClient.getContentByPath()` | No standalone `RouteResolver`; path routing is a client method (`getContentByPath`) used in the Next.js `[...slug]` page. |
| `./channels` | `ChannelRepository` (default), `ChannelDefinition`, `createDefinition` | — no direct equivalent (see owned skill) | The official SDK has no `ChannelRepository`/`createDefinition`. Channel/host/locale wiring is replaced by `config()` + Next.js routing. See `setup-and-di.md` and the graph-client skill. |
| `./admin` | `OptimizelyGraphAdminApi`, `createClient`, `isApiError` | — no direct equivalent (see owned skill) | Graph Admin API (schema push to Graph) is not part of `@optimizely/cms-sdk`. Schema sync is now done via `@optimizely/cms-cli` (`config push`). See the graph-cli skill. |
| `./codegen` | `getGraphQLCodegenSchema`, `SchemaInfo` | — no direct equivalent (see owned skill) | GraphQL codegen config is replaced by the CLI-generated content-type registry. See the graph-functions skill. |
| `./utils` | `localeToGraphLocale`, `graphLocaleToLocale`, `contentLinkIsEqual`, `isContentLink`, `normalizeContentLink` | — no direct equivalent (see owned skill) | ContentLink/locale helpers have no public target export. Most usages disappear once content is fetched as typed objects. See the graph-client skill. |

### `@remkoj/optimizely-cms-react`

Source exports: `.`, `./components`, `./rsc`

| @remkoj source subpath | typical imported symbol(s) | @optimizely target subpath | notes |
|---|---|---|---|
| `.` | `Version`, `Errors`, `Utils`, factory + context types (client re-exports live under the `./components` subpath) | `@optimizely/cms-sdk/react/client` | Client-side React surface. |
| `./rsc` | `ComponentFactory`, `DefaultComponentFactory`, `RichTextComponentDictionary`, RSC context, `OptimizelyComponent` (RSC) | `@optimizely/cms-sdk/react/server` | Server components: `OptimizelyComponent`, `withAppContext`, `initReactComponentRegistry`, `getContext`, `setContext`. The factory pattern (`DefaultComponentFactory` + `registerAll`) becomes `initReactComponentRegistry({ resolver })`. See `setup-and-di.md`. |
| `./components` | `RichText`, `DefaultComponents`, `createHtmlComponent`, CMS-styles helpers (`extractSettings`, `readSetting`) | `@optimizely/cms-sdk/react/richText` | `RichText` component + rich-text node dictionaries. |

### `@remkoj/optimizely-cms-nextjs`

Source exports: `.`, `./rsc`, `./publish`, `./types`, `./components`, `./preview`, `./page`

| @remkoj source subpath | typical imported symbol(s) | @optimizely target subpath | notes |
|---|---|---|---|
| `.` | `createClient` | `@optimizely/cms-sdk` (`.`) → `getClient()` | The Next.js `createClient()` wrapper is replaced by the SDK's `config()` + `getClient()`. |
| `./rsc` | Next.js RSC helpers (`dist/client.js`) | `@optimizely/cms-sdk/react/server` | RSC helpers merged into the SDK's `react/server` surface. |
| `./publish` | publish/on-publish route helpers | — no direct equivalent (see owned skill) | Revalidation/publish webhook wiring is app-owned in the target. See the cms-nextjs skill. |
| `./types` | shared Next.js types | `@optimizely/cms-sdk` (`.`) | Types are exported from SDK root / `react/nextjs`. |
| `./components` | shared UI components | `@optimizely/cms-sdk/react/server` and `./react/client` | Split across server/client subpaths. |
| `./preview` | on-page-edit (OPE) preview integration | `@optimizely/cms-sdk/react/nextjs` | Live preview handled via `react/nextjs`. See docs `7-live-preview.md` and the cms-nextjs skill. |
| `./page` | `CmsPage` / catch-all page helpers | `@optimizely/cms-sdk/react/nextjs` + `react/server` | Catch-all page is authored directly with `OptimizelyComponent` + `withAppContext` (docs `6-rendering-react.md`). |

### `@remkoj/optimizely-graph-functions`

Source exports: `.`, `./plugin`, `./preset`, `./transform`, `./documents`, `./loader`, `./document-ast` (also bin `opti-patch`)

| @remkoj source subpath | typical imported symbol(s) | @optimizely target subpath | notes |
|---|---|---|---|
| `.` / `./plugin` | GraphQL Codegen plugin | — no direct equivalent (see owned skill) | Whole package is a graphql-codegen preset/plugin. The official SDK replaces GraphQL codegen with typed content models + CLI `config pull`. See the graph-functions skill. |
| `./preset` | codegen preset | — no direct equivalent (see owned skill) | As above. |
| `./transform` | codegen transform | — no direct equivalent (see owned skill) | As above. |
| `./documents` | document helpers | — no direct equivalent (see owned skill) | As above. |
| `./loader` | embedded document loader | — no direct equivalent (see owned skill) | As above. |
| `./document-ast` | document-AST plugin | — no direct equivalent (see owned skill) | As above. |

### `@remkoj/optimizely-cms-api`

No `exports` map. Single entry: `main: ./dist/index.js` (import `.` only). CommonJS. Symbol: `CmsIntegrationApiClient` (generated OpenAPI client).

| @remkoj source subpath | typical imported symbol(s) | @optimizely target subpath | notes |
|---|---|---|---|
| `.` | `CmsIntegrationApiClient` (generated Integration API client) | — no direct equivalent (see owned skill) | The generated Integration API client straddles CLI + SDK. Content-model operations move to `@optimizely/cms-cli` (`config push/pull`); runtime reads move to `@optimizely/cms-sdk` `GraphClient`. See the cms-api straddle skill (migrated last). |

### `@remkoj/optimizely-cms-cli`

No `exports` map (bin only): `opti-cms` → `./dist/index.js`. Not a library import.

| @remkoj source subpath | typical imported symbol(s) | @optimizely target subpath | notes |
|---|---|---|---|
| (bin `opti-cms`) | n/a — command-line only | `@optimizely/cms-cli` (bin `optimizely-cms-cli`) | Command binary renamed `opti-cms` → `optimizely-cms-cli`. Command surface differs (target uses `config push` / `config pull` / `login`). See docs `13-cli-commands.md` and the cms-cli skill. |

### `@remkoj/optimizely-graph-cli`

No `exports` map (bin only): `opti-graph` → `bin/index.js`. Not a library import.

| @remkoj source subpath | typical imported symbol(s) | @optimizely target subpath | notes |
|---|---|---|---|
| (bin `opti-graph`) | n/a — command-line only | `@optimizely/cms-cli` (bin `optimizely-cms-cli`) | Graph-side CLI utilities (schema/graph operations) are consolidated into the single `optimizely-cms-cli` binary. See the graph-cli skill. |

## Target-only subpaths (no @remkoj origin)

These `@optimizely/cms-sdk` subpaths have no direct Remko predecessor; they are
introduced by the official SDK:

- `./schema` — content-type schema helpers.
- `./buildConfig` — carries the `BuildConfig` config **types**. The `buildConfig()` **function** used in `optimizely.config.mjs` is a **root** export — the canonical import is `import { buildConfig } from '@optimizely/cms-sdk'` (docs `2-setup.md`; 6 of 7 samples). The `@optimizely/cms-sdk/buildConfig` subpath also resolves the function (used by the create-app scaffold), but prefer the root import to match `setup-and-di.md`.
- `./telemetry` — observability hooks (docs `observability.md`).
- `./forms/react`, `./forms/validation` — CMS Forms support (docs `15-forms.md`); the community SDK had no first-class Forms package.

## Scope carve-out: `@remkoj/optimizely-one-nextjs` is NOT covered

The seven migration skills target the **graph / cms / cli** surface. They do
**not** cover `@remkoj/optimizely-one-nextjs` (Optimizely One: ODP + Recs +
visitor-group personalization + site search — `OptimizelyOneProvider`,
`Scripts`, `EnvTools`, `OptimizelyOneGadget`, `PageActivator`, the `/api/me`
visitor route, and middleware visitor-id handling).

There is **no target mapping** for this package in the current suite. A real app
(e.g. the SaaS demo) imports it in `middleware.ts`, `app/layout.tsx`,
`app/search`, `app/api/me`, `lib/integrations`, and several components. Treat it
as a **known residual**: it is explicitly permitted to remain installed after
migration. "Remove all `@remkoj/*`" does **not** apply to
`@remkoj/optimizely-one-nextjs` — do not attempt to strip it, and do not treat
its presence as an incomplete migration. Cover it only if/when a dedicated
Optimizely One skill is added.

## Conditional residual: `@remkoj/optimizely-cms-api` may need to stay

Unlike the Optimizely One carve-out above (which has **no** mapping at all),
`@remkoj/optimizely-cms-api` is **mostly** migratable — but not entirely. It
straddles three concerns, and only two of them have official targets:

| Concern | Target | Keep source? |
|---|---|---|
| Management/tooling (content types, display templates, property formats/groups) | `@optimizely/cms-cli` (`config push`/`config pull`) + code-first `contentType()`/`displayTemplate()` | No — migrate |
| Runtime published-content READ | `@optimizely/cms-sdk` `getClient()` (published-only; see semantic difference in the cms-api skill) | No — migrate |
| Content WRITE/CRUD (drafts, versions), changesets, runtime OAuth | **Honest gap** — no public SDK/CLI equivalent | **Yes, if used** |

So `@remkoj/optimizely-cms-api` is a **conditional residual**: strip it only if
the project has **no** dependency on content write/CRUD, changesets, or runtime
OAuth. If it does, keep the package installed (or rewrite those paths to raw
Integration API REST) and remove only the management/read usage. Do **not** put
`@remkoj/optimizely-cms-api` in an unconditional "remove all `@remkoj/*`" step
without first assessing write/changeset/OAuth usage. The
`optimizely-remko-cms-api-to-content-js` skill (Step 5) owns this decision in
full.

## Removal order (staged teardown — do NOT global-delete)

The in-scope `@remkoj/*` packages are **interdependent**; deleting them in the
wrong order transiently breaks the build. Follow this sequence — each stage
leaves the app compiling before the next begins:

1. **Client** (`optimizely-graph-client`) → `config()` + `getClient()` wired
   first; everything downstream needs a working client. (graph-client skill)
2. **Codegen / functions** (`optimizely-graph-functions`, `@gql/*`) → tear down
   GraphQL codegen and author `contentType()` schema objects. This is also where
   the page's master-query source disappears (see cms-nextjs G13).
   (graph-functions skill)
3. **Content-type registry** → `initContentTypeRegistry([...])` with the objects
   from step 2. (cms-react skill / `setup-and-di.md`)
4. **Display-template + React registries** →
   `initDisplayTemplateRegistry([...])` and
   `initReactComponentRegistry({ resolver })`. Must exist **before** any
   `CmsComponent` is re-authored, or components have nowhere to resolve.
   (cms-react skill / `setup-and-di.md`)
5. **Components** (`optimizely-cms-react`: `CmsComponent`, `CmsEditable`,
   `RichText`, `CmsContentArea`) → re-author per component now that both
   registries exist. (cms-react skill)
6. **Pages / preview** (`optimizely-cms-nextjs`: `createPage`,
   `createEditPageComponent`) → author the catch-all and `/preview` routes
   directly, including the draft-auth escalation. (cms-nextjs skill)
7. **Remove packages** → only now run the uninstall below, always leaving
   `@remkoj/optimizely-one-nextjs` installed (unconditional carve-out) and
   leaving `@remkoj/optimizely-cms-api` installed **if** the project still needs
   content write/CRUD, changesets, or runtime OAuth (conditional residual
   above).

> Tempting mistake: deleting `optimizely-cms-react` first (it's the biggest,
> most-imported package). That breaks every component before its registry
> replacement exists. Client and registries come first; components come after.

## Install / uninstall

```bash
# remove community SDK — NOTE: @remkoj/optimizely-one-nextjs is intentionally
# omitted (unconditional carve-out above; always leave it installed).
# @remkoj/optimizely-cms-api is ALSO omitted here — remove it in the separate,
# conditional step below only after confirming no write/changeset/OAuth usage.
yarn remove @remkoj/optimizely-graph-client @remkoj/optimizely-cms-react @remkoj/optimizely-cms-nextjs @remkoj/optimizely-graph-functions @remkoj/optimizely-cms-cli @remkoj/optimizely-graph-cli

# CONDITIONAL — only if the project has NO content write/CRUD, changesets, or
# runtime OAuth (see "Conditional residual" above and the cms-api skill Step 5).
# If any of those are used, SKIP this line and keep the package installed.
yarn remove @remkoj/optimizely-cms-api

# add official SDK
yarn add @optimizely/cms-sdk
yarn add -D @optimizely/cms-cli @optimizely/cms-create-app
```

## Related references

- Auth & environment variables: `auth-and-env-mapping.md`
- Setup, channel init, and DI/registration: `setup-and-di.md`
