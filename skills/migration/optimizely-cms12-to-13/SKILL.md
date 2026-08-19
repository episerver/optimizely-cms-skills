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
  obsolete", "what changed between CMS 12 and 13", "CMS 13 breaking
  changes", "pre-migration assessment", "ServiceLocator.Current removed",
  "IConfigurableModule not found", "third-party package compatibility
  CMS 13", "EPiServer.Find not compatible with CMS 13",
  "TypeLoadException after CMS upgrade", or mentions any Optimizely CMS
  version migration scenario from CMS 12 to CMS 13.
---

# Migrate Optimizely CMS 12 to 13

Guide the user through migrating an Optimizely CMS 12 project to CMS 13,
covering .NET runtime upgrade, NuGet package updates, breaking API changes,
removed features, and JS/TS SDK consumer impacts.

## When to Use This Skill

- User wants to migrate/upgrade from Optimizely CMS 12 to CMS 13
- User encounters compilation errors after updating CMS packages
- User asks about breaking changes between CMS 12 and CMS 13
- User reports features stopped working after CMS upgrade (Visitor Groups,
  Dynamic Properties, PlugIn system)
- User wants a pre-migration assessment before starting the upgrade
- User asks about specific API changes (PageReference, SiteDefinition,
  ContentArea, XhtmlString)
- User needs to upgrade .NET version for CMS 13 compatibility
- User gets TypeLoadException or runtime errors after CMS 13 upgrade
  (third-party package incompatibilities)
- User asks about third-party package compatibility with CMS 13
- User encounters ServiceLocator.Current or IConfigurableModule errors

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
   - `.aspx`, `DefaultWebFormTemplate` — WebForms (removed)
   - `MirroringImporting`, `MirroringExporting` — Mirroring (removed)

4. **Scan for high-impact API changes**:
   - `PageReference` — must change to ContentReference
   - `SiteDefinition` — must change to Application
   - `Castle.Windsor` — dependency removed
   - `Newtonsoft.Json` — replaced with System.Text.Json
   - `ContentArea.ToHtmlString` — ContentArea no longer inherits XhtmlString
   - `ServiceLocator.Current` — removed; use constructor injection
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

5. **Scan for third-party packages** — check `.csproj` for packages with
   known CMS 13 incompatibilities:
   - `EPiServer.Find.Cms` — no CMS 13 version; must remove
   - `EPiServer.ContentDeliveryApi.*` — not compatible; must remove
   - `EPiServer.ContentManagementApi` — not compatible; must remove
   - `EPiServer.ContentDefinitionsApi` — not compatible; must remove
   - `EPiServer.Cms.WelcomeIntegration.UI` — replaced by
     `EPiServer.Cms.DamIntegration.UI`
   - `Geta.*` packages — most not compatible; must remove
   - `Advanced.CMS.AdvancedReviews` — not compatible; must remove
   - EPiServer Labs packages (BlockEnhancements, ContentManager,
     GridView, etc.) — not compatible; must remove
   - `EPiServer.Marketing.Testing` — not compatible; must remove
   - `EPiServer.MarketingAutomationIntegration.*` — not compatible; must remove
   - See `references/third-party-compatibility.md` for the complete list

6. **Scan for spelling corrections** — CMS 13 fixes misspellings in the
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

7. **Categorize migration effort**:
   - **Minimal**: Only runtime + package updates needed (no removed features,
     no deprecated API usage, no incompatible third-party packages)
   - **Moderate**: API changes required (PageReference, SiteDefinition, etc.)
     but no removed features
   - **Significant**: Uses removed features (Dynamic Properties, PlugIn
     system, WebForms) or has many incompatible third-party packages
     requiring removal and replacement

**If user only asked for assessment**: Stop here and report findings.
Do not proceed to migration steps.

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

### Step 4: Handle Third-Party Packages

See `references/third-party-compatibility.md` for the complete list.

