// App convention: the first island shares the original key; later islands use their stable root ID.
/** @param {string} key @param {HTMLElement} [root] */
export function storageKey(key, root) {
  return root && root.dataset.glimlitInstance !== '1'
    ? `${key}.${root.id}`
    : key
}
