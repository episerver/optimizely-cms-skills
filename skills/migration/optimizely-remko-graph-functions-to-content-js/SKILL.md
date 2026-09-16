---
name: optimizely-remko-graph-functions-to-content-js
description: >-
  This skill should be used when the user asks to migrate off
  "@remkoj/optimizely-graph-functions", replace the GraphQL Codegen preset or
  plugin, swap the Remko codegen pipeline for the official
  "@optimizely/cms-sdk" runtime query generation, "migrate
  optimizely-graph-functions", convert typed document nodes to the Content JS
  SDK contentType schema, move from .graphql files to contentType
  definitions, remove src/gql/ generated output, or fix codegen errors after
  switching SDKs.
---

# Migrate @remkoj/optimizely-graph-functions to @optimizely/cms-sdk

Guide the user through migrating from the community **Remko SDK**
(`@remkoj/optimizely-graph-functions`) to the official **Content JS SDK**
(`@optimizely/cms-sdk`), covering GraphQL Codegen removal, `.graphql` file
migration to `contentType()` definitions, `src/gql/` output cleanup, and the
fundamental shift from build-time codegen to runtime query generation.

This skill handles the **GraphQL Codegen pipeline** — the codegen preset,
plugin, `.graphql` source files, and generated typed-document output. The
official SDK **does not have a GraphQL Codegen preset** — it uses runtime
query generation from `contentType()` schemas instead.

## Scope & Teardown Order (applies to every skill in this suite)

Three cross-cutting rules govern the whole migration:

- **Optimizely One is out of scope (carve-out).**
  `@remkoj/optimizely-one-nextjs` (ODP + Recs + visitor-group personalization +
  site search) has **no target mapping** and is a **known residual**: it is
  explicitly permitted to remain installed after migration. "Remove all
  `@remkoj/*`" does **not** apply to it — do not strip it, and do not treat its
  presence as an incomplete migration.
- **`@remkoj/optimizely-cms-api` is a conditional residual.** Most of it
  migrates (management → `@optimizely/cms-cli`; published reads →
  `@optimizely/cms-sdk` `getClient()`), but content write/CRUD, changesets, and
  runtime OAuth are **honest gaps** with no official equivalent. Keep the
  package installed (or rewrite those paths to raw Integration API REST) **if**
  the project uses any of them; strip it only after confirming it does not.
- **Do not global-delete the `@remkoj/*` packages.** They are interdependent;
  removing them in the wrong order transiently breaks the build. Follow the
  staged teardown: client → codegen/functions → content-type registry →
  display-template + React registries → components → pages/preview → remove
  packages.

All three are specified in full — including the exact `yarn remove` command that
omits `optimizely-one-nextjs` unconditionally and stages `optimizely-cms-api`
conditionally — in the **"Scope carve-out"**, **"Conditional residual"**, and
**"Removal order"** sections of
`../_shared-references/package-and-import-mapping.md`. Read them before removing
any package.

## When to Use This Skill

- User wants to migrate from `@remkoj/optimizely-graph-functions` to the
  official `@optimizely/cms-sdk`
- User asks to replace the GraphQL Codegen preset or plugin
- User asks what the `@optimizely/cms-sdk` equivalent of the codegen preset or
  injections is
- User asks to migrate `.graphql` files (fragments, queries) to the official
  SDK
- User asks to migrate typed document nodes (`TypedDocumentNode` from
  `src/gql/`) to the official SDK
- User asks about `opti-patch` or the codegen build step (`yarn codegen`)
- User asks to remove `src/gql/` generated output
- User wants a pre-migration assessment of
  `@remkoj/optimizely-graph-functions` usage before starting the migration
- User encounters codegen errors (`codegen.ts`, `opti-patch`) after switching
  to the official SDK
- User asks how to migrate fragment injections (`PageData`, `BlockData`,
  `ElementData`) to the official SDK

## Steps

### Step 1: Assess Current Usage

Before making changes, scan the project to understand migration scope.

1. **Detect `@remkoj/optimizely-graph-functions` imports**:
   ```bash
   grep -r "from '@remkoj/optimizely-graph-functions" --include="*.ts" --include="*.tsx" --include="*.js" .
   ```

