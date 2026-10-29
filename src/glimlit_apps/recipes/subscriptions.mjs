// @ts-check

/** @param {HTMLElement} [root] */
function routePrefix(root) {
  return root && root.dataset.glimlitInstance !== '1' ? `#${root.id}/` : '#/'
}

/** @param {string} hash @param {HTMLElement} [root] */
export function routePath(hash, root) {
  return routePrefix(root) + hash.slice(2)
}

/**
 * @template Msg
 * @param {(hash: string) => Msg} handleChange
 * @param {HTMLElement} [root]
 * @returns {import('../runtime/subscriptions.mjs').Subscription<Msg>}
 */
export const hashRoute = (handleChange, root) => ({
  start: (dispatch) => {
    const prefix = routePrefix(root)
    const target = window
    const changed = () => {
      const hash = target.location.hash
      // Document anchors and other recipe islands' routes belong elsewhere.
      if (hash === '') dispatch(handleChange(''))
      else if (hash.startsWith(prefix))
        dispatch(handleChange('#/' + hash.slice(prefix.length)))
    }
    target.addEventListener('hashchange', changed)
    changed()
    return () => target.removeEventListener('hashchange', changed)
  },
})
