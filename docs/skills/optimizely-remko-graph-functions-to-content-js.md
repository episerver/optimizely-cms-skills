# Remko Graph Functions to Content JS SDK Migration

Migrate the community **Remko Graph Functions** package (`@remkoj/optimizely-graph-functions`) to the official **Content JS SDK** (`@optimizely/cms-sdk`). This skill owns the **GraphQL Codegen pipeline** — the codegen preset, plugin, `.graphql` source files, and generated typed-document output. The official SDK **has no GraphQL Codegen preset**; it uses **runtime query generation** from `contentType()` schemas instead. Complete the [`optimizely-remko-graph-client-to-content-js`](optimizely-remko-graph-client-to-content-js.md) migration first.

## When to Use

Use this skill when you want to:
- Replace `@remkoj/optimizely-graph-functions` with `@optimizely/cms-sdk`
- Remove the GraphQL Codegen preset / plugin and `codegen.ts` / `codegen.yml`
- Migrate `.graphql` fragments/queries to `contentType()` definitions
- Delete the generated `src/gql/` output and `opti-patch` step
- Understand the shift from build-time codegen to runtime query generation
- Decide which queries convert to `getContent()` vs need a hand-authored client
- Diagnose codegen errors after switching SDKs

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate optimizely-graph-functions"
- "Replace the GraphQL Codegen preset"
- "Convert typed document nodes to contentType"
- "Move from .graphql files to contentType definitions"
- "Remove src/gql generated output"
- "Fix codegen errors after switching SDKs"
- "Migrate fragment injections (PageData / BlockData / ElementData)"

## Usage Example

```
You: "Migrate our @remkoj/optimizely-graph-functions codegen to the official SDK"

Agent: [Uses optimizely-remko-graph-functions-to-content-js skill]
- Inventories the typed-data layer: fragment defs, query defs, .graphql files,
  consumer files, and generated-output import lines (with real counts)
- Flags fragment-masking consumers separately (most rework)
- Removes the codegen package + @graphql-codegen/* devDeps
- Deletes codegen.ts, .graphql fragments, src/gql/, and the codegen/opti-patch scripts
- Rewrites fragments as contentType() properties, registered via initContentTypeRegistry
- Applies the per-query decision rule (identity vs filtered/faceted/search)
```

```
You: "What replaces the codegen preset in the official SDK?"

Agent: [Uses optimizely-remko-graph-functions-to-content-js skill]
- Explains there is NO codegen preset, plugin, or equivalent
- Content fetched by identity (key/path) generates its query at runtime from
  contentType()
- Filtered/faceted/search/paginated queries are hand-authored against a custom
  GraphQL client and validated with toSchema(contentType) — NOT "you never write queries"
```

## What It Handles

- **Typed-data inventory** — Counts fragments, queries, `.graphql` files, consumer files, import lines, and fragment-masking usage (the true blast radius)
- **Package swap** — Removes `@remkoj/optimizely-graph-functions` + `@graphql-codegen/*`, adds `@optimizely/cms-sdk`
- **Codegen teardown** — Deletes `codegen.ts`/`codegen.yml`, `.graphql` files, `src/gql/`, and the `codegen`/`opti-patch` scripts
- **Schema migration** — `.graphql` fragments → `contentType()` `properties`, registered via `initContentTypeRegistry`
- **Query migration** — Identity fetches → `getContent`/`getContentByPath`; filtered/search → hand-authored client + `toSchema()`
- **Honest gaps** — No codegen preset, no fragment injections, no fragment-masking; master-query composition can silently become N+1

## Method Mapping Quick Reference

| Remko (`@remkoj/optimizely-graph-functions`) | Content JS SDK (`@optimizely/cms-sdk`) |
|-----------------------------------------------|-----------------------------------------|
| `OptimizelyGraphPreset` (codegen preset) | — no equivalent (runtime query generation) |
| `.graphql` fragment | `contentType({ properties })` |
| `injections` (`PageData`/`BlockData`/`ElementData`) | — no equivalent (schema lives in `contentType()`) |
| generated `src/gql/` typed documents | — deleted (queries built internally) |
| identity query (by key / path) | `getContent({ key })` / `getContentByPath({ path })` |
| filtered / faceted / search / paginated query | app-owned GraphQL client + `toSchema(contentType)` |
| `getSchemaInfo()` (schema introspection) | — no equivalent |
| `fragment-masking` (`useFragment`/`FragmentType`) | — no equivalent (most rework) |
| `codegen` / `opti-patch` scripts | — deleted |

## Important Notes

- **There is NO codegen preset.** Do not look for a drop-in `@optimizely/cms-sdk` preset for `@graphql-codegen/cli`. Queries are generated at runtime from `contentType()` schemas registered via `initContentTypeRegistry`.
- **"No codegen" does NOT mean "no queries."** Content fetched by identity is generated for you. Filtered/faceted/search/paginated queries of *other* content types are still real queries — hand-author them against a custom GraphQL client (Apollo, urql, raw `fetch`) and validate with `toSchema(contentType)` (Zod). Collapsing this into "you never write queries" silently drops features with no type error.
- **Inventory before deleting.** Count fragments, query defs, `.graphql` files, consumer files, and import lines. The query/mutation count is the most important number — those are the artifacts with no automatic runtime equivalent.
- **Flag `fragment-masking` consumers separately.** `useFragment` / `FragmentType` do compile-time unmasking with no runtime analogue — the most rework, not a mechanical import swap.
- **Field names may not survive 1:1.** GraphQL selections can alias, dereference nested typed fields (`body { json }` → `body: { type: 'richText' }`), and select `_metadata`. Tabulate fragment field → `contentType()` property → `type` before deleting. `_metadata` fields are read via `content._metadata`, not declared as properties.
- **Master-query composition loss (N+1 risk).** Remko's codegen composed one master query per route (page + nested blocks + elements in one round trip). The SDK has no automatic fragment-composition; if the app relied on it, one request can silently become many. Author an explicit custom query where the composed tree matters.

## Related Skills

- [`optimizely-remko-graph-client-to-content-js`](optimizely-remko-graph-client-to-content-js.md) — Migrate the Graph client / fetching (**complete first**)
- [`optimizely-remko-cms-react-to-content-js`](optimizely-remko-cms-react-to-content-js.md) — Migrate the React rendering surface and `contentType()` components
- [`optimizely-remko-cms-nextjs-to-content-js`](optimizely-remko-cms-nextjs-to-content-js.md) — Migrate Next.js pages and preview
- [`optimizely-content-fetching`](optimizely-content-fetching.md) — Fetching patterns and custom queries with the official SDK
- [`optimizely-graphql-optimization`](optimizely-graphql-optimization.md) — Optimizing hand-authored GraphQL queries
