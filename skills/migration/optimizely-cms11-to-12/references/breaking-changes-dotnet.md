# .NET Breaking API Changes: CMS 11 → CMS 12

This document catalogs all .NET-level breaking changes when migrating from Optimizely CMS 11 (.NET Framework) to CMS 12 (.NET 5+).

---

## 1. Dependency Injection: StructureMap → Built-in DI

**What changed**: CMS 11 used StructureMap for dependency injection. CMS 12 uses Microsoft.Extensions.DependencyInjection (standard .NET Core DI).

**Removed/Changed types**:
- `EPiServer.ServiceLocation.StructureMap`
- `StructureMap.Registry`
- Custom `IServiceLocator` implementations
- `For<T>().Use<T>()` StructureMap syntax

**Detection patterns**:
- `using StructureMap`
- `using EPiServer.ServiceLocation.StructureMap`
- `Registry`
- `For<`
- `.Use<`

**Before (CMS 11)**:
```csharp
using EPiServer.Framework;
using EPiServer.Framework.Initialization;
using EPiServer.ServiceLocation;
using StructureMap;

namespace MySite.Infrastructure
{
    [InitializableModule]
    [ModuleDependency(typeof(ServiceContainerInitialization))]
    public class DependencyResolverInitialization : IConfigurableModule
    {
        public void ConfigureContainer(ServiceConfigurationContext context)
        {
            context.StructureMap().Configure(c =>
            {
                c.For<IMyService>().Use<MyService>();
                c.For<IRepository>().HttpContextScoped().Use<Repository>();
                c.For<ICache>().Singleton().Use<MemoryCache>();
            });
        }

        public void Initialize(InitializationEngine context) { }
        public void Uninitialize(InitializationEngine context) { }
    }
}
```

**After (CMS 12)**:
```csharp
using Microsoft.Extensions.DependencyInjection;

namespace MySite
{
    public class Startup
    {
        private readonly IWebHostEnvironment _webHostEnvironment;

        public Startup(IWebHostEnvironment webHostEnvironment)
        {
            _webHostEnvironment = webHostEnvironment;
        }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCmsAspNetIdentity<ApplicationUser>();
            services.AddCms()
                .AddCmsAspNetIdentity<ApplicationUser>();

            if (_webHostEnvironment.IsDevelopment())
            {
                services.AddCmsUI();
            }

            // Custom service registration
            services.AddTransient<IMyService, MyService>();
            services.AddScoped<IRepository, Repository>();
            services.AddSingleton<ICache, MemoryCache>();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseStaticFiles();
            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapContent();
                endpoints.MapControllers();
                endpoints.MapRazorPages();
            });
        }
    }
}
```

**Migration guidance**: Move all StructureMap Registry code to `Startup.ConfigureServices()`. Replace StructureMap-specific lifetime methods with standard DI lifetimes. Remove `[InitializableModule]` classes that only registered dependencies.

---

## 2. Service Lifetimes

**What changed**: StructureMap-specific lifetimes replaced with standard .NET Core lifetimes.

**Removed/Changed types**:
- `HttpContextScoped()`
- `Hybrid()`
- `HybridHttpOrThreadLocalScoped()`

**Detection patterns**:
- `.HttpContextScoped()`
- `.Hybrid()`
- `.HybridHttpOrThreadLocalScoped()`

**Before (CMS 11)**:
```csharp
context.StructureMap().Configure(c =>
{
    // Per HTTP request
    c.For<ICartService>().HttpContextScoped().Use<CartService>();

    // Hybrid: HTTP request if available, otherwise thread-local
    c.For<IContentLoader>().Hybrid().Use<ContentLoader>();

    // Singleton
    c.For<IConfiguration>().Singleton().Use<Configuration>();

    // Transient (default in StructureMap)
    c.For<IValidator>().Use<Validator>();
});
```

**After (CMS 12)**:
```csharp
services.AddScoped<ICartService, CartService>(); // Per HTTP request

services.AddScoped<IContentLoader, ContentLoader>(); // Per request scope

services.AddSingleton<IConfiguration, Configuration>(); // Singleton

services.AddTransient<IValidator, Validator>(); // Transient
```

