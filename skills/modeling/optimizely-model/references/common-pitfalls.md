# Common Pitfalls to Avoid

This reference documents common mistakes when modeling Optimizely CMS content types and how to avoid them.

## 1. Nested Arrays

**Problem:** Attempting to create arrays that contain other arrays.

**Why it fails:** The Optimizely CMS schema does not support nested array structures.

**Example of what NOT to do:**
```typescript
// ❌ WRONG - Arrays cannot contain other arrays
relatedItems: {
  type: 'array',
  items: {
    type: 'array',  // This will fail
    items: { type: 'string' }
  }
}
```

**Solution:** Flatten the structure or use content references:
```typescript
// ✅ CORRECT - Use a flat array
relatedItemIds: {
  type: 'array',
  items: { type: 'string' }
}

// ✅ CORRECT - Or use content references
relatedItems: {
  type: 'array',
  items: {
    type: 'contentReference',
    allowedTypes: ['RelatedItem']
  }
}
```

## 2. Invalid Base Type

**Problem:** Using a base type that doesn't exist or isn't in the allowed list.

**Why it fails:** Only specific base types are supported by the CMS.

**Valid base types:**
- `'_page'`
- `'_component'`
- `'_experience'`
- `'_folder'`
- `'_image'`
- `'_media'`
- `'_video'`

**Example of what NOT to do:**
```typescript
// ❌ WRONG - Invalid base type
export const ArticleType = contentType({
  key: 'Article',
  baseType: '_article',  // Not a valid base type
  // ...
});
```

**Solution:** Use one of the documented base types:
```typescript
// ✅ CORRECT
export const ArticleType = contentType({
  key: 'Article',
  baseType: '_page',  // Valid base type
  // ...
});
```

## 3. Missing Type for Component Properties

**Problem:** Component properties don't specify a `type` field or have an incomplete definition.

**Why it fails:** Component properties require explicit type information to know which component can be embedded.

**Example of what NOT to do:**
```typescript
// ❌ WRONG - Missing type field
ctaButton: {
  contentType: ButtonComponentType  // Incomplete
}
```

**Solution:** Always include both `type` and `contentType`:
```typescript
// ✅ CORRECT
ctaButton: {
  type: 'component',
  contentType: ButtonComponentType
}
```

## 4. Forgetting to Register

**Problem:** Creating content types, display templates, or contracts but not adding them to the appropriate registry.

**Why it fails:** The CMS won't recognize your types unless they're registered.

**What to register:**
- **Content types** → `initContentTypeRegistry()`
- **Display templates** → `initDisplayTemplateRegistry()`
- **Contracts** → `initContentTypeRegistry()` (yes, contracts go in content type registry)

**Example of what NOT to do:**
```typescript
// ❌ WRONG - Created BlogPage but didn't register it
export const BlogPageContentType = contentType({
  key: 'BlogPage',
  baseType: '_page',
  // ...
});
// File ends here - not registered!
```

**Solution:** Always update the registry:
```typescript
// ✅ CORRECT
// In initContentTypeRegistry.ts or wherever registry is initialized
export function initContentTypeRegistry() {
  return [
    BlogPageContentType,
    ArticlePageContentType,
    SEOContract,  // Contracts go here too
    // ... other types
  ];
}

// In initDisplayTemplateRegistry.ts
export function initDisplayTemplateRegistry() {
  return [
    ArticleCardTemplate,
    ArticleListTemplate,
    // ... other templates
  ];
}
```

## 5. Contracts with Base Type

**Problem:** Adding a `baseType` field to contracts.

**Why it fails:** Contracts are reusable property sets, not content types. They don't have a base type.

**Example of what NOT to do:**
```typescript
// ❌ WRONG - Contracts don't have baseType
export const SEOContract = contract({
  key: 'seo',
  baseType: '_contract',  // This field doesn't exist for contracts
  // ...
});
```

**Solution:** Omit `baseType` from contracts:
```typescript
// ✅ CORRECT
export const SEOContract = contract({
  key: 'seo',
  displayName: 'SEO Properties',
  properties: {
    // ... properties
  }
});
```

## 6. Using Strings Instead of Type References

**Problem:** Using string literals for `contentType`, `allowedTypes`, or `restrictedTypes` when referencing custom content types.

**Why it fails:** The SDK expects references to the actual type objects, not string names (except for base types like `'_image'`).

**Example of what NOT to do:**
```typescript
// ❌ WRONG - Using string instead of type reference
hero: {
  type: 'component',
  contentType: 'HeroComponentType'  // String instead of reference
}

featuredArticle: {
  type: 'content',
  allowedTypes: ['ArticleContentType']  // String instead of reference
}
```

