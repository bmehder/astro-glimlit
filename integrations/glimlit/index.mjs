// Site-local integration for apps exposing main(root).
import { fileURLToPath } from 'node:url'

export default function glimlit() {
  return {
    name: 'glimlit',
    hooks: {
      'astro:config:setup': ({ addRenderer }) => {
        addRenderer({
          name: 'glimlit',
          serverEntrypoint: fileURLToPath(
            new URL('./server.mjs', import.meta.url),
          ),
          clientEntrypoint: fileURLToPath(
            new URL('./client.mjs', import.meta.url),
          ),
        })
      },
    },
  }
}
