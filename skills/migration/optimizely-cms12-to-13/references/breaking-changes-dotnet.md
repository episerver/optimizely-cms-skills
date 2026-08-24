# .NET Breaking Changes: Optimizely CMS 12 → CMS 13

> Comprehensive reference of all .NET breaking changes for migrating from Optimizely CMS 12 to CMS 13.
> Each entry includes before/after C# code, category, and detection patterns for automated scanning.

---

## 1. .NET Runtime

### 1.1 Target Framework Upgrade (.NET 6/8 → .NET 10.0)

CMS 13 requires .NET 10.0. Update `global.json`, project files, and language version.

**Before (CMS 12):**

```json
// global.json
{
  "sdk": {
    "version": "8.0.100",
    "rollForward": "latestMinor"
  }
}
```

```xml
<!-- .csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>12</LangVersion>
  </PropertyGroup>
</Project>
```

**After (CMS 13):**

```json
// global.json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestMinor"
  }
}
```

```xml
<!-- .csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>14</LangVersion>
  </PropertyGroup>
</Project>
```

**Detection:**
- Search for: `<TargetFramework>net6.0</TargetFramework>` or `<TargetFramework>net8.0</TargetFramework>`
- Search for: `"version": "6.` or `"version": "8.` in `global.json`
- Search for: `<LangVersion>` values below 14

---

## 2. Service Registration Namespace

### 2.1 DependencyInjection Namespace Change

The `AddCms*()` extension methods have moved from the Microsoft DI namespace to the EPiServer DI namespace.

**Before (CMS 12):**

```csharp
using Microsoft.Extensions.DependencyInjection;

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddCms();
        services.AddCmsAspNetIdentity<ApplicationUser>();
        services.AddCmsTinyMce();
        services.AddCmsUI();
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.DependencyInjection;

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddCms();
        services.AddCmsAspNetIdentity<ApplicationUser>();
        services.AddCmsTinyMce();
        services.AddCmsUI();
    }
}
```

**Detection:**
- Search for: `using Microsoft.Extensions.DependencyInjection` in files that also contain `AddCms`

### 2.2 Visitor Groups Explicit Registration

Visitor Groups MVC and UI must now be registered explicitly.

**Before (CMS 12):**

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddCms();
    // Visitor groups were included automatically
}
```

**After (CMS 13):**

```csharp
using EPiServer.DependencyInjection;

public void ConfigureServices(IServiceCollection services)
{
    services.AddCms();
    services.AddVisitorGroupsMvc();
    services.AddVisitorGroupsUI();
}
```

**Detection:**
- Search for: `AddCms()` without nearby `AddVisitorGroupsMvc` or `AddVisitorGroupsUI`
- Search for: `using EPiServer.Personalization.VisitorGroups`

---

## 3. Type Changes

### 3.1 PageReference → ContentReference

`PageReference` has been removed. All references must use `ContentReference`.

**Before (CMS 12):**

```csharp
using EPiServer.Core;

