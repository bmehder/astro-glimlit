# Astro + Glimlit

A Tailwind-styled Astro site with a Demos MDX collection. All five Glimlit apps use the site-local Astro renderer in `integrations/glimlit/`. The original Glimlit repository remains unchanged.

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

`client:load` starts an app immediately. `client:visible` waits until its mount enters the viewport. `/integration/` demonstrates those directives alongside `client:only="glimlit"`. The homepage and demo articles use `client:load`.

## How the renderer works

`astro.config.mjs` registers `integrations/glimlit/index.mjs`. The server renderer recognizes the adapter and emits only an empty mount with its CSS classes. This preserves reserved space and article styling before JavaScript starts, without duplicating the app view. A client directive is required.

Astro schedules loading; the client renderer calls `main(root)` on the compiled module. Glimlit owns state, effects, subscriptions, and lit-html rendering from there. The renderer registers the returned stop function for Astro's `astro:unmount` event.

Every app uses the same mount API, including the homepage code tabs. The view receives `(model, dispatch, root)`; `mvu.mount(root, init(), update, view)` supplies the runtime. DOM queries and keyboard listeners stay within that root. Label, dialog, and tab IDs are prefixed with the root ID.

Repeated components are independent. Instances are numbered in document order, even when Astro loads them in a different order. The first copy retains its established browser-storage key and recipe `#/...` routes. Later copies use separate storage keys and route prefixes such as `#recipes-app-2/recipe/1`. Persisted copies follow their position on the page. Use one adapter module per app.

This integration mounts apps in the browser; it does not server-render their UI or hydrate existing app HTML. `client:only` also works, but omits the server mount and its classes. Prefer `client:load` or `client:visible` when the mount reserves space. Only the `class` prop is supported; app props and slots are not implemented.

## Content and routes

```text
src/
  content.config.ts         # Demos collection schema
  content/demos/*.mdx        # Articles with inline app components
  pages/
    index.astro             # Homepage, including CodeTabs
    demos/index.astro       # Collection listing
    demos/[id].astro        # Shared article template
    integration.astro      # Loading-directive examples
  islands/*.mjs             # One adapter per Glimlit app
  components/Prose.astro     # Article typography
  glimlit_apps/             # Gleam apps, lit-html views, effects, and runtime
integrations/glimlit/       # Astro integration and renderers
```

Collections provide content, not routes. `src/pages/demos/[id].astro` uses `getStaticPaths()` and `render()` to create one page per entry. Each content filename becomes its entry ID and URL. The MDX component determines exactly where the app appears. `order` controls listing order. Plain `.md` remains supported for articles without components.

## Editing apps

Edit source under `src/glimlit_apps/`, never generated files under `build/`. Gleam copies JavaScript FFI files alongside compiled modules. After editing Gleam or an app/runtime `.mjs` file, run `npx gleam build` and reload. Restart `npm run dev` if Vite retains an old dependency.

There is no compiler watcher or direct `.gleam` import support yet. Astro pages and MDX use normal development updates. Restart after changing collection configuration if development content is stale.

## Highlighting and styling

Tailwind styles pages and apps. `Prose.astro` uses the Typography plugin for article content; inline apps use `not-prose` to keep those styles out. The homepage reserves space with `min-h-[30rem]` and its code-tabs view has a short CSS entrance animation.

Markdown/MDX code fences get Astro's syntax highlighting. Astro templates can use `Code` from `astro:components`. The code-tabs app owns its UI and example strings, using `src/lib/highlight.mjs` for browser highlighting.

## Checks

```sh
npm run format:check
npm run check
npm test
npm run build
```

The build produces the static site in `dist/`. Recipe samples are served from `public/recipes/samples.json`.

See [GLIMLIT-FOLLOWUPS.md](./GLIMLIT-FOLLOWUPS.md) for broader framework questions raised by this site. Local mounting and integration changes are evidence for future design, not settled public Glimlit APIs.
# astro-glimlit
