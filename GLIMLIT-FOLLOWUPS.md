# Glimlit follow-ups

This file records the Astro experiment, the subsequent migration to the shared
Glimlit runtime, and remaining design work. The current contract is documented
in the integration guide; earlier alternatives below are historical findings.

For the current implementation and a code-reading order, start with the
[integration guide](src/content/integration.md) or `/integration/` on the running
site. The sections below preserve findings and design history.

## Current migration status — 28 October 2026

The original Glimlit project now implements template-returning views, automatic
rendering/hydration, and instance context. This Astro project has been migrated
to that runtime. Statements below that the original was untouched describe the
earlier experiment, not the current migration state.

- All runtime files are copied from the Glimlit project, with only Gleam import
  namespaces adjusted to `glimlit_apps/runtime`. The previous local `mvu.mount`
  API has been removed.
- Public app startup is always `main(root)`. The Gleam entry forwards to
  `mvu.start(init(), update, view, root)`. All five apps return templates.
- Views receive `(model, dispatch, context)`; `context.id(name)` is shared by
  server and browser, and `context.root` exists in browser views. Effect contexts
  contain the same root/identity alongside dispatch and subscriptions.
- App-local rendering and hydration wrappers have been removed from Postcard
  and code tabs. The runtime owns first-view hydration before effects.
- Counter now also supplies its shared view for initial HTML. Todos and Recipes
  remain browser-rendered; all use the same startup. Astro's directives control
  timing, rather than app-specific rendering-mode parameters.
- The local storage-key helper moved from the runtime into
  `src/lib/island-persistence.mjs`. Existing storage and recipe route conventions
  are retained as app policy, not framework requirements.
- Initial textarea serialization now uses the isolated, temporary
  `lit-ssr-compat.mjs` server adapter shared by both projects. It uses parse5
  source offsets rather than regex replacement and requires `data-ssr-value`.
  The MVU loop and browser renderer are unchanged. Host initialization data,
  nondeterministic initialization snapshots, and pre-hydration edits remain open.

## Historical handoff: before the shared-runtime migration

The broader design question is whether Glimlit should optionally support server rendering and hydration in **any host**, including static sites, server-rendered applications, and existing HTML pages. Astro is the test host, not the intended boundary of this capability.

This document records an experiment and design possibilities. It does not specify an approved public API or request implementation. Evaluate these ideas against the original project's current code before deciding what to adopt.

- Experiment project: `/Users/bradleymehder/Developer/Frameworks/Astro/astro-glimlit`.
- Original project, left untouched during this experiment: `/Users/bradleymehder/Developer/Gleam/glimlit`.
- The app/runtime copies **inside the experiment project were modified**. This is not proof that unchanged original apps already support these features.
- Relevant implementation: `integrations/glimlit/{component,server,client}.mjs`, `src/islands/Postcard.mjs`, `src/glimlit_apps/postcard/view.mjs`, and the local `src/glimlit_apps/runtime/`.

### Runtime responsibilities versus API changes

This is **not established as a runtime-only change with an identical API**. A clean design may change the view contract from “render into this root and return nothing” to “return a TemplateResult for the rendering layer to handle.” That would affect the JavaScript view and potentially its Gleam FFI declaration, startup wiring, and rendering types.

The model, messages, `init`, `update`, and effect descriptions could remain unchanged in such a design; that is a design goal, not a verified compatibility guarantee. The original project should decide how much of its current entry-point and view API can be preserved.

Two approaches remain open:

- Preserve current browser-only APIs and add an opt-in template-based mounting/server-rendering path.
- Adopt a template-returning view contract, with a compatibility path for existing apps.

The experiment uses a third, transitional arrangement: keep the local root-aware view callback, export a separate shared template function, and put first-render hydration in that view. This proves feasibility but leaves plumbing in the app that a reusable Glimlit rendering layer could own.

### Suggested design goals, not settled decisions

- Make server rendering and hydration optional. Keep ordinary browser-only use simple and avoid requiring it to download hydration support.
- Give each running instance its own root and cleanup function.
- Complete initial mounting or hydration with the real dispatcher before running effects or starting subscriptions.
- Never run browser effects while producing server HTML. Require deterministic initial state, or define how server-provided state is transferred to the browser.
- Keep the initial model, view structure, and instance identity consistent across server rendering and hydration.
- Keep Astro directives and lifecycle hooks in the host adapter. Treat storage-key suffixes and recipe hash routes as application conventions, not automatic core framework policy.
- Investigate native form controls and edits made before hydration before settling a general solution. Do not automatically promote the textarea workaround below into a public API.

