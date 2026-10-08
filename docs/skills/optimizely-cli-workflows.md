# Optimizely CLI Workflows

Use the Optimizely CMS CLI to sync content type definitions between your local TypeScript code and the CMS instance, including pushing, pulling, deleting, and automating deployments.

## When to Use

Use this skill when you want to:
- Push local content type definitions to the CMS
- Pull existing content types from the CMS into TypeScript files
- Delete content types from the CMS
- Set up CI/CD pipelines for automated content type deployment
- Troubleshoot CLI authentication or connection errors
- Export content types as JSON for scripting or validation

## Trigger Phrases

Say any of these to activate the skill:
- "Sync content types to CMS"
- "Push content types"
- "Pull content types"
- "Run config push"
- "Run config pull"
- "Use the CLI"
- "Set up CI/CD for Optimizely"
- "Automate content type deployment"
- "Export content types as JSON"
- "Delete content types"
- "Troubleshoot CLI errors"

## Usage Example

```
You: "Push my content types to the CMS"

Agent: [Uses optimizely-cli-workflows skill]
- Verifies your .env has the required credentials
- Runs npx @optimizely/cms-cli@latest config push
- Reports which types were created, updated, or skipped
- If conflicts exist, explains options: force overwrite, reconcile, or delete-and-repush
```

```
You: "Pull all content types from our CMS into TypeScript files"

Agent: [Uses optimizely-cli-workflows skill]
- Runs npx @optimizely/cms-cli@latest config pull --group --output ./src/components
- Organizes output by base type (page/, component/, section/)
- Shows you the generated files for review
```

```
You: "Set up CI/CD for content type deployment"

Agent: [Uses optimizely-cli-workflows skill]
- Shows how to set environment variables as CI secrets
- Adds a non-interactive push step using --force
- Optionally adds a validation step using --json output
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `config push` | Push local definitions to CMS |
| `config push --force` | Overwrite existing types without confirmation |
| `config pull` | Pull CMS definitions into local files |
| `config pull --json` | Output raw JSON (for scripts and CI) |
| `config pull --group` | Organize output by base type |
| `config pull --individual` | One file per content type |
| `config pull --single-file` | All definitions in one manifest file |
| `login` | Test authentication with the CMS |
| `login --verbose` | Detailed auth flow for debugging |
| `content delete <key>` | Delete a specific content type |

## What It Handles

- **Pushing** -- Reads TypeScript definitions, validates content area constraints, compares with CMS, and creates or updates types
- **Pulling** -- Fetches definitions from CMS and generates TypeScript files in your chosen format (grouped, individual, or single-file)
- **Authentication** -- Tests and troubleshoots CLI login against your CMS instance
- **Deletion** -- Removes specific content types or resets all types in development environments
- **CI/CD** -- Non-interactive commands with environment variable configuration for automated pipelines
- **PaaS support** -- Pulls read-only types from hybrid C#/.NET environments using `--include-read-only`

## Common Workflows

**Initial setup with existing CMS types:**
Login, pull types into your project, review, then push modifications back.

**Daily development cycle:**
Edit TypeScript definitions locally, push to CMS, create content, test in your app.

**CI/CD pipeline:**
Set credentials as secrets, run `config push --force` after successful build.

## Troubleshooting Tips

- **401/403 errors**: Run `login --verbose` and verify your API key permissions in CMS Settings.
- **Config file not found**: Check that `optimizely.config.mjs` exists in your project root, or use `--config` to point elsewhere.
- **Push conflicts**: Pull the current schema with `--json` to compare, then reconcile or use `--force`.
- **Test environments**: Use `OPTIMIZELY_CMS_API_URL` instead of `OPTIMIZELY_CMS_URL`.

## Related Skills

- [`optimizely-setup`](optimizely-setup.md) -- Install the CLI and configure credentials before using these workflows
- [`optimizely-project-scaffold`](optimizely-project-scaffold.md) -- Scaffold a new project that already includes CLI setup
- [`optimizely-observability`](optimizely-observability.md) -- Monitor SDK performance after deployment
