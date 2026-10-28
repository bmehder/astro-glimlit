// @ts-nocheck

import { html } from 'lit-html'
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js'
import { highlight } from '../../lib/highlight.mjs'
import {
  Tab$View,
  Tab$ModelAndUpdate,
  Tab$Effects,
  Navigation$Next,
  Navigation$Previous,
  Navigation$First,
  Navigation$Last,
  Msg$UserSelectedTab,
  Msg$UserNavigatedTab,
  Model$Model$selected,
  Tab$isView,
  Tab$isModelAndUpdate,
  Tab$isEffects,
} from './code_tabs.mjs'

// Illustrative examples from the original Glimlit homepage.

const viewSource =
  'html`\n  <h1>${Model$Model$title(model)}</h1>\n  <input\n    .value=${Model$Model$title(model)}\n    @input=${event => dispatch(\n      Msg$UserChangedTitle(event.currentTarget.value)\n    )}\n  >\n`'

const modelSource =
  'pub fn update(model, msg) {\n  case msg {\n    UserChangedTitle(title) -> #(\n      Model(..model, title: title), // next model\n      [saveTitle(title)], // requested work\n    )\n    TitleSaved -> #(model, [log("Title saved.")])\n    TitleSaveFailed ->\n      #(model, [log("Save failed.")])\n  }\n}'

const effectsSource =
  "const saveTitle = title => ({\n  perform: () => localStorage.setItem('title', title),\n  onSuccess: () => Msg$TitleSaved(),\n  onFailure: () => Msg$TitleSaveFailed(),\n})\n\nconst log = message => ({\n  perform: () => console.log(message),\n})"

// Highlight the fixed examples once, rather than on every tab selection.
const viewExample = highlight(viewSource, 'javascript')
const modelExample = highlight(modelSource, 'gleam')
const effectsExample = highlight(effectsSource, 'javascript')

export function view(model, dispatch, context) {
  const entries = [
    {
      tab: Tab$View(),
      id: context.id('view-tab'),
      matches: Tab$isView,
      label: 'View',
      file: 'view.mjs',
      panel: context.id('view-example'),
      source: viewExample,
    },
    {
      tab: Tab$ModelAndUpdate(),
      id: context.id('model-tab'),
      matches: Tab$isModelAndUpdate,
      label: 'Model & update',
      file: 'postcard.gleam',
      panel: context.id('model-example'),
      source: modelExample,
    },
    {
      tab: Tab$Effects(),
      id: context.id('effects-tab'),
      matches: Tab$isEffects,
      label: 'Effects',
      file: 'effects.mjs',
      panel: context.id('effects-example'),
      source: effectsExample,
    },
  ]

  function handleKeydown(event) {
    const direction = {
      ArrowRight: Navigation$Next,
      ArrowLeft: Navigation$Previous,
      Home: Navigation$First,
      End: Navigation$Last,
    }[event.key]

    if (!direction) return

    event.preventDefault()

    dispatch(Msg$UserNavigatedTab(direction()))
  }

  const currentTab = Model$Model$selected(model)

  return html`<section
    class="mx-auto min-w-0 max-w-2xl overflow-hidden rounded-[0.85rem] border border-slate-700 bg-[#0b1221] shadow-2xl origin-center motion-safe:animate-island-in sm:rotate-1 sm:[--island-tilt:1deg]"
    aria-labelledby=${context.id('heading')}
  >
    <div
      class="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2 text-[0.7rem] text-slate-400"
    >
      <span
        aria-hidden="true"
        class="text-[0.65rem] tracking-[0.2em] text-slate-600"
        >● ● ●</span
      >
      <h2 id=${context.id('heading')}>Two languages. One app.</h2>
    </div>
    <div
      class="grid grid-cols-3 gap-2 border-b border-slate-700 bg-slate-900 p-3"
      role="tablist"
      aria-label="Explore the view, model, and effects"
    >
      ${entries.map(({ tab, id, matches, label, file, panel }) => {
        const active = matches(currentTab)
        const handleSelectTab = () => dispatch(Msg$UserSelectedTab(tab))

        return html`<button
          id=${id}
          class="min-w-0 cursor-pointer rounded-md border border-slate-700 bg-[#172236] px-1.5 py-2.5 text-center text-xs font-semibold text-slate-300 hover:border-teal-300 hover:text-teal-300 aria-selected:border-teal-300 aria-selected:bg-teal-900 aria-selected:text-teal-200 focus-visible:outline-2 focus-visible:outline-teal-300 [&_span]:mt-1 [&_span]:block [&_span]:text-[0.62rem] [&_span]:font-normal"
          type="button"
          role="tab"
          aria-selected=${String(active)}
          aria-controls=${panel}
          tabindex=${active ? 0 : -1}
          @click=${handleSelectTab}
          @keydown=${handleKeydown}
        >
          ${label}<span>${file}</span>
        </button>`
      })}
    </div>
    ${entries.map(
      ({ id, panel, matches, source }) => html`
        <div
          id=${panel}
          role="tabpanel"
          aria-labelledby=${id}
          tabindex="0"
          class="focus-visible:outline-2 focus-visible:-outline-offset-3 focus-visible:outline-teal-300"
          ?hidden=${!matches(currentTab)}
        >
          <div
            class="min-h-60 max-h-96 overflow-auto text-xs leading-normal [&_pre]:bg-transparent! [&_pre]:p-4"
          >
            ${unsafeHTML(source)}
          </div>
        </div>
      `,
    )}
    <div
      class="border-y border-slate-800 bg-[#0c242b] px-4 py-1.5 text-[0.65rem] text-teal-300"
    >
      Model → view · effects → runner · messages → update
    </div>
    <p class="px-4 pt-3 pb-2 text-xs leading-relaxed text-slate-300">
      Return a pair: the next model and a list of effects. The runtime renders
      the model, then performs the work.
      <code class="text-teal-300">[]</code> means no work to run.
    </p>
    <p class="px-4 pb-4 text-[0.65rem] leading-relaxed text-slate-400">
      An illustration of the flow. Explore complete, runnable apps in the demos.
    </p>
  </section>`
}
