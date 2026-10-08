# Graph Functions API Mapping: Remko SDK → Content JS SDK

Complete mapping of `@remkoj/optimizely-graph-functions` symbols to their
`@optimizely/cms-sdk` equivalents. Every row is grounded in the real exports
of each package (source: `@remkoj/optimizely-graph-functions`, target:
`@optimizely/cms-sdk`), verified 2026-09-11.

## Preset and plugin exports

The core codegen integration — preset and plugin.

| Remko symbol (subpath) | signature/purpose | @optimizely equivalent | migration note |
|---|---|---|---|
| `preset` (`./preset`) | `const preset: Preset` — default export of GraphQL Codegen preset for Optimizely Graph | — no direct equivalent | **No codegen preset exists.** The official SDK uses runtime query generation from `contentType()` schemas registered via `initContentTypeRegistry()`, not build-time codegen. Delete `codegen.ts`, `.graphql` files, `src/gql/`, and `yarn codegen` script. See capability gaps below. |
| `plugin` (`.` / `./plugin`) | GraphQL Codegen plugin (same as preset; dual export) | — no direct equivalent | **No codegen plugin exists.** The official SDK does not integrate with `@graphql-codegen/cli`. See capability gaps below. |

## Transform and utility exports

Functions for transforming and validating codegen config.

| Remko symbol (subpath) | signature/purpose | @optimizely equivalent | migration note |
|---|---|---|---|
| `transform` (`./transform`) | `function transform(schema, documents, config)` — transform GraphQL documents before codegen | — no direct equivalent | No codegen step exists in the target. The SDK generates queries at runtime. |
| `validate` (`./transform`) | `function validate(schema, documents, config, outputFile, allPlugins)` — validate codegen config and documents | — no direct equivalent | No codegen validation is needed. The SDK validates `contentType()` schemas at runtime. |
| `extractPluginConfigAndApplyDefaults` (`./preset`) | Extract and apply default preset config | — no direct equivalent | No preset config exists. |

## Documents and built-in fragments

Embedded CMS12/CMS13 fragments and queries.

| Remko symbol (subpath) | signature/purpose | @optimizely equivalent | migration note |
|---|---|---|---|
| `DefaultFunctions` (`./documents`) | Built-in CMS12/CMS13 GraphQL functions | — no direct equivalent | The SDK does not ship built-in fragments. All queries are generated at runtime from `contentType()` schemas. |
| `fragments` (`./documents`) | Built-in CMS12/CMS13 GraphQL fragments (e.g., `PageData`, `BlockData`, `ElementData`) | — no direct equivalent | The SDK does not use fragments. Property schemas live in `contentType()` definitions. |
| `queries` (`./documents`) | Built-in CMS12/CMS13 GraphQL queries | — no direct equivalent | The SDK generates queries at runtime via `GraphClient.getContent()` / `getContentByPath()`. You do not write or import queries. |

## Loader

GraphQL Codegen loader for embedded documents.

| Remko symbol (subpath) | signature/purpose | @optimizely equivalent | migration note |
|---|---|---|---|
| `EmbeddedLoader` (`./loader`) | `class EmbeddedLoader` — GraphQL Codegen loader for embedded documents | — no direct equivalent | No codegen loader is needed. The SDK does not read `.graphql` files. |

## Document AST plugin

GraphQL Codegen plugin for AST manipulation.

| Remko symbol (subpath) | signature/purpose | @optimizely equivalent | migration note |
|---|---|---|---|
| `./document-ast` | GraphQL Codegen plugin for document AST manipulation | — no direct equivalent | No AST plugin is needed. The SDK does not use codegen. |

## Bin: opti-patch

Post-codegen patch script.

| Remko symbol (subpath) | signature/purpose | @optimizely equivalent | migration note |
|---|---|---|---|
| `opti-patch` (bin) | `bin/opti-patch` — post-codegen patch script to fix generated output | — no direct equivalent | No post-codegen patching is needed. The SDK generates queries at runtime with no codegen step. Delete `opti-patch` usage. |

## Types

Configuration and option types for the preset and plugin.

