---
name: optimizely-remko-migration-discovery
description: >-
  This skill should be used FIRST when the user asks to migrate off Remko.J,
  assess a Remko.J to @optimizely/cms-sdk migration, plan a Remko removal,
  "which Remko migration skill do I need", "audit our Remko usage", inventory
  Remko dependencies, decide teardown order for a Remko migration, "how big
  is this migration", or scope a Remko-to-SDK cutover. Discovery skill —
  reads a customer's package.json and filesystem to identify installed Remko
  packages, patches, wrappers, and forks, then routes to the applicable
  surface-specific migration skills in the correct teardown order.
---

# Remko.J → Optimizely CMS JavaScript SDK — Migration Discovery

Route this skill BEFORE any of the seven surface-specific Remko migration
skills. It answers three questions that skills further down the chain
assume have been answered:

1. **Which surface-specific Remko migration skills apply to this customer?**
2. **In what order should they be executed?**
3. **What customer-owned artifacts (patches, wrappers, forks) must be
   catalogued before migration begins?**

The output is a routing plan for the rest of the Remko migration skill
suite, tailored to the customer's actual code.

## When this skill applies

Trigger this skill when:

- The user says any of "migrate from Remko," "migrate off Remko.J," "swap
  Remko for the official SDK," "assess our Remko usage," "which migration
  skill do we need," "audit Remko dependencies," "plan a Remko cutover."
- The user asks about migrating a Next.js SaaS CMS app that imports from
  `@remkoj/*` packages.
- The user shares a codebase and asks how to migrate its CMS integration.
- The user asks to scope, estimate, or sequence a Remko removal.

**Do NOT trigger this skill when:**

- The user has already identified the specific Remko surface to migrate
  (page routing, CLI, component factory, etc.) — go directly to the
  applicable surface skill.
- The user asks about migrating a non-Remko codebase.

## What this skill does

1. Read `package.json` (and workspace `package.json`s in a monorepo) to
   identify installed `@remkoj/*` packages.
2. Search the working tree for imports from those packages, to identify
   which surfaces the customer actually uses (installed does not mean
   consumed).
3. Detect **customer artifacts** the surface skills' mapping tables do
   not cover:
   - Patches on Remko packages (`patches/`, `pnpm.patchedDependencies`,
     `resolutions`, `overrides`)
   - Custom wrappers around Remko types (files that import Remko types and
     re-export augmented versions)
   - Forked codegen tooling (`file:` / `link:` deps, patched codegen
     packages)
4. Output a **routing plan**:
   - Ordered list of surface-specific skills to invoke
   - Customer-artifact catalogue (per-artifact: what it is, where it lives,
     what the migration must reconcile)
   - Rough effort category (Minimal / Moderate / Significant / X-Large)
   - Decisions the customer must make BEFORE starting the migration

## Discovery process

### Step 1 — Detect installed Remko packages

Read every `package.json` in the workspace. Grep for `@remkoj/`:

```bash
# Root + all workspace packages
find . -name package.json -not -path '*/node_modules/*' -exec \
  grep -l '@remkoj/' {} \;
```

Extract every `@remkoj/*` package name and version. For monorepos, note
which workspace package contains each dep — Remko is typically confined to
one app (e.g., `apps/cms/`), and the rest of the monorepo is unaffected.

Categorise each installed package by surface:

| Remko package | Surface | Applicable skill |
|---------------|---------|------------------|
| `@remkoj/optimizely-graph-client` | Graph client, channel model, route resolution | `optimizely-remko-graph-client-to-content-js` |
| `@remkoj/optimizely-cms-react` | Component factory, registries, editable, content areas | `optimizely-remko-cms-react-to-content-js` |
| `@remkoj/optimizely-cms-nextjs` | Page routing, preview, publish handler, .well-known | `optimizely-remko-cms-nextjs-to-content-js` |
| `@remkoj/optimizely-cms-api` | Content types + content CRUD (management plane) | `optimizely-remko-cms-api-to-content-js` |
| `@remkoj/optimizely-cms-cli` (bin `opti-cms`) | CMS content-type push/pull | `optimizely-remko-cms-cli-to-content-js` |
| `@remkoj/optimizely-graph-cli` (bin `opti-graph`) | Graph infra (webhooks, sources, patches:apply) | `optimizely-remko-graph-cli-to-content-js` |
| `@remkoj/optimizely-graph-functions` | GraphQL codegen preset | `optimizely-remko-graph-functions-to-content-js` |