public class MyService
{
    public void ProcessPage(PageData page)
    {
        PageReference pageRef = page.PageLink;
        PageReference parentRef = page.ParentLink;
        PageReference archiveRef = page.ArchiveLink;
        PageReference startPage = PageReference.StartPage;
        PageReference rootPage = PageReference.RootPage;
        PageReference wasteBasket = ContentReference.WasteBasket;

        if (pageRef != PageReference.EmptyReference)
        {
            // do something
        }
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Core;

public class MyService
{
    public void ProcessPage(PageData page)
    {
        ContentReference contentRef = page.ContentLink;
        ContentReference parentRef = page.ParentLink;
        ContentReference archiveRef = page.ArchiveLink;
        ContentReference startPage = ContentReference.StartPage;
        ContentReference rootPage = ContentReference.RootPage;
        ContentReference wasteBasket = ContentReference.WasteBasket;

        if (!ContentReference.IsNullOrEmpty(contentRef))
        {
            // do something
        }
    }
}
```

**Detection:**
- Search for: `PageReference`
- Search for: `PageReference\.StartPage`
- Search for: `PageReference\.RootPage`
- Search for: `PageReference\.EmptyReference`
- Search for: `\.PageLink`

### 3.2 SiteDefinition → Application

`SiteDefinition` and related types have been replaced by `Application`.

**Before (CMS 12):**

```csharp
using EPiServer.Web;

public class MySiteService
{
    private readonly ISiteDefinitionRepository _siteRepo;
    private readonly ISiteDefinitionResolver _siteResolver;

    public MySiteService(
        ISiteDefinitionRepository siteRepo,
        ISiteDefinitionResolver siteResolver)
    {
        _siteRepo = siteRepo;
        _siteResolver = siteResolver;
    }

    public SiteDefinition GetCurrentSite()
    {
        SiteDefinition current = SiteDefinition.Current;
        return _siteResolver.GetByHostname("example.com", false);
    }

    public IEnumerable<SiteDefinition> ListSites()
    {
        return _siteRepo.List();
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Web;

public class MySiteService
{
    private readonly IApplicationRepository _appRepo;
    private readonly IApplicationResolver _appResolver;

    public MySiteService(
        IApplicationRepository appRepo,
        IApplicationResolver appResolver)
    {
        _appRepo = appRepo;
        _appResolver = appResolver;
    }

    public Application GetCurrentSite()
    {
        Application current = Application.Current;
        return _appResolver.GetByHostname("example.com", false);
    }

    public IEnumerable<Application> ListSites()
    {
        return _appRepo.List();
    }
}
```

**Detection:**
- Search for: `SiteDefinition`
- Search for: `ISiteDefinitionRepository`
- Search for: `ISiteDefinitionResolver`
- Search for: `SiteDefinition\.Current`

### 3.3 ContentArea No Longer Inherits XhtmlString

`ContentArea` is no longer a subclass of `XhtmlString`. Methods like `ToHtmlString`, `ToInternalString`, `FilteredItems`, and the `Tag` property have been removed.

**Before (CMS 12):**

```csharp
using EPiServer.Core;

public class ContentAreaHelper
{
    public string RenderContentArea(ContentArea contentArea, IPrincipal principal)
    {
        // ContentArea inherited from XhtmlString
        string html = contentArea.ToHtmlString();
        string internalString = contentArea.ToInternalString();
        var filtered = contentArea.FilteredItems;
        string tag = contentArea.Tag;

        return html;
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Core;

public class ContentAreaHelper
{
    private readonly IContentAreaLoader _contentAreaLoader;

    public ContentAreaHelper(IContentAreaLoader contentAreaLoader)
    {
        _contentAreaLoader = contentAreaLoader;
    }

    public IEnumerable<ContentAreaItem> GetItems(ContentArea contentArea)
    {
        // Use ContentArea.Items directly or IContentAreaLoader
        var items = contentArea.Items;
        var filteredItems = _contentAreaLoader.GetDisplayedItems(contentArea);

        return filteredItems;
    }
}
```

**Detection:**
- Search for: `contentArea\.ToHtmlString`
- Search for: `contentArea\.ToInternalString`
- Search for: `\.FilteredItems`
- Search for: `contentArea\.Tag`

### 3.4 ContentArea.FilteredItems → Items and IContentAreaLoader.Get → LoadContent

`ContentArea.FilteredItems` is removed (use `Items`). `IContentAreaLoader.Get()` is renamed to `LoadContent()`.

**Before (CMS 12):**

```csharp
var filtered = contentArea.FilteredItems;
var items = _contentAreaLoader.Get(contentArea);
```

**After (CMS 13):**

```csharp
var items = contentArea.Items;
var loadedItems = _contentAreaLoader.LoadContent(contentArea);
```

**Detection:**
- Search for: `\.FilteredItems`
- Search for: `_contentAreaLoader\.Get\(`
- Search for: `IContentAreaLoader\.Get\(`

### 3.5 ContentAreaItem Constructor No Longer Accepts ContentFragment

The `ContentAreaItem` constructor that accepted a `ContentFragment` parameter has been removed.

**Before (CMS 12):**

```csharp
using EPiServer.Core;

var fragment = new ContentFragment(contentLink, someGuid);
var item = new ContentAreaItem(fragment);
```

**After (CMS 13):**

```csharp
using EPiServer.Core;

var item = new ContentAreaItem
{
    ContentLink = contentLink
};
```

**Detection:**
- Search for: `ContentFragment`
- Search for: `new ContentAreaItem\(`

### 3.5 XhtmlString.ToHtmlString(IPrincipal) Removed

The `ToHtmlString` overload accepting `IPrincipal` has been removed. The parameterless `ToHtmlString()` now always applies access filtering.

**Before (CMS 12):**

```csharp
using EPiServer.Core;
using System.Security.Principal;

public string RenderXhtml(XhtmlString xhtml, IPrincipal user)
{
    return xhtml.ToHtmlString(user);
}
```

**After (CMS 13):**

```csharp
using EPiServer.Core;

public string RenderXhtml(XhtmlString xhtml)
{
    // Always filters based on current principal
    return xhtml.ToHtmlString();
}
```

**Detection:**
- Search for: `\.ToHtmlString\(.*IPrincipal`
- Search for: `\.ToHtmlString\(.*principal`

### 3.6 PropertyString.PublicString Removed

The `PublicString` property is removed. Use the `String` property which is now public.

**Before (CMS 12):**

```csharp
PropertyString prop = content.Property["Title"] as PropertyString;
string value = prop.PublicString;
```

**After (CMS 13):**

```csharp
PropertyString prop = content.Property["Title"] as PropertyString;
string value = prop.String;
```

**Detection:**
- Search for: `\.PublicString`

### 3.7 PropertyLongString.PublicLongString Removed

The `PublicLongString` property is removed. Use the `LongString` property which is now public.

**Before (CMS 12):**

```csharp
PropertyLongString prop = content.Property["Body"] as PropertyLongString;
string value = prop.PublicLongString;
```

**After (CMS 13):**

```csharp
PropertyLongString prop = content.Property["Body"] as PropertyLongString;
string value = prop.LongString;
```

**Detection:**
- Search for: `\.PublicLongString`

### 3.8 PropertyUrl Base Class Changed: PropertyString → PropertyLongString

`PropertyUrl` now inherits from `PropertyLongString` instead of `PropertyString`.

**Before (CMS 12):**

```csharp
// PropertyUrl inherited from PropertyString
PropertyUrl urlProp = content.Property["Link"] as PropertyUrl;
string shortValue = urlProp.String; // limited to PropertyString length
```

**After (CMS 13):**

```csharp
// PropertyUrl now inherits from PropertyLongString
PropertyUrl urlProp = content.Property["Link"] as PropertyUrl;
string longValue = urlProp.LongString; // supports longer values
```

**Detection:**
- Search for: `PropertyUrl`
- Search for: classes that inherit from or cast to `PropertyUrl`

### 3.9 LinkItem.Attributes: Dictionary → IDictionary, No Longer Case-Sensitive

`LinkItem.Attributes` changed from `Dictionary<string,string>` to `IDictionary<string,string>` and keys are no longer case-insensitive.

**Before (CMS 12):**

```csharp
using EPiServer.SpecializedProperties;

LinkItem link = new LinkItem();
Dictionary<string, string> attrs = link.Attributes; // concrete type
attrs["TARGET"] = "_blank"; // case-insensitive lookup worked
```

**After (CMS 13):**

```csharp
using EPiServer.SpecializedProperties;

LinkItem link = new LinkItem();
IDictionary<string, string> attrs = link.Attributes; // interface type
attrs["target"] = "_blank"; // use exact casing
```

**Detection:**
- Search for: `LinkItem\.Attributes`
- Search for: `Dictionary<string, string>.*Attributes`

### 3.10 PropertyCriteriaCollection: CollectionBase → IList<PropertyCriteria>

`PropertyCriteriaCollection` no longer inherits `CollectionBase`. It now implements `IList<PropertyCriteria>`.

**Before (CMS 12):**

```csharp
using EPiServer.Filters;

PropertyCriteriaCollection criteria = new PropertyCriteriaCollection();
criteria.Add(new PropertyCriteria
{
    Name = "PageName",
    Type = PropertyDataType.String,
    Condition = CompareCondition.Equal,
    Value = "Home"
});
int count = criteria.Count; // from CollectionBase
```

**After (CMS 13):**

```csharp
using EPiServer.Filters;

PropertyCriteriaCollection criteria = new PropertyCriteriaCollection();
criteria.Add(new PropertyCriteria
{
    Name = "PageName",
    Type = PropertyDataType.String,
    Condition = CompareCondition.Equal,
    Value = "Home"
});
int count = criteria.Count; // from IList<PropertyCriteria>
```

**Detection:**
- Search for: `PropertyCriteriaCollection`
- Search for: `CollectionBase`

### 3.11 Blob Class Now Abstract

The `Blob` class is now abstract. `OpenRead`, `OpenWrite`, and `Write` are abstract methods. New async methods are required.

**Before (CMS 12):**

```csharp
using EPiServer.Framework.Blobs;

public class MyBlobProvider : BlobProvider
{
    public override Blob GetBlob(Uri id)
    {
        return new Blob(id); // could instantiate directly
    }
}

// Usage
Blob blob = blobFactory.GetBlob(blobId);
Stream readStream = blob.OpenRead();
Stream writeStream = blob.OpenWrite();
blob.Write(sourceStream);
```

**After (CMS 13):**

```csharp
using EPiServer.Framework.Blobs;

public class MyBlob : Blob
{
    public MyBlob(Uri id) : base(id) { }

    public override Stream OpenRead() { /* implementation */ }
    public override Stream OpenWrite() { /* implementation */ }
    public override void Write(Stream data) { /* implementation */ }

    // New required async methods
    public override Task<Stream> OpenReadAsync()
    {
        return Task.FromResult(OpenRead());
    }

    public override Task<Stream> OpenWriteAsync()
    {
        return Task.FromResult(OpenWrite());
    }

    public override Task WriteAsync(Stream data)
    {
        Write(data);
        return Task.CompletedTask;
    }
}
```

**Detection:**
- Search for: `new Blob\(`
- Search for: `: BlobProvider`
- Search for: `class.*: Blob`

---

### 3.12 .PageLink → .ContentLink

The `PageLink` property on `PageData` is renamed to `ContentLink`.

**Before (CMS 12):**

```csharp
ContentReference link = page.PageLink;
```

**After (CMS 13):**

```csharp
ContentReference link = page.ContentLink;
```

**Detection:**
- Search for: `\.PageLink`

### 3.13 ContentCoreData → ContentNode

`ContentCoreData` is renamed to `ContentNode`. `IContentCoreDataLoader` is renamed to `IContentNodeLoader`.

**Before (CMS 12):**

```csharp
using EPiServer.Core;

ContentCoreData coreData = _coreDataLoader.Get(contentLink);
```

**After (CMS 13):**

```csharp
using EPiServer.Core;

ContentNode node = _nodeLoader.Get(contentLink);
```

**Detection:**
- Search for: `ContentCoreData`
- Search for: `IContentCoreDataLoader`

### 3.14 SoftLink.LinkStatus → HttpStatusCode

`SoftLink.LinkStatus` is renamed to `SoftLink.HttpStatusCode`.

**Before (CMS 12):**

```csharp
var status = softLink.LinkStatus;
```

**After (CMS 13):**

```csharp
var status = softLink.HttpStatusCode;
```

**Detection:**
- Search for: `\.LinkStatus`

### 3.15 RenderSettings.CustomTag → CustomTagName

`RenderSettings.CustomTag` is renamed to `CustomTagName`. `ChildrenCustomTag` is renamed to `ChildrenCustomTagName`.

**Before (CMS 12):**

```csharp
settings.CustomTag = "div";
settings.ChildrenCustomTag = "span";
```

**After (CMS 13):**

```csharp
settings.CustomTagName = "div";
settings.ChildrenCustomTagName = "span";
```

**Detection:**
- Search for: `\.CustomTag[^N]`
- Search for: `\.ChildrenCustomTag[^N]`

### 3.16 IContentTypeRepository<T> (Generic) → IContentTypeRepository

The generic `IContentTypeRepository<T>` is removed. Use the non-generic `IContentTypeRepository`.

**Before (CMS 12):**

```csharp
private readonly IContentTypeRepository<BlockType> _blockTypeRepo;

public MyService(IContentTypeRepository<BlockType> blockTypeRepo)
{
    _blockTypeRepo = blockTypeRepo;
}
```

**After (CMS 13):**

```csharp
private readonly IContentTypeRepository _contentTypeRepo;

public MyService(IContentTypeRepository contentTypeRepo)
{
    _contentTypeRepo = contentTypeRepo;
}
```

**Detection:**
- Search for: `IContentTypeRepository<`

---

## 4. Argument Validation

### 4.1 ArgumentNullException → ArgumentException for Empty Values

CMS 13 throws `ArgumentException` (instead of `ArgumentNullException`) for empty strings, null object properties, and empty `ContentReference` values.

**Before (CMS 12):**

```csharp
try
{
    var content = _contentRepository.Get<PageData>(ContentReference.EmptyReference);
}
catch (ArgumentNullException ex)
{
    _logger.LogError(ex, "Null argument");
}
```

**After (CMS 13):**

```csharp
try
{
    var content = _contentRepository.Get<PageData>(ContentReference.EmptyReference);
}
catch (ArgumentException ex)
{
    _logger.LogError(ex, "Invalid argument");
}
```

**Detection:**
- Search for: `catch\s*\(ArgumentNullException`
- Search for: `catch.*ArgumentNullException`

---

## 5. Serialization

### 5.1 Newtonsoft.Json → System.Text.Json

CMS 13 replaces Newtonsoft.Json with System.Text.Json. Several Newtonsoft-specific configuration types and methods are removed.

**Before (CMS 12):**

```csharp
using Newtonsoft.Json;
using EPiServer.Framework.Serialization;

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddCms();

        // Newtonsoft.Json configuration
        services.Configure<NewtonsoftJsonSerializerSettingsOptions>(options =>
        {
            options.Settings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
        });

        services.UseNewtonsoftJson();
    }
}

// Custom converter
public class MyConverter : JsonIdentityConverter
{
    public override void WriteJson(JsonWriter writer, object value,
        JsonSerializer serializer)
    {
        // Newtonsoft serialization
    }
}

// FormatterType usage
[FormatterType(typeof(MyFormatter))]
public class MyModel { }
```

**After (CMS 13):**

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddCms();

        // System.Text.Json configuration
        services.Configure<JsonSerializerOptions>(options =>
        {
            options.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        });
    }
}

// Custom converter using System.Text.Json
public class MyConverter : JsonConverter<MyType>
{
    public override MyType Read(ref Utf8JsonReader reader, Type typeToConvert,
        JsonSerializerOptions options)
    {
        // System.Text.Json deserialization
    }

    public override void Write(Utf8JsonWriter writer, MyType value,
        JsonSerializerOptions options)
    {
        // System.Text.Json serialization
    }
}
```

**Detection:**
- Search for: `using Newtonsoft.Json`
- Search for: `NewtonsoftJsonSerializerSettingsOptions`
- Search for: `UseNewtonsoftJson`
- Search for: `JsonIdentityConverter`
- Search for: `FormatterType`
- Search for: `JsonConvert\.SerializeObject`
- Search for: `JsonConvert\.DeserializeObject`

### 5.2 Serialization Constructors Removed

The `SerializationInfo`/`StreamingContext` constructor pattern (from `ISerializable`) is removed.

**Before (CMS 12):**

```csharp
using System.Runtime.Serialization;

[Serializable]
public class MyException : Exception, ISerializable
{
    public MyException() { }

    public MyException(string message) : base(message) { }

    // Serialization constructor
    protected MyException(SerializationInfo info, StreamingContext context)
        : base(info, context)
    {
        CustomData = info.GetString("CustomData");
    }

    public string CustomData { get; set; }

    public override void GetObjectData(SerializationInfo info,
        StreamingContext context)
    {
        base.GetObjectData(info, context);
        info.AddValue("CustomData", CustomData);
    }
}
```

**After (CMS 13):**

```csharp
public class MyException : Exception
{
    public MyException() { }

    public MyException(string message) : base(message) { }

    public MyException(string message, Exception innerException)
        : base(message, innerException) { }

    public string CustomData { get; set; }
}
```

**Detection:**
- Search for: `SerializationInfo`
- Search for: `StreamingContext`
- Search for: `\[Serializable\]`
- Search for: `ISerializable`
- Search for: `GetObjectData`

### 5.3 ClientEditorAttribute.EditorConfiguration Requires Strict JSON

`EditorConfiguration` now requires strict RFC 8259 JSON (no single quotes, no unquoted keys, no trailing commas).

**Before (CMS 12):**

```csharp
[ClientEditor(
    EditorConfiguration = "{ 'maxLength': 500, 'rows': 5, }")]
public virtual string Description { get; set; }
```

**After (CMS 13):**

```csharp
[ClientEditor(
    EditorConfiguration = "{\"maxLength\":500,\"rows\":5}")]
public virtual string Description { get; set; }
```

**Detection:**
- Search for: `EditorConfiguration\s*=`
- Search for: `ClientEditor`

---

## 6. Content Type & Property Validation

### 6.1 Content Type Name Validation

Content type names now require length [2-255] and must match `^[A-Za-z][_0-9A-Za-z]+`.

**Before (CMS 12):**

```csharp
[ContentType(
    DisplayName = "My Page",
    GUID = "12345678-1234-1234-1234-123456789012")]
public class X : PageData // single-character name allowed
{
}

[ContentType(
    DisplayName = "Special Page",
    GUID = "12345678-1234-1234-1234-123456789013")]
public class _SpecialPage : PageData // leading underscore allowed
{
}
```

**After (CMS 13):**

```csharp
[ContentType(
    DisplayName = "My Page",
    GUID = "12345678-1234-1234-1234-123456789012")]
public class MyPage : PageData // minimum 2 characters, starts with letter
{
}

[ContentType(
    DisplayName = "Special Page",
    GUID = "12345678-1234-1234-1234-123456789013")]
public class SpecialPage : PageData // starts with letter
{
}
```

**Detection:**
- Search for: `\[ContentType` to identify all content types and verify naming
- Search for content type class names with single character or leading underscore

### 6.2 Auto-Migration Prefixes for Invalid Names

CMS 13 auto-prefixes invalid names during migration with specific prefixes.

| Type | Prefix |
|------|--------|
| ContentType | `CT_` |
| PropertyDefinition | `PD_` |
| TabDefinition | `G_` |
| PropertyDefinitionType | `PDT_` |

**Before (CMS 12):**

```csharp
// Name "1BadName" stored in database
[ContentType(DisplayName = "Bad Name")]
public class 1BadName : PageData { } // invalid in CMS 13
```

**After (CMS 13):**

```csharp
// Auto-migrated to "CT_1BadName" in database
// Fix by renaming the class and updating code references
[ContentType(DisplayName = "Bad Name")]
public class CT_1BadName : PageData { } // or rename properly
```

**Detection:**
- Search for content type class names starting with digits or underscores
- Search for: `CT_|PD_|G_|PDT_` prefixes after migration

### 6.3 IPropertyDefinitionRepository.Save/Delete Obsoleted

`IPropertyDefinitionRepository.Save()` and `Delete()` now produce compilation errors. Modify `contentType.PropertyDefinitions` and save via `IContentTypeRepository`.

**Before (CMS 12):**

```csharp
using EPiServer.DataAbstraction;

public class PropertyMigration
{
    private readonly IPropertyDefinitionRepository _propRepo;

    public PropertyMigration(IPropertyDefinitionRepository propRepo)
    {
        _propRepo = propRepo;
    }

    public void UpdateProperty(PropertyDefinition propDef)
    {
        propDef.EditCaption = "Updated Caption";
        _propRepo.Save(propDef);
    }

    public void RemoveProperty(PropertyDefinition propDef)
    {
        _propRepo.Delete(propDef);
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.DataAbstraction;

public class PropertyMigration
{
    private readonly IContentTypeRepository _contentTypeRepo;

    public PropertyMigration(IContentTypeRepository contentTypeRepo)
    {
        _contentTypeRepo = contentTypeRepo;
    }

    public void UpdateProperty(ContentType contentType, string propertyName)
    {
        var propDef = contentType.PropertyDefinitions
            .First(p => p.Name == propertyName);
        propDef.EditCaption = "Updated Caption";
        _contentTypeRepo.Save(contentType);
    }

    public void RemoveProperty(ContentType contentType, string propertyName)
    {
        var propDef = contentType.PropertyDefinitions
            .First(p => p.Name == propertyName);
        contentType.PropertyDefinitions.Remove(propDef);
        _contentTypeRepo.Save(contentType);
    }
}
```

**Detection:**
- Search for: `IPropertyDefinitionRepository`
- Search for: `_propRepo\.Save\(` or `_propRepo\.Delete\(`
- Search for: `propertyDefinitionRepository\.Save`

### 6.4 IContentTypeRepository.Save() Now Saves PropertyDefinitions

`IContentTypeRepository.Save()` now also persists `PropertyDefinitions`. Properties not in the collection are deleted by default. Use `ContentTypeSaveOptions.KeepUndefinedPropertyDefinitions` to prevent unintended deletion.

**Before (CMS 12):**

```csharp
var contentType = _contentTypeRepo.Load("StandardPage");
contentType.Description = "Updated description";
_contentTypeRepo.Save(contentType);
// PropertyDefinitions were not affected
```

**After (CMS 13):**

```csharp
var contentType = _contentTypeRepo.Load("StandardPage");
contentType.Description = "Updated description";

// Option A: Save but keep undefined property definitions
_contentTypeRepo.Save(contentType, new ContentTypeSaveOptions
{
    KeepUndefinedPropertyDefinitions = true
});

// Option B: Save knowing all properties not in collection will be deleted
_contentTypeRepo.Save(contentType);
```

**Detection:**
- Search for: `IContentTypeRepository\.Save\(`
- Search for: `_contentTypeRepo\.Save\(`
- Search for: `ContentTypeSaveOptions`

### 6.5 PropertyDefinition.Searchable → IndexingType

The `Searchable` boolean property has been replaced by the `IndexingType` enum.

**Before (CMS 12):**

```csharp
PropertyDefinition propDef = contentType.PropertyDefinitions["MainBody"];
propDef.Searchable = true;
```

**After (CMS 13):**

```csharp
PropertyDefinition propDef = contentType.PropertyDefinitions["MainBody"];
propDef.IndexingType = IndexingType.Searchable;
```

**Detection:**
- Search for: `\.Searchable\s*=`
- Search for: `propDef\.Searchable`

---

## 7. Security & Access Control

### 7.1 IPreviewTokenService Changes

Preview tokens are no longer associated with specific content. `PreviewToken.ContentReference` has been removed.

**Before (CMS 12):**

```csharp
using EPiServer.Security;

public class PreviewService
{
    private readonly IPreviewTokenService _tokenService;

    public PreviewService(IPreviewTokenService tokenService)
    {
        _tokenService = tokenService;
    }

    public string GeneratePreview(ContentReference contentLink)
    {
        PreviewToken token = _tokenService.GenerateToken(contentLink);
        ContentReference linkedContent = token.ContentReference;
        return token.Token;
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Security;

public class PreviewService
{
    private readonly IPreviewTokenService _tokenService;

    public PreviewService(IPreviewTokenService tokenService)
    {
        _tokenService = tokenService;
    }

    public string GeneratePreview()
    {
        // Token is no longer content-specific
        PreviewToken token = _tokenService.GenerateToken();
        return token.Token;
    }
}
```

**Detection:**
- Search for: `IPreviewTokenService`
- Search for: `PreviewToken\.ContentReference`
- Search for: `GenerateToken\(.*contentLink`

### 7.2 PrincipalInfo.HasEditAccess Removed

`PrincipalInfo.HasEditAccess` is removed. Use role-based checks instead.

**Before (CMS 12):**

```csharp
using EPiServer.Security;

if (PrincipalInfo.HasEditAccess)
{
    // show editor toolbar
}
```

**After (CMS 13):**

```csharp
using System.Security.Claims;

if (HttpContext.User.IsInRole(Roles.CmsEditors))
{
    // show editor toolbar
}
```

**Detection:**
- Search for: `PrincipalInfo\.HasEditAccess`

### 7.3 PrincipalInfo.IsPermitted Removed

Use `PermissionService.IsPermitted()` instead.

**Before (CMS 12):**

```csharp
using EPiServer.Security;

bool hasPermission = PrincipalInfo.IsPermitted("AdminAccess");
```

**After (CMS 13):**

```csharp
using EPiServer.Security;

public class MyService
{
    private readonly IPermissionService _permissionService;

    public MyService(IPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    public bool CheckPermission(IPrincipal principal)
    {
        return _permissionService.IsPermitted(principal, "AdminAccess");
    }
}
```

**Detection:**
- Search for: `PrincipalInfo\.IsPermitted`

### 7.4 HTML Parsing Defaults Changed

`ScriptParserMode` defaults changed: `Remove` when loading content, `ThrowException` when saving content.

**Before (CMS 12):**

```csharp
// Scripts in HTML properties were allowed by default
services.Configure<HtmlParserOptions>(options =>
{
    options.ScriptParserMode = ScriptParserMode.Allow;
});
```

**After (CMS 13):**

```csharp
// Default: Remove on load, ThrowException on save
// To keep legacy behavior (not recommended):
services.Configure<HtmlParserOptions>(options =>
{
    options.ScriptParserModeOnLoad = ScriptParserMode.Allow;
    options.ScriptParserModeOnSave = ScriptParserMode.Allow;
});
```

**Detection:**
- Search for: `ScriptParserMode`
- Search for: `HtmlParserOptions`

### 7.5 New MediaUploadMode and MediaExtensionsToParse

New settings control which media file extensions are parsed for embedded scripts (`.svg`, `.svgz`, `.html`, `.htm`).

**Before (CMS 12):**

```csharp
// SVG files were uploaded without script parsing
```

**After (CMS 13):**

```csharp
services.Configure<MediaOptions>(options =>
{
    // These extensions are parsed for scripts by default
    // options.MediaExtensionsToParse includes: .svg, .svgz, .html, .htm
    options.MediaUploadMode = MediaUploadMode.Validate;
});
```

**Detection:**
- Search for: `MediaUploadMode`
- Search for: `MediaExtensionsToParse`
- Search for: `.svg` upload handling code

### 7.6 ValidateAntiForgeryReleaseToken Removed

Use the standard `ValidateAntiForgeryTokenAttribute` instead.

**Before (CMS 12):**

```csharp
[ValidateAntiForgeryReleaseToken]
public ActionResult DeleteContent(ContentReference contentLink)
{
    // action
}
```

**After (CMS 13):**

```csharp
[ValidateAntiForgeryToken]
public ActionResult DeleteContent(ContentReference contentLink)
{
    // action
}
```

**Detection:**
- Search for: `ValidateAntiForgeryReleaseToken`

---

## 8. Routing

### 8.1 RemainingPath → RemainingSegments

`RemainingPath` has been replaced with `RemainingSegments`.

**Before (CMS 12):**

```csharp
using EPiServer.Web.Routing;

public class MyPartialRouter : IPartialRouter<PageData, PageData>
{
    public PartialRouteData GetPartialVirtualPath(
        PageData content, string language, RouteValueDictionary routeValues,
        RequestContext requestContext)
    {
        return null;
    }

    public object RoutePartial(PageData content, UrlResolverContext context)
    {
        string remaining = context.RemainingPath;
        var segment = context.GetNextRemainingSegment(remaining);
        return content;
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Web.Routing;

public class MyPartialRouter : IPartialRouter<PageData, PageData>
{
    public PartialRouteData GetPartialVirtualPath(
        PageData content, string language, RouteValueDictionary routeValues,
        RequestContext requestContext)
    {
        return null;
    }

    public object RoutePartial(PageData content, UrlResolverContext context)
    {
        var segments = context.RemainingSegments;
        var segment = context.GetNextSegment(segments);
        return content;
    }
}
```

**Detection:**
- Search for: `RemainingPath`
- Search for: `GetNextRemainingSegment`

### 8.2 RoutingOptions.ConfigureForExternalTemplates Moved

Moved from `RoutingOptions` to `TemplateOptions`.

**Before (CMS 12):**

```csharp
services.Configure<RoutingOptions>(options =>
{
    options.ConfigureForExternalTemplates();
});
```

**After (CMS 13):**

```csharp
services.Configure<TemplateOptions>(options =>
{
    options.ConfigureForExternalTemplates();
});
```

**Detection:**
- Search for: `RoutingOptions.*ConfigureForExternalTemplates`

### 8.3 UsePrimaryHostForOutgoingUrls Obsoleted

This option is obsoleted and should be removed.

**Before (CMS 12):**

```csharp
services.Configure<RoutingOptions>(options =>
{
    options.UsePrimaryHostForOutgoingUrls = true;
});
```

**After (CMS 13):**

```csharp
// Remove the configuration; primary host behavior is now default
services.Configure<RoutingOptions>(options =>
{
    // UsePrimaryHostForOutgoingUrls is obsoleted
});
```

**Detection:**
- Search for: `UsePrimaryHostForOutgoingUrls`

### 8.4 UI URL Path Changed: /EPiServer → /Optimizely

The editorial UI base URL has changed.

**Before (CMS 12):**

```csharp
// Hardcoded references to the UI path
string editUrl = "/EPiServer/CMS/Content/edit/" + contentId;
string adminUrl = "/EPiServer/CMS/Admin";

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllerRoute("episerver", "/EPiServer/{**path}");
});
```

**After (CMS 13):**

```csharp
// Updated UI path
string editUrl = "/Optimizely/CMS/Content/edit/" + contentId;
string adminUrl = "/Optimizely/CMS/Admin";

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllerRoute("optimizely", "/Optimizely/{**path}");
});
```

**Detection:**
- Search for: `/EPiServer/`
- Search for: `EPiServer/CMS`

---

## 9. Repository & Data Access

### 9.1 DataAccessBase Obsoleted → IDatabaseExecutor

`DataAccessBase` is obsoleted. Use `IDatabaseExecutor` or `IAsyncDatabaseExecutor` instead.

**Before (CMS 12):**

```csharp
using EPiServer.DataAccess;

public class MyDataAccess : DataAccessBase
{
    public MyDataAccess(IDatabaseHandler handler) : base(handler) { }

    public IEnumerable<MyItem> GetItems()
    {
        return Execute(() =>
        {
            using var command = CreateCommand("MyStoredProc");
            command.CommandType = CommandType.StoredProcedure;
            using var reader = command.ExecuteReader();
            var items = new List<MyItem>();
            while (reader.Read())
            {
                items.Add(MapItem(reader));
            }
            return items;
        });
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Data;

public class MyDataAccess
{
    private readonly IDatabaseExecutor _dbExecutor;

    public MyDataAccess(IDatabaseExecutor dbExecutor)
    {
        _dbExecutor = dbExecutor;
    }

    public async Task<IEnumerable<MyItem>> GetItemsAsync()
    {
        return await _dbExecutor.ExecuteAsync(async () =>
        {
            using var command = _dbExecutor.CreateCommand("MyStoredProc",
                CommandType.StoredProcedure);
            using var reader = await command.ExecuteReaderAsync();
            var items = new List<MyItem>();
            while (await reader.ReadAsync())
            {
                items.Add(MapItem(reader));
            }
            return items;
        });
    }
}
```

**Detection:**
- Search for: `DataAccessBase`
- Search for: `: DataAccessBase`
- Search for: `IDatabaseHandler`

### 9.2 PermissionRepository Sync Methods Removed

Synchronous methods on `PermissionRepository` are removed. Use async equivalents.

**Before (CMS 12):**

```csharp
using EPiServer.Security;

var permissions = _permissionRepository.GetPermissions(contentLink);
_permissionRepository.Save(contentLink, accessControlList);
```

**After (CMS 13):**

```csharp
using EPiServer.Security;

var permissions = await _permissionRepository.GetPermissionsAsync(contentLink);
await _permissionRepository.SaveAsync(contentLink, accessControlList);
```

**Detection:**
- Search for: `_permissionRepository\.Get\(` (sync call)
- Search for: `_permissionRepository\.Save\(` (sync call)
- Search for: `PermissionRepository` without `Async`

### 9.3 IContentVersionRepository: IncludeTotalCount Must Be Set Explicitly

`IncludeTotalCount` is no longer set by default. You must opt in to get total counts.

**Before (CMS 12):**

```csharp
var versionFilter = new ContentVersionFilter
{
    ContentLink = contentLink,
    Status = VersionStatus.Published
};
var versions = _versionRepo.List(versionFilter);
int total = versions.TotalCount; // available by default
```

**After (CMS 13):**

```csharp
var versionFilter = new ContentVersionFilter
{
    ContentLink = contentLink,
    Status = VersionStatus.Published,
    IncludeTotalCount = true // must be explicit
};
var versions = _versionRepo.List(versionFilter);
int total = versions.TotalCount; // now available
```

**Detection:**
- Search for: `ContentVersionFilter`
- Search for: `\.TotalCount`
- Search for: `IContentVersionRepository`

### 9.4 IContentRepositoryExtension Obsoleted

Methods from `IContentRepositoryExtension` are now directly on `IContentRepository`.

**Before (CMS 12):**

```csharp
using EPiServer;

public class MyService
{
    private readonly IContentRepository _contentRepo;
    private readonly IContentRepositoryExtension _contentRepoExt;

    public MyService(
        IContentRepository contentRepo,
        IContentRepositoryExtension contentRepoExt)
    {
        _contentRepo = contentRepo;
        _contentRepoExt = contentRepoExt;
    }

    public IEnumerable<ContentReference> GetDescendants(ContentReference root)
    {
        return _contentRepoExt.GetDescendents(root);
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer;

public class MyService
{
    private readonly IContentRepository _contentRepo;

    public MyService(IContentRepository contentRepo)
    {
        _contentRepo = contentRepo;
    }

    public IEnumerable<ContentReference> GetDescendants(ContentReference root)
    {
        return _contentRepo.GetDescendants(root);
    }
}
```

**Detection:**
- Search for: `IContentRepositoryExtension`

### 9.5 IContentRepository.MoveToWastebasket: deletedBy Removed

The `deletedBy` parameter is removed. The current principal is resolved via `IPrincipalAccessor`.

**Before (CMS 12):**

```csharp
_contentRepository.MoveToWastebasket(contentLink, "admin");
```

**After (CMS 13):**

```csharp
// Uses IPrincipalAccessor internally to determine the user
_contentRepository.MoveToWastebasket(contentLink);
```

**Detection:**
- Search for: `MoveToWastebasket\(.*,`

### 9.6 Copy() No Longer Auto-Publishes

`IContentRepository.Copy()` no longer automatically publishes the copied content.

**Before (CMS 12):**

```csharp
// Copy created a published version automatically
ContentReference copy = _contentRepository.Copy(
    sourceLink, destinationLink, AccessLevel.NoAccess, false);
// copy was published
```

**After (CMS 13):**

```csharp
// Copy creates a draft; publish explicitly if needed
ContentReference copy = _contentRepository.Copy(
    sourceLink, destinationLink, AccessLevel.NoAccess, false);

// Explicitly publish the copy
var copiedContent = _contentRepository.Get<IContent>(copy).CreateWritableClone();
_contentRepository.Save(copiedContent, SaveAction.Publish);
```

**Detection:**
- Search for: `\.Copy\(`
- Search for: `_contentRepository\.Copy`

---

## 10. Validation System

### 10.1 IValidate<T> No Longer Auto-Registered

Custom validators implementing `IValidate<T>` must be explicitly registered.

**Before (CMS 12):**

```csharp
using EPiServer.Validation;

// Auto-discovered and registered
public class ArticlePageValidator : IValidate<ArticlePage>
{
    public IEnumerable<ValidationError> Validate(ArticlePage instance)
    {
        if (string.IsNullOrEmpty(instance.Title))
        {
            yield return new ValidationError
            {
                ErrorMessage = "Title is required",
                PropertyName = "Title",
                Severity = ValidationErrorSeverity.Error
            };
        }
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Validation;

// Same validator class
public class ArticlePageValidator : IValidate<ArticlePage>
{
    public IEnumerable<ValidationError> Validate(ArticlePage instance)
    {
        if (string.IsNullOrEmpty(instance.Title))
        {
            yield return new ValidationError
            {
                ErrorMessage = "Title is required",
                PropertyName = "Title",
                Severity = ValidationErrorSeverity.Error
            };
        }
    }
}

// Must register explicitly in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddCms();
    services.AddCmsValidator<ArticlePageValidator>();
}
```

**Detection:**
- Search for: `IValidate<`
- Search for: `class.*: IValidate`

### 10.2 RequiredPropertyValueException Removed

Use `System.ComponentModel.DataAnnotations.ValidationException` instead.

**Before (CMS 12):**

```csharp
using EPiServer.Core;

try
{
    _contentRepository.Save(content, SaveAction.Publish);
}
catch (RequiredPropertyValueException ex)
{
    _logger.LogWarning("Missing required property: {Prop}", ex.PropertyName);
}
```

**After (CMS 13):**

```csharp
using System.ComponentModel.DataAnnotations;

try
{
    _contentRepository.Save(content, SaveAction.Publish);
}
catch (ValidationException ex)
{
    _logger.LogWarning("Validation failed: {Message}", ex.Message);
}
```

**Detection:**
- Search for: `RequiredPropertyValueException`

### 10.3 Content References Validated for Existence During Save

Content references are now validated to point to existing content during save. Use `SaveAction.SkipReferenceValidation` to suppress.

**Before (CMS 12):**

```csharp
// References to non-existent content were allowed
var page = _contentRepository.GetDefault<ArticlePage>(parentLink);
page.RelatedPage = new ContentReference(99999); // might not exist
_contentRepository.Save(page, SaveAction.Publish);
```

**After (CMS 13):**

```csharp
// This will throw ValidationException if reference 99999 does not exist
var page = _contentRepository.GetDefault<ArticlePage>(parentLink);
page.RelatedPage = new ContentReference(99999);

// Option A: Fix the reference
page.RelatedPage = validContentLink;
_contentRepository.Save(page, SaveAction.Publish);

// Option B: Skip reference validation
_contentRepository.Save(page, SaveAction.Publish | SaveAction.SkipReferenceValidation);
```

**Detection:**
- Search for: `SaveAction\.Publish`
- Search for: `new ContentReference\(\d+\)` (hardcoded IDs may not exist)

### 10.4 New SaveAction Flags

New flags for controlling validation during save operations.

**Before (CMS 12):**

```csharp
_contentRepository.Save(content, SaveAction.Publish);
// No granular skip options
```

**After (CMS 13):**

```csharp
// Skip specific validations as needed
_contentRepository.Save(content,
    SaveAction.Publish | SaveAction.SkipReferenceValidation);

_contentRepository.Save(content,
    SaveAction.Publish | SaveAction.SkipApprovalValidation);

_contentRepository.Save(content,
    SaveAction.Publish | SaveAction.SkipDataValidation);

// Skip all validations (use with caution)
_contentRepository.Save(content,
    SaveAction.Publish | SaveAction.SkipValidation);
```

**Detection:**
- Search for: `SaveAction\.` to review current usage and add flags if needed

---

## 11. Events & Initialization

### 11.1 EventMessage: VerificationData and SiteId Removed

`VerificationData` and `SiteId` properties are removed from `EventMessage`.

**Before (CMS 12):**

```csharp
using EPiServer.Events;

public class MyEventHandler
{
    public void HandleEvent(object sender, EventNotificationEventArgs e)
    {
        var siteId = e.EventMessage.SiteId;
        var verification = e.EventMessage.VerificationData;
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Events;

public class MyEventHandler
{
    public void HandleEvent(object sender, EventNotificationEventArgs e)
    {
        // SiteId and VerificationData are no longer available
        var sequenceNumber = e.EventMessage.SequenceNumber;
        var raiserId = e.EventMessage.RaiserId;
    }
}
```

**Detection:**
- Search for: `EventMessage\.SiteId`
- Search for: `EventMessage\.VerificationData`

### 11.2 EventsServiceKnownTypeAttribute Removed

Use `TryAddCmsEventsParameterType<T>()` extension method instead.

**Before (CMS 12):**

```csharp
[EventsServiceKnownType]
public class MyEventData
{
    public string Data { get; set; }
}
```

**After (CMS 13):**

```csharp
// In Startup.cs or an initialization module
public void ConfigureServices(IServiceCollection services)
{
    services.AddCms();
    services.TryAddCmsEventsParameterType<MyEventData>();
}

public class MyEventData
{
    public string Data { get; set; }
}
```

**Detection:**
- Search for: `EventsServiceKnownType`

### 11.3 InitializationEngine Members Removed

`Assemblies`, `ScanAssemblies`, `BuildTypeScanner`, and `ConfigureModules` are removed from `InitializationEngine`.

**Before (CMS 12):**

```csharp
using EPiServer.Framework.Initialization;

public class MyModule : IInitializableModule
{
    public void Initialize(InitializationEngine context)
    {
        var assemblies = context.Assemblies;
        var scanner = context.BuildTypeScanner();
        context.ScanAssemblies(assemblies);
    }

    public void Uninitialize(InitializationEngine context) { }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Framework.Initialization;
using EPiServer.Framework.TypeScanner;

public class MyModule : IInitializableModule
{
    private ITypeScannerLookup _typeScanner;

    public void Initialize(InitializationEngine context)
    {
        // Use DI to get type scanning services
        _typeScanner = context.Locate.Advanced.GetInstance<ITypeScannerLookup>();
    }

    public void Uninitialize(InitializationEngine context) { }
}
```

**Detection:**
- Search for: `context\.Assemblies`
- Search for: `\.ScanAssemblies`
- Search for: `\.BuildTypeScanner`
- Search for: `\.ConfigureModules`

### 11.4 IConfigurableModule and IInitializationEngine Removed

Multiple classes no longer implement `IConfigurableModule`. The `IInitializationEngine` interface is removed.

**Before (CMS 12):**

```csharp
using EPiServer.Framework;
using EPiServer.Framework.Initialization;
using EPiServer.ServiceLocation;

[InitializableModule]
public class MyConfigModule : IConfigurableModule
{
    public void ConfigureContainer(ServiceConfigurationContext context)
    {
        context.Services.AddSingleton<IMyService, MyService>();
    }

    public void Initialize(InitializationEngine context) { }
    public void Uninitialize(InitializationEngine context) { }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Framework;
using EPiServer.Framework.Initialization;
using Microsoft.Extensions.DependencyInjection;

// Register services in Startup.cs instead
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddCms();
        services.AddSingleton<IMyService, MyService>();
    }
}

// Use IInitializableModule for initialization logic only
[InitializableModule]
public class MyModule : IInitializableModule
{
    public void Initialize(InitializationEngine context) { }
    public void Uninitialize(InitializationEngine context) { }
}
```

**Detection:**
- Search for: `IConfigurableModule`
- Search for: `IInitializationEngine`
- Search for: `ConfigureContainer`
- Search for: `ServiceConfigurationContext`

---

## 12. Localization

### 12.1 LocalizationService FallbackCulture Behavior

`LocalizationService` now checks invariant culture as `FallbackCulture` before returning a miss.

**Before (CMS 12):**

```csharp
// Fallback chain: requested culture → master language → not found
string text = _localizationService.GetString("/myapp/greeting");
// If not found for current culture, returned null or key
```

**After (CMS 13):**

```csharp
// Fallback chain: requested culture → master language → invariant culture → not found
string text = _localizationService.GetString("/myapp/greeting");
// Now also checks InvariantCulture before returning miss
// Ensure your localization files handle invariant culture if needed
```

**Detection:**
- Search for: `LocalizationService`
- Search for: `GetString\(`
- Search for: `FallbackCulture`

### 12.2 LoadString/GetAllStringsByCulture: string[] → ReadOnlyMemory<char>[]

Return types changed from `string[]` to `ReadOnlyMemory<char>[]`.

**Before (CMS 12):**

```csharp
using EPiServer.Framework.Localization;

public class MyLocalizationProvider : LocalizationProvider
{
    public override string[] LoadString(string[] normalizedKey, string[] originalKey,
        CultureInfo culture)
    {
        return new string[] { "translated value" };
    }

    public override IEnumerable<ResourceItem> GetAllStringsByCulture(
        string originalKey, string[] normalizedKey, CultureInfo culture)
    {
        yield return new ResourceItem(originalKey, "value");
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Framework.Localization;

public class MyLocalizationProvider : LocalizationProvider
{
    public override ReadOnlyMemory<char>[] LoadString(
        string[] normalizedKey, string[] originalKey, CultureInfo culture)
    {
        return new ReadOnlyMemory<char>[]
        {
            "translated value".AsMemory()
        };
    }

    public override IEnumerable<ResourceItem> GetAllStringsByCulture(
        string originalKey, string[] normalizedKey, CultureInfo culture)
    {
        yield return new ResourceItem(originalKey, "value");
    }
}
```

**Detection:**
- Search for: `override.*string\[\].*LoadString`
- Search for: `LocalizationProvider`

### 12.3 Auto-Registration of /lang Folder Removed

The `/lang` folder localization provider is no longer auto-registered. Register it explicitly.

**Before (CMS 12):**

```csharp
// /lang folder XML files were auto-discovered
// No registration code needed
```

**After (CMS 13):**

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddCms();

    // Explicitly register the lang folder localization provider
    services.AddXmlLocalizationProvider(options =>
    {
        options.Paths.Add("lang");
    });
}
```

**Detection:**
- Search for: files in `/lang/` directory
- Search for: `*.xml` localization files
- Search for: `XmlLocalizationProvider`

### 12.4 CultureInfoExtensions Removed

The `CultureInfoExtensions` class has been removed.

**Before (CMS 12):**

```csharp
using EPiServer.Globalization;

CultureInfo culture = CultureInfo.GetCultureInfo("en");
string displayName = culture.GetDisplayName();
```

**After (CMS 13):**

```csharp
using System.Globalization;

CultureInfo culture = CultureInfo.GetCultureInfo("en");
string displayName = culture.DisplayName; // use built-in property
```

**Detection:**
- Search for: `CultureInfoExtensions`
- Search for: `\.GetDisplayName\(`

---

## 13. Service Location

### 13.1 IServiceLocator Removed

`IServiceLocator`, `ServiceLocationHelper`, and `ServiceLocatorExtensions` are all removed. Use Microsoft DI directly.

**Before (CMS 12):**

```csharp
using EPiServer.ServiceLocation;

public class MyController : Controller
{
    public ActionResult Index()
    {
        // Service locator anti-pattern
        var contentRepo = ServiceLocator.Current.GetInstance<IContentRepository>();
        var urlResolver = ServiceLocator.Current.GetInstance<IUrlResolver>();

        var content = contentRepo.Get<PageData>(ContentReference.StartPage);
        return View(content);
    }
}

// Extension method usage
public static class MyHelper
{
    public static IContentRepository ContentRepository =>
        ServiceLocationHelper.GetService<IContentRepository>();
}
```

**After (CMS 13):**

```csharp
using Microsoft.Extensions.DependencyInjection;

public class MyController : Controller
{
    private readonly IContentRepository _contentRepo;
    private readonly IUrlResolver _urlResolver;

    public MyController(
        IContentRepository contentRepo,
        IUrlResolver urlResolver)
    {
        _contentRepo = contentRepo;
        _urlResolver = urlResolver;
    }

    public ActionResult Index()
    {
        var content = _contentRepo.Get<PageData>(ContentReference.StartPage);
        return View(content);
    }
}
```

**Detection:**
- Search for: `ServiceLocator\.Current`
- Search for: `ServiceLocationHelper`
- Search for: `ServiceLocatorExtensions`
- Search for: `IServiceLocator`
- Search for: `using EPiServer.ServiceLocation`

### 13.2 Injected<T> Pattern Removed

The `Injected<T>` property injection pattern is removed. Use constructor injection.

**Before (CMS 12):**

```csharp
using EPiServer.ServiceLocation;

public class MyController : PageController<StandardPage>
{
    private Injected<IContentRepository> _repo;
    private Injected<IUrlResolver> _urlResolver;

    public ActionResult Index(StandardPage page)
    {
        var content = _repo.Service.Get<PageData>(page.ContentLink);
        return View(content);
    }
}
```

**After (CMS 13):**

```csharp
public class MyController : PageController<StandardPage>
{
    private readonly IContentRepository _repo;
    private readonly IUrlResolver _urlResolver;

    public MyController(IContentRepository repo, IUrlResolver urlResolver)
    {
        _repo = repo;
        _urlResolver = urlResolver;
    }

    public ActionResult Index(StandardPage page)
    {
        var content = _repo.Get<PageData>(page.ContentLink);
        return View(content);
    }
}
```

**Detection:**
- Search for: `Injected<`
- Search for: `\.Service\.`

### 13.3 Static Instance Properties Obsoleted

Static `Instance` properties on various classes are removed. Use dependency injection.

**Before (CMS 12):**

```csharp
var activityFeed = ContentActivityFeed.Instance;
var pathResolver = UIPathResolver.Instance;
```

**After (CMS 13):**

```csharp
public class MyService
{
    private readonly IContentActivityFeed _activityFeed;
    private readonly IUIPathResolver _pathResolver;

    public MyService(
        IContentActivityFeed activityFeed,
        IUIPathResolver pathResolver)
    {
        _activityFeed = activityFeed;
        _pathResolver = pathResolver;
    }
}
```

**Detection:**
- Search for: `\.Instance`
- Search for: `ContentActivityFeed\.Instance`
- Search for: `UIPathResolver\.Instance`

---

## 14. Spelling Corrections

### 14.1 conentLink → contentLink

**Before (CMS 12):**

```csharp
// IContentLanguageSettingsHandler
var settings = _handler.Get(conentLink);
```

**After (CMS 13):**

```csharp
var settings = _handler.Get(contentLink);
```

**Detection:**
- Search for: `conentLink`

### 14.2 includeDecendents → includeDescendants

**Before (CMS 12):**

```csharp
_contentRepository.GetDescendents(rootLink);
_contentProvider.GetDescendents(rootLink, includeDecendents: true);
```

**After (CMS 13):**

```csharp
_contentRepository.GetDescendants(rootLink);
_contentProvider.GetDescendants(rootLink, includeDescendants: true);
```

**Detection:**
- Search for: `includeDecendents`
- Search for: `GetDescendents`

### 14.3 pageTypeID → contentTypeID

**Before (CMS 12):**

```csharp
var propDefs = _propertyDefinitionRepository.List(pageTypeID: 42);
```

**After (CMS 13):**

```csharp
var propDefs = _propertyDefinitionRepository.List(contentTypeID: 42);
```

**Detection:**
- Search for: `pageTypeID`

### 14.4 SearchStringRegexpression → SearchStringRegex

**Before (CMS 12):**

```csharp
options.SearchStringRegexpression = @"\d+";
```

**After (CMS 13):**

```csharp
options.SearchStringRegex = @"\d+";
```

**Detection:**
- Search for: `SearchStringRegexpression`

### 14.5 ValidateLanguageEdititingAccessRights → ValidateLanguageEditingAccessRights

**Before (CMS 12):**

```csharp
validator.ValidateLanguageEdititingAccessRights(content, principal);
```

**After (CMS 13):**

```csharp
validator.ValidateLanguageEditingAccessRights(content, principal);
```

**Detection:**
- Search for: `ValidateLanguageEdititingAccessRights`

### 14.6 StatisticsPersistanceInterval → StatisticsPersistenceInterval

**Before (CMS 12):**

```csharp
options.StatisticsPersistanceInterval = TimeSpan.FromMinutes(5);
```

**After (CMS 13):**

```csharp
options.StatisticsPersistenceInterval = TimeSpan.FromMinutes(5);
```

**Detection:**
- Search for: `StatisticsPersistanceInterval`

### 14.7 VirutalPathResolverExtensions → VirtualPathResolverExtensions

**Before (CMS 12):**

```csharp
using EPiServer.Web; // VirutalPathResolverExtensions
```

**After (CMS 13):**

```csharp
using EPiServer.Web; // VirtualPathResolverExtensions
```

**Detection:**
- Search for: `VirutalPathResolverExtensions`

### 14.8 contentypeModel → contentTypeModel

**Before (CMS 12):**

```csharp
var model = _service.GetContentypeModel(type);
```

**After (CMS 13):**

```csharp
var model = _service.GetContentTypeModel(type);
```

**Detection:**
- Search for: `contentypeModel`
- Search for: `GetContentypeModel`

### 14.9 commment → comment

**Before (CMS 12):**

```csharp
item.Commment = "My comment";
```

**After (CMS 13):**

```csharp
item.Comment = "My comment";
```

**Detection:**
- Search for: `commment` (case-insensitive)

### 14.10 PrincipalAcccessor → PrincipalAccessor

**Before (CMS 12):**

```csharp
var accessor = services.GetRequiredService<IPrincipalAcccessor>();
```

**After (CMS 13):**

```csharp
var accessor = services.GetRequiredService<IPrincipalAccessor>();
```

**Detection:**
- Search for: `PrincipalAcccessor`

### 14.11 ContentTypeAvailablilityService → ContentTypeAvailabilityService

**Before (CMS 12):**

```csharp
var service = services.GetRequiredService<IContentTypeAvailablilityService>();
```

**After (CMS 13):**

```csharp
var service = services.GetRequiredService<IContentTypeAvailabilityService>();
```

**Detection:**
- Search for: `ContentTypeAvailablilityService`

---

## 15. Block Type Changes

### 15.1 Common PropertyDefinitionType for All Blocks

All block properties now use a common `PropertyDefinitionType` with `DataType=Block`. The specific block type is tracked in `PropertyDefinition.ItemTypeReference`.

**Before (CMS 12):**

```csharp
// Each block type had its own PropertyDefinitionType
[ContentType(GUID = "...")]
public class TeaserBlock : BlockData
{
    public virtual string Heading { get; set; }
}

// PropertyDefinitionType was specific per block type
```

**After (CMS 13):**

```csharp
// All blocks share DataType=Block
// Specific type tracked via ItemTypeReference
[ContentType(GUID = "...")]
public class TeaserBlock : BlockData
{
    public virtual string Heading { get; set; }
}

// When querying property definitions:
var propDef = contentType.PropertyDefinitions["MyBlock"];
// propDef.Type.DataType == PropertyDataType.Block (common)
// propDef.ItemTypeReference points to TeaserBlock's ContentType ID
```

**Detection:**
- Search for: `PropertyDefinitionType`
- Search for: `PropertyDataType`
- Search for: `ItemTypeReference`

### 15.2 BlockTypeRepository → IContentTypeRepository

`BlockTypeRepository` is removed. Use `IContentTypeRepository` for all content types.

**Before (CMS 12):**

```csharp
using EPiServer.DataAbstraction;

public class MyService
{
    private readonly BlockTypeRepository _blockTypeRepo;

    public MyService(BlockTypeRepository blockTypeRepo)
    {
        _blockTypeRepo = blockTypeRepo;
    }

    public BlockType GetBlockType(string name)
    {
        return _blockTypeRepo.Load(name);
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.DataAbstraction;

public class MyService
{
    private readonly IContentTypeRepository _contentTypeRepo;

    public MyService(IContentTypeRepository contentTypeRepo)
    {
        _contentTypeRepo = contentTypeRepo;
    }

    public ContentType GetBlockType(string name)
    {
        return _contentTypeRepo.Load(name);
    }
}
```

**Detection:**
- Search for: `BlockTypeRepository`

### 15.3 PageTypeRepository → IContentTypeRepository

`PageTypeRepository` is removed. Use `IContentTypeRepository`.

**Before (CMS 12):**

```csharp
using EPiServer.DataAbstraction;

public class MyService
{
    private readonly PageTypeRepository _pageTypeRepo;

    public MyService(PageTypeRepository pageTypeRepo)
    {
        _pageTypeRepo = pageTypeRepo;
    }

    public PageType GetPageType(string name)
    {
        return _pageTypeRepo.Load(name);
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.DataAbstraction;

public class MyService
{
    private readonly IContentTypeRepository _contentTypeRepo;

    public MyService(IContentTypeRepository contentTypeRepo)
    {
        _contentTypeRepo = contentTypeRepo;
    }

    public ContentType GetPageType(string name)
    {
        return _contentTypeRepo.Load(name);
    }
}
```

**Detection:**
- Search for: `PageTypeRepository`

---

## 16. Approvals

### 16.1 IApprovalEngine Exception Type Change

`IApprovalEngine` now throws `ArgumentOutOfRangeException` instead of `IndexOutOfRangeException` for invalid step indices.

**Before (CMS 12):**

```csharp
try
{
    await _approvalEngine.ApproveAsync(approvalId, "admin", stepIndex: 99);
}
catch (IndexOutOfRangeException ex)
{
    _logger.LogError(ex, "Invalid step index");
}
```

**After (CMS 13):**

```csharp
try
{
    await _approvalEngine.ApproveAsync(approvalId, "admin", stepIndex: 99);
}
catch (ArgumentOutOfRangeException ex)
{
    _logger.LogError(ex, "Invalid step index");
}
```

**Detection:**
- Search for: `catch.*IndexOutOfRangeException`
- Search for: `IApprovalEngine`

### 16.2 Content Under Approval Cannot Be Published Directly

Content with an active approval sequence now throws `ValidationException` if published directly.

**Before (CMS 12):**

```csharp
// Could force-publish content even under approval
_contentRepository.Save(content, SaveAction.Publish);
```

**After (CMS 13):**

```csharp
// Throws ValidationException if content is under approval
try
{
    _contentRepository.Save(content, SaveAction.Publish);
}
catch (ValidationException ex)
{
    _logger.LogWarning("Content is under approval: {Message}", ex.Message);
}

// Skip approval validation if needed (use with caution)
_contentRepository.Save(content,
    SaveAction.Publish | SaveAction.SkipApprovalValidation);
```

**Detection:**
- Search for: `IApprovalEngine`
- Search for: `SaveAction\.Publish` where content may be under approval

### 16.3 ApprovalStepEventHandler Removed → IApprovalEngineEvents

`ApprovalStepEventHandler` delegate is removed. Use `IApprovalEngineEvents` to subscribe to approval events.

**Before (CMS 12):**

```csharp
using EPiServer.Approvals;

public class MyApprovalHandler
{
    public void Initialize()
    {
        ApprovalStepEventHandler handler = OnStepChanged;
        _approvalEngine.StepStarted += handler;
    }

    private void OnStepChanged(object sender, ApprovalStepEventArgs e)
    {
        // handle step change
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Approvals;

public class MyApprovalHandler : IInitializableModule
{
    private IApprovalEngineEvents _approvalEvents;

    public void Initialize(InitializationEngine context)
    {
        _approvalEvents = context.Locate.Advanced
            .GetInstance<IApprovalEngineEvents>();
        _approvalEvents.StepStarted += OnStepStarted;
    }

    private void OnStepStarted(object sender, ApprovalStepEventArgs e)
    {
        // handle step start
    }

    public void Uninitialize(InitializationEngine context)
    {
        _approvalEvents.StepStarted -= OnStepStarted;
    }
}
```

**Detection:**
- Search for: `ApprovalStepEventHandler`
- Search for: `_approvalEngine\.StepStarted`

---

## 17. UI & Shell

### 17.1 Menu System: HtmlHelper → TagHelper

`CreatePlatformNavigationMenu` HtmlHelper is replaced by the `<platform-navigation />` TagHelper.

**Before (CMS 12):**

```cshtml
@using EPiServer.Shell.Navigation
@Html.CreatePlatformNavigationMenu()
```

**After (CMS 13):**

```cshtml
@addTagHelper *, EPiServer.Shell.Navigation
<platform-navigation />
```

**Detection:**
- Search for: `CreatePlatformNavigationMenu`
- Search for: `Html\.CreatePlatformNavigationMenu`

### 17.2 ShellModule: Only Default Constructor

`ShellModule` now only supports a default constructor. Use property injection.

**Before (CMS 12):**

```csharp
using EPiServer.Shell;

public class MyShellModule : ShellModule
{
    private readonly IContentRepository _contentRepo;

    public MyShellModule(IContentRepository contentRepo)
    {
        _contentRepo = contentRepo;
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Shell;

public class MyShellModule : ShellModule
{
    // Default constructor only
    public MyShellModule() { }

    // Use property injection
    public IContentRepository ContentRepository { get; set; }
}
```

**Detection:**
- Search for: `: ShellModule`
- Search for: `class.*ShellModule`

### 17.3 IUriContextResolver/IUrlContextResolver: Sync → Async

Synchronous resolve methods are replaced by async equivalents.

**Before (CMS 12):**

```csharp
using EPiServer.Shell.Rest;

public class MyResolver
{
    private readonly IUriContextResolver _uriResolver;
    private readonly IUrlContextResolver _urlResolver;

    public void Resolve(Uri uri)
    {
        var context = _uriResolver.TryResolveUri(uri);
        var urlContext = _urlResolver.TryResolveUrl(uri.ToString());
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Shell.Rest;

public class MyResolver
{
    private readonly IUriContextResolver _uriResolver;
    private readonly IUrlContextResolver _urlResolver;

    public async Task ResolveAsync(Uri uri)
    {
        var context = await _uriResolver.TryResolveUriAsync(uri);
        var urlContext = await _urlResolver.TryResolveUrlAsync(uri.ToString());
    }
}
```

**Detection:**
- Search for: `TryResolveUri\(`
- Search for: `TryResolveUrl\(`
- Search for: `IUriContextResolver`
- Search for: `IUrlContextResolver`

### 17.4 ContextStore.Get() → GetAsync()

**Before (CMS 12):**

```csharp
var contextData = _contextStore.Get("myContext");
```

**After (CMS 13):**

```csharp
var contextData = await _contextStore.GetAsync("myContext");
```

**Detection:**
- Search for: `_contextStore\.Get\(`
- Search for: `ContextStore\.Get\(`

### 17.5 [DojoWidget] → [CriterionPropertyEditor]

The `[DojoWidget]` attribute for visitor group criteria is replaced by `[CriterionPropertyEditor]`.

**Before (CMS 12):**

```csharp
using EPiServer.Personalization.VisitorGroups;

public class MyCriterion : CriterionBase<MyCriterionModel>
{
    // ...
}

public class MyCriterionModel : CriterionModelBase
{
    [DojoWidget("myapp/editors/CustomEditor")]
    public string CustomValue { get; set; }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Personalization.VisitorGroups;

public class MyCriterion : CriterionBase<MyCriterionModel>
{
    // ...
}

public class MyCriterionModel : CriterionModelBase
{
    [CriterionPropertyEditor("myapp/editors/CustomEditor")]
    public string CustomValue { get; set; }
}
```

**Detection:**
- Search for: `DojoWidget`

### 17.6 MenuHelper Methods Removed

Various `MenuHelper` methods have been removed.

**Before (CMS 12):**

```csharp
@Html.MenuList(menuItems)
@Html.MenuItem(item)
```

**After (CMS 13):**

```cshtml
@* Use TagHelpers or custom components *@
<platform-navigation />
```

**Detection:**
- Search for: `MenuHelper`
- Search for: `Html\.MenuList`
- Search for: `Html\.MenuItem`

---

## 18. Miscellaneous

### 18.1 SaveAction.None → SaveAction.Default

**Before (CMS 12):**

```csharp
_contentRepository.Save(content, SaveAction.None);
```

**After (CMS 13):**

```csharp
_contentRepository.Save(content, SaveAction.Default);
```

**Detection:**
- Search for: `SaveAction\.None`

### 18.2 SaveAction.DelayedPublish → SaveAction.Schedule

**Before (CMS 12):**

```csharp
content.StartPublish = DateTime.Now.AddDays(7);
_contentRepository.Save(content, SaveAction.DelayedPublish);
```

**After (CMS 13):**

```csharp
content.StartPublish = DateTime.Now.AddDays(7);
_contentRepository.Save(content, SaveAction.Schedule);
```

**Detection:**
- Search for: `SaveAction\.DelayedPublish`

### 18.3 Castle.Windsor Dependency Removed

Castle.Windsor is no longer bundled. Remove all Castle.Windsor references.

**Before (CMS 12):**

```csharp
using Castle.Windsor;
using Castle.MicroKernel.Registration;

public class WindsorInstaller : IWindsorInstaller
{
    public void Install(IWindsorContainer container,
        IConfigurationStore store)
    {
        container.Register(
            Component.For<IMyService>()
                .ImplementedBy<MyService>()
                .LifestyleTransient());
    }
}
```

**After (CMS 13):**

```csharp
using Microsoft.Extensions.DependencyInjection;

// Register in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddTransient<IMyService, MyService>();
}
```

**Detection:**
- Search for: `using Castle.Windsor`
- Search for: `using Castle.MicroKernel`
- Search for: `IWindsorInstaller`
- Search for: `IWindsorContainer`

### 18.4 ITimer Obsoleted

**Before (CMS 12):**

```csharp
using EPiServer;

public class MyScheduledJob
{
    private readonly ITimer _timer;

    public MyScheduledJob(ITimer timer)
    {
        _timer = timer;
        _timer.Interval = TimeSpan.FromMinutes(5);
        _timer.Start();
    }
}
```

**After (CMS 13):**

```csharp
using System.Threading;

public class MyBackgroundService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // do work
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
```

**Detection:**
- Search for: `ITimer`

### 18.5 IWebHostingEnvironment and VirtualPathResolver Obsoleted

Use ASP.NET Core `IWebHostEnvironment` directly.

**Before (CMS 12):**

```csharp
using EPiServer.Web;

public class MyService
{
    private readonly IWebHostingEnvironment _hostEnv;

    public MyService(IWebHostingEnvironment hostEnv)
    {
        _hostEnv = hostEnv;
    }

    public string ResolvePath(string virtualPath)
    {
        return VirtualPathResolver.Resolve(virtualPath);
    }
}
```

**After (CMS 13):**

```csharp
using Microsoft.AspNetCore.Hosting;

public class MyService
{
    private readonly IWebHostEnvironment _hostEnv;

    public MyService(IWebHostEnvironment hostEnv)
    {
        _hostEnv = hostEnv;
    }

    public string ResolvePath(string relativePath)
    {
        return Path.Combine(_hostEnv.WebRootPath, relativePath);
    }
}
```

**Detection:**
- Search for: `IWebHostingEnvironment`
- Search for: `VirtualPathResolver`

### 18.6 UriSupport Class Obsoleted → IUriSupport via DI

**Before (CMS 12):**

```csharp
using EPiServer.Web;

string absoluteUrl = UriSupport.AbsoluteUrlBySettings(relativeUrl);
bool isAbsolute = UriSupport.IsAbsoluteUrl(url);
```

**After (CMS 13):**

```csharp
using EPiServer.Web;

public class MyService
{
    private readonly IUriSupport _uriSupport;

    public MyService(IUriSupport uriSupport)
    {
        _uriSupport = uriSupport;
    }

    public string GetAbsoluteUrl(string relativeUrl)
    {
        return _uriSupport.AbsoluteUrlBySettings(relativeUrl);
    }
}
```

**Detection:**
- Search for: `UriSupport\.`
- Search for: `UriSupport\.AbsoluteUrlBySettings`

### 18.7 PageEditing.PageIsInEditMode Removed

**Before (CMS 12):**

```csharp
using EPiServer.Editor;

if (PageEditing.PageIsInEditMode)
{
    // render edit mode toolbar
}
```

**After (CMS 13):**

```csharp
using EPiServer.Editor;

// Use IPageEditingContextResolver via DI
public class MyViewComponent : ViewComponent
{
    private readonly IContextModeResolver _contextModeResolver;

    public MyViewComponent(IContextModeResolver contextModeResolver)
    {
        _contextModeResolver = contextModeResolver;
    }

    public IViewComponentResult Invoke()
    {
        if (_contextModeResolver.CurrentMode == ContextMode.Edit)
        {
            // render edit mode toolbar
        }
        return View();
    }
}
```

**Detection:**
- Search for: `PageEditing\.PageIsInEditMode`
- Search for: `PageIsInEditMode`

### 18.8 TextIndexer Removed

**Before (CMS 12):**

```csharp
using EPiServer.Core;

var indexer = TextIndexer.Instance;
indexer.IndexContent(content);
```

**After (CMS 13):**

```csharp
// TextIndexer is removed; use Optimizely Search & Navigation
// or the built-in content indexing services
using EPiServer.Search;

public class MyIndexService
{
    private readonly IContentIndexer _contentIndexer;

    public MyIndexService(IContentIndexer contentIndexer)
    {
        _contentIndexer = contentIndexer;
    }

    public void IndexContent(IContent content)
    {
        _contentIndexer.Index(content);
    }
}
```

**Detection:**
- Search for: `TextIndexer`
- Search for: `TextIndexer\.Instance`

### 18.9 Telemetry Removed

The telemetry subsystem is completely removed. Remove all references.

**Before (CMS 12):**

```csharp
using EPiServer.Shell.Telemetry;

services.Configure<TelemetryOptions>(options =>
{
    options.Enabled = false;
});
```

**After (CMS 13):**

```csharp
// Remove the using statement and configuration entirely
// Telemetry is no longer part of CMS 13
```

**Detection:**
- Search for: `EPiServer.Shell.Telemetry`
- Search for: `TelemetryOptions`

### 18.10 ClientEditorAttribute.EditorConfiguration Requires Strict JSON

`EditorConfiguration` now requires RFC 8259 compliant JSON (double-quoted property names, no trailing commas, no single quotes).

**Before (CMS 12):**

```csharp
[ClientEditor(EditorConfiguration = "{ 'maxLength': 500, 'rows': 5, }")]
public virtual string Description { get; set; }
```

**After (CMS 13):**

```csharp
[ClientEditor(EditorConfiguration = "{\"maxLength\":500,\"rows\":5}")]
public virtual string Description { get; set; }
```

**Detection:**
- Search for: `EditorConfiguration`
- Search for: `ClientEditor`

### 18.11 PropertyData.Clear() No Longer Virtual

Override `ClearImplementation()` instead of `Clear()`.

**Before (CMS 12):**

```csharp
using EPiServer.Core;

public class MyProperty : PropertyString
{
    public override void Clear()
    {
        base.Clear();
        // custom cleanup
    }
}
```

**After (CMS 13):**

```csharp
using EPiServer.Core;

public class MyProperty : PropertyString
{
    protected override void ClearImplementation()
    {
        base.ClearImplementation();
        // custom cleanup
    }
}
```

**Detection:**
- Search for: `override.*void Clear\(\)`
- Search for: `\.Clear\(\)` on PropertyData subclasses

---

## Quick Reference: Detection Pattern Summary

| Pattern to Search | Section |
|-------------------|---------|
| `PageReference` | 3.1 |
| `SiteDefinition` | 3.2 |
| `\.FilteredItems` | 3.3 |
| `ContentFragment` | 3.4 |
| `\.ToHtmlString\(.*principal` | 3.5 |
| `\.PublicString` | 3.6 |
| `\.PublicLongString` | 3.7 |
| `using Newtonsoft.Json` | 5.1 |
| `SerializationInfo` | 5.2 |
| `IPropertyDefinitionRepository` | 6.3 |
| `PrincipalInfo\.HasEditAccess` | 7.2 |
| `PrincipalInfo\.IsPermitted` | 7.3 |
| `ValidateAntiForgeryReleaseToken` | 7.6 |
| `RemainingPath` | 8.1 |
| `GetNextRemainingSegment` | 8.1 |
| `/EPiServer/` | 8.4 |
| `DataAccessBase` | 9.1 |
| `IContentRepositoryExtension` | 9.4 |
| `IValidate<` | 10.1 |
| `RequiredPropertyValueException` | 10.2 |
| `EventsServiceKnownType` | 11.2 |
| `IConfigurableModule` | 11.4 |
| `ServiceLocator\.Current` | 13.1 |
| `includeDecendents` | 14.2 |
| `GetDescendents` | 14.2 |
| `BlockTypeRepository` | 15.2 |
| `PageTypeRepository` | 15.3 |
| `ApprovalStepEventHandler` | 16.3 |
| `CreatePlatformNavigationMenu` | 17.1 |
| `Castle\.Windsor` | 18.3 |
| `SaveAction\.None` | 18.1 |
| `SaveAction\.DelayedPublish` | 18.2 |
| `PageEditing\.PageIsInEditMode` | 18.7 |
| `TextIndexer` | 18.8 |
| `TelemetryOptions` | 18.9 |
| `EditorConfiguration` | 18.10 |
| `Injected<` | 13.2 |
| `DojoWidget` | 17.5 |
| `\.PageLink` | 3.12 |
| `ContentCoreData` | 3.13 |
| `\.LinkStatus` | 3.14 |
| `\.CustomTag[^N]` | 3.15 |
| `IContentTypeRepository<` | 3.16 |
| `IContentAreaLoader\.Get\(` | 3.4 |
