import { defineApp } from '../../integrations/glimlit/component.mjs'

export default defineApp(
  'counter',
  () =>
    import('../../build/dev/javascript/glimlit/glimlit_apps/counter/counter.mjs'),
)
