import { z } from 'astro/zod'

/**
 * 위키 문서 스키마.
 *
 * 포스트가 "언제 쓴 글"이라면 위키는 "지금 어떤 상태인 문서"에 가깝다.
 * 그래서 발행일(date) 대신 최종 갱신일(updated)을 중심으로 두고,
 * 작성일(created)은 선택으로 남긴다.
 */
export const wikiPageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  /** 위키링크에서 이 문서를 부를 수 있는 다른 이름들 */
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  created: z.coerce.date().optional(),
  updated: z.coerce.date().optional(),
  /** 문서 성숙도. 지정하지 않으면 화면에 아무것도 표시하지 않는다. */
  status: z.enum(['seed', 'growing', 'evergreen']).optional(),
  draft: z.boolean().default(false),
  slug: z.string().optional(),
})

export type WikiPage = z.infer<typeof wikiPageSchema>
