Every interactive app on this site now goes through the local integration in `integrations/glimlit/`. That includes the homepage code tabs and the apps embedded in these articles.

The integration gives Astro responsibility for when an island starts. Glimlit still owns its model, updates, effects, subscriptions, and lit-html view. The runtime comes from the corresponding Glimlit implementation; only its Gleam import namespace is adjusted for this site. Astro owns loading and unmount events, while Glimlit owns rendering and hydration.

## What changed in the migration

Astro already called `main(root)`. The migration replaced its local runtime fork
and moved rendering decisions out of individual apps:

| Earlier experiment | Current implementation |
| --- | --- |
| `mvu.mount(root, init(), update, view)` | `mvu.start(init(), update, view, root)` |
| A view received the DOM root and rendered into it. | A view receives instance context and returns a template. |
| Postcard/code tabs exported separate `template` functions and local hydration wrappers. | Each exports one `view`; Glimlit renders or hydrates internally. |
| Apps manually assembled root-prefixed IDs. | `context.id(name)` supplies their shared server/browser identity. |
| Storage-key conventions lived in a runtime helper. | They live in `src/lib/island-persistence.mjs` as app policy. |

The model, messages, and update behavior remain the app's responsibility. Astro
still schedules startup and retains the returned cleanup function. There is no
renderer or hydration-mode argument in an app's startup call.

## Code-reading order

The paths below are relative to this Astro project. Follow one Counter through
these files before reading the larger apps:

1. `src/islands/Counter.mjs` connects Astro to the compiled app and creates the
   initial template from its real view. `Todos.mjs` shows the smaller adapter
   used when no initial app HTML is supplied.
2. `integrations/glimlit/server.mjs` creates the server root ID, serializes the
   initial template, and marks the mount. `component.mjs` holds the adapter metadata.
3. `integrations/glimlit/client.mjs` preserves that root, loads the app at Astro's
   chosen time, calls `main(root)`, and registers cleanup.
4. `src/glimlit_apps/counter/counter.gleam` initializes state and forwards startup
   to Glimlit. Its `view.mjs` returns the template and creates click handlers.
5. `src/glimlit_apps/runtime/mvu.gleam` binds context and rendering to the root
   and contains the complete MVU loop. `instance.mjs` provides identity;
   `render.mjs` makes the first-view rendering/hydration decision;
   `runner.mjs` performs requested work and provides mutable-reference operations.
   `subscriptions.mjs` owns subscription lifetimes and cleanup.
6. Read Postcard's `view.mjs`, `effects.mjs`, and `subscriptions.mjs` to follow
   scoped IDs, persistence, and a root-scoped keyboard listener.

