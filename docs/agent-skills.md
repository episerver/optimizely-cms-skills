# Agent Skills for Optimizely CMS

Accelerate your Optimizely CMS development with AI-powered Agent Skills. These skills teach AI coding agents how to work with Optimizely CMS, enabling automated content type modeling, React component generation, live preview setup, SDK configuration, data fetching, migration, and more.

## What are Agent Skills?

Agent Skills are a standardized, open format for extending AI agent capabilities with specialized knowledge and workflows. Following the [Agent Skills specification](https://agentskills.io), these skills work across 40+ AI agents including:

- **[Claude Code](https://claude.ai/code)** - Terminal, IDE, desktop app, and browser
- **[Cursor](https://cursor.com/)** - AI-first code editor
- **[GitHub Copilot](https://github.com/features/copilot)** - AI pair programmer in VS Code and other editors
- **[OpenCode](https://opencode.ai/)** - Open source coding agent
- **[And many more](https://agentskills.io/clients)** - See the complete list of compatible agents

Skills use **progressive disclosure**: your AI agent loads only skill names and descriptions at startup, then loads full instructions when a task matches. This keeps the context footprint small while providing powerful domain expertise when needed.

## Prerequisites

Before using these skills, ensure you have:

1. **Compatible AI Agent** - Claude Code, Cursor, GitHub Copilot, or any [Agent Skills-compatible agent](https://agentskills.io/clients)
2. **Optimizely CMS SDK** - Installed in your project (`npm install @optimizely/cms-sdk`)
3. **Optimizely CMS CLI** - Installed as dev dependency (`npm install -D @optimizely/cms-cli`)
4. **Optimizely CMS Instance** - Access to an Optimizely CMS instance with API credentials
5. **Node.js** - Version 22+ recommended

## Installation

### Option 1: Claude Code Plugin Marketplace (Recommended for Claude Code Users)

```
# In Claude Code, add the marketplace
/plugin marketplace add episerver/optimizely-cms-skills

# Install the plugin (installs all skills at once)
/plugin install optimizely-cms-skills@optimizely-cms
```

This installs all skills automatically and keeps them updated.

### Option 2: GitHub CLI (For Any Agent Skills-Compatible Agent)

Install individual skills using the GitHub CLI:

```bash
# Install all skills
gh skill install episerver/optimizely-cms-skills optimizely-model --agent claude-code
gh skill install episerver/optimizely-cms-skills optimizely-model-react --agent claude-code
gh skill install episerver/optimizely-cms-skills optimizely-preview --agent claude-code
gh skill install episerver/optimizely-cms-skills optimizely-setup --agent claude-code
```

Replace `claude-code` with your agent name (e.g., `cursor`, `copilot`).

### Option 3: Manual Installation

Clone the repository and copy skills to your agent's skills directory:

```bash
# Clone the repository
git clone https://github.com/episerver/optimizely-cms-skills.git

# Copy all skills to your .claude/skills directory
cp -r optimizely-cms-skills/skills/* ~/.claude/skills/

# Or copy to your project's .claude/skills directory
mkdir -p .claude/skills
cp -r optimizely-cms-skills/skills/* .claude/skills/
```

## Available Skills

### Setup

| Skill | Description | Docs |
|-------|-------------|------|
| [optimizely-setup](../skills/setup/optimizely-setup/) | Set up and configure the Optimizely CMS JavaScript SDK from scratch | [Guide](skills/optimizely-setup.md) |
| [optimizely-project-scaffold](../skills/setup/optimizely-project-scaffold/) | Scaffold a new project from starter templates | [Guide](skills/optimizely-project-scaffold.md) |
| [optimizely-cli-workflows](../skills/setup/optimizely-cli-workflows/) | CLI commands for syncing content types with the CMS | [Guide](skills/optimizely-cli-workflows.md) |
| [optimizely-observability](../skills/setup/optimizely-observability/) | Add OpenTelemetry tracing and monitoring | [Guide](skills/optimizely-observability.md) |
| [optimizely-isr-setup](../skills/setup/optimizely-isr-setup/) | Configure Next.js ISR, cache tags, and revalidation webhooks | [Guide](skills/optimizely-isr-setup.md) |
| [optimizely-cache-strategy](../skills/setup/optimizely-cache-strategy/) | Configure CDN cache headers, stale-while-revalidate, and tag purging | [Guide](skills/optimizely-cache-strategy.md) |

### Modeling

| Skill | Description | Docs |
|-------|-------------|------|
| [optimizely-model](../skills/modeling/optimizely-model/) | Create content types, contracts, and display templates in TypeScript | [Guide](skills/optimizely-model.md) |
| [optimizely-display-templates](../skills/modeling/optimizely-display-templates/) | Create display templates and visual variants for components | [Guide](skills/optimizely-display-templates.md) |

### Rendering

| Skill | Description | Docs |
|-------|-------------|------|
| [optimizely-model-react](../skills/rendering/optimizely-model-react/) | Generate React components for Optimizely content types | [Guide](skills/optimizely-model-react.md) |
| [optimizely-richtext-rendering](../skills/rendering/optimizely-richtext-rendering/) | Render and customize rich text content | [Guide](skills/optimizely-richtext-rendering.md) |
| [optimizely-dam-assets](../skills/rendering/optimizely-dam-assets/) | Render images, videos, and files from Optimizely DAM | [Guide](skills/optimizely-dam-assets.md) |
| [optimizely-experience-composition](../skills/rendering/optimizely-experience-composition/) | Build visual page builder experiences with sections and elements | [Guide](skills/optimizely-experience-composition.md) |

### Data

| Skill | Description | Docs |
|-------|-------------|------|
| [optimizely-content-fetching](../skills/data/optimizely-content-fetching/) | Fetch content by path, GUID, or key using the SDK | [Guide](skills/optimizely-content-fetching.md) |
| [optimizely-content-navigation](../skills/data/optimizely-content-navigation/) | Build breadcrumbs, navigation menus, and page hierarchies | [Guide](skills/optimizely-content-navigation.md) |
| [optimizely-graphql-optimization](../skills/data/optimizely-graphql-optimization/) | Optimize GraphQL queries, fragments, and caching | [Guide](skills/optimizely-graphql-optimization.md) |
| [optimizely-multisite-locale](../skills/data/optimizely-multisite-locale/) | Configure multi-site, multi-language, and locale filtering | [Guide](skills/optimizely-multisite-locale.md) |
| [optimizely-schema-validation](../skills/data/optimizely-schema-validation/) | Validate content data at runtime with schema parsing | [Guide](skills/optimizely-schema-validation.md) |

### Editing

| Skill | Description | Docs |
|-------|-------------|------|
| [optimizely-preview](../skills/editing/optimizely-preview/) | Set up live preview and on-page editing in React apps | [Guide](skills/optimizely-preview.md) |
| [optimizely-troubleshoot-graph](../skills/editing/optimizely-troubleshoot-graph/) | Debug and troubleshoot Content Graph API errors | [Guide](skills/optimizely-troubleshoot-graph.md) |

### Migration

| Skill | Description | Docs |
|-------|-------------|------|
| [optimizely-cms11-to-12](../skills/migration/optimizely-cms11-to-12/) | Migrate CMS 11 (ASP.NET Framework) to CMS 12 (ASP.NET Core) | [Guide](skills/optimizely-cms11-to-12.md) |
| [optimizely-cms12-to-13-assessment](../skills/migration/optimizely-cms12-to-13-assessment/) | Pre-migration assessment for CMS 12 → 13 (effort, scope, risk) | [Guide](skills/optimizely-cms12-to-13-assessment.md) |
| [optimizely-cms12-to-13](../skills/migration/optimizely-cms12-to-13/) | Migrate CMS 12 to CMS 13 (.NET 10, breaking API changes) | [Guide](skills/optimizely-cms12-to-13.md) |
| [optimizely-find-to-graph](../skills/migration/optimizely-find-to-graph/) | Migrate from Optimizely Find to Content Graph | [Guide](skills/optimizely-find-to-graph.md) |
| [optimizely-remko-graph-client-to-content-js](../skills/migration/optimizely-remko-graph-client-to-content-js/) | Migrate the Remko Graph client (`@remkoj/optimizely-graph-client`) to the official Content JS SDK — client init, fetching, auth/env (foundational) | [Guide](skills/optimizely-remko-graph-client-to-content-js.md) |
| [optimizely-remko-cms-react-to-content-js](../skills/migration/optimizely-remko-cms-react-to-content-js/) | Migrate Remko CMS React (`@remkoj/optimizely-cms-react`) to the Content JS SDK — component factory, registries, rich text, context | [Guide](skills/optimizely-remko-cms-react-to-content-js.md) |
| [optimizely-remko-cms-nextjs-to-content-js](../skills/migration/optimizely-remko-cms-nextjs-to-content-js/) | Migrate Remko CMS Next.js (`@remkoj/optimizely-cms-nextjs`) to the Content JS SDK — catch-all page, preview/OPE, publish handlers | [Guide](skills/optimizely-remko-cms-nextjs-to-content-js.md) |
| [optimizely-remko-graph-functions-to-content-js](../skills/migration/optimizely-remko-graph-functions-to-content-js/) | Migrate Remko Graph Functions (`@remkoj/optimizely-graph-functions`) codegen to the Content JS SDK — runtime query generation | [Guide](skills/optimizely-remko-graph-functions-to-content-js.md) |
| [optimizely-remko-cms-cli-to-content-js](../skills/migration/optimizely-remko-cms-cli-to-content-js/) | Migrate the Remko CLI (`@remkoj/optimizely-cms-cli`, `opti-cms`) to the official `@optimizely/cms-cli` — content-type sync + honest gaps | [Guide](skills/optimizely-remko-cms-cli-to-content-js.md) |
| [optimizely-remko-graph-cli-to-content-js](../skills/migration/optimizely-remko-graph-cli-to-content-js/) | Migrate the Remko Graph CLI (`@remkoj/optimizely-graph-cli`, `opti-graph`) to `@optimizely/cms-cli` — almost entirely honest gaps | [Guide](skills/optimizely-remko-graph-cli-to-content-js.md) |
| [optimizely-remko-cms-api-to-content-js](../skills/migration/optimizely-remko-cms-api-to-content-js/) | Migrate the Remko CMS API client (`@remkoj/optimizely-cms-api`) to the SDK + CLI — straddle skill, do last | [Guide](skills/optimizely-remko-cms-api-to-content-js.md) |

## Tips for Effective Usage

### Be Specific About Requirements

**Good:** "Create a BlogPage with title, author, publishDate, and richText body"

**Less effective:** "Make a blog page"

### Mention the Framework

**Good:** "Set up preview for Next.js App Router"

**Less effective:** "Set up preview"

### Build Incrementally

Start with setup, then content types, then React components, then preview. The skills work best in sequence:

1. `optimizely-setup` — Install and configure the SDK
2. `optimizely-model` — Create content type definitions
3. `optimizely-model-react` — Generate React rendering components
4. `optimizely-preview` — Enable live preview editing

### Combine Skills

Skills reference each other and work together. For example, `optimizely-content-fetching` will point you to `optimizely-multisite-locale` for multi-site filtering, and `optimizely-model` will suggest `optimizely-model-react` for component generation.

## Updating Skills

### Claude Code Plugin

```
/plugin update optimizely-cms-skills@optimizely-cms
```

### GitHub CLI

```bash
# Reinstall to get latest version
gh skill install episerver/optimizely-cms-skills optimizely-model --force
```

### Manual Updates

```bash
cd optimizely-cms-skills
git pull origin main
cp -r skills/* ~/.claude/skills/
```

## Compatible Agents

These skills work with any agent supporting the Agent Skills specification:

| Agent | Platform | Installation Method |
|-------|----------|---------------------|
| [Claude Code](https://claude.ai/code) | Terminal, IDE, Desktop, Browser | Plugin marketplace or GitHub CLI |
| [Cursor](https://cursor.com/) | Desktop app | GitHub CLI |
| [GitHub Copilot](https://github.com/features/copilot) | VS Code, JetBrains, CLI | GitHub CLI |
| [VS Code](https://code.visualstudio.com/) | Desktop app | GitHub CLI |
| [OpenCode](https://opencode.ai/) | CLI, Desktop | GitHub CLI |

See the [complete list](https://agentskills.io/clients) of 40+ compatible agents.

## Troubleshooting

### Skills Not Loading

- Verify skills are installed: Check `~/.claude/skills/` or `.claude/skills/`
- Restart your AI agent
- Check skill names match (e.g., `optimizely-model`, `optimizely-model-react`)
- Use trigger phrases that match skill descriptions

### Wrong Code Generated

- Be more specific in your request
- Mention Optimizely CMS explicitly in your prompt
- Check that skills are up to date
- Verify your SDK version matches skills (2.0.0+)

### Preview Not Working

- Use the `optimizely-preview` skill to troubleshoot
- Check `.env` file has correct `OPTIMIZELY_CMS_URL`
- Verify CMS configuration has correct preview URL
- Check browser console for errors

## Support

- **GitHub Issues**: Report issues on [GitHub](https://github.com/episerver/optimizely-cms-skills/issues)
- **Documentation**: Browse [Optimizely CMS docs](https://docs.developers.optimizely.com/content-management-system/v1.0.0-CMS-SaaS/docs/install-javascript-sdk)
- **Agent Skills Docs**: Learn more at [agentskills.io](https://agentskills.io)
