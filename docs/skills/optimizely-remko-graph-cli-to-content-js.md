# Remko Graph CLI to Content JS SDK CLI Migration

Migrate the community **Remko Graph CLI** (`@remkoj/optimizely-graph-cli`, bin `opti-graph`) to the official **Content JS SDK CLI** (`@optimizely/cms-cli`, bin `optimizely-cms-cli`). This is **not a drop-in replacement**: the Remko Graph CLI manages **Optimizely Graph infrastructure** (webhooks, content sources, site/channel config generation, GraphQL-codegen patches), while `@optimizely/cms-cli` manages **CMS content-type definitions + auth**. There is **near-zero command overlap** — this migration is **almost entirely honest gaps**. Most operations move to the Graph/CMS admin UI, to runtime channel config in code, or are deleted with codegen.

## When to Use

Use this skill when you want to:
- Replace `@remkoj/optimizely-graph-cli` / `opti-graph` with the official CLI
- Migrate `config:create` (Graph site-config generation) — no equivalent
- Migrate `webhook:*` (Graph webhook management) — no equivalent
- Migrate `source:*` (Graph content-source management) — no equivalent
- Migrate `patches:apply` (GraphQL-codegen patches) — no equivalent
- Fix CI scripts / shell aliases after switching Graph CLIs
- Get a pre-migration assessment of `opti-graph` usage before starting

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate optimizely-graph-cli"
- "Replace opti-graph / the Remko Graph CLI"
- "Convert config:create / webhook:* / source:* / patches:apply"
- "Migrate graph source config / push graph source / site config"
- "Migrate Graph webhooks"
- "Fix CI scripts after switching Graph CLIs"
- "Migrate package.json scripts that call opti-graph"

## Usage Example

```
You: "Migrate our @remkoj/optimizely-graph-cli scripts to the official CLI"

Agent: [Uses optimizely-remko-graph-cli-to-content-js skill]
- Scans package.json / CI / .env for opti-graph usage and generated
  site-config files (SiteConfig / ChannelDefinition imports)
- Explains this is NOT a drop-in: opti-graph manages Graph infra,
  optimizely-cms-cli manages CMS content types — near-zero overlap
- Deletes config:create, webhook:*, source:*, patches:apply scripts (no
  equivalent) and routes each to its real home (code-first channel init,
  admin UI / Graph Management API, runtime query generation)
- Migrates the CLI credentials from GRAPH to CMS, while keeping GRAPH creds
  for the runtime getClient()
```

```
You: "What's the official CLI equivalent of opti-graph config:create?"

Agent: [Uses optimizely-remko-graph-cli-to-content-js skill]
- Warns NOT to confuse config:create (Graph site-config generation) with
  optimizely-cms-cli config push/pull (CMS content-TYPE sync) — completely
  unrelated
- There is NO CLI that generates a SiteConfig / ChannelDefinition file
- Replace with code-first config(buildConfig()) at startup + getClient() and
  runtime channel routing; delete the generated src/site-config.ts
```

## What It Handles

- **Usage assessment** — Scans `package.json`, CI, `.env`, and generated site-config files for `opti-graph`; categorizes effort (minimal / moderate / significant)
- **Package removal** — Removes `@remkoj/optimizely-graph-cli` (the official CLI does **not** replace its functions)
- **Command teardown** — `config:create`, `webhook:*`, `source:*`, `patches:apply` are all deleted and re-homed, not renamed
- **Credential migration** — CLI creds move from Graph (`OPTIMIZELY_GRAPH_*`) to CMS (`OPTIMIZELY_CMS_*`); runtime Graph creds are retained
- **Site-config teardown** — Deletes generated `SiteConfig` / `ChannelDefinition` files, replaced by code-first channel/client init
- **Honest gaps** — Nearly every `opti-graph` command has no CLI equivalent (admin UI, Graph Management API, runtime config, or deleted with codegen)

## Method Mapping Quick Reference

