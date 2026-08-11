# Optimizely Observability

Add OpenTelemetry-based monitoring to your Optimizely CMS application, giving you tracing, metrics, and cache-aware telemetry for content fetching, query generation, and component rendering.

## When to Use

Use this skill when you want to:
- Add monitoring or observability to your Optimizely CMS application
- Set up OpenTelemetry tracing for SDK operations
- Debug slow content fetches or query performance
- Understand what spans and metrics the SDK provides out of the box
- Configure exporters for Jaeger, Datadog, Grafana, New Relic, or other platforms
- Troubleshoot missing telemetry data

## Trigger Phrases

Say any of these to activate the skill:
- "Add monitoring"
- "Set up OpenTelemetry"
- "Configure tracing"
- "Add observability"
- "Track performance"
- "Instrument the SDK"
- "Debug slow queries"
- "See what spans are available"
- "Set up metrics"

## Usage Example

```
You: "Add OpenTelemetry tracing to my Next.js Optimizely project"

Agent: [Uses optimizely-observability skill]
- Installs @opentelemetry/sdk-node and @opentelemetry/api
- Creates an instrumentation.ts file in the project root
- Configures it for Next.js with the register() export pattern
- Starts with ConsoleSpanExporter for immediate verification
- Explains how to switch to OTLP exporter for production
```

```
You: "Why am I not seeing any spans from the SDK?"

Agent: [Uses optimizely-observability skill]
- Checks that the instrumentation file loads before any SDK imports
- Verifies the Next.js runtime check (NEXT_RUNTIME === 'nodejs')
- Confirms the exporter is configured correctly
- Reminds you to restart the dev server after changes
```

## What It Generates

- **OpenTelemetry packages** -- Installs `@opentelemetry/sdk-node`, `@opentelemetry/api`, and the appropriate exporter packages
- **Instrumentation file** -- `instrumentation.ts` (or `.js`) configured for your framework
- **Exporter configuration** -- Console exporter for development, OTLP exporter for production platforms

## Available Telemetry

The SDK automatically emits spans and metrics with zero configuration on your part -- you only need to set up the OpenTelemetry collector.

### Spans

| Span | What It Tracks |
|------|----------------|
| `optimizely.content.get_by_path` | Content retrieval by URL path |
| `optimizely.content.get` | Content retrieval by key |
| `optimizely.content.get_preview` | Preview content fetches |
| `optimizely.query.create` | GraphQL query generation (cache miss only) |
| `optimizely.fragment.create` | GraphQL fragment generation (cache miss only) |
| `optimizely.graph.request` | HTTP requests to Content Graph |
| `optimizely.component.resolve` | Component resolution from registry |
| `optimizely.react.render_component` | React component rendering |

### Metrics

| Metric | Type |
|--------|------|
| `content.fetch.duration` | Total time to fetch and process content |
| `http.request.duration` | Duration of HTTP requests to Content Graph |
| `query.generation.duration` | Time to generate GraphQL queries |
| `fragment.generation.duration` | Time to generate GraphQL fragments |
| `component.resolve.duration` | Time to resolve a component |

## Cache-Aware Telemetry

The SDK is designed to minimize telemetry overhead:
- **Cache hits** emit only the top-level span (with `cache: 'hit'`)
- **Cache misses** emit the full span tree including query generation and HTTP requests
- This reduces telemetry volume by roughly 95% during normal operation
- When debugging, filter for `cache: 'miss'` to find cold-start or cache-invalidation patterns

## Key Considerations

- The instrumentation file **must load before** any Optimizely SDK imports, or spans will not be captured.
- For Next.js, the `instrumentation.ts` file is automatically loaded when placed in the project root.
- For Next.js versions before 15, enable `experimental.instrumentationHook` in `next.config.js`.
- Use sampling in production to control telemetry volume if needed.

## Related Skills

- [`optimizely-setup`](optimizely-setup.md) -- Install the SDK before adding observability
- [`optimizely-cli-workflows`](optimizely-cli-workflows.md) -- Deploy content types that will appear in your traces
- [`optimizely-project-scaffold`](optimizely-project-scaffold.md) -- Start a new project, then add monitoring
