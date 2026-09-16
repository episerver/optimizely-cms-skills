---
name: optimizely-cms12-to-13-assessment
description: >-
  This skill should be used when the user asks for a "pre-migration
  assessment", "what would it take to migrate to CMS 13", "CMS 12 to 13
  migration effort", "what changed between CMS 12 and 13", "CMS 13
  breaking changes", "is my project ready for CMS 13", "package
  compatibility CMS 13", "assess CMS 12 project for migration",
  "how hard is the CMS 13 upgrade", or asks about the scope, effort, or
  risk of migrating from Optimizely CMS 12 to CMS 13 without requesting
  actual code changes.
---

# Assess Optimizely CMS 12 → 13 Migration

Scan a CMS 12 project and report migration effort, risk areas, and
recommended migration path — without making any code changes.

## When to Use This Skill

- User wants a pre-migration assessment before starting the upgrade
- User asks about breaking changes between CMS 12 and CMS 13
- User asks what it would take to migrate to CMS 13
- User asks about package compatibility with CMS 13
- User wants to understand migration scope or effort level
- User asks whether their project is ready for CMS 13

**Do NOT use this skill when**: the user wants to actually perform the
migration. Use the `optimizely-cms12-to-13` skill instead.

## Steps

### Step 1: Assess Current Project

Before making changes, scan the project to understand migration scope.

1. **Detect CMS version** — check `.csproj` files for EPiServer/Optimizely
   package versions:
   ```shell
   grep -r "EPiServer\|Optimizely" --include="*.csproj" .
   ```

2. **Check .NET version** — read `global.json` and `TargetFramework`:
   ```shell
   cat global.json
   grep -r "TargetFramework" --include="*.csproj" .
   ```

3. **Scan for removed features** — search for usage of features removed
   in CMS 13:
   - `DynamicProperty` — Dynamic Properties (removed)
   - `PlugInAttribute`, `PlugInDescriptor` — PlugIn system (removed)
   - `MirroringImporting`, `MirroringExporting` — Mirroring (removed)

4. **Scan for high-impact API changes**:
   - `PageReference` — must change to ContentReference
   - `SiteDefinition` — must change to Application
   - `Castle.Windsor` — dependency removed
   - `Newtonsoft.Json` — replaced with System.Text.Json
   - `ContentArea.ToHtmlString` — ContentArea no longer inherits XhtmlString
   - `ServiceLocator.Current` — antipattern, not recommended; use constructor injection
   - `IConfigurableModule` — removed; move to `Startup.ConfigureServices()`
   - `DataAccessBase` — obsoleted; use `IDatabaseExecutor`
   - `UriSupport.` (static usage) — obsoleted; inject `IUriSupport` via DI
   - `PrincipalInfo.HasEditAccess` — removed; use `user.IsInRole()`
   - `PrincipalInfo.IsPermitted` — removed; use `PermissionService`
   - `PageEditing.PageIsInEditMode` — removed; use `IContextModeResolver`
   - `BlockTypeRepository` — removed; use `IContentTypeRepository`
   - `PageTypeRepository` — removed; use `IContentTypeRepository`
   - `PublicString`, `PublicLongString` — removed; use `String`, `LongString`
   - `IContentRouteEvents` — removed; use `IContentUrlGeneratorEvents`/
     `IContentUrlResolverEvents`
   - `Injected<T>` — removed; use constructor injection
   - `IContentAreaLoader.Get()` — renamed to `LoadContent()`
   - `SoftLink.LinkStatus` — renamed to `SoftLink.HttpStatusCode`
   - `RenderSettings.CustomTag` — renamed to `CustomTagName`
   - `RenderSettings.ChildrenCustomTag` — renamed to `ChildrenCustomTagName`
   - `IContentTypeRepository<T>` (generic) — removed; use
     non-generic `IContentTypeRepository`
   - `ContentCoreData` — renamed to `ContentNode`
   - `IContentCoreDataLoader` — renamed to `IContentNodeLoader`
   - `[DojoWidget]` — removed; use `[CriterionPropertyEditor]`
   - `.PageLink` — renamed to `.ContentLink`
   - `[Display(GroupName = "...")]` — tab names must be alphanumeric only
     in CMS 13 (no spaces, hyphens, or special characters)

5. **Scan for non-alphanumeric tab names** — CMS 13 enforces that tab
   names contain only letters and digits. Tabs with spaces, hyphens, or
   special characters will cause runtime errors:
   ```shell
   grep -rn "GroupName\s*=" --include="*.cs" .
   ```
   Check each `GroupName` value — if it contains anything other than
   `[A-Za-z0-9]`, it must be renamed.

