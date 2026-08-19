# Third-Party Package Compatibility: CMS 12 → CMS 13

Many third-party packages used with CMS 12 are **not compatible** with CMS 13.
Attempting to upgrade without addressing these packages results in build failures,
`TypeLoadException` at runtime, or silent functional regression. Identify and
handle every third-party package **before** upgrading the core CMS packages.

---

## Compatibility Summary

| Package | CMS 12 Version | CMS 13 Status | Action |
|---------|---------------|---------------|--------|
| `EPiServer.Find.Cms` | 16.x | Not compatible | Remove |
| `EPiServer.Forms` | 5.10.x | Upgrade required | Upgrade to 6.0.0 |
| `EPiServer.Cms.WelcomeIntegration.UI` | 2.1.x | Not compatible | Replace with `EPiServer.Cms.DamIntegration.UI` |
| `Advanced.CMS.AdvancedReviews` | 1.4.x | Not compatible | Remove; await update |
| `Geta.NotFoundHandler.Optimizely` | 6.0.x | Not compatible | Remove; await update |
| `Geta.Optimizely.Sitemaps` | 3.2.x | Not compatible | Remove; await update |
| `Geta.Optimizely.GenericLinks` | 2.0.x | Not compatible | Remove; await update |
| `Geta.Optimizely.ContentTypeIcons` | 2.1.x | Not compatible | Remove; await update |
| `Geta.Optimizely.Categories` | 1.1.x | Not compatible | Remove; await update |
| `Gulla.Episerver.SqlStudio` | 3.0.1 | Upgrade required | Upgrade to 3.0.2+ |
| `Stott.Optimizely.RobotsHandler` | Various | Not compatible | Remove; await update |
| `EPiServer.ContentDeliveryApi.*` | Various | Not compatible | Remove; migrate to Graph |
| `EPiServer.ContentManagementApi` | Various | Not compatible | Remove; migrate to Graph |
| `EPiServer.ContentDefinitionsApi` | Various | Not compatible | Remove |
| `EPiServer.Marketing.Testing` | Various | Not compatible | Remove |
| `EPiServer.MarketingAutomationIntegration.*` | Various | Not compatible | Remove |
| `EPiServer.Labs.*` (all) | Various | Not compatible | Remove |

---

## EPiServer.Find.Cms (Search & Navigation)

**Status**: No CMS 13-compatible version exists.

**Impact**: Build failure. The package references APIs removed in CMS 13.

**Detection**:
- `EPiServer.Find` in `.csproj` PackageReference
- `services.AddFind()` in service registration
- `using EPiServer.Find`
- `SearchClient.Instance`
- `.GetContentResult()`

**Migration steps**:
1. Remove `EPiServer.Find.Cms` from `.csproj`
2. Remove `services.AddFind()` from service registration
3. Remove or replace dependent code — use the **find-to-graph** migration
   skill to convert Find queries to Optimizely Graph SDK
4. Remove companion packages (e.g., `Geta.Optimizely.Categories.Find`)
5. Add explicit `Newtonsoft.Json` package reference if other code depends on
   it (Find pulled it in transitively)

**Alternative**: Migrate to Optimizely Graph. See the `optimizely-find-to-graph` skill.

---

## EPiServer.Forms

**Status**: Check the Optimizely NuGet feed for a CMS 13-compatible version.
Version 6.0.0+ targets CMS 13 when available. If no compatible version exists
at migration time, remove the package.

**Detection**:
- `EPiServer.Forms` in `.csproj`
- `EPiServer.Forms.Core`, `EPiServer.Forms.UI`, `EPiServer.Forms.Samples` in `.csproj`
- `services.AddForms()` in service registration

**Migration steps** (if CMS 13 compatible version exists):
1. Update package version:
   ```shell
   dotnet add package EPiServer.Forms --version 6.*
   ```
2. Verify form submissions still work after upgrade
3. Test form rendering in both edit and view modes

**Migration steps** (if no compatible version available):
1. Remove all Forms packages (`EPiServer.Forms`, `Forms.Core`,
   `Forms.UI`, `Forms.Samples`, `Forms.ServiceApi`,
   `Forms.Crypto.AzureKeyVault`)
2. Remove service registrations and middleware
3. Implement form functionality using standard ASP.NET Core forms or
   a third-party form builder

---

## EPiServer.Cms.WelcomeIntegration.UI

**Status**: Not compatible. Replaced by `EPiServer.Cms.DamIntegration.UI`.