### Step 2 — Detect actual usage

Installed ≠ consumed. Grep for imports:

```bash
grep -rn "from '@remkoj/" --include='*.ts' --include='*.tsx' --include='*.mjs' \
  --include='*.js' --include='*.cjs' \
  -l apps/ packages/ 2>/dev/null | sort -u
```

For each installed package, confirm at least one import exists. Packages
installed but never imported are candidates for immediate removal
(no migration required — just `pnpm remove`).

Group hits by file to understand blast radius per surface. Any Remko
package with hits in >20 files is likely to have "L" or larger effort
regardless of what its skill's Step 5 says.

### Step 3 — Detect customer artifacts

Follow the `_shared-references/customer-artifacts-and-coexistence.md`
checklist:

**Patches:**
```bash
ls apps/*/patches/@remkoj__* 2>/dev/null
find . -name patches -type d -not -path '*/node_modules/*' 2>/dev/null
grep -A5 patchedDependencies pnpm-lock.yaml package.json 2>/dev/null
```

For each patch found, read it and note:
- Which Remko package it patches
- Which behaviours it changes (headline categories: exit code, path
  routing, header injection, type flags, etc.)
- Whether it is a bug fix (upstream candidate) or a feature addition
  (customer-specific)

**Custom wrappers:**
```bash
grep -rln "from '@remkoj/" --include='*.ts' apps/*/src 2>/dev/null | \
  xargs grep -l 'export type\|export interface\|export function' 2>/dev/null
```

Look for wrapper filenames (`remkojExt.ts`, `remkojWrapper.ts`,
`cms-ext.ts`, etc.) or files that augment Remko types (`WithX<T>`
patterns).

**Forked codegen tooling:**
```bash
grep -E 'file:|link:' apps/*/package.json 2>/dev/null
grep -B1 -A3 'graphql-codegen\|visitor-plugin' pnpm-lock.yaml package.json 2>/dev/null
```

Note any tarball deps, `file:` protocol references, or patched
codegen-adjacent packages.

### Step 4 — Determine teardown order

The seven skills have prose-documented dependencies. The canonical order
for a full migration:

```
1. Graph client (foundational — everyone needs this first)
   └─ optimizely-remko-graph-client-to-content-js
2. CMS React (component factory, before Next.js)
   └─ optimizely-remko-cms-react-to-content-js
3. CMS Next.js (page routing, preview, publish — depends on React)
   └─ optimizely-remko-cms-nextjs-to-content-js
4. Graph Functions (codegen — independent of Next.js, but often coupled
   with cms-react migration through fragment consumption)
   └─ optimizely-remko-graph-functions-to-content-js
5. Graph CLI (webhook management — independent, can slot in anywhere)
   └─ optimizely-remko-graph-cli-to-content-js
6. CMS CLI (types push/pull — depends on cms-react completing to align
   contentType() factory expectations)
   └─ optimizely-remko-cms-cli-to-content-js
7. CMS API (content write/CRUD — straddle skill, do LAST because
   many customers retain it as "honest gap")
   └─ optimizely-remko-cms-api-to-content-js
```

Skip surfaces the customer does not consume. For each remaining surface,
carry forward the effort category from the discovery.

### Step 5 — Categorise overall effort

| Category | Signals | Rough duration |
|----------|---------|----------------|
| **Minimal** | 1-2 Remko packages installed, all used lightly (<5 imports each), no patches, no wrappers, no forked codegen | 1-2 weeks single dev |
| **Moderate** | 3-4 Remko packages, moderate usage (5-30 imports per), 0-1 patches, no forked codegen | 4-8 weeks single team |
| **Significant** | 5-7 Remko packages, heavy usage in one or more (>30 imports), 1-3 patches, wrappers present | 3-6 months team |
| **X-Large** | 7 Remko packages, heavy usage across all, multiple patches, custom wrappers, forked codegen tooling, monorepo scope | 6-12 months team |

Effort category is a routing signal for whether to expect a big-bang
migration (Minimal) or a progressive multi-quarter cutover
(Significant / X-Large).

