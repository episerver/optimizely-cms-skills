# Setup, Channel Init & Registration (DI): Remko SDK → Content JS SDK

Single source of truth for the three cross-cutting wiring changes every
migration skill references:

1. **Channel / client initialization**
   (`ChannelRepository.createDefinition(...)` → SDK client init)
2. **Component factory registration**
   (`DefaultComponentFactory` + `registerAll` → `initReactComponentRegistry`)
3. **Provider / context wiring**
   (`ServerContext` / `withAppContext` → SDK server context)

Before/after pairs are grounded in a reference `@remkoj/*` sample app and
the official Content JS SDK docs (`2-setup.md` + `6-rendering-react.md`),
read 2026-09-11. See `package-and-import-mapping.md` and
`auth-and-env-mapping.md` for the package/env details referenced here.

## Mental model of the shift

- Remko wired the app **imperatively at module load**: a channel definition
  object (`channel.ts`), a shared `createClient()` (`api.ts`), and a
  `DefaultComponentFactory` you populate with `registerAll` (`factory.ts`),
  then hand to a `ServerContext`.
- The Content JS SDK wires the app through **two config points**:
  `optimizely.config.mjs` (`buildConfig`, consumed by the CLI, docs `2-setup.md`)
  for content-type discovery, and a one-time `config()` + registry init in the
  Next.js **root layout** for runtime (docs `6-rendering-react.md`). Pages then
  call `getClient()` and render with `OptimizelyComponent` wrapped in
  `withAppContext`.

## (a) Channel / client initialization

The Remko `ChannelRepository.createDefinition(...)` has **no direct target
equivalent**. Channel identity (name, host, locales, CMS URL) is replaced by:
`buildConfig` in `optimizely.config.mjs` (component discovery), a single
`config({...})` call for Graph credentials, and Next.js routing for host/locale.

**Before — Remko (`channel.ts`):**

```ts
import ChannelRepository from '@remkoj/optimizely-graph-client/channels';

const cms_url = process.env.OPTIMIZELY_CMS_URL ?? 'https://example.cms.optimizely.com';

export const channel = ChannelRepository.createDefinition(
  'Basic Project',
  'http://localhost:3000',
  ['en', 'en-US', 'en-UK'],
  cms_url
);
export default channel;
```

**Before — Remko (`api.ts`), the shared client:**

```ts
import { createClient } from '@remkoj/optimizely-cms-nextjs';
export const client = createClient();
export default client;
```

**After — Content JS SDK.** `optimizely.config.mjs` (CLI-facing, docs `2-setup.md`):

```ts
import { buildConfig } from '@optimizely/cms-sdk';

export default buildConfig({
  components: ['./src/components/**/*.tsx'],
});
```

**After — configure the Graph client once (root `layout.tsx`, docs `6-rendering-react.md`):**

```ts
import { config } from '@optimizely/cms-sdk';

// Configure the client once for the whole app.
config({
  apiKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY,
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});
```

**After — get the shared client anywhere (replaces `api.ts` / `createClient()`):**

```ts
import { getClient } from '@optimizely/cms-sdk';

const client = getClient(); // no env vars passed around
const content = await client.getContentByPath('/en/');
```

> Locales/host from `createDefinition(...)` move to Next.js route segments
> (e.g. `[locale]` / `[...slug]`), not an SDK object. Publish/preview host
> wiring is app-owned — see the cms-nextjs skill.

## (b) Component factory registration → renderer registration

Remko builds a `DefaultComponentFactory`, seeds it with the rich-text
dictionary, and `registerAll`s your CMS components. The target replaces this
**one** factory with **three** distinct registries, each with its own import
subpath (docs `6-rendering-react.md`); the rich-text dictionary is built into
`RichText` (`@optimizely/cms-sdk/react/richText`) and no longer registered by
hand.

**The three target registries (this is the load-bearing detail — a Remko app
has only the one component factory, so two of these three are net-new wiring a
migrator must add, not translate):**

