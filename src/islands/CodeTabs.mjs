import { defineApp } from '../../integrations/glimlit/component.mjs'

export default defineApp(
  'code_tabs',
  () =>
    import('../../build/dev/javascript/glimlit/glimlit_apps/code_tabs/code_tabs.mjs'),
)
