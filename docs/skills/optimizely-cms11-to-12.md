# Optimizely CMS 11 to 12 Migration

Migrate an Optimizely CMS 11 project from ASP.NET Framework to CMS 12 on ASP.NET Core, covering the Upgrade Assistant, package updates, dependency injection, configuration, routing, removed features, and verification.

## When to Use

Use this skill when you want to:
- Migrate a CMS 11 project (ASP.NET Framework 4.x) to CMS 12 (ASP.NET Core / .NET 6+)
- Run a pre-migration assessment to understand the scope of work before starting
- Fix compilation errors after updating Optimizely packages to 12.x
- Replace StructureMap with ASP.NET Core built-in dependency injection
- Migrate `web.config` settings to `appsettings.json`
- Replace removed features like WebForms, XForms, or Dynamic Content
- Fix routing issues after the platform upgrade
- Update authentication from Membership providers to ASP.NET Identity
- Resolve third-party package incompatibilities (ImageResizer, Log4Net, etc.)

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate from CMS 11 to CMS 12"
- "Upgrade to CMS 12"
- "Upgrade Optimizely to ASP.NET Core"
- "Migrate from ASP.NET Framework to ASP.NET Core"
- "CMS 12 migration"
- "StructureMap not found after upgrade"
- "web.config to appsettings.json"
- "BlockController not found"
- "What changed between CMS 11 and 12"
- "Pre-migration assessment CMS 11"
- "Migrate EPiServer to .NET Core"

## Usage Example

```
You: "I want to migrate our CMS 11 project to CMS 12"

Agent: [Uses optimizely-cms11-to-12 skill]
- Scans .csproj files for current EPiServer package versions and .NET Framework target
- Searches for removed features (WebForms, XForms, Dynamic Content, Mirroring)
- Identifies high-impact API changes (StructureMap, BlockController, VirtualPathProvider)
- Checks third-party packages for known incompatibilities
- Categorizes migration effort as Minimal, Moderate, or Significant
- Walks through each migration step: Upgrade Assistant, NuGet updates, DI migration,
  configuration, routing, API fixes, removed features, and authentication
- Verifies the migration with a build check and runtime smoke test
```

```
You: "I'm getting StructureMap errors after upgrading to CMS 12"

Agent: [Uses optimizely-cms11-to-12 skill]
- Identifies that EPiServer.ServiceLocation.StructureMap must be removed
- Shows how to migrate registrations to Startup.ConfigureServices()
- Maps StructureMap lifetimes to ASP.NET Core DI lifetimes
  (HttpContextScoped becomes Scoped, Singleton stays Singleton)
```

## What It Handles

- **Pre-migration assessment** -- Scans the codebase and categorizes effort level before any changes are made
- **Upgrade Assistant** -- Runs the Microsoft Upgrade Assistant to automate initial project file conversion
- **NuGet package mapping** -- Maps old EPiServer.* packages to their CMS 12 equivalents
- **Dependency injection migration** -- Replaces StructureMap with ASP.NET Core built-in DI
- **Configuration migration** -- Converts web.config (XML) to appsettings.json (JSON)
- **Routing migration** -- Updates from ASP.NET routing to ASP.NET Core endpoint routing
- **Breaking API changes** -- Fixes 16 categories of API changes (BlockController, VPP, HTTP handlers, etc.)
- **Removed feature replacement** -- Guides replacement for WebForms, XForms, Dynamic Content, Mirroring, and more
- **Authentication update** -- Migrates from Membership providers to ASP.NET Identity
- **Verification** -- Build check and runtime smoke test to confirm successful migration

## Key Migration Highlights

| CMS 11 | CMS 12 |
|--------|--------|
| .NET Framework 4.61+ | .NET 6+ |
| StructureMap DI | Built-in ASP.NET Core DI |
| web.config | appsettings.json |
| BlockController | BlockComponent (ViewComponent) |
| VirtualPathProvider | IFileProvider |
| Membership providers | ASP.NET Identity |
| Log4Net | .NET Core logging |
| ImageResizer | ImageSharp |

## Important Notes

- **No data migration needed.** The database schema is unchanged between CMS 11 and 12. All changes are code-level.
- **The Upgrade Assistant does not produce a buildable solution.** Manual fixes are always required after running it.
- **DXP users** must disable Multiple Active Result Sets (MARS) in the connection string.
- The user is NOT authenticated during routing in CMS 12. Access checks happen after routing completes.

## Related Skills

- [`optimizely-cms12-to-13`](optimizely-cms12-to-13.md) -- The next migration step from CMS 12 to CMS 13
- [`optimizely-find-to-graph`](optimizely-find-to-graph.md) -- Migrate EPiServer Find to Optimizely Graph (often done alongside or after CMS upgrade)