| Registry | Import subpath | Argument | Replaces |
|---|---|---|---|
| `initContentTypeRegistry` | `@optimizely/cms-sdk` (**root**) | array of `contentType()` schema objects | net-new — no Remko equivalent (content types were codegen fragments) |
| `initReactComponentRegistry` | `@optimizely/cms-sdk/react/server` | `{ resolver }` object (or nested tag map) | `DefaultComponentFactory` + `registerAll(cmsComponents)` |
| `initDisplayTemplateRegistry` | `@optimizely/cms-sdk` (**root**) | array of `displayTemplate()` objects | net-new — carries the `variant`/style discriminator (see below) |

**Before — Remko (`components/factory.ts`):**

```ts
import 'server-only';
import {
  type ComponentFactory,
  DefaultComponentFactory,
  RichTextComponentDictionary,
} from '@remkoj/optimizely-cms-react/rsc';
import cmsComponents from './cms';

export const factory: ComponentFactory = new DefaultComponentFactory();
factory.registerAll(RichTextComponentDictionary);
factory.registerAll(cmsComponents);

export const setupFactory = () => factory;
export default setupFactory;
```

**After — Content JS SDK (root `layout.tsx`), all three registries side by side:**

```ts
import {
  initContentTypeRegistry,
  initDisplayTemplateRegistry,
} from '@optimizely/cms-sdk';
import { initReactComponentRegistry } from '@optimizely/cms-sdk/react/server';

import Article, { ArticleContentType } from '@/components/Article';
import ArticleCard from '@/components/ArticleCard';
import { ArticleCardTemplate } from '@/components/ArticleCard/displayTemplate';

// 1. Content types (schema) — root export. Pass every contentType() object the
//    graph-functions teardown produced (see the cms-react skill, Step 3).
initContentTypeRegistry([ArticleContentType]);

// 2. Display templates (variant/style discriminator) — root export. Pass every
//    displayTemplate() object. Omit this call only if the app has no variants.
initDisplayTemplateRegistry([ArticleCardTemplate]);

// 3. React renderers — ./react/server. Replaces DefaultComponentFactory +
//    registerAll. Keys are content-type keys; tag/colon keys route variants.
initReactComponentRegistry({
  resolver: {
    Article,                 // default renderer for the Article content type
    'Article:card': ArticleCard, // variant renderer, selected via tag="card"
  },
});
```

> The `resolver` object keys are content-type keys mapped to components — the
> same idea as `registerAll(cmsComponents)`, but declarative and framework-owned.
> `RichTextComponentDictionary` has no replacement to register: use the built-in
> `RichText` component instead (docs `10-richtext-component-react.md`).
>
> Symbol note: `initReactComponentRegistry` is a confirmed export of
> `@optimizely/cms-sdk/react/server`; `initContentTypeRegistry` and
> `initDisplayTemplateRegistry` are confirmed **root** exports of
> `@optimizely/cms-sdk` (verified in the target SDK `src` and docs
> `6-rendering-react.md`). Mixing up the two root registries with the
> `./react/server` one is the most common wiring error — the table above is the
> reference.

### Variant registration (the `ComponentTypeDictionary` array collapse)

Remko's registry is an **array** of `{ type, component, variant? }` entries
*specifically because one content type can register more than once* under
different variants:

```ts
// Remko — array holds two entries for the same type, distinguished by variant.
{ type: 'MegaMenuGroupBlock', variant: 'mobile', component: MegaMenuGroupBlockMobile },
{ type: 'MegaMenuGroupBlock',                    component: MegaMenuGroupBlock },
```

A plain object literal keyed by content type **cannot hold two
`MegaMenuGroupBlock` keys** — one silently overwrites the other, and you lose a
renderer with a green type-check. The variant discriminator does **not**
disappear; it moves onto **display templates**, and the resolver routes to it
via a **colon/tag key** or a **nested tag map**. Two equivalent forms:

