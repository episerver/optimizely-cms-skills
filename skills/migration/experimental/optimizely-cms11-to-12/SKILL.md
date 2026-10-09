---
name: optimizely-cms11-to-12
description: >-
  This skill should be used when the user asks to "migrate from CMS 11
  to CMS 12", "upgrade to CMS 12", "upgrade Optimizely to ASP.NET Core",
  "migrate from ASP.NET Framework to ASP.NET Core", "CMS 12 migration",
  "StructureMap not found after upgrade", "web.config to appsettings.json",
  "IInitializableHttpModule not found", "BlockController not found",
  "GuiPlugIn attribute not found", "routing broken after CMS upgrade",
  "migrate EPiServer to .NET Core", "VirtualPathProvider not working",
  "Log4Net removed after upgrade", "Membership provider not working",
  "upgrade EPiServer packages to CMS 12", "what changed between CMS 11
  and 12", "CMS 12 breaking changes", "pre-migration assessment CMS 11",
  "ImageResizer not compatible", "WebForms to MVC migration", "XForms
  removed", "Dynamic Content removed", "CMS 11 to ASP.NET Core",
  "Upgrade Assistant for Optimizely", or mentions any Optimizely CMS
  version migration scenario from CMS 11 to CMS 12.
---

# Migrate Optimizely CMS 11 to 12

Guide the user through migrating an Optimizely CMS 11 project (ASP.NET
Framework 4.x) to CMS 12 (ASP.NET Core / .NET 6+), covering the Upgrade
Assistant tool, NuGet package updates, dependency injection migration,
configuration migration, routing changes, breaking API changes, removed
features, authentication updates, and verification.

**CRITICAL**: This migration involves a complete platform shift from
ASP.NET Framework to ASP.NET Core. No data migration is required — the
database schema is unchanged — but significant code changes are needed.

## When to Use This Skill

- User wants to migrate/upgrade from Optimizely CMS 11 to CMS 12
- User encounters compilation errors after updating CMS packages to 12.x
- User asks about breaking changes between CMS 11 and CMS 12
- User reports features stopped working after CMS upgrade (WebForms,
  routing, DI, logging, authentication)
- User wants a pre-migration assessment before starting the upgrade
- User asks about specific API changes (BlockController, StructureMap,
  VirtualPathProvider, IInitializableHttpModule)
- User needs to migrate web.config to appsettings.json
- User gets runtime errors from third-party packages after upgrade
  (ImageResizer, Log4Net, StructureMap)
- User asks about third-party package compatibility with CMS 12
- User needs to migrate from ASP.NET Framework to ASP.NET Core

## Steps

### Step 1: Assess Current Project

Before making changes, scan the project to understand migration scope.

1. **Detect CMS version** — check `.csproj` files for EPiServer package
   versions:
   ```shell
   grep -r "EPiServer\|Optimizely" --include="*.csproj" .
   ```

2. **Check .NET version** — read `TargetFramework`:
   ```shell
   grep -r "TargetFramework" --include="*.csproj" .
   ```
   CMS 11 targets .NET Framework 4.61+. CMS 12 targets .NET 5+ (.NET 6+
   recommended).

3. **Scan for removed features** — search for features removed in CMS 12:
   - `.aspx`, `WebForm`, `DefaultWebFormTemplate` — WebForms (removed)
   - `EPiServer.XForms` — XForms (removed, use Optimizely Forms)
   - `EPiServer.DynamicContent` — Dynamic Content (removed, use Blocks)
   - `MirroringImporting`, `MirroringExporting` — Mirroring (removed)
   - `IInitializableHttpModule` — HTTP modules (use middleware)
   - `GuiPlugIn`, `GuiPlugInAttribute` — Admin plugins (use menu providers)
   - `PagePlugIn`, `PagePlugInAttribute` — Page plugins (use middleware)
   - `VirtualPathNonUnifiedProvider` — VPP (use IFileProvider)
   - `UrlRewriteProvider` — URL rewrites (use ASP.NET Core routing)
   - `MediaHandlerBase`, `StaticFileHandler`, `BlobHttpHandler` — Handlers

   See `references/removed-features.md` for the complete list.

4. **Scan for high-impact API changes**:
   - `StructureMap` — DI framework removed; use built-in DI
   - `Log4Net`, `EPiServer.Logging.Log4Net` — logging replaced
   - `BlockController<`, `PartialContentController<` — use ViewComponents
   - `ServiceLocator.Current` — still available but patterns differ
   - `web.config` — must migrate to appsettings.json

   See `references/breaking-changes-dotnet.md` for all changes.