| Remko symbol (subpath) | signature/purpose | @optimizely equivalent | migration note |
|---|---|---|---|
| `PresetOptions` (`./preset`) | `interface PresetOptions` — config for the GraphQL Codegen preset (`recursion`, `gqlTagName`, `injections`, etc.) | — no direct equivalent | No preset exists, so no preset options. The SDK builds queries at runtime with no configuration. |
| `PluginOptions` (`./plugin`) | `interface PluginOptions` — config for the GraphQL Codegen plugin | — no direct equivalent | No plugin exists, so no plugin options. |
| `TransformOptions` (`./transform`) | `interface TransformOptions` — config for the transform function | — no direct equivalent | No transform function exists. |
| `Injection` (`./preset`) | `interface Injection` — config for fragment injection (`into`, `pathRegex`) | — no direct equivalent | **Fragment injections have no equivalent.** The Remko `injections` spread fragments into receiving fragments (`PageData`, `BlockData`, `ElementData`) via `pathRegex` matching. The official SDK does not use fragments — the property schema lives in `contentType()`. See capability gaps below. |
| `IntoMatchType` (`./preset`) | `type IntoMatchType` — valid `into` values for injections: `"PageData"`, `"BlockData"`, or `"ElementData"` | — no direct equivalent | No fragment injection exists. |
| `DocumentAstPluginOptions` (`./document-ast`) | Options for the document AST plugin | — no direct equivalent | No AST plugin exists. |
| `Mandatory<T>`, `WithRequiredProp<T, K>`, `Writeable<T>` (`./preset`) | Utility types | — no direct equivalent | Not needed. The SDK does not use codegen. |

## Capability gaps

**CRITICAL: The official `@optimizely/cms-sdk` does NOT have a GraphQL Codegen
preset, plugin, or any equivalent for the build-time codegen pipeline.**

The Remko `@remkoj/optimizely-graph-functions` package provides:

1. **GraphQL Codegen preset** (`OptimizelyGraphPreset`) — plugs into
   `@graphql-codegen/cli` to generate typed-document nodes from `.graphql`
   files and introspected Graph schema.

2. **Fragment injection system** — spreads fragments into receiving fragments
   (`PageData`, `BlockData`, `ElementData`) via `pathRegex` matching against
   `.graphql` file paths (e.g., `*.page.graphql` → `PageData`, `*.block.graphql`
   → `BlockData`).

3. **Built-in CMS12/CMS13 fragments and queries** — `DefaultFunctions`,
   `fragments`, `queries` from `./documents` (embedded GraphQL for common CMS
   operations).

4. **Post-codegen patching** — `opti-patch` bin script to fix generated
   output.

5. **`.graphql` file sourcing** — reads fragment and query definitions from
   `.graphql` files (e.g., `Article.block.graphql`) and generates
   `TypedDocumentNode` output in `src/gql/`.

**None of these have an equivalent in `@optimizely/cms-sdk`.**

### Recommended migration approach

**The official SDK uses a fundamentally different model — runtime query
generation from a content-type registry:**

1. **`contentType({...})` (ROOT export of `@optimizely/cms-sdk`)** —
   declaratively define a content type and its property schema IN CODE
   (TypeScript), replacing hand-authored `.graphql` files.

   ```ts
   import { contentType } from '@optimizely/cms-sdk';

   export const ArticleContentType = contentType({
     key: 'Article',
     baseType: '_page',
     properties: {
       heading: { type: 'string' },
       body: { type: 'richText' },
     },
   });
   ```

2. **`initContentTypeRegistry([Type1, Type2, ...])` (ROOT export)** — register
   the content types (call in root layout). This replaces the schema
   introspection (`getSchemaInfo()` from
   `@remkoj/optimizely-graph-client/codegen`).

   ```tsx
   import { initContentTypeRegistry } from '@optimizely/cms-sdk';
   import { ArticleContentType } from '@/components/Article';

   initContentTypeRegistry([ArticleContentType]);
   ```

3. **Runtime query generation** — the SDK builds GraphQL queries internally
   when you call `GraphClient.getContent()` / `getContentByPath()`. The
   internal builders (`createSingleContentQuery`, `createMultipleContentQuery`,
   `createFragment`) are NOT public — customers never call them.

   ```ts
   import { getClient } from '@optimizely/cms-sdk';

   const client = getClient();
   const content = await client.getContent({ key: 'article-key' });
   ```

**Net migration:**

- **DELETE**: `codegen.ts`, `.graphql` files, `src/gql/` output, `codegen` /
  `opti-patch` npm scripts, `@remkoj/optimizely-graph-functions` +
  `@graphql-codegen/*` devDependencies.

