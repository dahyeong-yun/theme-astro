import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

// 기존 Gatsby 블로그의 frontmatter 스키마와 호환되도록 설계
// dahyeong-yun.github.io의 content/posts/ 구조를 그대로 사용 가능
const posts = defineCollection({
  loader: glob({ base: './content/posts', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),                        // Gatsby: date
      description: z.string().optional(),
      tags: z.array(z.string()).default([]),
      banner: image().optional(),
      draft: z.boolean().default(false),
      // Gatsby 호환 필드 (선택)
      slug: z.string().optional(),
      series: z.string().optional(),
      seriesOrder: z.number().int().positive().optional(),
    }),
})

export const collections = { posts }