A useful next validation would be a small counter plus the postcard, exercised through both browser-only startup and server rendering/hydration.

## 1. Progressive enhancement and app loading

How should an app appear before its JavaScript has loaded and started?

- Prevent layout shift, as seen with the homepage code-tabs app.
- Avoid maintaining duplicate HTML and styles for a placeholder and the live app.
- Consider what can be rendered from the same view before the app starts, and what happens if JavaScript fails or is unavailable.
- The current site reserves space and uses a short CSS entrance animation. These are practical local workarounds, not a general Glimlit solution.

## 2. Loading multiple instances

Make mounting multiple apps, including repeated instances of the same app, a supported and straightforward use case.

- Give each instance its own mount, state, DOM IDs, focus targets, and subscription lifetime.
- Establish conventions for browser storage, keyboard shortcuts, and URL routing when instances share a page.
- The current site experiments with `main(mount)` and mount-scoped behavior. Treat this as evidence for the eventual framework design, not a settled public API.

## 3. Distribution and framework-independent integration

Make Glimlit easy to obtain and use in any framework, including but not limited to Astro.

- Decide how the runtime, Gleam modules, JavaScript views, and generated output should be packaged and consumed.
- Make installation, compilation, imports, and app mounting clear and minimal.
- Keep the basic integration independent of a particular host framework; add framework-specific conveniences only where useful.
- The site now uses a local Astro renderer for every app, through small JavaScript adapters and `main(root)`. Astro schedules loading and the renderer registers app cleanup. Compilation still runs separately; direct Gleam imports and packaging remain open questions. Server rendering has been demonstrated for the postcard and code tabs, as described below.

## 4. Server rendering and hydration findings — 28 October 2026

The postcard experiment demonstrates initial HTML from the same lit-html template used for browser updates, followed by hydration when Astro's `client:visible` directive starts the island. It avoids maintaining duplicate app markup in Astro.

### What changed locally

- The copies of the apps and runtime under this Astro project's `src/glimlit_apps/` have changed. Earlier work introduced `main(root)`, mount-scoped views and effects, scoped IDs and keyboard listeners, and per-instance storage/routing conventions.
- The postcard's `view.mjs` now exports `template(model, dispatch, rootId)`. Its view function hydrates the existing HTML on the first render when the root has `data-glimlit-ssr`; subsequent renders use ordinary lit-html `render()`.
- The postcard adapter supplies an optional initial-template callback to `defineApp`. The server renderer calls `init()` through that callback, uses the model to render the template, and does not execute the returned effects.
- The client still starts the app through its existing `main(root)` entry point. Hydration happens during the first view with the real dispatcher, before the runtime performs effects. This experiment required no further runtime changes.
- The original repository at `/Users/bradleymehder/Developer/Gleam/glimlit` remains untouched. “Original repository unchanged” does **not** mean the copies in this Astro project are unchanged.

### Requirements and rough edges

- Server and browser must use matching initial models, template structure, and root IDs. Browser-only state such as saved designs should load through effects after hydration.
- Server-assigned IDs are retained in the browser and use a separate `-ssr-` prefix to avoid collisions with client-only mounts. Instance numbering for browser storage still follows document order. These are local conventions to revisit for a public API.
- Lit's `@lit-labs/ssr` and `@lit-labs/ssr-client` provide rendering and hydration, but are experimental dependencies.
- Native form controls need care. The postcard uses a boolean `?checked` binding for its checkbox. Lit SSR does not serialize a textarea's `.value` into its text contents, so the template supplies `data-ssr-value` and the server copies that escaped value into the initial textarea contents. This bridge is a prototype workaround, not a settled general solution.
- The postcard and homepage code tabs opt into server rendering. Other apps retain empty server mounts and browser rendering. The homepage retains its reserved space; the user has commented out the entrance-animation CSS.
- Server rendering improves initial visibility and loading-related layout stability; it does not eliminate the JavaScript needed for interaction. Controls become functional after hydration. Preserving edits made before hydration needs further investigation.

### What is reusable beyond Astro

Separating templates from DOM rendering, producing HTML from the initial model, and hydrating before effects run are framework-independent ideas. Astro supplies renderer registration, loading directives, page rendering, and the unmount event. Other hosts would need equivalent lifecycle wiring.

A future Glimlit API could make initial templates, mounting/hydration, instance identity, and cleanup explicit so each host integration stays small. The experiments prove feasibility for the postcard and code tabs; general compatibility and a reusable distribution API remain unproven.

### Verification performed

