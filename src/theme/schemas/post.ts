import { z } from 'astro/zod'

// 기존 Gatsby 블로그 frontmatter와 호환되는 스키마
export const blogPostSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  banner: z.string().optional(),  // public/ 경로 또는 URL
  draft: z.boolean().default(false),
  slug: z.string().optional(),
})

export type BlogPost = z.infer<typeof blogPostSchema>


