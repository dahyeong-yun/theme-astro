/**
 * 초안(draft: true)을 사이트에 노출할지 한 곳에서 정한다.
 *
 * 글을 쓰는 동안에는 초안도 사이트에 얹힌 모습으로 확인하고 싶고,
 * 배포된 사이트에는 나오면 안 된다. 그래서 개발 서버에서는 기본으로 함께 보여주고
 * 빌드에서는 감춘다. SHOW_DRAFTS 로 양쪽 다 뒤집을 수 있다.
 *
 *   npm run dev                       초안 보임
 *   SHOW_DRAFTS=0 npm run dev         초안 감춤 (배포본과 같은 화면)
 *   SHOW_DRAFTS=1 npm run build       초안 포함해 빌드 (preview 로 확인할 때)
 */
const raw = process.env.SHOW_DRAFTS?.trim().toLowerCase()

const OFF = ['0', 'false', 'no', 'off']

/** 값이 없으면 undefined — 그때만 개발/빌드 구분에 맡긴다. */
const explicit = raw === undefined || raw === '' ? undefined : !OFF.includes(raw)

const isBuild = process.env.NODE_ENV === 'production'

export const showDrafts: boolean = explicit ?? !isBuild

/** frontmatter 를 받아 목록·라우트에 넣을 문서인지 답한다. */
export function isVisible(data: { draft?: boolean } | undefined | null): boolean {
  return showDrafts || data?.draft !== true
}
