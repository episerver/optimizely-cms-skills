# Design: Remko SDK → Content JS SDK Migration Skills

**Date:** 2026-09-10
**Status:** Approved (design phase); implementation not yet started
**Author:** Monica Haggerty
**Audience of the skills:** External customer developers migrating an existing app off the community Remko SDK onto Optimizely's official Content JS SDK.

---

## 1. Scope & the 7 → 3 fan-in

### What we are migrating *from* and *to*

- **Source (community):** `@remkoj/optimizely-*` — repo `C:\Projects\optimizely-dxp-clients`.
- **Target (official):** `@optimizely/*` — repo `C:\Projects\content-js-sdk`.

### Seven skills, one per in-scope source package

We author **7 skills**, one per source package. This mirrors how a customer actually experiences the migration: they have specific `@remkoj/*` imports in their code, and each skill owns the story for exactly one of those packages.

The 8th Remko package, `@remkoj/optimizely-one-nextjs`, is **out of scope** — it is Optimizely One / experimentation and has no Content-JS-SDK counterpart. This is why the count is "7, not 8."

### The fan-in (7 source packages → 3 target packages)

The mapping is *not* one-to-one. Five source packages fan into `@optimizely/cms-sdk`; two CLIs fan into `@optimizely/cms-cli`; `cms-api` straddles both (runtime API types land in the SDK, scaffolding/codegen lands in the CLI).

The `#` column below is a stable list index for cross-reference only — it is **not** the build order (see §5 for build order).

| # | Skill slug | Source package | Primary target | Notes |
|---|------------|----------------|----------------|-------|
| 1 | `optimizely-remko-graph-client-to-content-js` | `@remkoj/optimizely-graph-client` | `@optimizely/cms-sdk` (`./graph`, client utils) | Auth/env story lives here; foundational |
| 2 | `optimizely-remko-cms-react-to-content-js` | `@remkoj/optimizely-cms-react` | `@optimizely/cms-sdk` (`./react/server`, `./react/client`) | Component factory → SDK renderers |
| 3 | `optimizely-remko-cms-nextjs-to-content-js` | `@remkoj/optimizely-cms-nextjs` | `@optimizely/cms-sdk` (`./react/nextjs`) | Page/preview/publish handlers |
| 4 | `optimizely-remko-graph-functions-to-content-js` | `@remkoj/optimizely-graph-functions` | `@optimizely/cms-sdk` (codegen/query helpers) | GraphQL codegen plugin story |
| 5 | `optimizely-remko-cms-api-to-content-js` | `@remkoj/optimizely-cms-api` | `@optimizely/cms-sdk` + `@optimizely/cms-cli` | Straddles both targets — built last |
| 6 | `optimizely-remko-cms-cli-to-content-js` | `@remkoj/optimizely-cms-cli` | `@optimizely/cms-cli` | Type sync / scaffolding commands |
| 7 | `optimizely-remko-graph-cli-to-content-js` | `@remkoj/optimizely-graph-cli` | `@optimizely/cms-cli` | Graph source config commands |

