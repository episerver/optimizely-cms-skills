# Optimizely Project Scaffold

Scaffold a new Optimizely CMS project using starter templates, create a fresh project with the SDK pre-configured, or add Optimizely to an existing application.

## When to Use

Use this skill when you want to:
- Create a new Optimizely CMS project from scratch
- Browse available starter templates and pick the right one
- Add Optimizely CMS to an existing Next.js or TanStack Start project
- Understand the differences between template, fresh, and scaffold modes
- Bootstrap a project with the correct structure and dependencies already in place

## Trigger Phrases

Say any of these to activate the skill:
- "Create a new Optimizely project"
- "Scaffold a project"
- "Start from scratch"
- "Use create-app"
- "Set up a starter template"
- "Add Optimizely to existing project"
- "What templates are available"
- "Bootstrap a CMS project"

## Usage Example

```
You: "Create a new Optimizely project for a marketing site"

Agent: [Uses optimizely-project-scaffold skill]
- Runs npx @optimizely/cms-create-app
- Recommends the nextjs-stride template for marketing sites
- Walks you through the interactive wizard (name, package manager)
- After scaffolding, guides you to set up .env credentials
- Pushes the template's content types to your CMS
- Starts the dev server so you can see it running
```

```
You: "Add Optimizely to my existing Next.js app"

Agent: [Uses optimizely-project-scaffold skill]
- Runs the scaffolding tool in "Add to existing project" mode
- Installs SDK packages without creating a new directory
- Creates optimizely.config.mjs pointing to your components
- Sets up a catch-all route for content delivery
- Leaves your existing files untouched
```

## Available Templates

| Template | Best For |
|----------|----------|
| `nextjs-starter` | Learning the SDK, minimal clean starting point |
| `nextjs-stride` | Production marketing sites with Tailwind and multiple content types |
| `nextjs-alloy` | Exploring all SDK features with comprehensive examples |
| `tanstack-starter` | Projects using TanStack Start instead of Next.js |

## Three Scaffolding Modes

- **Template** -- Pick a pre-built starter and get a working project immediately. Best for new projects.
- **Fresh** -- Runs the framework's own scaffolding (e.g., `create-next-app`) and adds the Optimizely SDK on top. Best when you want full control over the initial setup.
- **Scaffold** -- Adds Optimizely to an existing project directory. Best when you already have an app and want to add CMS capabilities.

## What It Generates

- **Project directory** -- Full project structure (template and fresh modes)
- **SDK packages** -- `@optimizely/cms-sdk` and `@optimizely/cms-cli` installed
- **`optimizely.config.mjs`** -- Configuration file with component paths
- **Catch-all route** -- Content delivery route like `[...path]/page.tsx` (scaffold mode)
- **Template content types** -- Pre-built page and component types (template mode)

## Post-Scaffolding Checklist

1. Configure `.env` with your CMS credentials
2. Push content types to CMS with `npx @optimizely/cms-cli@latest config push`
3. Create and publish content in your CMS instance
4. Start the dev server and visit `http://localhost:3000`

## Related Skills

- [`optimizely-setup`](optimizely-setup.md) -- Manual SDK installation as an alternative to scaffolding
- [`optimizely-cli-workflows`](optimizely-cli-workflows.md) -- Push and pull content types after scaffolding
- [`optimizely-observability`](optimizely-observability.md) -- Add monitoring to your new project
