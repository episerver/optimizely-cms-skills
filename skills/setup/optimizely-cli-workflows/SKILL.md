---
name: optimizely-cli-workflows
description: This skill should be used when the user asks to "sync content types to CMS", "push content types", "pull content types", "run config push", "run config pull", "use the CLI", "set up CI/CD for Optimizely", "automate content type deployment", "export content types as JSON", "delete content types", "troubleshoot CLI errors", or mentions the Optimizely CMS CLI commands for syncing TypeScript definitions with the CMS.
---

# Optimizely CMS CLI Workflows

This skill teaches CLI commands for syncing content type definitions between TypeScript and the Optimizely CMS instance.

## When to Use This Skill

Use this skill when the user wants to:
- Push local TypeScript content type definitions to the CMS
- Pull existing content type definitions from the CMS into TypeScript files
- Troubleshoot CLI authentication or connection errors
- Set up CI/CD pipelines for content type deployment
- Delete content types from the CMS
- Understand available CLI commands and options

## Prerequisites

Before using the CLI, ensure:
1. The `@optimizely/cms-cli` package is installed (see `optimizely-setup` skill)
2. Environment variables are configured in `.env`:
   - `OPTIMIZELY_CMS_CLIENT_ID` - CLI client credentials
   - `OPTIMIZELY_CMS_CLIENT_SECRET` - CLI client credentials
   - `OPTIMIZELY_CMS_URL` - Base URL of your CMS instance (production)
   - `OPTIMIZELY_CMS_API_URL` - API URL (use instead of CMS_URL for test environments)
3. An `optimizely.config.mjs` configuration file exists in the project root

All commands are run via npx:
```bash
npx @optimizely/cms-cli@latest [command]
```

## Command Reference

### config push

Push local TypeScript content type definitions to the CMS.

```bash
npx @optimizely/cms-cli@latest config push [--config path] [--force] [--host url]
```

**Options:**
- `--config path` - Path to configuration file (default: `./optimizely.config.mjs`)
- `--force` - Overwrite existing types in CMS without confirmation (may cause data loss if property types change)
- `--host url` - Override the CMS URL from environment variables

**What it does:**
1. Reads TypeScript content type definitions from the components directory specified in `optimizely.config.mjs`
2. Validates content area constraints (warns about missing `allowedTypes`/`restrictedTypes`)
3. Compares local definitions with CMS definitions
4. Creates new types and updates changed types in the CMS
5. Reports which types were created, updated, or skipped

**Example:**
```bash
# Standard push using default config
npx @optimizely/cms-cli@latest config push

# Push with explicit config path
npx @optimizely/cms-cli@latest config push --config ./my-config.mjs

# Force overwrite (use with caution)
npx @optimizely/cms-cli@latest config push --force
```

**Important notes:**
- The `--force` flag will overwrite existing content types in the CMS. If you change a property type (e.g., from `string` to `richText`), existing content using that property may lose data.
- The CLI validates content area constraints at push time. If a content area property lacks `allowedTypes` or `restrictedTypes`, you will see a warning. Adding these constraints reduces the number of GraphQL fragments generated and prevents `GraphFragmentThresholdError`.

### config pull

Pull content type definitions from the CMS into local files.

```bash
npx @optimizely/cms-cli@latest config pull [--output path] [--json] [--group] [--single-file] [--individual] [--include-read-only]
```