**Solution:** Use the actual type object references:
```typescript
// ✅ CORRECT - Using type object references
hero: {
  type: 'component',
  contentType: HeroComponentType  // Reference to the type object
}

featuredArticle: {
  type: 'content',
  allowedTypes: [ArticleContentType]  // Reference to the type object
}

// Base types can remain as strings:
featuredImage: {
  type: 'contentReference',
  allowedTypes: ['_image']  // Base types are strings
}
```

## 7. Incorrect editorSettings Usage

**Problem:** Using `editorSettings` with wrong structure or on non-richText properties.

**Why it matters:** `editorSettings` is now supported in SDK for configuring TinyMCE toolbar, but only on `richText` properties.

**Example of what NOT to do:**
```typescript
// ❌ WRONG - editorSettings on non-richText property
title: {
  type: 'string',
  editorSettings: {  // Only valid on richText
    preset: 'minimal'
  }
}
```

**Solution:** Use `editorSettings` only on `richText` properties:
```typescript
// ✅ CORRECT - editorSettings on richText property
bodyText: {
  type: 'richText',
  displayName: 'Body Text',
  group: 'content',
  editorSettings: {
    preset: 'minimal'  // Now supported!
  }
}
```

## 8. Binary Properties Without `format: 'blob'`

**Problem:** Declaring a binary property with only a `type`.

**Why it fails:** The content-type API rejects the property with `The Type field does not support the value 'binary'.` A binary property is only valid when paired with `format: 'blob'`.

**Example of what NOT to do:**
```typescript
// ❌ WRONG - push fails: "The Type field does not support the value 'binary'."
p_binary: {
  type: 'binary',
  displayName: 'Binary'
}
```

**Solution:** Add the format:
```typescript
// ✅ CORRECT
p_binary: {
  type: 'binary',
  format: 'blob',
  displayName: 'Binary'
}
```

**⚠️ Platform limitation:** even with `format: 'blob'`, binary properties only work on CMS 13. SaaS CMS does not support them — always tell the user this when generating one, and offer `type: 'contentReference'` with `allowedTypes: ['_media']` as the SaaS alternative.

## 9. Dropping the `format` Field

**Problem:** Generating a property from a description that names a format, but emitting only the `type`.

**Why it fails:** Silently. The content type pushes without error, so the mistake is only visible in the CMS editor, where a document URL, an image URL, a short string and a GUID all render as the same generic input.

**Example of what NOT to do:**
```typescript
// User asked for "a url to document property, a url to image property,
// a short string property, a guid property"
// ❌ WRONG - all four collapse to two generic widgets
p_urlToDocument: { type: 'url', displayName: 'URL to Document' },
p_urlToImage: { type: 'url', displayName: 'URL to Image' },
p_shortString: { type: 'string', displayName: 'Short String' },
p_guid: { type: 'string', displayName: 'GUID' }
```

**Solution:** Carry the format over from the user's wording:
```typescript
// ✅ CORRECT
p_urlToDocument: { type: 'url', format: 'DocumentUrl', displayName: 'URL to Document' },
p_urlToImage: { type: 'url', format: 'ImageUrl', displayName: 'URL to Image' },
p_shortString: { type: 'string', format: 'shortString', displayName: 'Short String' },
p_guid: { type: 'string', format: 'guid', displayName: 'GUID' },
p_longString: { type: 'string', displayName: 'Long String' }  // long string is the one that takes no format
```

See `property-types.md` → "All Supported Format Values" for every valid `format` and the type it belongs to.

## 10. Dropping or Inventing Metadata Fields

**Problem:** Emitting a property that omits metadata the user asked for, or carries metadata they never mentioned.

**Why it fails:** Silently, again. `description`, `isLocalized` and `sortOrder` have no effect on whether the type pushes, so a property missing all three looks correct in the file and is wrong in the editor - no help text, no per-language values, wrong ordering. An invented `isRequired: true` is worse: it blocks editors from saving content until the field is filled.

**Example of what NOT to do:**
```typescript
// User asked for: display name, description, localized, group, sort index 5,
// indexing type searchable, start with "string", min length 1, max length 100
// ❌ WRONG - description/isLocalized/sortOrder dropped, `required` invented (and misspelled)
p_string: {
  type: 'string',
  displayName: 'string display name',
  required: true,
  group: 'content',
  indexingType: 'searchable',
  pattern: '^string',
  minLength: 1,
  maxLength: 100
}
```

