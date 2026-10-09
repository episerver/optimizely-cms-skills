# Removed Features: CMS 12 → CMS 13

The features listed below are **completely removed** in Optimizely CMS 13. They are not deprecated with warnings — they are gone. Code that references these types, methods, or configuration options **will not compile** against CMS 13 assemblies. Every occurrence must be identified and replaced before migration can succeed.

---

## Dynamic Properties

**What it was**: Dynamic Properties allowed defining properties that could be inherited down the page tree without being part of the content type definition. They were global, cross-cutting properties.

**Removed types**:
- `EPiServer.DataAbstraction.DynamicProperty`
- `EPiServer.DataAbstraction.DynamicPropertyCollection`
- `EPiServer.DataAbstraction.DynamicPropertyStatus`
- `EPiServer.Core.DynamicPropertyBag`
- `EPiServer.Core.DynamicPropertyLookup`
- `EPiServer.Core.DynamicPropertyCache`
- `EPiServer.Core.DynamicPropertyPage`
- `EPiServer.Core.IDynamicPropertyLookup`

**Removed methods**:
- `IPropertyDefinitionRepository.ListDynamic()`
- `IPropertyDefinitionRepository.GetUsage()` — `isDynamic` parameter removed
- `IPropertyDefinitionRepository.CheckUsage()` — `isDynamic` parameter removed
- `PropertyGetHandler.PropertyHandlerWithDynamicProperties()`

**Configuration**:
- `ContentOptions.EnableDynamicProperties` → throws `NotSupportedException`

**Detection patterns** (grep/search strings):
- `DynamicProperty`
- `EnableDynamicProperties`
- `ListDynamic`
- `DynamicPropertyBag`

**Recommended alternative**: Use regular content properties on a shared base page type, or use settings content types that are loaded via dependency injection. For inherited values, implement a content provider or use the built-in property fallback mechanism.

**Migration effort**: Significant — requires redesigning the data model for affected properties.

---

## PlugIn System

**What it was**: The PlugIn system was a legacy extensibility mechanism for registering custom functionality (scheduled jobs, property types, admin tools) via attributes.

**Removed types**:
- `EPiServer.PlugIn.AssemblyTypeInfo`
- `EPiServer.PlugIn.ICustomPlugInDataLoader`
- `EPiServer.PlugIn.ICustomPlugInLoader`
- `EPiServer.PlugIn.IPlugInDescriptorRepository`
- `EPiServer.PlugIn.PlugInDescriptor`
- `EPiServer.PlugIn.PlugInException`
- `EPiServer.PlugIn.PlugInLocator`
- `EPiServer.PlugIn.PagePlugInAttribute`
- `EPiServer.PlugIn.PlugInPropertyAttribute`
- `EPiServer.PlugIn.PlugInSettings`

**Attribute replacements**:
- `PropertyDefinitionTypePlugInAttribute` → `PropertyDefinitionTypeAttribute`
- `ScheduledPlugInAttribute` → now inherits `ScheduledJobAttribute` (not `PlugInAttribute`)

**Database**: Associated stored procedures and tables removed.

**Detection patterns**:
- `PlugInAttribute`
- `PlugInDescriptor`
- `PlugInLocator`
- `PagePlugInAttribute`
- `PlugInPropertyAttribute`
- `EPiServer.PlugIn`
- `ScheduledPlugInAttribute` (still works but changed base class)

**Recommended alternative**: Use standard .NET dependency injection and service registration. For scheduled jobs, inherit from `ScheduledJobBase` and use `ScheduledJobAttribute`. For property types, use `PropertyDefinitionTypeAttribute`.

**Migration effort**: Moderate — most projects use PlugIn system only for scheduled jobs, which have a straightforward attribute swap.

---

## WebForms Support

**What it was**: WebForms (.aspx) was the original rendering framework for Optimizely CMS before MVC/Razor adoption.

**Removed types/features**:
- All `System.Web.IHttpHandler` implementations
- `PagePlugInAttribute` (page-level WebForms plugins)
- `PlugInPropertyAttribute` (WebForms property plugins)
- `ContentType.DefaultWebFormTemplate`
- `PageType.FileName`, `FileNameForSite`, `ExportableFileName`
- Inline editor support
- `BlockController`, `ContentContext`, `ContentAreaContext`, `PartialContentController` (legacy MVC)
- `_Sleek.cshtml` view (merged with `Bootstrapper.cshtml`)
- `ClientResources.Render()` and `RenderRequiredResources()`
- `MenuBuilder` (WebForms leftover)

**Detection patterns**:
- `.aspx` files in Views/
- `DefaultWebFormTemplate`
- `FileName` property on PageType attributes
- `System.Web` using statements
- `BlockController`
- `PartialContentController`
- `ClientResources.Render`

