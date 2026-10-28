// @ts-check

import { html, nothing } from 'lit-html'
import { live } from 'lit-html/directives/live.js'
import { repeat } from 'lit-html/directives/repeat.js'
import { from_list } from '#gleam/array'
import { routePath } from './subscriptions.mjs'
import {
  // Model queries
  screen,
  can_import,
  saving_message,
  can_retry_save,
  visible_recipes,

  // Screen selection
  Screen$isScreenLoading,
  Screen$isScreenRecovery,
  Screen$isScreenCollection,
  Screen$isScreenNew,
  Screen$isScreenDetail,
  Screen$isScreenEdit,
  Screen$isScreenNotFound,
  Screen$ScreenRecovery$0,
  Screen$ScreenNew$0,
  Screen$ScreenDetail$0,
  Screen$ScreenEdit$0,
  Screen$ScreenEdit$1,

  // Application state
  RecipeFilter$isFavoritesOnly,
  SampleImportState$isImportInProgress,
  Model$Model$sample_import,
  Model$Model$notice,
  Model$Model$query,
  Model$Model$filter,

  // Recipe data
  Recipe$Recipe$id,
  Recipe$Recipe$title,
  Recipe$Recipe$description,
  Recipe$Recipe$minutes,
  Recipe$Recipe$favorite,
  Recipe$Recipe$ingredients,
  Recipe$Recipe$instructions,

  // Editor fields
  Editor$Editor$title,
  Editor$Editor$description,
  Editor$Editor$minutes,
  Editor$Editor$ingredients,
  Editor$Editor$instructions,
  Editor$Editor$errors,

  // Messages
  Msg$UserClickedRetryLoad,
  Msg$UserClickedUseStarters,
  Msg$UserClickedRetrySave,
  Msg$UserClickedImportSamples,
  Msg$UserCancelledImport,
  Msg$UserSubmittedRecipe,
  Msg$UserChangedQuery,
  Msg$UserToggledFavorites,
  Msg$UserToggledFavorite,
  Msg$UserConfirmedDelete,
  Msg$UserChangedTitle,
  Msg$UserChangedDescription,
  Msg$UserChangedMinutes,
  Msg$UserChangedIngredients,
  Msg$UserChangedInstructions,
} from './recipes.mjs'

/** @typedef {import('./recipes.mjs').Model$} Model */
/** @typedef {import('./recipes.mjs').Recipe$} Recipe */
/** @typedef {import('./recipes.mjs').Editor$} Editor */
/** @typedef {import('./recipes.mjs').Screen$} Screen */
/** @typedef {(msg: import('./recipes.mjs').Msg$) => void} Dispatch */

// -- Page and screen selection -------------------------------------------