```ts
// Form 1 — flat colon keys: "<ContentTypeKey>:<tag>".
initReactComponentRegistry({
  resolver: {
    MegaMenuGroupBlock: MegaMenuGroupBlock,            // default (no tag)
    'MegaMenuGroupBlock:mobile': MegaMenuGroupBlockMobile, // variant
  },
});

// Form 2 — nested tag map (clearer when a type has several variants).
initReactComponentRegistry({
  resolver: {
    MegaMenuGroupBlock: {
      default: MegaMenuGroupBlock,
      tags: { mobile: MegaMenuGroupBlockMobile },
    },
  },
});
```

Each variant also needs a `displayTemplate()` object registered via
`initDisplayTemplateRegistry([...])` (see the table above), and the renderer is
selected at render time with `<OptimizelyComponent content={item} tag="mobile" />`.
This is the array→object transform in practice: **do not** flatten the Remko
array to a single key per type — carry every variant across as a colon/tag key
and register its display template. See the cms-react skill for the full
`displayTemplate()` authoring recipe and the `displaySettings` prop shape.

## (c) Provider / context wiring

Remko constructs a `ServerContext` from the factory + client + mode and passes
it around (`publishedContext` in `api.ts`). The target replaces the explicit
context object with request-scoped context: wrap the page in `withAppContext`,
render with `OptimizelyComponent`, and read/write context via
`getContext()` / `setContext()` (all from `@optimizely/cms-sdk/react/server`,
docs `6-rendering-react.md`).

**Before — Remko (`api.ts`):**

```ts
import { ServerContext } from '@remkoj/optimizely-cms-react/rsc';
import { factory } from './components/factory';
import { getSdk } from './gql/client';

export const client = createClient();
export const sdk = getSdk(client);

// Explicit server context object, threaded through the app.
export const publishedContext = new ServerContext({ factory, client, mode: 'public' });
```

**After — Content JS SDK (catch-all page, e.g. `app/[...slug]/page.tsx`):**

```tsx
import { getClient } from '@optimizely/cms-sdk';
import {
  OptimizelyComponent,
  withAppContext,
} from '@optimizely/cms-sdk/react/server';

type Props = { params: Promise<{ slug: string[] }> };

export async function Page({ params }: Props) {
  const { slug } = await params;
  const client = getClient();
  const content = await client.getContentByPath(`/${slug.join('/')}/`);

  return <OptimizelyComponent content={content[0]} />;
}

// Provides request-scoped context (replaces the shared ServerContext object).
export default withAppContext(Page);
```

**After — reading/writing context in nested components (replaces threading `publishedContext`):**

```tsx
import { getClient } from '@optimizely/cms-sdk';
import { getContext, setContext } from '@optimizely/cms-sdk/react/server';

// Populate once per request — call inside the page, where `content` is in scope
// (same array shape as the catch-all page above):
export async function Page({ params }: Props) {
  const { slug } = await params;
  const content = await getClient().getContentByPath(`/${slug.join('/')}/`);
  setContext({
    currentContent: content[0],
    locale: content[0]?._metadata?.locale,
    type: content[0]?.__typename,
    key: content[0]?._metadata?.key,
  });
  // … render OptimizelyComponent (see the catch-all page above) …
}

// Read anywhere in the tree — no prop drilling, no ServerContext instance:
export function MyComponent() {
  const context = getContext();
  const locale = context?.locale ?? 'en-US';
  const isPreview = !!context?.preview_token;
  return <div>Locale: {locale}</div>;
}
```

> `mode: 'public'` from the Remko `ServerContext` maps onto the SDK's
> published-vs-preview distinction, driven by credentials and preview token
> (`context.preview_token`) rather than a constructor flag. See
> `auth-and-env-mapping.md` (Single Key vs App Key + Secret) and docs
> `7-live-preview.md`.

## Related references

- Package/import mapping: `package-and-import-mapping.md`
- Auth & environment variables: `auth-and-env-mapping.md`