**Before upgrading core CMS packages**, address incompatible third-party
packages to avoid cascading build failures.

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

**ServiceLocator.Current → Constructor Injection**:
```csharp
// Before (CMS 12)
var repo = ServiceLocator.Current.GetInstance<IContentRepository>();

// After (CMS 13) — inject via constructor
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

### Step 6: Handle Removed Features

See `references/removed-features.md` for detailed guidance on each.

1. **Dynamic Properties**: Completely removed. Replace with regular
   content properties on shared base types or settings content types
   loaded via DI. Search for: `DynamicProperty`, `EnableDynamicProperties`

2. **PlugIn System**: Completely removed. Replace `PlugInAttribute` usage
   with standard DI registration. Scheduled jobs: replace
   `ScheduledPlugInAttribute` with `ScheduledJobAttribute` and inherit
   from `ScheduledJobBase`. Search for: `PlugInAttribute`, `EPiServer.PlugIn`

3. **WebForms**: Completely removed. Migrate to ASP.NET Core MVC/Razor.
   Search for: `.aspx`, `DefaultWebFormTemplate`, `BlockController`

4. **Mirroring**: Completely removed. Use Content Transfer API or
   third-party deployment tools. Search for: `MirroringImporting`

5. **Telemetry**: Completely removed. Remove `using
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

**ServiceLocator removal**:
```csharp
// CMS 13 — ServiceLocator.Current is removed
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

1. **UI URL changed**: `/EPiServer` → `/Optimizely`
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

### Step 10: Verify Migration

1. **Database prerequisites** (before first CMS 13 startup):
   - CMS 13 may create or alter database indexes on first startup.
     Conflicting indexes from CMS 12 may cause errors. If startup fails
     with index-related SQL errors, drop the conflicting indexes manually
     and restart.
   - Clean orphaned scheduled jobs from removed add-ons (Settings >
     Scheduled Jobs in admin UI after successful startup).
   - Clean orphaned content types from removed packages. Add stub classes
     or delete from database to prevent "could not create instance" errors.

2. **Build check**:
   ```shell
   dotnet build
   ```
   Fix any remaining compilation errors. Most will be straightforward
   type/namespace changes documented in the references.

3. **Runtime smoke test**:
   - Start the application
   - Access CMS admin at `/Optimizely` (not `/EPiServer`)
   - Create or edit a page — verify save works
   - Check scheduled jobs run correctly
   - Verify Visitor Groups work (if used and registered)
   - Test content with ContentArea properties renders correctly
   - Verify HTML content saves without ScriptParser exceptions

4. **If using JS/TS SDK**:
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

9. **Admin panel at /EPiServer returns 404** — URL changed to
   `/Optimizely`.

10. **Dynamic Properties code won't compile** — Feature completely
    removed. No drop-in replacement; requires redesign.

11. **IConfigurableModule won't compile** — Interface removed in CMS 13.
    Move all service registration from `ConfigureContainer()` to
    `Startup.ConfigureServices()` or `Program.cs`. Search for
    `IConfigurableModule` and `ServiceConfigurationContext`.

12. **Third-party packages cause TypeLoadException at runtime** —
    Packages like Geta.NotFoundHandler, Geta.Optimizely.Sitemaps, and
    Advanced.CMS.AdvancedReviews reference types that changed access
    modifiers or were removed. Remove incompatible packages before
    upgrading CMS. See `references/third-party-compatibility.md`.

13. **EPiServer.Find has no CMS 13 version** — Search & Navigation must
    be completely removed. All `AddFind()` registrations, `SearchClient`
    usage, and Find-dependent code must be removed or migrated to
    Optimizely Graph. See the `optimizely-find-to-graph` skill.

14. **ServiceLocator.Current throws at runtime** — `IServiceLocator` and
    all `EPiServer.ServiceLocation` helper classes are removed. Replace
    with constructor injection throughout.

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
