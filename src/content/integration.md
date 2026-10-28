Every interactive app on this site now goes through the local integration in `integrations/glimlit/`. That includes the homepage code tabs and the apps embedded in these articles.

The integration gives Astro responsibility for when an island starts. Glimlit still owns its model, updates, effects, subscriptions, and lit-html view. The original Glimlit repository remains unchanged; this implementation lives entirely in the Astro project.

## Start with the component

An Astro page imports an adapter and chooses a client directive:

```astro
---
import Counter from '../islands/Counter.mjs'
---

<Counter client:load class="min-h-80" />
```

MDX articles use the same component syntax. The import path depends on the article’s location.

`client:load` starts the app as the page loads. `client:visible` waits until the island enters the viewport. Both produce an empty mount element before the app starts. This integration currently requires a client directive.

## One small adapter per app

`src/islands/Counter.mjs` connects the component to its compiled Gleam module:

```javascript
import { defineApp } from '../../integrations/glimlit/component.mjs'

export default defineApp('counter', () =>
  import('../../build/dev/javascript/glimlit/glimlit_apps/counter/counter.mjs'),
)
```

The dynamic import loads the app module when the renderer starts it. There is no central list of app names to update.

The helper in `component.mjs` is small:

```javascript
export function defineApp(app, load) {
  return Object.assign((_props) => null, {
    framework: 'glimlit',
    app,
    load,
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
  server.mjs      Produces the empty mount
  client.mjs      Starts and cleans up the app
```

This uses Astro’s [renderer API](https://docs.astro.build/en/reference/renderer-reference/), the extension point for teaching Astro how to handle another kind of UI component.

## The server produces a mount

`server.mjs` recognizes adapters through their `framework` property. For a component with a client directive, it returns an empty element:

```html
<div data-glimlit-root tabindex="-1" class="min-h-80"></div>
```

The renderer copies and escapes the component’s `class` prop. That means a minimum height can reserve space before JavaScript loads. In an article, `not-prose` keeps the article’s typography styles out of the app.

The element contains no app UI. We do not duplicate the lit-html view or maintain a second set of buttons and panels in Astro.

`client:only="glimlit"` also works, but skips this server-rendering step. The client creates the mount instead, so its classes cannot reserve space before JavaScript runs.

## The browser starts Glimlit

Astro wraps the component in an island and calls `client.mjs` when its loading directive allows it.

The client renderer finds matching islands and numbers them in document order. Two counters receive `counter-app-1` and `counter-app-2`, even if the second one starts first. It reuses the server mount when available, assigns its ID and instance number, and applies the supplied classes.

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
pub fn main(root: effect.Root) -> fn() -> Nil {
  mvu.mount(root, init(), update, view)
}
```

The view renders into that root. Effects receive the same root in their context. DOM IDs, focus queries, and keyboard listeners stay scoped to the instance, so repeated apps can coexist.

The site also uses instance numbers to separate persisted copies and recipe route prefixes. Those conventions are local experiments, rather than a settled public Glimlit API. Keep one adapter module per app so the numbering stays consistent.

## What remains separate

The integration currently mounts apps in the browser. It does not render their UI on the server or hydrate existing app HTML. Reserved space and the homepage’s CSS entrance animation still help with loading.

Gleam compilation remains a separate step: the site’s scripts run `gleam build` before Astro. After changing app sources, rebuild Gleam and reload. Direct `.gleam` imports and automatic compiler watching are not implemented.

Only the `class` prop is currently supported; passing application props and slots would need more work. The useful foundation is already in place: Astro schedules each island, a small renderer gives it a root, and Glimlit runs the app.
