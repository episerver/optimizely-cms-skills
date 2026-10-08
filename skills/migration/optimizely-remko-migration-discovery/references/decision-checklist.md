# Pre-migration decision checklist

Skills further down the chain reference decisions the customer must make
BEFORE the skill can be fully applied. This checklist enumerates them and
notes how to detect whether each applies.

## D1 — Codegen architecture

**Question:** Keep GraphQL codegen (swap Remko preset for stock
`client-preset`) OR abandon codegen entirely and rewrite queries against
SDK typed methods + runtime helpers.

**Applies when:** `@remkoj/optimizely-graph-functions` is installed AND
codegen output (`src/gql/*`, generated `.ts` from `.graphql`) is consumed.

**Detection:**
```bash
ls apps/*/codegen.ts apps/*/codegen.yml apps/*/codegen.mjs 2>/dev/null
find apps -name '*.graphql' -not -path '*/node_modules/*' | head -20
grep -rn "from '@/gql" apps/ --include='*.ts' --include='*.tsx' | head -5
```

**Third option worth considering:** Keep codegen but drop Remko's
`OptimizelyGraphPreset` in favour of `@graphql-codegen/client-preset`
plus a hand-written master-query composition. Reduces patched deps and
keeps the fragment ecosystem alive.

**Skills gated:** `optimizely-remko-graph-functions-to-content-js` (whole
skill), `optimizely-remko-cms-react-to-content-js` (block-fragment
rewrites).

## D2 — `_contract` base type support

**Question:** Does `@optimizely/cms-cli` support first-class `_contract`
base types (customer-specific extension seen in mature Remko-based CMS
schemas)?

**Applies when:** Customer's content type definitions include
`isContract: true`.

**Detection:**
```bash
grep -rn 'isContract' apps/*/src/ apps/*/.opti-type.json 2>/dev/null | head -10
find apps -name '*.opti-type.json' -exec grep -l 'contract' {} \; 2>/dev/null
```

**How to resolve:** Empirical test — install `@optimizely/cms-cli` in a
scratch repo, define a content type with `isContract: true` in
`optimizely.config.mjs`, run `optimizely-cms-cli config push`. If it works,
the CLI skill applies as-is. If not, plan on keeping the patched Remko CLI
alongside the new one.

**Skills gated:** `optimizely-remko-cms-cli-to-content-js` (whole skill).

## D3 — Ajv / OpenAPI defect handling in official CLI

**Question:** Do the defect relaxations commonly patched into Remko's CLI
(scalar `oneOf`, null property definitions, wildcard `mayContainTypes`,
`$ref` + annotation-sibling) exist in `@optimizely/cms-cli`?

**Applies when:** Customer's Remko CLI patch includes
`relaxSpecDefects` / `allowNullPropertyDefinitions` / similar
transformations.

**Detection:** Read the CLI patch file. Grep for keywords `relax`,
`oneOf`, `mayContainTypes`, `RFC 7396`, `patched`.

**How to resolve:** Read the patch fully to enumerate every behaviour;
check `@optimizely/cms-cli` release notes and open issues for each;
spike each against a fresh install.

**Skills gated:** `optimizely-remko-cms-cli-to-content-js` (patch
reproduction step).

## D4 — Preview auth model

**Question:** Standardise on `X_LSC_PREVIEW_TOKEN`-style bearer flow
(SDK's model) OR retain the `draftMode() → HMAC` fallback.

**Applies when:** Customer's code calls `updateAuthentication(AuthMode.HMAC)`
or `client.enablePreview()` inside a `draftMode()` conditional.

**Detection:**
```bash
grep -rn 'updateAuthentication\|enablePreview' apps/ \
  --include='*.ts' --include='*.tsx' 2>/dev/null
```

**Hidden sub-decision:** The SDK's `getPreviewContent(searchParams)`
reads from URL searchParams. Customer-owned header-based preview
plumbing must be mapped to the searchParam contract.

**Constraint:** The SDK removed HMAC entirely — "retain HMAC" is a
non-starter unless the customer forks the SDK or stays on Remko for the
graph-client surface.

**Skills gated:** `optimizely-remko-graph-client-to-content-js`,
`optimizely-remko-cms-nextjs-to-content-js`.

## D5 — Editor Save flows

**Question:** Keep `@remkoj/optimizely-cms-api` as a "conditional
residual" for editor Save flows (skill-endorsed default) OR port to raw
Integration API REST.

**Applies when:** Customer's code calls `contentPatchVersion`,
`contentCreateVersion`, `contentCreate`, or `contentDelete` on the
Remko cms-api client.

**Detection:**
```bash
grep -rn 'contentPatchVersion\|contentCreateVersion\|contentCreate\|contentDelete' \
  apps/ --include='*.ts' 2>/dev/null | head -20
```

**Skill's default recommendation:** Keep the package — smaller migration
surface, no auth code to re-implement, generated types unchanged.

**Skills gated:** `optimizely-remko-cms-api-to-content-js` (scope
depends heavily on the answer).

## D6 — Webhook registration location

**Question:** CI script that hits Graph Management API / runtime
idempotent registration / manual admin UI.

**Applies when:** `webhook:create` script or `register-webhook.*` file
found.

**Detection:**
```bash
find apps -name 'register-webhook.*' -not -path '*/node_modules/*' 2>/dev/null
grep -l 'webhook:create' apps/*/package.json 2>/dev/null
```

**Reality:** All three options require re-implementation because
`opti-graph` disappears — the "keep CI script" option really means
"rewrite the CI script to hit Graph Management API directly."

**Skills gated:** `optimizely-remko-graph-cli-to-content-js`.

## D7 — `@optimizely/cms-sdk` peer-dep window

**Question:** Is `@optimizely/cms-sdk` compatible with the customer's
Next.js and React versions?

**Applies when:** Always. Check first in every discovery.

**How to resolve:**
```bash
npm view @optimizely/cms-sdk peerDependencies
```

One command; do not defer to Optimizely product for this.

**Skills gated:** All — an incompatible peer-dep window blocks the whole
migration.
