# Optimizely Setup

Set up the Optimizely CMS JavaScript SDK in your project from scratch, including package installation, environment configuration, and connection verification.

## When to Use

Use this skill when you want to:
- Install the Optimizely CMS SDK into an existing project
- Configure environment variables for your CMS instance
- Create the `optimizely.config.mjs` configuration file
- Connect your project to the CMS for the first time
- Switch between production and test (cmstest) environments
- Troubleshoot authentication or connection issues during setup

## Trigger Phrases

Say any of these to activate the skill:
- "Set up Optimizely CMS SDK"
- "Initialize the SDK from scratch"
- "Configure the CMS client"
- "Add content delivery"
- "Integrate Optimizely CMS"
- "Start a headless CMS project with Optimizely"
- "Install the SDK"

## Usage Example

```
You: "Set up the Optimizely CMS SDK in my Next.js project"

Agent: [Uses optimizely-setup skill]
- Detects your package manager (npm, pnpm, or yarn) from lock files
- Installs @optimizely/cms-sdk and @optimizely/cms-cli
- Creates a .env file with placeholder variables for your CMS credentials
- Asks whether you want property groups in your config
- Creates optimizely.config.mjs with the appropriate component paths
- Adds .env to .gitignore
- Runs the CLI login command to verify the connection
```

```
You: "Add all missing environment variables"

Agent: [Uses optimizely-setup skill]
- Reviews your current .env file
- Adds the full set of available variables with documentation
- Explains which variables are required vs optional
- Flags any test-environment-specific settings you may need
```

## What It Generates

- **Package installation** -- Adds `@optimizely/cms-sdk` (runtime) and `@optimizely/cms-cli` (dev dependency)
- **`.env` file** -- Environment variables with placeholders for CMS URL, client credentials, and Graph key
- **`optimizely.config.mjs`** -- SDK configuration pointing to your components directory, optionally with property groups
- **`.gitignore` update** -- Ensures `.env` is not committed to version control

## Environment Variables

The skill configures these key variables:

| Variable | Purpose |
|----------|---------|
| `OPTIMIZELY_CMS_URL` | Your CMS instance URL (production) |
| `OPTIMIZELY_CMS_CLIENT_ID` | CLI authentication credentials |
| `OPTIMIZELY_CMS_CLIENT_SECRET` | CLI authentication credentials |
| `OPTIMIZELY_GRAPH_SINGLE_KEY` | Content Graph authentication |
| `OPTIMIZELY_CMS_API_URL` | API URL for test environments |
| `OPTIMIZELY_GRAPH_GATEWAY` | Content Graph endpoint override |

## Tips

- Credentials are found in your CMS instance under Settings > API Keys > Create API key.
- For test environments (cmstest), use `OPTIMIZELY_CMS_API_URL` instead of `OPTIMIZELY_CMS_URL`.
- If authentication fails, the skill walks you through common fixes including environment-specific configuration.

## Related Skills

- [`optimizely-project-scaffold`](optimizely-project-scaffold.md) -- Use instead when starting a brand-new project with a template
- [`optimizely-cli-workflows`](optimizely-cli-workflows.md) -- Next step after setup: push and pull content types
- [`optimizely-observability`](optimizely-observability.md) -- Add monitoring after your project is running