**Solution:** Map each attribute in the request to a field, then verify the counts match:
```typescript
// ✅ CORRECT
p_string: {
  type: 'string',
  displayName: 'string display name',
  description: 'A sample string field',
  isLocalized: true,
  group: 'content',
  sortOrder: 5,
  indexingType: 'searchable',
  pattern: '^string',
  minLength: 1,
  maxLength: 100
}
```

The field is `isRequired`, never `required`, and it belongs in the output only when the user says "required" or "mandatory".

## 11. Applying a Constraint to the Wrong Type

**Problem:** Copying a numeric constraint onto a non-numeric property, e.g. `minimum: 20` on a `string`.

**Why it fails:** `minimum`/`maximum` are only meaningful on `integer`, `float` and `dateTime`; `minLength`/`maxLength`/`pattern` only on `string`; `minItems`/`maxItems` only on `array`.

**Solution:** Omit the constraint that does not fit and say so:

> "`minimum: 20` doesn't apply to a string property - `minimum`/`maximum` are for integer, float and dateTime. Did you mean `minLength: 20`? I've left it out for now."

Do not silently rewrite it as the nearest valid field - the user's intent is genuinely ambiguous there.

## 12. Using the User's Wording as the Field Name

**Problem:** The user says "required", so the property gets `required: true`. Same for "localized" → `localized`, "sort index" → `sortIndex`, "label" → `label`.

**Why it fails:** These are not schema fields. Unlike a dropped `description`, this one is loud - `config push` rejects the content type, because unknown property fields are not ignored.

**Example of what NOT to do:**
```typescript
// User: "p_longstring property is a long string and required"
// ❌ WRONG - push fails
p_longstring: {
  type: 'string',
  displayName: 'Long String',
  required: true
}
```

**Solution:** Translate the wording to the schema field:
```typescript
// ✅ CORRECT
p_longstring: {
  type: 'string',
  displayName: 'Long String',
  isRequired: true
}
```

The same trap applies to every property type, since metadata fields are shared. `references/property-types.md` lists each field with the near-miss spellings to avoid, in "Property Metadata Fields".

## 13. Dropping Range Constraints on Numeric Properties

**Problem:** Emitting an `integer`, `float` or `dateTime` property without the `minimum`/`maximum` the user asked for.

**Why it fails:** Silently, and it is easy to miss in review - the metadata fields are all present, so the property looks complete. But the constraint that made the property worth specifying is gone: it now accepts any value.

**Example of what NOT to do:**
```typescript
// User: "p_float is float property with display name 'float display name',
//        group 'content', indexing type 'queryable', minimum 20, maximum 50"
// ❌ WRONG - accepts any number
p_float: {
  type: 'float',
  displayName: 'float display name',
  group: 'content',
  indexingType: 'queryable'
}
```

**Solution:** Carry both bounds over:
```typescript
// ✅ CORRECT
p_float: {
  type: 'float',
  displayName: 'float display name',
  group: 'content',
  indexingType: 'queryable',
  minimum: 20,
  maximum: 50
}
```

Identical for `integer`, and for `dateTime` where the bounds are ISO 8601 strings (`'2024-01-01T00:00:00Z'`). For arrays, the equivalents are `minItems`/`maxItems` at the array level and `minimum`/`maximum` inside `items`.

## Quick Checklist

Before finalizing your content type definition:

- [ ] No nested arrays
- [ ] Base type is one of the documented valid types
- [ ] Component properties have both `type` and `contentType` fields
- [ ] Content type/contract/display template is registered in the appropriate registry
- [ ] Contracts don't have a `baseType` field
- [ ] All required imports are present
- [ ] File naming follows conventions (e.g., `BlogPage.tsx` for BlogPage type)
- [ ] Type references use objects (e.g., `ArticleContentType`), not strings (e.g., `'ArticleContentType'`)
- [ ] `editorSettings` used only on `richText` properties (not on string/other types)
- [ ] `binary` properties include `format: 'blob'` and the user has been told they are CMS 13 only
- [ ] Every property whose description named a format (document/image URL, short string, GUID, dropdown, select list, binary) carries its `format` field
- [ ] Every attribute the user listed is present - `description`, `isLocalized` and `sortOrder` in particular
- [ ] No field was added that the user did not ask for (especially `isRequired`)
- [ ] Field names are the schema's, not the user's wording (`isRequired` not `required`, `isLocalized` not `localized`, `sortOrder` not `sortIndex`)
- [ ] Constraints match the property type (`minLength`/`pattern` on strings, `minimum`/`maximum` on numbers and dates, `minItems` on arrays)
- [ ] Every constraint the user named is present - numeric `minimum`/`maximum` in particular
