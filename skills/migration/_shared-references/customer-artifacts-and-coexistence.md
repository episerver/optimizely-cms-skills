# Customer artifacts and coexistence

Real customers rarely have clean Remko installs. Before applying any skill in
this suite, run the discovery below and use the coexistence guidance to plan
partial migration.

## Customer artifacts to detect BEFORE migrating

Real migrations regularly hit three classes of artifact the skill's mapping
tables do not cover:

### 1. Patches on Remko packages

Look for a `patches/` directory next to `package.json` and for
`pnpm.patchedDependencies` (pnpm) or `resolutions` / `overrides` blocks:

```bash
# pnpm
ls apps/*/patches/@remkoj__* 2>/dev/null
grep -l 'patchedDependencies' pnpm-lock.yaml package.json 2>/dev/null

# yarn / npm
ls patches/@remkoj+*.patch 2>/dev/null
```

Patched behaviour rarely survives a package swap silently — every patch
encodes a behaviour the customer's team believed was important enough to
fork. Before removing a patched Remko package, catalogue what each patch
changes and decide whether to:

- **Reproduce** the patch behaviour against the SDK equivalent
- **Upstream** the fix (open an issue against `@optimizely/cms-*`)
- **Accept** the regression (rare — patches usually guard against real bugs)

**Reference case:** a 2026-09 reference migration found
`@remkoj/optimizely-cms-cli` patched with 8 distinct behaviour changes
(fail-closed exit code, `_contract` base-type routing, `createdBy` field
stripping on push/pull, three Ajv/OpenAPI defect relaxations, `$ref` +
annotation-sibling handling, sequential push, data-loss acknowledgment
header). Ignoring the patch on migration would have silently shipped
broken schemas.

### 2. Custom wrappers around Remko types

Look for files that import Remko types and export augmented ones:

```bash
grep -rnl 'from .@remkoj' apps/*/src --include='*.ts' --include='*.tsx' \
  | xargs grep -l 'export' 2>/dev/null
```

Wrappers often carry business logic that must survive the migration.
Preserve the WHY of the wrapper, not the Remko-specific type substrate.

**Reference case:** a `remkojExt.ts` wrapper that adds container-key
propagation to allowed block typenames on top of
`ContentAreaItemDefinition`. Structural logic preserved; only the imported
type substrate moved to a project-owned equivalent.

### 3. Forked / patched codegen tooling

`file:` protocol deps + `patchedDependencies` on codegen packages signal a
customer has forked upstream builds:

```bash
grep -E 'file:|link:' apps/*/package.json 2>/dev/null
grep -A2 'patchedDependencies' pnpm-lock.yaml package.json 2>/dev/null | \
  grep -E 'graphql-codegen|graphql-tools' 2>/dev/null
```

Forks accumulate: they get patched further, they drift from upstream, they
often stop matching the version installed alongside them. Any migration
touching codegen must decide whether the fork travels forward, is unfrozen,
or gets replaced.

**Reference case:** a project running on
`@remkoj/optimizely-graph-functions@6.0.0-rc.1` patched to enable the
queries loader, plus a *separately* patched
`@graphql-codegen/typescript@5.0.9`, plus a locally-built tarball
`graphql-codegen-visitor-plugin-common-v5.8.0-patched.tgz` forced via
`pnpm-lock.yaml` override. The whole patched triangle exists to keep one
codegen pipeline working — abandoning codegen dissolves all three; keeping
codegen forces all three forward.

## Coexistence: leaving Remko installed while migrating around it

Skills in this suite each cover one surface. Real migrations happen surface
by surface, meaning **most of the time Remko packages remain installed while
one surface is migrated at a time.** This is the intended flow, not a
failure mode.

### Rules for coexistence

1. **Do not remove `@remkoj/*` packages from `package.json`** until every
   surface the package covers has been migrated. The teardown-order note in
   each skill lists dependencies.

2. **Type imports for a still-installed Remko package remain valid**. When a
   sibling surface is not yet migrated, keep importing the Remko type from
   the Remko package. Don't invent shims for types you will still consume
   later from the same package.

3. **Mixed clients coexist**. `getClient()` (SDK) and `createClient(...)`
   (Remko) can both be instantiated in the same runtime. They read the same
   Graph. The SDK's `GraphClient` does not conflict with `IOptiGraphClient`.

4. **Codegen output stays valid**. `@/gql/*` type imports keep resolving as
   long as `graphql-codegen` still runs. The graph-functions skill's
   migration is optional per surface — a partially-migrated project can
   import codegen'd fragments AND use SDK typed methods in the same file.

5. **`ctx.client` from `GenericContext` stays typed as `IOptiGraphClient`
   until the cms-react migration runs.** Do not retype it early;
   `@remkoj/optimizely-cms-react` still owns that type.

6. **Expect `pnpm typecheck` breakage between phases.** When one skill's
   migration lands, sibling files that call methods only available on the
   Remko client (e.g., `client.query()`, `client.updateAuthentication()`,
   `client.enablePreview()`) will fail typecheck. Use the error list as a
   scope map for the next surface.

### What to do when a skill's migration is landing but the sibling isn't

- Keep the Remko import in place, comment above it referencing the sibling
  skill that will move it.
- If a hybrid file uses both patterns, add a short "Migration state" doc
  comment at the top listing which surface has moved and which hasn't.
- Do not attempt to remove `@remkoj/*` dev deps or lockfile entries during
  partial migration — teardown removals are a distinct final step.

## The Replace / Retain / Remove framework

From the official Optimizely-produced migration guide, every touched
surface should be classified into one of three buckets before the migration
starts. Skills in this suite implicitly work through the Replace bucket,
but the framework must be applied by the agent BEFORE opening any skill:

| Bucket | Definition | Migration action |
|--------|------------|------------------|
| **Replace** | Standard CMS responsibility currently handled by Remko | Follow the applicable skill's Step 5 / migration section |
| **Retain** | Application-specific behaviour that happens to use Remko helpers | Preserve the behaviour; port to app-owned code without Remko import |
| **Remove** | Infrastructure that only exists because of Remko | Delete outright; do not port |

Every migration decision — including "which Remko package to remove first"
— should trace back to this classification. Skills describe the Replace
path; Retain and Remove decisions are the customer's.

## References

- **Official Optimizely migration guide**: *Migrating from Remko.J to the
  Optimizely CMS JavaScript SDK* (Confluence). Source-of-truth for the
  Replace/Retain/Remove framework and the "assess, don't rebuild"
  positioning.
- **Optimizely CMS JavaScript SDK repo**:
  https://github.com/episerver/content-js-sdk
- **Optimizely CMS SDK + Next.js 16 starter** (primary practical
  reference): https://github.com/episerver/content-js-sdk/tree/main/samples/nextjs-template
- **Direct-Graph Next.js 15 starter** (supplementary reference, by Szymon
  Uryga — useful for what does NOT need to become SDK-specific code):
  https://github.com/SzymonUryga/optimizely-graph-nextjs-starter
