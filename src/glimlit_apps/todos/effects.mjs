// @ts-check

import { storageKey } from '../runtime/browser.mjs'
import { newTodoKey } from './subscriptions.mjs'
import {
  Msg$UserPressedNewTodoShortcut,
  Msg$KeyboardShortcutsStarted,
  Msg$KeyboardShortcutsFailed,
  Msg$LocalStorageReturnedTodos,
  Msg$LocalStorageHadNoTodos,
  Msg$LocalStorageSavedTodos,
  Msg$LocalStorageFailed,
} from './todos.mjs'

/** @typedef {import('./todos.mjs').Msg$} Msg */

const key = 'mvu-lit.todos.v1'

/** @returns {import('../runtime/runner.mjs').Effect<string | null, Msg>} */
export function loadTodos() {
  return {
    perform: ({ root }) => localStorage.getItem(storageKey(key, root)),
    onSuccess: (saved) =>
      saved === null
        ? Msg$LocalStorageHadNoTodos()
        : Msg$LocalStorageReturnedTodos(saved),
    onFailure: () => Msg$LocalStorageFailed('Browser storage is unavailable.'),
  }
}

/** @param {string} json @returns {import('../runtime/runner.mjs').Effect<void, Msg>} */
export function saveTodos(json) {
  return {
    perform: ({ root }) => localStorage.setItem(storageKey(key, root), json),
    onSuccess: () => Msg$LocalStorageSavedTodos(),
    onFailure: () => Msg$LocalStorageFailed('Browser storage is unavailable.'),
  }
}

/** @param {string} message @returns {import('../runtime/runner.mjs').Effect<void, Msg>} */
export function log(message) {
  return {
    perform: () => console.log(message),
  }
}

/** @returns {import('../runtime/runner.mjs').Effect<void, Msg>} */
export function watchShortcuts() {
  return {
    perform: ({ subscriptions, root }) =>
      subscriptions.start(
        'todo-keyboard',
        newTodoKey(Msg$UserPressedNewTodoShortcut, root),
      ),
    onSuccess: Msg$KeyboardShortcutsStarted,
    onFailure: () =>
      Msg$KeyboardShortcutsFailed('Could not listen for key presses.'),
  }
}

/** @returns {import('../runtime/runner.mjs').Effect<void, Msg>} */
export function focusNewTodo() {
  return {
    perform: ({ root }) =>
      (root
        ? /** @type {HTMLElement | null} */ (
            root.querySelector('input[name="new-todo"]')
          )
        : document.getElementById('new-todo')
      )?.focus(),
  }
}
