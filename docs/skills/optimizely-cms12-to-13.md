# Optimizely CMS 12 to 13 Migration

Migrate an Optimizely CMS 12 project to CMS 13, covering the .NET 10 runtime upgrade, NuGet package updates, breaking API changes, removed features, package compatibility, and JS/TS SDK updates.

## When to Use

Use this skill when you want to:
- Migrate a CMS 12 project to CMS 13
- Fix compilation errors after updating CMS packages to 13.x
- Replace removed APIs (PageReference, SiteDefinition, IConfigurableModule) and migrate antipatterns (ServiceLocator.Current)
- Handle removed features (Dynamic Properties, PlugIn system)
- Remove or replace incompatible packages — Optimizely (EPiServer.Find, Content Delivery/Management/Definitions APIs) and third-party (Geta.*, Advanced.CMS.*)
- Update the .NET runtime to .NET 10
- Fix TypeLoadException or runtime errors from package incompatibilities
- Update JS/TS SDK code after the CMS 13 upgrade

**For pre-migration assessment only** (effort estimation, scope analysis without code changes): use [`optimizely-cms12-to-13-assessment`](optimizely-cms12-to-13-assessment.md) instead.

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate from CMS 12 to CMS 13"
- "Upgrade Optimizely CMS"
- "Update to CMS 13"
- "Fix CMS 13 breaking changes"
- "PageReference no longer works"
- "PlugIn attribute not found"
- "Dynamic Properties removed"
- "ServiceLocator.Current antipattern"
- "IConfigurableModule not found"
- "EPiServer.Find not compatible with CMS 13"

## Usage Example

```
You: "Migrate our project from CMS 12 to CMS 13"

Agent: [Uses optimizely-cms12-to-13 skill]
- Fixes obsolete API warnings in the CMS 12 build before upgrading
- Upgrades .NET runtime to 10.0 in global.json and .csproj files
- Updates NuGet packages per the mapping (core CMS, Azure split, health check removal)
- Removes incompatible packages before upgrading CMS core
- Fixes breaking API changes (PageReference, SiteDefinition, ContentArea, serialization, etc.)
- Handles removed features with migration guidance
- Updates service registration (Visitor Groups, validators, localization provider)
- Updates configuration (UI URL /EPiServer to /Optimizely, HTML parsing, routing)
- Updates JS/TS SDK code if applicable
- Validates Graph/headless frontend schema if applicable
- Verifies with dotnet build and runtime smoke test
```

## What It Handles

- **.NET 10 upgrade** -- Updates global.json, TargetFramework, and LangVersion
- **NuGet package mapping** -- Updates core packages, handles the EPiServer.Azure split, removes deprecated packages
- **Package triage** -- Removes incompatible Optimizely and third-party packages, replaces where alternatives exist, upgrades compatible ones
- **Breaking API changes** -- Systematic fixes for PageReference, SiteDefinition, ContentArea, ServiceLocator, IConfigurableModule, serialization, and more
- **Removed features** -- Guidance for Dynamic Properties, PlugIn system, and Mirroring
- **Service registration** -- Explicit registration for Visitor Groups, validators, and localization providers
- **Configuration updates** -- UI URL changes, HTML parsing security defaults, routing API changes, content type name validation
- **JS/TS SDK updates** -- Content type name verification, preview route URL updates, registry sync
- **Spelling corrections** -- Fixes for renamed API methods (GetDescendents to GetDescendants, etc.)

## Key Migration Highlights

| CMS 12 | CMS 13 |
|--------|--------|
| .NET 6/8 | .NET 10 |
| PageReference | ContentReference |
| SiteDefinition | Application |
| ServiceLocator.Current (antipattern) | Constructor injection |
| IConfigurableModule | Startup.ConfigureServices() |
| Newtonsoft.Json | System.Text.Json |
| /EPiServer admin URL | /Optimizely admin URL |
| EPiServer.Find | Optimizely Graph |
| PlugInAttribute | Standard DI registration |

## Important Notes

- **Remove incompatible packages before upgrading CMS core** to avoid cascading build failures.
- **Visitor Groups require explicit registration** with `AddVisitorGroupsMvc()` and `AddVisitorGroupsUI()` or they silently stop working.
- **IValidate<T> implementations are no longer auto-discovered.** Register them explicitly with `AddCmsValidator<T>()`.
- **The /lang folder localization provider is no longer auto-registered.** Add `AddXmlLocalizationProvider()` explicitly.
- **Copy() no longer publishes content.** It creates a draft; call `Save(content, SaveAction.Publish)` afterward if needed.
- **Content type names are auto-migrated** if they violate new naming rules. Check string-based lookups still match.
- **SearchIndexer ACL required for Graph indexing** (CMS 13.3.0+). The upgrade only grants `SearchIndexer` on Root. Content with custom ACL (broken inheritance) is silently excluded from Graph. Run the diagnostic SQL and apply the fix before Graph sync — see Step 10 item 4 in the SKILL.

## Related Skills

- [`optimizely-cms12-to-13-assessment`](optimizely-cms12-to-13-assessment.md) -- Pre-migration assessment (run this first to understand scope and effort)
- [`optimizely-cms11-to-12`](optimizely-cms11-to-12.md) -- The prerequisite migration from CMS 11 to 12 (ASP.NET Framework to ASP.NET Core)
- [`optimizely-find-to-graph`](optimizely-find-to-graph.md) -- Migrate EPiServer Find queries to Graph SDK (required when CMS 12 project uses Find)
- [`optimizely-preview`](optimizely-preview.md) -- Re-verify live preview after migration due to URL and preview token changes