**Migration guidance**:
- `HttpContextScoped()` → `AddScoped<T>()`
- `Hybrid()` → `AddScoped<T>()` (CMS manages scopes automatically)
- `Singleton()` → `AddSingleton<T>()`
- Default (no lifetime) → `AddTransient<T>()`

---

## 3. ServiceLocator.Current Outside HTTP Context

**What changed**: `ServiceLocator.Current` still exists but creates issues outside HTTP request context. Use scopes explicitly.

**Removed/Changed types**:
- `ServiceLocator.Current.CreateScope()` (incorrect pattern)

**Detection patterns**:
- `ServiceLocator.Current.GetInstance`
- `ServiceLocator.Current.GetService`

**Before (CMS 11)**:
```csharp
// Works in scheduled jobs or background tasks
public class MyScheduledJob : ScheduledJobBase
{
    public override string Execute()
    {
        var contentLoader = ServiceLocator.Current.GetInstance<IContentLoader>();
        var content = contentLoader.Get<PageData>(ContentReference.StartPage);
        return "Success";
    }
}
```

**After (CMS 12)**:
```csharp
// In scheduled jobs: CMS auto-creates scopes
public class MyScheduledJob : ScheduledJobBase
{
    private readonly IContentLoader _contentLoader;

    public MyScheduledJob(IContentLoader contentLoader)
    {
        _contentLoader = contentLoader;
    }

    public override string Execute()
    {
        var content = _contentLoader.Get<PageData>(ContentReference.StartPage);
        return "Success";
    }
}

// In background tasks or console apps: create scope manually
public class BackgroundWorker
{
    public void ProcessContent()
    {
        // Use CreateServiceLocatorScope for CMS services
        using (var scope = ServiceLocator.Current.CreateServiceLocatorScope())
        {
            var contentLoader = scope.ServiceLocator.GetInstance<IContentLoader>();
            var content = contentLoader.Get<PageData>(ContentReference.StartPage);
            // Process content
        }
    }
}
```

**Migration guidance**: Prefer constructor injection. For background tasks outside HTTP context, use `CreateServiceLocatorScope()` instead of `CreateScope()`. CMS automatically creates scopes for scheduled jobs.

---

## 4. Logging: Log4Net → Microsoft.Extensions.Logging

**What changed**: CMS 11 used Log4Net directly. CMS 12 uses Microsoft.Extensions.Logging with EPiServer.Logging as a facade.

**Removed/Changed types**:
- `EPiServer.Logging.Log4Net` package
- Direct Log4Net references

**Detection patterns**:
- `using EPiServer.Logging.Log4Net`
- `log4net`
- `LogManager.GetLogger`

**Before (CMS 11)**:
```csharp
using EPiServer.Logging;

namespace MySite.Business
{
    public class MyService
    {
        private static readonly ILogger _logger = LogManager.GetLogger(typeof(MyService));

        public void ProcessData()
        {
            _logger.Information("Processing started");
            try
            {
                // Process
                _logger.Debug("Processing detail");
            }
            catch (Exception ex)
            {
                _logger.Error("Processing failed", ex);
            }
        }
    }
}
```

**After (CMS 12)**:
```csharp
using Microsoft.Extensions.Logging;

namespace MySite.Business
{
    public class MyService
    {
        private readonly ILogger<MyService> _logger;

        public MyService(ILogger<MyService> logger)
        {
            _logger = logger;
        }

        public void ProcessData()
        {
            _logger.LogInformation("Processing started");
            try
            {
                // Process
                _logger.LogDebug("Processing detail");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Processing failed");
            }
        }
    }
}
```

**Migration guidance**: Inject `ILogger<T>` via constructor. Replace `LogManager.GetLogger()` with injected logger. Update method names: `Information` → `LogInformation`, `Error` → `LogError`, `Debug` → `LogDebug`. Remove `EPiServer.Logging.Log4Net` package reference.

---

## 5. Partial Controllers → View Components

**What changed**: Partial content rendering controllers replaced with view components.

**Removed/Changed types**:
- `BlockController<TBlock>`
- `PartialContentController<TContent>`

**Detection patterns**:
- `: BlockController<`
- `: PartialContentController<`

**Before (CMS 11)**:
```csharp
using EPiServer.Web.Mvc;

namespace MySite.Controllers
{
    public class TeaserBlockController : BlockController<TeaserBlock>
    {
        public override ActionResult Index(TeaserBlock currentBlock)
        {
            var model = new TeaserBlockViewModel
            {
                Heading = currentBlock.Heading,
                Image = currentBlock.Image
            };
            return PartialView(model);
        }
    }
}
```

