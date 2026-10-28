export const mutableRef = (value) => ({ value })

export const read = ({ value }) => value

export const write = (ref, value) => {
  ref.value = value
}

/** @param {string} key @param {HTMLElement} [root] */
export function storageKey(key, root) {
  return root && root.dataset.glimlitInstance !== '1'
    ? `${key}.${root.id}`
    : key
}
