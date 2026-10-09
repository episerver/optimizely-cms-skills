---
name: optimizely-cms12-to-13
description: >-
  This skill should be used when the user asks to "migrate from CMS 12
  to CMS 13", "upgrade Optimizely CMS", "update to CMS 13", "fix CMS 13
  breaking changes", "CMS 13 migration", "upgrade EPiServer packages",
  "PageReference no longer works", "PlugIn attribute not found",
  "Dynamic Properties removed", "Visitor Groups stopped working after
  upgrade", "ContentArea no longer inherits XhtmlString", "migrate .NET
  to 10", "update EPiServer packages to CMS 13", "SiteDefinition
  obsolete", "ServiceLocator.Current antipattern", "IConfigurableModule not
  found", "EPiServer.Find not compatible with CMS 13",
  "TypeLoadException after CMS upgrade", or mentions performing an
  Optimizely CMS version migration from CMS 12 to CMS 13.
---

# Migrate Optimizely CMS 12 to 13

Guide the user through migrating an Optimizely CMS 12 project to CMS 13,
covering .NET runtime upgrade, NuGet package updates, breaking API changes,
removed features, and JS/TS SDK consumer impacts.

## When to Use This Skill

- User wants to migrate/upgrade from Optimizely CMS 12 to CMS 13
- User encounters compilation errors after updating CMS packages
- User reports features stopped working after CMS upgrade (Visitor Groups,
  Dynamic Properties, PlugIn system)
- User asks about specific API changes (PageReference, SiteDefinition,
  ContentArea, XhtmlString)
- User needs to upgrade .NET version for CMS 13 compatibility
- User gets TypeLoadException or runtime errors after CMS 13 upgrade
  (package incompatibilities)
- User encounters ServiceLocator.Current or IConfigurableModule errors

**For pre-migration assessment only** (effort estimation, scope analysis,
breaking change summary without making code changes): use the
`optimizely-cms12-to-13-assessment` skill instead.

## Steps

**Before starting**: Run the `optimizely-cms12-to-13-assessment` skill
first to understand migration scope, effort level, and recommended
migration path. If the assessment identified Frontend: Present, complete
the code migration on a branch and validate the frontend before cutting
over to production.

### Step 1: Fix Obsolete API Warnings

**Before upgrading any packages**, build the CMS 12 project and fix all
`[Obsolete]` warnings. These APIs have replacements available in CMS 12
that will be removed in CMS 13. Fixing them now — while the CMS 12
replacements are still available — is easier than fixing them after
packages are upgraded.

1. **Build and capture obsolete warnings**:
   ```shell
   dotnet build 2>&1 | grep -i "CS0612\|CS0618\|obsolete"
   ```
   Fix every `CS0612` (member is obsolete) and `CS0618` (member is
   obsolete with message) warning. The compiler message typically names
   the replacement.

2. **Scan for known obsoleted APIs** — these are documented in
   `references/breaking-changes-dotnet.md` and may not always trigger
   compiler warnings:
   - `DataAccessBase` → use `IDatabaseExecutor`
   - `UriSupport` (static usage) → inject `IUriSupport` via DI
   - `IPropertyDefinitionRepository.Save/Delete` → modify
     `ContentType.PropertyDefinitions` then save the `ContentType`
   - `UsePrimaryHostForOutgoingUrls` → removed, no replacement needed
   - `IContentRepositoryExtension` → use `IContentRepository` directly
   - `ITimer` → use `System.Threading.PeriodicTimer`
   - `IWebHostingEnvironment` → use `IWebHostEnvironment`
   - `VirtualPathResolver` → use `IWebHostEnvironment.ContentRootPath`
   - Static instance properties on services → inject via DI

3. **Rebuild and verify zero obsolete warnings**:
   ```shell
   dotnet build -warnaserror:CS0612,CS0618
   ```
   Do not proceed to Step 2 until the build passes with obsolete
   warnings treated as errors.

### Step 2: Upgrade .NET Runtime

CMS 13 requires .NET 10.0.

1. Update `global.json`:
   ```json
   {
     "sdk": {
       "version": "10.0.100",
       "rollForward": "latestMajor"
     }
   }
   ```

2. Update `TargetFramework` in all `.csproj` files:
   ```xml
   <TargetFramework>net10.0</TargetFramework>
   ```

3. Update `LangVersion` (optional but recommended):
   ```xml
   <LangVersion>latest</LangVersion>
   ```

