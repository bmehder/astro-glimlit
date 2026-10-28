import test from 'node:test'
import assert from 'node:assert/strict'
import hydrate from '../integrations/glimlit/client.mjs'
import renderer from '../integrations/glimlit/server.mjs'
import { defineApp } from '../integrations/glimlit/component.mjs'
import Counter from '../src/islands/Counter.mjs'
import Postcard from '../src/islands/Postcard.mjs'
import CodeTabs from '../src/islands/CodeTabs.mjs'
import { html } from 'lit-html'

test('code tabs SSR includes highlighted examples with only the initial panel visible', async () => {
  const { html: output } = await renderer.renderToStaticMarkup.call(
    { result: {} },
    CodeTabs,
    {},
    {},
    { hydrate: 'load' },
  )
  assert.match(output, /data-glimlit-ssr/)
  assert.match(output, /code_tabs-app-ssr-1-view-tab/)
  assert.match(output, /aria-selected="true"/)
  assert.equal((output.match(/role="tabpanel"/g) ?? []).length, 3)
  assert.equal((output.match(/\shidden(?:\s|>)/g) ?? []).length, 2)
  assert.equal((output.match(/<pre\b/g) ?? []).length, 3)
  assert.match(output, /<span style="color:/)
  assert.match(output, /Two languages\. One app\./)
})

test('server textarea values stay escaped as text', async () => {
  const app = defineApp(
    'textarea-test',
    () => {},
    () =>
      html`<textarea
        data-ssr-value=${'</textarea><script>alert("test")</script>'}
      ></textarea>`,
  )
  const output = await renderer.renderToStaticMarkup.call(
    { result: {} },
    app,
    {},
    {},
    { hydrate: 'load' },
  )
  assert.doesNotMatch(output.html, /<script>/)
  assert.match(output.html, />&lt;\/textarea&gt;&lt;script&gt;/)
})

test('postcard SSR renders its real initial view and scopes IDs per page', async () => {
  const page = { result: {} }
  const first = await renderer.renderToStaticMarkup.call(
    page,
    Postcard,
    {},
    {},
    { hydrate: 'visible' },
  )
  const second = await renderer.renderToStaticMarkup.call(
    page,
    Postcard,
    {},
    {},
    { hydrate: 'visible' },
  )
  const anotherPage = await renderer.renderToStaticMarkup.call(
    { result: {} },
    Postcard,
    {},
    {},
    { hydrate: 'load' },
  )
  assert.match(first.html, /data-glimlit-ssr/)
  assert.match(first.html, /id="postcard-app-ssr-1"/)
  assert.match(second.html, /id="postcard-app-ssr-2"/)
  assert.match(anotherPage.html, /id="postcard-app-ssr-1"/)
  assert.match(first.html, /value="Hello from somewhere nice"/)
  assert.match(first.html, /<textarea[^>]*>Wish you were here\./)
  assert.doesNotMatch(first.html, /\schecked[=\s>]/)
  assert.match(first.html, /<!--lit-part /)
})

test('renderer recognizes Glimlit and requires a client directive', async () => {
  const app = defineApp('counter', () => {})
  assert.equal(renderer.check(app), true)
  assert.equal(
    renderer.check(() => {}),
    false,
  )
  await assert.rejects(
    renderer.renderToStaticMarkup(app, {}, {}, {}),
    /client directive/,
  )
  assert.equal(
    (await renderer.renderToStaticMarkup(app, {}, {}, { hydrate: 'visible' }))
      .html,
    '<div data-glimlit-root tabindex="-1"></div>',
  )
  assert.equal(
    (
      await renderer.renderToStaticMarkup(
        app,
        { class: 'min-h-80 "<&' },
        {},
        { hydrate: 'load' },
      )
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


test('Counter uses the same server-marked startup as Postcard', async () => {
  const output = await renderer.renderToStaticMarkup.call(
    { result: {} }, Counter, {}, {}, { hydrate: 'load' },
  )
  assert.match(output.html, /data-glimlit-ssr/)
  assert.match(output.html, /id="counter-app-ssr-1"/)
  assert.match(output.html, /aria-live="polite"/)
  assert.match(output.html, /Increase count/)
  assert.match(output.html, /<!--lit-part /)
})