5. **Scan for third-party packages** with known incompatibilities:
   - `ImageResizer` — not compatible; use ImageSharp
   - Custom `VirtualPathProvider` implementations
   - WCF-dependent add-ons

   See `references/third-party-compatibility.md` for the complete list.

6. **Categorize migration effort**:
   - **Minimal**: Standard MVC project, no WebForms, no removed features,
     standard packages. Still moderate work due to platform shift.
   - **Moderate**: Uses custom DI/logging, partial routers, some
     third-party packages requiring updates.
   - **Significant**: WebForms pages, XForms, Dynamic Content, custom VPP,
     GuiPlugIn/PagePlugIn, heavy StructureMap customization.

### Step 2: Run the Upgrade Assistant

The Microsoft Upgrade Assistant automates initial conversion:

```shell
dotnet tool install -g upgrade-assistant
upgrade-assistant upgrade [projectName].csproj
```

**What the tool does**:
1. Creates backup of solution
2. Converts to SDK-style project files (try-convert)
3. Removes transitive NuGet dependencies
4. Re-targets project to .NET 6
5. Updates NuGet packages to ASP.NET Core compatible versions
6. Adds template files (Program.cs, Startup.cs, appsettings.json)
7. Migrates app config files (web.config → appsettings.json)
8. Updates source code (removes/adds namespaces)

**IMPORTANT**: The tool will NOT result in a fully buildable solution.
Manual fixes (Steps 3–9) are required after running the assistant.

### Step 3: Update NuGet Packages

Update packages per the mapping in `references/package-mapping.md`.

Key changes:
- `EPiServer.Cms.AspNet` → split into `EPiServer.CMS.AspNetCore.*`
  packages (HtmlHelpers is the top-level package)
- `EPiServer.Framework.AspNet` → `EPiServer.Framework.AspNetCore`
- **Remove** `EPiServer.ServiceLocation.StructureMap` (built-in DI)
- **Remove** `EPiServer.Logging.Log4Net` (.NET Core logging)

### Step 4: Migrate Dependency Injection

CMS 11 used StructureMap or custom DI containers. CMS 12 uses ASP.NET
Core's built-in DI exclusively.

**Before (CMS 11 — StructureMap)**:
```csharp
public class DependencyConfig : StructureMap.Registry
{
    public DependencyConfig()
    {
        For<IMyService>().Use<MyService>().HttpContextScoped();
    }
}
```

**After (CMS 12 — Built-in DI)**:
```csharp
// In Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddCmsAspNetCore();
    services.AddScoped<IMyService, MyService>();
}
```

**Service lifetime mapping**: HttpContext → Scoped, Hybrid → Scoped,
Singleton → Singleton, Transient → Transient.

See `references/breaking-changes-dotnet.md` sections 1–3 for full details.

### Step 5: Migrate Configuration

Migrate web.config (XML) to appsettings.json (JSON).

See `references/configuration-migration.md` for the complete procedural
guide including connection strings, app settings, environment-specific
files, and _ViewImports.cshtml setup.

**CRITICAL for DXP**: Multiple Active Result Sets (MARS) must be disabled
in the connection string.

### Step 6: Migrate Routing

CMS 12 completely rewrites routing from ASP.NET routing to ASP.NET Core
endpoint routing.

Key changes:
- `RegisterPartialRouter()` → register `IPartialRouter` in DI
- `IContentRouteEvents` → `IContentUrlGeneratorEvents` +
  `IContentUrlResolverEvents`
- `Html.ActionLink()` → `Html.ContentLink()`
- `Html.BeginForm()` → `Html.BeginContentForm()`

**IMPORTANT**: User is NOT authenticated during routing in CMS 12.
Access checks happen post-routing. Request language is NOT set until
routing completes.

See `references/routing-migration.md` for complete API mapping and
before/after code.

### Step 7: Fix Breaking API Changes

Fix remaining code-level changes:

- `BlockController<T>` → `BlockComponent<T>`
- `PartialContentController<T>` → `PartialContentComponent<T>` /
  `AsyncPartialContentComponent<T>`
- `VirtualPathNonUnifiedProvider` → `MappingPhysicalFileProvider`
- HTTP handlers → middleware or custom endpoints
- Template selection: Preview tag no longer searched — add "Edit" tag
  to templates previously tagged only with "Preview"

See `references/breaking-changes-dotnet.md` for all 16 categories of
breaking changes with before/after code.

