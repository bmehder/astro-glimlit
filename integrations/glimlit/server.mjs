import { renderWithSsrCompatibility } from '../../src/glimlit_apps/runtime/lit-ssr-compat.mjs'

const pageInstances = new WeakMap()

const escapeAttribute = (value) =>
  String(value).replace(
    /[&"<>']/g,
    (character) =>
      ({
        '&': '&amp;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
      })[character],
  )

export default {
  name: 'glimlit',
  check: (component) => component?.framework === 'glimlit',
  async renderToStaticMarkup(component, props, _slots, metadata) {
    if (!metadata?.hydrate) {
      throw new Error(
        'Glimlit currently needs a client directive, such as client:load.',
      )
    }
    const classAttribute =
      props.class == null ? '' : ` class="${escapeAttribute(props.class)}"`
    if (!component.template)
      return {
        html: `<div data-glimlit-root tabindex="-1"${classAttribute}></div>`,
      }

    // Astro supplies one result object per page render, so counts never leak across pages.
    const counts = pageInstances.get(this.result) ?? new Map()
    pageInstances.set(this.result, counts)
    const instance = (counts.get(component.app) ?? 0) + 1
    counts.set(component.app, instance)
    // Separate server IDs from client-only mounts, which skip this renderer.
    const id = `${component.app}-app-ssr-${instance}`
    const template = await component.template(id)
    const html = await renderWithSsrCompatibility(template)
    return {
      html: `<div data-glimlit-root data-glimlit-ssr id="${escapeAttribute(id)}" data-glimlit-instance="${instance}" tabindex="-1"${classAttribute}>${html}</div>`,
    }
  },
}