6. **Scan for incompatible packages** — check `.csproj` for packages with
   known CMS 13 incompatibilities:

   **Optimizely packages** (no CMS 13 version):
   - `EPiServer.Find.Cms` — obsolete in CMS 13; must remove (migrate to
     Optimizely Graph)
   - `EPiServer.ContentDeliveryApi.*` — not compatible; must remove
   - `EPiServer.ContentManagementApi` — not compatible; must remove
   - `EPiServer.ContentDefinitionsApi` — not compatible; must remove
   - `EPiServer.Cms.WelcomeIntegration.UI` — replaced by
     `EPiServer.Cms.DamIntegration.UI`
   - `EPiServer.Marketing.Testing` — not compatible; must remove
   - `EPiServer.MarketingAutomationIntegration.*` — not compatible; must remove
   - EPiServer Labs packages (BlockEnhancements, ContentManager,
     GridView, etc.) — not compatible; must remove

   **DAM integration caveat**: At the time of writing, there is no
   migration path for customers using DAM integration in CMS 12. Check
   the [Optimizely documentation](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/upgrade-to-cms-13#pre-upgrade-audit-and-prepare)
   for the latest state.

   **Third-party packages**:
   - `Geta.*` packages — most not compatible; must remove
   - `Advanced.CMS.AdvancedReviews` — not compatible; must remove
   - `Stott.Optimizely.RobotsHandler` — not compatible; must remove
   - See `references/third-party-compatibility.md` for the complete list

7. **Scan for headless frontend packages** — check `.csproj` for packages
   indicating a headless frontend consumes CMS content:
   ```shell
   grep -r "Optimizely.Graph\|ContentDeliveryApi\|ContentManagementApi\|ContentDefinitionsApi" --include="*.csproj" .
   ```
   - `Optimizely.Graph.Cms` or `Optimizely.Graph.Cms.Query` — existing
     Graph user
   - `EPiServer.ContentDeliveryApi` or `EPiServer.ContentDeliveryApi.Cms` —
     Content Delivery API user
   - `EPiServer.ContentManagementApi` — Management API user (headless)
   - `EPiServer.ContentDefinitionsApi` — Definitions API user (headless)

   Any match → **Frontend: Present**. No match → **Frontend: None**.

8. **Scan for spelling corrections** — CMS 13 fixes misspellings in the
   public API that cause compilation errors:
   - `GetDescendents` → `GetDescendants`
   - `includeDecendents` → `includeDescendants`
   - `conentLink` → `contentLink`
   - `SearchStringRegexpression` → `SearchStringRegex`
   - `ValidateLanguageEdititingAccessRights` →
     `ValidateLanguageEditingAccessRights`
   - `StatisticsPersistanceInterval` → `StatisticsPersistenceInterval`
   - See `references/breaking-changes-dotnet.md` section 14 for the full
     list

9. **Categorize migration effort** using two axes:

   **Code Impact**:
   - **Minimal**: Only runtime + package updates needed (no removed features,
     no deprecated API usage, no incompatible packages)
   - **Moderate**: API changes required (PageReference, SiteDefinition, etc.)
     but no removed features
   - **Significant**: Uses removed features (Dynamic Properties, PlugIn
     system) or has many incompatible packages requiring removal and
     replacement

   **Frontend Impact** (from item 7):
   - **None**: No headless frontend packages detected
   - **Present**: One or more headless frontend packages detected

   Report as: `Code: <tier> | Frontend: <classification>`
   Examples: `Code: Minimal | Frontend: None`,
   `Code: Moderate | Frontend: Present`

10. **When Frontend Impact is Present** — recommend the side-by-side
   approach:
   - CMS 13 introduces schema-breaking GraphQL changes (content type name
     validation, property name corrections, ContentArea schema
     restructuring, block type resolution changes) that will break live
     headless frontends the moment the CMS database migrates.
   - Recommend: complete the code migration on a branch, deploy CMS 13 to
     a staging instance, validate the frontend against the new schema,
     then cut over to production. The CMS 12 instance continues serving
     production until cutover.
   - List the specific packages that triggered the "Frontend: Present"
     classification so the developer understands why.

11. **When both Find and headless frontend packages are detected** —
    provide explicit sequencing:
    1. Remove `EPiServer.Find.Cms` during the code migration
    2. Complete the CMS 13 code migration
    3. Validate the frontend against the new CMS 13 schema
    4. After migration is verified, run the `optimizely-find-to-graph`
       skill to add Optimizely Graph

    Do not migrate to Graph before completing the CMS 13 upgrade — Graph
    packages installed on CMS 12 will need immediate version-bumping after
    migration.

### Step 2: Report Findings

Present the assessment results:

1. **Migration effort**: `Code: <tier> | Frontend: <classification>`
2. **Removed features found** (if any): list each with recommended replacement
3. **Incompatible packages** (if any): list each with status (Optimizely and third-party)
4. **High-impact API changes detected**: count and list the most significant
5. **Tab name issues** (if any): list non-alphanumeric GroupName values
6. **Obsolete API warnings**: note that these should be fixed before upgrading

**Recommended next step**: To begin the migration, use the
`optimizely-cms12-to-13` skill.

## Related Skills

- **optimizely-cms12-to-13** — Perform the actual CMS 12 → 13 migration
  (the next step after this assessment)
- **cms11-to-12-migration** — Migrate from CMS 11 to CMS 12 (the
  prerequisite migration before CMS 13)
- **optimizely-find-to-graph** — Migrate EPiServer Find to Graph SDK
  (relevant when Find is detected in assessment)