- **REPLACE WITH**: `contentType()` definitions registered via
  `initContentTypeRegistry()`. The property-schema info that used to live in
  `.graphql` fragments now lives in the `contentType()` definition's
  `properties`. Content fetching is covered by the graph-client + cms-react
  skills.

**Fragment injections (`into: "PageData"`, `pathRegex`) have no equivalent.**
The receiving fragments (`PageData`, `BlockData`, `ElementData`) do not exist
in the target — the property schema is the `contentType()` definition itself.

**Built-in fragments (`DefaultFunctions`, `fragments`, `queries`) have no
equivalent.** The SDK does not ship built-in GraphQL fragments or queries. All
queries are generated at runtime from `contentType()` schemas.

## Blast radius — this is a rebuild, not a swap

Deleting the codegen pipeline is the easy part (a few files and scripts). The
real work is that **codegen output has consumers all over the app**, and every
one of them must be rewired. Do not scope this as "remove `codegen.ts`" — scope
it as "re-author the entire typed-data layer."

In the reference demo (`cms-saas-vercel-demo`) the shape of the work was:

| What | Count | Migration cost |
|---|---|---|
| `.graphql` fragment/query files (codegen **input**) | ~45 | Each becomes a hand-authored `contentType()` (one per content type). Not mechanical — GraphQL field selections collapse into `properties` entries. |
| Source files importing generated `@/gql` **output** | ~35 | Each import site is rewired off `@/gql` onto the typed `content` prop / `getClient()` methods. |
| `gql/` generated directory | committed | Deleted wholesale. |

So a realistic plan is: (1) author one `contentType()` per source `.graphql`
type, (2) register them with `initContentTypeRegistry()`, (3) convert each
fragment-typed component (see the worked example in the
`optimizely-remko-cms-react-to-content-js` skill), and (4) rewire every
remaining `@/gql` **data** consumer as shown below. Budget for ~45 + ~35 edits,
not a config swap.

### Worked example — one data consumer (fragment masking → typed content)

Component conversion is covered in the cms-react skill. This is the **other**
consumer class: code that imports generated query functions and the
`getFragmentData` masking helper from `@/gql` to load and unwrap data.

**Before — Remko (generated `@/gql` consumer with fragment masking):**

```tsx
import { getContentById } from '@/gql/functions'
import { getFragmentData } from '@/gql/fragment-masking'
import { ArticleHeroDataFragmentDoc } from '@/gql/graphql'

// Fetch via a generated query function, then UNMASK the fragment to read fields.
const response = await getContentById(client, { key })
const raw = response?.content?.item
const hero = getFragmentData(ArticleHeroDataFragmentDoc, raw)

return <h1>{hero?.heading}</h1>
```

**After — Content JS SDK (typed content, no masking):**

```tsx
import { getClient } from '@optimizely/cms-sdk'

// getContent returns typed, already-expanded content — no query doc, no unmask.
const content = await getClient().getContent({ key })

return <h1>{content?.heading}</h1>
```

**What disappears:**

- `@/gql/functions` (`getContentById` / `getContentByPath`) → `getClient().getContent()` / `getContentByPath()` (root export of `@optimizely/cms-sdk`; see the graph-client skill). `getContentByPath` returns an **array**.
- `@/gql/fragment-masking` (`getFragmentData`, `FragmentType`, `useFragment`) → **nothing.** There is no fragment masking in the target; `getContent()` returns fully-typed, fully-expanded objects. Read fields directly.
- `@/gql/graphql` (generated `TypedDocumentNode`s and `XxxDataFragment` types) → **nothing.** Types come from `ContentProps<typeof YourContentType>`, not generated docs.
- The `graphql()` / `gql` tagged-template imports → **nothing for identity fetches.** You no longer hand-author query strings to fetch content by id or path — `getClient().getContent()` / `getContentByPath()` cover those. **But** filtered, faceted, full-text-search, and paginated queries of *other* content are still hand-authored against an app-owned GraphQL client and validated with `toSchema(contentType)` (see this skill's Step 4 decision rule). Do **not** delete those query definitions.

## Related references

- Package/import mapping: `../_shared-references/package-and-import-mapping.md`
- Setup, channel init, and DI/registration: `../_shared-references/setup-and-di.md`
- Auth & environment variables: `../_shared-references/auth-and-env-mapping.md`