### Step 8: Handle Removed Features

Remove or replace features that no longer exist:

| Feature | Alternative |
|---------|-------------|
| WebForms (.aspx) | ASP.NET Core MVC / Razor |
| XForms | Optimizely Forms |
| Dynamic Content | Blocks (Content Areas) |
| Mirroring | No direct replacement |
| WCF Search (Lucene) | Optimizely Search & Navigation |
| WCF Event Provider | Azure Service Bus provider |
| HTTP Handlers | Middleware / endpoints |
| UrlRewriteProvider | ASP.NET Core routing |
| GuiPlugIn | Menu providers |
| PagePlugIn | Middleware / action filters |

See `references/removed-features.md` for detection patterns and
migration guidance for each feature.

### Step 9: Update Authentication & Security

- **Membership/Role Providers**: Not supported. Use ASP.NET Identity.
- **EPiServerProfile**: Not available. Use ASP.NET Identity claims.
- **PrincipalInfo.CurrentPrincipal**: Not available in scheduled jobs.
- **System.Threading.CurrentPrincipal**: Does not work as in CMS 11.
- **Authorization**: CMS 12 uses ASP.NET Core authorization policies.
  Shell modules use `CmsPolicyNames.DefaultShellModule`. Configure via
  `CmsPolicyOptions`.

See `references/breaking-changes-dotnet.md` sections 12–14.

### Step 10: Verify Migration

1. **Build check**:
   ```shell
   dotnet build
   ```
   Fix any remaining compilation errors.

2. **Runtime smoke test**:
   - Start the application
   - Navigate to CMS UI (typically `/episerver/cms`)
   - Verify content rendering on the frontend
   - Test content editing in the CMS editor
   - Check scheduled jobs execute without errors

3. **If verification fails**, check Common Pitfalls below and the
   relevant reference files for troubleshooting.

## Common Pitfalls

1. **StructureMap package not removed** — build errors referencing
   `EPiServer.ServiceLocation.StructureMap`. Remove the package and
   migrate all registrations to Startup.ConfigureServices().

2. **Log4Net references remaining** — build errors from
   `EPiServer.Logging.Log4Net`. Remove the package; configure logging
   via .NET Core APIs.

3. **web.config not fully migrated** — settings still in web.config not
   picked up. Move all settings to appsettings.json.

4. **Missing _ViewImports.cshtml** — Razor views fail with namespace
   errors. Create _ViewImports.cshtml with @using directives.

5. **Routing 404s** — content URLs return 404 after migration. Check
   partial router registration (must be in DI, not RouteTable.Routes),
   content route registration (IContentRouteRegister), and endpoint
   routing setup.

6. **Preview-tagged templates not found** — templates tagged only with
   "Preview" no longer render in edit mode. Add the "Edit" tag.

7. **VirtualPathProvider still referenced** — runtime errors from VPP
   code. Replace with IFileProvider / MappingPhysicalFileProvider.

8. **Membership providers not replaced** — authentication fails. Migrate
   to ASP.NET Identity.

9. **MARS not disabled on DXP** — database connection issues on DXP.
   Disable Multiple Active Result Sets in connection string.

10. **Visitor group DateTime not UTC** — visitor group criteria behave
    incorrectly. Convert DateTime values in database to UTC (affects
    TimeOfDayModel, NumberOfVisitsModel, TimePeriodModel, EventModel).

11. **ConfigureCmsDefaults() missing** — CMS not initialized. Ensure
    Program.cs calls `.ConfigureCmsDefaults()` on the host builder.

12. **ImageSharp not installed** — image processing fails on CMS 12.17+.
    Add `EPiServer.ImageLibrary.ImageSharp` package (v2.0.6+ recommended
    for ImageSharp v3).

13. **ServiceLocator.Current outside web request** — scope errors. Use
    `CreateServiceLocatorScope()` instead of `CreateScope()`.

14. **IInitializableHttpModule still used** — build errors. Replace with
    ASP.NET Core middleware.

15. **Authentication timing in routing** — access checks fail during
    routing. CMS 12 authenticates AFTER routing. Move access checks to
    authorization policies.

## Related Skills

- **cms12-to-13-migration** — for the subsequent migration from CMS 12
  to CMS 13 (covers .NET 10, further API removals)
- **optimizely-setup** — for setting up a new CMS 12 project from scratch
- **optimizely-model** — for creating content types in CMS 12
- **find-to-graph** — for migrating EPiServer Find to Optimizely Graph
