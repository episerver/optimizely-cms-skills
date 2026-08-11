---
name: optimizely-find-to-graph
description: >-
  This skill should be used when the user asks to "migrate Find queries",
  "replace EPiServer.Find", "Find to Graph", "IClient to IGraphContentClient",
  "Search to QueryContent", "Find not working CMS 13", "EPiServer.Find removed",
  "convert Find to Graph SDK", "how to use Graph SDK instead of Find",
  "Find query migration", "MatchContained replacement", "FilterHits equivalent",
  "Search and Navigation to Graph", "UnifiedSearch Graph equivalent",
  "GetContentResult to GetAsContentAsync", or mentions any scenario involving
  migrating EPiServer Find (Search & Navigation) queries to the Optimizely
  Graph SDK query API.
---

# Migrate EPiServer Find to Optimizely Graph SDK

Guide the user through migrating EPiServer Find (Search & Navigation) queries
to the Optimizely Graph SDK query API. Find is not available in CMS 13 — all
Find queries must be rewritten using the Graph SDK's fluent API.

## When to Use This Skill

- User wants to migrate Find queries to Graph SDK
- User gets compilation errors from EPiServer.Find after CMS 13 upgrade
- User asks about specific Find method replacements (Match, Filter,
  TermsFacetFor, etc.)
- User asks how to replace IClient with IGraphContentClient
- User wants to remove EPiServer.Find from their project
- User reports search stopped working after CMS 13 upgrade

## Steps

### Step 1: Detect Find Usage

Scan the project for Find patterns to determine migration scope.

```shell
grep -r "EPiServer.Find" --include="*.csproj" .
grep -r "using EPiServer.Find" --include="*.cs" .
grep -r "IClient" --include="*.cs" .
grep -r "\.Search<" --include="*.cs" .
```

Look for:
- Package references to `EPiServer.Find` or `EPiServer.Find.Cms`
- `using EPiServer.Find;` statements
- `IClient` injection via constructor or property
- `.Search<T>()` query entry points
- `.For()`, `.Filter()`, `.TermsFacetFor()`, `.GetContentResult()` calls

**If user only asked about a specific method**: Skip to the relevant step
and reference `references/find-to-graph-mapping.md` for the full mapping
table.

### Step 2: Add Graph SDK Packages

```shell
dotnet add package Optimizely.Graph.Cms
dotnet add package Optimizely.Graph.Cms.Query
```

**CRITICAL**: Both packages are needed. `Optimizely.Graph.Cms` handles
content indexing and synchronization. `Optimizely.Graph.Cms.Query` provides
the fluent query API (`QueryContent<T>`, `Where`, `Facet`, etc.). Installing
only one package results in either missing query methods or missing content
sync.

### Step 3: Register Graph Services

**Before (Find / CMS 12)**: Find services auto-registered with `AddCms()`.

**After (Graph / CMS 13)**:
```csharp
services.AddContentGraph();
services.AddGraphContentClient();
```

Plus `appsettings.json` configuration:
```json
{
  "Optimizely": {
    "ContentGraph": {
      "GatewayAddress": "https://cg.optimizely.com",
      "AppKey": "<your-app-key>",
      "Secret": "<your-secret>",
      "SingleKey": "<your-single-key>"
    }
  }
}
```

**CRITICAL**: Missing either registration call causes queries to silently
return empty results at runtime with no compilation error.

### Step 4: Migrate Search Queries

The core query entry point changes from `IClient.Search<T>()` to
`IGraphContentClient.QueryContent<T>()`.

```csharp
// Before (Find)
var results = _client.Search<ArticlePage>()
    .For("optimizely")
    .InField(x => x.Title)
    .GetContentResult();

// After (Graph SDK)
var results = await _graphClient.QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .UsingField(x => x.Title)
    .GetAsContentAsync();
```