**After (CMS 12)**:
```csharp
using EPiServer.Web.Mvc;
using Microsoft.AspNetCore.Mvc;

namespace MySite.Components
{
    // Synchronous view component
    public class TeaserBlockComponent : BlockComponent<TeaserBlock>
    {
        protected override IViewComponentResult InvokeComponent(TeaserBlock currentBlock)
        {
            var model = new TeaserBlockViewModel
            {
                Heading = currentBlock.Heading,
                Image = currentBlock.Image
            };
            return View(model);
        }
    }

    // Async view component (preferred for data access)
    public class ArticleListBlockComponent : AsyncBlockComponent<ArticleListBlock>
    {
        private readonly IContentLoader _contentLoader;

        public ArticleListBlockComponent(IContentLoader contentLoader)
        {
            _contentLoader = contentLoader;
        }

        protected override async Task<IViewComponentResult> InvokeComponentAsync(ArticleListBlock currentBlock)
        {
            var articles = await LoadArticlesAsync(currentBlock.ArticleRoot);
            var model = new ArticleListViewModel { Articles = articles };
            return View(model);
        }

        private async Task<List<ArticlePage>> LoadArticlesAsync(ContentReference root)
        {
            // Async data loading
            return await Task.FromResult(
                _contentLoader.GetChildren<ArticlePage>(root).ToList()
            );
        }
    }
}
```

**Migration guidance**: Replace `BlockController<T>` with `BlockComponent<T>` (sync) or `AsyncBlockComponent<T>` (async). Replace `Index()` method with `InvokeComponent()` or `InvokeComponentAsync()`. Move views to `/Views/Shared/Components/{ComponentName}/Default.cshtml`. Update `@Html.PropertyFor()` calls to render blocks automatically as components.

---

## 6. VirtualPathProvider → IFileProvider

**What changed**: ASP.NET Core uses `IFileProvider` instead of `VirtualPathProvider` for virtual file systems.

**Removed/Changed types**:
- `VirtualPathNonUnifiedProvider`
- `VirtualPathProvider`

**Detection patterns**:
- `VirtualPathNonUnifiedProvider`
- `VirtualPathProvider`
- `HostingEnvironment.RegisterVirtualPathProvider`

**Before (CMS 11)**:
```csharp
using System.Web.Hosting;
using EPiServer.Framework;
using EPiServer.Framework.Initialization;

namespace MySite.Infrastructure
{
    [InitializableModule]
    public class VirtualPathInitialization : IInitializableModule
    {
        public void Initialize(InitializationEngine context)
        {
            var provider = new MyVirtualPathProvider();
            HostingEnvironment.RegisterVirtualPathProvider(provider);
        }

        public void Uninitialize(InitializationEngine context) { }
    }
}
```

**After (CMS 12)**:
```csharp
using EPiServer.Framework;
using EPiServer.Framework.Initialization;
using EPiServer.Web;
using Microsoft.Extensions.FileProviders;

namespace MySite.Infrastructure
{
    [InitializableModule]
    public class FileProviderInitialization : IInitializableModule
    {
        public void Initialize(InitializationEngine context)
        {
            var options = context.Locate.Advanced.GetInstance<CompositeFileProviderOptions>();

            // Add physical file provider
            options.AddProvider(new MappingPhysicalFileProvider(
                virtualPath: "/MyModules",
                basePath: "MyModulePath",
                physicalPath: Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Modules", "MyModule")
            ));

            // Or add embedded file provider
            options.AddProvider(new ManifestEmbeddedFileProvider(
                assembly: typeof(FileProviderInitialization).Assembly,
                root: "MySite.EmbeddedResources"
            ));
        }

        public void Uninitialize(InitializationEngine context) { }
    }
}
```

**Migration guidance**: Replace `VirtualPathProvider` with `IFileProvider` implementations. Use `MappingPhysicalFileProvider` for physical paths or `ManifestEmbeddedFileProvider` for embedded resources. Register via `CompositeFileProviderOptions` in initialization module.

---

## 7. GuiPlugIn Removal

**What changed**: `[GuiPlugIn]` attribute no longer works. Use menu providers to extend admin mode.

