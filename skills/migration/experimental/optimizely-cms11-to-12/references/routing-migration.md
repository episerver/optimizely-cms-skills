# Routing Migration: CMS 11 to CMS 12

## Overview

CMS 12 completely rewrites the routing system from ASP.NET routing API to ASP.NET Core endpoint routing. The migration impacts partial routers, content route registration, URL generation, and introduces critical behavioral changes around authentication and language resolution timing.

## API Migration Table

| CMS 11 (ASP.NET) | CMS 12 (ASP.NET Core) | Notes |
|---|---|---|
| `IContentRouteEvents` | `IContentUrlGeneratorEvents` + `IContentUrlResolverEvents` | Split into two interfaces |
| `RegisterPartialRouter()` extension | Register `IPartialRouter` in DI container | No more extension method |
| `RouteCollection.Map*()` extensions | `MapTemplate()` on `IContentEndpointRouteBuilder` | New mapping API |
| `RouteCollection.MapContentRoute()` | Implement `IContentRouteRegister` in DI | DI-based registration |
| `Html.ActionLink()` | `Html.ContentLink()` | New helper |
| `Html.BeginForm()` | `Html.BeginContentForm()` | New helper |

## Partial Router Migration

### Before (CMS 11)

```csharp
using EPiServer.Framework;
using EPiServer.Framework.Initialization;
using EPiServer.Web.Routing;
using System.Web.Routing;

[InitializableModule]
[ModuleDependency(typeof(EPiServer.Web.InitializationModule))]
public class CustomRouterInit : IInitializableModule
{
    public void Initialize(InitializationEngine context)
    {
        RouteTable.Routes.RegisterPartialRouter(new MyPartialRouter());
    }

    public void Uninitialize(InitializationEngine context) { }
}

public class MyPartialRouter : IPartialRouter<PageData, PageData>
{
    public object RoutePartial(PageData content, SegmentContext segmentContext)
    {
        // Custom routing logic
        return content;
    }

    public PartialRouteData GetPartialVirtualPath(PageData content, UrlGeneratorContext context)
    {
        return null;
    }
}
```

### After (CMS 12)

```csharp
using EPiServer.Web.Routing;
using Microsoft.Extensions.DependencyInjection;

// Register in Startup.cs ConfigureServices() or Program.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddSingleton<IPartialRouter, MyPartialRouter>();
}

// Router implementation remains largely the same
public class MyPartialRouter : IPartialRouter<PageData, PageData>
{
    public object RoutePartial(PageData content, SegmentContext segmentContext)
    {
        // Custom routing logic
        return content;
    }

    public PartialRouteData GetPartialVirtualPath(PageData content, UrlGeneratorContext context)
    {
        return null;
    }
}
```

## Content Route Registration

### Before (CMS 11)

```csharp
[InitializableModule]
public class RouteInit : IInitializableModule
{
    public void Initialize(InitializationEngine context)
    {
        RouteTable.Routes.MapContentRoute(
            name: "CustomRoute",
            url: "{language}/{node}/{partial}",
            defaults: new { controller = "Custom", action = "Index" }
        );
    }
}
```

### After (CMS 12)

```csharp
using EPiServer.Core.Routing;
using EPiServer.Web.Routing;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

// Register in Startup.cs ConfigureServices() or Program.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddSingleton<IContentRouteRegister, CustomContentRouteRegister>();
}

public class CustomContentRouteRegister : IContentRouteRegister
{
    public void Register(IContentEndpointRouteBuilder routes)
    {
        routes.MapTemplate("{language}/{node}/{partial}", context =>
        {
            // Custom route handler logic
            context.HttpContext.Items["CustomRoute"] = true;
        });
    }
}
```

## URL Generation

### Before (CMS 11)

```html
@Html.ActionLink("Link Text", "Index", "Custom", new { id = Model.ContentLink }, null)

@using (Html.BeginForm("Index", "Custom", FormMethod.Post))
{
    <!-- Form content -->
}
```

### After (CMS 12)

```html
@Html.ContentLink("Link Text", Model.ContentLink, new { controller = "Custom", action = "Index" })

@using (Html.BeginContentForm("Index", "Custom", FormMethod.Post))
{
    <!-- Form content -->
}

<!-- Or use IUrlResolver directly -->
@inject IUrlResolver UrlResolver
<a href="@UrlResolver.GetUrl(Model.ContentLink)">Link Text</a>
```

## Behavioral Changes

### Access Checks During Routing

**CMS 11**: Routing executed AFTER authentication. User identity was available during routing.

**CMS 12**: User is NOT authenticated during routing. Authorization happens post-routing.

**Impact**: Partial routers and routing events MUST NOT perform access checks or rely on authenticated user context.

```csharp
// WRONG in CMS 12 - user not authenticated during routing
public object RoutePartial(PageData content, SegmentContext segmentContext)
{
    // This will fail - user not authenticated yet
    if (!content.QueryDistinctAccess(AccessLevel.Read))
    {
        return null;
    }
    return content;
}

// CORRECT - defer access checks to controller/middleware
public object RoutePartial(PageData content, SegmentContext segmentContext)
{
    // Just route - authorization happens later via [Authorize] or policy
    return content;
}
```

### Request Language Resolution

**CMS 11**: Set `ContentLanguage.PreferredCulture` early during routing.

**CMS 12**: Does NOT set culture until routing completes.

**Impact**: Partial routers must explicitly pass language to `IContentLoader`.

```csharp
// CMS 12 - explicitly resolve and pass language
public object RoutePartial(PageData content, SegmentContext segmentContext)
{
    var language = segmentContext.GetNextValue(segmentContext.RemainingPath);
    var cultureInfo = new CultureInfo(language.Next);

    var childContent = _contentLoader.Get<PageData>(
        childReference,
        cultureInfo  // Explicitly pass language
    );

    return childContent;
}
```

### Policy Evaluation

CMS 12 evaluates the user against the `episerver:read` policy post-routing. Implement custom authorization policies as needed.

## Detection Patterns

Search codebase for these patterns indicating CMS 11 routing code:

```bash
# Partial router registration
RegisterPartialRouter

# Content route registration
MapContentRoute

# Route events
IContentRouteEvents

# Direct route collection access
RouteCollection

# HTML helpers
Html.ActionLink
Html.BeginForm

# ASP.NET routing namespace
using System.Web.Routing
```

## Migration Checklist

- [ ] Convert `RegisterPartialRouter()` calls to DI registration
- [ ] Replace `MapContentRoute()` with `IContentRouteRegister` implementation
- [ ] Update `Html.ActionLink()` to `Html.ContentLink()`
- [ ] Update `Html.BeginForm()` to `Html.BeginContentForm()`
- [ ] Remove access checks from partial routers
- [ ] Add explicit language passing to `IContentLoader` calls in routers
- [ ] Replace `IContentRouteEvents` with `IContentUrlGeneratorEvents` and `IContentUrlResolverEvents`
- [ ] Test routing without authenticated user context
- [ ] Verify authorization policies work post-routing
