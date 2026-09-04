import { z } from 'astro/zod'

/**
 * 갈래 스키마.
 *
 * 갈래는 문서를 담는 상자이면서 그 자체로 한 편의 문서다.
 * "API 종류란 무엇인가"를 갈래 페이지 본문에 쓸 수 있어야 하기 때문이다.
 *
 * 태그와 다른 점은 두 가지다.
 *   - 갈래는 갈래를 품는다 (parent). 태그는 평평하다.
 *   - 갈래는 설명을 가진다. 태그는 이름뿐이다.
 *
 * 시리즈와 다른 점은 순서다. 시리즈가 "읽는 차례"라면 갈래는 "개념의 소속"이라
 * 같은 문서가 여러 갈래에 동시에 속할 수 있다.
 */
export const branchSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  /** 상위 갈래의 id(확장자 없는 파일명). 없으면 최상위 갈래 */
  parent: z.string().optional(),
  /** 형제 갈래 사이 정렬. 작을수록 앞. 없으면 제목순 */
  order: z.number().optional(),
  draft: z.boolean().default(false),
  slug: z.string().optional(),
})

export type Branch = z.infer<typeof branchSchema>