**Removed/Changed types**:
- `GuiPlugIn` attribute
- `PlugInArea.AdminMenu`, `PlugInArea.EditMenu`, etc.

**Detection patterns**:
- `[GuiPlugIn`
- `PlugInArea.`

**Before (CMS 11)**:
```csharp
using EPiServer.PlugIn;

namespace MySite.Admin
{
    [GuiPlugIn(
        Area = PlugInArea.AdminMenu,
        Url = "~/Admin/MyTool",
        DisplayName = "My Admin Tool",
        Description = "Custom admin tool",
        RequiredAccess = AccessLevel.Administer
    )]
    public class MyAdminTool
    {
    }
}
```

**After (CMS 12)**:
```csharp
using EPiServer.Security;
using EPiServer.Shell.Navigation;

namespace MySite.Infrastructure
{
    [MenuProvider]
    public class MyAdminMenuProvider : IMenuProvider
    {
        public IEnumerable<MenuItem> GetMenuItems()
        {
            var menuItem = new UrlMenuItem("My Admin Tool",
                MenuPaths.Global + "/cms/admin/mytools",
                "/Admin/MyTool")
            {
                IsAvailable = context => PrincipalInfo.HasAdminAccess,
                SortIndex = 100
            };

            return new[] { menuItem };
        }
    }
}
```

**Migration guidance**: Remove `[GuiPlugIn]` attributes. Create `IMenuProvider` implementations to add menu items. Use `MenuPaths` constants for menu structure. Implement `IsAvailable` for access control.

---

## 8. PagePlugIn Removal

**What changed**: `[PagePlugIn]` attribute no longer supported. Use action filters or middleware.

**Removed/Changed types**:
- `PagePlugIn` attribute

**Detection patterns**:
- `[PagePlugIn`

**Before (CMS 11)**:
```csharp
using EPiServer.PlugIn;

namespace MySite.Plugins
{
    [PagePlugIn]
    public class CustomPagePlugin : IHttpHandler
    {
        public void ProcessRequest(HttpContext context)
        {
            // Custom logic
        }

        public bool IsReusable => false;
    }
}
```

**After (CMS 12)**:
```csharp
using Microsoft.AspNetCore.Mvc.Filters;

namespace MySite.Infrastructure
{
    // Option 1: Action filter
    public class CustomActionFilter : IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            // Before action logic
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            // After action logic
        }
    }

    // Register in Startup.cs
    // services.AddControllersWithViews(options =>
    // {
    //     options.Filters.Add<CustomActionFilter>();
    // });
}
```

**Migration guidance**: Replace `[PagePlugIn]` with action filters for MVC concerns or middleware for HTTP pipeline concerns. Register filters in `Startup.ConfigureServices()`.

---

## 9. IInitializableHttpModule → Middleware

**What changed**: HTTP modules replaced with ASP.NET Core middleware.

**Removed/Changed types**:
- `IInitializableHttpModule`
- `IHttpModule`

**Detection patterns**:
- `: IInitializableHttpModule`
- `: IHttpModule`

**Before (CMS 11)**:
```csharp
using EPiServer.Framework;
using EPiServer.Framework.Initialization;
using System.Web;

namespace MySite.Infrastructure
{
    [InitializableModule]
    public class CustomHttpModule : IInitializableHttpModule
    {
        public void Initialize(InitializationEngine context)
        {
            // Module initialization
        }

        public void Uninitialize(InitializationEngine context)
        {
        }

        public void InitializeHttpEvents(HttpApplication application)
        {
            application.BeginRequest += OnBeginRequest;
            application.EndRequest += OnEndRequest;
        }

        private void OnBeginRequest(object sender, EventArgs e)
        {
            var app = (HttpApplication)sender;
            var context = app.Context;
            // Custom logic
        }

        private void OnEndRequest(object sender, EventArgs e)
        {
            // Cleanup
        }
    }
}
```

**After (CMS 12)**:
```csharp
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace MySite.Infrastructure
{
    // Middleware class
    public class CustomMiddleware
    {
        private readonly RequestDelegate _next;

        public CustomMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Before logic (equivalent to BeginRequest)

            await _next(context); // Call next middleware

            // After logic (equivalent to EndRequest)
        }
    }

    // Extension method for clean registration
    public static class CustomMiddlewareExtensions
    {
        public static IApplicationBuilder UseCustomMiddleware(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<CustomMiddleware>();
        }
    }

    // In Startup.Configure():
    // app.UseCustomMiddleware();
}
```