2. **Scan for key artifacts**:
   - `codegen.ts` or `codegen.yml` — GraphQL Codegen configuration file
   - `.graphql` files — fragment and query definitions (typically in
     `src/components/cms/`)
   - `src/gql/` directory — generated typed-document output
   - `codegen` script in `package.json` — the build-time codegen step (e.g.,
     `graphql-codegen --config codegen.ts`)
   - `opti-patch` usage — the post-codegen patch script
   - `@graphql-codegen/*` devDependencies — the codegen CLI and plugins

3. **Check preset usage** — find the `codegen.ts` or `codegen.yml` file and
   confirm it uses `OptimizelyGraphPreset` from
   `@remkoj/optimizely-graph-functions/preset` (the preset is the core
   codegen integration).

4. **Check injections** — if the preset is configured with `injections`
   (`into: "PageData"`, `into: "BlockData"`, `into: "ElementData"`),
   understand which fragments are spread into which receiving fragments via
   `pathRegex` matching.

5. **Check imports from `src/gql/`** — scan for imports from the generated
   output directory (e.g., `import { ArticleDataFragment } from '@/gql'`) to
   identify which components depend on typed documents.

6. **Categorize migration effort**:
   - **Minimal**: Few `.graphql` files, standard codegen setup, no custom
     codegen plugins
   - **Moderate**: Many `.graphql` files or complex fragment injection rules
   - **Significant**: Custom codegen plugins, advanced transformations, or
     heavy reliance on generated types

7. **Inventory the typed-data layer (do NOT skip — this is the true blast
   radius).** Deleting codegen is not a config edit; it re-authors the entire
   typed-data layer and rewires every consumer. Produce hard counts before you
   touch anything so the effort estimate is grounded, not guessed. On the
   reference demo the measured shape was:

   | Artifact | Count | How to measure |
   | --- | --- | --- |
   | `fragment X on Y` definitions | **33** | `grep -rhoE "fragment +\w+ +on +\w+" --include="*.graphql" . \| wc -l` |
   | query/mutation definitions | **14** | `grep -rhoE "^(query\|mutation) +\w+" --include="*.graphql" . \| wc -l` |
   | total `.graphql` definition files | **45** | `find . -name "*.graphql" \| wc -l` |
   | consumer files importing generated output | **35** | `grep -rlE "from ['\"](@/gql\|src/gql\|@/gql/graphql\|@/gql/client\|@/gql/fragment-masking)" --include="*.ts" --include="*.tsx" . \| wc -l` |
   | generated-output import lines | **46** | `grep -rhE "from ['\"](@/gql\|src/gql)" --include="*.ts" --include="*.tsx" . \| wc -l` |

   The import lines break down (on the demo) as ~34× `@/gql/graphql`, 7×
   `@/gql/client`, 3× `fragment-masking`, 2× barrel `@/gql`. **Run these
   commands against the actual project** — the numbers above are the reference
   demo's; yours will differ, but the *categories* (fragment defs, query defs,
   consumer files, import lines, fragment-masking usage) are what you must
   enumerate. The count of query/mutation definitions is the single most
   important number: those are the artifacts with **no automatic runtime
   equivalent** (see Step 4 and the master-query note).

8. **Flag `fragment-masking` consumers separately.** Any file importing from
   `@/gql/fragment-masking` (the `useFragment`/`FragmentType` helpers) is doing
   compile-time fragment unmasking that has NO runtime-query-generation
   analogue. These consumers need the most rework — they are not a mechanical
   import swap. Count them and call them out in the assessment.

**If the user only asked for assessment, stop here and report** — include the
inventory table with real counts. Do not proceed to migration steps.

### Step 2: Swap Packages

Remove the Remko codegen package and ensure the official SDK is installed.

**See `../_shared-references/package-and-import-mapping.md` for the complete
package mapping.**

```bash
# Remove community SDK codegen package
yarn remove @remkoj/optimizely-graph-functions

# Remove GraphQL Codegen dependencies if they were only used for this
yarn remove @graphql-codegen/cli @graphql-codegen/client-preset @graphql-codegen/plugin-helpers

# Add official SDK (if not already present from graph-client migration)
yarn add @optimizely/cms-sdk
```