| Remko (`@remkoj/optimizely-graph-cli`, `opti-graph`) | Content JS SDK / CLI |
|-------------------------------------------------------|-----------------------|
| `config:create` (Graph site-config generation) | — no equivalent (code-first `config(buildConfig())` + `getClient()`) |
| `webhook:list` / `webhook:create` / `webhook:delete` | — no equivalent (Graph/CMS admin UI or Graph Management API) |
| `source:list` (DEFAULT bare command) / `source:clear` / `source:delete` | — no equivalent (admin UI or Graph Management API) |
| `patches:apply` (GraphQL-codegen patches) | — no equivalent (runtime query generation, no codegen) |
| generated `SiteConfig` / `ChannelDefinition` file | — deleted (runtime channel routing in code) |
| `OPTIMIZELY_GRAPH_APP_KEY` / `_SECRET` / `_SINGLE_KEY` (CLI) | `OPTIMIZELY_CMS_CLIENT_ID` / `_CLIENT_SECRET` / `_URL` (CLI) |
| `OPTIMIZELY_GRAPH_*` (runtime) | **retained** — `getClient()` still needs them |

## Important Notes

- **This is not a drop-in.** `opti-graph` manages Graph infrastructure; `optimizely-cms-cli` manages CMS content types. There is essentially no `opti-graph` command that maps 1:1 to an `optimizely-cms-cli` command. Do not assume "two CLIs collapse into one" means the functionality ports.
- **Do NOT confuse `config:create` with `config push/pull`.** `opti-graph config:create` generates a static `SiteConfig` / `ChannelDefinition` file from Graph channel data. The official CLI's `config` topic is about **content types**. They are completely unrelated — replacing `config:create` with `config push` is wrong. The real replacement is code-first `config(buildConfig())` at startup plus `getClient()` and runtime channel routing.
- **Webhooks and sources have no CLI equivalent.** The official CLI has no `webhook` topic and no `source` topic. Manage these via the Graph/CMS admin UI, or the Graph Management API if you need programmatic access.
- **`source:list` is the default bare command.** Running `opti-graph` with no arguments ran `source:list`. CI that invoked bare `opti-graph` was listing sources — remove those invocations.
- **`patches:apply` is tied to deleted codegen.** It patches the GraphQL-codegen packages. The official SDK has no codegen; runtime query generation replaces it. Delete `patches:apply` and migrate queries via the graph-functions skill.
- **CLI creds change, runtime Graph creds stay.** The CLI moves from `OPTIMIZELY_GRAPH_APP_KEY` / `_SECRET` / `_SINGLE_KEY` to `OPTIMIZELY_CMS_CLIENT_ID` / `_CLIENT_SECRET` / `_URL`. But the runtime Graph client (`getClient()`) still reads the `OPTIMIZELY_GRAPH_*` credentials to fetch content — do not delete them.
- **Delete stale site-config imports.** A generated `src/site-config.ts` importing `SiteConfig` / `ChannelDefinition` from `@remkoj/optimizely-graph-client` must be removed and replaced with code-first channel/client init.
- **Check beyond `package.json`.** The binary rename breaks shell aliases, Dockerfiles, and CI configs that invoke `opti-graph` directly (not via `npm run`). There is no drop-in binary to swap in — remove them.

## Related Skills

- [`optimizely-remko-graph-client-to-content-js`](optimizely-remko-graph-client-to-content-js.md) — Runtime channel/client init that replaces `config:create`
- [`optimizely-remko-graph-functions-to-content-js`](optimizely-remko-graph-functions-to-content-js.md) — Runtime query generation that replaces `patches:apply` (complete first if you use codegen)
- [`optimizely-remko-cms-cli-to-content-js`](optimizely-remko-cms-cli-to-content-js.md) — Shares the same target CLI (`@optimizely/cms-cli`)
- [`optimizely-remko-cms-api-to-content-js`](optimizely-remko-cms-api-to-content-js.md) — Integration API client (straddle skill, do last)
- [`optimizely-remko-cms-nextjs-to-content-js`](optimizely-remko-cms-nextjs-to-content-js.md) — Next.js integration and preview
