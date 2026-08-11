# JavaScript/TypeScript SDK Breaking Changes: CMS 12 → CMS 13

## Overview

While the bulk of CMS 12 → 13 breaking changes are .NET server-side,
projects that consume the CMS via the JavaScript/TypeScript SDK
(@optimizely/cms-sdk) are also affected. Changes fall into three areas:
GraphQL schema changes, content type definition updates, and preview
configuration changes.

## When to Use This Reference

Consult this reference if your project:
- Uses @optimizely/cms-sdk to fetch content from Optimizely CMS
- Has a frontend built with Next.js (App Router or Pages Router) or TanStack Start
- Uses the Optimizely CMS GraphQL API for content delivery
- Has content type definitions in TypeScript that map to CMS content types

## 1. GraphQL Schema Changes

### Content Type Name Validation

CMS 13 enforces stricter naming rules for content types. Names must be
2-255 characters and match `^[A-Za-z][_0-9A-Za-z]+`. Single-character
names are auto-migrated with prefixes (e.g., `CT_` for content types).

**Impact on SDK consumers**: If your TypeScript content type definitions
reference content types by name, and any names were auto-migrated during
the CMS 13 upgrade, your GraphQL queries will return empty results.

**Detection**: Search for content type names in your TypeScript definitions
that are single characters or contain special characters.

**Fix**: Update the `contentType` name in your TypeScript definitions to
match the migrated name in CMS 13.

```typescript
// Before (CMS 12) — single-char name worked
export const APage = contentType("APage", { ... });

// After (CMS 13) — if auto-migrated, name changed
export const CT_APage = contentType("CT_APage", { ... });
```

### Property Name Changes

Similarly, property names are validated. Single-character property names
get `PD_` prefix; invalid characters become `_`.

**Impact**: GraphQL queries referencing old property names will fail.

**Fix**: Update property names in TypeScript content type definitions
and GraphQL queries.

### ContentArea Fragment Changes

ContentArea properties in the GraphQL schema may behave differently
because ContentArea no longer inherits XhtmlString on the server side.
The GraphQL representation should still work, but inline content
fragments may be structured differently.

**Detection**: Check GraphQL queries that expand ContentArea items.

### Block Type Resolution

CMS 13 uses a common PropertyDefinitionType for all blocks (with DataType
as "Block") instead of per-block-type definitions. This affects how block
types are resolved in GraphQL responses.

**Impact**: If your frontend code relies on `__typename` or block type
discriminators, verify they still resolve correctly.

## 2. Content Type Definition Updates

### Validate Existing Definitions

After the CMS 13 upgrade, run the CMS CLI to verify your content type
definitions match the updated CMS schema:

```bash
npx opti-cms config verify
```

If names were auto-migrated, you need to update your TypeScript definitions.

### Registry Re-synchronization

After migration, re-sync your content type registry:

```bash
npx opti-cms config push
```

This ensures your local TypeScript definitions match the CMS 13 schema.

## 3. Preview Configuration Changes

### UI URL Change

CMS 13 changes the default UI URL from `/EPiServer` to `/Optimizely`.

**Impact on preview routes**: If your preview route configuration
references the CMS UI path, update it.

**Detection**: Search for `/EPiServer` in your frontend configuration,
environment variables, and preview route handlers.

```typescript
// Before (CMS 12)
const CMS_UI_PATH = '/EPiServer';

// After (CMS 13)
const CMS_UI_PATH = '/Optimizely';
```

### Preview Token Changes

Preview tokens are no longer issued for specific content. The token
validation logic on the frontend should still work, but tokens no longer
carry a content reference.

**Impact**: If your preview route validates the content reference from
the preview token, that field no longer exists.

**Detection**: Search for `PreviewToken.ContentReference` or similar
content-specific token validation in your preview route handlers.

### SiteDefinition → Application

If your frontend configuration references SiteDefinition-related API
endpoints, these have been renamed to Application equivalents.

**Detection**: Search for `SiteDefinition` in any API calls from
your frontend code.

## 4. Framework-Specific Changes

### Next.js (App Router)

Preview route handlers in `app/api/preview/route.ts` or similar:
- Update CMS UI URL references (`/EPiServer` → `/Optimizely`)
- Verify preview token handling works without content reference
- Re-test draft content fetching with updated CMS instance

### Next.js (Pages Router)

Preview API routes in `pages/api/preview.ts`:
- Same URL and token changes as App Router
- Verify `setPreviewData()` and `clearPreviewData()` still function
  correctly with CMS 13 preview tokens

### TanStack Start

Server functions handling preview:
- Update CMS UI URL references
- Verify server-side content fetching works with CMS 13 GraphQL schema
- Re-test live preview with updated content type names

## 5. Migration Checklist for SDK Consumers

1. [ ] Update CMS instance to CMS 13
2. [ ] Run `npx opti-cms config verify` to check for name mismatches
3. [ ] Update any auto-migrated content type names in TypeScript definitions
4. [ ] Update any auto-migrated property names in TypeScript definitions
5. [ ] Run `npx opti-cms config push` to re-sync registry
6. [ ] Update CMS UI URL references from `/EPiServer` to `/Optimizely`
7. [ ] Test preview routes with CMS 13 preview tokens
8. [ ] Verify GraphQL queries return expected data
9. [ ] Test content rendering for ContentArea properties
10. [ ] Run `npx tsc --noEmit` to verify TypeScript compilation
