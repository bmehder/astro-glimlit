# Glimlit follow-ups

This Astro site is a proof of concept. Keep these questions for future work on Glimlit itself; do not expand the framework implementation in this project to solve them.

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
- The site now uses a local Astro renderer for every app, through small JavaScript adapters and `main(root)`. Astro schedules loading and the renderer registers app cleanup. Compilation still runs separately; server rendering, direct Gleam imports, and packaging remain open questions.

The original Glimlit repository remains the reference. Further framework/API work belongs there as a separate task.
