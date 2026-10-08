# Optimizely CMS 12 to 13 Pre-Migration Assessment

Scan a CMS 12 project and report migration effort, risk areas, and recommended migration path without making any code changes.

## When to Use

Use this skill when you want to:
- Understand the scope and effort of migrating from CMS 12 to CMS 13
- Get a breaking changes summary before starting the upgrade
- Check package compatibility with CMS 13
- Determine whether your project needs the side-by-side migration approach (headless frontends)
- Report migration readiness to stakeholders

**To actually perform the migration**: use [`optimizely-cms12-to-13`](optimizely-cms12-to-13.md) instead.

## Trigger Phrases

Say any of these to activate the skill:
- "Pre-migration assessment"
- "What would it take to migrate to CMS 13"
- "CMS 12 to 13 migration effort"
- "What changed between CMS 12 and 13"
- "CMS 13 breaking changes"
- "Is my project ready for CMS 13"
- "Package compatibility CMS 13"
- "How hard is the CMS 13 upgrade"

## Usage Example

```
You: "Assess our CMS 12 project for CMS 13 migration readiness"

Agent: [Uses optimizely-cms12-to-13-assessment skill]
- Detects current CMS version and .NET target framework
- Scans for removed features (Dynamic Properties, PlugIn system)
- Identifies high-impact API changes (PageReference, SiteDefinition, ContentArea, etc.)
- Checks Optimizely and third-party packages against the compatibility list
- Detects headless frontend packages (Graph, Content Delivery API)
- Flags spelling corrections in the public API that cause confusing errors
- Reports effort level: Code: Minimal/Moderate/Significant | Frontend: None/Present
- Recommends side-by-side approach if headless frontend detected
- Stops here with findings (does not start migrating)
```

## What It Reports

- **Migration effort** -- Two-axis classification: Code Impact (Minimal, Moderate, Significant) and Frontend Impact (None, Present)
- **Removed features** -- Dynamic Properties, PlugIn system, Mirroring
- **High-impact API changes** -- PageReference, SiteDefinition, ServiceLocator, IConfigurableModule, ContentArea, and 20+ more
- **Package compatibility** -- Incompatible Optimizely packages (EPiServer.Find, Content Delivery/Management/Definitions APIs) and third-party packages (Geta.*, Advanced.CMS.*, Labs)
- **Headless frontend detection** -- Graph, Content Delivery API, Management API, Definitions API
- **Tab name issues** -- Non-alphanumeric GroupName values that will cause runtime errors
- **Spelling corrections** -- Renamed API methods that cause confusing compilation errors
- **Migration path recommendation** -- In-place vs side-by-side approach based on frontend impact

## Related Skills

- [`optimizely-cms12-to-13`](optimizely-cms12-to-13.md) -- Perform the actual CMS 12 → 13 migration (the next step after this assessment)
- [`optimizely-cms11-to-12`](optimizely-cms11-to-12.md) -- The prerequisite migration from CMS 11 to 12
- [`optimizely-find-to-graph`](optimizely-find-to-graph.md) -- Migrate EPiServer Find to Graph SDK (relevant when Find is detected)
