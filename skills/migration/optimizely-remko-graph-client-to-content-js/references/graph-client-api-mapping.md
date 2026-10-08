# Graph Client API Mapping: Remko SDK → Content JS SDK

Complete mapping of `@remkoj/optimizely-graph-client` symbols to their
`@optimizely/cms-sdk` equivalents. Every row is grounded in the real exports
of each package (source: `@remkoj/optimizely-graph-client`, target:
`@optimizely/cms-sdk`), read 2026-09-11.

## Client creation and configuration

The foundational client setup pattern changes completely.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `createClient()` (`.`) | `function createClient(config?: OptimizelyGraphConfig, token?: string, flags?: Partial<IOptiGraphClientFlags>): IOptiGraphClient` | `config()` then `getClient()` | **Signature has three positional args, not zero.** Grounded on v5.2.0; the 3-arg shape is already true at 5.2.0, so real apps pass args. The third arg is `flags` (`queryCache`, `cache`, `nextJsFetchDirectives`, `omitEmpty`, `includeDeleted`, …), **not** `options`. A common real call is `createClient(undefined, undefined, { nextJsFetchDirectives: true, cache: true, queryCache: true })` — env-derived config, no explicit token, fetch/cache flags. Remko's imperative `createClient()` that reads env vars is replaced by `config({ apiKey, graphUrl })` (call once in root layout) + `getClient()` to retrieve the shared client anywhere. **The `flags` have no positional analogue in the target** — caching/fetch behavior is configured through `config()`/`GraphOptions` and Next.js fetch settings, not a third client arg. See `setup-and-di.md`. |
| `ContentGraphClient` (`./client`) | `class ContentGraphClient(config: ContentGraphConfig)` | `GraphClient` | Constructor signature differs: Remko takes a config object with `single_key`, `app_key`, `secret`; target takes `new GraphClient(apiKey, options)` where `options = Omit<GraphOptions, 'apiKey'>` (e.g. `{ graphUrl }`), or use `getClient()`. **`GraphOptions` has no `secret` field** — the target client has no App Key + Secret HMAC path. It authenticates with EITHER `epi-single <apiKey>` (public single key) OR `Bearer <preview_token>` (per-request preview token). Drop `app_key`/`secret` when porting the constructor. |
| `createHmacFetch()` (`./client`) | `function createHmacFetch(appKey, secret): fetch` | — no direct equivalent | The runtime `GraphClient` does **not** sign requests with HMAC at all — there is no `secret` on `GraphOptions` and no HMAC fetch path. Draft reads use a per-request `Bearer <preview_token>` (see `getPreviewContent` / `getContent(ref, { previewToken })`), not HMAC. App Key + Secret HMAC survives only as a **codegen / CLI** concern (schema pull/push), never in this client. |
| `isContentGraphClient()` (`./client`) | `function isContentGraphClient(value): boolean` | — no direct equivalent | Type guard removed. Use TypeScript `instanceof GraphClient` if needed. |

## Configuration and environment

Config reading and validation is folded into the SDK client.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `readEnvironmentVariables()` (`./config`) | `function readEnvironmentVariables(): ContentGraphConfig` | `config()` | Env-var reading (`OPTIMIZELY_GRAPH_SINGLE_KEY`, `OPTIMIZELY_GRAPH_GATEWAY`) is built into `config()`. Do not call `readEnvironmentVariables()` yourself — just pass env vars to `config()`. |
| `validateConfig()` (`./config`) | `function validateConfig(config): boolean` | — no direct equivalent | Validation happens inside `config()` / `new GraphClient()`. Invalid config throws. |
| `applyConfigDefaults()` (`./config`) | `function applyConfigDefaults(config): ContentGraphConfig` | — no direct equivalent | Defaults applied internally by `config()` / `GraphClient` constructor. |
| `OptiCmsSchema` (`./config`) | `const OptiCmsSchema: Zod schema` | — no direct equivalent | Zod schema not exposed. Config is validated internally. |

## Routing

The `RouteResolver` class is replaced by a client method.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `RouteResolver` (`./router`) | `class RouteResolver(client, channel)` | `GraphClient.getContentByPath()` | No standalone router class. Path-based content retrieval is a method on `GraphClient`: `await client.getContentByPath('/en/about/')` returns an array of matching content. Used directly in Next.js `[...slug]` pages. |
| `RouteResolver.resolve()` | `async resolve(path): Promise<Content \| null>` | `GraphClient.getContentByPath(path)` | Remko returns a single item or null; target returns an array (access `[0]` for the first match). |
| `RouteResolver.getRoutes()` | `async getRoutes(baseUrl?: string, includeDefaultLocale?: boolean): Promise<Route[]>` | — **no direct SDK equivalent** | Enumerating every route in the CMS is not a `GraphClient` method. Recommended pattern: paged direct GraphQL query against `_Content` using `graphql-request` (already in most Next.js starter deps), selecting `_metadata.url.hierarchical` (fallback `_metadata.url.default`), `_metadata.locale`, and `_metadata.lastModified` for `lastmod`. Primary caller is `app/sitemap.ts`. **Reference case (2026-09):** a project's `apps/cms/src/app/sitemap.ts` rewrote `new RouteResolver().getRoutes(baseUrl, true)` as a paged `graphql-request` query against `_Content` reading `OPTIMIZELY_GRAPH_GATEWAY` + `OPTIMIZELY_GRAPH_SINGLE_KEY` directly; preserves default-locale-slug stripping and fails soft (empty sitemap) if env vars are missing. |