Home for all 7: `C:\Projects\optimizely-cms-skills\skills\migration\` (registered in `.claude-plugin/plugin.json`).

---

## 2. Shared-vs-owned reference boundary

Cross-cutting concerns that every skill would otherwise repeat are extracted into **shared reference files**; anything package-specific is **owned** by exactly one skill.

### Shared references (authored once, linked from many skills)

- `_shared-references/package-and-import-mapping.md` — the full `@remkoj/*` subpath → `@optimizely/*` subpath table (all export subpaths for the 3 target packages), plus install/uninstall command pairs.
- `_shared-references/auth-and-env-mapping.md` — the env-var rename table (`OPTIMIZELY_CONTENTGRAPH_*` / `OPTIMIZELY_GRAPH_*` → Content-JS-SDK names), the Single Key vs App Key + Secret (HMAC) split, and the **CMS-55679 gotcha** (stale App Key/Secret → schema-init abort → empty renders).
- `_shared-references/setup-and-di.md` — app bootstrap: `ChannelRepository.createDefinition` → SDK channel/client setup, provider/context wiring, factory registration.

The shared references live in `skills/migration/_shared-references/`, a sibling of each skill folder, so every SKILL.md links them with a stable relative path (`../_shared-references/<file>.md`). Because `_shared-references` has no `SKILL.md`, it is **not** listed in `plugin.json` — it is reference-only content, not a skill.

### Owned references (one per skill)

Each skill owns the detail that only applies to its package:
- API symbol mapping table (source export → target export, with "no equivalent" rows called out honestly).
- Detection greps (the import/usage patterns a customer will have).
- Before/after code pairs.
- Package-specific pitfalls.

**Rule:** if two skills would say the same thing, it goes in a shared reference. If only one skill needs it, it stays owned. Shared references are loaded on-demand: each SKILL.md's `## Related Skills` section carries a **Shared references (read first)** list telling the agent which shared files to load before starting, and in what order.

---

## 3. Per-skill anatomy

Each skill mirrors the existing `optimizely-cms12-to-13` template exactly:

```
migration/<skill-slug>/
  SKILL.md
  evals/
    evals.json
  references/
    <owned-reference>.md
```

`SKILL.md` structure:
1. **YAML frontmatter** — `name` (the slug) + `description` (the trigger phrase; must contain the source package name so routing fires on `@remkoj/optimizely-<x>`).
2. **When to Use** — the customer situation ("you have `@remkoj/optimizely-<x>` imports and want the official SDK").
3. **## Steps** — numbered. Each step = a Detection grep (what to find) + a before/after code transform. Ordered so the app stays buildable between steps where possible.
4. **## Common Pitfalls** — package-specific traps, including honest "no direct equivalent — here's the workaround / here's where you stop."
5. **## Related Skills** — cross-links, especially the fan-in siblings and the shared references.

Routing is carried entirely by main's existing skill mechanism — there is no separate GOVERNANCE.md. Each skill's frontmatter `description` ("This skill should be used when…") is what the agent matches against to select the skill, so every description embeds its source package name. Cross-skill sequencing (e.g. "migrating a full Next.js app touches skills 1→2→3 in order") lives in each SKILL.md's `## Related Skills` section, which names the sibling skills and their order plus the shared references to read first.

---

## 4. Eval strategy

Evals follow the established `evals.json` shape:
`{ "skill_name", "evals": [{ "id", "prompt", "expected_output", "files", "assertions": [{"name","check"}] }] }`.

Two eval flavors per skill:

1. **Static transform evals** — given a snippet of `@remkoj/*` code, assert the migrated output uses the correct `@optimizely/*` imports/APIs. Assessment-only prompts ("identify what changes; do not edit") are included to exercise the detection step in isolation.
2. **Honest-gap evals** — where a source API has *no* target equivalent (the known example: find-to-graph's `FilterHits`), the eval asserts the skill **documents the gap and stops**, rather than inventing an API.

**Sample-driven validation harness (lightweight):**
- Test site: `C:\Projects\optimizely-dxp-clients\samples\basic-project` (already wired to `@remkoj/*` via yarn `portal:`).
- Backend: the user's **own existing hosted Graph source** that the local CMS syncs to (no provisioning; CMS-55679 topology).
- Loop: `docker compose up` (SQL) → run `Optimizely.Cmsaas` with Graph keys in user-secrets → publish content → copy the **Single Key** into `samples/basic-project/.env` → `yarn install && yarn dev` → `localhost:3000`.
- **Same-Single-Key diff harness:** point both the original Remko sample and a migrated `@optimizely` copy at the *same* Graph source; diff rendered HTML for a deterministic equivalence check.

**Secret handling (standing constraint):** Graph Single Key / App Key + Secret and the local CMS admin credentials are handled only via `dotnet user-secrets` / dev KeyVault. Never read into the transcript, never committed. `.env` for the sample stays git-ignored.

---

## 5. Build order

Foundational packages first, so later skills can cross-link into settled shared references:

1. `optimizely-remko-graph-client-to-content-js` — establishes `auth-and-env-mapping.md` + `setup-and-di.md`.
2. `optimizely-remko-cms-react-to-content-js` — establishes component/factory story.
3. `optimizely-remko-cms-nextjs-to-content-js` — builds on 1 + 2 (page/preview/publish).
4. `optimizely-remko-graph-functions-to-content-js` — codegen.
5. `optimizely-remko-cms-cli-to-content-js` — CLI target.
6. `optimizely-remko-graph-cli-to-content-js` — CLI target.
7. `optimizely-remko-cms-api-to-content-js` — **last**, because it straddles both targets and depends on the SDK and CLI stories being settled.

Shared references (`package-and-import-mapping.md`, `auth-and-env-mapping.md`, `setup-and-di.md`) are drafted alongside skill 1 and refined as later skills reveal gaps.

---

## 6. Definition of done

- All 7 skill folders exist under `skills/migration/` with `SKILL.md` + `evals/evals.json` + owned references, and all 7 are registered in `.claude-plugin/plugin.json`.
- 3 shared references authored under `skills/migration/_shared-references/` and linked from each skill's `## Related Skills` → "Shared references (read first)" list.
- Cross-skill routing carried by frontmatter `description` triggers + per-skill `## Related Skills` sequencing notes (no separate GOVERNANCE.md).
- Every skill's evals pass, including at least one assessment-only eval and one honest-gap eval where applicable.
- At least one skill (graph-client, the foundational one) validated end-to-end through the `basic-project` diff harness against a real Graph source.
- No secrets in any committed file; sample `.env` git-ignored.