**Migration guidance**: Convert `IInitializableHttpModule` to middleware classes with `InvokeAsync()` method. Register middleware in `Startup.Configure()` pipeline. Place middleware in correct order relative to authentication, routing, etc.

---

## 10. HTTP Handlers → Middleware/Endpoints

**What changed**: Specialized HTTP handlers removed. Use middleware or endpoint routing.

**Removed/Changed types**:
- `MediaHandlerBase`
- `StaticFileHandler`
- `BlobHttpHandler`

**Detection patterns**:
- `: MediaHandlerBase`
- `: StaticFileHandler`
- `BlobHttpHandler`

**Before (CMS 11)**:
```csharp
using EPiServer.Web;

namespace MySite.Business
{
    public class CustomMediaHandler : MediaHandlerBase
    {
        protected override void ProcessRequest(HttpContext context, ContentReference contentLink)
        {
            var media = ContentLoader.Get<MediaData>(contentLink);
            // Serve media
        }
    }
}
```

**After (CMS 12)**:
```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace MySite.Controllers
{
    [Route("api/media")]
    public class MediaController : ControllerBase
    {
        private readonly IContentLoader _contentLoader;

        public MediaController(IContentLoader contentLoader)
        {
            _contentLoader = contentLoader;
        }

        [HttpGet("{id}")]
        public IActionResult GetMedia(int id)
        {
            var contentReference = new ContentReference(id);
            var media = _contentLoader.Get<MediaData>(contentReference);

            if (media == null)
                return NotFound();

            var contentTypeProvider = new FileExtensionContentTypeProvider();
            var contentType = contentTypeProvider.TryGetContentType(media.Name, out var mimeType)
                ? mimeType
                : "application/octet-stream";

            return File(media.BinaryData.OpenRead(), contentType);
        }
    }

    // Or use middleware for more control
    public class CustomMediaMiddleware
    {
        private readonly RequestDelegate _next;

        public CustomMediaMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.Request.Path.StartsWithSegments("/media"))
            {
                // Handle media request
                return;
            }

            await _next(context);
        }
    }
}
```

**Migration guidance**: Replace HTTP handlers with controller endpoints for simple cases or middleware for complex request processing. Use `IActionResult` return types for file serving. Leverage built-in static file middleware when appropriate.

---

## 11. Template Selection Change

**What changed**: CMS 12 no longer searches Preview tag during Edit mode template resolution.

**Removed/Changed types**: None (behavioral change)

**Detection patterns**:
- `[TemplateDescriptor(Tags = new[] { RenderingTags.Preview }`

**Before (CMS 11)**:
```csharp
using EPiServer.DataAbstraction;
using EPiServer.Web.Mvc;

namespace MySite.Controllers
{
    // In CMS 11, this was selected in Edit mode
    [TemplateDescriptor(
        ControllerType = typeof(ArticlePageController),
        Tags = new[] { RenderingTags.Preview },
        AvailableWithoutTag = false
    )]
    public class ArticlePageController : PageController<ArticlePage>
    {
        public ActionResult Index(ArticlePage currentPage)
        {
            return View(currentPage);
        }
    }
}
```

**After (CMS 12)**:
```csharp
using EPiServer.DataAbstraction;
using EPiServer.Web.Mvc;

namespace MySite.Controllers
{
    // Add Edit tag explicitly to be available in Edit mode
    [TemplateDescriptor(
        ControllerType = typeof(ArticlePageController),
        Tags = new[] { RenderingTags.Edit, RenderingTags.Preview },
        AvailableWithoutTag = false
    )]
    public class ArticlePageController : PageController<ArticlePage>
    {
        public ActionResult Index(ArticlePage currentPage)
        {
            return View(currentPage);
        }
    }
}
```

**Migration guidance**: Review all templates tagged only with `RenderingTags.Preview`. Add `RenderingTags.Edit` to any template that should be available in Edit mode. CMS 12 search order: Edit → No Tag (Preview no longer searched in Edit mode).

---

## 12. PrincipalInfo.CurrentPrincipal in Scheduled Jobs

