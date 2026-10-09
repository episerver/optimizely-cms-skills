# NuGet Package Mapping: CMS 12 → CMS 13

## Overview

CMS 13 restructures several NuGet packages. Some packages are split into
smaller assemblies, some are consolidated, and some are removed. This
reference maps every affected package.

## Package Changes

| CMS 12 Package | Action | CMS 13 Package(s) | Notes |
|----------------|--------|--------------------|-------|
| EPiServer.CMS.Core | Update | EPiServer.CMS.Core | Now works as umbrella package with dependencies to individual assemblies |
| EPiServer.Framework | Update | EPiServer.Framework | Now only contains EPiServer.Framework assembly; must add explicit dependencies to individual assemblies |
| EPiServer.Azure | Split | EPiServer.Blobs.Azure + EPiServer.Events.Azure | AzureBlobProvider in Blobs.Azure, AzureEventProvider in Events.Azure |
| EPiServer.Cms.HealthCheck | Remove | (none) | Consolidated into EPiServer.Data |
| EPiServer.Data.Cache | Remove | (none) | Integrated into EPiServer.Data |
| EPiServer.Cms (composition) | Update | EPiServer.Cms | No longer includes Visitor Groups dependency or EPiServer.Cms.UI.AspNetIdentity |
| EPiServer.Data | Update | EPiServer.Data | Absorbs EPiServer.Cms.HealthCheck and EPiServer.Data.Cache |
| EPiServer.Hosting | Update | EPiServer.Hosting | Update to 13.x |
| EPiServer.CMS.TinyMce | Update | EPiServer.CMS.TinyMce | Update to 13.x |
| EPiServer.CloudPlatform.Cms | Update | EPiServer.CloudPlatform.Cms | Update to 13.x (if using Optimizely DXP) |
| EPiServer.ContentDeliveryApi.* | Remove | (none) | Not compatible with CMS 13 |
| EPiServer.ContentManagementApi | Remove | (none) | Not compatible with CMS 13 |
| EPiServer.ContentDefinitionsApi | Remove | (none) | Not compatible with CMS 13 |

## Extracted Packages (Previously Transitive)

These packages were included transitively via `EPiServer.Cms` in CMS 12 but
must be referenced explicitly in CMS 13 if your code uses them:

| Package | Contains | When to Add |
|---------|----------|-------------|
| EPiServer.CMS.UI.AspNetIdentity | ASP.NET Identity integration for CMS | If using `AddCmsAspNetIdentity<T>()` or `EPiServer.Cms.UI.AspNetIdentity` namespace |
| EPiServer.CMS.UI.VisitorGroups | Visitor Groups MVC + UI | If using visitor groups criteria or `AddVisitorGroupsMvc()` / `AddVisitorGroupsUI()` |

## New Separate Packages

These packages may need to be explicitly added if your project uses their functionality
(previously bundled in larger packages):

| Package | Contains | When to Add |
|---------|----------|-------------|
| EPiServer.Blobs | Generic blob functionality | If using blob storage directly |
| EPiServer.Cache | Cache abstractions and memory implementations | If using cache APIs directly |
| EPiServer.Logging | Logging infrastructure | If using EPiServer logging APIs directly |
| EPiServer.HtmlParsing | HTML parsing functionality | If using HTML parsing APIs directly |
| EPiServer.Geolocation | Geolocation classes | If using geolocation features |
| EPiServer.Events.ChangeNotification | Change notification system | If using change notification APIs |

## Visitor Groups Package Separation

**CRITICAL**: Visitor Groups are no longer included by default.

**CMS 12**: Visitor Groups included automatically via EPiServer.Cms composition package.

**CMS 13**: Must explicitly add and register:

1. Add the Visitor Groups NuGet package (if not already a direct dependency)
2. Register in Startup.cs:

```csharp
services.AddVisitorGroupsMvc();    // MVC services
services.AddVisitorGroupsUI();     // UI services
```

**Detection**: If your project uses `IVisitorGroup`, `VisitorGroupCriterion`,
or any visitor group criteria, you must add explicit registration.

## Microsoft Package Version Requirements

CMS 13 targets .NET 10.0. Key Microsoft package versions:

| Package | CMS 13 Version |
|---------|----------------|
| Microsoft.AspNetCore.* | 10.0.2+ |
| Microsoft.Extensions.* | 10.0.2+ |
| Microsoft.EntityFrameworkCore.SqlServer | 10.0.2+ |
| Microsoft.Extensions.Http.Resilience | 10.0.2+ |
| Microsoft.IdentityModel.Protocols.OpenIdConnect | 8.15.0+ |
| System.Text.Json | 10.0.2+ |

## Third-Party Package Changes

| Package | CMS 12 | CMS 13 | Notes |
|---------|--------|--------|-------|
| Castle.Core | Required (transitive) | Optional [5.2.1, 6) | No longer a CMS dependency; add only if your code uses it directly |
| Newtonsoft.Json | Used internally | Removed | CMS uses System.Text.Json; remove if only used transitively |

## Migration Commands

### Check current package versions

```shell
dotnet list package
```

### Update core packages

```shell
dotnet add package EPiServer.CMS.Core --version 13.*
dotnet add package EPiServer.CMS.UI --version 13.*
```

### Handle Azure split

```shell
# Remove old combined package
dotnet remove package EPiServer.Azure

# Add split packages
dotnet add package EPiServer.Blobs.Azure
dotnet add package EPiServer.Events.Azure
```

### Remove deprecated packages

```shell
dotnet remove package EPiServer.Cms.HealthCheck
```

### Add Visitor Groups (if needed)

```shell
dotnet add package EPiServer.Personalization.VisitorGroups
```
