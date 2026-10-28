import { defineApp } from '../../integrations/glimlit/component.mjs'

export default defineApp(
  'recipes',
  () =>
    import('../../build/dev/javascript/glimlit/glimlit_apps/recipes/recipes.mjs'),
)
