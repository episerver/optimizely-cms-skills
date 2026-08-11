# NuGet Package Mapping: CMS 11 → CMS 12

This document provides a complete NuGet package mapping reference for migrating from Optimizely CMS 11 (.NET Framework 4.6.1+) to CMS 12 (.NET 5+ / .NET 6+). Use this to identify which packages need to be updated, renamed, split, or removed when upgrading to CMS 12.

## Core CMS Packages

| CMS 11 Package | CMS 12 Package(s) | Status | Notes |
|----------------|-------------------|--------|-------|
| `EPiServer.CMS` | `EPiServer.CMS` | Unchanged | Umbrella package including rendering and UI components |
| `EPiServer.CMS.Core` | `EPiServer.CMS.Core` | Unchanged | Core content types and data access |
| `EPiServer.Framework` | `EPiServer.Framework` | Unchanged | Core framework features |
| `EPiServer.Cms.AspNet` | `EPiServer.CMS.AspNetCore.HtmlHelpers` | Split | Use HtmlHelpers as top-level package. Includes: `EPiServer.CMS.AspNetCore`, `EPiServer.CMS.AspNetCore.Templating`, `EPiServer.CMS.AspNetCore.Routing`, `EPiServer.CMS.AspNetCore.Mvc` |
| `EPiServer.Framework.AspNet` | `EPiServer.Framework.AspNetCore` | Renamed | Contains VirtualPathProviders → FileProviders migration |

## Removed Packages (No CMS 12 Equivalent)

| CMS 11 Package | CMS 12 Equivalent | Migration Path |
|----------------|-------------------|----------------|
| `EPiServer.ServiceLocation.StructureMap` | **Removed** | Use ASP.NET Core built-in DI (`Microsoft.Extensions.DependencyInjection`) |
| `EPiServer.Logging.Log4Net` | **Removed** | Use .NET Core logging APIs (`Microsoft.Extensions.Logging`) with providers (Serilog, NLog, etc.) |
| `EPiServer.ImageLibrary` | **Removed** | Use third-party image processing libraries (ImageSharp, SkiaSharp) |

## Optional/Add-on Packages

| CMS 11 Package | CMS 12 Package | Status | Notes |
|----------------|----------------|--------|-------|
| `EPiServer.CMS.TinyMCE` | `EPiServer.CMS.TinyMCE` | Optional | Rich-text editor for XHTML properties |
| `EPiServer.Search.Cms` | `EPiServer.Search.Cms` | Optional | Built-in search functionality |
| `EPiServer.XForms` | **Deprecated** | Should migrate to Optimizely Forms |
| `EPiServer.DynamicContent` | **Deprecated** | Should migrate to Blocks |

## New CMS 12 Packages

| Package | Purpose | Target Framework |
|---------|---------|------------------|
| `EPiServer.CMS.AspNetCore.Migration` | Helper for reading legacy .config files | .NET 5 only (not needed for .NET 6+) |
| `EPiServer.CMS.AspNetCore` | Core ASP.NET Core integration | .NET 5+ |
| `EPiServer.CMS.AspNetCore.Templating` | Template resolution and rendering | .NET 5+ |
| `EPiServer.CMS.AspNetCore.Routing` | Content routing for ASP.NET Core | .NET 5+ |
| `EPiServer.CMS.AspNetCore.Mvc` | MVC integration and controllers | .NET 5+ |
| `EPiServer.CMS.AspNetCore.HtmlHelpers` | HTML helpers and tag helpers | .NET 5+ |

## Detection Commands

Find current CMS 11 packages in your solution:

```bash
# Search for CMS 11 AspNet packages
grep -r "EPiServer.Cms.AspNet" --include="*.csproj"
grep -r "EPiServer.Framework.AspNet" --include="*.csproj"

# Search for removed packages
grep -r "EPiServer.ServiceLocation.StructureMap" --include="*.csproj"
grep -r "EPiServer.Logging.Log4Net" --include="*.csproj"
grep -r "EPiServer.ImageLibrary" --include="*.csproj"

# Search for deprecated packages
grep -r "EPiServer.XForms" --include="*.csproj"
grep -r "EPiServer.DynamicContent" --include="*.csproj"

# List all EPiServer package references
grep -r "PackageReference.*EPiServer" --include="*.csproj"
```

## Migration Steps

1. **Update Target Framework**: Change `<TargetFramework>` from `net461` to `net5.0` or `net6.0` in `.csproj` files

2. **Replace AspNet Packages**:
   - Remove `EPiServer.Cms.AspNet`
   - Add `EPiServer.CMS.AspNetCore.HtmlHelpers` (includes all required AspNetCore packages)
   - Remove `EPiServer.Framework.AspNet`
   - Add `EPiServer.Framework.AspNetCore`

3. **Remove Obsolete Packages**:
   - Remove `EPiServer.ServiceLocation.StructureMap` (use built-in DI)
   - Remove `EPiServer.Logging.Log4Net` (use Microsoft.Extensions.Logging)
   - Remove `EPiServer.ImageLibrary` (use modern image libraries)

4. **Update Core Packages**: Update `EPiServer.CMS` and `EPiServer.CMS.Core` to CMS 12 versions (12.x.x)

5. **Add Migration Helper** (if targeting .NET 5):
   - Add `EPiServer.CMS.AspNetCore.Migration` for legacy .config support
   - Not needed for .NET 6+ projects

6. **Review Deprecated Packages**:
   - Plan migration from `EPiServer.XForms` to Optimizely Forms
   - Replace `EPiServer.DynamicContent` usage with Blocks

7. **Update Package Versions**: Ensure all EPiServer packages use compatible CMS 12 versions

## Version Compatibility

- **CMS 12.0-12.8**: .NET 5 only
- **CMS 12.9+**: .NET 6+ (recommended)
- **CMS 12.21+**: .NET 8 supported

Always use consistent package versions across all EPiServer packages in your solution.

## Additional Resources

- Breaking changes documentation: Review API changes between CMS 11 and CMS 12
- DI migration guide: Convert StructureMap registrations to Microsoft.Extensions.DependencyInjection
- Logging migration guide: Replace Log4Net with ILogger<T> pattern
- Configuration migration: Move from web.config to appsettings.json
