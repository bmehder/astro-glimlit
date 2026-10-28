import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const demos = defineCollection({
  loader: glob({ base: './src/content/demos', pattern: '*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    order: z.number().int().positive(),
  }),
})

export const collections = { demos }