**What changed**: `PrincipalInfo.CurrentPrincipal` not available in scheduled job context in CMS 12. `System.Threading.Thread.CurrentPrincipal` doesn't work as in CMS 11.

**Removed/Changed types**: None (behavioral change)

**Detection patterns**:
- `PrincipalInfo.CurrentPrincipal` in scheduled jobs
- `Thread.CurrentPrincipal` in scheduled jobs

**Before (CMS 11)**:
```csharp
using EPiServer.PlugIn;
using EPiServer.Scheduler;
using EPiServer.Security;

namespace MySite.Jobs
{
    [ScheduledPlugIn(DisplayName = "Content Publisher")]
    public class PublishContentJob : ScheduledJobBase
    {
        public override string Execute()
        {
            var currentUser = PrincipalInfo.CurrentPrincipal; // Works in CMS 11
            var userName = currentUser.Identity.Name;

            // Publish content as current user
            return $"Published by {userName}";
        }
    }
}
```

**After (CMS 12)**:
```csharp
using EPiServer.PlugIn;
using EPiServer.Scheduler;
using EPiServer.Security;
using Microsoft.AspNetCore.Http;
using System.Security.Principal;

namespace MySite.Jobs
{
    [ScheduledPlugIn(DisplayName = "Content Publisher")]
    public class PublishContentJob : ScheduledJobBase
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PublishContentJob(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public override string Execute()
        {
            // Option 1: Use impersonation if you need specific user context
            var impersonatedUser = new GenericPrincipal(
                new GenericIdentity("admin"),
                new[] { "WebAdmins", "Administrators" }
            );

            PrincipalInfo.CurrentPrincipal = impersonatedUser;

            // Option 2: Job runs without user context - use service account
            // Content operations don't require user principal in background jobs

            // Publish content
            return "Published successfully";
        }
    }
}
```

**Migration guidance**: Don't rely on `PrincipalInfo.CurrentPrincipal` in scheduled jobs. Either impersonate a known user explicitly using `PrincipalInfo.CurrentPrincipal = new GenericPrincipal(...)`, or design jobs to work without user context. Consider service-level permissions instead of user-level.

---

## 13. Membership/Role Providers → ASP.NET Identity

**What changed**: ASP.NET Membership providers replaced with ASP.NET Core Identity.

**Removed/Changed types**:
- `SqlServerMembershipProvider`
- `WindowsMembershipProvider`
- `MultiplexingRoleProvider`
- `EPiServerProfile`

**Detection patterns**:
- `Membership.`
- `Roles.`
- `EPiServerProfile`
- `<membership>` in web.config

**Before (CMS 11)**:
```csharp
using System.Web.Security;
using EPiServer.Personalization;

namespace MySite.Business
{
    public class UserService
    {
        public void CreateUser(string username, string password, string email)
        {
            Membership.CreateUser(username, password, email);
        }

        public void AssignRole(string username, string role)
        {
            Roles.AddUserToRole(username, role);
        }

        public EPiServerProfile GetProfile(string username)
        {
            return EPiServerProfile.Get(username);
        }
    }
}
```

**After (CMS 12)**:
```csharp
using Microsoft.AspNetCore.Identity;
using System.Threading.Tasks;

namespace MySite.Business
{
    // Define custom user class
    public class ApplicationUser : IdentityUser
    {
        public string FullName { get; set; }
        public DateTime? LastLoginDate { get; set; }
    }

    public class UserService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public UserService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            _userManager = userManager;
            _roleManager = roleManager;
        }

        public async Task CreateUserAsync(string username, string password, string email)
        {
            var user = new ApplicationUser
            {
                UserName = username,
                Email = email
            };
            await _userManager.CreateAsync(user, password);
        }

        public async Task AssignRoleAsync(string username, string role)
        {
            var user = await _userManager.FindByNameAsync(username);
            if (user != null)
            {
                await _userManager.AddToRoleAsync(user, role);
            }
        }

        public async Task<ApplicationUser> GetUserAsync(string username)
        {
            return await _userManager.FindByNameAsync(username);
        }
    }
}
```

**Startup.cs configuration**:
```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddCmsAspNetIdentity<ApplicationUser>();

    services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequireDigit = true;
        options.Password.RequiredLength = 8;
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();
}
```