Key mappings:
- `IClient` -> `IGraphContentClient`
- `.Search<T>()` -> `.QueryContent<T>()`
- `.For("term")` -> `.SearchFor("term")`
- `.InField(x => x.Title)` -> `.UsingField(x => x.Title)`

Detection: Search for `.Search<` and `.For(`

### Step 5: Migrate Filter Expressions

Key paradigm shift: Find uses method chains with extension methods. Graph
SDK uses LINQ-style lambda expressions with `.Where()`.

```csharp
// Before (Find)
var results = _client.Search<ArticlePage>()
    .Filter(x => x.Category.Match("News"))
    .Filter(x => x.StartPublish.GreaterThan(DateTime.Now.AddDays(-30)))
    .FilterHits(x => x.Language.Name.Match("en"))
    .GetContentResult();

// After (Graph SDK)
var results = await _graphClient.QueryContent<ArticlePage>()
    .Where(x => x.Category.Match("News"))
    .Where(x => x.StartPublish.GreaterThan(DateTime.Now.AddDays(-30)))
    .Where(x => x.Language.Name.Match("en"))
    .GetAsContentAsync();
```

Key mappings:
- `.Filter(x => ...)` -> `.Where(x => ...)`
- `.Match()` -> `.Match()` or `.FilterEquals()`
- `.MatchContained()` -> `.Where()` with nested property navigation
- `.Exists()` -> `.Exists(true)`
- `.In()` -> `.In()`

**IMPORTANT**: `.FilterHits()` has no direct equivalent in Graph SDK. In
Find, `.FilterHits()` filters results without affecting facet counts. Graph
SDK `.Where()` always affects both results and facets. If you need
independent facet counts, use separate queries.

Detection: Search for `.Filter(`, `.Match(`, `.FilterHits(`

### Step 6: Migrate Faceting

```csharp
// Before (Find)
var results = _client.Search<ArticlePage>()
    .TermsFacetFor(x => x.Category)
    .HistogramFacetFor(x => x.Price, 10)
    .DateHistogramFacetFor(x => x.StartPublish,
        DateInterval.Month)
    .GetContentResult();

var categoryFacet = results.TermsFacetFor(x => x.Category);

// After (Graph SDK)
var results = await _graphClient.QueryContent<ArticlePage>()
    .Facet(x => x.Category)
    .Facet(x => x.Price)
    .Facet(x => x.StartPublish, f => f.Unit(FacetDateTimeUnit.Month))
    .GetAsContentAsync();

var categoryFacet = results.Facet(x => x.Category);
```

Key mappings:
- `.TermsFacetFor(x => x.Prop)` -> `.Facet(x => x.Prop)`
- `.HistogramFacetFor(x => x.Prop, interval)` -> `.Facet(x => x.Prop)`
  with range configuration
- `.DateHistogramFacetFor()` -> `.Facet()` with `FacetDateTimeUnit`

**Note**: `.TermsFacetForWordsIn()` has no direct equivalent in Graph SDK.

See `references/find-to-graph-mapping.md` for the full faceting mapping
table.

Detection: Search for `FacetFor`

### Step 7: Migrate Pagination & Sorting

```csharp
// Before (Find)
var results = _client.Search<ArticlePage>()
    .For("optimizely")
    .Take(10)
    .Skip(20)
    .OrderBy(x => x.Title)
    .OrderByDescending(x => x.StartPublish)
    .GetContentResult();

// After (Graph SDK)
var results = await _graphClient.QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .Limit(10)
    .Skip(20)
    .OrderBy(x => x.Title, OrderDirection.Ascending)
    .OrderBy(x => x.StartPublish, OrderDirection.Descending)
    .GetAsContentAsync();
```

Key mappings:
- `.Take(n)` -> `.Limit(n)`
- `.Skip(n)` -> `.Skip(n)`
- `.OrderBy(x => x.Prop)` -> `.OrderBy(x => x.Prop, OrderDirection.Ascending)`
- `.OrderByDescending(x => x.Prop)` -> `.OrderBy(x => x.Prop, OrderDirection.Descending)`
- `.OrderByRelevance()` -> default behavior (or `.WithRankingMode(RankingMode.Relevance)`)

