# Graph CLI Command Mapping: Remko SDK → Content JS SDK

Complete mapping of `@remkoj/optimizely-graph-cli` (bin `opti-graph`) commands
to their `@optimizely/cms-cli` (bin `optimizely-cms-cli`) equivalents. Every row
is grounded in the real command registrations of the source Graph CLI
(`@remkoj/optimizely-graph-cli` v5.2.0, yargs, colon-separated) and target CLI
(`@optimizely/cms-cli` v2.2.0, oclif, space-separated), verified 2026-09-11.

## Command syntax change: yargs (colon) → oclif (space) AND different concerns

The Remko Graph CLI uses **yargs** with **colon-separated subcommands** (e.g.,
`opti-graph config:create`). The official CLI uses **oclif** with
**space-separated subcommands** (e.g., `optimizely-cms-cli config push`). This
is a **fundamental syntax change**.

**More importantly**: The Remko Graph CLI manages **Optimizely GRAPH
infrastructure** (webhooks, content sources, site/channel config generation,
GraphQL-codegen patches). The official `@optimizely/cms-cli` manages **CMS
content-TYPE definitions + auth**. These are **fundamentally different
concerns** with **near-zero command overlap**. There is essentially NO
`opti-graph` command that maps 1:1 to an `optimizely-cms-cli` command.

## Full command mapping (source: `opti-graph` v5.2.0)

| Remko command (opti-graph) | aliases | purpose | @optimizely/cms-cli equivalent | migration note |
|---|---|---|---|---|
| `config:create [file_path]` | `cc`, `site-config` | Generate a static site-configuration TypeScript file (default export `SiteConfig`) from Graph channel data (by frontend domain), importing from `@remkoj/optimizely-graph-client` | — **no equivalent** | The official SDK does not generate a `ChannelDefinition` / `SiteConfig` file from a CLI. Channel/site config is defined in code and the client is initialized at runtime. See `../_shared-references/setup-and-di.md` and the `optimizely-remko-graph-client-to-content-js` skill for client init. **Do NOT confuse with `optimizely-cms-cli config push/pull` (CMS content-TYPE sync) — they are COMPLETELY DIFFERENT.** |
| `webhook:list` | `wl`, `list` | List all webhooks in Optimizely Graph | — **no equivalent** | The official CLI has no webhook topic. Manage webhooks via the Graph/CMS admin UI or Graph Management API. |
| `webhook:create [path] [verb]` | `wc`, `register` | Add a Graph webhook that invokes `/api/content/publish` (or custom path/verb) on every publish | — **no equivalent** | The official CLI has no webhook topic. Manage webhooks via the Graph/CMS admin UI or Graph Management API. |
| `webhook:delete [path]` | `wd`, `unregister` | Remove a Graph webhook by path | — **no equivalent** | The official CLI has no webhook topic. Manage webhooks via the Graph/CMS admin UI or Graph Management API. |
| `patches:apply` | (none) | Apply the patched packages for GraphQL Codegen (equivalent to `opti-patch` for codegen) | — **no equivalent** | The official SDK has NO GraphQL codegen (no fragments, no queries, no patches to apply). Runtime query generation from `contentType()` schemas replaces codegen. See `optimizely-remko-graph-functions-to-content-js` skill. Delete `patches:apply` usage. |
| `source:list` | `sl`, and `$0` (DEFAULT) | List all content sources in Optimizely Graph. **This is the DEFAULT command when you run bare `opti-graph` with no args.** | — **no equivalent** | The official CLI has no source topic. Manage content sources via the Graph/CMS admin UI or Graph Management API. **CI WARNING**: If CI runs `opti-graph` with no args, it was running `source:list` by default. |
| `source:clear [sourceId]` | `sc` | Remove all data for the specified Graph content source | — **no equivalent** | The official CLI has no source topic. Manage content sources via the Graph/CMS admin UI or Graph Management API. |
| `source:delete [sourceId]` | `sd` | Delete the specified Graph content source | — **no equivalent** | The official CLI has no source topic. Manage content sources via the Graph/CMS admin UI or Graph Management API. |

## Official CLI commands (for reference — NOT replacements for opti-graph)

The official `@optimizely/cms-cli` manages **CMS content types**, not Graph
infrastructure. These commands are NOT replacements for `opti-graph` commands.

| @optimizely/cms-cli command | purpose | flags |
|---|---|---|
| `login` | Verify CMS Integration API authentication | `--verbose`, `--host <url>`. Uses `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`, `OPTIMIZELY_CMS_URL`. |
| `config push` | Push TypeScript content-type definitions from code to CMS | `--config <path>` (default `./optimizely.config.mjs`), `--force` (skip interactive confirm), `--host <url>` (override `OPTIMIZELY_CMS_URL`). |
| `config pull` | Pull content types from CMS and generate TypeScript files | `--output <path>`, `--single-file`/`-s`, `--individual`/`-i`, `--group`/`-g` (default), `--json`/`-j`, `--include-read-only`, `--host <url>`. |
| `content delete <content-type-key>` | Delete a specific content type by key | `--host <url>`. |
| `danger delete-all-content-types` | Delete ALL user-defined content types from CMS (destructive, interactive confirm, no `--force` bypass) | `--host <url>`. |
| `--help` | Show help for a command | Global flag. |
| `--version` | Show CLI version | Global flag. Shows CLI version only, not CMS/API version. |

## Capability gaps

### Site config generation (`config:create`)

The official SDK **does NOT generate a `ChannelDefinition` / `SiteConfig` file
from a CLI**. Channel/site config is defined in code and the client is
initialized at runtime.