/** @param {Model} model @param {Dispatch} dispatch @param {import('../runtime/instance.mjs').InstanceContext} context */
export function view(model, dispatch, context) {
  const { root, id } = context
  /** @param {string} hash */
  const route = (hash) => routePath(hash, root)

  return html`
      ${saveStatus(model, dispatch)}
      ${renderScreen(screen(model), model, dispatch)}
      ${can_import(model) ? sampleImport(model, dispatch) : nothing}
    `

  /** @param {Screen} screen @param {Model} model @param {Dispatch} dispatch */
  function renderScreen(screen, model, dispatch) {
    if (Screen$isScreenLoading(screen)) {
      return html`<p
        class="rounded-xl border border-dashed border-slate-700 p-7 text-slate-300 [&_h2]:text-2xl [&_h3]:text-xl [&_p]:mt-3 [&_a]:mt-5"
        role="status"
      >
        Opening your recipe box…
      </p>`
    }
    if (Screen$isScreenRecovery(screen))
      return storageRecovery(Screen$ScreenRecovery$0(screen), dispatch)
    if (Screen$isScreenCollection(screen)) return collection(model, dispatch)
    if (Screen$isScreenNew(screen))
      return editorView(Screen$ScreenNew$0(screen), dispatch, false, '#/')
    if (Screen$isScreenDetail(screen))
      return detail(Screen$ScreenDetail$0(screen), dispatch)
    if (Screen$isScreenEdit(screen)) {
      return editorView(
        Screen$ScreenEdit$0(screen),
        dispatch,
        true,
        Screen$ScreenEdit$1(screen),
      )
    }
    if (Screen$isScreenNotFound(screen)) {
      return html`
        <section
          class="rounded-xl border border-dashed border-slate-700 p-7 text-slate-300 [&_h2]:text-2xl [&_h3]:text-xl [&_p]:mt-3 [&_a]:mt-5"
        >
          <h2>That recipe isn’t here.</h2>
          <p>It may have been removed, or the address may be incomplete.</p>
          <a
            class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-200"
            href=${route('#/')}
            >Back to collection</a
          >
        </section>
      `
    }
    throw new Error('Unknown recipe screen')
  }

  // -- Collection ----------------------------------------------------------

  /** @param {Model} model @param {Dispatch} dispatch */
  function collection(model, dispatch) {
    /** @param {Event} event */
    const handleQueryInput = (event) =>
      dispatch(Msg$UserChangedQuery(inputValue(event)))
    const handleToggleFavorites = () => dispatch(Msg$UserToggledFavorites())
    const query = Model$Model$query(model)
    const favoritesOnly = RecipeFilter$isFavoritesOnly(
      Model$Model$filter(model),
    )
    const recipes = /** @type {Recipe[]} */ (from_list(visible_recipes(model)))
    const filtered = Boolean(query || favoritesOnly)
    const cards = repeat(
      recipes,
      (recipe) => Recipe$Recipe$id(recipe),
      (recipe) => recipeCard(recipe, dispatch),
    )

    return html`
      <section aria-labelledby=${id('collection-title')}>
        <div
          class="flex flex-wrap items-center justify-between gap-5 [&_h2]:mt-2 [&_h2]:text-3xl [&_h2]:font-semibold"
        >
          <div>
            <p
              class="text-xs font-medium uppercase tracking-widest text-teal-200"
            >
              Good food, kept close
            </p>
            <h2 id=${id('collection-title')}>Your collection</h2>
          </div>
          <a
            class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-200"
            href=${route('#/new')}
            >＋ Add a recipe</a
          >
        </div>
        <div class="mt-6 flex flex-wrap items-end gap-4">
          <label class="min-w-0 flex-1 basis-56 text-sm text-slate-300"
            >Search recipes
            <input
              class="mt-2 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-teal-200 focus:outline-none"
              type="search"
              placeholder="Try lemon, pasta, or an ingredient…"
              .value=${live(query)}
              @input=${handleQueryInput}
            />
          </label>
          <button
            class="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 aria-pressed:border-teal-200 aria-pressed:bg-teal-200/15 aria-pressed:text-teal-200 focus-visible:outline-2 focus-visible:outline-teal-200"
            type="button"
            aria-pressed=${String(favoritesOnly)}
            @click=${handleToggleFavorites}
          >
            ${favoritesOnly ? '★' : '☆'} Favourites
          </button>
        </div>
        <p class="my-5 text-sm text-slate-400" role="status">
          ${recipes.length}
          ${recipes.length === 1 ? 'recipe' : 'recipes'}${
            favoritesOnly ? ' in favourites' : ''
          }
        </p>
        ${
          recipes.length
            ? html`
                <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  ${cards}
                </div>
              `
            : emptyCollection(filtered)
        }
      </section>
    `
  }

  /** @param {Recipe} recipe @param {Dispatch} dispatch */
  function recipeCard(recipe, dispatch) {
    const handleToggleFavorite = () =>
      dispatch(Msg$UserToggledFavorite(Recipe$Recipe$id(recipe)))
    const title = Recipe$Recipe$title(recipe)
    const isFavorite = Recipe$Recipe$favorite(recipe)
    const address = route(`#/recipe/${Recipe$Recipe$id(recipe)}`)
    const favoriteLabel = isFavorite
      ? `Remove ${title} from favourites`
      : `Add ${title} to favourites`

    return html`
      <article
        class="flex min-w-0 flex-col rounded-xl border border-slate-700 bg-slate-900 p-5 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:wrap-anywhere [&_p]:mt-3 [&_p]:grow [&_p]:text-slate-400"
      >
        <div
          class="flex items-center justify-between gap-4 text-sm text-slate-400"
        >
          <span>${Recipe$Recipe$minutes(recipe)} min</span>
          <button
            type="button"
            class="size-10 cursor-pointer rounded-lg text-xl text-teal-200 hover:bg-slate-800"
            aria-label=${favoriteLabel}
            aria-pressed=${String(isFavorite)}
            @click=${handleToggleFavorite}
          >
            ${isFavorite ? '★' : '☆'}
          </button>
        </div>
        <h3><a href=${address}>${title}</a></h3>
        <p>${Recipe$Recipe$description(recipe)}</p>
        <a class="mt-6 text-sm text-teal-200 hover:underline" href=${address}>
          Open recipe <span aria-hidden="true">↗</span>
          <span class="sr-only">: ${title}</span>
        </a>
      </article>
    `
  }

  /** @param {boolean} filtered */
  function emptyCollection(filtered) {
    const heading = filtered
      ? 'No recipes match yet.'
      : 'A fresh page for good food.'
    const message = filtered
      ? 'Try another search or turn off the favourites filter.'
      : 'Add your first recipe, or import the samples below.'

    return html`<div
      class="rounded-xl border border-dashed border-slate-700 p-7 text-slate-300 [&_h2]:text-2xl [&_h3]:text-xl [&_p]:mt-3 [&_a]:mt-5"
    >
      <h3>${heading}</h3>
      <p>${message}</p>
    </div>`
  }

  // -- Recipe details ------------------------------------------------------

  /** @param {Recipe} recipe @param {Dispatch} dispatch */
  function detail(recipe, dispatch) {
    const title = Recipe$Recipe$title(recipe)
    const isFavorite = Recipe$Recipe$favorite(recipe)
    const editPath = route(`#/recipe/${Recipe$Recipe$id(recipe)}/edit`)
    const handleToggleFavorite = () =>
      dispatch(Msg$UserToggledFavorite(Recipe$Recipe$id(recipe)))
    const handleRemoveRecipe = () => {
      if (window.confirm(`Remove “${title}” from your collection?`)) {
        dispatch(Msg$UserConfirmedDelete(Recipe$Recipe$id(recipe)))
      }
    }
    const ingredients = nonEmptyLines(Recipe$Recipe$ingredients(recipe)).map(
      (line) => html`<li>${line}</li>`,
    )
    const instructions = nonEmptyLines(Recipe$Recipe$instructions(recipe)).map(
      (line) => html`<li>${line}</li>`,
    )

    return html`
      <article
        class="rounded-xl border border-slate-700 bg-slate-900 p-5 sm:p-8 [&>h2]:mt-4 [&>h2]:text-3xl [&>h2]:font-semibold [&>h2]:wrap-anywhere [&>p]:mt-4"
      >
        <a
          class="inline-block text-sm text-teal-200 hover:underline"
          href=${route('#/')}
          >← Back to collection</a
        >
        <p class="text-xs font-medium uppercase tracking-widest text-teal-200">
          ${Recipe$Recipe$minutes(recipe)} minutes · From your recipe box
        </p>
        <h2>${title}</h2>
        <p class="mt-3 leading-relaxed text-slate-300">
          ${Recipe$Recipe$description(recipe)}
        </p>
        <div class="my-6 flex flex-wrap items-center gap-3">
          <a
            class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-200"
            href=${editPath}
            >Edit recipe</a
          >
          <button
            class="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 aria-pressed:border-teal-200 aria-pressed:bg-teal-200/15 aria-pressed:text-teal-200 focus-visible:outline-2 focus-visible:outline-teal-200"
            type="button"
            aria-pressed=${String(isFavorite)}
            @click=${handleToggleFavorite}
          >
            ${isFavorite ? '★ In favourites' : '☆ Add to favourites'}
          </button>
        </div>
        <div
          class="mt-8 grid gap-8 sm:grid-cols-2 [&_h3]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:mb-3 [&_li]:leading-relaxed [&_li]:wrap-anywhere"
        >
          <section>
            <h3>Ingredients</h3>
            <ul>
              ${ingredients}
            </ul>
          </section>
          <section>
            <h3>Make it</h3>
            <ol>
              ${instructions}
            </ol>
          </section>
        </div>
        <div class="mt-10 border-t border-slate-700 pt-6">
          <button
            class="cursor-pointer text-sm text-rose-300 hover:underline"
            type="button"
            @click=${handleRemoveRecipe}
          >
            Remove recipe
          </button>
        </div>
      </article>
    `
  }

  // -- Editor --------------------------------------------------------------

  /**
   * @param {Editor} model
   * @param {Dispatch} dispatch
   * @param {boolean} editing
   * @param {string} cancelPath
   */
  function editorView(model, dispatch, editing, cancelPath) {
    /** @param {SubmitEvent} event */
    const handleSubmit = (event) => {
      event.preventDefault()
      dispatch(Msg$UserSubmittedRecipe())
    }
    /** @param {Event} event */
    const handleTitleInput = (event) =>
      dispatch(Msg$UserChangedTitle(inputValue(event)))
    /** @param {Event} event */
    const handleDescriptionInput = (event) =>
      dispatch(Msg$UserChangedDescription(inputValue(event)))
    /** @param {Event} event */
    const handleMinutesInput = (event) =>
      dispatch(Msg$UserChangedMinutes(inputValue(event)))
    /** @param {Event} event */
    const handleIngredientsInput = (event) =>
      dispatch(Msg$UserChangedIngredients(inputValue(event)))
    /** @param {Event} event */
    const handleInstructionsInput = (event) =>
      dispatch(Msg$UserChangedInstructions(inputValue(event)))
    const errors = /** @type {string[]} */ (
      from_list(Editor$Editor$errors(model))
    )

    return html`
      <section
        class="max-w-3xl [&_h2]:mt-4 [&_h2]:text-3xl [&_h2]:font-semibold [&_form]:mt-6 [&_label]:mb-5 [&_label]:block [&_label]:text-sm [&_label]:text-slate-300"
        aria-labelledby=${id('editor-title')}
      >
        <a
          class="inline-block text-sm text-teal-200 hover:underline"
          href=${route(cancelPath)}
          >← Discard changes and go back</a
        >
        <p class="text-xs font-medium uppercase tracking-widest text-teal-200">
          Something worth making again
        </p>
        <h2 id=${id('editor-title')}>
          ${editing ? 'Edit your recipe' : 'A new favourite'}
        </h2>
        <p class="mt-3 leading-relaxed text-slate-300">
          A few ingredients. A little know-how. Keep it all here.
        </p>
        <form @submit=${handleSubmit}>
          ${errors.length ? errorSummary(errors) : nothing}
          <label
            >Recipe title
            <input
              class="mt-2 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-teal-200 focus:outline-none"
              required
              name="title"
              autocomplete="off"
              .value=${live(Editor$Editor$title(model))}
              @input=${handleTitleInput}
            />
          </label>
          <label
            >A short description
            <textarea
              class="mt-2 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-teal-200 focus:outline-none"
              name="description"
              rows="2"
              .value=${live(Editor$Editor$description(model))}
              @input=${handleDescriptionInput}
            ></textarea>
          </label>
          <label class="max-w-48"
            >Time in minutes
            <input
              class="mt-2 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-teal-200 focus:outline-none"
              required
              name="minutes"
              type="number"
              min="1"
              max="1440"
              step="1"
              .value=${live(Editor$Editor$minutes(model))}
              @input=${handleMinutesInput}
            />
          </label>
          <div class="grid gap-5 sm:grid-cols-2">
            <label
              >Ingredients
              <span class="mt-2 block text-xs leading-relaxed text-slate-400"
                >One ingredient per line.</span
              >
              <textarea
                class="mt-2 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-teal-200 focus:outline-none"
                required
                name="ingredients"
                rows="7"
                .value=${live(Editor$Editor$ingredients(model))}
                @input=${handleIngredientsInput}
              ></textarea>
            </label>
            <label
              >Instructions
              <span class="mt-2 block text-xs leading-relaxed text-slate-400"
                >One step per line.</span
              >
              <textarea
                class="mt-2 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-teal-200 focus:outline-none"
                required
                name="instructions"
                rows="7"
                .value=${live(Editor$Editor$instructions(model))}
                @input=${handleInstructionsInput}
              ></textarea>
            </label>
          </div>
          <div class="my-6 flex flex-wrap items-center gap-3">
            <button
              class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-200"
              type="submit"
            >
              ${editing ? 'Save changes' : 'Add to collection'}
            </button>
            <a
              class="inline-block text-sm text-teal-200 hover:underline"
              href=${route(cancelPath)}
              >Cancel</a
            >
          </div>
          <p class="mt-2 block text-xs leading-relaxed text-slate-400">
            Submitting keeps this recipe in your collection and saves it in this
            browser. Leaving this form discards unsubmitted edits.
          </p>
        </form>
      </section>
    `
  }

  /** @param {string[]} errors */
  function errorSummary(errors) {
    return html`
      <div
        class="mb-6 rounded-lg border border-rose-400 bg-rose-400/10 p-4 text-rose-200 [&_h3]:font-semibold [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
        id=${id('recipe-errors')}
        data-recipe-errors
        role="alert"
        tabindex="-1"
      >
        <h3>Check your recipe</h3>
        <ul>
          ${errors.map((error) => html`<li>${error}</li>`)}
        </ul>
      </div>
    `
  }

  // -- Storage and sample imports ------------------------------------------

  /** @param {string} reason @param {Dispatch} dispatch */
  function storageRecovery(reason, dispatch) {
    const handleRetryLoad = () => dispatch(Msg$UserClickedRetryLoad())
    const handleUseStarters = () => dispatch(Msg$UserClickedUseStarters())

    return html`
      <section
        class="rounded-xl border border-dashed border-slate-700 p-7 text-slate-300 [&_h2]:text-2xl [&_h3]:text-xl [&_p]:mt-3 [&_a]:mt-5"
      >
        <h2>Your saved collection needs attention.</h2>
        <p role="alert">${reason}</p>
        <div class="my-6 flex flex-wrap items-center gap-3">
          <button
            class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-200"
            @click=${handleRetryLoad}
          >
            Try loading again
          </button>
          <button
            class="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 aria-pressed:border-teal-200 aria-pressed:bg-teal-200/15 aria-pressed:text-teal-200 focus-visible:outline-2 focus-visible:outline-teal-200"
            @click=${handleUseStarters}
          >
            Replace with starter recipes
          </button>
        </div>
        <p class="mt-2 block text-xs leading-relaxed text-slate-400">
          Replacing starts a new collection and attempts to save it over the old
          data. Nothing is replaced until you choose this.
        </p>
      </section>
    `
  }

  /** @param {Model} model @param {Dispatch} dispatch */
  function saveStatus(model, dispatch) {
    const handleRetrySave = () => dispatch(Msg$UserClickedRetrySave())

    return html`
      <div
        class="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-400 [&_button]:text-teal-200 [&_button]:underline"
        role="status"
      >
        ${saving_message(model)}
        ${
          can_retry_save(model)
            ? html`<button @click=${handleRetrySave}>Retry saving</button>`
            : nothing
        }
      </div>
    `
  }

  /** @param {Model} model @param {Dispatch} dispatch */
  function sampleImport(model, dispatch) {
    const handleImport = () => dispatch(Msg$UserClickedImportSamples())
    const handleCancelImport = () => dispatch(Msg$UserCancelledImport())
    const isImporting = SampleImportState$isImportInProgress(
      Model$Model$sample_import(model),
    )
    const label = isImporting
      ? 'Restart sample import'
      : 'Import sample recipes'

    return html`
      <aside
        class="mt-10 flex flex-wrap items-center justify-between gap-6 rounded-xl border border-slate-700 p-6 [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_p]:mt-3"
        aria-labelledby=${id('samples-title')}
      >
        <div>
          <p
            class="text-xs font-medium uppercase tracking-widest text-teal-200"
          >
            A little inspiration
          </p>
          <h2 id=${id('samples-title')}>Make room for something new.</h2>
          <p>
            Import two more recipes into your collection. Recipes with matching
            titles are kept.
          </p>
          <p class="text-sm text-teal-200" role="status">
            ${Model$Model$notice(model)}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 aria-pressed:border-teal-200 aria-pressed:bg-teal-200/15 aria-pressed:text-teal-200 focus-visible:outline-2 focus-visible:outline-teal-200"
            aria-busy=${String(isImporting)}
            @click=${handleImport}
          >
            ${label}
          </button>
          ${
            isImporting
              ? html`
                  <button
                    type="button"
                    class="inline-block text-sm text-teal-200 hover:underline"
                    @click=${handleCancelImport}
                  >
                    Cancel import
                  </button>
                `
              : nothing
          }
        </div>
      </aside>
    `
  }

  // -- DOM helpers ---------------------------------------------------------

  /** @param {Event} event */
  function inputValue(event) {
    const target = event.currentTarget

    return target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
      ? target.value
      : ''
  }

  /** @param {string} text */
  function nonEmptyLines(text) {
    return text.split('\n').filter((line) => line.trim())
  }
}
