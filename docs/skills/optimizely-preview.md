# Optimizely Live Preview

Set up and troubleshoot live preview for Optimizely CMS in React applications, enabling editors to see content changes in real time before publishing.

## When to Use

Use this skill when you want to:
- Set up live preview for the first time in a React application
- Fix a broken preview (blank screen, nothing happens, errors in console)
- Add click-to-edit (on-page editing) capabilities for editors
- Configure preview for Next.js (App Router or Pages Router) or TanStack Start
- Verify that the CMS preview URL and environment variables are correct
- Troubleshoot communication between the CMS editor and your frontend

## Trigger Phrases

Say any of these to activate the skill:
- "Set up live preview"
- "Configure preview mode"
- "Fix preview not working"
- "Add click-to-edit"
- "Troubleshoot preview"
- "Preview is broken"
- "Can't see preview in the editor"
- "Visual editing not working"
- "On-page editing for Optimizely"

## Usage Example

```
You: "Set up live preview in my Next.js App Router project"

Agent: [Uses optimizely-preview skill]
- Detects your framework (Next.js App Router, Pages Router, or TanStack Start)
- Creates a /preview route at the correct location (e.g., src/app/preview/page.tsx)
- Adds the three required components: communication script, PreviewComponent, and OptimizelyComponent
- Wraps the page with withAppContext()
- Verifies environment variables are set (OPTIMIZELY_GRAPH_SINGLE_KEY, OPTIMIZELY_CMS_URL)
- Provides CMS-side configuration steps (Hostnames and Live Preview settings)
```

```
You: "Preview shows a blank screen when I click Preview in the CMS"

Agent: [Uses optimizely-preview skill]
- Checks that the /preview route exists and is structured correctly
- Verifies the communication injector script URL matches OPTIMIZELY_CMS_URL
- Confirms environment variables are populated (not placeholder values)
- Checks for HTTPS requirements (some browsers block mixed content)
- Walks through CMS hostname and preview URL configuration
```

## What It Generates

- **Preview route** -- A `/preview` page file in the correct framework location with all required components
- **Environment variable additions** -- `OPTIMIZELY_GRAPH_SINGLE_KEY`, `OPTIMIZELY_GRAPH_GATEWAY`, and `OPTIMIZELY_CMS_URL` in your `.env` file
- **`.gitignore` update** -- Ensures `.env` and `.env.local` are excluded from version control
- **CMS configuration guidance** -- Step-by-step instructions for Hostnames and Live Preview settings in the CMS admin

## Key Concepts

The preview route requires three components working together:

| Component | Purpose |
|-----------|---------|
| Communication injector script | Enables two-way communication between CMS and your app |
| `<PreviewComponent />` | Client component that handles real-time preview updates |
| `<OptimizelyComponent />` | Renders content using your registered components |

The `withAppContext()` higher-order component wraps the entire page and is required for request-scoped context.

## Framework Support

| Framework | Route location |
|-----------|---------------|
| Next.js App Router | `src/app/preview/page.tsx` |
| Next.js Pages Router | `src/pages/preview.tsx` |
| TanStack Start | `src/routes/preview.tsx` |
| Other React frameworks | Framework-specific `/preview` route |

## Tips

- Always restart the dev server after adding or changing environment variables.
- `OPTIMIZELY_CMS_URL` must not have a trailing slash.
- For local development with HTTPS issues, use `next dev --experimental-https` (Next.js) or configure HTTPS in your Vite config.
- After basic preview works, add click-to-edit with `getPreviewUtils()` for a richer editor experience.

## Related Skills

- [`optimizely-troubleshoot-graph`](optimizely-troubleshoot-graph.md) -- Debug Content Graph query errors that may affect preview content
- [`optimizely-setup`](optimizely-setup.md) -- Set up the SDK before configuring preview
- [`optimizely-content-fetching`](optimizely-content-fetching.md) -- Understand how content is fetched for preview and delivery
