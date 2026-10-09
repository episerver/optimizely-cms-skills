# Optimizely CMS Agent Skills

[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-Compatible-blue)](https://agentskills.io)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

A collection of [Agent Skills](https://agentskills.io) that teach AI coding agents how to work with Optimizely CMS. Compatible with Claude Code, Cursor, GitHub Copilot, and others.

## Quick Start

### Option 1: Claude Code Plugin Marketplace (Recommended)

```
# In Claude Code, add the marketplace
/plugin marketplace add episerver/optimizely-cms-skills

# Install the plugin (installs all skills)
/plugin install optimizely-cms-skills@optimizely-cms
```

### Option 2: GitHub CLI

```bash
# Install individual skills
gh skill install episerver/optimizely-cms-skills optimizely-model --agent claude-code
gh skill install episerver/optimizely-cms-skills optimizely-model-react --agent claude-code
gh skill install episerver/optimizely-cms-skills optimizely-preview --agent claude-code
gh skill install episerver/optimizely-cms-skills optimizely-setup --agent claude-code
```

### Option 3: Manual Installation

```bash
# Clone the repository
git clone https://github.com/episerver/optimizely-cms-skills.git

# Copy skills to your agent's skills directory
cp -r optimizely-cms-skills/skills/* ~/.claude/skills/
```

## Skills

### Setup

| Skill | Description |
|-------|-------------|
| [optimizely-setup](./skills/setup/optimizely-setup/) | Set up and configure the Optimizely CMS JavaScript SDK |
| [optimizely-project-scaffold](./skills/setup/optimizely-project-scaffold/) | Scaffold a new Optimizely CMS project from starter templates |
| [optimizely-cli-workflows](./skills/setup/optimizely-cli-workflows/) | CLI commands for syncing content types with the CMS |
| [optimizely-observability](./skills/setup/optimizely-observability/) | Add OpenTelemetry tracing and monitoring to the SDK |
| [optimizely-isr-setup](./skills/setup/optimizely-isr-setup/) | Configure Next.js ISR, cache tags, and on-demand revalidation webhooks |
| [optimizely-cache-strategy](./skills/setup/optimizely-cache-strategy/) | Configure CDN cache headers, stale-while-revalidate, and edge cache tag purging |

### Modeling

| Skill | Description |
|-------|-------------|
| [optimizely-model](./skills/modeling/optimizely-model/) | Create content types, contracts, and display templates |
| [optimizely-display-templates](./skills/modeling/optimizely-display-templates/) | Create display templates and visual variants for components |

### Rendering

| Skill | Description |
|-------|-------------|
| [optimizely-model-react](./skills/rendering/optimizely-model-react/) | Generate React components for Optimizely content types |
| [optimizely-richtext-rendering](./skills/rendering/optimizely-richtext-rendering/) | Render and customize rich text content |
| [optimizely-dam-assets](./skills/rendering/optimizely-dam-assets/) | Render images, videos, and files from Optimizely DAM |
| [optimizely-experience-composition](./skills/rendering/optimizely-experience-composition/) | Build visual page builder experiences with sections and elements |

### Data

| Skill | Description |
|-------|-------------|
| [optimizely-content-fetching](./skills/data/optimizely-content-fetching/) | Fetch content by path, GUID, or key using the SDK |
| [optimizely-content-navigation](./skills/data/optimizely-content-navigation/) | Build breadcrumbs, navigation menus, and page hierarchies |
| [optimizely-graphql-optimization](./skills/data/optimizely-graphql-optimization/) | Optimize GraphQL queries, fragments, and caching |
| [optimizely-multisite-locale](./skills/data/optimizely-multisite-locale/) | Configure multi-site, multi-language, and locale filtering |
| [optimizely-schema-validation](./skills/data/optimizely-schema-validation/) | Validate content data at runtime with schema parsing |

### Editing

| Skill | Description |
|-------|-------------|
| [optimizely-preview](./skills/editing/optimizely-preview/) | Set up live preview and on-page editing in React |
| [optimizely-troubleshoot-graph](./skills/editing/optimizely-troubleshoot-graph/) | Debug and troubleshoot Content Graph API errors |

### Migration

| Skill | Description |
|-------|-------------|
| [optimizely-cms11-to-12](./skills/migration/optimizely-cms11-to-12/) | Migrate Optimizely CMS 11 (ASP.NET Framework) to CMS 12 (ASP.NET Core) |
| [optimizely-cms12-to-13-assessment](./skills/migration/optimizely-cms12-to-13-assessment/) | Pre-migration assessment for CMS 12 → 13 (effort, scope, risk) |
| [optimizely-cms12-to-13](./skills/migration/optimizely-cms12-to-13/) | Migrate Optimizely CMS 12 to CMS 13 (.NET 10, breaking API changes) |
| [optimizely-find-to-graph](./skills/migration/optimizely-find-to-graph/) | Migrate from Optimizely Find to Content Graph |
| [optimizely-remko-migration-discovery](./skills/migration/optimizely-remko-migration-discovery/) | **Discovery skill (run first).** Inventories a customer's Remko usage — installed packages, actual imports, patches, wrappers, forked codegen — and routes to the applicable surface-specific migration skills in teardown order |
| [optimizely-remko-graph-client-to-content-js](./skills/migration/optimizely-remko-graph-client-to-content-js/) | Migrate the Remko Graph client (`@remkoj/optimizely-graph-client`) to the official Content JS SDK — client init, fetching, auth/env (foundational) |
| [optimizely-remko-cms-react-to-content-js](./skills/migration/optimizely-remko-cms-react-to-content-js/) | Migrate Remko CMS React (`@remkoj/optimizely-cms-react`) to the Content JS SDK — component factory, registries, rich text, context |
| [optimizely-remko-cms-nextjs-to-content-js](./skills/migration/optimizely-remko-cms-nextjs-to-content-js/) | Migrate Remko CMS Next.js (`@remkoj/optimizely-cms-nextjs`) to the Content JS SDK — catch-all page, preview/OPE, publish handlers |
| [optimizely-remko-graph-functions-to-content-js](./skills/migration/optimizely-remko-graph-functions-to-content-js/) | Migrate Remko Graph Functions (`@remkoj/optimizely-graph-functions`) codegen to the Content JS SDK — runtime query generation |
| [optimizely-remko-cms-cli-to-content-js](./skills/migration/optimizely-remko-cms-cli-to-content-js/) | Migrate the Remko CLI (`@remkoj/optimizely-cms-cli`, `opti-cms`) to the official `@optimizely/cms-cli` — content-type sync + honest gaps |
| [optimizely-remko-graph-cli-to-content-js](./skills/migration/optimizely-remko-graph-cli-to-content-js/) | Migrate the Remko Graph CLI (`@remkoj/optimizely-graph-cli`, `opti-graph`) to `@optimizely/cms-cli` — almost entirely honest gaps |
| [optimizely-remko-cms-api-to-content-js](./skills/migration/optimizely-remko-cms-api-to-content-js/) | Migrate the Remko CMS API client (`@remkoj/optimizely-cms-api`) to the SDK + CLI — straddle skill, do last |

### Experimental

> ⚠️ The skills below are **experimental** — provided as-is for reference and **not registered in the plugin**. They may be incomplete, out of date, or inaccurate against the current CMS. Use at your own discretion. See [`skills/migration/experimental/README.md`](./skills/migration/experimental/README.md) for details on scope and how to use them manually.

| Skill | Description |
|-------|-------------|
| [optimizely-cms11-to-12](./skills/migration/experimental/optimizely-cms11-to-12/) | Migrate Optimizely CMS 11 (ASP.NET Framework) to CMS 12 (ASP.NET Core) |
| [optimizely-cms12-to-13-assessment](./skills/migration/experimental/optimizely-cms12-to-13-assessment/) | Pre-migration assessment for CMS 12 → 13 (effort, scope, risk) |
| [optimizely-cms12-to-13](./skills/migration/experimental/optimizely-cms12-to-13/) | Migrate Optimizely CMS 12 to CMS 13 (.NET 10, breaking API changes) |
| [optimizely-find-to-graph](./skills/migration/experimental/optimizely-find-to-graph/) | Migrate from Optimizely Find to Content Graph |

## Usage Example

```
You: "Create a BlogPage content type with title, author, and body fields"

Agent: [Uses optimizely-model skill]
- Creates TypeScript content type definition
- Adds properties with correct types
- Registers in content registry

You: "Now create the React component"

Agent: [Uses optimizely-model-react skill]
- Generates React component
- Adds preview attributes
- Handles rich text rendering
```

## Requirements

- **AI Agent**: Claude Code, Cursor, GitHub Copilot, or any [Agent Skills-compatible agent](https://agentskills.io/clients)
- **Optimizely CMS SDK**: `npm install @optimizely/cms-sdk`
- **Optimizely CMS CLI**: `npm install -D @optimizely/cms-cli`
- **Optimizely CMS**: Access to a CMS instance
- **Node.js**: Version 22+ recommended

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.
