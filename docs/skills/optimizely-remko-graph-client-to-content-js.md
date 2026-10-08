# Remko Graph Client to Content JS SDK Migration

Migrate the community **Remko Graph client** (`@remkoj/optimizely-graph-client`) to the official **Content JS SDK** (`@optimizely/cms-sdk`). This is the foundational skill in the Remko migration suite — it establishes the auth/env story and runtime client init that the other skills build on.

## When to Use

Use this skill when you want to:
- Replace `@remkoj/optimizely-graph-client` with `@optimizely/cms-sdk`
- Swap `ContentGraphClient` for the SDK `GraphClient`
- Replace `RouteResolver` path lookups with `getContentByPath()`
- Convert `createClient()` to `config()` + `getClient()`
- Migrate `OPTIMIZELY_CONTENTGRAPH_*` env vars to `OPTIMIZELY_GRAPH_*`
- Understand the Single Key vs App Key + Secret authentication split
- Diagnose empty renders caused by stale Graph credentials (CMS-55679)

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate optimizely-graph-client"
- "Replace ContentGraphClient"
- "Swap the Remko Graph client for the official SDK"
- "Convert createClient to getClient"
- "Replace RouteResolver"
- "Migrate OPTIMIZELY_CONTENTGRAPH env vars"
- "Graph client returns empty content"

## Usage Example

```
You: "Migrate our @remkoj/optimizely-graph-client usage to the official SDK"

Agent: [Uses optimizely-remko-graph-client-to-content-js skill]
- Scans for @remkoj/optimizely-graph-client imports and usage patterns
- Swaps the package for @optimizely/cms-sdk
- Replaces createClient() with one-time config(buildConfig()) at app startup
- Rewrites ContentGraphClient calls to getClient()
- Converts RouteResolver lookups to getContentByPath() (returns an array)
- Renames OPTIMIZELY_CONTENTGRAPH_* env vars to OPTIMIZELY_GRAPH_*
- Flags the Single Key vs App Key + Secret auth split
```

```
You: "What's the SDK equivalent of ChannelRepository.createDefinition?"

Agent: [Uses optimizely-remko-graph-client-to-content-js skill]
- Explains there is no direct equivalent
- ChannelRepository/createDefinition patterns are replaced by
  buildConfig() + config() plus app-owned Next.js routing
```

## What It Handles

- **Usage detection** — Scans for `@remkoj/optimizely-graph-client` imports (client factory, route resolver, channel repository)
- **Package swap** — Removes the community package, adds `@optimizely/cms-sdk`
- **Client init** — Replaces per-call `createClient()` with a single `config(buildConfig())` at app startup + `getClient()` anywhere
- **Fetching** — Maps route/path lookups to `getContentByPath()` (array result) and id/key lookups to `getContent()`
- **Auth & env** — Renames env vars and explains the Single Key vs App Key + Secret model
- **Honest gaps** — Documents where `ChannelRepository` / `createDefinition` and runtime HMAC have no SDK equivalent

## Method Mapping Quick Reference

| Remko (`@remkoj/optimizely-graph-client`) | Content JS SDK (`@optimizely/cms-sdk`) |
|--------------------------------------------|-----------------------------------------|
| `ContentGraphClient` | `GraphClient` (via `getClient()`) |
| `createClient()` | `config(buildConfig())` once + `getClient()` |
| `RouteResolver.getContentByPath()` | `getContentByPath()` (returns an **array**) |
| content-by-id / key lookup | `getClient().getContent({ key, locale })` |
| `ChannelRepository.createDefinition()` | — no equivalent (use `buildConfig()` + app routing) |
| `OPTIMIZELY_CONTENTGRAPH_*` env vars | `OPTIMIZELY_GRAPH_*` env vars |
| runtime HMAC signing | — no runtime HMAC (Single Key / App Key model) |

## Important Notes

- **`getContentByPath()` returns an array.** Take `[0]` for the single match — it is not a scalar like Remko's resolver.
- **Init once, use everywhere.** Call `config(buildConfig())` a single time at app startup; then `getClient()` returns the shared client. Forgetting the init makes `getClient()` fail.
- **Single Key vs App Key + Secret.** `OPTIMIZELY_GRAPH_SINGLE_KEY` serves public/published queries. `OPTIMIZELY_GRAPH_APP_KEY` + `OPTIMIZELY_GRAPH_SECRET` authenticate privileged queries. `GraphOptions` has no `secret` field for runtime HMAC — the model differs from Remko.
- **CMS-55679 gotcha.** Stale/invalid Graph credentials cause the schema-init module to abort, so `_Content` is never published and renders come back empty (not an error). If content is silently empty after migration, verify the Graph keys first.
- **Foundational skill.** Complete this before the cms-react and cms-nextjs skills — they depend on the client init and env story settled here.

## Related Skills

- [`optimizely-remko-cms-react-to-content-js`](optimizely-remko-cms-react-to-content-js.md) — Migrate React rendering / component factory (build after this)
- [`optimizely-remko-cms-nextjs-to-content-js`](optimizely-remko-cms-nextjs-to-content-js.md) — Migrate Next.js pages, preview, and publish handlers
- [`optimizely-remko-graph-functions-to-content-js`](optimizely-remko-graph-functions-to-content-js.md) — Migrate GraphQL codegen to runtime query generation
- [`optimizely-content-fetching`](optimizely-content-fetching.md) — Content fetching patterns with the official SDK