If the project also uses other `@remkoj` packages (`optimizely-cms-react`,
`optimizely-cms-nextjs`, etc.), those will be migrated in separate steps —
see the related skills below. For now, only remove
`optimizely-graph-functions`.

### Step 3: Migrate the Codegen Pipeline (Core Honest-Gap)

**CRITICAL: The official `@optimizely/cms-sdk` does NOT have a GraphQL Codegen
preset, plugin, or any equivalent.** The Remko codegen approach (build-time
GraphQL Codegen → typed documents in `src/gql/`) is replaced by **runtime
query generation from `contentType()` schemas**.

**Before — Remko (`codegen.ts`):**

```ts
import type { CodegenConfig } from '@graphql-codegen/cli';
import getSchemaInfo from '@remkoj/optimizely-graph-client/codegen';
import OptimizelyGraphPreset, {
  type PresetOptions as OptimizelyGraphPresetOptions,
} from '@remkoj/optimizely-graph-functions/preset';

const config: CodegenConfig = {
  schema: getSchemaInfo(),
  documents: ['src/**/*.graphql'],
  generates: {
    'src/gql/': {
      preset: OptimizelyGraphPreset,
      presetConfig: {
        recursion: true,
        gqlTagName: 'gql',
        injections: [
          {
            into: 'PageData',
            pathRegex: 'src/components/cms/.*\\.page\\.graphql',
          },
          {
            into: 'BlockData',
            pathRegex: 'src/components/cms/.*\\.block\\.graphql',
          },
          {
            into: 'ElementData',
            pathRegex: 'src/components/cms/.*\\.element\\.graphql',
          },
        ],
      } as OptimizelyGraphPresetOptions,
    },
  },
  ignoreNoDocuments: false,
};

export default config;
```

**Before — Remko (sample `.graphql` file, e.g., `Article.block.graphql`):**

```graphql
fragment ArticleData on Article {
  heading
  body {
    json
  }
}
```

**After — Content JS SDK (`Article.tsx` — contentType definition):**

```tsx
import { contentType, ContentProps } from '@optimizely/cms-sdk';

export const ArticleContentType = contentType({
  key: 'Article',
  baseType: '_page',
  properties: {
    heading: { type: 'string' },
    body: { type: 'richText' },
  },
});

type Props = {
  content: ContentProps<typeof ArticleContentType>;
};

export default function Article({ content }: Props) {
  return (
    <article>
      <h1>{content.heading}</h1>
      <div>{content.body?.json}</div>
    </article>
  );
}
```

**After — Content JS SDK (root `layout.tsx` — registration):**

