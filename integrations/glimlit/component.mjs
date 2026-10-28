// A callable export lets Astro's editor tooling recognize the component.
// The renderer uses its metadata; Astro never calls this placeholder.
export function defineApp(app, load) {
  return Object.assign((_props) => null, { framework: 'glimlit', app, load })
}