**Options:**
- `--output path` - Directory to write generated files (default: current directory)
- `--json` - Output raw JSON to stdout (for piping to other tools)
- `--group` - Organize output files by base type into subdirectories (`page/`, `component/`, `section/`)
- `--single-file` - Write all definitions into one `manifest.ts` file
- `--individual` - Write one file per content type
- `--include-read-only` - Include read-only types (useful for PaaS environments with C#/.NET content types)

**Modes:**
- **Interactive mode** (no flags): Prompts you to choose output format and options
- **Non-interactive mode** (with flags): Outputs directly based on specified flags

**Examples:**
```bash
# Interactive mode - prompts for options
npx @optimizely/cms-cli@latest config pull

# Pull and organize by base type into src/components
npx @optimizely/cms-cli@latest config pull --group --output ./src/components

# Pull all types into a single manifest file
npx @optimizely/cms-cli@latest config pull --single-file --output ./src/types

# Pull one file per type
npx @optimizely/cms-cli@latest config pull --individual --output ./src/components

# Output JSON for piping (useful for scripts and CI)
npx @optimizely/cms-cli@latest config pull --json | jq .contentTypes

# Include read-only types from PaaS environment
npx @optimizely/cms-cli@latest config pull --json --include-read-only
```

### login

Test authentication with the CMS instance.

```bash
npx @optimizely/cms-cli@latest login [--verbose]
```

**Options:**
- `--verbose` - Show detailed authentication flow for debugging

**Example:**
```bash
# Quick auth test
npx @optimizely/cms-cli@latest login

# Verbose output for debugging
npx @optimizely/cms-cli@latest login --verbose
```

### content delete

Delete a specific content type from the CMS by its key.

```bash
npx @optimizely/cms-cli@latest content delete <key>
```

**Warning:** This deletes the content type AND all content instances of that type. This action cannot be undone.

**Example:**
```bash
npx @optimizely/cms-cli@latest content delete OldArticle
```

### danger delete-all-content-types

Delete all content types from the CMS. This is the nuclear option.

```bash
npx @optimizely/cms-cli@latest danger delete-all-content-types
```

**Warning:** This requires interactive confirmation. It deletes every content type and all associated content. Use only when resetting a development environment.

## Common Workflows

### Initial Setup

When setting up a new project with existing CMS content types:

1. Authenticate:
   ```bash
   npx @optimizely/cms-cli@latest login
   ```
2. Pull existing definitions:
   ```bash
   npx @optimizely/cms-cli@latest config pull --group --output ./src/components
   ```
3. Review and adjust the generated TypeScript files
4. Push any modifications back:
   ```bash
   npx @optimizely/cms-cli@latest config push
   ```

### Syncing Changes During Development

After modifying content type definitions locally:

1. Push changes to CMS:
   ```bash
   npx @optimizely/cms-cli@latest config push
   ```
2. If push conflicts occur (type already exists with different structure), either:
   - Use `--force` to overwrite (check for data loss implications)
   - Manually reconcile differences in the CMS admin UI

### Pulling Existing Schema from a PaaS Environment

For hybrid environments with C#/.NET content types:

```bash
# Pull everything including read-only types
npx @optimizely/cms-cli@latest config pull --json --include-read-only > schema.json

# Or generate TypeScript files directly
npx @optimizely/cms-cli@latest config pull --individual --include-read-only --output ./src/components
```

### CI/CD Integration

For automated deployment pipelines, use non-interactive mode with environment variables:

```bash
# Set environment variables in CI
export OPTIMIZELY_CMS_CLIENT_ID=$CMS_CLIENT_ID
export OPTIMIZELY_CMS_CLIENT_SECRET=$CMS_CLIENT_SECRET
export OPTIMIZELY_CMS_URL=$CMS_URL

# Push content types (non-interactive)
npx @optimizely/cms-cli@latest config push --force

# Or pull and validate as JSON
npx @optimizely/cms-cli@latest config pull --json > current-schema.json
```

**CI/CD tips:**
- Use `--force` in CI to avoid interactive prompts
- Store credentials as CI/CD secrets, not in code
- Use `--json` output for validation scripts
- Run `config push` as a deployment step after build succeeds

## Troubleshooting

### Authentication Errors

**Symptom:** `login` command fails or `config push` returns 401/403.

**Steps to resolve:**
1. Verify environment variables are set:
   ```bash
   echo $OPTIMIZELY_CMS_CLIENT_ID
   echo $OPTIMIZELY_CMS_URL
   ```
2. Run login with verbose output:
   ```bash
   npx @optimizely/cms-cli@latest login --verbose
   ```
3. Check that the API key has the correct permissions in CMS: Settings > API Keys
4. For test environments, ensure `OPTIMIZELY_CMS_API_URL` is set to `https://api.cmstest.optimizely.com` instead of using `OPTIMIZELY_CMS_URL`

### Connection Errors

**Symptom:** CLI cannot connect to the CMS instance.

**Steps to resolve:**
1. Verify `OPTIMIZELY_CMS_URL` is correct and accessible from your network
2. Check for VPN or firewall requirements
3. For local CMS with self-signed certificates, set `NODE_TLS_REJECT_UNAUTHORIZED="0"` (development only)
4. Try using `--host` flag to override the URL:
   ```bash
   npx @optimizely/cms-cli@latest config push --host https://correct-url.cms.optimizely.com
   ```

### Config File Not Found

**Symptom:** CLI reports it cannot find `optimizely.config.mjs`.

**Steps to resolve:**
1. Verify the file exists in the project root:
   ```bash
   ls optimizely.config.mjs
   ```
2. If the file is in a different location, use `--config`:
   ```bash
   npx @optimizely/cms-cli@latest config push --config ./path/to/optimizely.config.mjs
   ```
3. If no config file exists, use the `optimizely-setup` skill to create one

### Push Conflicts

**Symptom:** `config push` fails because types already exist with different definitions.

**Steps to resolve:**
1. Pull the current CMS schema to see what differs:
   ```bash
   npx @optimizely/cms-cli@latest config pull --json
   ```
2. Compare with your local definitions
3. Either:
   - Update your local definitions to match and re-push
   - Use `--force` to overwrite (verify no data loss)
   - Delete the conflicting type first with `content delete <key>` and re-push

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPTIMIZELY_CMS_CLIENT_ID` | Yes | CLI client ID from CMS Settings > API Keys |
| `OPTIMIZELY_CMS_CLIENT_SECRET` | Yes | CLI client secret from CMS Settings > API Keys |
| `OPTIMIZELY_CMS_URL` | Yes (prod) | Base URL of your CMS instance |
| `OPTIMIZELY_CMS_API_URL` | Yes (test) | API URL for test environments |
| `OPTIMIZELY_GRAPH_SINGLE_KEY` | No | Not required for CLI, but needed for content delivery |

## Related Skills

- **`optimizely-setup`** - Initial SDK installation and configuration
- **`optimizely-model`** - Creating content type definitions in TypeScript
- **`optimizely-project-scaffold`** - Scaffolding new projects with templates
