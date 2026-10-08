---
name: optimizely-observability
description: This skill should be used when the user asks to "add monitoring", "set up OpenTelemetry", "configure tracing", "add observability", "track performance", "instrument the SDK", "debug slow queries", "see what spans are available", "set up metrics", or mentions OpenTelemetry, tracing, telemetry, or observability for the Optimizely CMS SDK.
---

# Optimizely CMS SDK Observability with OpenTelemetry

This skill teaches how to set up OpenTelemetry observability for the Optimizely CMS JavaScript SDK, including tracing, metrics, and cache-aware telemetry.

## When to Use This Skill

Use this skill when the user wants to:
- Add monitoring or observability to their Optimizely CMS application
- Set up OpenTelemetry tracing for SDK operations
- Understand what metrics and spans the SDK provides
- Debug performance issues with content fetching or query generation
- Configure exporters for their observability platform (Jaeger, Datadog, New Relic, etc.)
- Troubleshoot missing spans or telemetry data

## Overview

The Optimizely CMS SDK includes built-in instrumentation using `@opentelemetry/api` only (not the full SDK). This means:
- **Zero overhead** when OpenTelemetry is not configured in the host application
- When you configure an OpenTelemetry SDK, spans and metrics are automatically collected
- No SDK code changes are needed to enable telemetry

## Step 1: Install OpenTelemetry Packages

Install the OpenTelemetry Node SDK and API:

```bash
npm install @opentelemetry/sdk-node @opentelemetry/api
```

For specific exporters, install additional packages as needed:

```bash
# Console exporter (for development/debugging)
# Included in @opentelemetry/sdk-node by default

# OTLP exporter (for Jaeger, Grafana Tempo, etc.)
npm install @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-metrics-otlp-http

# Datadog
npm install @opentelemetry/exporter-trace-otlp-http
```

## Step 2: Create the Instrumentation File

**CRITICAL**: The instrumentation file MUST be imported FIRST, before any Optimizely SDK imports. If the OpenTelemetry SDK is not initialized before the Optimizely SDK loads, spans will not be captured.

### Quick Start with Console Exporter

Create `instrumentation.js` (or `instrumentation.ts`) at your project root:

```javascript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';

const sdk = new NodeSDK({
  serviceName: 'my-optimizely-app',
  traceExporter: new ConsoleSpanExporter(),
});

sdk.start();
```

### Production Setup with OTLP Exporter

```javascript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  serviceName: 'my-optimizely-app',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 30000,
  }),
});

sdk.start();
```

### Next.js Integration

Next.js has built-in support for instrumentation files. Create `instrumentation.ts` in your project root (next to `next.config.js`):

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { ConsoleSpanExporter } = await import('@opentelemetry/sdk-trace-node');

    const sdk = new NodeSDK({
      serviceName: 'my-optimizely-app',
      traceExporter: new ConsoleSpanExporter(),
    });

    sdk.start();
  }
}
```

Next.js automatically loads this file. No additional import configuration is needed.

**Important**: Ensure `experimental.instrumentationHook` is enabled in `next.config.js` if using Next.js versions before 15:

```javascript
// next.config.js (Next.js < 15 only)
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
};
```

## Step 3: Understand Available Telemetry

### Instrumented Spans

The SDK automatically creates spans for these operations:

| Span Name | Attributes | Description |
|-----------|------------|-------------|
| `optimizely.content.get_by_path` | `path`, `cache`, `content_type`, `found` | Content retrieval by URL path |
| `optimizely.content.get` | `key`, `locale`, `version`, `content_type`, `found` | Content retrieval by key |
| `optimizely.content.get_preview` | `key`, `preview.token`, `preview.mode`, `preview.version` | Preview content retrieval |
| `optimizely.query.create` | `query_type`, `content_type`, `dam.enabled` | GraphQL query generation (conditional) |
| `optimizely.fragment.create` | `content_type`, `fragment_count`, `threshold` | GraphQL fragment generation (conditional) |
| `optimizely.graph.request` | `http.method`, `url`, `status_code`, `cache`, `slot` | HTTP request to Content Graph API |
| `optimizely.component.resolve` | `component_type`, `tag`, `found` | React component resolution from registry |
| `optimizely.react.render_component` | `component_type`, `has_tag`, `has_display_settings` | React component rendering |

**Conditional spans**: `optimizely.query.create` and `optimizely.fragment.create` are only emitted on cache misses. This is intentional to reduce telemetry volume by approximately 95% during normal operation when queries and fragments are cached.

### Metrics

The SDK records these metrics as histograms and counters:

| Metric Name | Type | Unit | Description |
|-------------|------|------|-------------|
| `fragment.generation.duration` | Histogram | ms | Time to generate GraphQL fragments |
| `query.generation.duration` | Histogram | ms | Time to generate GraphQL queries |
| `http.request.duration` | Histogram | ms | Duration of HTTP requests to Content Graph |
| `content.fetch.duration` | Histogram | ms | Total time to fetch and process content |
| `component.resolve.duration` | Histogram | ms | Time to resolve a component from the registry |

### Cache-Aware Telemetry

The SDK uses cache-aware telemetry to minimize overhead:
- **Cache hits**: Only the top-level content fetch span is emitted (with `cache: 'hit'` attribute)
- **Cache misses**: Full span tree is emitted including query generation, fragment creation, and HTTP request spans
- This design reduces telemetry volume by approximately 95% during steady-state operation
- When investigating performance issues, look for spans with `cache: 'miss'` to identify cold-start or cache-invalidation patterns

## Step 4: Verify Telemetry Is Working

After setting up the instrumentation:

1. **Start your application** and trigger some content fetches
2. **Check the console** (if using ConsoleSpanExporter) for span output
3. **Verify span names** match the expected `optimizely.*` prefix
4. **Check attributes** on spans for expected values

Example console output for a content fetch:

```
{
  traceId: 'abc123...',
  name: 'optimizely.content.get_by_path',
  attributes: {
    path: '/en/about/',
    cache: 'miss',
    content_type: 'StandardPage',
    found: true
  }
}
```

## Troubleshooting

### No Spans Appearing

**Most common cause**: Import order. The OpenTelemetry SDK must be initialized before any Optimizely SDK imports.

**Steps to resolve:**
1. Verify the instrumentation file is loaded first:
   - Next.js: Check that `instrumentation.ts` is in the project root
   - Other frameworks: Verify import order in your entry point
2. Check that the exporter is configured correctly
3. For Next.js, verify `NEXT_RUNTIME === 'nodejs'` check is present (spans are server-side only)
4. Restart the development server after adding the instrumentation file

### Missing Attributes on Spans

Some span attributes are **conditional** and only appear in specific scenarios:
- `dam.enabled` only appears on `optimizely.query.create` when DAM integration is active
- `cache` attribute only appears when caching is enabled
- `tag` on `optimizely.component.resolve` only appears when a display template is in use

This is expected behavior, not a bug.

### Performance Concerns

If telemetry adds noticeable overhead:
1. **Use sampling** to reduce volume:
   ```javascript
   import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';

   const sdk = new NodeSDK({
     sampler: new TraceIdRatioBasedSampler(0.1), // Sample 10% of traces
   });
   ```
2. **Increase metric export interval** to reduce metric reporting frequency
3. **Use batch exporters** (default in most OTLP exporters) to batch span export
4. Remember that the SDK's cache-aware telemetry already reduces volume by approximately 95%

## Related Skills

- **`optimizely-setup`** - Initial SDK installation and configuration
- **`optimizely-troubleshoot-graph`** - Debugging Content Graph query errors