4. **IMPORTANT**: CMS 13 enables nullable reference types in many
   libraries. Consider enabling it in your project:
   ```xml
   <Nullable>enable</Nullable>
   ```

5. **Update Docker images** (if using Docker):
   ```dockerfile
   # Before
   FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
   FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

   # After
   FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
   FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
   ```
   Search for: `dotnet/sdk:8`, `dotnet/aspnet:8`, `dotnet/runtime:8`

### Step 3: Update NuGet Packages

See `references/package-mapping.md` for the complete package mapping.

Key changes:

1. **Update core packages**:
   ```shell
   dotnet add package EPiServer.CMS.Core --version 13.*
   dotnet add package EPiServer.CMS.UI --version 13.*
   ```

2. **Handle EPiServer.Azure split** (if used):
   ```shell
   dotnet remove package EPiServer.Azure
   dotnet add package EPiServer.Blobs.Azure
   dotnet add package EPiServer.Events.Azure
   ```

3. **Remove deprecated packages**:
   ```shell
   dotnet remove package EPiServer.Cms.HealthCheck
   ```

4. **Add Visitor Groups explicitly** (if used):
   ```shell
   dotnet add package EPiServer.Personalization.VisitorGroups
   ```

5. **Add ASP.NET Identity explicitly** (if used):
   ```shell
   dotnet add package EPiServer.CMS.UI.AspNetIdentity
   ```
   This was transitive in CMS 12 via the `EPiServer.Cms` metapackage
   but is now a separate package.

6. **Add other extracted packages** (if used):
   - `EPiServer.Geolocation` — if using geolocation APIs
   - `EPiServer.Events.ChangeNotification` — if using change notifications
   - `EPiServer.Blobs` — if using blob storage APIs directly
   - `EPiServer.Cache` — if using cache APIs directly

7. **Remove Newtonsoft.Json** (if only used transitively via CMS):
   ```shell
   dotnet remove package Newtonsoft.Json
   ```

8. **Verify nuget.config** — ensure the Optimizely NuGet feed is
   configured. Required for resolving CMS 13 packages.

### Step 4: Handle Incompatible Packages

See `references/third-party-compatibility.md` for the complete list.

**Before upgrading core CMS packages**, address incompatible packages
to avoid cascading build failures.

1. **Remove incompatible packages with no CMS 13 version**:
   ```shell
   dotnet remove package EPiServer.Find.Cms
   dotnet remove package EPiServer.ContentDeliveryApi.Cms
   dotnet remove package EPiServer.ContentManagementApi
   dotnet remove package EPiServer.ContentDefinitionsApi
   dotnet remove package EPiServer.Marketing.Testing
   dotnet remove package Advanced.CMS.AdvancedReviews
   dotnet remove package Geta.NotFoundHandler.Optimizely
   dotnet remove package Geta.Optimizely.Sitemaps
   dotnet remove package Geta.Optimizely.GenericLinks
   dotnet remove package Geta.Optimizely.ContentTypeIcons
   dotnet remove package Geta.Optimizely.Categories
   dotnet remove package Stott.Optimizely.RobotsHandler
   ```
   Also remove all `EPiServer.MarketingAutomationIntegration.*` and
   `EPiServer.Labs.*` packages.

2. **Remove service registrations** for removed packages from
   `Startup.cs` / `Program.cs` (e.g., `services.AddFind()`,
   `services.AddContentDeliveryApi()`, `services.AddContentManagementApi()`,
   `services.AddNotFoundHandler()`, `services.AddAdvancedReviews()`,
   `services.AddMarketingTesting()`)