**Do NOT confuse `opti-graph config:create` (Graph site-config generation) with
`optimizely-cms-cli config push/pull` (CMS content-TYPE sync) — they are
COMPLETELY DIFFERENT.** The official CLI's `config` topic is about content
types, not Graph channel config.

**Code-first replacement:**

```tsx
// One-time config in the root layout (reads OPTIMIZELY_GRAPH_* env vars)
import { config, buildConfig } from '@optimizely/cms-sdk';

config(buildConfig()); // call once, at app startup
```

```tsx
// Get the shared runtime client anywhere (replaces the generated SiteConfig)
import { getClient } from '@optimizely/cms-sdk';

const client = getClient();

// Channel routing at runtime (not a static generated file)
export function getChannelForHost(hostname: string) {
  // Your domain → channel mapping logic
  if (hostname === 'www.example.com') return 'example-channel';
  return 'default-channel';
}
```

**Net migration:**

- **DELETE**: `config:create` / `site-config` scripts from `package.json`.
- **DELETE**: Generated site-config files (e.g., `src/site-config.ts` importing
  `SiteConfig` / `ChannelDefinition` from `@remkoj/optimizely-graph-client`).
- **REPLACE WITH**: Code-first channel/client initialization at runtime (see
  `../_shared-references/setup-and-di.md` and the
  `optimizely-remko-graph-client-to-content-js` skill).

### Webhook management (`webhook:list`, `webhook:create`, `webhook:delete`)

The official CLI **has NO webhook topic**. Graph webhook management has no CLI
equivalent.

**Net migration:**

- **DELETE**: `webhook:*` scripts from `package.json`.
- **REPLACE WITH**: Manage webhooks via the Graph/CMS admin UI (or the Graph
  Management API if programmatic access is required). Publish/webhook wiring is
  handled outside this CLI.

### GraphQL-codegen patches (`patches:apply`)

The official SDK **does NOT have GraphQL codegen** (no fragments, no queries, no
patches). Runtime query generation replaces codegen.

**Net migration:**

- **DELETE**: `patches:apply` scripts from `package.json`.
- **REPLACE WITH**: Runtime query generation from `contentType()` schemas (see
  the `optimizely-remko-graph-functions-to-content-js` skill). Delete codegen
  workflows entirely.

### Content-source management (`source:list`, `source:clear`, `source:delete`)

The official CLI **has NO source topic**. Graph content-source management has no
CLI equivalent.

**CRITICAL**: `source:list` is the **DEFAULT command** when you run bare
`opti-graph` with no arguments. CI that runs `opti-graph` with no args was
listing sources.

**Net migration:**

- **DELETE**: `source:*` scripts from `package.json`. Remove bare `opti-graph`
  invocations in CI.
- **REPLACE WITH**: Manage content sources via the Graph/CMS admin UI (or the
  Graph Management API if programmatic access is required).

## Environment variables

The Remko Graph CLI uses **Optimizely GRAPH App Key + Secret** (+ Single Key).
The official `@optimizely/cms-cli` uses **CMS Integration API Client ID +
Secret**. These are **DIFFERENT credentials** for **DIFFERENT services** (Graph
vs CMS).

| env var | used by | purpose |
|---|---|---|
| `OPTIMIZELY_GRAPH_APP_KEY` | `opti-graph` | Graph App Key (authenticated requests; used by Remko Graph CLI) |
| `OPTIMIZELY_GRAPH_SECRET` | `opti-graph` | Graph App Secret (authenticated requests; used by Remko Graph CLI) |
| `OPTIMIZELY_GRAPH_SINGLE_KEY` | `opti-graph` | Graph Single Key (public queries; used by Remko Graph CLI and runtime Graph client) |
| `OPTIMIZELY_GRAPH_GATEWAY` | `opti-graph` | Graph gateway URL (default `https://cg.optimizely.com`; used by Remko Graph CLI and runtime Graph client) |
| `OPTIMIZELY_CMS_CLIENT_ID` | `optimizely-cms-cli` | CMS Integration API Client ID (required for `login`, `config push/pull`; used by official CLI) |
| `OPTIMIZELY_CMS_CLIENT_SECRET` | `optimizely-cms-cli` | CMS Integration API Client Secret (required for `login`, `config push/pull`; used by official CLI) |
| `OPTIMIZELY_CMS_URL` | `optimizely-cms-cli` | CMS instance URL (e.g., `https://<your-instance>.cms.optimizely.com`; required for `login`, `config push/pull`; used by official CLI) |
| `OPTIMIZELY_CMS_API_URL` | `optimizely-cms-cli` | Optional override for the CMS API base (defaults to `https://api.cms.optimizely.com`; use for non-production, e.g., `https://api.cmstest.optimizely.com`; used by official CLI) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `optimizely-cms-cli` | Optional bypass for self-signed cert validation (set to `"0"` for local dev only; never set in production; used by official CLI) |

**CRITICAL**: GRAPH credentials (App Key/Secret/Single Key) ≠ CMS credentials
(Client ID/Secret). The official CLI uses CMS creds only. The runtime Graph
client (`getClient()` from `@optimizely/cms-sdk`) still uses GRAPH credentials
when fetching content. Only the CLI's credentials change.

See `../_shared-references/auth-and-env-mapping.md` for complete env-var
details.

## Related references

- Package/import mapping: `../_shared-references/package-and-import-mapping.md`
- Setup, channel init, and DI/registration: `../_shared-references/setup-and-di.md`
- Auth & environment variables: `../_shared-references/auth-and-env-mapping.md`
