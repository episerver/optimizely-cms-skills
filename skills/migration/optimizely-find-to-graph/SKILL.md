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
- `SearchClient.Instance` static singleton access
- `.Search<T>()` query entry points
- `.For()`, `.Filter()`, `.TermsFacetFor()`, `.GetContentResult()` calls
- `.UsingSynonyms()`, `.ApplyBestBets()`, `.Track()`, `.StaticallyCacheFor()`
- `.Select(x => new { ... })` projections
- `Statistics()` API calls (autocomplete, did-you-mean)

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

**CRITICAL**: The `Optimizely.Graph.Cms.Query` version must match the
CMS version exactly. A version mismatch (e.g., CMS `13.0.0` + Graph
`13.1.0`) causes `NU1107` dependency resolution failures. Check the
installed CMS version first:
```shell
grep "EPiServer.CMS" *.csproj
```
Then install the matching Graph version.

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
- `.Search<T>()` -> `.QueryContent<T>()` (when T implements `IContentData`)
- `.Search<T>()` -> `.Query<T>()` (when T does NOT implement `IContentData`)
- `.For("term")` -> `.SearchFor("term")`
- `.InField(x => x.Title)` -> `.UsingField(x => x.Title)`
- `.AndInField(x => x.Prop)` -> `.UsingField(x => x.Prop)`
- `.InAllField()` -> `.UsingFullText()`

**`SearchClient.Instance` replacement**: If the project uses the static
singleton `SearchClient.Instance` instead of injected `IClient`, replace
with constructor-injected `IGraphContentClient`. This requires
introducing DI if the class does not already use it.

```csharp
// Before (Find — static singleton)
var results = SearchClient.Instance.Search<ArticlePage>()
    .For("news")
    .GetContentResult();

// After (Graph SDK — constructor injection)
private readonly IGraphContentClient _graphClient;

public MyService(IGraphContentClient graphClient)
{
    _graphClient = graphClient;
}

var results = await _graphClient.QueryContent<ArticlePage>()
    .SearchFor("news")
    .GetAsContentAsync();
```

Detection: Search for `.Search<`, `.For(`, `SearchClient.Instance`

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

**Runtime-composed filters** — use `BuildFilter<T>()` for conditional
filter composition:
```csharp
// Before (Find) — chained .Filter() calls
var search = _client.Search<ProductPage>().For(query);
if (hasCategory)
    search = search.Filter(x => x.Category.Match(category));
if (hasRating)
    search = search.Filter(x => x.Rating.GreaterThan(minRating));
var results = search.GetContentResult();

// After (Graph SDK) — BuildFilter for composition
var filter = _graphClient.BuildFilter<ProductPage>();
if (hasCategory)
    filter = filter.And(x => x.Category == category);
if (hasRating)
    filter = filter.And(x => x.Rating >= minRating);
var results = await _graphClient.QueryContent<ProductPage>()
    .SearchFor(query)
    .Filter(filter)
    .GetAsContentAsync();
```

Detection: Search for conditional `.Filter(` chains, `FilterBuilder`

### Step 5b: Handle Query Chain Type Differences

**CRITICAL**: In Find, every chained method returns the same type
(`ITypeSearch<T>`). In Graph SDK, each method returns a **different
interface type**. You cannot reassign across chain stages.

```csharp
// Find SDK — same type throughout
ITypeSearch<T> query = _client.Search<T>();
query = query.For(text);    // still ITypeSearch<T>
query = query.Filter(...);  // still ITypeSearch<T>

// Graph SDK — BREAKS: different return types per stage
var query = _graphClient.QueryContent<T>();      // ISearchableContentQuery<T>
query = query.SearchFor(text);                    // ISearchFieldContentQuery<T> ← CS0266!
query = query.Where(...);                         // IContentQuery<T> ← CS0266!

// FIX: Declare with the base type from the start
IContentQuery<T> query = _graphClient
    .QueryContent<T>()
    .SearchFor(text);
query = query.Where(...);   // OK — IContentQuery<T> accepted
```

If you see `CS0266` errors mentioning `ISearchableContentQuery` or
`IContentQuery`, this is the cause.

