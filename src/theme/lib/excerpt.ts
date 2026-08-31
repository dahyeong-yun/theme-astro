/**
 * 본문 앞부분을 요약문으로 뽑는다.
 *
 * frontmatter 에 description 을 적지 않은 글은 검색 결과와 공유 카드에
 * 사이트 기본 설명이 그대로 나간다. 글이 스무 편이면 스무 편이 같은 문장으로
 * 보인다. 직접 적은 설명이 가장 좋지만, 없을 때 본문 첫 문단이라도 쓰는 편이
 * 아무것도 구분되지 않는 것보다 낫다.
 */

const DEFAULT_LENGTH = 160

/** 마크다운 표기를 걷어내고 읽을 수 있는 평문만 남긴다 */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, '')        // frontmatter
    .replace(/^import\s.+$/gm, '')                    // MDX import 문
    .replace(/```[\s\S]*?```/g, ' ')                  // 코드 블록
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/<[^>]+>/g, ' ')                         // HTML/JSX 태그
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')            // 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')          // 링크 → 글자만
    .replace(/!?\[\[([^\[\]|#]*)(?:[#|][^\[\]]*)?\]\]/g, '$1')  // 위키링크
    .replace(/^\s{0,3}#{1,6}\s+.*$/gm, ' ')           // 헤딩은 줄째로 버린다 (본문과 이어 붙으면 문장이 엉킨다)
    .replace(/^\s{0,3}>\s?/gm, '')                    // 인용 기호
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, '')        // 목록 기호
    .replace(/^\s{0,3}([-*_])\s*(\1\s*){2,}$/gm, ' ') // 수평선
    .replace(/(\*\*|__|\*|_|`|~~)/g, '')              // 강조·인라인 코드
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')                // 수식
    .replace(/\$[^$\n]*\$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 요약문. 길이를 넘으면 마지막 단어 경계에서 자르고 말줄임표를 붙인다.
 * 본문이 비어 있으면 undefined 를 돌려주어 호출부가 다른 값을 쓰게 한다.
 */
export function excerpt(markdown: string | undefined, length = DEFAULT_LENGTH): string | undefined {
  const text = toPlainText(markdown ?? '')
  if (!text) return undefined
  if (text.length <= length) return text

  const cut = text.slice(0, length)
  // 한국어는 공백 없이 이어지는 구간이 길어 단어 경계가 없을 수 있다.
  const boundary = cut.lastIndexOf(' ')
  const body = boundary > length * 0.6 ? cut.slice(0, boundary) : cut
  return `${body.trimEnd()}…`
}
