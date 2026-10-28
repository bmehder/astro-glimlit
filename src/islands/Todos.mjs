import { defineApp } from '../../integrations/glimlit/component.mjs'

export default defineApp(
  'todos',
  () =>
    import('../../build/dev/javascript/glimlit/glimlit_apps/todos/todos.mjs'),
)