### Step 5c: Migrate Language/Locale

```csharp
// Before (Find)
var results = _client.Search<ArticlePage>()
    .Language(Language.Swedish)
    .For("test")
    .GetContentResult();

// After (Graph SDK)
var results = await _graphClient.QueryContent<ArticlePage>()
    .SetLocale("sv")
    .SearchFor("test")
    .GetAsContentAsync();
```

Key mappings:
- `.Language(lang)` -> `.SetLocale("code")`
- `.InLanguageBranch()` -> `.SetLocale()`

Detection: Search for `.Language(`, `.InLanguageBranch(`

### Step 5d: Update Generic Constraints

Graph SDK's `IContentQuery<T>` requires `T : class`. If your Find code
uses generic methods constrained to interfaces, add the `class` constraint:

```csharp
// Before (Find — interface constraint only)
public IEnumerable<T> Search<T>(string query) where T : IContentData
{
    return _client.Search<T>().For(query).GetContentResult();
}

// After (Graph SDK — class constraint required)
public async Task<IEnumerable<T>> SearchAsync<T>(string query)
    where T : class, IContentData
{
    return await _graphClient.QueryContent<T>()
        .SearchFor(query)
        .GetAsContentAsync();
}
```

Rules:
- `where T : IContentData` -> `where T : class, IContentData`
- `where T : PageData` -> leave as-is (PageData is already a class;
  adding `class,` causes CS0450)
- `where T : IContent` -> `where T : class, IContent`

Detection: Search for `where T : IContentData`, `where T : IContent`

### Step 5e: Migrate Projections

Find's `.Select()` anonymous projections become `.Fields<TProjection>()`:

```csharp
// Before (Find)
var results = _client.Search<ArticlePage>()
    .For("news")
    .Select(x => new { x.Title, x.StartPublish })
    .GetResult();

// After (Graph SDK)
var results = await _graphClient.QueryContent<ArticlePage>()
    .SearchFor("news")
    .Fields<ArticleProjection>(x => x.Title, x => x.StartPublish)
    .GetAsync();

// TProjection must be a POCO — NOT IContentData
public class ArticleProjection
{
    public string Title { get; set; }
    public DateTime? StartPublish { get; set; }
}
```

**CRITICAL**: Do NOT use `.Fields()` with `.GetAsContentAsync()`. Use
`.GetAsync()` for projection queries. TProjection must be a plain POCO
class — it must NOT implement `IContentData`.

Detection: Search for `.Select(x => new`

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

**Result type distinction**:
- `GetAsync()` returns `IQueryResult<T>` — access items via `result.Items`
  and facets via `result.Facets.GetFacet()`. Use when you need facet data
  or raw metadata.
- `GetAsContentAsync()` returns `IGetAsContentResult<T>` which IS
  `IEnumerable<T>` — iterate directly (no `.Items` property). Use when
  you only need content objects.

**`result.Total` is nullable** (`int?`). Use null-coalescing:
```csharp
int total = result.Total ?? 0;
```
Also requires `.IncludeTotal()` on the query (see Step 7).

Detection: Search for `GetResult`, `GetContentResult`

### Step 8b: Migrate Remaining Patterns

**Autocomplete**:
```csharp
// Before (Find — Statistics API)
var suggestions = await _client.Statistics()
    .GetAutocompleteAsync("opt", maxItems: 5);

// After (Graph SDK)
var suggestions = await _graphClient.QueryContent<ArticlePage>()
    .Autocomplete(x => x.Title, "opt", limit: 5)
    .GetAsync();
```

`Statistics().GetDidYouMeanAsync()` has no direct equivalent. Consider
`.Autocomplete()` as a partial replacement for suggestion features.

**Best Bets**:
- `.ApplyBestBets()` -> `.WithPinned()`
- Custom `IBestBetSelector` implementations have no Graph equivalent —
  flag for manual review.

**Caching**:
```csharp
// Before (Find)
.StaticallyCacheFor(TimeSpan.FromMinutes(10))

// After (Graph SDK) — only if non-default duration
.WithCacheOptions(o => {
    o.AbsoluteExpiration = TimeSpan.FromMinutes(10);
})
// To disable caching:
.WithoutCache()
```