**Migration guidance**: Replace `Membership` and `Roles` APIs with `UserManager<T>` and `RoleManager<T>`. Create custom `ApplicationUser` class extending `IdentityUser` for profile data. Use `AddCmsAspNetIdentity<ApplicationUser>()` in Startup. Migrate user data from ASP.NET Membership tables to ASP.NET Identity tables. EPiServerProfile no longer available - store custom data in ApplicationUser properties.

---

## 14. Authorization Policies

**What changed**: CMS admin area authorization moved from web.config to policy-based authorization.

**Removed/Changed types**: None (configuration change)

**Detection patterns**:
- `<location path="EPiServer">` in web.config
- `<authorization>` in web.config

**Before (CMS 11 web.config)**:
```xml
<location path="EPiServer">
  <system.web>
    <authorization>
      <allow roles="WebEditors, WebAdmins, Administrators" />
      <deny users="*" />
    </authorization>
  </system.web>
</location>
```

**After (CMS 12)**:
```csharp
using EPiServer.Cms.Shell;
using EPiServer.Security;
using EPiServer.Shell.Modules;
using Microsoft.Extensions.DependencyInjection;

namespace MySite
{
    public class Startup
    {
        public void ConfigureServices(IServiceCollection services)
        {
            // Default policy for shell modules
            services.Configure<CmsPolicyOptions>(options =>
            {
                options.SetDefaultPolicy(CmsPolicyNames.DefaultShellModule);
            });

            // Custom policy for specific module
            services.Configure<ShellConfiguration>(options =>
            {
                options.ProtectedModules.Add("MyCustomModule");
            });

            // Define custom authorization policy
            services.AddAuthorization(options =>
            {
                options.AddPolicy("CustomAdminPolicy", policy =>
                {
                    policy.RequireRole("WebAdmins", "Administrators");
                });
            });
        }
    }

    // Apply policy to controller
    [Authorize(Policy = "CustomAdminPolicy")]
    public class MyAdminController : Controller
    {
        // Admin actions
    }
}
```

**Migration guidance**: Remove `<location path="EPiServer">` from web.config. CMS modules automatically use `CmsPolicyNames.DefaultShellModule` policy (requires authenticated users in CmsAdmins, CmsEditors, or Administrators roles). Customize via `CmsPolicyOptions` or create custom policies with `AddAuthorization()`.

---

## 15. Visitor Group DateTime UTC Migration

**What changed**: Visitor group criteria changed from unspecified DateTime to UTC.

**Removed/Changed types**: None (database schema change)

**Detection patterns**:
- `TimeOfDayModel`
- `NumberOfVisitsModel`
- `TimePeriodModel`
- `EventModel`

**Before (CMS 11)**:
```csharp
// In CMS 11, DateTime values stored as DatabaseDateTimeKind.Unspecific
// Example in database:
// LastVisitDate: 2024-01-15 14:30:00 (no timezone info)
```

**After (CMS 12)**:
```csharp
// In CMS 12, DateTime values stored as DatabaseDateTimeKind.Utc
// Example in database:
// LastVisitDate: 2024-01-15 14:30:00 +00:00 (UTC)

// Migration script needed:
/*
UPDATE tblBigTableStoreConfig
SET Value = CONVERT(DATETIME,
    SWITCHOFFSET(CONVERT(DATETIMEOFFSET,
        CAST(Value AS DATETIME)), '+00:00'), 120)
WHERE StoreId IN (
    SELECT pkId FROM tblBigTable
    WHERE StoreName IN (
        'TimeOfDayModel',
        'NumberOfVisitsModel',
        'TimePeriodModel',
        'EventModel'
    )
)
AND Row IN (
    SELECT rows with datetime values based on model type
)
*/
```

**Custom criteria example**:
```csharp
using EPiServer.Personalization.VisitorGroups;

namespace MySite.VisitorGroups
{
    public class CustomTimeModel : CriterionModelBase
    {
        [DojoWidget(SelectionFactoryType = typeof(EnumSelectionFactory))]
        public TimeOfDay TimeOfDay { get; set; }

        public override bool IsMatch(IPrincipal principal, HttpContext httpContext)
        {
            // Always work with UTC internally
            var currentTimeUtc = DateTime.UtcNow.TimeOfDay;

            // Convert to user's timezone if needed
            // var userTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, userTimeZone);

            return currentTimeUtc.Hours >= 9 && currentTimeUtc.Hours < 17;
        }
    }
}
```