### Step 6 — Identify pre-migration decisions

Skills further down the chain reference decisions the customer must make
BEFORE the skill can be fully applied. Discover which decisions apply
based on what was found:

| Decision | Trigger conditions | Skills gated on it |
|----------|--------------------|--------------------|
| **Codegen architecture** — keep codegen (swap preset) OR abandon | `@remkoj/optimizely-graph-functions` installed AND codegen output consumed | `-graph-functions`, `-cms-react` (block-fragment rewrites) |
| **`_contract` base type** — supported in official CLI? | Customer's CMS schema uses `isContract: true` types (check `.opti-type.json` files if present) | `-cms-cli`, `-cms-api` |
| **Preview auth model** — bearer-only OR retain HMAC fallback | `graph.ts` calls `updateAuthentication(AuthMode.HMAC)` OR `client.enablePreview()` | `-graph-client`, `-cms-nextjs` |
| **Editor Save flows** — keep Remko-cms-api as residual OR port to raw REST | `contentPatchVersion` / `contentCreateVersion` calls found | `-cms-api` |
| **Webhook registration location** — CI script / runtime / admin UI | `webhook:create` script or `register-webhook.*` file found | `-graph-cli` |
| **`@optimizely/cms-sdk` peer-dep window** — Next / React compat | Resolvable via `npm view @optimizely/cms-sdk peerDependencies` — do this in discovery | (all) |

Emit the applicable decisions in the routing-plan output so the customer
can resolve them before invoking surface skills.

## Output template

```markdown
# Remko migration routing plan for <customer/project>

## Installed Remko packages
| Package | Version | Used? | Blast radius |
|---------|---------|-------|--------------|
| @remkoj/... | ... | yes/no | <count> files |

## Customer artifacts detected
- Patches: <list, or "none">
- Custom wrappers: <list, or "none">
- Forked codegen: <list, or "none">

## Overall effort category: <Minimal / Moderate / Significant / X-Large>

## Recommended teardown order
1. <skill 1>
2. <skill 2>
...

## Decisions to resolve before starting
- <decision>: <framing>
- ...

## Next step
Invoke `<first-skill-in-order>` to begin. Return to this discovery skill if
the customer's codebase changes materially during the migration.
```

## Applying the Replace / Retain / Remove framework

Before invoking any surface-specific skill, classify what you found into
the three buckets from the official Optimizely-produced migration guide:

- **Replace** — standard CMS responsibilities that move to the SDK. This
  is what every surface-specific skill in this suite handles.
- **Retain** — application-specific behaviour that happens to use Remko
  helpers. Preserve the WHAT; migrate the Remko dependency away without
  rewriting the logic.
- **Remove** — infrastructure that only exists because Remko required it.
  Delete outright once its final consumer is migrated.

Each surface skill assumes items in its Step 5 have been classified as
Replace. Retain and Remove classifications are the customer's — this
discovery skill highlights them; it does not decide them.

See `_shared-references/customer-artifacts-and-coexistence.md` for the
full framework and the coexistence rules used while migrating one surface
at a time.

## Related skills

**Downstream** (invoke based on discovery output):

- `optimizely-remko-graph-client-to-content-js`
- `optimizely-remko-cms-react-to-content-js`
- `optimizely-remko-cms-nextjs-to-content-js`
- `optimizely-remko-cms-api-to-content-js`
- `optimizely-remko-cms-cli-to-content-js`
- `optimizely-remko-graph-cli-to-content-js`
- `optimizely-remko-graph-functions-to-content-js`

## References

- **Official Optimizely migration guide**: *Migrating from Remko.J to the
  Optimizely CMS JavaScript SDK* (Confluence, September 2026)
- **Optimizely CMS JavaScript SDK repo**:
  https://github.com/episerver/content-js-sdk
- **Optimizely CMS SDK + Next.js 16 starter** (primary practical
  reference):
  https://github.com/episerver/content-js-sdk/tree/main/samples/nextjs-template
- **Direct-Graph Next.js 15 starter** (supplementary reference by
  Szymon Uryga):
  https://github.com/SzymonUryga/optimizely-graph-nextjs-starter
- **Shared reference**:
  `../_shared-references/customer-artifacts-and-coexistence.md`
