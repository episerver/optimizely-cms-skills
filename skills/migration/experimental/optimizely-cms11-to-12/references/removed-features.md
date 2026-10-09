# Removed Features in CMS 11 → CMS 12 Migration

This document catalogs features removed in the transition from Optimizely CMS 11 (ASP.NET Framework) to CMS 12 (ASP.NET Core).

---

## WebForms Support

**What it was**: ASP.NET WebForms page model (.aspx pages, server controls, ViewState, postback model) used for rendering content and UI in CMS 11.

**Removed types/APIs**:
- All `.aspx` and `.ascx` files
- `System.Web.UI.Page`, `System.Web.UI.UserControl`
- `EPiServer.Web.PageHandling.PageControlBase`
- `EPiServer.Web.WebControls.*` (Property controls)
- `EPiServer.UI.WebControls.*`
- ViewState, postback event handling

**Detection patterns**:
- `*.aspx`, `*.ascx` files
- `EPiServer.Web.WebControls`
- `EPiServer.UI.WebControls`
- `PageControlBase`
- `inherit="System.Web.UI.Page"`

**Recommended alternative**: ASP.NET Core MVC with Razor views (`.cshtml`) or Razor Pages. Convert server controls to tag helpers, view components, or partial views.

**Migration effort**: Significant

---

## XForms

**What it was**: Legacy forms framework (EPiServer.XForms) for building web forms with drag-and-drop UI in CMS 11.

**Removed types/APIs**:
- `EPiServer.XForms.*` namespace
- `XFormControl`
- XForms gadgets and configuration
- XForms data storage

**Detection patterns**:
- `EPiServer.XForms`
- `XFormControl`
- `<episerver.xforms>` configuration sections
- XForm content types

**Recommended alternative**: Optimizely Forms add-on. Migrate XForms definitions to Forms. Consider third-party alternatives like Formulate or custom form implementations.

**Migration effort**: Moderate

---

## Dynamic Content

**What it was**: Plugin-based system for inserting reusable content snippets into rich text areas via EPiServer.DynamicContent.

**Removed types/APIs**:
- `EPiServer.DynamicContent.*` namespace
- `DynamicContentAttribute`
- `IDynamicContent` interface
- Dynamic content plugins and configuration

**Detection patterns**:
- `EPiServer.DynamicContent`
- `DynamicContentAttribute`
- `IDynamicContent`
- `<episerver.dynamicContent>` configuration

**Recommended alternative**: Content blocks in content areas. Migrate dynamic content plugins to block types and reference them in content areas or rich text.

**Migration effort**: Moderate

---

## WCF-based Event Provider

**What it was**: Windows Communication Foundation (WCF) service for distributed cache invalidation and event synchronization across load-balanced CMS 11 environments.

**Removed types/APIs**:
- `EPiServer.Events.Providers.WcfEventProvider`
- WCF event service configuration
- `<episerver.events>` WCF settings

**Detection patterns**:
- `WcfEventProvider`
- `EPiServer.Events.Providers.Wcf`
- `<episerver.events>` with WCF endpoints

**Recommended alternative**: Azure Service Bus event provider or custom event provider implementation. Configure distributed events using modern message bus.

**Migration effort**: Moderate

---

## WCF-based Search Service (Lucene)

**What it was**: Built-in search functionality using Lucene.NET accessed via WCF service in CMS 11.

**Removed types/APIs**:
- `EPiServer.Search.*` namespace (WCF-based)
- `SearchHandler`
- Lucene indexing jobs
- Search service WCF configuration

**Detection patterns**:
- `EPiServer.Search.SearchHandler`
- `<episerver.search>` configuration sections
- WCF search service references
- `LuceneIndexer`

**Recommended alternative**: Optimizely Search & Navigation (Episerver.Find) or third-party search solutions (Azure Cognitive Search, Elasticsearch). Implement custom indexing and search.

**Migration effort**: Significant

---

## Mirroring

**What it was**: Content mirroring feature (EPiServer.Enterprise) for replicating content changes between CMS instances via WCF.

**Removed types/APIs**:
- `EPiServer.Enterprise.*` namespace
- `MirroringHandler`
- Mirroring channel configuration
- WCF mirroring endpoints

**Detection patterns**:
- `EPiServer.Enterprise`
- `MirroringHandler`
- `<episerver.enterprise>` configuration
- Mirroring channel definitions

**Recommended alternative**: No direct replacement. Use Content Delivery API with custom synchronization logic, Azure Content Delivery Network, or third-party deployment pipelines.

**Migration effort**: Significant

---

## HTTP Handlers

**What it was**: ASP.NET Framework HTTP handlers for processing media, blobs, and static files.

**Removed types/APIs**:
- `EPiServer.Web.Hosting.MediaHandlerBase`
- `EPiServer.Web.StaticFileHandler`
- `EPiServer.Web.BlobHttpHandler`
- Custom `IHttpHandler` implementations
- `<httpHandlers>` configuration

**Detection patterns**:
- `MediaHandlerBase`
- `StaticFileHandler`
- `BlobHttpHandler`
- `IHttpHandler`
- `<httpHandlers>` or `<handlers>` in web.config

