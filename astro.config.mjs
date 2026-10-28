import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@astrojs/mdx'
import glimlit from './integrations/glimlit/index.mjs'

export default defineConfig({
  integrations: [mdx(), glimlit()],
  vite: { plugins: [tailwindcss()] },
})