**Detection**:
- `EPiServer.Cms.WelcomeIntegration.UI` in `.csproj`
- `AddDAMUi()` service registration

**Migration steps**:
1. Remove `EPiServer.Cms.WelcomeIntegration.UI` from `.csproj`
2. Install replacement:
   ```shell
   dotnet add package EPiServer.Cms.DamIntegration.UI
   ```
3. Update `using` statements from `EPiServer.Cms.DamIntegration` to
   `Optimizely.Cms.DamIntegration` (namespace changed)

---

## Advanced.CMS.AdvancedReviews

**Status**: Not compatible. Fails due to `ServiceCollectionExtensions` types
moved to `EPiServer.DependencyInjection` namespace.

**Detection**:
- `Advanced.CMS.AdvancedReviews` in `.csproj`
- `services.AddAdvancedReviews()` in service registration

**Migration steps**:
1. Remove package from `.csproj`
2. Remove `services.AddAdvancedReviews()` from service registration
3. Await CMS 13-compatible version

---

## Geta.NotFoundHandler.Optimizely

**Status**: Not compatible. Uses removed `SortIndex` attribute property,
causing `TypeLoadException` at runtime.

**Detection**:
- `Geta.NotFoundHandler.Optimizely` in `.csproj`
- `services.AddNotFoundHandler()` in service registration
- `app.UseNotFoundHandler()` in middleware pipeline

**Migration steps**:
1. Remove package from `.csproj`
2. Remove service registration and middleware calls
3. Implement custom 404 handling if needed
4. Await CMS 13-compatible version

---

## Geta.Optimizely.Sitemaps

**Status**: Not compatible. Access modifier conflicts cause `TypeLoadException`.

**Detection**:
- `Geta.Optimizely.Sitemaps` in `.csproj`
- `services.AddSitemaps()` in service registration
- `SitemapOptions` configuration

**Migration steps**:
1. Remove package from `.csproj`
2. Remove service registration and configuration
3. Implement custom sitemap generation if needed
4. Await CMS 13-compatible version

---

## Geta.Optimizely.GenericLinks

**Status**: Not compatible. `PropertyLinkDataCollection` access modifier
conflicts cause `TypeLoadException`.

**Detection**:
- `Geta.Optimizely.GenericLinks` in `.csproj`
- Custom `LinkDataCollection<T>` usage
- `LinkData` subclasses

**Migration steps**:
1. Remove package from `.csproj`
2. Revert custom `LinkDataCollection<CustomLinkData>` to standard
   `LinkItemCollection`
3. Await CMS 13-compatible version

---

## Geta.Optimizely.ContentTypeIcons

**Status**: Not compatible. Build errors against CMS 13 APIs.

**Detection**:
- `Geta.Optimizely.ContentTypeIcons` in `.csproj`
- `[ContentTypeIcon]` attribute on content types
- `services.AddContentTypeIcons()` in service registration

**Migration steps**:
1. Remove package from `.csproj`
2. Remove `[ContentTypeIcon]` attributes from content types
3. Remove service registration
4. Use built-in `ImageUrl` on `[ContentType]` attribute as alternative
5. Await CMS 13-compatible version

---

## Geta.Optimizely.Categories

**Status**: Not compatible. `ContentReferenceListEditorDescriptor` constructor
changes cause failure.

**Detection**:
- `Geta.Optimizely.Categories` in `.csproj`
- `CategoryRoot`, `CategoryData` content types
- `services.AddCategories()` in service registration

**Migration steps**:
1. Remove package from `.csproj`
2. Remove service registration
3. Handle orphaned content types — add stub classes or clean database:
   ```csharp
   // Stub to prevent "could not create instance" errors
   [ContentType(GUID = "...", AvailableInEditMode = false)]
   public class CategoryRoot : PageData { }
   ```
4. Await CMS 13-compatible version

---

## Gulla.Episerver.SqlStudio

**Status**: Upgrade to 3.0.2 or later.

**Detection**:
- `Gulla.Episerver.SqlStudio` in `.csproj`
- Version 3.0.1 or below

**Migration steps**:
1. Upgrade package:
   ```shell
   dotnet add package Gulla.Episerver.SqlStudio --version 3.0.2
   ```
2. Ensure `services.AddSqlStudio()` is present in service registration

---

## Stott.Optimizely.RobotsHandler

**Status**: Not compatible. References types incompatible with CMS 13.

**Detection**:
- `Stott.Optimizely.RobotsHandler` in `.csproj`
- `services.AddRobotsHandler()` in service registration
- `app.UseRobotsHandler()` in middleware pipeline

