# Remko CMS Next.js to Content JS SDK Migration

Migrate the community **Remko CMS Next.js** package (`@remkoj/optimizely-cms-nextjs`) to the official **Content JS SDK** (`@optimizely/cms-sdk`). This skill owns the **Next.js integration surface** — catch-all page routing, preview/OPE wiring, and publish/revalidate handlers. It is **skill 3 of 3** in the core sequence: complete [`optimizely-remko-graph-client-to-content-js`](optimizely-remko-graph-client-to-content-js.md) and [`optimizely-remko-cms-react-to-content-js`](optimizely-remko-cms-react-to-content-js.md) first.

## When to Use

Use this skill when you want to:
- Replace `@remkoj/optimizely-cms-nextjs` with `@optimizely/cms-sdk`
- Replace `createPage` / `createLayout` with an app-owned catch-all page
- Convert `createEditPageComponent` to `getPreviewContent()` + `NextPreviewComponent`
- Replace `createPublishApi` with app-owned `revalidatePath` / `revalidateTag`
- Migrate `.well-known` publish/drafts/channel route handlers
- Understand why draft escalation on the catch-all does **not** carry over
- Diagnose a blank preview after migration (CMS-55679)

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate optimizely-cms-nextjs"
- "Replace createPage / createEditPageComponent / createPublishApi"
- "Swap the Remko catch-all page for the official SDK"
- "Migrate the preview route to the official SDK"
- "Migrate .well-known publish routes"
- "Convert the Remko page factory to app-owned Next.js pages"
- "Preview is blank after migrating"

## Usage Example

```
You: "Migrate our @remkoj/optimizely-cms-nextjs pages and preview to the official SDK"

Agent: [Uses optimizely-remko-cms-nextjs-to-content-js skill]
- Scans for createPage, createEditPageComponent, createPublishApi, and
  .well-known route handlers
- Swaps the package for @optimizely/cms-sdk
- Replaces createPage with an app-owned catch-all: getContentByPath (array) +
  OptimizelyComponent, wrapped in withAppContext
- Rewrites the preview route to getPreviewContent(searchParams) +
  NextPreviewComponent (./react/nextjs), same single-key getClient()
- Replaces createPublishApi with app-owned revalidatePath / revalidateTag
- Adds explicit route-segment config the factories used to set internally
```

```
You: "Why doesn't my draftMode escalation work on the catch-all anymore?"

Agent: [Uses optimizely-remko-cms-nextjs-to-content-js skill]
- Explains G12: the target has no draft escalation on the catch-all
- getContentByPath is published-only; updateAuthentication / enablePreview /
  AuthMode do not exist in the target
- All draft traffic goes through the /preview route + getPreviewContent
- Delete the draftMode() branch from the catch-all
```

## What It Handles

- **Usage detection** — Scans for `createPage`, `createLayout`, `createEditPageComponent`, `createPublishApi`, and `.well-known` handlers
- **Package swap** — Removes the community package, adds `@optimizely/cms-sdk`
- **Catch-all page** — Replaces the factory with an app-owned page + route-segment config (`dynamic`/`dynamicParams`/`revalidate`)
- **Preview route** — `getPreviewContent(searchParams)` + `NextPreviewComponent` + communication-injector `<Script>`
- **Publish/revalidate** — App-owned `.well-known` handlers calling Next.js `revalidatePath` / `revalidateTag`
- **Honest gaps** — No `createPublishApi` equivalent; draft escalation (G12) and generated master queries (G13) do not carry over

## Method Mapping Quick Reference

| Remko (`@remkoj/optimizely-cms-nextjs`) | Content JS SDK (`@optimizely/cms-sdk`) |
|------------------------------------------|-----------------------------------------|
| `createPage(factory, options)` | app-owned catch-all + `getContentByPath()` (array) + `OptimizelyComponent` |
| `createEditPageComponent(factory, …)` | `getClient().getPreviewContent(searchParams)` + `NextPreviewComponent` (`./react/nextjs`) |
| `createPublishApi(options)` | — no equivalent (app-owned `revalidatePath` / `revalidateTag`) |
| draft escalation on catch-all (G12) | — no equivalent (drafts flow through `/preview` only) |
| generated master query (G13) | — evaporates (query built from content-type registry) |
| `generateMetadata` / `generateStaticParams` | app-owned (implement yourself) |
| `.well-known/{channel,drafts,publish}` | app-owned route handlers |
| preview client `createClient(undefined, token)` | same single-key `getClient()`; Bearer `preview_token` |

## Important Notes

- **`getContentByPath()` returns an array.** Access `[0]` for the first match, or `OptimizelyComponent` renders nothing.
- **Wrap pages in `withAppContext`.** Required for request-scoped context in both the catch-all and preview routes.
- **Draft escalation does NOT carry to the catch-all (G12).** `getContentByPath` is published-only; `updateAuthentication` / `enablePreview` / `AuthMode` do not exist. Delete any `draftMode()` branch on the catch-all — drafts flow only through `/preview` + `getPreviewContent`.
- **No `secret`, no second client for preview.** Use the same single-key `getClient()` as the published route. `GraphOptions` has **no `secret` field** — `new GraphClient(appKey, { secret })` is a type error. Draft auth is the per-request Bearer `preview_token` that `getPreviewContent` reads from `searchParams`.
- **`createPublishApi` has no equivalent.** Implement `.well-known` route handlers yourself and call Next.js `revalidatePath` / `revalidateTag`.
- **Generated master queries evaporate (G13).** Once `@remkoj/optimizely-graph-functions` codegen is removed, the generated master queries are gone. The SDK builds queries from the content-type registry (`initContentTypeRegistry`). Empty renders usually mean unregistered content types, not a missing master query.
- **Set route-segment config explicitly.** The factories set these internally; app-owned pages must export them. Catch-all: `dynamic = 'error'`, `dynamicParams = true`, `revalidate = false`. Preview: `dynamic = 'force-dynamic'`, `fetchCache = 'force-no-store'`, `revalidate = 0`, `runtime = 'nodejs'`.
- **CMS-55679 blank-preview gotcha.** A blank preview is usually invalid/rotated Graph credentials **on the CMS instance** (schema-init aborts → `_Content` never published), not a frontend preview-auth bug. Verify the CMS instance's Graph credentials first.

## Related Skills

- [`optimizely-remko-graph-client-to-content-js`](optimizely-remko-graph-client-to-content-js.md) — Migrate the Graph client / fetching (**complete first**)
- [`optimizely-remko-cms-react-to-content-js`](optimizely-remko-cms-react-to-content-js.md) — Migrate the React rendering surface (**complete second**)
- [`optimizely-remko-graph-functions-to-content-js`](optimizely-remko-graph-functions-to-content-js.md) — Migrate GraphQL codegen to runtime query generation
- [`optimizely-preview`](optimizely-preview.md) — Preview / on-page-edit with the official SDK
- [`optimizely-troubleshoot-graph`](optimizely-troubleshoot-graph.md) — Diagnose Graph issues, including CMS-55679