3. **Replace packages with alternatives**:
   - `EPiServer.Cms.WelcomeIntegration.UI` → `EPiServer.Cms.DamIntegration.UI`
     **DAM integration caveat**: At the time of writing, there is no
     migration path for customers using DAM integration in CMS 12. Check
     the [Optimizely documentation](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/upgrade-to-cms-13#pre-upgrade-audit-and-prepare)
     for the latest state.
   - `EPiServer.Find.Cms` → Optimizely Graph (see `optimizely-find-to-graph` skill)
   - `EPiServer.ContentDeliveryApi.*` → Optimizely Graph (install
     `Optimizely.Graph.Cms` + `Optimizely.Graph.Cms.Query`, register with
     `services.AddContentGraph()` + `services.AddGraphContentClient()`,
     rewrite delivery endpoints using `IGraphContentClient.QueryContent<T>()`)

4. **Upgrade compatible packages** (verify CMS 13 version availability first):
   ```shell
   dotnet add package EPiServer.Forms --version 6.*
   dotnet add package Gulla.Episerver.SqlStudio --version 3.0.2
   ```

5. **Add explicit Newtonsoft.Json** if other code depends on it and the
   transitive dependency through Find is gone:
   ```shell
   dotnet add package Newtonsoft.Json
   ```

### Step 5: Fix Breaking API Changes

See `references/breaking-changes-dotnet.md` for the complete list. The
most common changes:

**PageReference → ContentReference**:
```csharp
// Before (CMS 12)
PageReference parentLink = currentPage.ParentLink;
PageReference startPage = PageReference.StartPage;

// After (CMS 13)
ContentReference parentLink = currentPage.ParentLink;
ContentReference startPage = ContentReference.StartPage;
```
Detection: Search for `PageReference`

**SiteDefinition → Application**:
```csharp
// Before (CMS 12)
var site = _siteDefinitionResolver.GetByHostname(hostname);

// After (CMS 13)
var app = _applicationResolver.GetByHostname(hostname);
```
Detection: Search for `SiteDefinition`, `ISiteDefinitionRepository`,
`ISiteDefinitionResolver`

**ContentArea no longer inherits XhtmlString**:
```csharp
// Before (CMS 12) — these methods existed
var html = contentArea.ToHtmlString();
var items = contentArea.FilteredItems;

// After (CMS 13) — use Items directly
var items = contentArea.Items;
// Render using HTML Helper or Tag Helper
```
Detection: Search for `ContentArea.ToHtmlString`, `FilteredItems`

**Argument validation changes**:
```csharp
// Before (CMS 12): threw ArgumentNullException for empty string
// After (CMS 13): throws ArgumentException for empty string
// Update any catch blocks or test assertions accordingly
```

**Serialization: Newtonsoft.Json → System.Text.Json**:
```csharp
// Before (CMS 12)
services.AddCms().UseNewtonsoftJson();

// After (CMS 13) — System.Text.Json is default, remove UseNewtonsoftJson
services.AddCms();
```
Detection: Search for `UseNewtonsoftJson`, `NewtonsoftJsonSerializerSettingsOptions`

**ServiceLocator.Current → Constructor Injection** (antipattern, not removed):
`ServiceLocator.Current` still works in CMS 13 but is an antipattern
that is not recommended. Migrate to constructor injection:
```csharp
// Before (CMS 12)
var repo = ServiceLocator.Current.GetInstance<IContentRepository>();

// After (CMS 13) — inject via constructor (recommended)
public class MyService
{
    private readonly IContentRepository _repo;
    public MyService(IContentRepository repo) { _repo = repo; }
}
```
Detection: Search for `ServiceLocator.Current`, `ServiceLocationHelper`

**IConfigurableModule → Startup.ConfigureServices()**:
```csharp
// Before (CMS 12)
public class MyModule : IConfigurableModule
{
    public void ConfigureContainer(ServiceConfigurationContext context)
    {
        context.Services.AddSingleton<IMyService, MyService>();
    }
}

// After (CMS 13) — register in Startup.cs
services.AddSingleton<IMyService, MyService>();
```
Detection: Search for `IConfigurableModule`, `ConfigureContainer`,
`ServiceConfigurationContext`

**BlockTypeRepository / PageTypeRepository → IContentTypeRepository**:
```csharp
// Before (CMS 12)
var blockType = _blockTypeRepo.Load("TeaserBlock");
var pageType = _pageTypeRepo.Load("ArticlePage");

// After (CMS 13)
var blockType = _contentTypeRepo.Load("TeaserBlock");
var pageType = _contentTypeRepo.Load("ArticlePage");
```
Detection: Search for `BlockTypeRepository`, `PageTypeRepository`

**IContentRouteEvents → IContentUrlGeneratorEvents /
IContentUrlResolverEvents**:
```csharp
// Before (CMS 12)
_routeEvents.CreatingVirtualPath += OnCreatingPath;
_routeEvents.RoutedContent += OnRoutedContent;

// After (CMS 13)
_urlGeneratorEvents.GeneratingUrl += OnGeneratingUrl;
_urlResolverEvents.ResolvedUrl += OnResolvedUrl;
```
Detection: Search for `IContentRouteEvents`, `CreatingVirtualPath`,
`RoutedContent`

**Injected<T> → Constructor Injection**:
```csharp
// Before (CMS 12)
public class MyController : PageController<StandardPage>
{
    private Injected<IContentRepository> _repo;
    public ActionResult Index(StandardPage page)
    {
        var content = _repo.Service.Get<PageData>(page.ContentLink);
        return View(content);
    }
}

// After (CMS 13) — inject via constructor
public class MyController : PageController<StandardPage>
{
    private readonly IContentRepository _repo;
    public MyController(IContentRepository repo) { _repo = repo; }
    public ActionResult Index(StandardPage page)
    {
        var content = _repo.Get<PageData>(page.ContentLink);
        return View(content);
    }
}
```
Detection: Search for `Injected<`, `_injected`, `.Service`

**[DojoWidget] → [CriterionPropertyEditor]** (Visitor Group criteria):
```csharp
// Before (CMS 12)
[DojoWidget("myapp/editors/CustomCriterionEditor")]
public string EditorValue { get; set; }

// After (CMS 13)
[CriterionPropertyEditor("myapp/editors/CustomCriterionEditor")]
public string EditorValue { get; set; }
```
Detection: Search for `DojoWidget`

**Tab names must be alphanumeric only**:
```csharp
// Before (CMS 12) — spaces and special characters were allowed
[Display(GroupName = "SEO Settings")]
public virtual string MetaTitle { get; set; }

// After (CMS 13) — only letters and digits
[Display(GroupName = "SEOSettings")]
public virtual string MetaTitle { get; set; }
```
Detection: Search for `GroupName` and check values against `[A-Za-z0-9]`

### Step 6: Handle Removed Features

See `references/removed-features.md` for detailed guidance on each.

1. **Dynamic Properties**: Completely removed. Replace with regular
   content properties on shared base types or settings content types
   loaded via DI. Search for: `DynamicProperty`, `EnableDynamicProperties`

2. **PlugIn System**: Completely removed. Replace `PlugInAttribute` usage
   with standard DI registration. Scheduled jobs: replace
   `ScheduledPlugInAttribute` with `ScheduledJobAttribute` and inherit
   from `ScheduledJobBase`. Search for: `PlugInAttribute`, `EPiServer.PlugIn`

3. **Mirroring**: Completely removed. Use Content Transfer API or
   third-party deployment tools. Search for: `MirroringImporting`

4. **Telemetry**: Completely removed. Remove `using
   EPiServer.Shell.Telemetry` and any `services.Configure<TelemetryOptions>()`
   calls. Search for: `TelemetryOptions`, `EPiServer.Shell.Telemetry`

### Step 7: Update Service Registration

**CRITICAL**: Service registration namespace changed.

```csharp
// Before (CMS 12)
using Microsoft.Extensions.DependencyInjection;
// Extension methods were in this namespace

// After (CMS 13)
using EPiServer.DependencyInjection;
// Extension methods moved here
```

Detection: Search for `AddCms` method calls — if they don't compile,
add `using EPiServer.DependencyInjection;`

**Visitor Groups explicit registration** (CRITICAL if using Visitor Groups):
```csharp
// CMS 13 — must add explicitly
services.AddVisitorGroupsMvc();
services.AddVisitorGroupsUI();
```

**Validators explicit registration**:
```csharp
// CMS 13 — IValidate<T> implementations no longer auto-registered
services.AddCmsValidator<MyCustomValidator>();
```

**IConfigurableModule removal** (CRITICAL if using custom modules):
```csharp
// CMS 13 — IConfigurableModule is removed
// Move all service registration from ConfigureContainer() to
// Startup.ConfigureServices() or Program.cs
services.AddSingleton<IMyService, MyService>();
```

**ServiceLocator antipattern**:
```csharp
// CMS 13 — ServiceLocator.Current still works but is an antipattern; use constructor injection
// Replace all service locator usage with constructor injection
// Search for: ServiceLocator.Current, ServiceLocationHelper
```

**Localization provider for /lang folder**:
```csharp
// CMS 13 — /lang folder no longer auto-registered
services.AddXmlLocalizationProvider(options =>
{
    options.Paths.Add("lang");
});
```

### Step 8: Update Configuration

1. **UI URL changed** — the new path depends on auth configuration:
   - **DXP with Opti ID**: `/ui/CMS`
   - **Self-hosted (ASP.NET Identity)**: `/Optimizely/CMS`
   - The old `/EPiServer` path no longer works in either mode
   - Update bookmarks, admin links, documentation
   - Search for: `/EPiServer/` in config files and code
   - Module paths also changed:
     - `/EPiServer/EPiServer.Cms.UI.Admin/` → `/Optimizely/Settings/`
     - `/EPiServer/EPiServer.Cms.UI.Settings/` → `/Optimizely/Profile/`
     - `/EPiServer/EPiServer.Cms.UI.VisitorGroups/` →
       `/Optimizely/VisitorGroups/`
     - `/EPiServer/EPiServer.Cms.Forms.UI/` → `/Optimizely/Forms/`

2. **HTML parsing security defaults tightened**:
   - Loading mode: `ScriptParserMode.Remove` (illegal elements removed)
   - Saving mode: `ScriptParserMode.ThrowException`
   - New media upload parsing for `.svg`, `.svgz`, `.html`, `.htm`
   - If your content contains HTML that was previously allowed, it may
     be stripped or cause save errors

3. **Routing changes**:
   ```csharp
   // Before (CMS 12)
   var remaining = context.RemainingPath;
   var segment = context.GetNextRemainingSegment();
   options.ConfigureForExternalTemplates();

   // After (CMS 13)
   var remaining = context.RemainingSegments;
   var segment = context.GetNextSegment();
   templateOptions.ConfigureForExternalTemplates();
   ```

4. **Content type name validation** (auto-handled during upgrade):
   - Names must be 2-255 chars, match `^[A-Za-z][_0-9A-Za-z]+`
   - Invalid names auto-migrated: single char → prefixed (`CT_`, `PD_`,
     `G_`, `PDT_`), invalid chars → `_`
   - **IMPORTANT**: Update any code that references content types by
     string name if those names were auto-migrated

### Step 9: JS/TS SDK Updates (if applicable)

**Skip this step if your project does not use @optimizely/cms-sdk.**

See `references/breaking-changes-sdk.md` for detailed guidance.

1. **Detect framework**: Check for Next.js (App Router or Pages Router)
   or TanStack Start.

2. **Verify content type names**: Run `npx opti-cms config verify` to
   check if any content type names were auto-migrated and no longer match
   your TypeScript definitions.

3. **Update preview routes**: Change CMS UI URL references from
   `/EPiServer` to `/Optimizely` in preview route handlers.

4. **Re-sync registry**: Run `npx opti-cms config push` to synchronize
   content type definitions.

5. **Test GraphQL queries**: Verify queries return expected data,
   especially for ContentArea properties and block types.

### Step 10: Graph/Headless Frontend Validation

**Skip this step if the pre-migration assessment showed Frontend: None.**

After completing the code migration (Steps 2–9), validate your headless
frontend against the CMS 13 schema before cutting over to production.

1. **Schema diff** — compare the CMS 12 and CMS 13 Graph schemas to
   identify breaking changes. See `references/breaking-changes-sdk.md`
   for the full list. Key schema changes:
   - **Content type name auto-migration**: Names that were single
     characters or contained invalid characters are prefixed (`CT_` for
     content types, `PD_` for property definitions, `G_` for groups,
     `PDT_` for property data types) or have invalid characters replaced
     with `_`
   - **Property name corrections**: Single-character property names get
     `PD_` prefix; invalid characters become `_`
   - **ContentArea schema restructuring**: ContentArea no longer inherits
     XhtmlString on the server side; inline content fragments may be
     structured differently in the GraphQL response
   - **Block type resolution changes**: CMS 13 uses a common
     PropertyDefinitionType for all blocks (DataType "Block") instead of
     per-block-type definitions, affecting `__typename` discriminators

2. **Frontend query audit** — scan the frontend codebase for GraphQL
   queries that reference changed type or field names:
   - Search for content type names that were single characters or
     contained special characters (these were auto-migrated with prefixes)
   - Search for property names that were corrected (single-char or
     invalid-char names)
   - Check ContentArea fragment expansions for structural changes
   - Check `__typename` discriminators to verify they still resolve
     correctly with the new block type resolution

   Detection:
   ```shell
   # In the frontend codebase, search for GraphQL queries
   grep -r "query\|fragment\|__typename" --include="*.ts" --include="*.tsx" --include="*.graphql" .
   ```

3. **Staged verification** — deploy CMS 13 to a staging environment and
   validate the frontend end-to-end:
   - Point the frontend at the CMS 13 staging instance's Graph endpoint
   - Run the frontend test suite against the new schema
   - Manually verify critical content pages render correctly
   - Check that search queries return expected results
   - Your CMS 12 instance continues serving production traffic. Do not
     cut over until all verification passes.

   If broken queries are discovered, fix them in the frontend codebase
   and re-run verification. There is no time pressure — CMS 12 remains
   running and serving production until you explicitly cut over.

4. **SearchIndexer ACL for Graph indexing** (CMS 13.3.0+) — CMS 13.3.0
   enforces `SearchIndexer` Read permission during Graph indexing. Content
   without this permission is silently excluded from Graph. The CMS 13
   database upgrade script (`13.0.13.sql`) only grants `SearchIndexer` on
   the Root content (ID 1). Content that inherits ACL from Root picks up
   `SearchIndexer` automatically, but content with custom ACL (broken
   inheritance) does not — and the entire subtree under it is excluded.

   This can cause massive content loss from Graph after migration. For
   example, a site start page with custom permissions causes every page
   under it to disappear from Graph, while blocks and settings (which
   inherit from Root) remain indexed.

   **Do NOT execute these SQL scripts automatically.** Present them to
   the developer for review and manual execution against the CMS database.

   **Diagnostic** — run this query to see how many content items are
   affected:
   ```sql
   -- Count content with custom ACL missing SearchIndexer
   SELECT
       COUNT(DISTINCT ca.fkContentID) AS TotalContentWithCustomACL,
       COUNT(DISTINCT ca.fkContentID)
         - COUNT(DISTINCT si.fkContentID) AS MissingSearchIndexer
   FROM tblContentAccess ca
   INNER JOIN tblContent c ON c.pkID = ca.fkContentID
   LEFT JOIN tblContentAccess si
       ON si.fkContentID = ca.fkContentID
       AND si.Name = 'SearchIndexer'
   WHERE c.Deleted = 0;
   ```

   **Option A — Conservative**: Add `SearchIndexer` only where `Everyone`
   already has Read access. Avoids indexing intentionally restricted
   content:
   ```sql
   BEGIN TRANSACTION;

   INSERT INTO tblContentAccess (fkContentID, Name, IsRole, AccessMask)
   SELECT ca.fkContentID, 'SearchIndexer', 1, 1
   FROM tblContentAccess ca
   WHERE ca.Name = 'Everyone'
     AND ca.IsRole = 1
     AND (ca.AccessMask & 1) = 1
     AND NOT EXISTS (
       SELECT 1 FROM tblContentAccess si
       WHERE si.fkContentID = ca.fkContentID
         AND si.Name = 'SearchIndexer'
     );

   SELECT @@ROWCOUNT AS RowsInserted;
   -- Review results, then: COMMIT TRANSACTION;
   -- Or to undo: ROLLBACK TRANSACTION;
   ```

   **Option B — Broad**: Add `SearchIndexer` to all content with custom
   ACL. Restores pre-13.3.0 indexing behavior. Safe because Graph's
   `_rbac` field still controls query-time access — adding `SearchIndexer`
   does not expose content to unauthorized users:
   ```sql
   BEGIN TRANSACTION;

   INSERT INTO tblContentAccess (fkContentID, Name, IsRole, AccessMask)
   SELECT DISTINCT ca.fkContentID, 'SearchIndexer', 1, 1
   FROM tblContentAccess ca
   INNER JOIN tblContent c ON c.pkID = ca.fkContentID
   WHERE c.Deleted = 0
     AND NOT EXISTS (
       SELECT 1 FROM tblContentAccess si
       WHERE si.fkContentID = ca.fkContentID
         AND si.Name = 'SearchIndexer'
     );

   SELECT @@ROWCOUNT AS RowsInserted;
   -- Review results, then: COMMIT TRANSACTION;
   -- Or to undo: ROLLBACK TRANSACTION;
   ```

   **Content assets** (media/blocks owned by a page) inherit security
   from their owner page via `ContentAssetFolder` delegation. Fixing the
   owner page's ACL automatically fixes its content assets — no separate
   rows needed.

   After running the SQL script, perform a Graph account reset and full
   reindex, or run Smooth Rebuild to pick up the changes.

CRITICAL: Do not cut over to CMS 13 production until staged verification
passes and all frontend queries return expected data.

### Step 11: Verify Migration

1. **CRITICAL — Back up the database before first CMS 13 startup**:
   The CMS 13 database migration runs automatically on first startup
   and is **irreversible**. Once it completes, the database cannot be
   used with CMS 12 again. Take a full backup before starting:
   ```sql
   BACKUP DATABASE [YourCmsDatabase]
   TO DISK = 'C:\Backups\CmsDatabase_PreCMS13.bak'
   WITH INIT, COMPRESSION;
   ```
   If using Azure SQL, create a database copy or point-in-time restore
   point.

   **BLOCKING**: Stop here and ask the user to confirm the backup is
   complete before proceeding. Do not continue to the next item until
   the user explicitly confirms.

2. **Database prerequisites** (before first CMS 13 startup):
   - CMS 13 may create or alter database indexes on first startup.
     Conflicting indexes from CMS 12 may cause errors. If startup fails
     with index-related SQL errors, drop the conflicting indexes manually
     and restart.
   - Clean orphaned scheduled jobs from removed add-ons (Settings >
     Scheduled Jobs in admin UI after successful startup).
   - Clean orphaned content types from removed packages. Add stub classes
     or delete from database to prevent "could not create instance" errors.

3. **Build check**:
   ```shell
   dotnet build
   ```
   Fix any remaining compilation errors. Most will be straightforward
   type/namespace changes documented in the references.

4. **Runtime smoke test**:
   - Start the application
   - Access CMS admin: `/ui/CMS` (DXP with Opti ID) or
     `/Optimizely/CMS` (self-hosted with ASP.NET Identity) — the old
     `/EPiServer` path no longer works
   - Create or edit a page — verify save works
   - Check scheduled jobs run correctly
   - Verify Visitor Groups work (if used and registered)
   - Test content with ContentArea properties renders correctly
   - Verify HTML content saves without ScriptParser exceptions

5. **If using JS/TS SDK**:
   ```shell
   npx tsc --noEmit
   ```
   Verify TypeScript compilation and test content rendering in the frontend.

CRITICAL: Do not report migration complete until `dotnet build` succeeds
and the runtime smoke test passes.

## Common Pitfalls

1. **Visitor Groups silently stop working** — Forgot to add
   `.AddVisitorGroupsMvc()` and `.AddVisitorGroupsUI()`. Groups exist
   but criteria never evaluate.

2. **Content saves throw InvalidPropertyValueException** — HTML parsing
   defaults tightened. Content with inline scripts or event handlers is
   rejected. Review ScriptParserOptions or clean the HTML content.

3. **PageReference compilation errors everywhere** — Systematic rename
   needed. Use find-and-replace but watch for custom PageReference
   subclasses or extension methods.

4. **Scheduled jobs don't appear** — ScheduledPlugInAttribute changed
   base class. Ensure jobs inherit ScheduledJobBase.

5. **Castle.Windsor missing at runtime** — Add explicit Castle.Windsor
   package reference if your code uses it directly.

6. **Newtonsoft.Json serialization failures** — CMS uses System.Text.Json.
   Custom JSON converters or formatting may need rewriting.

7. **Content type names auto-migrated** — Single-char names get prefixes.
   String-based content type lookups fail silently with empty results.

8. **IPropertyDefinitionRepository.Save won't compile** — Must modify
   ContentType.PropertyDefinitions collection then save the ContentType.

9. **Admin panel at /EPiServer returns 404** — URL depends on auth
   mode: `/ui/CMS` (DXP with Opti ID) or `/Optimizely/CMS`
   (self-hosted with ASP.NET Identity).

10. **Dynamic Properties code won't compile** — Feature completely
    removed. No drop-in replacement; requires redesign.

11. **IConfigurableModule won't compile** — Interface removed in CMS 13.
    Move all service registration from `ConfigureContainer()` to
    `Startup.ConfigureServices()` or `Program.cs`. Search for
    `IConfigurableModule` and `ServiceConfigurationContext`.

12. **Incompatible packages cause TypeLoadException at runtime** —
    Packages like Geta.NotFoundHandler, Geta.Optimizely.Sitemaps, and
    Advanced.CMS.AdvancedReviews reference types that changed access
    modifiers or were removed. Remove incompatible packages before
    upgrading CMS. See `references/third-party-compatibility.md`.

13. **EPiServer.Find has no CMS 13 version** — Search & Navigation must
    be completely removed. All `AddFind()` registrations, `SearchClient`
    usage, and Find-dependent code must be removed or migrated to
    Optimizely Graph. See the `optimizely-find-to-graph` skill.

14. **ServiceLocator.Current is an antipattern** — `ServiceLocator.Current`
    still works in CMS 13 but is not recommended and may be removed in
    future versions. Replace with constructor injection throughout.

15. **Spelling corrections cause compilation errors** — CMS 13 fixes
    misspelled API names (e.g., `GetDescendents` → `GetDescendants`,
    `includeDecendents` → `includeDescendants`). These appear as
    confusing "method not found" errors. See
    `references/breaking-changes-dotnet.md` section 14.

16. **Localization files in /lang not loaded** — CMS 13 no longer
    auto-registers the `/lang` folder localization provider. Add
    `services.AddXmlLocalizationProvider()` explicitly.

17. **Copy() no longer publishes content** — `IContentRepository.Copy()`
    creates a draft in CMS 13 instead of auto-publishing. Explicitly
    call `Save(content, SaveAction.Publish)` after copying if published
    state is needed.

18. **Preview tokens no longer carry content reference** —
    `PreviewToken.ContentReference` is removed. Frontend preview route
    handlers that validate content from the token must be updated.

19. **Injected<T> won't compile** — The `Injected<T>` property injection
    pattern is removed. Replace all `Injected<IService>` properties with
    constructor-injected fields. Search for `Injected<`.

20. **Docker images use wrong .NET version** — Docker base images must be
    updated from `dotnet/sdk:8.0` and `dotnet/aspnet:8.0` to their 10.0
    equivalents. Search for `dotnet/sdk:8` and `dotnet/aspnet:8` in
    Dockerfiles.

21. **EPiServer.CMS.UI.AspNetIdentity missing** — This package was
    transitive in CMS 12 via the metapackage but is now separate. If
    using ASP.NET Identity, add an explicit package reference.

22. **Content Delivery API not compatible** — `EPiServer.ContentDeliveryApi`
    and related API packages have no CMS 13 version. Remove before
    upgrading.

23. **Database index conflicts on first startup** — CMS 13 may fail to
    start if conflicting indexes exist from CMS 12. Drop conflicting
    indexes manually if startup fails with SQL errors.

24. **ClientEditorAttribute JSON rejected** — `EditorConfiguration` now
    requires strict RFC 8259 JSON. Single-quoted keys, unquoted keys, and
    trailing commas are no longer accepted.

25. **Telemetry configuration won't compile** —
    `services.Configure<TelemetryOptions>()` and `using
    EPiServer.Shell.Telemetry` must be removed. Telemetry is entirely
    removed in CMS 13.

26. **Database migration is irreversible without backup** — CMS 13
    runs a one-way database migration on first startup. If something
    goes wrong, the database cannot be reverted to CMS 12 without a
    backup. Always take a full database backup before the first CMS 13
    startup. See Step 11, item 1.

28. **Tab names with spaces or special characters cause runtime errors**
    — CMS 13 enforces alphanumeric-only tab names. Content types with
    `[Display(GroupName = "SEO Settings")]` or similar will fail at
    runtime. Rename to alphanumeric only (e.g., `"SEOSettings"`). See
    Step 5.

29. **Graph schema breaks live frontend after in-place upgrade** —
    CMS 13 auto-migrates content type names and corrects property names,
    changing the GraphQL schema. Headless frontends querying the old
    schema get empty results or errors. Use the side-by-side approach:
    migrate on a branch, validate frontend against staging CMS 13, then
    cut over. See Step 10.

30. **Graph full sync silently excludes most content after migration**
    (CMS 13.3.0+) — The Graph indexer enforces `SearchIndexer` Read
    permission, but the upgrade script only grants it on Root (content
    ID 1). Any content with custom ACL (broken inheritance from Root) —
    typically site start pages and landing pages — is silently excluded
    along with its entire subtree. The sync job reports success with a
    dramatically lower item count and no explanation. Front-end search
    returns zero results. Run the diagnostic query in Step 10 item 4 to
    check, then apply one of the SQL fix options. **Do not execute
    these scripts automatically** — present them to the developer for
    review.

## Related Skills

- **cms11-to-12-migration** — Migrate from CMS 11 to CMS 12 (ASP.NET
  Framework to ASP.NET Core — the prerequisite migration before CMS 13)
- **find-to-graph** — Migrate EPiServer Find search queries to Graph SDK
  (required when CMS 12 project uses Find)
- **optimizely-setup** — Set up the Optimizely CMS SDK from scratch
  (useful after migration for new SDK consumers)
- **optimizely-model** — Model content types and properties (useful for
  updating content type definitions after migration)
- **content-fetching** — Fetch content from CMS (verify data fetching
  works after migration)
- **setup-live-preview** — Set up live preview (re-verify after migration
  due to preview token and URL changes)