**Migration steps**:
1. Remove package from `.csproj`
2. Remove service registration and middleware calls
3. Implement custom robots.txt handling if needed
4. Await CMS 13-compatible version

---

## EPiServer.ContentDeliveryApi / ContentManagementApi / ContentDefinitionsApi

**Status**: Not compatible. These content API packages reference types
removed or restructured in CMS 13.

**Detection**:
- `EPiServer.ContentDeliveryApi` in `.csproj`
- `EPiServer.ContentManagementApi` in `.csproj`
- `EPiServer.ContentDefinitionsApi` in `.csproj`
- `services.AddContentDeliveryApi()` in service registration
- `services.AddContentManagementApi()` in service registration
- `IContentDeliveryClient` in code

**Migration steps**:
1. Remove all Content API package references from `.csproj`
2. Remove service registrations (`AddContentDeliveryApi()`,
   `AddContentManagementApi()`, `AddContentDefinitionsApi()`)
3. Remove associated middleware configuration
4. **Migrate to Optimizely Graph** — Content Delivery API consumers
   should migrate to Graph-backed implementations:
   - Install `Optimizely.Graph.Cms` and `Optimizely.Graph.Cms.Query`
     (or `Optimizely.Graph.Cms.Querying`)
   - Register with `services.AddContentGraph()` and
     `services.AddGraphContentClient()`
   - Rewrite content delivery endpoints to use
     `IGraphContentClient.QueryContent<T>()` fluent API
   - Preserve existing response contracts where possible — use the
     Graph query result to build the same response shapes consumed by
     frontend clients
   - See the `optimizely-find-to-graph` skill for detailed query
     migration patterns

**Important**: If external clients depend on Content Delivery API
response shapes, plan a staged migration with feature flags to allow
gradual client-side cutover. Do not hard-cut without a rollback path.

---

## EPiServer.Marketing.Testing / MarketingAutomationIntegration

**Status**: Not compatible. These packages depend on APIs removed in CMS 13.

**Detection**:
- `EPiServer.Marketing.Testing` in `.csproj`
- `EPiServer.MarketingAutomationIntegration` in `.csproj`
- `services.AddMarketingTesting()` in service registration
- `using EPiServer.Marketing.Testing`

**Migration steps**:
1. Remove all Marketing Testing and Marketing Automation package references
2. Remove service registrations
3. Remove associated `using` directives
4. A/B testing functionality must be replaced with third-party tools or
   custom implementations

---

## EPiServer Labs Packages

**Status**: Not compatible. All experimental Labs packages are incompatible
with CMS 13.

**Known packages**:
- `EPiServer.Labs.BlockEnhancements`
- `EPiServer.Labs.ContentManager`
- `EPiServer.Labs.GridView`
- `EPiServer.Labs.LinkItemProperty`
- `EPiServer.Labs.ProjectEnhancements`
- `EPiServer.Labs.LanguageManager`

**Detection**:
- `EPiServer.Labs` in `.csproj` PackageReference

**Migration steps**:
1. Remove all `EPiServer.Labs.*` package references
2. Remove associated service registrations
3. Await CMS 13-compatible versions

---

## Orphaned Artifacts After Package Removal

### Orphaned Scheduled Jobs

Removing packages that registered scheduled jobs leaves orphaned job
definitions in the database. These produce warnings at startup but do not
block the application.

**Resolution**: Delete orphaned jobs in admin UI under **Settings** >
**Scheduled Jobs**.

Common orphaned jobs after package removal:
- Search & Navigation indexing jobs
- Forms cleanup jobs
- NotFoundHandler cleanup jobs
- Sitemaps generation jobs

### Orphaned Content Types

Removing packages that registered content types leaves orphaned type
definitions. These cause "could not create instance" errors when content
of those types exists.

**Resolution options**:
1. Add stub classes matching the orphaned content type names and GUIDs
2. Clean up directly in the database
3. Use Admin UI if accessible

---

## General Package Removal Checklist

For each incompatible package:

1. Remove `PackageReference` from `.csproj`
2. Remove service registration calls from `Startup.cs` / `Program.cs`
3. Remove `using` statements referencing package namespaces
4. Remove attributes/decorators from content types
5. Check for transitive dependency removal (especially `Newtonsoft.Json`)
6. Document removed packages for re-enabling when CMS 13-compatible
   versions become available
7. Check for orphaned database artifacts (scheduled jobs, content types)
