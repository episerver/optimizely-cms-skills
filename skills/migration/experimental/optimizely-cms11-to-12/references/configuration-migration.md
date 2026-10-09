# Configuration Migration Guide: CMS 11 to CMS 12

## Overview

CMS 11 (.NET Framework) uses **web.config** (XML) for configuration, while CMS 12 (.NET 5+) uses **appsettings.json** (JSON) with environment-specific override files. This migration requires converting XML configuration sections to JSON and adopting the .NET Options pattern.

## Connection Strings

**Before (web.config):**
```xml
<connectionStrings>
  <add name="EPiServerDB"
       connectionString="Server=localhost;Database=EPiServerDB;User Id=dbuser;Password=dbpass;"
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

**After (appsettings.json):**
```json
{
  "ConnectionStrings": {
    "EPiServerDB": "Server=localhost;Database=EPiServerDB;User Id=dbuser;Password=dbpass;"
  }
}
```

**IMPORTANT:** For DXP deployments, Multiple Active Result Sets (MARS) **must be disabled**. Ensure connection strings do NOT include `MultipleActiveResultSets=true`.

**DXP-Safe Connection String:**
```json
{
  "ConnectionStrings": {
    "EPiServerDB": "Server=localhost;Database=EPiServerDB;User Id=dbuser;Password=dbpass;MultipleActiveResultSets=false"
  }
}
```

## App Settings

**Before (web.config):**
```xml
<appSettings>
  <add key="episerver:ReadOnlyConfigurationAPI" value="true" />
  <add key="episerver:AutoInitialize" value="true" />
  <add key="episerver:CachePath" value="App_Data\Cache" />
</appSettings>
```

**After (appsettings.json):**
```json
{
  "EPiServer": {
    "ReadOnlyConfigurationAPI": true,
    "AutoInitialize": true,
    "CachePath": "App_Data\\Cache"
  }
}
```

## EPiServer Configuration Sections

**Before (web.config):**
```xml
<episerver.framework>
  <virtualRoles>
    <add name="Administrators" type="EPiServer.Security.WindowsGroupRole, EPiServer" />
  </virtualRoles>
  <scanAssembly forceBinFolderScan="true" />
</episerver.framework>

<episerver>
  <applicationSettings uiTheme="Dark" />
  <siteSettings siteDisplayName="My Site" />
</episerver>
```

**After (.NET Options Pattern in Startup.cs or Program.cs):**
```csharp
public void ConfigureServices(IServiceCollection services)
{
    // Configure EPiServer options via Options pattern
    services.Configure<FrameworkOptions>(options =>
    {
        options.ForceBinFolderScan = true;
    });

    services.Configure<CmsOptions>(options =>
    {
        options.UITheme = "Dark";
    });

    services.Configure<SiteOptions>(options =>
    {
        options.SiteDisplayName = "My Site";
    });
}
```

**Alternatively via appsettings.json:**
```json
{
  "EPiServer": {
    "Cms": {
      "UITheme": "Dark"
    },
    "Framework": {
      "ForceBinFolderScan": true
    }
  }
}
```

## Environment-Specific Configuration

CMS 12 supports environment-specific configuration files with override behavior:

**File Loading Order:**
1. `appsettings.json` (base configuration)
2. `appsettings.{Environment}.json` (environment override)
3. Environment variables (highest priority)

**appsettings.json (base):**
```json
{
  "ConnectionStrings": {
    "EPiServerDB": "Server=localhost;Database=EPiServerDB;Integrated Security=true;"
  },
  "EPiServer": {
    "Cms": {
      "UITheme": "Light"
    }
  }
}
```

**appsettings.Development.json:**
```json
{
  "ConnectionStrings": {
    "EPiServerDB": "Server=dev-server;Database=EPiServerDB_Dev;Integrated Security=true;"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Debug"
    }
  }
}
```

**appsettings.Production.json:**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning"
    }
  }
}
```

**Override Behavior:** Later files override earlier ones. `appsettings.Production.json` merges with and overrides `appsettings.json` when `ASPNETCORE_ENVIRONMENT=Production`.

## Razor View Imports

**Before (Views/web.config):**
```xml
<configuration>
  <system.web.webPages.razor>
    <pages pageBaseType="System.Web.Mvc.WebViewPage">
      <namespaces>
        <add namespace="EPiServer.Core" />
        <add namespace="EPiServer.Web.Mvc.Html" />
        <add namespace="EPiServer.Framework.Web.Mvc.Html" />
      </namespaces>
    </pages>
  </system.web.webPages.razor>
</configuration>
```

**After (Views/_ViewImports.cshtml):**
```cshtml
@using EPiServer.Core
@using EPiServer.Web.Mvc.Html
@using EPiServer.Framework.Web.Mvc.Html
@using EPiServer.Web.Routing
@using MyProject.Models.Pages
@using MyProject.Models.Blocks

@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers
@addTagHelper *, EPiServer.Cms.AspNetCore.HtmlHelpers
```

**Create this file in:**
- `Views/_ViewImports.cshtml` (applies to all views)
- `Areas/{AreaName}/Views/_ViewImports.cshtml` (area-specific)

## Legacy Config Migration Package

**EPiServer.CMS.AspNetCore.Migration** (.NET 5 ONLY):

This package enables reading legacy XML .config files during migration. It contains legacy APIs like `DataFactory`.

**Usage (.NET 5):**
```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddCmsAspNetIdentity<ApplicationUser>();
    services.AddCms();
    services.AddLegacyConfiguration(); // Reads web.config
}
```

**NOT needed for .NET 6+:** Complete migration to appsettings.json is required for .NET 6 and later.

## Common Pitfalls

1. **Missing Connection Strings**
   - Forgetting to move connection strings from web.config to appsettings.json
   - Result: Database connection failures on startup

2. **MARS Enabled on DXP**
   - Leaving `MultipleActiveResultSets=true` in connection strings
   - Result: DXP deployment failures
   - **Fix:** Explicitly set `MultipleActiveResultSets=false`

3. **No Environment-Specific Files**
   - Using only appsettings.json for all environments
   - Result: Production secrets in source control, incorrect configs per environment
   - **Fix:** Create appsettings.{Environment}.json files, exclude secrets from source

4. **Missing _ViewImports.cshtml**
   - Not creating _ViewImports.cshtml after removing Views/web.config
   - Result: Razor view compilation errors ("namespace not found")
   - **Fix:** Create Views/_ViewImports.cshtml with necessary @using and @addTagHelper directives

5. **Hardcoded Paths**
   - Not updating file paths from Windows-style to cross-platform
   - Result: Issues on Linux containers
   - **Fix:** Use `Path.Combine()` or forward slashes

6. **Configuration Section Names**
   - Using incorrect casing or structure in appsettings.json
   - Result: Configuration not loaded
   - **Fix:** Match .NET Options class property names exactly (case-sensitive)

7. **Missing Configuration Binding**
   - Not registering configuration sections in Startup.cs
   - Result: Options injected as empty/default values
   - **Fix:** Use `services.Configure<TOptions>(Configuration.GetSection("SectionName"))`
