import { z } from 'astro/zod'

// 기존 Gatsby 블로그 frontmatter와 호환되는 스키마
export const blogPostSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  // 고쳐 쓴 글에만 직접 적는다. 적힌 경우에만 '고쳐 씀'으로 표시된다.
  updated: z.coerce.date().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  banner: z.string().optional(),  // public/ 경로 또는 URL
  // 공유 카드 전용 이미지. 적지 않으면 banner 를, 그것도 없으면 seo.defaultImage 를 쓴다.
  ogImage: z.string().optional(),
  // 위키링크에서 이 글을 부를 수 있는 다른 이름들
  aliases: z.array(z.string()).default([]),
  // 이 글이 속한 갈래들의 id. 포스트도 갈래에 걸어 둘 수 있다.
  branches: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  slug: z.string().optional(),
  series: z.string().optional(),
  seriesOrder: z.number().int().positive().optional(),
})

export type BlogPost = z.infer<typeof blogPostSchema>


