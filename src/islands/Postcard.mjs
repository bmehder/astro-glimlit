import { defineApp } from '../../integrations/glimlit/component.mjs'

export default defineApp(
  'postcard',
  () =>
    import('../../build/dev/javascript/glimlit/glimlit_apps/postcard/postcard.mjs'),
)