- Confirmed the postcard's initial UI, title, message, and unchecked shortcut control appear with scripts removed.
- Confirmed the server-rendered island waits below the viewport, then hydrates after scrolling into view, retaining Lit's server markers without hydration errors.
- Checked title/message editing, theme changes, and saving after hydration.
- Added regression coverage for server output, per-page IDs, initial form values, and escaped textarea text. All 54 tests, Astro checks, and the production build passed at this stage.

The original Glimlit repository remains the reference. Further framework/API work belongs there as a separate task.

### Code-tabs extension

- Applied the same shared-template/first-view hydration approach to `src/glimlit_apps/code_tabs/view.mjs` and `src/islands/CodeTabs.mjs`. No runtime or Gleam model/update changes were needed for this extension.
- The shared template includes all three highlighted examples, tab/panel IDs, selected state, and hidden panels. Browser hydration must retain the server HTML generated through `unsafeHTML` as well as attach click/keyboard handlers.
- Highlighting still runs when the view module loads on either side. SSR alone does not remove Shiki from the browser bundle; build-time-only highlighting is a separate potential optimization.

- Code-tabs verification: production HTML includes all three highlighted examples, one selected tab and two hidden panels. Browser clicks and arrow-key navigation work after hydration with no hydration errors. The animation CSS was already commented out and was left unchanged.

## 5. Initialization data supplied by the host

The current local app entry points call `init()` without input. The Astro integration currently forwards only `class` to the mount; it does not pass application data into Glimlit. Supporting apps initialized from host-provided data is another general framework requirement to investigate, independent of Astro.

Distinguish two cases:

- **Data available to the host before startup:** allow the host to supply initialization data, such as a postcard design loaded by an Astro page. Conceptually this could feed an `init(design)` function. The public entry-point signature and compatibility approach remain undecided.
- **Data fetched after startup:** initialize a loading model and request data through effects. This fits the existing model/update/effect architecture and does not require host props.

Possible Astro usage, not implemented:

```astro
---
const postcard = await getPostcard()
---

<Postcard client:visible design={postcard} />
```

Design considerations for Glimlit and host adapters:

- Define a clear boundary for decoding and validating JavaScript/serialized data into Gleam values. Do not assume a plain JavaScript object is interchangeable with a generated Gleam custom type.
- Preserve simple startup for apps with no initialization data. Input-aware initialization should be optional, with an explicit compatibility plan for existing apps.
- For server rendering and hydration, use the same initial input and resulting model on both sides. The host must transfer the relevant data to the browser using a supported, safe serialization mechanism. In Astro, component props provide a potential transport, subject to Astro's serialization constraints.
- Do not refetch potentially changed data before hydration and silently produce a different initial view. Fetch or refresh through effects after hydration when appropriate.
- If `init` uses nondeterministic values such as time or random IDs, transferring only input may not be sufficient. Decide whether to transfer a normalized initialization snapshot or require deterministic initialization.
- Keep server rendering free of browser effects, and start browser effects/subscriptions after the initial view has hydrated.
- Treat updates to host props after startup as a separate feature: decide whether they become messages, trigger another explicit operation, or are unsupported. Do not silently restart the app and discard user state.

No initialization-data support has been implemented or verified in this experiment. This is a design finding for future work in the original Glimlit project.


### Migration verification

- Glimlit: 65 app/runtime tests, type checks, all six tutorial checkpoints,
  production build, and browser checks pass.
- Astro: repeated apps have been exercised through its actual renderer in a
  production-build fixture. The first Postcard waits for visibility while the
  second starts first; hydration retains the first input node and initial text.
  Root IDs remain unique. Counter also works through `client:only`.
- Editing and saved designs remain separate; shortcuts and unmount cleanup affect
  only their own Postcard. Repeated Todos have separate storage/focus. Repeated
  Recipes keep their route namespaces. Homepage tab keyboard navigation works
  after hydration, without hydration errors.
- Runtime files were compared mechanically with Glimlit; all match except the
  Gleam import prefix. Existing Astro textarea and persistence workarounds remain
  outside the runtime. A temporary validation page was removed after testing.


### Runtime organization follow-up

Startup and the internal loop have been consolidated into `mvu.gleam`. The tiny
mutable-reference operations moved into `runner.mjs`, removing `loop.gleam` and
`browser.mjs`. The runtime now has eight source files. `start_loop` is an internal
entry used by startup and the DOM-independent loop tests; apps continue to use
`mvu.start(init(), update, view, root)`. Rendering, instance identity, server HTML,
and subscription lifetimes retain their boundaries. Astro mirrors the same
runtime organization with only Gleam import namespaces adjusted.