Detection: Search for `.Take(`, `.OrderBy`

### Step 8: Migrate Result Handling

**CRITICAL**: Graph SDK is async-only. All result methods return `Task<>`
and require `await`.

```csharp
// Before (Find) — synchronous
public IEnumerable<ArticlePage> GetArticles()
{
    var results = _client.Search<ArticlePage>()
        .For("news")
        .GetContentResult();

    var total = results.TotalMatching;
    foreach (var hit in results.Hits)
    {
        yield return hit.Document;
    }
}

// After (Graph SDK) — async required
public async Task<IEnumerable<ArticlePage>> GetArticlesAsync()
{
    var results = await _graphClient.QueryContent<ArticlePage>()
        .SearchFor("news")
        .GetAsContentAsync();

    var total = results.Total;
    foreach (var item in results.Items)
    {
        yield return item;
    }
}
```

Key mappings:
- `.GetResult()` -> `await .GetAsync()`
- `.GetContentResult()` -> `await .GetAsContentAsync()`
- `.GetContentResultSafe()` -> `try/catch` around `await .GetAsContentAsync()`
- `.Hits` -> `.Items`
- `.TotalMatching` -> `.Total`

Detection: Search for `GetResult`, `GetContentResult`

### Step 9: Remove Find Packages

```shell
dotnet remove package EPiServer.Find
dotnet remove package EPiServer.Find.Cms
```

Clean up remaining references:

1. Remove Find configuration from `appsettings.json` (the `EPiServer:Find`
   section)
2. Remove `using EPiServer.Find;` statements from all `.cs` files
3. Remove any Find initialization modules or `IInitializableModule`
   implementations that configure Find

Verify removal is complete:
```shell
grep -r "EPiServer.Find" --include="*.cs" --include="*.csproj" --include="*.json" .
```

### Step 10: Verify Migration

1. **Build check**:
   ```shell
   dotnet build
   ```
   Fix any remaining compilation errors. Most will be method name or
   namespace changes documented in `references/find-to-graph-mapping.md`.

2. **Runtime smoke test**:
   - Start the application
   - Execute a search query — verify results are returned
   - Check facets return expected counts
   - Verify pagination works (skip/limit)
   - Test sorting in both directions
   - If using UnifiedSearch, verify cross-content-type search returns
     mixed results

**CRITICAL**: Do not report migration complete until `dotnet build` succeeds
and the runtime smoke test passes.

## Common Pitfalls

1. **Forgetting async/await** — Graph queries are async-only. Calling
   `.GetAsync()` without `await` hangs or returns a `Task` object instead
   of results.

2. **Missing AddContentGraph() registration** — Queries compile but return
   empty results at runtime. No error is thrown.

3. **Using .Take() instead of .Limit()** — `.Take()` does not exist on
   Graph queries. Results in a compilation error.

4. **Expecting FilterHits behavior** — Graph `.Where()` always affects both
   results and facet counts. There is no way to filter results independently
   of facets. Use separate queries if needed.

5. **Missing appsettings.json configuration** — No `Optimizely:ContentGraph`
   config section causes silent connection failures at runtime.

6. **Not updating result property names** — `.Hits` becomes `.Items`,
   `.TotalMatching` becomes `.Total`. Compilation errors if not updated.

7. **Trying to use IClient** — `IClient` does not exist in CMS 13. Must
   use `IGraphContentClient` for all query operations.

8. **Sync-to-async method signature changes** — Calling methods must become
   `async Task<>` throughout the entire call chain. This often cascades
   through controllers, services, and view models.

## Related Skills

- **cms12-to-13-migration** — Complete CMS 12 to 13 migration guide (start
  here if migrating the entire project, not just Find)
- **optimizely-setup** — Set up the Optimizely CMS SDK from scratch
- **content-fetching** — Content fetching patterns (useful after migration)