**Recommended alternative**: ASP.NET Core middleware for file handling. Use built-in static file middleware or implement custom middleware for blob/media processing.

**Migration effort**: Moderate

---

## UrlRewriteProvider

**What it was**: Provider-based URL rewriting system for customizing URL generation and routing in CMS 11.

**Removed types/APIs**:
- `EPiServer.Web.Routing.UrlRewriteProvider`
- Custom URL rewrite provider implementations
- `<episerver.framework><urlRewriting>` configuration

**Detection patterns**:
- `UrlRewriteProvider`
- `EPiServer.Web.Routing.UrlRewriteProvider`
- Custom classes inheriting from `UrlRewriteProvider`
- `<urlRewriting>` configuration sections

**Recommended alternative**: ASP.NET Core routing middleware and URL rewrite middleware. Implement custom routing logic using `IEndpointRouteBuilder` or middleware components.

**Migration effort**: Moderate

---

## IInitializableHttpModule

**What it was**: HTTP modules for intercepting and processing HTTP requests in the ASP.NET pipeline.

**Removed types/APIs**:
- `EPiServer.Framework.Initialization.IInitializableHttpModule`
- Custom HTTP module implementations
- `<httpModules>` configuration

**Detection patterns**:
- `IInitializableHttpModule`
- `EPiServer.Framework.Initialization.IInitializableHttpModule`
- `<httpModules>` or `<modules>` in web.config
- Classes implementing `IHttpModule`

**Recommended alternative**: ASP.NET Core middleware. Convert HTTP modules to middleware components registered in the request pipeline.

**Migration effort**: Moderate

---

## Virtual Applications

**What it was**: IIS virtual applications for hosting sub-applications under a parent CMS site.

**Removed types/APIs**:
- Virtual application configuration in IIS
- `<location>` paths in web.config for virtual apps

**Detection patterns**:
- IIS virtual application configurations
- Multiple web.config files in subdirectories
- `<location path="...">` for virtual app settings

**Recommended alternative**: Not supported in cross-platform .NET Core. Host as separate applications or consolidate into main application with area routing.

**Migration effort**: Minimal (rare usage scenario)

---

## Dynamic Properties (UI)

**What it was**: UI and API for defining custom properties on content types at runtime without code changes.

**Removed types/APIs**:
- `EPiServer.DataAbstraction.DynamicProperty`
- `EPiServer.DataAbstraction.DynamicPropertyData`
- Dynamic properties admin UI
- `DynamicPropertyStore`

**Detection patterns**:
- `DynamicProperty`
- `DynamicPropertyData`
- `DynamicPropertyStore`
- Dynamic property definitions in database

**Recommended alternative**: Define properties in code using `[ContentType]` attributes, or use settings content types for runtime configuration. Consider property bags for flexible data.

**Migration effort**: Moderate

---

## Dashboard

**What it was**: Customizable dashboard in CMS 11 edit mode showing gadgets and quick access to content.

**Removed types/APIs**:
- `EPiServer.Shell.Dashboard.*`
- Dashboard gadget framework
- `IGadget` interface
- Dashboard configuration

**Detection patterns**:
- `EPiServer.Shell.Dashboard`
- `IGadget`
- Dashboard gadget implementations
- `[Gadget]` attributes

**Recommended alternative**: Extend admin menu system with custom views or integrate with CMS 12 navigation. Build custom dashboards using React components in CMS UI.

**Migration effort**: Minimal

---

## GuiPlugIn

**What it was**: Attribute-based system for registering admin UI extensions and plugins in CMS 11.

**Removed types/APIs**:
- `EPiServer.PlugIn.GuiPlugInAttribute`
- GuiPlugIn configuration
- Legacy admin plugin registration

**Detection patterns**:
- `GuiPlugInAttribute`
- `[GuiPlugIn]`
- `EPiServer.PlugIn.GuiPlugIn`

**Recommended alternative**: Register menu providers using `IMenuProvider` or extend admin UI using modern React-based components. Use `[MenuItem]` attributes for menu registration.

**Migration effort**: Moderate

---

## PagePlugIn

**What it was**: Attribute for marking controllers or pages as plugins with specific access requirements.

**Removed types/APIs**:
- `EPiServer.PlugIn.PagePlugInAttribute`
- `[PagePlugIn]` attribute usage

**Detection patterns**:
- `PagePlugInAttribute`
- `[PagePlugIn]`
- `EPiServer.PlugIn.PagePlugIn`

**Recommended alternative**: Use ASP.NET Core authorization policies and action filters. Implement custom authorization requirements and register with dependency injection.

**Migration effort**: Moderate

---

## Summary

The CMS 11 → CMS 12 migration represents a fundamental platform shift from ASP.NET Framework to ASP.NET Core. Most removed features have modern equivalents in ASP.NET Core or CMS 12 APIs, but require architectural changes rather than simple API replacements.

**High-impact removals**:
- WebForms → Razor (affects all presentation layer)
- WCF services → Modern service communication
- HTTP modules/handlers → Middleware

**Recommended migration approach**:
1. Audit codebase for removed features using detection patterns
2. Prioritize by usage frequency and business impact
3. Modernize architecture incrementally
4. Leverage CMS 12 content migration tools for data
5. Test thoroughly in isolated CMS 12 environment before full migration
