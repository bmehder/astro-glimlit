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
  renderToStaticMarkup(_component, props, _slots, metadata) {
    if (!metadata?.hydrate) {
      throw new Error(
        'Glimlit currently needs a client directive, such as client:load.',
      )
    }
    // This is only a mount point, not a server-rendered app or duplicated view.
    const classAttribute =
      props.class == null ? '' : ` class="${escapeAttribute(props.class)}"`
    return {
      html: `<div data-glimlit-root tabindex="-1"${classAttribute}></div>`,
    }
  },
}
