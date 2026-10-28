// @ts-nocheck

import { html, render } from 'lit-html'
import { live } from 'lit-html/directives/live.js'
import {
  Model$Model$title,
  Model$Model$message,
  Msg$UserChangedTitle,
  Msg$UserChangedMessage,
  Theme$Coral,
  Theme$Ocean,
  Theme$Meadow,
  Msg$UserSelectedTheme,
  Model$Model$theme,
  Theme$isCoral,
  Theme$isOcean,
  Theme$isMeadow,
  Msg$UserClickedSave,
  Model$Model$notice,
  Notice$isUnsaved,
  Notice$isSaving,
  Notice$isSaved,
  Notice$isSaveFailed,
  Notice$isRestoreFailed,
  Notice$isNoSavedDesign,
  Notice$isRestored,
  Notice$isInvalidSavedDesign,
  Notice$isShortcutSetupFailed,
  Msg$UserClickedRestore,
  Msg$UserToggledShortcuts,
  Model$Model$shortcuts,
} from './postcard.mjs'

export function view(model, dispatch, root) {
  const id = (name) => `${root.id}-${name}`
  const app = root
  if (!app) throw new Error('Missing #postcard-app mount element')

  const handleTitleInput = (event) =>
    dispatch(Msg$UserChangedTitle(event.currentTarget.value))
  const handleMessageInput = (event) =>
    dispatch(Msg$UserChangedMessage(event.currentTarget.value))
  const handleSaveClick = () => dispatch(Msg$UserClickedSave())
  const handleRestoreClick = () => dispatch(Msg$UserClickedRestore())
  const handleShortcutsChange = () => dispatch(Msg$UserToggledShortcuts())

  function themeButton(label, value) {
    const handleThemeClick = () => dispatch(Msg$UserSelectedTheme(value))

    return html` <button
      type="button"
      class="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 aria-pressed:border-teal-200 aria-pressed:bg-teal-200/15 aria-pressed:text-teal-200 focus-visible:outline-2 focus-visible:outline-teal-200"
      aria-pressed=${themeName(Model$Model$theme(model)) === themeName(value)}
      @click=${handleThemeClick}
    >
      ${label}
    </button>`
  }

  render(
    html`
      <div
        class="grid overflow-hidden rounded-xl border border-slate-700 bg-slate-900 md:grid-cols-2"
      >
        <div
          class="min-w-0 space-y-4 p-5 sm:p-8 [&_label]:block [&_label]:text-sm [&_label]:font-medium [&_fieldset]:mt-5 [&_legend]:mb-3 [&_legend]:text-sm"
        >
          <label for=${id('postcard-title')}>A title for your postcard</label>
          <input
            class="mt-2 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-teal-200 focus:outline-none"
            id=${id('postcard-title')}
            maxlength="80"
            .value=${live(Model$Model$title(model))}
            @input=${handleTitleInput}
          />
          <label for=${id('postcard-message')}>Your message</label>
          <textarea
            class="mt-2 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-teal-200 focus:outline-none"
            id=${id('postcard-message')}
            rows="4"
            maxlength="400"
            .value=${live(Model$Model$message(model))}
            @input=${handleMessageInput}
          ></textarea>
          <fieldset>
            <legend>Choose a colour</legend>
            <div class="flex flex-wrap gap-2">
              ${themeButton('Coral', Theme$Coral())}
              ${themeButton('Ocean', Theme$Ocean())}
              ${themeButton('Meadow', Theme$Meadow())}
            </div>
          </fieldset>
          <div
            class="flex flex-wrap gap-3 [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:bg-teal-200 [&_button]:px-4 [&_button]:py-2.5 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-slate-950"
          >
            <button type="button" @click=${handleSaveClick}>Save design</button>
            <button
              type="button"
              class="border border-slate-500"
              @click=${handleRestoreClick}
            >
              Restore saved
            </button>
          </div>
          <p class="text-sm text-teal-200" role="status">
            ${noticeText(Model$Model$notice(model))}
          </p>
          <label
            class="flex! items-center gap-3"
            for=${id('postcard-shortcuts')}
          >
            <input
              class="size-4 shrink-0 accent-teal-200"
              id=${id('postcard-shortcuts')}
              type="checkbox"
              .checked=${Model$Model$shortcuts(model)}
              @change=${handleShortcutsChange}
            />
            Enable keyboard shortcuts
          </label>
          <p class="text-xs leading-relaxed text-slate-400">
            Press N while this demo is focused, outside an input, to cycle colours. Turn shortcuts off
            to remove the listener.
          </p>
        </div>
        <div class="min-w-0 bg-slate-800 p-5 sm:p-8">
          <p class="mb-4 text-xs uppercase tracking-widest text-slate-400">
            Live preview
          </p>
          <article
            class="flex min-h-96 flex-col rounded-lg p-6 shadow-xl sm:p-8 [&_h3]:mt-8 [&_h3]:font-serif [&_h3]:text-4xl [&_h3]:wrap-anywhere ${themeClasses(Model$Model$theme(model))}"
            aria-label="Your postcard preview"
          >
            <div
              class="flex items-center justify-between gap-4 text-xs uppercase tracking-widest"
            >
              <span>A note from me to you</span
              ><span class="text-4xl" aria-hidden="true">✳︎</span>
            </div>
            <h3>${Model$Model$title(model)}</h3>
            <p class="mt-5 whitespace-pre-wrap wrap-anywhere leading-relaxed">
              ${Model$Model$message(model)}
            </p>
            <div
              class="mt-auto flex items-center justify-between gap-3 border-t border-current/30 pt-5 text-xs uppercase tracking-widest"
            >
              <span>Somewhere nice</span><span aria-hidden="true">↗</span>
            </div>
          </article>
        </div>
      </div>
    `,
    app,
  )
}

function themeName(theme) {
  if (Theme$isCoral(theme)) return 'coral'
  if (Theme$isOcean(theme)) return 'ocean'
  if (Theme$isMeadow(theme)) return 'meadow'
  throw new Error('Unknown postcard theme')
}

function noticeText(notice) {
  if (Notice$isUnsaved(notice))
    return 'Your design stays in this tab until you save it.'
  if (Notice$isSaving(notice)) return 'Saving…'
  if (Notice$isSaved(notice)) return 'Saved in this browser.'
  if (Notice$isSaveFailed(notice))
    return 'Could not save. Browser storage may be unavailable.'
  if (Notice$isRestoreFailed(notice))
    return 'Could not restore. Browser storage may be unavailable.'
  if (Notice$isNoSavedDesign(notice))
    return 'No saved design yet. Save one first.'
  if (Notice$isRestored(notice)) return 'Restored your saved design.'
  if (Notice$isInvalidSavedDesign(notice))
    return 'The saved design could not be read.'
  if (Notice$isShortcutSetupFailed(notice))
    return 'Could not change keyboard shortcuts.'
  throw new Error('Unknown postcard notice')
}

function themeClasses(theme) {
  if (Theme$isCoral(theme)) return 'bg-rose-200 text-rose-950'
  if (Theme$isOcean(theme)) return 'bg-sky-200 text-sky-950'
  if (Theme$isMeadow(theme)) return 'bg-emerald-200 text-emerald-950'
  throw new Error('Unknown postcard theme')
}