```tsx
import { ArticleContentType } from '@/components/Article';
import { initContentTypeRegistry } from '@optimizely/cms-sdk';

// Register content types — replaces the codegen schema introspection.
initContentTypeRegistry([ArticleContentType]);

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Critical migration notes:**

1. **No codegen preset equivalent.** There is no `@optimizely/cms-sdk` preset
   to pass to `@graphql-codegen/cli`. The SDK generates GraphQL queries
   **internally at runtime** from the `contentType()` schemas registered via
   `initContentTypeRegistry()`.

2. **No `.graphql` files.** The property schema that used to live in `.graphql`
   fragments now lives in the `contentType()` definition's `properties`. The
   `.graphql` files are no longer read.

3. **No `src/gql/` output.** The SDK does not generate typed-document files.
   Delete the `src/gql/` directory.

4. **No `codegen` script.** Delete the `yarn codegen` or `npm run codegen`
   script from `package.json`.

5. **No `opti-patch`.** The post-codegen patch script is no longer needed.
   Delete any `opti-patch` usage.

6. **Delete `codegen.ts` or `codegen.yml`.** The codegen configuration file is
   no longer used.

7. **Fragment injections have no equivalent.** The Remko `injections` (spread
   fragments into `PageData`/`BlockData`/`ElementData` via `pathRegex`
   matching) are not applicable. The `contentType()` definition is the schema
   — there are no receiving fragments to inject into.

8. **Field names may not survive 1:1 — tabulate the renames.** A `.graphql`
   fragment selects Graph *schema* fields; a `contentType()` declares
   *property* keys. They are usually the same, but not always: GraphQL
   selection sets can alias fields (`displayName: name`), select system fields
   under `_metadata` (`_metadata { key url { default } }`), and dereference
   nested typed fields (`body { json html }`) that become a single typed
   property (`body: { type: 'richText' }`). Before deleting a fragment, build a
   small mapping table for each type — fragment field → contentType property →
   `type` — so no selected field silently disappears. Example:

   | `.graphql` selection | `contentType()` property | `type` |
   | --- | --- | --- |
   | `heading` | `heading` | `string` |
   | `body { json }` | `body` | `richText` |
   | `promoImage { ...ReferenceData }` | `promoImage` | `contentReference` |
   | `_metadata { url { default } }` | (system field — read via `content._metadata`, not a declared property) | — |

   Fields selected under `_metadata` are **not** declared as `properties`; they
   are surfaced by the SDK on `content._metadata`. Do not re-declare them.

**Migration steps:**

1. **Delete the codegen configuration file** (`codegen.ts` or `codegen.yml`).
2. **Delete fragment `.graphql` files** — the per-type fragments become
   `contentType()` `properties`. **But do NOT blindly delete query/mutation
   `.graphql` files first.** For each of the 14 (measured) query definitions,
   apply Step 4's decision rule: identity fetches convert to
   `getContent`/`getContentByPath` (safe to delete the source query), while
   filtered/faceted/search/paginated queries must be **re-authored** against a
   custom client before their source is removed. Deleting a filtered query
   without re-authoring silently drops that feature with no type error.
3. **Delete the `src/gql/` directory** (generated output).
4. **Remove the `codegen` and `opti-patch` scripts from `package.json`**.
5. **Create `contentType()` definitions** for each content type (see the
   before/after example above). The properties from the `.graphql` fragment
   become the `properties` field in `contentType()`.
6. **Register the content types** via `initContentTypeRegistry([…])` in the
   root layout (see the before/after example above).

### Step 4: Migrate Generated-Query Usage

Where code imported typed documents from `src/gql/` and passed them to the
graph client, replace with `getContent` / `getContentByPath` (which build
queries internally).

**Before — Remko (component with typed-document import):**

```tsx
import { ArticleDataFragment } from '@/gql';
import { getClient } from '@remkoj/optimizely-graph-client';

export async function fetchArticle(id: string) {
  const client = getClient();
  const result = await client.query({
    query: ArticleDataFragment,
    variables: { id },
  });
  return result.data;
}
```

**After — Content JS SDK (component with runtime query generation):**

```tsx
import { getClient } from '@optimizely/cms-sdk';

export async function fetchArticle(key: string) {
  const client = getClient();
  // The SDK builds the GraphQL query internally from the registered contentType.
  const content = await client.getContent({ key });
  return content;
}
```

**Critical migration notes:**

1. **No typed-document imports.** Do not import from `src/gql/` or
   `@/gql` — that directory is deleted.

2. **Content-by-identity uses `getContent` / `getContentByPath`.** For fetching
   a single content item by `key` (or a page by path), these methods build the
   GraphQL query internally from the registered `contentType()` schema. For
   this case you do NOT construct a query.

3. **Cross-reference the graph-client skill.** The `getContent` /
   `getContentByPath` methods are covered in detail in the
   `optimizely-remko-graph-client-to-content-js` skill.

#### Not every query is a `getContent` call — the decision rule

> **Do NOT tell the user "you never write queries."** That is false. The SDK's
> runtime query generation covers **content fetched by identity** (key or
> path). It does **not** cover filtered lists, faceting, full-text search, or
> pagination across *other* content types. Those were real `.graphql` queries
> in the source (on the reference demo: `ArticleListElement`, `getBlogPosts.ts`,
> and `lib/api/search`) and they need a real query after migration too.

Use this decision rule for each of the 14 (measured) query/mutation
definitions you inventoried in Step 1:

| Source query does… | Target approach |
| --- | --- |
| Fetch one item by `key` | `client.getContent({ key })` |
| Fetch a page by URL path | `client.getContentByPath({ path })` |
| Filter / facet / search / paginate a list of *other* content | **App-owned custom GraphQL client** (Apollo, urql, or raw `fetch`) + validate the response with `toSchema(contentType)` |

The third row is the escape hatch the old skill wording denied existed. Per
content-JS `docs/5-fetching.md`, you own the query and use the SDK only to
validate/shape the result:

```ts
import { getClient } from '@optimizely/cms-sdk';
import { toSchema } from '@optimizely/cms-sdk/schema';
import { ArticleContentType } from '@/components/Article';