## Fetching methods

Core content retrieval API.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `ContentGraphClient.request()` | `async request(query, variables): Promise<any>` | `GraphClient.getContent()` | Remko's low-level `request()` for raw GraphQL is replaced by typed methods. Use `getContent({ key, locale })` for key-based lookups, `getContentByPath()` for path-based, or `getItems()` / `getPath()` for navigation. |
| (none) | n/a | `GraphClient.getContentByPath(path, options?)` | **New in target**: fetches content by URL path. Returns an array. Primary method for Next.js catch-all pages. |
| (none) | n/a | `GraphClient.getContent(reference, options?)` | **New in target**: fetches by `GraphReference` (key + optional locale/version). Preview is enabled via `options.previewToken` (e.g. `getContent({ key }, { previewToken })`), not a positional arg. |
| (none) | n/a | `GraphClient.getItems(path, options?)` | **New in target**: returns direct child pages of a given path. For building navigation menus. |
| (none) | n/a | `GraphClient.getPath(path, options?)` | **New in target**: returns ancestor pages (breadcrumb trail). |

## No direct equivalent

The following Remko symbols have **no public equivalent** in `@optimizely/cms-sdk`.
Stop and document usage; do not invent a replacement.

### Channels (`./channels`)

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `ChannelRepository` | Multi-channel/host/locale registry | **No direct equivalent**. Channel identity (name, domains, locales) is replaced by `buildConfig()` in `optimizely.config.mjs` (component discovery), a single `config()` call (Graph credentials), and Next.js routing (host/locale). See `setup-and-di.md`. |
| `ChannelDefinition` | Descriptor for one channel (name, locales, domains, CMS URL) | **No direct equivalent**. See `setup-and-di.md`. Locales/host are handled by Next.js route segments (e.g., `[locale]`), not an SDK object. |
| `createDefinition()` | Factory for `ChannelDefinition` | **No direct equivalent**. Remove `channel.ts` files that call this. Replace with `buildConfig()` + `config()` + Next.js routing. |
| `ChannelRepository.getAll()` | List all registered channels | **No direct equivalent**. Multi-site wiring is app-owned. |
| `ChannelRepository.getById()` | Lookup channel by ID | **No direct equivalent**. |
| `ChannelRepository.getByDomain()` | Lookup channel by domain | **No direct equivalent**. Use Next.js host-based routing or middleware. |

### Admin API (`./admin`)

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `OptimizelyGraphAdminApi` | Graph Admin API client (schema push/pull, webhooks) | **No direct equivalent**. Schema sync is now done via `@optimizely/cms-cli` (`optimizely-cms-cli config push`). Admin operations are not part of the runtime SDK. See the `optimizely-remko-graph-cli-to-content-js` skill. |
| `DefinitionV2Service`, `DefinitionV3Service` | Admin API service clients | **No direct equivalent**. Use the CLI. |
| `WebhooksService`, `LogsService`, `QueryGraphQlService`, `BestBetsService`, `ResourcesService`, `OidcService` | Admin API operations | **No direct equivalent**. Use the CLI or CMS admin UI. |

### Codegen (`./codegen`)

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `getGraphQLCodegenSchema()` | GraphQL codegen config helper | **No direct equivalent**. GraphQL codegen is replaced by the CLI-generated content-type registry (`optimizely-cms-cli config pull`). See the `optimizely-remko-graph-functions-to-content-js` skill for full codegen migration. |

