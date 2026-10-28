export default (element) => async (component, props) => {
  // Use document order, not hydration order: visible/idle islands can start later.
  const siblings = [...document.querySelectorAll('astro-island')].filter(
    (island) =>
      island.getAttribute('component-url') ===
        element.getAttribute('component-url') &&
      island.getAttribute('component-export') ===
        element.getAttribute('component-export'),
  )
  const instance = siblings.indexOf(element) + 1
  const root =
    element.querySelector(':scope > [data-glimlit-root]') ??
    document.createElement('div')
  root.id ||= `${component.app}-app-${instance}`
  root.dataset.glimlitInstance = String(instance)
  root.tabIndex = -1
  root.className = props.class ?? ''
  element.replaceChildren(root)

  const { main } = await component.load()
  if (!element.isConnected) return
  const stop = main(root)
  element.addEventListener('astro:unmount', stop, { once: true })
}
