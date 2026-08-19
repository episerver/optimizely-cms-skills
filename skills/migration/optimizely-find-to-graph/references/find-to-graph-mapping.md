# Find-to-Graph Method Mapping Reference

> Comprehensive mapping of every Optimizely Search & Navigation (Find) API method
> to its Optimizely Content Graph SDK equivalent. Covers search, filtering,
> pagination, sorting, faceting, caching, best bets, and result retrieval.
> Each entry includes before/after C# code, behavior differences, and gap analysis.

---

## 1. Quick Method Index

Alphabetical index of all Find methods covered in this reference.

| Find Method | Section |
|-------------|---------|
| [`.AndInField(expr)`](#andinfield) | [Search](#search) |
| [`.ApplyBestBets()`](#bestbetfor--applybestbets) | [Caching & Best Bets](#caching--best-bets) |
| [`.BestBetFor()`](#bestbetfor--applybestbets) | [Caching & Best Bets](#caching--best-bets) |
| [`.DateHistogramFacetFor(expr, interval)`](#datehistogramfacetfor) | [Faceting](#faceting) |
| [`.Exists()`](#exists) | [Filtering](#filtering) |
| [`.Filter(expr)`](#filter) | [Filtering](#filtering) |
| [`.FilterForVisitor()`](#filterforvisitor) | [Filtering](#filtering) |
| [`.FilterHits(expr)`](#filterhits) | [Filtering](#filtering) |
| [`.For(string)`](#for) | [Search](#search) |
| [`.GetContentResult()`](#getcontentresult) | [Result Methods](#result-methods) |
| [`.GetContentResultSafe()`](#getcontentresultsafe) | [Result Methods](#result-methods) |
| [`.GetResult()`](#getresult) | [Result Methods](#result-methods) |
| [`.HistogramFacetFor(expr, interval)`](#histogramfacetfor) | [Faceting](#faceting) |
| [`.In(values)`](#in) | [Filtering](#filtering) |
| [`.InAllField()`](#inallfield) | [Search](#search) |
| [`.InField(expr)`](#infield) | [Search](#search) |
| [`.InFields(expr[])`](#infields) | [Search](#search) |
| [`IClient.Search<T>()`](#iclientsearch) | [Specialized](#specialized) |
| [`.Match(string)`](#match) | [Filtering](#filtering) |
| [`.MatchCaseInsensitive(string)`](#matchcaseinsensitive) | [Filtering](#filtering) |
| [`.MatchContained(value)`](#matchcontained) | [Filtering](#filtering) |
| [`.MatchFuzzy(string)`](#matchfuzzy) | [Filtering](#filtering) |
| [`.OrderBy(expr)`](#orderby) | [Pagination & Sorting](#pagination--sorting) |
| [`.OrderByDescending(expr)`](#orderbydescending) | [Pagination & Sorting](#pagination--sorting) |
| [`.OrderByRelevance()`](#orderbyrelevance) | [Pagination & Sorting](#pagination--sorting) |
| [`.Skip(int)`](#skip) | [Pagination & Sorting](#pagination--sorting) |
| [`.StaticallyCacheFor(TimeSpan)`](#staticallycachefor) | [Caching & Best Bets](#caching--best-bets) |
| [`.Take(int)`](#take) | [Pagination & Sorting](#pagination--sorting) |
| [`.TermsFacetFor(expr)`](#termsfacetfor) | [Faceting](#faceting) |
| [`.TermsFacetForWordsIn(expr)`](#termsfacetforwordsin) | [Faceting](#faceting) |
| [`.UnifiedSearch()` / `.UnifiedSearchFor()`](#unifiedsearch) | [Specialized](#specialized) |
| [`.UsingSynonyms()`](#usingsynonyms) | [Specialized](#specialized) |
| [`.Track()`](#track) | [Specialized](#specialized) |
| [`.Select(expr)`](#select) | [Specialized](#specialized) |
| [`SearchClient.Instance`](#searchclient-instance) | [Specialized](#specialized) |
| [`Statistics().GetAutocompleteAsync()`](#statistics-autocomplete) | [Specialized](#specialized) |
| [`.WithHighlight()`](#withhighlight) | [Search](#search) |
| [`.OrFilter()`](#orfilter) | [Filtering](#filtering) |

---

## 2. Method Mapping by Category

### Search

#### `.For()` {#for}

**Find:** `ITypeSearch<T>.For(string query)`

**Graph SDK:** `IGraphContentClient.QueryContent<T>().SearchFor(string query)`

**Behavior differences:** Both perform free-text search. Graph SDK uses the
Optimizely Content Graph full-text search engine which may produce different
relevance scoring than Find's Elasticsearch backend.

**Before (Find):**

```csharp
using EPiServer.Find;
using EPiServer.Find.Api;

public class ArticleSearchService
{
    private readonly IClient _findClient;

    public ArticleSearchService(IClient findClient)
    {
        _findClient = findClient;
    }

    public SearchResults<ArticlePage> Search(string query)
    {
        return _findClient.Search<ArticlePage>()
            .For(query)
            .GetResult();
    }
}
```

**After (Graph SDK):**

```csharp
using Optimizely.ContentGraph.Sdk;
using Optimizely.ContentGraph.Sdk.Queries;

public class ArticleSearchService
{
    private readonly IGraphContentClient _graphClient;

    public ArticleSearchService(IGraphContentClient graphClient)
    {
        _graphClient = graphClient;
    }

    public async Task<IEnumerable<ArticlePage>> SearchAsync(string query)
    {
        var result = await _graphClient
            .QueryContent<ArticlePage>()
            .SearchFor(query)
            .GetAsContentAsync();

        return result;
    }
}
```

---

#### `.InField()` {#infield}

**Find:** `.For(query).InField(x => x.Title)`

**Graph SDK:** `.SearchFor(query).UsingField(x => x.Title)` or
`.SearchFor(query).UsingField(x => x.Title, boost)`

**Behavior differences:** Graph SDK's `.UsingField()` accepts an optional boost
parameter. Find's `.InField()` does not support inline boost; boosting in Find
uses a separate `.BoostMatching()` call. In Graph SDK you can specify the
boost weight directly: `.UsingField(x => x.Title, 5)`.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .InField(x => x.Title)
    .GetResult();
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .UsingField(x => x.Title)
    .GetAsContentAsync();

// With boost:
var boostedResults = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .UsingField(x => x.Title, 5)
    .GetAsContentAsync();
```

---

#### `.AndInField()` {#andinfield}

**Find:** `.For(query).InField(x => x.Title).AndInField(x => x.Summary)`

**Graph SDK:** Chain multiple `.UsingField()` calls.

**Behavior differences:** Find uses `.AndInField()` to add additional fields
after the initial `.InField()`. Graph SDK simplifies this by allowing
multiple `.UsingField()` calls in sequence. Functionally equivalent.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .InField(x => x.Title)
    .AndInField(x => x.Summary)
    .AndInField(x => x.MainBody)
    .GetResult();
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .UsingField(x => x.Title, 5)
    .UsingField(x => x.Summary, 3)
    .UsingField(x => x.MainBody, 1)
    .GetAsContentAsync();
```

---

#### `.InFields()` {#infields}

**Find:** `.For(query).InFields(x => x.Title, x => x.Summary, x => x.MainBody)`

**Graph SDK:** Multiple `.UsingField()` calls (no array overload).

**Behavior differences:** Find accepts an array of expressions in a single call.
Graph SDK requires chaining individual `.UsingField()` calls. Functionally
equivalent once all fields are specified.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .InFields(x => x.Title, x => x.Summary, x => x.MainBody)
    .GetResult();
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .UsingField(x => x.Title)
    .UsingField(x => x.Summary)
    .UsingField(x => x.MainBody)
    .GetAsContentAsync();
```

---

#### `.InAllField()` {#inallfield}

**Find:** `.For(query).InAllField()`

**Graph SDK:** No equivalent needed. Searching all indexed fields is the default
behavior of `.SearchFor()`.

**Behavior differences:** None. Graph SDK searches across all searchable fields
by default when no `.UsingField()` is specified. Omitting `.UsingField()`
replicates `.InAllField()`.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .InAllField()
    .GetResult();
```

**After (Graph SDK):**

```csharp
// Simply omit UsingField — all searchable fields are included by default
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .GetAsContentAsync();
```

---

### Filtering

#### `.Filter()` {#filter}

**Find:** `.Filter(x => x.Category.Match("News"))`

**Graph SDK:** `.Where(x => x.Category.Eq("News"))` using LINQ-style lambdas.

**Behavior differences:** Find's `.Filter()` applies post-query filtering that
does not affect relevance scoring. Graph SDK's `.Where()` also applies
non-scoring filters. The lambda syntax differs: Find uses `.Match()` inside
filters while Graph SDK uses `.Eq()`, `.Gt()`, `.Lt()`, and other typed
comparison operators.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .Filter(x => x.Status.Match("Published"))
    .Filter(x => x.StartPublish.GreaterThan(DateTime.UtcNow.AddDays(-30)))
    .GetResult();
```

**After (Graph SDK):**

```csharp
var cutoff = DateTime.UtcNow.AddDays(-30);

var results = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Status.Eq("Published"))
    .Where(x => x.StartPublish.Gt(cutoff))
    .GetAsContentAsync();
```

---

#### `.FilterHits()` {#filterhits}

**Find:** `.FilterHits(x => x.StartPublish.GreaterThan(DateTime.UtcNow))`

**Graph SDK:** **NO DIRECT EQUIVALENT.** See [Capability Gaps](#3-capability-gaps).

**Behavior differences:** Find's `.FilterHits()` applies post-processing filters
on the result set after facet counts are computed, meaning facet counts reflect
the unfiltered result set. Graph SDK's `.Where()` filters before facet
computation. To replicate `.FilterHits()` behavior, issue two separate queries:
one for facets (without the filter) and one for results (with the filter).

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .TermsFacetFor(x => x.Category)
    .FilterHits(x => x.Category.Match("News"))
    .GetResult();

// Facet counts include all categories, but results only show "News"
var allCategoryFacets = results.TermsFacetFor(x => x.Category);
```

**After (Graph SDK):**

```csharp
// Query 1: Get facets without the hit filter
var facetResult = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .Facet(x => x.Category)
    .Limit(0) // no results needed, just facets
    .GetAsync();

// Query 2: Get filtered results
var filteredResults = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .Where(x => x.Category.Eq("News"))
    .GetAsContentAsync();
```

---

#### `.FilterForVisitor()` {#filterforvisitor}

**Find:** `.FilterForVisitor()`

**Graph SDK:** `.WithAuth()` combined with `.AsUser(token)` for authenticated
content filtering.

**Behavior differences:** Find's `.FilterForVisitor()` automatically applies
access control filtering based on the current visitor's roles and published
status. Graph SDK requires explicit authentication setup via `.WithAuth()` and
passing the user's authentication token with `.AsUser()`. Published-status
filtering is handled automatically by Graph SDK for anonymous queries (only
published content is returned). For draft/preview content, use `.AsUser()`
with an editor token.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .FilterForVisitor()
    .GetResult();
```

**After (Graph SDK):**

```csharp
// Anonymous visitor — published content only (default behavior)
var publicResults = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .GetAsContentAsync();

// Authenticated user — include access-controlled content
var authenticatedResults = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .WithAuth()
    .AsUser(userAuthToken)
    .GetAsContentAsync();
```

---

#### `.Match()` {#match}

**Find:** `.Filter(x => x.Author.Match("John"))`

**Graph SDK:** `.Where(x => x.Author.Eq("John"))` for exact match or
`.Where(x => x.Author.Match("John"))` for analyzed match.

**Behavior differences:** Find's `.Match()` performs an analyzed (tokenized)
match on text fields and exact match on keyword fields. Graph SDK's `.Eq()`
performs exact equality. For analyzed text matching, use `.Match()` in the
Graph SDK or `.FilterContains()`.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .Filter(x => x.Author.Match("John Doe"))
    .GetResult();
```

**After (Graph SDK):**

```csharp
// Exact match
var exactResults = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Author.Eq("John Doe"))
    .GetAsContentAsync();

// Analyzed / partial match
var analyzedResults = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Author.Match("John Doe"))
    .GetAsContentAsync();
```

---

#### `.MatchCaseInsensitive()` {#matchcaseinsensitive}

**Find:** `.Filter(x => x.Title.MatchCaseInsensitive("Optimizely"))`

**Graph SDK:** `.Where(x => x.Title.FilterContains("optimizely"))` --
Graph SDK string operations are case-insensitive by default.

**Behavior differences:** Find requires an explicit `.MatchCaseInsensitive()`
call to opt into case-insensitive matching. Graph SDK's `.FilterContains()`
and `.Match()` are case-insensitive by default. No special method needed.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .Filter(x => x.Title.MatchCaseInsensitive("OPTIMIZELY CMS"))
    .GetResult();
```

**After (Graph SDK):**

```csharp
// FilterContains is case-insensitive by default
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Title.FilterContains("optimizely cms"))
    .GetAsContentAsync();
```

---

#### `.MatchFuzzy()` {#matchfuzzy}

**Find:** `.For(query).InField(x => x.Title).MatchFuzzy("optmizely")`

**Graph SDK:** `.SearchFor("optmizely")` (fuzzy matching is built in) or
`.Where(x => x.Title.Like("opt%"))` with wildcards.

**Behavior differences:** Find's `.MatchFuzzy()` uses Elasticsearch's fuzzy
query with edit-distance tolerance. Graph SDK's `.SearchFor()` has built-in
fuzzy capability. For wildcard-style matching, use `.Like()` with `%` as the
wildcard character. Fine-grained fuzziness control (edit distance, prefix
length) available in Find is not directly configurable in Graph SDK. See
[Capability Gaps](#3-capability-gaps).

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optmizely")
    .InField(x => x.Title)
    .MatchFuzzy("optmizely")
    .GetResult();
```

**After (Graph SDK):**

```csharp
// Fuzzy is built into SearchFor
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optmizely")
    .UsingField(x => x.Title)
    .GetAsContentAsync();

// Or use Like for wildcard matching
var wildcardResults = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Title.Like("opt%"))
    .GetAsContentAsync();
```

---

#### `.MatchContained()` {#matchcontained}

**Find:** `.Filter(x => x.Tags.MatchContained(t => t.Name, "CMS"))`

**Graph SDK:** `.Where()` with nested property navigation.

**Behavior differences:** Find's `.MatchContained()` filters on a property
within a collection of nested objects. Graph SDK uses standard LINQ-style
nested property access within `.Where()`. The syntax is more natural in
Graph SDK but requires the nested type to be indexed in Content Graph.
See [Capability Gaps](#3-capability-gaps).

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .Filter(x => x.Tags.MatchContained(t => t.Name, "CMS"))
    .GetResult();
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Tags.Any(t => t.Name.Eq("CMS")))
    .GetAsContentAsync();

// If Tags is a simple string collection:
var simpleResults = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Tags.In(new[] { "CMS" }))
    .GetAsContentAsync();
```

---

#### `.Exists()` {#exists}

**Find:** `.Filter(x => x.Author.Exists())`

**Graph SDK:** `.Where(x => x.Author.Exists(true))`

**Behavior differences:** Functionally equivalent. Graph SDK's `.Exists()`
requires an explicit boolean parameter: `true` to match documents where the
field exists, `false` to match where it does not.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .Filter(x => x.Author.Exists())
    .GetResult();
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Author.Exists(true))
    .GetAsContentAsync();

// Find articles WITHOUT an author:
var noAuthor = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Author.Exists(false))
    .GetAsContentAsync();
```

---

#### `.In()` {#in}

**Find:** `.Filter(x => x.Category.In(new[] { "News", "Blog" }))`

**Graph SDK:** `.Where(x => x.Category.In(new[] { "News", "Blog" }))`

**Behavior differences:** Functionally equivalent. Both accept a collection of
values and match documents where the field value is contained in the set.

**Before (Find):**

```csharp
var categories = new[] { "News", "Blog", "Tutorial" };

var results = _findClient.Search<ArticlePage>()
    .Filter(x => x.Category.In(categories))
    .GetResult();
```

**After (Graph SDK):**

```csharp
var categories = new[] { "News", "Blog", "Tutorial" };

var results = await _graphClient
    .QueryContent<ArticlePage>()
    .Where(x => x.Category.In(categories))
    .GetAsContentAsync();
```

---

### Pagination & Sorting

#### `.Take()` {#take}

**Find:** `.Take(int count)`

**Graph SDK:** `.Limit(int count)`

**Behavior differences:** Find defaults to 10 results if `.Take()` is not
specified. Graph SDK also defaults to a limited result set. The method name
changes from `Take` to `Limit` but the behavior is identical.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .Take(20)
    .GetResult();
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .Limit(20)
    .GetAsContentAsync();
```

---

#### `.Skip()` {#skip}

**Find:** `.Skip(int count)`

**Graph SDK:** `.Skip(int count)`

**Behavior differences:** Identical. Both skip the specified number of results
for offset-based pagination.

**Before (Find):**

```csharp
int page = 2;
int pageSize = 10;

var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .GetResult();
```

**After (Graph SDK):**

```csharp
int page = 2;
int pageSize = 10;

var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .Skip((page - 1) * pageSize)
    .Limit(pageSize)
    .GetAsContentAsync();
```

---

#### `.OrderBy()` {#orderby}

**Find:** `.OrderBy(x => x.StartPublish)`

**Graph SDK:** `.OrderBy(x => x.StartPublish, OrderDirection.Ascending)`

**Behavior differences:** Find infers ascending direction by default with
`.OrderBy()`. Graph SDK requires an explicit `OrderDirection` parameter.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .OrderBy(x => x.StartPublish)
    .GetResult();
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .OrderBy(x => x.StartPublish, OrderDirection.Ascending)
    .GetAsContentAsync();
```

---

#### `.OrderByDescending()` {#orderbydescending}

**Find:** `.OrderByDescending(x => x.StartPublish)`

**Graph SDK:** `.OrderBy(x => x.StartPublish, OrderDirection.Descending)`

**Behavior differences:** Find has a separate `.OrderByDescending()` method.
Graph SDK unifies sort direction into a single `.OrderBy()` method with an
explicit `OrderDirection` enum parameter.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .OrderByDescending(x => x.StartPublish)
    .GetResult();
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .OrderBy(x => x.StartPublish, OrderDirection.Descending)
    .GetAsContentAsync();
```

---

#### `.OrderByRelevance()` {#orderbyrelevance}

**Find:** `.OrderByRelevance()`

**Graph SDK:** Default behavior, or `.WithRankingMode(RankingMode.Relevance)`
for explicit control.

**Behavior differences:** Both systems sort by relevance score by default when
a free-text query is present. Find's `.OrderByRelevance()` explicitly resets
to relevance ordering. In Graph SDK, relevance ordering is the default when
`.SearchFor()` is used without an explicit `.OrderBy()`.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .OrderByRelevance()
    .GetResult();
```

**After (Graph SDK):**

```csharp
// Relevance is the default when using SearchFor without OrderBy
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .GetAsContentAsync();

// Explicit relevance ranking mode
var explicitResults = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .WithRankingMode(RankingMode.Relevance)
    .GetAsContentAsync();
```

---

### Faceting

#### `.TermsFacetFor()` {#termsfacetfor}

**Find:** `.TermsFacetFor(x => x.Category)`

**Graph SDK:** `.Facet(x => x.Category)`

**Behavior differences:** Find returns a `TermsFacet` with terms and counts.
Graph SDK returns facet results as part of the query response. The access
pattern for reading facet results differs: Find uses
`.TermsFacetFor(x => x.Category)` on the result object, while Graph SDK
provides facets in the response metadata.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .TermsFacetFor(x => x.Category)
    .GetResult();

var categoryFacet = results.TermsFacetFor(x => x.Category);
foreach (var term in categoryFacet.Terms)
{
    Console.WriteLine($"{term.Term}: {term.Count}");
}
```

**After (Graph SDK):**

```csharp
var result = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .Facet(x => x.Category)
    .GetAsync();

var categoryFacets = result.Facets;
foreach (var facet in categoryFacets)
{
    Console.WriteLine($"{facet.Name}: {facet.Count}");
}
```

---

#### `.TermsFacetForWordsIn()` {#termsfacetforwordsin}

**Find:** `.TermsFacetForWordsIn(x => x.MainBody)`

**Graph SDK:** **NO DIRECT EQUIVALENT.** See [Capability Gaps](#3-capability-gaps).

**Behavior differences:** Find's `.TermsFacetForWordsIn()` tokenizes a text
field and produces a term frequency facet for individual words within it.
Graph SDK's `.Facet()` operates on discrete field values, not on tokenized
words within a text field.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .TermsFacetForWordsIn(x => x.MainBody)
    .GetResult();

var wordFacet = results.TermsFacetFor(x => x.MainBody);
foreach (var word in wordFacet.Terms)
{
    Console.WriteLine($"{word.Term}: {word.Count}");
}
```

**After (Graph SDK):**

```csharp
// No direct equivalent. Workaround: pre-process content to extract
// keywords into a dedicated string[] property on the content type,
// then facet on that property.

// Step 1: Add a Keywords property to your content type:
// [Display(Name = "Keywords")]
// public virtual IList<string> ExtractedKeywords { get; set; }

// Step 2: Populate it during content save via an event handler.

// Step 3: Facet on the keywords property:
var result = await _graphClient
    .QueryContent<ArticlePage>()
    .Facet(x => x.ExtractedKeywords)
    .GetAsync();
```

---

#### `.HistogramFacetFor()` {#histogramfacetfor}

**Find:** `.HistogramFacetFor(x => x.Price, 50)`

**Graph SDK:** `.Facet(x => x.Price)` with explicit range filters.

**Behavior differences:** Find's histogram facet auto-generates buckets at a
fixed numeric interval. Graph SDK does not have a built-in histogram mode.
Instead, define explicit ranges using facet range configuration.

**Before (Find):**

```csharp
var results = _findClient.Search<ProductPage>()
    .HistogramFacetFor(x => x.Price, 50) // buckets: 0-50, 50-100, ...
    .GetResult();

var priceFacet = results.HistogramFacetFor(x => x.Price);
foreach (var bucket in priceFacet.Entries)
{
    Console.WriteLine($"{bucket.Key}: {bucket.Count}");
}
```

**After (Graph SDK):**

```csharp
var result = await _graphClient
    .QueryContent<ProductPage>()
    .Facet(x => x.Price, facet => facet
        .AddRange(0, 50)
        .AddRange(50, 100)
        .AddRange(100, 200)
        .AddRange(200, 500)
        .AddRange(500, null)) // 500+
    .GetAsync();

foreach (var range in result.Facets)
{
    Console.WriteLine($"{range.Name}: {range.Count}");
}
```

---

#### `.DateHistogramFacetFor()` {#datehistogramfacetfor}

**Find:** `.DateHistogramFacetFor(x => x.StartPublish, DateInterval.Month)`

**Graph SDK:** `.Facet(x => x.StartPublish)` with `FacetDateTimeUnit`.

**Behavior differences:** Find uses `DateInterval` enum values (`Day`, `Week`,
`Month`, `Quarter`, `Year`). Graph SDK uses `FacetDateTimeUnit` with similar
values. The configuration syntax differs but produces equivalent date-bucketed
facets.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .DateHistogramFacetFor(x => x.StartPublish, DateInterval.Month)
    .GetResult();

var dateFacet = results.DateHistogramFacetFor(x => x.StartPublish);
foreach (var entry in dateFacet.Entries)
{
    Console.WriteLine($"{entry.Key:yyyy-MM}: {entry.Count}");
}
```

**After (Graph SDK):**

```csharp
var result = await _graphClient
    .QueryContent<ArticlePage>()
    .Facet(x => x.StartPublish, facet => facet
        .Unit(FacetDateTimeUnit.Month))
    .GetAsync();

foreach (var bucket in result.Facets)
{
    Console.WriteLine($"{bucket.Name}: {bucket.Count}");
}
```

---

### Caching & Best Bets

#### `.StaticallyCacheFor()` {#staticallycachefor}

**Find:** `.StaticallyCacheFor(TimeSpan.FromMinutes(10))`

**Graph SDK:**
`.WithCacheOptions(opts => opts.AbsoluteExpiration = TimeSpan.FromMinutes(10))`

**Behavior differences:** Find's caching is based on the search request hash
and caches the full Elasticsearch response. Graph SDK caches at the GraphQL
response level. Both use absolute expiration semantics. Graph SDK also
supports sliding expiration via `opts.SlidingExpiration`.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .StaticallyCacheFor(TimeSpan.FromMinutes(10))
    .GetResult();
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .WithCacheOptions(opts =>
        opts.AbsoluteExpiration = TimeSpan.FromMinutes(10))
    .GetAsContentAsync();
```

---

#### `.BestBetFor()` / `.ApplyBestBets()` {#bestbetfor--applybestbets}

**Find:** `.BestBetFor("optimizely cms")` or `.ApplyBestBets()`

**Graph SDK:** `.WithPinned(phrase, collectionId)` to pin specific content for
a search phrase.

**Behavior differences:** Find's Best Bets are managed through the Find UI
and automatically surface editor-curated content at the top of results.
Graph SDK uses `.WithPinned()` which requires programmatic configuration of
pinned content by phrase and collection ID. Graph SDK does not have a built-in
editorial UI for managing best bets. See [Capability Gaps](#3-capability-gaps)
for workaround details.

**Before (Find):**

```csharp
// Using editor-managed best bets
var results = _findClient.Search<ArticlePage>()
    .For("optimizely cms")
    .ApplyBestBets()
    .GetResult();

// Or for a specific phrase
var bestBetResults = _findClient.Search<ArticlePage>()
    .For("getting started")
    .BestBetFor("getting started")
    .GetResult();
```

**After (Graph SDK):**

```csharp
// Pin specific content for a phrase
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely cms")
    .WithPinned("optimizely cms", collectionId: "my-collection")
    .GetAsContentAsync();
```

---

### Specialized

#### `.UnifiedSearch()` / `.UnifiedSearchFor()` {#unifiedsearch}

**Find:** `_findClient.UnifiedSearchFor("query")` or
`_findClient.UnifiedSearch().For("query")`

**Graph SDK:** `_graphClient.QueryContent<IContentData>()` or use a shared
base type to search across all content types.

**Behavior differences:** Find's Unified Search searches across all indexed
content types in a single query and returns mixed results. Graph SDK does not
have a dedicated "unified search" method. Instead, query against the base
`IContentData` interface or a shared base type to achieve the same cross-type
search. Result types must be cast to their concrete types for type-specific
property access. See [Capability Gaps](#3-capability-gaps).

**Before (Find):**

```csharp
using EPiServer.Find.UnifiedSearch;

var unifiedResults = _findClient.UnifiedSearchFor("optimizely")
    .Take(20)
    .GetResult();

foreach (var hit in unifiedResults.Hits)
{
    Console.WriteLine($"{hit.Title} - {hit.Url}");
}
```

**After (Graph SDK):**

```csharp
// Search across all content types using the base interface
var results = await _graphClient
    .QueryContent<IContentData>()
    .SearchFor("optimizely")
    .Limit(20)
    .GetAsContentAsync();

foreach (var item in results)
{
    var content = item as IContent;
    if (content != null)
    {
        Console.WriteLine($"{content.Name}");
    }
}
```

---

#### `IClient.Search<T>()` {#iclientsearch}

**Find:** `IClient.Search<T>()` -- entry point for all typed searches.

**Graph SDK:** `IGraphContentClient.QueryContent<T>()` -- entry point for all
typed queries.

**Behavior differences:** Both are the primary entry points for constructing
queries against a specific content type. The key differences are:

- Find's `IClient` is registered automatically via the Find NuGet package.
  Graph SDK's `IGraphContentClient` requires explicit registration via
  `.AddContentGraph()` and `.AddGraphContentClient()`.
- Find queries are synchronous by default (`.GetResult()`). Graph SDK queries
  are async-only (`.GetAsync()`, `.GetAsContentAsync()`).
- Find uses Elasticsearch Query DSL under the hood. Graph SDK uses GraphQL.

**Before (Find):**

```csharp
using EPiServer.Find;

public class SearchService
{
    private readonly IClient _findClient;

    public SearchService(IClient findClient)
    {
        _findClient = findClient;
    }

    public SearchResults<BlogPost> SearchBlogs(string query)
    {
        return _findClient.Search<BlogPost>()
            .For(query)
            .Filter(x => x.Status.Match("Published"))
            .OrderByDescending(x => x.StartPublish)
            .Take(10)
            .GetResult();
    }
}
```

**After (Graph SDK):**

```csharp
using Optimizely.ContentGraph.Sdk;
using Optimizely.ContentGraph.Sdk.Queries;

public class SearchService
{
    private readonly IGraphContentClient _graphClient;

    public SearchService(IGraphContentClient graphClient)
    {
        _graphClient = graphClient;
    }

    public async Task<IEnumerable<BlogPost>> SearchBlogsAsync(string query)
    {
        var results = await _graphClient
            .QueryContent<BlogPost>()
            .SearchFor(query)
            .Where(x => x.Status.Eq("Published"))
            .OrderBy(x => x.StartPublish, OrderDirection.Descending)
            .Limit(10)
            .GetAsContentAsync();

        return results;
    }
}
```

---

### Result Methods

#### `.GetResult()` {#getresult}

**Find:** `.GetResult()` -- synchronous result retrieval.

**Graph SDK:** `.GetAsync()` -- asynchronous result retrieval returning raw
query response with metadata (facets, total count).

**Behavior differences:** Find's `.GetResult()` is synchronous and returns
a `SearchResults<T>` object containing hits, facets, and total count.
Graph SDK's `.GetAsync()` is asynchronous and returns the raw GraphQL response
object. For typed content results, use `.GetAsContentAsync()` instead.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .Take(10)
    .GetResult();

int totalHits = results.TotalMatching;
var hits = results.Hits;
foreach (var hit in hits)
{
    ArticlePage article = hit.Document;
    double score = hit.Score;
    Console.WriteLine($"{article.Title} (score: {score})");
}
```

**After (Graph SDK):**

```csharp
var result = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .Limit(10)
    .GetAsync();

int totalHits = result.TotalCount;
var items = result.Items;
foreach (var item in items)
{
    Console.WriteLine($"{item.Name}");
}
```

---

#### `.GetContentResult()` {#getcontentresult}

**Find:** `.GetContentResult()` -- synchronous, returns strongly-typed
`IContent` objects resolved from the CMS.

**Graph SDK:** `.GetAsContentAsync()` -- asynchronous, returns strongly-typed
content objects.

**Behavior differences:** Find's `.GetContentResult()` fetches search results
from Elasticsearch and then resolves each hit to a live `IContent` object
from the CMS content repository. Graph SDK's `.GetAsContentAsync()` hydrates
content objects directly from the Graph API response. Graph SDK content is
read-only and reflects the indexed state, not the live CMS state. For live
CMS state, load content from `IContentRepository` using the content links
returned from Graph.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .Take(10)
    .GetContentResult();

foreach (ArticlePage article in results)
{
    Console.WriteLine($"{article.Title} - {article.MainBody}");
}
```

**After (Graph SDK):**

```csharp
var results = await _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("optimizely")
    .Limit(10)
    .GetAsContentAsync();

foreach (ArticlePage article in results)
{
    Console.WriteLine($"{article.Title} - {article.MainBody}");
}
```

---

#### `.GetContentResultSafe()` {#getcontentresultsafe}

**Find:** `.GetContentResultSafe()` -- same as `.GetContentResult()` but
silently skips items that fail to resolve (deleted content, access denied,
deserialization errors).

**Graph SDK:** **NO DIRECT EQUIVALENT.** Wrap `.GetAsContentAsync()` in
try/catch or filter nulls. See [Capability Gaps](#3-capability-gaps).

**Behavior differences:** Find's `.GetContentResultSafe()` catches resolution
errors per item and excludes failed items from the result set. Graph SDK does
not have a built-in safe variant. Content returned by Graph is from the indexed
state so resolution failures are less common, but deserialization errors can
still occur.

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("optimizely")
    .Take(10)
    .GetContentResultSafe();

// Deleted or inaccessible items are silently excluded
foreach (ArticlePage article in results)
{
    Console.WriteLine(article.Title);
}
```

**After (Graph SDK):**

```csharp
IEnumerable<ArticlePage> results;
try
{
    results = await _graphClient
        .QueryContent<ArticlePage>()
        .SearchFor("optimizely")
        .Limit(10)
        .GetAsContentAsync();
}
catch (Exception ex)
{
    // Log and return empty set on complete failure
    _logger.LogError(ex, "Graph query failed");
    results = Enumerable.Empty<ArticlePage>();
}

// Filter out any null items that may result from deserialization issues
var safeResults = results.Where(r => r != null);
foreach (ArticlePage article in safeResults)
{
    Console.WriteLine(article.Title);
}
```

---

## 3. Capability Gaps

Features in Find that have no direct equivalent in the Graph SDK. Each gap
includes severity and recommended workaround.

### Gap: `.MatchFuzzy()` fine-grained control

| | |
|---|---|
| **Find feature** | `.MatchFuzzy(string, FuzzyOptions)` |
| **Description** | Fuzzy matching with configurable edit distance, prefix length, max expansions, and transposition support. Uses Elasticsearch's fuzzy query DSL. |
| **Severity** | **Manageable** |
| **Workaround** | Graph SDK's `.SearchFor()` includes built-in fuzzy matching. For wildcard-style matching, use `.Like("pattern%")`. Fine-grained edit-distance control is not available. If exact fuzziness tuning is critical, pre-process queries to generate variant spellings or use a custom synonym list in Content Graph configuration. |

### Gap: `.MatchContained()` on nested objects

| | |
|---|---|
| **Find feature** | `.MatchContained(x => x.Collection, y => y.NestedProp, value)` |
| **Description** | Matches a value within a property of objects in a nested collection. Uses Elasticsearch nested queries. |
| **Severity** | **Manageable** |
| **Workaround** | Use `.Where(x => x.Collection.Any(y => y.NestedProp.Eq(value)))` if the nested type is indexed. For complex nested structures not supported by Graph SDK's query builder, flatten the data into a searchable string property at index time. |

### Gap: `.FilterHits()` post-facet filtering

| | |
|---|---|
| **Find feature** | `.FilterHits(expr)` |
| **Description** | Applies a filter on the result set after facet counts are computed. Facet counts reflect the unfiltered population while results are filtered. |
| **Severity** | **Manageable** |
| **Workaround** | Issue two separate queries: one for facets (without the filter, using `.Limit(0)`) and one for results (with `.Where()` filter applied). Combine the responses client-side. |

### Gap: `.FilterForVisitor()` automatic access control

| | |
|---|---|
| **Find feature** | `.FilterForVisitor()` |
| **Description** | Automatically applies content access control and published-status filtering based on the current visitor's identity and roles. |
| **Severity** | **Manageable** |
| **Workaround** | Graph SDK returns only published content by default for anonymous queries. For authenticated content, use `.WithAuth().AsUser(token)`. Explicit role-based filtering must be implemented in your query logic if Find's visitor group-aware filtering was used. |

### Gap: `.UnifiedSearch()` / `.UnifiedSearchFor()` cross-type search

| | |
|---|---|
| **Find feature** | `IClient.UnifiedSearchFor(query)` |
| **Description** | Searches across all indexed content types and returns a unified result set with common properties (Title, Url, Excerpt). |
| **Severity** | **Manageable** |
| **Workaround** | Query against `IContentData` as the type parameter: `_graphClient.QueryContent<IContentData>()`. Results are returned as base content objects and must be cast to concrete types for type-specific property access. The unified result properties (Title, Url, Excerpt) that Find auto-generates are not available; select common properties explicitly or create a shared base type with these fields. |

### Gap: `.BestBetFor()` / `.ApplyBestBets()` editorial management

| | |
|---|---|
| **Find feature** | `.BestBetFor(phrase)` and `.ApplyBestBets()` |
| **Description** | Surfaces editor-curated "best bet" results at the top of search results for specific phrases. Managed through Find's editorial UI. |
| **Severity** | **Manageable** |
| **Workaround** | Use `.WithPinned(phrase, collectionId)` to programmatically pin content for phrases. There is no built-in editorial UI for managing pinned content in Graph SDK. Build a custom admin interface backed by a configuration store (database table, JSON settings, or CMS settings content) to let editors manage phrase-to-content mappings. |

### Gap: `.TermsFacetForWordsIn()` word-level faceting

| | |
|---|---|
| **Find feature** | `.TermsFacetForWordsIn(x => x.MainBody)` |
| **Description** | Tokenizes a text field and returns term-frequency facets for individual words within that field. Useful for tag clouds and word analysis. |
| **Severity** | **Manageable** |
| **Workaround** | Pre-process content to extract keywords into a dedicated `IList<string>` property (e.g., `ExtractedKeywords`). Populate it during content save with an `IContentEvents.PublishingContent` event handler. Then use `.Facet(x => x.ExtractedKeywords)` to achieve word-level faceting. |

### Gap: `.GetContentResultSafe()` error-tolerant results

| | |
|---|---|
| **Find feature** | `.GetContentResultSafe()` |
| **Description** | Returns content results while silently excluding items that fail to resolve (deleted, access denied, deserialization errors). |
| **Severity** | **Manageable** |
| **Workaround** | Wrap `.GetAsContentAsync()` in a try/catch block. Filter out null items from the result set: `.Where(r => r != null)`. Graph SDK results come from the indexed state, so resolution failures are less frequent than with Find (which resolves from the live CMS repository). |

### Gap: `.MatchCaseInsensitive()` explicit method

| | |
|---|---|
| **Find feature** | `.MatchCaseInsensitive(string)` |
| **Description** | Performs case-insensitive matching as an explicit opt-in. |
| **Severity** | **Manageable** |
| **Workaround** | Graph SDK string operations (`.Match()`, `.FilterContains()`, `.Eq()`) are case-insensitive by default. No workaround needed. This gap is cosmetic -- the functionality exists, only the explicit method name does not. |

### Gap: `.InField()` / `.AndInField()` separate methods

| | |
|---|---|
| **Find feature** | `.InField(expr)` and `.AndInField(expr)` |
| **Description** | Restricts free-text search to specific fields using separate initial and chained methods. |
| **Severity** | **Manageable** |
| **Workaround** | Use multiple `.UsingField(expr)` calls. Graph SDK unifies both methods into a single repeatable `.UsingField()` call with optional boost parameter. Functionally equivalent. |

### Gap: `.UsingSynonyms()` query-wide synonyms {#usingsynonyms}

| | |
|---|---|
| **Find feature** | `.UsingSynonyms()` |
| **Description** | Applies synonym expansion to the entire query. A single call enables synonyms for all terms. |
| **Severity** | **Manageable** |
| **Workaround** | Graph SDK applies synonyms per-filter via `SynonymSlot`, not query-wide. Use `.Match("value", SynonymSlot.One)` on individual filter expressions. The query must be restructured to attach synonyms to specific filters. If `.UsingSynonyms()` is used without a specific filter to attach to, the code requires manual architectural rework. |

### Gap: `.Track()` analytics tracking {#track}

| | |
|---|---|
| **Find feature** | `.Track()` |
| **Description** | Enables analytics tracking for the query, recording search terms and click-through behavior for the Find statistics dashboard. |
| **Severity** | **Manageable** |
| **Workaround** | Remove `.Track()`. Graph SDK does not support tracking. Optionally add `.WithName("queryName")` for query identification in logs. Analytics must be handled by an external system. |

### Gap: `.Select()` anonymous projections {#select}

| | |
|---|---|
| **Find feature** | `.Select(x => new { x.Title, x.StartPublish })` |
| **Description** | Projects search results into anonymous types, selecting only specific fields. |
| **Severity** | **Manageable** |
| **Workaround** | Use `.Fields<TProjection>(x => x.Title, x => x.StartPublish)` where `TProjection` is a POCO class. Graph SDK does not support anonymous types — you must define a named class. TProjection must NOT implement `IContentData`. Do NOT combine `.Fields()` with `.GetAsContentAsync()` — use `.GetAsync()` instead. |

**Before (Find):**

```csharp
var results = _findClient.Search<ArticlePage>()
    .For("news")
    .Select(x => new { x.Title, x.StartPublish })
    .GetResult();
```

**After (Graph SDK):**

```csharp
public class ArticleProjection
{
    public string Title { get; set; }
    public DateTime? StartPublish { get; set; }
}

var results = await _graphClient.QueryContent<ArticlePage>()
    .SearchFor("news")
    .Fields<ArticleProjection>(x => x.Title, x => x.StartPublish)
    .GetAsync();
```

### Gap: `SearchClient.Instance` static singleton {#searchclient-instance}

| | |
|---|---|
| **Find feature** | `SearchClient.Instance` |
| **Description** | Static singleton for accessing the Find client without dependency injection. Common in older codebases, scheduled jobs, and non-DI contexts. |
| **Severity** | **Significant** |
| **Workaround** | Replace with constructor-injected `IGraphContentClient`. This may require architectural changes to introduce DI into classes that previously used the static singleton. For scheduled jobs, use the job's constructor injection. For code in non-DI contexts, refactor to accept the client as a parameter. |

### Gap: `Statistics().GetAutocompleteAsync()` {#statistics-autocomplete}

| | |
|---|---|
| **Find feature** | `Statistics().GetAutocompleteAsync("prefix", maxItems)` |
| **Description** | Returns autocomplete suggestions based on search statistics and indexed content terms. |
| **Severity** | **Manageable** |
| **Workaround** | Use `.Autocomplete(x => x.Title, "prefix", limit: 5)` on a `QueryContent<T>()` call. `Statistics().GetDidYouMeanAsync()` has no equivalent — consider `.Autocomplete()` as a partial replacement. The Statistics REST API endpoints (`_autocomplete`, `_stats`) are Find-specific and do not exist in Graph SDK. |

### Gap: `.OrFilter()` filter composition {#orfilter}

| | |
|---|---|
| **Find feature** | `.Filter(filterA).OrFilter(filterB).OrFilter(filterC)` |
| **Description** | Combines multiple filter expressions with OR logic in a method chain. |
| **Severity** | **Manageable** |
| **Workaround** | Use `BuildFilter<T>()` to compose an OR filter: `_graphClient.BuildFilter<T>().Or(x => filterA).Or(x => filterB)`, then pass the combined filter to `.Filter(filter)`. |

### Gap: `.WithHighlight()` result highlighting {#withhighlight}

| | |
|---|---|
| **Find feature** | `.WithHighlight(spec)` |
| **Description** | Highlights matching terms in search result fields with configurable tags. |
| **Severity** | **Manageable** |
| **Workaround** | Use `.UsingFullText(highlightTag: "<mark>")` to highlight matching terms. The highlight tag is configurable. |

### Gap: `ContentIndexer.Instance` manual indexing

| | |
|---|---|
| **Find feature** | `ContentIndexer.Instance.IndexAsync()` / `.DeleteAsync()` |
| **Description** | Manually triggers content indexing or deletion from the Find index. |
| **Severity** | **Manageable** |
| **Workaround** | Graph SDK handles indexing automatically through content synchronization events. The explicit manual indexing API may be obsolete. For force-reindexing, use the Content Graph admin tools. |

### Gap: `ISearchProvider` custom implementations

| | |
|---|---|
| **Find feature** | Custom `ISearchProvider` implementations |
| **Description** | Custom search provider implementations that hook into the CMS search UI. |
| **Severity** | **Significant** |
| **Workaround** | No Graph SDK equivalent. Requires architectural redesign. Custom search provider logic must be reimplemented as standard search services or controllers using `IGraphContentClient`. |

### Gap: `.FilterFacet()` boolean count facets

| | |
|---|---|
| **Find feature** | `.FilterFacet("name", expr)` |
| **Description** | Named boolean facets that count documents matching a filter expression. |
| **Severity** | **Manageable** |
| **Workaround** | No direct equivalent. Restructure as a standard facet with a filter, or issue a separate query with `.Limit(0)` and `.IncludeTotal()` to get the count for a specific filter condition. |

---

## 4. DI Registration Migration

### Find: Automatic Registration

Find registers its services automatically when the NuGet package is installed
and configured in `appsettings.json`.

**Before (Find) -- `Startup.cs`:**

```csharp
using EPiServer.Find;
using EPiServer.Find.Cms;
using EPiServer.DependencyInjection;

public class Startup
{
    private readonly IConfiguration _configuration;

    public Startup(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public void ConfigureServices(IServiceCollection services)
    {
        services.AddCms();

        // Find registers IClient automatically via configuration
        services.AddFind();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        app.UseFind();
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapContent();
        });
    }
}
```

**Before (Find) -- `appsettings.json`:**

```json
{
  "EPiServer": {
    "Find": {
      "ServiceUrl": "https://demo01.find.episerver.net/abc123",
      "DefaultIndex": "my_site_index",
      "TrackingEnabled": true
    }
  }
}
```

**Before (Find) -- Constructor injection:**

```csharp
using EPiServer.Find;
using EPiServer.Find.Cms;

public class SearchController : Controller
{
    private readonly IClient _findClient;

    public SearchController(IClient findClient)
    {
        _findClient = findClient;
    }

    public ActionResult Search(string query)
    {
        var results = _findClient.Search<ArticlePage>()
            .For(query)
            .Filter(x => x.Status.Match("Published"))
            .TermsFacetFor(x => x.Category)
            .OrderByDescending(x => x.StartPublish)
            .Skip(0)
            .Take(10)
            .GetContentResult();

        return View(results);
    }

    public ActionResult BlogSearch(string query)
    {
        var results = _findClient.Search<BlogPost>()
            .For(query)
            .OrderByDescending(x => x.Created)
            .Take(20)
            .GetContentResultSafe();

        return View(results);
    }

    public ActionResult ProductSearch(string query, decimal? minPrice, decimal? maxPrice)
    {
        var search = _findClient.Search<ProductPage>()
            .For(query)
            .HistogramFacetFor(x => x.Price, 100)
            .StaticallyCacheFor(TimeSpan.FromMinutes(5));

        if (minPrice.HasValue)
            search = search.Filter(x => x.Price.GreaterThan(minPrice.Value));
        if (maxPrice.HasValue)
            search = search.Filter(x => x.Price.LessThan(maxPrice.Value));

        var results = search.GetContentResult();
        return View(results);
    }
}
```

---

### Graph SDK: Explicit Registration

Graph SDK requires explicit service registration and uses a different
configuration section.

**After (Graph SDK) -- `Startup.cs`:**

```csharp
using Optimizely.ContentGraph.Sdk;
using Optimizely.ContentGraph.Sdk.DependencyInjection;
using EPiServer.DependencyInjection;

public class Startup
{
    private readonly IConfiguration _configuration;

    public Startup(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public void ConfigureServices(IServiceCollection services)
    {
        services.AddCms();

        // Graph SDK requires explicit registration
        services.AddContentGraph(_configuration);
        services.AddGraphContentClient();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapContent();
        });
    }
}
```

**After (Graph SDK) -- `appsettings.json`:**

```json
{
  "Optimizely": {
    "ContentGraph": {
      "GatewayAddress": "https://cg.optimizely.com",
      "AppKey": "your-app-key-here",
      "Secret": "your-secret-here",
      "SingleKey": "your-single-key-here",
      "AllowSendingLog": true
    }
  }
}
```

**After (Graph SDK) -- Constructor injection:**

```csharp
using Optimizely.ContentGraph.Sdk;
using Optimizely.ContentGraph.Sdk.Queries;

public class SearchController : Controller
{
    private readonly IGraphContentClient _graphClient;
    private readonly ILogger<SearchController> _logger;

    public SearchController(
        IGraphContentClient graphClient,
        ILogger<SearchController> logger)
    {
        _graphClient = graphClient;
        _logger = logger;
    }

    public async Task<IActionResult> Search(string query)
    {
        var result = await _graphClient
            .QueryContent<ArticlePage>()
            .SearchFor(query)
            .Where(x => x.Status.Eq("Published"))
            .Facet(x => x.Category)
            .OrderBy(x => x.StartPublish, OrderDirection.Descending)
            .Skip(0)
            .Limit(10)
            .GetAsContentAsync();

        return View(result);
    }

    public async Task<IActionResult> BlogSearch(string query)
    {
        IEnumerable<BlogPost> results;
        try
        {
            results = await _graphClient
                .QueryContent<BlogPost>()
                .SearchFor(query)
                .OrderBy(x => x.Created, OrderDirection.Descending)
                .Limit(20)
                .GetAsContentAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Blog search query failed for: {Query}", query);
            results = Enumerable.Empty<BlogPost>();
        }

        var safeResults = results.Where(r => r != null);
        return View(safeResults);
    }

    public async Task<IActionResult> ProductSearch(
        string query, decimal? minPrice, decimal? maxPrice)
    {
        var search = _graphClient
            .QueryContent<ProductPage>()
            .SearchFor(query)
            .Facet(x => x.Price, facet => facet
                .AddRange(0, 100)
                .AddRange(100, 200)
                .AddRange(200, 500)
                .AddRange(500, null))
            .WithCacheOptions(opts =>
                opts.AbsoluteExpiration = TimeSpan.FromMinutes(5));

        if (minPrice.HasValue)
            search = search.Where(x => x.Price.Gt(minPrice.Value));
        if (maxPrice.HasValue)
            search = search.Where(x => x.Price.Lt(maxPrice.Value));

        var result = await search.GetAsContentAsync();
        return View(result);
    }
}
```

---

### NuGet Package Changes

| Find Package | Action | Graph SDK Package |
|-------------|--------|-------------------|
| `EPiServer.Find` | Replace | `Optimizely.Graph.Cms` + `Optimizely.Graph.Cms.Query` |
| `EPiServer.Find.Cms` | Replace | `Optimizely.Graph.Cms` + `Optimizely.Graph.Cms.Query` |
| `EPiServer.Find.UI` | Remove | (no equivalent; use Content Graph UI in Optimizely portal) |

**CRITICAL**: `Optimizely.Graph.Cms.Query` version must match the CMS
version exactly. Check `EPiServer.CMS` version in `.csproj` first.

**Migration commands:**

```shell
# Remove Find packages
dotnet remove package EPiServer.Find
dotnet remove package EPiServer.Find.Cms
dotnet remove package EPiServer.Find.UI

# Add Graph SDK packages (both required)
dotnet add package Optimizely.Graph.Cms
dotnet add package Optimizely.Graph.Cms.Query
```

---

### Namespace Changes

| Find Namespace | Graph SDK Namespace |
|----------------|---------------------|
| `EPiServer.Find` | `Optimizely.Graph.Cms.Query` |
| `EPiServer.Find.Api` | `Optimizely.Graph.Cms.Query.Abstractions` |
| `EPiServer.Find.Cms` | `Optimizely.Graph.Cms.Query` |
| `EPiServer.Find.UnifiedSearch` | (use `IContentData` as type parameter) |
| `EPiServer.Find.Framework` | `Optimizely.Graph.DependencyInjection` |
| `EPiServer.Find.Api.Facets` | `Optimizely.Graph.Cms.Query.Filtering` |
| (DI registration extensions) | `Optimizely.Cms.DependencyInjection` (for `AddContentGraph()`) |
| (DI registration extensions) | `Optimizely.Graph.DependencyInjection` (for `AddGraphContentClient()`) |

---

### Key Migration Summary

| Concern | Find | Graph SDK |
|---------|------|-----------|
| Entry point | `IClient` / `SearchClient.Instance` | `IGraphContentClient` (DI only) |
| Registration | `services.AddFind()` | `services.AddContentGraph(config)` + `services.AddGraphContentClient()` |
| Config section | `EPiServer:Find` | `Optimizely:ContentGraph` |
| Query builder | `_client.Search<T>()` | `_client.QueryContent<T>()` (T : IContentData) / `_client.Query<T>()` |
| Free-text search | `.For(query)` | `.SearchFor(query)` |
| Field search | `.InField(expr)` / `.AndInField(expr)` | `.UsingField(expr, boost)` |
| All fields | `.InAllField()` | `.UsingFullText()` |
| Filter | `.Filter(expr)` | `.Where(expr)` |
| OR filter | `.OrFilter(expr)` | `BuildFilter<T>().Or(x => ...)` |
| Synonyms | `.UsingSynonyms()` (query-wide) | `.Match("val", SynonymSlot.One)` (per-filter) |
| Page size | `.Take(n)` | `.Limit(n)` |
| Sort ascending | `.OrderBy(expr)` | `.OrderBy(expr, OrderDirection.Ascending)` |
| Sort descending | `.OrderByDescending(expr)` | `.OrderBy(expr, OrderDirection.Descending)` |
| Facets | `.TermsFacetFor(expr)` | `.Facet(expr)` |
| Facet results | `result.TermsFacetFor(expr)` | `result.Facets.GetFacet(expr)` |
| Projection | `.Select(x => new { ... })` | `.Fields<TProjection>(x => x.Prop)` |
| Caching | `.StaticallyCacheFor(ts)` | `.WithCacheOptions(opts => ...)` / `.WithoutCache()` |
| Best bets | `.ApplyBestBets()` | `.WithPinned(phrase, collectionId)` |
| Language | `.Language(lang)` | `.SetLocale("code")` |
| Tracking | `.Track()` | Remove (use `.WithName("name")` for identification) |
| Display filters | Automatic | `.WithDisplayFilters()` (explicit opt-in) |
| Autocomplete | `Statistics().GetAutocompleteAsync()` | `.Autocomplete(x => x.Prop, prefix, limit)` |
| Sync result | `.GetResult()` | `.GetAsync()` (async) |
| Content result | `.GetContentResult()` | `.GetAsContentAsync()` (async) |
| Result items | `result.Hits` / `hit.Document` | `result.Items` (direct content) |
| Total count | `result.TotalMatching` | `result.Total` (nullable; requires `.IncludeTotal()`) |
| Execution model | Synchronous | **Async only** (`await`) |
| Generic constraint | `where T : IContentData` | `where T : class, IContentData` |
| Exception types | `ClientException` / `ServiceException` | `Exception` / `HttpRequestException` |
