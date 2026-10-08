---
name: optimizely-project-scaffold
description: This skill should be used when the user asks to "create a new Optimizely project", "scaffold a project", "start from scratch", "use create-app", "set up a starter template", "add Optimizely to existing project", "what templates are available", "bootstrap a CMS project", or mentions scaffolding, project creation, or starter templates for Optimizely CMS.
---

# Optimizely CMS Project Scaffolding

This skill teaches how to scaffold new Optimizely CMS projects using `@optimizely/cms-create-app`, including template selection, fresh project creation, and adding Optimizely to existing projects.

## When to Use This Skill

Use this skill when the user wants to:
- Create a new Optimizely CMS project from scratch
- Choose between available starter templates
- Add the Optimizely CMS SDK to an existing project
- Understand the differences between scaffolding modes
- Set up a new project with the correct structure and dependencies

## Step 1: Run the Scaffolding Tool

The scaffolding tool is run via npx:

```bash
npx @optimizely/cms-create-app
```

This launches an interactive wizard that guides you through project creation.

## Step 2: Choose a Scaffolding Mode

The tool offers three modes:

### Template Mode

Use a predefined starter template. Best for new projects where you want a working example to build from.

```bash
npx @optimizely/cms-create-app
# Select: "Use a template"
# Choose a template from the list
# Enter project name
# Select package manager (npm, pnpm, yarn)
```

**Available templates:**

| Template | Description | Best For |
|----------|-------------|----------|
| `nextjs-starter` | Minimal Next.js + Optimizely SDK setup | Learning the SDK, clean starting point |
| `nextjs-stride` | Full-featured demo with Tailwind CSS and multiple content types | Production-ready marketing sites |
| `nextjs-alloy` | Full-featured demo with Tailwind CSS and comprehensive examples | Exploring all SDK features |
| `tanstack-starter` | TanStack Start + Optimizely SDK | Projects using TanStack Start instead of Next.js |

**Choosing a template:**
- **First time using Optimizely**: Start with `nextjs-starter` for a minimal setup you can learn from
- **Building a marketing site**: Use `nextjs-stride` or `nextjs-alloy` for pre-built page types and components
- **Using TanStack Start**: Use `tanstack-starter`
- **Want to see all features**: Use `nextjs-alloy` for the most comprehensive example

### Fresh Mode

Creates a brand new project from scratch using the framework's own scaffolding tool (e.g., `create-next-app`), then adds Optimizely SDK packages and configuration.

```bash
npx @optimizely/cms-create-app
# Select: "Create a fresh project"
# Follow the framework scaffolding prompts
# Optimizely packages are added automatically
```

**What it does:**
1. Runs `create-next-app` (or equivalent) to create a new project
2. Installs `@optimizely/cms-sdk` and `@optimizely/cms-cli`
3. Creates `optimizely.config.mjs` with default configuration
4. Sets up the basic project structure

**Best for:** When you want full control over the initial project setup and prefer to start with the framework's defaults.

### Scaffold Mode

Adds Optimizely to an existing project. Does not create a new project directory.

```bash
# Navigate to your existing project first
cd my-existing-app

npx @optimizely/cms-create-app
# Select: "Add to existing project"
```

**What it does:**
1. Installs `@optimizely/cms-sdk` and `@optimizely/cms-cli` into the existing project
2. Creates `optimizely.config.mjs` with configuration pointing to your components directory
3. Creates a catch-all route for content delivery (e.g., `[...path]/page.tsx` for Next.js)
4. Does NOT overwrite existing files

**Best for:** When you already have a project and want to add CMS capabilities without starting over.

## Step 3: Select a Package Manager

The tool supports three package managers:
- **npm** - Default Node.js package manager
- **pnpm** - Fast, disk-efficient package manager
- **yarn** - Alternative package manager

The tool detects your preferred package manager from lock files if present.

## Step 4: Post-Scaffolding Setup

After the scaffolding tool completes, you need to:

### 1. Configure Environment Variables

Create a `.env` file with your CMS credentials:

```ini
OPTIMIZELY_CMS_URL=https://your-instance.cms.optimizely.com
OPTIMIZELY_CMS_CLIENT_ID=your-client-id
OPTIMIZELY_CMS_CLIENT_SECRET=your-client-secret
OPTIMIZELY_GRAPH_SINGLE_KEY=your-graph-key
```

Get these values from your CMS instance: Settings > API Keys > Create API key.

See the `optimizely-setup` skill for detailed environment variable configuration.

### 2. Push Content Types to CMS

If the template includes content type definitions, push them to your CMS:

```bash
npx @optimizely/cms-cli@latest config push
```

### 3. Create Content in the CMS

1. Open your CMS instance in a browser
2. Navigate to the content tree
3. Create pages using the content types you pushed
4. Publish the content

### 4. Start the Development Server

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev
```

Visit `http://localhost:3000` to see your application rendering content from the CMS.

## Choosing the Right Mode

| Scenario | Recommended Mode |
|----------|-----------------|
| Starting a new project, want examples | Template mode with `nextjs-starter` or `nextjs-stride` |
| Starting a new project, want clean slate | Fresh mode |
| Have an existing Next.js app | Scaffold mode |
| Evaluating Optimizely CMS | Template mode with `nextjs-alloy` |
| Using TanStack Start | Template mode with `tanstack-starter` |
| CI/CD or automated setup | Template mode (most deterministic) |

## Troubleshooting

### Scaffolding Fails to Install Dependencies

If dependency installation fails:
1. Check your Node.js version (requires Node.js 18+)
2. Clear the package manager cache:
   ```bash
   npm cache clean --force
   # or
   pnpm store prune
   ```
3. Try a different package manager
4. Check network connectivity and proxy settings

### Template Not Found

If a template is not available:
1. Ensure you are using the latest version:
   ```bash
   npx @optimizely/cms-create-app@latest
   ```
2. Check your network connectivity (templates are fetched from the registry)

### Scaffold Mode Missing Catch-All Route

If the catch-all route was not created:
1. For Next.js App Router, create `app/[...path]/page.tsx` manually
2. See the `optimizely-setup` skill for manual route setup

## Related Skills

- **`optimizely-setup`** - Manual SDK installation and configuration (alternative to scaffolding)
- **`optimizely-model`** - Creating content type definitions after scaffolding
- **`optimizely-cli-workflows`** - CLI commands for pushing and pulling content types
- **`setup-live-preview`** - Setting up live preview after scaffolding
