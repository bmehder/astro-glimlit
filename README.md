# Astro + Glimlit

A Tailwind-styled Astro site with a Demos MDX collection. All five Glimlit apps use the site-local Astro renderer in `integrations/glimlit/`. The apps now use the template-returning Glimlit runtime, copied with only Gleam import namespaces adjusted.

## Run

Use Node 22.23.4 or newer.

```sh
npm ci
npm run dev
```

The scripts compile Gleam before starting Astro. The project includes its own Gleam compiler.

## Include an app

Import its adapter and choose an Astro loading directive:

```astro
---
import Counter from '../islands/Counter.mjs'
---

<Counter client:load class="rounded-xl border border-slate-800 bg-slate-900 p-6" />
```

MDX uses the same component syntax, with an ordinary import after the frontmatter:

```mdx
import Todos from '../../islands/Todos.mjs'

Text before the app.

<Todos client:load class="not-prose my-8 max-w-2xl text-base leading-normal text-slate-100" />

Text after the app.
```

Adapters live in `src/islands/`: `Counter`, `Todos`, `Postcard`, `Recipes`, and `CodeTabs`. Their small `defineApp(name, loader)` exports connect Astro to compiled Gleam modules. Add another adapter to include another app; there is no central app-name list or mount-scanning wrapper to update.

`client:load` starts an app as the page loads. `client:visible` waits until its mount enters the viewport. `/integration/` explains the renderer and loading directives, including `client:only="glimlit"`. The homepage uses `client:load`; the Postcard article uses `client:visible` to demonstrate delayed startup. Each MDX component declares its loading directive.

## Catching up on the implementation

Start with [the integration guide](src/content/integration.md), also available at
`/integration/` when the site is running. It has a before/after comparison and a
code-reading order from the Counter adapter through server HTML, client startup,
instance context, the MVU loop, and cleanup.

For the shared Glimlit implementation, read
[Understanding the current runtime](https://github.com/bmehder/glimlit/blob/main/notes/runtime-walkthrough.md).
`GLIMLIT-FOLLOWUPS.md` records experiment history and unresolved questions; it is
not the first place to learn the current API.

## How the renderer works

`astro.config.mjs` registers `integrations/glimlit/index.mjs`. The server renderer recognizes the adapter and emits a mount with its CSS classes. Counter, Postcard, and code tabs supply their shared views for server rendering; Todos and Recipes emit empty mounts. This preserves reserved space and article styling before JavaScript starts, without duplicating the app view. A client directive is required.

Astro schedules loading; the client renderer calls `main(root)` on the compiled module. Glimlit owns state, effects, subscriptions, and lit-html rendering from there. The renderer registers the returned stop function for Astro's `astro:unmount` event.

Every app exposes `main(root)`, including the homepage code tabs. The view returns a lit-html template and receives `(model, dispatch, context)`; `mvu.start(init(), update, view, root)` supplies the runtime. Instance context provides `root` in the browser and an `id(name)` helper on both server and browser. DOM queries and keyboard listeners stay within that root. Label, dialog, and tab IDs are prefixed with the root ID.

Repeated components are independent. Instances are numbered in document order, even when Astro loads them in a different order. The first copy retains its established browser-storage key and recipe `#/...` routes. Later copies use separate storage keys and route prefixes such as `#recipes-app-2/recipe/1`. Persisted copies follow their position on the page. Use one adapter module per app.

Counter, Postcard, and code tabs use server rendering and hydration through Lit Labs. Their adapters obtain the initial template from the same `view` used for browser updates. Glimlit detects the server marker, hydrates the first view, and attaches real handlers before effects run. Apps have no local hydration wrappers or renderer imports. Todos and Recipes still mount entirely in the browser. `client:only` also works, but omits the server mount and its classes. Prefer `client:load` or `client:visible` when the mount reserves space. Lit SSR and hydration are experimental; the postcard also uses a small server-side textarea-value bridge. Only the `class` prop is supported; app props and slots are not implemented.

## Current behavior and remaining work

| Implemented | Remaining work |
| --- | --- |
| One `main(root)` startup call for empty and server-rendered mounts | Host initialization data and safe initial-state transport |
| Template-returning views and automatic first-view hydration | General textarea serialization and preserving pre-hydration edits |
| Root-scoped IDs, focus, shortcuts, and cleanup | Application policies for stable storage and routing identities |
| Counter, Postcard, and code tabs with initial HTML; Todos and Recipes rendered in the browser | Direct Gleam imports/compiler watching and separately published integration tooling |

Lit Labs dependencies remain experimental. Postcard's server textarea bridge is
local to this Astro adapter; it is not general Glimlit runtime behavior. Only the
`class` prop is supported by this integration. Other app props and slots are not
forwarded into app initialization.

## Content and routes

```text
src/
  content.config.ts         # Demos collection schema
  content/demos/*.mdx        # Articles with inline app components
  pages/
    index.astro             # Homepage, including CodeTabs
    demos/index.astro       # Collection listing
    demos/[id].astro        # Shared article template
    integration.astro      # Integration documentation
  islands/*.mjs             # One adapter per Glimlit app
  components/Prose.astro     # Article typography
  glimlit_apps/             # Gleam apps, lit-html views, effects, and copied Glimlit runtime
integrations/glimlit/       # Astro integration and renderers
```

Collections provide content, not routes. `src/pages/demos/[id].astro` uses `getStaticPaths()` and `render()` to create one page per entry. Each content filename becomes its entry ID and URL. The MDX component determines exactly where the app appears. `order` controls listing order. Plain `.md` remains supported for articles without components.

## Editing apps

Edit source under `src/glimlit_apps/`, never generated files under `build/`. Gleam copies JavaScript FFI files alongside compiled modules. After editing Gleam or an app/runtime `.mjs` file, run `npx gleam build` and reload. Restart `npm run dev` if Vite retains an old dependency.

There is no compiler watcher or direct `.gleam` import support yet. Astro pages and MDX use normal development updates. Restart after changing collection configuration if development content is stale.

## Highlighting and styling

Tailwind styles pages and apps. `Prose.astro` uses the Typography plugin for article content; inline apps use `not-prose` to keep those styles out. The homepage reserves space with `min-h-[30rem]` and its code-tabs view retains animation classes; the entrance-animation CSS is currently commented out.

Markdown/MDX code fences get Astro's syntax highlighting. Astro templates can use `Code` from `astro:components`. The code-tabs app owns its UI and example strings, using `src/lib/highlight.mjs` for browser highlighting.

## Checks

```sh
npm run format:check
npm run check
npm test
npm run build
```

The build produces the static site in `dist/`. Recipe samples are served from `public/recipes/samples.json`.

See [GLIMLIT-FOLLOWUPS.md](./GLIMLIT-FOLLOWUPS.md) for experiment history and open
framework questions. The integration guide describes the currently implemented
startup, view, and instance contracts.


The runtime files in `src/glimlit_apps/runtime/` match the source Glimlit project
except for Gleam import prefixes. Instance storage-key conventions live in
`src/lib/island-persistence.mjs`, outside the runtime. Recipe route prefixes also
remain app policy. The original project now contains the corresponding runtime
work; see `GLIMLIT-FOLLOWUPS.md` for the migration and remaining design questions.


The shared runtime now has eight files. Startup and the loop live together in
`mvu.gleam`; mutable-reference operations live in `runner.mjs`. The earlier
`loop.gleam` and `browser.mjs` files were consolidated. App startup, view contracts,
and application imports are unchanged by that reorganization.
