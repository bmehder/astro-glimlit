import { defineApp } from '../../integrations/glimlit/component.mjs'
import { contextForId } from '../glimlit_apps/runtime/instance.mjs'

const load = () => import('../../build/dev/javascript/glimlit/glimlit_apps/counter/counter.mjs')

export default defineApp('counter', load, async rootId => {
  const { init } = await load()
  const { view } = await import('../../build/dev/javascript/glimlit/glimlit_apps/counter/view.mjs')
  return view(init()[0], () => {}, contextForId(rootId))
})
