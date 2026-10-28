import test from 'node:test'
import assert from 'node:assert/strict'
import hydrate from '../integrations/glimlit/client.mjs'
import renderer from '../integrations/glimlit/server.mjs'
import { defineApp } from '../integrations/glimlit/component.mjs'

test('renderer recognizes Glimlit and requires a client directive', () => {
  const app = defineApp('counter', () => {})
  assert.equal(renderer.check(app), true)
  assert.equal(
    renderer.check(() => {}),
    false,
  )
  assert.throws(
    () => renderer.renderToStaticMarkup(app, {}, {}, {}),
    /client directive/,
  )
  assert.equal(
    renderer.renderToStaticMarkup(app, {}, {}, { hydrate: 'visible' }).html,
    '<div data-glimlit-root tabindex="-1"></div>',
  )
  assert.equal(
    renderer.renderToStaticMarkup(
      app,
      { class: 'min-h-80 "<&' },
      {},
      { hydrate: 'load' },
    ).html,
    '<div data-glimlit-root tabindex="-1" class="min-h-80 &quot;&lt;&amp;"></div>',
  )
})

test('hydration uses page order even when islands start in reverse order, and registers cleanup', async () => {
  const originalDocument = globalThis.document
  const roots = []
  const stopped = []
  const island = () => ({
    isConnected: true,
    getAttribute: (name) =>
      name === 'component-url' ? '/Counter.mjs' : 'default',
    querySelector: () => null,
    replaceChildren(root) {
      this.root = root
    },
    addEventListener(name, stop, options) {
      assert.equal(name, 'astro:unmount')
      assert.equal(options.once, true)
      this.stop = stop
    },
  })
  const first = island()
  const second = island()
  globalThis.document = {
    querySelectorAll: () => [first, second],
    createElement: () => ({ dataset: {} }),
  }
  const app = defineApp('counter', async () => ({
    main(root) {
      roots.push(root)
      return () => stopped.push(root.id)
    },
  }))
  try {
    await hydrate(second)(app, { class: 'example' })
    await hydrate(first)(app, {})
    assert.deepEqual(
      roots.map((root) => root.id),
      ['counter-app-2', 'counter-app-1'],
    )
    assert.equal(second.root.dataset.glimlitInstance, '2')
    assert.equal(second.root.className, 'example')
    second.stop()
    assert.deepEqual(stopped, ['counter-app-2'])
    const removed = island()
    removed.isConnected = false
    await hydrate(removed)(app, {})
    assert.equal(roots.length, 2)
  } finally {
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})