For an explanation of the shared runtime, including startup and cleanup traces,
see [the Glimlit runtime walkthrough](https://github.com/bmehder/glimlit/blob/main/notes/runtime-walkthrough.md).
This page describes the Astro adapter around that runtime.

## Start with the component

An Astro page imports an adapter and chooses a client directive:

```astro
---
import Counter from '../islands/Counter.mjs'
---

<Counter client:load class="min-h-80" />
```

MDX articles use the same component syntax. The import path depends on the article’s location.

`client:load` starts the app as the page loads. `client:visible` waits until the island enters the viewport. Both render their server output before the app starts: Counter, Postcard, and code tabs produce their initial UI, while Todos and Recipes currently produce empty mounts. This integration currently requires a client directive.

## One small adapter per app

`src/islands/Todos.mjs` shows a browser-only adapter connected to its compiled Gleam module:

```javascript
import { defineApp } from '../../integrations/glimlit/component.mjs'

export default defineApp('todos', () =>
  import('../../build/dev/javascript/glimlit/glimlit_apps/todos/todos.mjs'),
)
```

The dynamic import loads the app module when the renderer starts it. There is no central list of app names to update.

The helper in `component.mjs` is small:

```javascript
export function defineApp(app, load, template = undefined) {
  return Object.assign((_props) => null, {
    framework: 'glimlit',
    app,
    load,
    template,
  })
}
```

The function shape lets Astro’s editor tooling recognize a component. The renderer reads the attached metadata instead of calling that placeholder function. `framework` identifies the renderer, `app` supplies the instance name, and `load` imports the compiled app.

## Register the renderer

`astro.config.mjs` adds `glimlit()` to its integrations alongside MDX. In `integrations/glimlit/index.mjs`, the `astro:config:setup` hook calls `addRenderer()` with a name and two entry points:

```text
integrations/glimlit/
  index.mjs       Registers the integration
  component.mjs   Defines component adapters
  server.mjs      Produces marked initial HTML or an empty mount
  client.mjs      Starts and cleans up the app
```

This uses Astro’s [renderer API](https://docs.astro.build/en/reference/renderer-reference/), the extension point for teaching Astro how to handle another kind of UI component.

## The server produces a mount

`server.mjs` recognizes adapters through their `framework` property. For an adapter without a server template, it returns an empty element:

```html
<div data-glimlit-root tabindex="-1" class="min-h-80"></div>
```

The renderer copies and escapes the component’s `class` prop. That means a minimum height can reserve space before JavaScript loads. In an article, `not-prose` keeps the article’s typography styles out of the app.

These empty mounts contain no app UI. Counter, Postcard, and code tabs supply initial HTML instead, using the same views as browser updates.

`client:only="glimlit"` also works, but skips this server-rendering step. The client creates the mount instead, so its classes cannot reserve space before JavaScript runs.

## The browser starts Glimlit

Astro wraps the component in an island and calls `client.mjs` when its loading directive allows it.

The client renderer finds matching islands and numbers them in document order. Server-rendered mounts retain their server-assigned IDs, with a separate `-ssr-` prefix to avoid collisions with client-only mounts. Two server-rendered counters retain IDs such as `counter-app-ssr-1` and `counter-app-ssr-2`, even if the second one starts first. Client-only mounts use IDs such as `counter-app-2`, where the number is their position among matching components. The server and client prefixes avoid collisions in a mixed page. It reuses the server mount when available, assigns its ID and instance number, and applies the supplied classes.

Then it loads and starts the app:

```javascript
const { main } = await component.load()
if (!element.isConnected) return
const stop = main(root)
element.addEventListener('astro:unmount', stop, { once: true })
```

The connection check avoids starting an app if its island disappeared while the import was pending. If Astro later removes the island and emits `astro:unmount`, the returned stop function shuts down its runtime and subscriptions.

## The app receives its own root

Each app exposes the same entry point:

```gleam
pub fn main(root: Root) -> fn() -> Nil {
  mvu.start(init(), update, view, root)
}
```

The view returns a template and receives instance context as its third argument. A simple view such as Counter can ignore that argument. Its `id(name)` helper generates IDs belonging to the root. In the browser, `context.root` is the mount; effects receive the same root and ID helper. Glimlit commits the template into that root. DOM IDs, focus queries, and keyboard listeners stay scoped to the instance, so repeated apps can coexist.

The site also uses instance numbers to separate persisted copies and recipe route prefixes. Those conventions are local experiments, rather than a settled public Glimlit API. Keep one adapter module per app so the numbering stays consistent.

## Server rendering and hydration

The postcard adapter supplies an optional third argument to `defineApp`: a function that creates its initial lit-html template from `init()` and a server-assigned root ID. Constructing the initial model creates effect descriptions; the server callback takes the model and does not execute those effects.

The postcard’s `view.mjs` exports one `view(model, dispatch, context)` function that returns a template. The adapter creates server context with `contextForId(rootId)` and calls that same view on the server; the browser runtime supplies context with the same identity and a real root. The server uses `@lit-labs/ssr` to serialize it, including Lit’s hydration markers, and marks the mount with `data-glimlit-ssr`. This adapter serializes the template directly because it also owns the local textarea bridge. The original Vite website uses the shared `runtime/server.mjs` helper for initial HTML.

When `client:visible` starts the island, it calls `main(root)` exactly as it does for an empty mount. Glimlit detects the marker and hydrates its first view internally. This attaches bindings and event handlers to the existing HTML using the real dispatcher before effects run. All later updates render normally. App views do not import a renderer, choose a mode, or carry a hydration wrapper.

The browser calls `init()` again. Hydration does not reconstruct the model from HTML: the initial model, template, and root ID must match on both sides. Browser effects start only after that first view; storage access remains in effects. Lit’s SSR and hydration packages are experimental.

Native form controls need particular care. The postcard uses a boolean attribute for its checkbox. Lit SSR does not serialize a textarea’s `.value` as text, so the template also supplies `data-ssr-value`; the server copies that escaped value into the textarea’s initial text content. This keeps the message visible before JavaScript without maintaining a separate view.

The homepage code tabs now use the same approach, including server-rendered syntax highlighting and hydration of tab click and keyboard handlers. The highlighted examples still require Shiki in the browser because highlighting runs when the view module loads; moving that work entirely to the build is a separate optimization.

Counter also uses its shared view for initial HTML. Todos and Recipes still start from empty mounts. `client:only="glimlit"` exercises the same app startup without server HTML.

## Reference: responsibilities and current limits

| Layer | Owns |
| --- | --- |
| App | Model, messages, update decisions, templates, effects, and subscription sources |
| Glimlit | Current model, dispatch, template commits, first-view hydration, instance context, effect execution, and subscription cleanup |
| Astro adapter | Initial HTML, stable server root IDs, loading directives, classes, and the unmount lifecycle |
| Local app conventions | Storage-key suffixes and recipe route prefixes |

All runtime files match Glimlit except the Gleam import namespace. The public
app contract is `main(root)` and `view(model, dispatch, context)`, returning a
template. Low-level tests also exercise the internal loop; that is not another
startup mode required by app authors.

## Cleanup and remaining limits

`main(root)` returns cleanup synchronously. Calling it stops subscriptions and
ignores messages from old dispatch callbacks and late effect results. It does
not remove the DOM, cancel an HTTP request already in progress, or prevent an
event handler from performing its own direct browser work. Astro supplies the
lifecycle event; the client adapter connects that event to cleanup.

Initial HTML can prevent an app from arriving late and moving surrounding
content, but its controls become functional only when the island starts.
Preserving edits made before delayed hydration is not guaranteed. Host input
transport, nondeterministic initialization snapshots, and later host prop updates
are not implemented.
The current renderer includes the small experimental hydration client for all
apps to keep startup synchronous and uniform.

## What remains separate

Gleam compilation remains a separate step: the site’s scripts run `gleam build` before Astro. After changing app sources, rebuild Gleam and reload. Direct `.gleam` imports and automatic compiler watching are not implemented.

Only the `class` prop is currently supported; passing application props and slots would need more work. The useful foundation is already in place: Astro schedules each island, a small renderer gives it a root, and Glimlit runs the app.
