import { contextForId } from '../glimlit_apps/runtime/instance.mjs'
import { defineApp } from '../../integrations/glimlit/component.mjs'

const load = () =>
  import('../../build/dev/javascript/glimlit/glimlit_apps/code_tabs/code_tabs.mjs')

export default defineApp('code_tabs', load, async (rootId) => {
  const { init } = await load()
  const { view } =
    await import('../../build/dev/javascript/glimlit/glimlit_apps/code_tabs/view.mjs')
  const [model] = init()
  return view(model, () => {}, contextForId(rootId))
})