### Utility functions (`./utils`)

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `localeToGraphLocale()` | Convert CMS locale to Graph locale (`en-US` → `en_US`; accepts 2/5-char, `ALL`, `NEUTRAL`, else throws) | **No direct equivalent — but the conversion is no longer yours to do.** Remko needs it because you pass the underscore-form locale as a raw GraphQL query variable (`locale: en_US`). The target replaces hand-written GraphQL with typed fetch methods that take a **`locale` option in the app's own format**: `getContent({ key }, { locale: 'en-US' })`, `getContentByPath(path, { locale: 'en-US' })`. Pass the CMS/BCP-47 locale (hyphenated) straight through — the SDK maps it to the Graph form internally. **Do not** pre-convert to `en_US`. Only the small set of usages that fed query variables need this; usages that merely tagged fetched content fall away (read `_metadata.locale` instead). |
| `graphLocaleToLocale()` | Convert Graph locale to CMS locale | **No direct equivalent**. See above. |
| `contentLinkIsEqual()` | Compare two ContentLink objects | **No direct equivalent**. Content is fetched by key/path, not by `ContentLink` structures. If comparing content identity, use `_metadata.key` or `_metadata.id`. |
| `isContentLink()` | Type guard for ContentLink | **No direct equivalent**. The target SDK does not expose a `ContentLink` type — content is fetched by key/path and returned as typed objects. |
| `normalizeContentLink()` | Normalize ContentLink to canonical form | **No direct equivalent**. See above. |
| `contentLinkToString()` | Serialize ContentLink | **No direct equivalent**. If you need to serialize a content reference, use `_metadata.key` or `_metadata.url.hierarchical`. |
| `isInlineContentLink()` | Detect inline (expanded) ContentLink | **No direct equivalent**. Not applicable — content is fetched and expanded via `getContent()` / `getContentByPath()`. |
| `isValidFrontendUser()` | Validate frontend user token | **No direct equivalent**. Token validation is internal to the SDK preview flow. Do not implement custom token validation. |
| `validateToken()` | Validate HMAC token | **No direct equivalent**. HMAC is internal. |
| `getAuthMode()` | Detect auth mode (Single Key vs HMAC) | **No direct equivalent**. The runtime client has only two modes: `epi-single <apiKey>` (single key, from `config()` / the `GraphClient` constructor) and `Bearer <preview_token>` (per-request, when a preview token is present). There is no HMAC mode to detect. |
| `base64encode()` | Base64 encode string | **No direct equivalent**. Use standard `btoa()` (browser) or `Buffer.from(str).toString('base64')` (Node). |

## Error types

| Remko symbol | purpose | @optimizely equivalent |
|---|---|---|
| `ApiError` | Admin API errors | `OptimizelyGraphError` (base class) |
| `CancelError`, `CancelablePromise` | Request cancellation | — no direct equivalent (use AbortController if needed) |

## Enumerations and constants

| Remko symbol | purpose | @optimizely equivalent |
|---|---|---|
| `Services` enum | Service names for client factory | — no direct equivalent (no factory pattern in target) |
| `ClientFactory`, `ClientInstanceType` | Client factory types | — no direct equivalent |
| `ContentGraphConfig` type | Config object shape | `GraphOptions` (passed to `config()` or `GraphClient` constructor) |
| `AuthMode` enum (`./client`) | Selects the credential mode. Values: `Public = "epi-single"`, `Basic = "use-basic"`, `HMAC = "use-hmac"`, `Token = "use-token"`, `User = "use-user"`. | — **no direct equivalent (no public enum)**. Do not import `AuthMode`. The runtime client picks its header automatically: a Single Key → `epi-single` (published delivery reads); a per-request preview token → `Bearer` (draft / on-page-edit reads). Preview is toggled by supplying that token via `getContent(ref, { previewToken })` / `getPreviewContent(params)`, **not** by setting an auth-mode enum and **not** via App Key + Secret HMAC (which is a codegen/CLI concern only). See `../_shared-references/auth-and-env-mapping.md`. |

## Types

| Remko symbol (subpath) | shape | @optimizely equivalent | migration note |
|---|---|---|---|
| `IOptiGraphClient` (`./client`) | Interface for the Remko client (`debug`, `siteInfo`, `currentAuthMode`, `frontendUser`, `graphSchemaVersion`; methods `updateAuthentication`, `query` (deprecated), `updateFlags`, `restoreFlags`, `enablePreview`, `disablePreview`, `isPreviewEnabled`, `getChangeset`, …) | `GraphClient` (the concrete class) | Where code is typed `client: IOptiGraphClient`, retype as `client: GraphClient` (import from `@optimizely/cms-sdk`). The target exposes a concrete class, not a separate interface; there is no public `query()` — use the typed fetch methods (`getContent`, `getContentByPath`, `getItems`, `getPath`). Preview toggling moves from `enablePreview()`/`disablePreview()` to the per-call `{ previewToken }` option. |
| `ContentLinkWithLocale` (`./services`) | `ContentLink & { locale? }` where `ContentLink = { key: string, version?, isInline? }` | — **no direct equivalent** | The target does not expose a `ContentLink` type. Content is addressed by a `key` string or a `GraphReference` (`{ key, locale?, version? }`) passed to `getContent()`. Replace `ContentLinkWithLocale` params with `string` or `GraphReference`; read identity back from `_metadata.key` / `_metadata.locale`. |
| `InlineContentLinkWithLocale` (`./services`) | `InlineContentLink & { locale? }` where `InlineContentLink = { key?: null\|"", version?: null, isInline?: true }` | — **no direct equivalent** | Inline (embedded) content is returned already-expanded by `getContent()` / `getContentByPath()`; there is no separate inline-link reference to carry. Remove the type; consume the expanded object directly. |

## Related references

- Package/import mapping: `../_shared-references/package-and-import-mapping.md`
- Auth & environment variables: `../_shared-references/auth-and-env-mapping.md`
- Setup, channel init, and DI/registration: `../_shared-references/setup-and-di.md`