Graph SDK defaults to 5-minute cache. Remove `.StaticallyCacheFor()`
calls that use the default 5-minute duration.

**Tracking**:
- `.Track()` -> Remove entirely. Graph SDK does not support tracking.
  Optionally add `.WithName("queryName")` for analytics identification.

**Synonyms**:
```csharp
// Before (Find — query-wide)
var results = _client.Search<ArticlePage>()
    .For("optimizely")
    .UsingSynonyms()
    .GetContentResult();

// After (Graph SDK — per-filter, not query-wide)
var results = await _graphClient.QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .Where(x => x.Category.Match("CMS", SynonymSlot.One))
    .GetAsContentAsync();
```

**IMPORTANT**: Graph SDK applies synonyms per-filter via `SynonymSlot`,
not query-wide. If the original code uses `.UsingSynonyms()` without a
specific filter to attach to, the query must be restructured.

**Exception types**:
- `ClientException` / `ServiceException` -> `Exception` or
  `HttpRequestException` (Find-specific exception types do not exist
  in Graph SDK)

**Display filters and auth**:
- `.WithDisplayFilters()` for published/access filtering
- `.AsUser(principal)` and `.WithAuth(options)` for access control

Detection: Search for `.ApplyBestBets(`, `.StaticallyCacheFor(`,
`.Track(`, `.UsingSynonyms(`, `ClientException`, `ServiceException`

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

9. **Missing `.WithDisplayFilters()`** — Graph queries do not apply
   published/access filters by default. Add `.WithDisplayFilters()` to apply
   display logic (published status, access rights) equivalent to what Find
   did automatically.

10. **Default page size is 10** — Graph SDK returns only 10 items if
    `.Limit()` is not specified. Always call `.Skip()` and `.Limit()`
    explicitly for paginated queries. Never filter or page in memory after
    `GetAsContentAsync()`.

11. **MultiSearch has no equivalent** — Find's `.DynamicMultiSearch()` must
    be split into parallel queries using `Task.WhenAll()`.

12. **`.IncludeTotal()` required for pagination metadata** — Graph SDK does
    not include total count by default. Add `.IncludeTotal()` before
    `.GetAsContentAsync()` to get total result counts for pagination.

13. **Query chain type mismatch (CS0266)** — Graph SDK returns different
    interface types at each chain stage. If Find code assigns to a
    variable and reassigns after each method, use `IContentQuery<T>` as
    the declared type (see Step 5b).

14. **NuGet version mismatch (NU1107)** — `Optimizely.Graph.Cms.Query`
    version must exactly match the CMS version. A mismatch causes
    `NU1107` dependency resolution failure (see Step 2).

15. **Missing `class` constraint (CS0311)** — Generic methods with
    `where T : IContentData` need `where T : class, IContentData` for
    Graph SDK. But do NOT add `class,` before concrete types like
    `PageData` — that causes CS0450 (see Step 5d).

16. **`.Fields()` with `GetAsContentAsync()`** — Using projection with
    content resolution does not work. Use `.GetAsync()` for projection
    queries. TProjection must be a POCO, not `IContentData`.

17. **`IContentResult<T>` is not covariant** — Passing
    `IContentResult<SpecificPage>` to a method expecting
    `IContentResult<PageData>` fails. Fix: make the consuming method
    generic, or use `result.Items.Cast<PageData>().ToList()`.

18. **`IGetAsContentResult<T>` vs `IContentResult<T>`** —
    `GetAsContentAsync()` returns `IGetAsContentResult<T>` which IS
    `IEnumerable<T>` (iterate directly). `GetAsync()` returns
    `IContentResult<T>` which has `.Items` (NOT iterable directly).
    Do not use `.Items` on `IGetAsContentResult` or LINQ on
    `IContentResult`.

## Related Skills

- **cms12-to-13-migration** — Complete CMS 12 to 13 migration guide (start
  here if migrating the entire project, not just Find)
- **optimizely-setup** — Set up the Optimizely CMS SDK from scratch
- **content-fetching** — Content fetching patterns (useful after migration)