**Recommended alternative**: Use ASP.NET Core MVC with Razor views or Razor Pages. All rendering should use the standard ASP.NET Core pipeline.

**Migration effort**: Significant if the project still uses WebForms views. Minimal if the project already uses MVC/Razor (most CMS 12 projects do).

---

## Mirroring

**What it was**: Mirroring allowed content synchronization between CMS instances (e.g., staging to production content push).

**Removed types/values**:
- `TypeOfTransfer.MirroringImporting`
- `TypeOfTransfer.MirroringExporting`
- `ITransferContext.DeleteContent`, `DeleteContentLanguages`, `DeleteChildrenGuids`, `MoveContent`
- `ExportEventArgs.ContextOfExport` enum values for mirroring
- `HostType.LegacyMirroringAppDomain`

**Detection patterns**:
- `MirroringImporting`
- `MirroringExporting`
- `HostType.LegacyMirroringAppDomain`
- Mirroring configuration in settings

**Recommended alternative**: Use the Content Transfer API (import/export) or third-party deployment tools. For SaaS environments, use the built-in content synchronization features.

**Migration effort**: Moderate — if actively using mirroring, requires setting up alternative content deployment workflow.

---

## Castle.Windsor Dependency

**What it was**: CMS historically depended on Castle.Windsor IoC container. CMS 13 removes this dependency entirely.

**Removed**: Castle.Windsor is no longer a transitive dependency. Internal types using `Castle.Core` namespace are now internal.

**Detection patterns**:
- `using Castle.Windsor`
- `using Castle.Core`
- `Castle.Windsor` in `.csproj` PackageReference
- `IWindsorContainer`
- `IKernel`

**Recommended alternative**: Use `Microsoft.Extensions.DependencyInjection` (the standard ASP.NET Core DI container) which CMS 13 uses exclusively.

**Migration effort**: Minimal to moderate — depends on how deeply the project uses Castle.Windsor directly. If only used transitively through CMS, no changes needed.

---

## ISiteSecretManager

**What it was**: Interface for managing site-level secrets.

**Status**: Obsoleted — can still read existing secrets but cannot create new ones.

**Detection patterns**:
- `ISiteSecretManager`
- `CreateSecret`

**Recommended alternative**: Use ASP.NET Core Data Protection or a dedicated secret management solution (Azure Key Vault, etc.).

**Migration effort**: Minimal.

---

## ITimer

**What it was**: Timer abstraction used by CMS internally.

**Status**: Obsoleted, no implementation registered.

**Detection patterns**:
- `ITimer` (in EPiServer namespace context)

**Recommended alternative**: Use `System.Threading.Timer` or `System.Timers.Timer` directly.

**Migration effort**: Minimal.

---

## File System Abstractions

**What it was**: Custom file system abstractions (`IDirectory`, `IFile`, `IFileSystemWatcher`, `PhysicalDirectory`, `PhysicalFile`).

**Status**: Removed.

**Detection patterns**:
- `IDirectory` (EPiServer namespace)
- `IFile` (EPiServer namespace)
- `IFileSystemWatcher` (EPiServer namespace)
- `PhysicalDirectory`
- `PhysicalFile`

**Recommended alternative**: Use `System.IO` directly or `Microsoft.Extensions.FileProviders`.

**Migration effort**: Minimal.

---

## Telemetry

**What it was**: Telemetry subsystem for collecting CMS usage analytics.

**Removed types/configuration**:
- `EPiServer.Shell.Telemetry.TelemetryOptions`
- All types in `EPiServer.Shell.Telemetry` namespace

**Detection patterns**:
- `using EPiServer.Shell.Telemetry`
- `TelemetryOptions`
- `services.Configure<TelemetryOptions>`

**Recommended alternative**: None needed. Telemetry is fully removed with no replacement.

**Migration effort**: Minimal — remove `using` statements and `Configure<TelemetryOptions>()` calls.

---

## SearchProvidersManager

**What it was**: Public class for managing search providers.

**Status**: Made internal. No public replacement.

**Detection patterns**:
- `SearchProvidersManager`

**Recommended alternative**: Use the built-in content search services or Optimizely Graph.

**Migration effort**: Moderate — depends on extent of direct usage.

---

## Injected<T> Property Injection

**What it was**: `Injected<T>` was a property injection helper that allowed lazy service resolution without constructor injection.

**Removed types**:
- `EPiServer.ServiceLocation.Injected<T>`

**Detection patterns**:
- `Injected<`
- `\.Service\.` (on Injected properties)

**Recommended alternative**: Constructor injection via Microsoft DI.

**Migration effort**: Moderate — requires adding constructor parameters to every class using `Injected<T>`. Search-and-replace alone is insufficient; each usage must be restructured.
