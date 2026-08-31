import { z } from 'astro/zod'

/**
 * 단독 페이지 스키마 (About 등).
 *
 * 날짜가 의미 없는 페이지들이다. 제목과 설명은 적지 않으면
 * blog.config 의 navigation 에서 가져온다.
 */
export const pageSchema = z.object({
  /** 적으면 navigation 의 title 보다 우선한다 */
  title: z.string().optional(),
  /** 적으면 navigation 의 description 보다 우선한다 */
  description: z.string().optional(),
  draft: z.boolean().default(false),
})

export type StandalonePage = z.infer<typeof pageSchema>
