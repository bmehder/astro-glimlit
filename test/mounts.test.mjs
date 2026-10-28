import test from 'node:test'
import assert from 'node:assert/strict'
import { to_list } from '#gleam/array'
import { mount } from '../build/dev/javascript/glimlit/glimlit_apps/runtime/mvu.mjs'
import { createRuntime, run, stop } from '../src/glimlit_apps/runtime/runner.mjs'
import { saveTodos, loadTodos, focusNewTodo } from '../build/dev/javascript/glimlit/glimlit_apps/todos/effects.mjs'
import { hashRoute, routePath } from '../src/glimlit_apps/recipes/subscriptions.mjs'
import { newTodoKey } from '../src/glimlit_apps/todos/subscriptions.mjs'

const settle = () => new Promise(resolve => setImmediate(resolve))
const root = (app, instance) => ({ id: `${app}-app-${instance}`, dataset: { glimlitInstance: String(instance) } })

function replaceGlobal(t, name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name)
  Object.defineProperty(globalThis, name, { value, configurable: true })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, name, previous)
    else delete globalThis[name]
  })
}

test('mounted apps keep their DOM root, model, effect context, and cleanup separate', async t => {
  const firstRoot = root('counter', 1), secondRoot = root('counter', 2)
  const sent = new Map(), rendered = new Map(), contexts = [], cleaned = []
  const watch = { perform: ({ root, subscriptions }) => {
    contexts.push(root)
    subscriptions.start('same-key', { start: () => () => cleaned.push(root) })
  } }
  const update = (model, increment) => [model + increment, to_list([])]
  const view = (model, dispatch, root) => { rendered.set(root, model); sent.set(root, dispatch) }
  const firstStop = mount(firstRoot, [0, to_list([watch])], update, view)
  const secondStop = mount(secondRoot, [100, to_list([watch])], update, view)
  t.after(firstStop); t.after(secondStop)
  await settle()
  assert.deepEqual(contexts, [firstRoot, secondRoot])
  sent.get(firstRoot)(2)
  assert.equal(rendered.get(firstRoot), 2)
  assert.equal(rendered.get(secondRoot), 100)
  firstStop()
  sent.get(firstRoot)(50)
  sent.get(secondRoot)(3)
  assert.equal(rendered.get(firstRoot), 2)
  assert.equal(rendered.get(secondRoot), 103)
  assert.deepEqual(cleaned, [firstRoot])
})

test('repeated todos use separate storage and focus only their own input', async t => {
  const saved = new Map(), focused = []
  replaceGlobal(t, 'localStorage', { setItem: (key, value) => saved.set(key, value), getItem: key => saved.get(key) ?? null })
  const first = root('todos', 1), second = root('todos', 2)
  first.querySelector = () => ({ focus: () => focused.push('first') })
  second.querySelector = () => ({ focus: () => focused.push('second') })
  const firstRuntime = createRuntime(first), secondRuntime = createRuntime(second)
  t.after(() => stop(firstRuntime)); t.after(() => stop(secondRuntime))
  await run(saveTodos('first list'), () => {}, firstRuntime)
  await run(saveTodos('second list'), () => {}, secondRuntime)
  assert.equal(saved.get('mvu-lit.todos.v1'), 'first list')
  assert.equal(saved.get('mvu-lit.todos.v1.todos-app-2'), 'second list')
  const restored = []
  const effect = { ...loadTodos(), onSuccess: value => value }
  await run(effect, value => restored.push(value), firstRuntime)
  await run(effect, value => restored.push(value), secondRuntime)
  assert.deepEqual(restored, ['first list', 'second list'])
  await run(focusNewTodo(), () => {}, secondRuntime)
  assert.deepEqual(focused, ['second'])
})

test('recipe route namespaces update only the matching instance and preserve document anchors', t => {
  const listeners = new Set(), firstMessages = [], secondMessages = []
  replaceGlobal(t, 'window', {
    location: { hash: '#/recipe/1' },
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  })
  const first = root('recipes', 1), second = root('recipes', 2)
  const stopFirst = hashRoute(hash => hash, first).start(hash => firstMessages.push(hash))
  const stopSecond = hashRoute(hash => hash, second).start(hash => secondMessages.push(hash))
  t.after(stopFirst); t.after(stopSecond)
  assert.deepEqual(firstMessages, ['#/recipe/1'])
  assert.deepEqual(secondMessages, [])
  const secondPath = routePath('#/new', second)
  assert.equal(secondPath, '#recipes-app-2/new')
  window.location.hash = secondPath
  for (const listener of listeners) listener()
  assert.deepEqual(firstMessages, ['#/recipe/1'])
  assert.deepEqual(secondMessages, ['#/new'])
  window.location.hash = '#main'
  for (const listener of listeners) listener()
  assert.equal(firstMessages.length, 1)
  assert.equal(secondMessages.length, 1)
  stopFirst()
  assert.equal(listeners.size, 1)
})

test('keyboard shortcuts attach to each island rather than competing on window', t => {
  class Element {
    constructor() { this.listeners = new Map() }
    matches() { return false }
    closest() { return null }
    addEventListener(type, listener) { this.listeners.set(type, listener) }
    removeEventListener(type) { this.listeners.delete(type) }
  }
  replaceGlobal(t, 'HTMLElement', Element)
  const first = new Element(), second = new Element(), messages = []
  const firstStop = newTodoKey(() => 'first', first).start(value => messages.push(value))
  const secondStop = newTodoKey(() => 'second', second).start(value => messages.push(value))
  t.after(firstStop); t.after(secondStop)
  second.listeners.get('keydown')({ key: 'n', target: second, preventDefault() {} })
  assert.deepEqual(messages, ['second'])
  firstStop()
  assert.equal(first.listeners.size, 0)
  assert.equal(second.listeners.size, 1)
})
