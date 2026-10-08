# Optimizely Find to Graph Migration

Migrate EPiServer Find (Search and Navigation) queries to the Optimizely Graph SDK query API. Find is not available in CMS 13, so all Find queries must be rewritten using the Graph SDK's fluent API.

## When to Use

Use this skill when you want to:
- Migrate Find search queries to Graph SDK after a CMS 13 upgrade
- Replace `IClient` with `IGraphContentClient` throughout your project
- Rewrite `.Search<T>()` calls to `.QueryContent<T>()`
- Fix compilation errors from EPiServer.Find after CMS 13 upgrade
- Understand the method-by-method mapping from Find to Graph SDK
- Remove EPiServer.Find packages and clean up all references
- Convert synchronous Find queries to async Graph SDK queries

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate Find queries"
- "Replace EPiServer.Find"
- "Find to Graph"
- "IClient to IGraphContentClient"
- "Search to QueryContent"
- "Find not working CMS 13"
- "EPiServer.Find removed"
- "Convert Find to Graph SDK"
- "Find query migration"
- "Search and Navigation to Graph"

## Usage Example

```
You: "Migrate our Find search queries to Graph SDK"

Agent: [Uses optimizely-find-to-graph skill]
- Scans the project for EPiServer.Find package references and usage patterns
- Counts IClient injections, .Search<T>() calls, filter chains, and facets
- Adds Optimizely.Graph.Cms and Optimizely.Graph.Cms.Query packages
- Registers Graph services (AddContentGraph, AddGraphContentClient)
- Adds Graph configuration to appsettings.json
- Rewrites each query: entry points, filters, facets, pagination, sorting, results
- Converts synchronous methods to async throughout the call chain
- Removes EPiServer.Find packages and cleans up all using statements
- Verifies with dotnet build and runtime smoke test
```

```
You: "What's the Graph equivalent of FilterHits?"

Agent: [Uses optimizely-find-to-graph skill]
- Explains that FilterHits has no direct Graph SDK equivalent
- In Find, FilterHits filters results without affecting facet counts
- In Graph SDK, Where() always affects both results and facets
- Recommends using separate queries if independent facet counts are needed
```

## What It Handles

- **Usage detection** -- Scans the project for all Find patterns (IClient, .Search<T>, .Filter, .TermsFacetFor, etc.)
- **Package setup** -- Installs both required Graph SDK packages and registers services
- **Query migration** -- Rewrites search entry points, filter expressions, facets, pagination, sorting, and result handling
- **Async conversion** -- Converts synchronous Find calls to async Graph SDK calls throughout the call chain
- **Package removal** -- Removes Find packages, using statements, config sections, and initialization modules
- **Verification** -- Build check and runtime smoke test for search, facets, pagination, and sorting

## Method Mapping Quick Reference

| Find (CMS 12) | Graph SDK (CMS 13) |
|----------------|---------------------|
| `IClient` | `IGraphContentClient` |
| `.Search<T>()` | `.QueryContent<T>()` |
| `.For("term")` | `.SearchFor("term")` |
| `.InField(x => x.Prop)` | `.UsingField(x => x.Prop)` |
| `.Filter(x => ...)` | `.Where(x => ...)` |
| `.Take(n)` | `.Limit(n)` |
| `.Skip(n)` | `.Skip(n)` |
| `.OrderBy(x => x.Prop)` | `.OrderBy(x => x.Prop, OrderDirection.Ascending)` |
| `.OrderByDescending(...)` | `.OrderBy(..., OrderDirection.Descending)` |
| `.TermsFacetFor(x => x.Prop)` | `.Facet(x => x.Prop)` |
| `.GetContentResult()` | `await .GetAsContentAsync()` |
| `.GetResult()` | `await .GetAsync()` |
| `.Hits` | `.Items` |
| `.TotalMatching` | `.Total` |

## Important Notes

- **Graph SDK is async-only.** Every result method returns `Task<>` and requires `await`. This cascades through controllers, services, and view models.
- **Both packages are required.** `Optimizely.Graph.Cms` handles content sync; `Optimizely.Graph.Cms.Query` provides the query API. Missing either one causes silent failures.
- **Both service registrations are required.** Missing `AddContentGraph()` or `AddGraphContentClient()` causes queries to return empty results at runtime with no error.
- **FilterHits has no equivalent.** Graph SDK `.Where()` always affects both results and facet counts. Use separate queries if you need independent facet filtering.
- **appsettings.json must include Graph configuration.** Missing the `Optimizely:ContentGraph` section causes silent connection failures.

## Related Skills

- [`optimizely-cms12-to-13`](optimizely-cms12-to-13.md) -- Complete CMS 12 to 13 migration (start here if migrating the entire project, not just Find)
- [`optimizely-troubleshoot-graph`](optimizely-troubleshoot-graph.md) -- Debug Graph query errors after migration
- [`optimizely-content-fetching`](optimizely-content-fetching.md) -- Content fetching patterns with the Graph SDK