**Migration guidance**: Run database migration script to convert existing DateTime values to UTC. Update custom visitor group criteria to work with UTC times. If displaying times to users, convert from UTC to appropriate timezone. Test existing visitor groups after migration.

---

## 16. Program.cs / Startup.cs Patterns

**What changed**: CMS 12 uses ASP.NET Core hosting model with Program.cs and Startup.cs.

**Removed/Changed types**:
- Global.asax
- `Application_Start()`

**Detection patterns**:
- `Global.asax`
- `Application_Start`

**Before (CMS 11 Global.asax)**:
```csharp
using System.Web.Mvc;
using System.Web.Routing;

namespace MySite
{
    public class EPiServerApplication : Global
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            RouteConfig.RegisterRoutes(RouteTable.Routes);
        }
    }
}
```

**After (CMS 12 Program.cs - Standard Pattern)**:
```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace MySite
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureCmsDefaults()
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}
```

**After (CMS 12 Startup.cs - Standard Pattern)**:
```csharp
using EPiServer.Cms.Shell;
using EPiServer.Cms.UI.AspNetIdentity;
using EPiServer.Scheduler;
using EPiServer.ServiceLocation;
using EPiServer.Web.Routing;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace MySite
{
    public class Startup
    {
        private readonly IWebHostEnvironment _webHostingEnvironment;

        public Startup(IWebHostEnvironment webHostingEnvironment)
        {
            _webHostingEnvironment = webHostingEnvironment;
        }

        public void ConfigureServices(IServiceCollection services)
        {
            // Add CMS with ASP.NET Identity
            services.AddCmsAspNetIdentity<ApplicationUser>();

            // Add CMS
            services.AddCms()
                .AddCmsAspNetIdentity<ApplicationUser>()
                .AddFind();

            // Add admin UI in development
            if (_webHostingEnvironment.IsDevelopment())
            {
                services.AddCmsUI();
            }

            // Add MVC
            services.AddMvc();

            // Custom services
            services.AddTransient<IMyService, MyService>();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseStaticFiles();
            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapContent();
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=Home}/{action=Index}/{id?}");
                endpoints.MapRazorPages();
            });
        }
    }
}
```

**After (CMS 12 with Custom DI Container - Autofac Example)**:
```csharp
using Autofac;
using Autofac.Extensions.DependencyInjection;
using EPiServer.ServiceLocation;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace MySite
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureCmsDefaults()
                .UseServiceProviderFactory(new AutofacServiceProviderFactory())
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }

    public class Startup
    {
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCmsAspNetIdentity<ApplicationUser>();
            services.AddCms().AddCmsAspNetIdentity<ApplicationUser>();
            services.AddMvc();
        }

        // Configure Autofac container
        public void ConfigureContainer(ContainerBuilder builder)
        {
            builder.RegisterType<MyService>().As<IMyService>();
            builder.RegisterType<Repository>().As<IRepository>()
                .InstancePerLifetimeScope();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseStaticFiles();
            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapContent();
                endpoints.MapControllers();
            });
        }
    }
}
```

**Migration guidance**: Create Program.cs with `CreateHostBuilder()` calling `ConfigureCmsDefaults()`. Create Startup.cs with `ConfigureServices()` and `Configure()` methods. Move Global.asax initialization logic to appropriate Startup methods. For custom DI containers (Autofac, etc.), use `.UseServiceProviderFactory()` and `ConfigureContainer()` method.

---

## Summary

Key migration themes:

1. **Dependency Injection**: StructureMap → Microsoft.Extensions.DependencyInjection
2. **Logging**: Log4Net → Microsoft.Extensions.Logging
3. **Hosting**: Global.asax → Program.cs + Startup.cs
4. **HTTP Pipeline**: Modules/Handlers → Middleware
5. **Authentication**: Membership → ASP.NET Core Identity
6. **Authorization**: web.config → Policy-based
7. **Partial Rendering**: Controllers → View Components
8. **File Systems**: VirtualPathProvider → IFileProvider

All changes require updating NuGet packages, configuration files, and code patterns to align with .NET 5+ and ASP.NET Core conventions.
