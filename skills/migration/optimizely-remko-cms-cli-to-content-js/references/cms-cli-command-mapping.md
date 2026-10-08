# CMS CLI Command Mapping: Remko SDK → Content JS SDK

Complete mapping of `@remkoj/optimizely-cms-cli` (bin `opti-cms`) commands to
their `@optimizely/cms-cli` (bin `optimizely-cms-cli`) equivalents. Every row is
grounded in the real command registrations of each CLI (source:
`@remkoj/optimizely-cms-cli`, target: `@optimizely/cms-cli`), verified
2026-09-11.

## Command syntax change: yargs (colon) → oclif (space)

The Remko CLI uses **yargs** with **colon-separated subcommands** (e.g.,
`opti-cms types:push`). The official CLI uses **oclif** with **space-separated
subcommands** (e.g., `optimizely-cms-cli config push`). This is a **fundamental
syntax change** — do NOT try `optimizely-cms-cli types:push` (it will fail with
"unknown command").

## Full command mapping

| Remko command (opti-cms) | purpose | @optimizely/cms-cli command | flags / migration note |
|---|---|---|---|
| `types:push` | Push TypeScript content-type definitions from code to CMS | `config push` | Flags: `--config <path>` (default `./optimizely.config.mjs`), `--force` (skip interactive confirm), `--host <url>` (override `OPTIMIZELY_CMS_URL`). |
| `types:pull` | Pull content types from CMS and generate TypeScript files | `config pull` | Flags: `--output <path>`, `--single-file`/`-s`, `--individual`/`-i`, `--group`/`-g` (default), `--json`/`-j`, `--include-read-only`, `--host <url>`. Default is `--group` (one file per base type). |
| `cms:reset` | Delete ALL user-defined content types from CMS (destructive) | `danger delete-all-content-types` | **DESTRUCTIVE** — deletes ALL user-defined content types. Flags: `--host <url>`. Official CLI requires interactive confirm (no `--force` bypass). |
| `cms:version` | Show CMS/API version info | — no direct equivalent | Official `--version` shows CLI version only, not CMS/API version. Use `login` to verify CMS connectivity and auth. |
| `styles:list` | List Visual Builder styles in CMS | — **no equivalent** | See capability gaps below. |
| `styles:push` | Push Visual Builder styles from local to CMS | — **no equivalent** | See capability gaps below. |
| `styles:pull` | Pull Visual Builder styles from CMS to local | — **no equivalent** | See capability gaps below. |
| `styles:delete` | Delete a Visual Builder style from CMS | — **no equivalent** | See capability gaps below. |
| `style:create` | Scaffold a new Visual Builder style definition | — **no equivalent** | See capability gaps below. |
| `nextjs:create` | Scaffold a Next.js integration | — **no equivalent** | See capability gaps below. |
| `nextjs:components` | Generate React components from CMS types | — **no equivalent** | See capability gaps below. |
| `nextjs:factory` | Generate component factory | — **no equivalent** | See capability gaps below. |
| `nextjs:fragments` | Generate GraphQL fragments | — **no equivalent** | See capability gaps below. |
| `nextjs:queries` | Generate GraphQL queries | — **no equivalent** | See capability gaps below. |
| `nextjs:visualbuilder` | Generate Visual Builder wiring | — **no equivalent** | See capability gaps below. |

## Additional official CLI commands (no Remko origin)

| @optimizely/cms-cli command | purpose | flags |
|---|---|---|
| `login` | Verify CMS Integration API authentication | `--verbose`, `--host <url>`. Uses `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`, `OPTIMIZELY_CMS_URL`. |
| `content delete <content-type-key>` | Delete a specific content type by key | `--host <url>`. |
| `--help` | Show help for a command | Global flag. |
| `--version` | Show CLI version | Global flag. Shows CLI version only, not CMS/API version. |

## Capability gaps

### Visual Builder styles (`styles:*`, `style:create`)

The official CLI **does NOT have Visual Builder "styles" commands**. The Remko
`styles:*` commands (list, push, pull, delete) and `style:create` scaffolding
have no direct equivalent in `@optimizely/cms-cli`.

**Recommended code-first approach:**

Define **display templates** in code via `displayTemplate()` +
`initDisplayTemplateRegistry()` (ROOT exports of `@optimizely/cms-sdk`) and push
them with `config push`. Note this is **display-template management**, not a 1:1
replacement for Visual Builder node styles — verify this meets the customer's
use case before removing the Remko workflow.

```tsx
import { displayTemplate } from '@optimizely/cms-sdk';

export const HeroDisplayTemplate = displayTemplate({
  key: 'HeroDisplayTemplate',
  displayName: 'Hero Display Template',
  isDefault: false,
  baseType: '_component',
  settings: {
    textAlignment: {
      editor: 'select',
      displayName: 'Text Alignment',
      sortOrder: 0,
      choices: {
        left: { displayName: 'Left', sortOrder: 1 },
        center: { displayName: 'Center', sortOrder: 2 },
      },
    },
  },
});
```

```tsx
import { initDisplayTemplateRegistry } from '@optimizely/cms-sdk';
import { HeroDisplayTemplate } from '@/components/HeroDisplayTemplate';

// Register display templates (in root layout.tsx)
initDisplayTemplateRegistry([HeroDisplayTemplate]);
```

```bash
# Push display templates to CMS
npx optimizely-cms-cli config push
```

### Next.js scaffolding (`nextjs:*`)

The official CLI **does NOT have Next.js scaffolding or codegen commands**. The
Remko `nextjs:*` commands (create, components, factory, fragments, queries,
visualbuilder) have no direct equivalent in `@optimizely/cms-cli`.

**Recommended code-first approach:**

- **Components / factory**: Author React components by hand (covered by the
  `optimizely-remko-cms-react-to-content-js` and
  `optimizely-remko-cms-nextjs-to-content-js` skills).

- **Type definitions**: Generated by `config pull` (pulls content-type
  definitions from CMS into TypeScript files).

- **GraphQL fragments / queries**: **NOT generated at all** — the official SDK
  does runtime query generation from `contentType()` schemas (covered by the
  `optimizely-remko-graph-functions-to-content-js` skill). You do not write or
  import GraphQL fragments/queries manually.

**Net migration for `nextjs:*` commands:**

- **DELETE**: `nextjs:*` scripts from `package.json`. The official CLI has no
  `nextjs` topic.

- **REPLACE WITH**: Manual React component authoring (cms-react skill) + runtime
  query generation (graph-functions skill) + `config pull` for type definitions.

## Environment variables

| env var | purpose |
|---|---|
| `OPTIMIZELY_CMS_CLIENT_ID` | CMS Integration API Client ID (required for `login`, `config push/pull`) |
| `OPTIMIZELY_CMS_CLIENT_SECRET` | CMS Integration API Client Secret (required for `login`, `config push/pull`) |
| `OPTIMIZELY_CMS_URL` | CMS instance URL (e.g., `https://<your-instance>.cms.optimizely.com`; required for `login`, `config push/pull`) |
| `OPTIMIZELY_CMS_API_URL` | Optional override for the CMS API base (defaults to `https://api.cms.optimizely.com`; use for non-production, e.g., `https://api.cmstest.optimizely.com`) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Optional bypass for self-signed cert validation (set to `"0"` for local dev only; never set in production) |

See `../_shared-references/auth-and-env-mapping.md` for complete env-var
details.

## Related references

- Package/import mapping: `../_shared-references/package-and-import-mapping.md`
- Setup, channel init, and DI/registration: `../_shared-references/setup-and-di.md`
- Auth & environment variables: `../_shared-references/auth-and-env-mapping.md`
