# Third-Party Package Compatibility Matrix (CMS 11 → CMS 12)

## Overview

CMS 12 is built on ASP.NET Core and uses the built-in Microsoft.Extensions.DependencyInjection container. Many CMS 11 third-party packages that depend on ASP.NET Framework, StructureMap, or legacy Optimizely APIs are **not compatible** with CMS 12.

This reference lists common packages, their compatibility status, and migration paths.

---

## Compatibility Matrix

| Package | CMS 12 Status | Action Required | Replacement / Notes |
|---------|--------------|-----------------|---------------------|
| **ImageResizer** | ❌ Incompatible | Remove | EPiServer.ImageLibrary.ImageSharp (v2.x recommended) |
| **StructureMap** | ❌ Incompatible | Remove | Built-in Microsoft.Extensions.DependencyInjection |
| **Log4Net / EPiServer.Logging.Log4Net** | ❌ Incompatible | Remove | Microsoft.Extensions.Logging |
| **Castle.Windsor** | ❌ Incompatible | Remove | Built-in DI or UseServiceProviderFactory |
| **Autofac (EPiServer integration)** | ⚠️ Compatible (with changes) | Update | Use ServiceLocatorProviderFactoryFacade<ContainerBuilder> |
| **Custom VirtualPathProviders** | ❌ Incompatible | Rewrite | IFileProvider / MappingPhysicalFileProvider |
| **WCF-dependent add-ons** | ❌ Incompatible | Remove | REST/gRPC alternatives |
| **EPiServer.CMS.TinyMCE** | ✅ Compatible | Update version | Same package, CMS 12 version |
| **EPiServer.Search.Cms** | ✅ Compatible | Update version | Same package, CMS 12 version (Find recommended) |
| **EPiServer.XForms** | 🗑️ Deprecated | Remove | Optimizely Forms |
| **EPiServer.DynamicContent** | 🗑️ Deprecated | Remove | Blocks (Content Areas) |
| **EPiServer.GoogleAnalytics** | ❌ Incompatible | Remove | Client-side GA4 or custom integration |
| **Geta packages** | ⚠️ Varies | Check NuGet | Most have CMS 12 versions (verify individually) |
| **AddOn packages** | ⚠️ Varies | Check NuGet | Verify .NET 6+ / .NET Standard 2.0 support |

**Legend:**
- ✅ Compatible — Works with CMS 12
- ⚠️ Compatible (with changes) — Requires code modifications
- ❌ Incompatible — Not compatible with CMS 12
- 🗑️ Deprecated — Officially deprecated by Optimizely

---

## Detection Checklist

Use these commands to detect incompatible packages in your project:

```bash
# Find all PackageReference entries
grep -r "PackageReference Include=" --include="*.csproj"

# Search for specific incompatible packages
grep -r "ImageResizer\|StructureMap\|Log4Net\|Castle.Windsor" --include="*.csproj"

# Find VirtualPathProvider usage
grep -r "VirtualPathProvider" --include="*.cs"

# Find WCF references
grep -r "System.ServiceModel" --include="*.csproj"

# Find deprecated features
grep -r "DynamicContent\|XFormBlock" --include="*.cs"
```

---

## Migration Steps by Package Category

### Image Processing: ImageResizer → ImageSharp

**Remove ImageResizer:**
```xml
<!-- CMS 11 -->
<PackageReference Include="ImageResizer" Version="4.x.x" />
<PackageReference Include="ImageResizer.Plugins.EPiServerBlobReader" Version="x.x.x" />
```

**Add ImageSharp:**
```xml
<!-- CMS 12.17+ -->
<PackageReference Include="EPiServer.ImageLibrary.ImageSharp" Version="2.0.6" />
```

**Notes:**
- v1.x depends on ImageSharp v2
- v2.x depends on ImageSharp v3 (recommended for CMS 12.17+)
- Automatic fallback: uses `EPiServer.Framework.Blobs` for formats ImageSharp doesn't support

**Code changes:**
```csharp
// CMS 11: ImageResizer URL
// <img src="@Url.ContentUrl(image)?width=300&height=200" />

// CMS 12: ImageSharp URL
// <img src="@Url.ContentUrl(image)?width=300&height=200" />
// Same syntax, different engine
```

---

### DI Containers: StructureMap Removal

**Remove StructureMap:**
```xml
<PackageReference Include="StructureMap" Version="x.x.x" />
<PackageReference Include="EPiServer.ServiceLocation.StructureMap" Version="x.x.x" />
```

**Migrate registrations:**
```csharp
// CMS 11: StructureMap
public class StructureMapRegistry : Registry
{
    public StructureMapRegistry()
    {
        For<IMyService>().Use<MyService>();
    }
}

// CMS 12: Built-in DI
public void ConfigureServices(IServiceCollection services)
{
    services.AddTransient<IMyService, MyService>();
}
```

**Autofac (if required):**
```csharp
// Startup.ConfigureContainer
public void ConfigureContainer(ContainerBuilder builder)
{
    builder.RegisterType<MyService>().As<IMyService>();
}

// Startup.ConfigureServices
services.AddServiceLocatorProviderFactoryFacade<ContainerBuilder>();
```

---

### Logging: Log4Net → Microsoft.Extensions.Logging

**Remove Log4Net:**
```xml
<PackageReference Include="log4net" Version="x.x.x" />
<PackageReference Include="EPiServer.Logging.Log4Net" Version="x.x.x" />
```

**Use built-in logging:**
```csharp
// CMS 11: Log4Net
private static readonly ILog _log = LogManager.GetLogger(typeof(MyClass));
_log.Info("Message");

// CMS 12: ILogger<T>
private readonly ILogger<MyClass> _logger;

public MyClass(ILogger<MyClass> logger)
{
    _logger = logger;
}

_logger.LogInformation("Message");
```

**Configure in appsettings.json:**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning"
    }
  }
}
```

---

### VirtualPathProvider → IFileProvider

**CMS 11: Custom VirtualPathProvider**
```csharp
public class CustomVpp : VirtualPathProvider
{
    public override bool FileExists(string virtualPath) { ... }
}
```

**CMS 12: IFileProvider**
```csharp
public class CustomFileProvider : IFileProvider
{
    public IDirectoryContents GetDirectoryContents(string subpath) { ... }
    public IFileInfo GetFileInfo(string subpath) { ... }
    public IChangeToken Watch(string filter) { ... }
}

// Register in Startup.Configure
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new CompositeFileProvider(
        new CustomFileProvider(),
        env.WebRootFileProvider
    ),
    RequestPath = "/custom"
});
```

---

### WCF Service Removal

**Action:**
- Identify WCF endpoints in `web.config` or code
- Rewrite as REST APIs using ASP.NET Core controllers
- Or use gRPC for high-performance RPC scenarios

**Example:**
```csharp
// CMS 12: REST API
[ApiController]
[Route("api/[controller]")]
public class MyApiController : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult Get(int id) { ... }
}
```

---

## Validation Steps

After removing incompatible packages:

1. **Build check:** Ensure no compilation errors
2. **Runtime check:** Test all features that depended on removed packages
3. **NuGet audit:** Run `dotnet list package --deprecated` to catch other deprecated dependencies
4. **Performance test:** Verify image resizing performance with ImageSharp
5. **Log validation:** Confirm logging works with Microsoft.Extensions.Logging

---

## Additional Resources

- [CMS 12 Breaking Changes](https://docs.developers.optimizely.com/content-management-system/v12.0.0-cms/docs/breaking-changes)
- [ImageSharp Documentation](https://docs.sixlabors.com/articles/imagesharp/)
- [ASP.NET Core DI](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection)