// You author the GraphQL yourself for filtered/paginated/search queries.
const LIST_ARTICLES = /* GraphQL */ `
  query ListArticles($locale: [Locales!], $skip: Int, $limit: Int) {
    Article(locale: $locale, skip: $skip, limit: $limit,
            orderBy: { _metadata: { published: DESC } }) {
      items { heading body { json } _metadata { key url { default } } }
      total
    }
  }
`;

export async function listArticles(skip = 0, limit = 10) {
  const client = getClient();
  const data = await client.request(LIST_ARTICLES, { skip, limit });

  // Validate each item against the registered contentType schema.
  const schema = toSchema(ArticleContentType);
  return data.Article.items.map((item) => schema.parse(item));
}
```

`toSchema(contentType)` returns a Zod schema; use `.safeParse(data)` when you
want to handle validation failures gracefully, or `.parse(data)` to throw. Pass
`{ strict: true }` to reject unknown fields, or rely on the default passthrough
behavior when the query selects fields the contentType does not declare (e.g.
`_metadata`). This keeps the app's hand-written queries honest against the
registered schema without regenerating a typed-document layer.

#### Master-query composition loss (ties to the fetching gap)

> **Call this out explicitly.** Remko's codegen composed a single **master
> query** per route by injecting every matched fragment into
> `PageData`/`BlockData`/`ElementData`. One HTTP request returned a whole page
> tree — page + all nested blocks + all elements — in one round trip.

The official SDK's `getContent`/`getContentByPath` resolves the page and its
registered nested types, but **there is no automatic fragment-composition
mechanism** that stitches arbitrary per-component fragments into one query. If
the source app depended on that single-request composition (large nested
experience trees, visual-builder layouts), verify the target still fetches the
full tree in one call. If it does not, the migration can silently turn one
request into many (N+1 fetches per block), degrading performance without any
type error to warn you. Where the composed tree matters, author an explicit
custom query (per the decision rule above) that selects the full nesting depth
rather than relying on incidental resolution.

### Step 5: Verify Migration

1. **TypeScript compilation check**:
   ```bash
   npx tsc --noEmit
   ```
   Fix any remaining import errors or type mismatches.

2. **Confirm codegen artifacts are deleted**:
   ```bash
   # Expect no results:
   ls codegen.ts codegen.yml src/gql/ 2>/dev/null
   ```

3. **Confirm no dangling imports from `@remkoj/optimizely-graph-functions` or
   `src/gql/`**:
   ```bash
   grep -r "from '@remkoj/optimizely-graph-functions" --include="*.ts" --include="*.tsx" .
   grep -r "from '@/gql'" --include="*.ts" --include="*.tsx" .
   grep -r "from 'src/gql'" --include="*.ts" --include="*.tsx" .
   ```
   Fix any remaining imports.

4. **Confirm `package.json` scripts are clean**:
   ```bash
   # Check for stale codegen or opti-patch scripts:
   grep -E "codegen|opti-patch" package.json
   ```
   Remove any stale scripts.

5. **Confirm filtered/search queries were re-authored, not dropped.**
   Cross-check the query inventory from Step 1: every filtered/faceted/search/
   paginated query definition must have a corresponding hand-authored query on
   a custom client (validated with `toSchema`). A `getContent` call cannot
   replace a filtered list.
   ```bash
   # Sanity check: list files that still shape lists/search so you can confirm
   # each has a real query behind it, not a broken getContent stand-in.
   grep -rlE "getBlogPosts|ArticleList|/search|listArticles" --include="*.ts" --include="*.tsx" .
   ```
   For each hit, open the file and confirm the filtering/pagination logic
   survived the migration.

CRITICAL: Do not report migration complete until the codegen artifacts are
deleted, fragment `.graphql` files are removed, filtered/search queries are
re-authored (not dropped), imports are fixed, and `npx tsc --noEmit` succeeds.

## Common Pitfalls

1. **Looking for a drop-in preset** — There is NO `@optimizely/cms-sdk` preset
   or plugin for `@graphql-codegen/cli`. Do NOT try to find one. The SDK uses
   runtime query generation from `contentType()` schemas, not build-time
   codegen.

2. **Leaving stale `src/gql/` imports** — After deleting `src/gql/`, confirm
   no component imports from that directory. Grep for `from '@/gql'` or
   `from 'src/gql'` and remove all such imports.

3. **Fragment injections have no equivalent** — The Remko `injections`
   (`into: "PageData"`, `pathRegex`, etc.) spread fragments into receiving
   fragments. The official SDK does NOT use fragments — the property schema
   lives in `contentType()`. Do not try to replicate the injection pattern.

4. **Forgetting to remove the `codegen` and `opti-patch` scripts** — After
   deleting `codegen.ts` and the `.graphql` files, also remove the `codegen`
   and `opti-patch` scripts from `package.json` and the
   `@graphql-codegen/*` devDependencies.

5. **`.graphql` files are no longer read** — The SDK does NOT read `.graphql`
   files. The property schema moves into `contentType()` definitions. Do NOT
   leave `.graphql` files in the project expecting them to be used.

6. **Schema introspection for codegen is removed** — Remko's
   `getSchemaInfo()` from `@remkoj/optimizely-graph-client/codegen` was used
   to introspect the Graph schema for codegen. The official SDK does NOT
   introspect a schema for codegen — it builds queries from the
   `contentType()` schemas at runtime.

7. **`TypedDocumentNode` imports are removed** — If the project imported
   `TypedDocumentNode` from `@graphql-typed-document-node/core` or
   `@remkoj/optimizely-graph-functions`, remove those imports. The SDK does
   NOT use typed-document nodes.

8. **Preset options (`recursion`, `gqlTagName`, `injections`) are not
   configurable** — The Remko preset took options like `recursion`,
   `gqlTagName`, and `injections`. The official SDK does NOT have a preset,
   so there is nothing to configure. Query generation is automatic.

9. **`DefaultFunctions`, `fragments`, `queries` codegen exports have no
   equivalent** — Remko's `@remkoj/optimizely-graph-functions/documents`
   exports (`DefaultFunctions`, `fragments`, `queries`) were built-in
   CMS12/CMS13 fragments and queries for the *codegen preset*. The official SDK
   does NOT ship these codegen artifacts. **This does not mean "you never write
   queries"** — content fetched by identity is generated at runtime from
   `contentType()`, but filtered/faceted/search/paginated queries of other
   content types are still hand-authored against a custom GraphQL client and
   validated with `toSchema(contentType)` (see Step 4's decision rule). Do not
   collapse "no codegen exports" into "no queries."

10. **`EmbeddedLoader` is removed** — Remko's `EmbeddedLoader` from
    `@remkoj/optimizely-graph-functions/loader` was a GraphQL Codegen loader
    for embedded documents. The official SDK does NOT use a loader — there is
    no codegen step.

## Related Skills

- `optimizely-remko-graph-client-to-content-js` — Migrate `@remkoj/optimizely-graph-client` (Graph client, fetching) — **complete this first**
- `optimizely-remko-cms-react-to-content-js` — Migrate `@remkoj/optimizely-cms-react` (React rendering, component factory)
- `optimizely-remko-cms-nextjs-to-content-js` — Migrate `@remkoj/optimizely-cms-nextjs` (Next.js integration, preview/OPE)
- `optimizely-remko-cms-cli-to-content-js` — Migrate `@remkoj/optimizely-cms-cli` (`opti-cms` → `optimizely-cms-cli`)
- `optimizely-remko-graph-cli-to-content-js` — Migrate `@remkoj/optimizely-graph-cli` (`opti-graph` → `optimizely-cms-cli`)
- `optimizely-remko-cms-api-to-content-js` — Migrate `@remkoj/optimizely-cms-api` (Integration API client; straddle skill, do last)

**Shared references (read first)**:

- `../_shared-references/package-and-import-mapping.md` — Package/import subpath mapping
- `../_shared-references/auth-and-env-mapping.md` — Environment variables + CMS-55679 gotcha
- `../_shared-references/setup-and-di.md` — Channel/client init + factory registration + context wiring
