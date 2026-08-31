/**
 * 옵시디언 위키링크 문법을 다루는 순수 로직.
 *
 * I/O가 전혀 없으므로 remark 플러그인(node fs 기반)과
 * Astro 컴포넌트(astro:content 기반) 양쪽에서 그대로 재사용한다.
 */
import GithubSlugger from 'github-slugger'

export type DocKind = 'post' | 'wiki'

/** 링크 해석에 필요한 문서 최소 정보 */
export interface DocMeta {
  kind: DocKind
  /** 컬렉션 루트 기준 확장자 없는 경로. 예: 'java-spring/stack-vs-chm' */
  path: string
  /** 최종 URL. 예: '/blog/java-spring/stack-vs-chm/' */
  url: string
  title: string
  aliases: string[]
  /** 초안이면 라우트가 만들어지지 않는다. 링크는 걸 수 있되 깨진 링크로 표시한다. */
  draft?: boolean
}

/** `[[대상#헤딩|별칭]]` 을 분해한 결과 */
export interface ParsedWikilink {
  /** 문서 지시자. `[[#헤딩]]` 처럼 생략되면 빈 문자열 */
  target: string
  /** `#` 뒤의 헤딩 텍스트. 없으면 null */
  heading: string | null
  /** `|` 뒤의 표시용 별칭. 없으면 null */
  alias: string | null
  /** `![[...]]` 형태의 임베드 여부 */
  embed: boolean
}

/**
 * 위키링크 원문(대괄호 안쪽)을 분해한다.
 *
 * 옵시디언 순서를 따라 `|` 를 먼저 끊고, 그 앞부분에서 `#` 을 끊는다.
 * 헤딩 텍스트 자체에 `|` 가 들어가는 경우는 옵시디언도 지원하지 않는다.
 */
export function parseWikilink(raw: string, embed = false): ParsedWikilink {
  const pipeAt = raw.indexOf('|')
  const alias = pipeAt === -1 ? null : raw.slice(pipeAt + 1).trim()
  const locator = pipeAt === -1 ? raw : raw.slice(0, pipeAt)

  const hashAt = locator.indexOf('#')
  const heading = hashAt === -1 ? null : locator.slice(hashAt + 1).trim()
  const target = (hashAt === -1 ? locator : locator.slice(0, hashAt)).trim()

  return { target, heading, alias: alias || null, embed }
}

/** 헤딩 텍스트를 rehype-slug 과 동일한 규칙의 앵커로 변환 */
export function headingToAnchor(heading: string): string {
  return new GithubSlugger().slug(heading)
}

/** 링크 조회용 키 정규화. 대소문자·경로 구분자·공백 흔들림을 흡수한다. */
export function normalizeKey(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.(md|mdx)$/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** `path` 의 마지막 구간. `folder/index` 형태는 `folder` 로 접는다. */
export function basenameOf(docPath: string): string {
  const segments = docPath.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (last === 'index' && segments.length > 1) return segments[segments.length - 2]
  return last ?? docPath
}

export interface Resolver {
  /** 링크 대상 문자열을 문서로 해석한다. 못 찾으면 null */
  resolve(target: string): DocMeta | null
  /** 같은 키를 두 문서가 차지해 먼저 등록된 쪽이 이긴 경우들 */
  ambiguities: { key: string; winner: string; losers: string[] }[]
}

/**
 * 문서 목록으로 링크 해석기를 만든다.
 *
 * 해석 우선순위는 옵시디언과 같다.
 *   1. 전체 경로 (`[[java-spring/stack-vs-chm]]`)
 *   2. 파일명 — `folder/index.mdx` 는 폴더명이 파일명 역할을 한다
 *   3. frontmatter 의 title 또는 aliases
 *
 * 세 단계 모두 정규화된 키로 비교하므로 대소문자는 구분하지 않는다.
 */
export function buildResolver(docs: DocMeta[]): Resolver {
  const byPath = new Map<string, DocMeta>()
  const byBasename = new Map<string, DocMeta>()
  const byName = new Map<string, DocMeta>()
  const ambiguities: Resolver['ambiguities'] = []

  const put = (map: Map<string, DocMeta>, key: string, doc: DocMeta) => {
    if (!key) return
    const existing = map.get(key)
    if (!existing) {
      map.set(key, doc)
      return
    }
    if (existing.path === doc.path) return
    const hit = ambiguities.find((a) => a.key === key && a.winner === existing.path)
    if (hit) hit.losers.push(doc.path)
    else ambiguities.push({ key, winner: existing.path, losers: [doc.path] })
  }

  for (const doc of docs) {
    put(byPath, normalizeKey(doc.path), doc)
    put(byBasename, normalizeKey(basenameOf(doc.path)), doc)
    put(byName, normalizeKey(doc.title), doc)
    for (const alias of doc.aliases) put(byName, normalizeKey(alias), doc)
  }

  return {
    resolve(target: string) {
      const key = normalizeKey(target)
      if (!key) return null
      return byPath.get(key) ?? byBasename.get(key) ?? byName.get(key) ?? null
    },
    ambiguities,
  }
}

/**
 * 마크다운 본문에서 코드 영역을 제거한다.
 *
 * 백링크 수집은 mdast 를 거치지 않고 원문을 훑기 때문에,
 * 코드 블록 안의 `[[...]]` 가 링크로 잡히지 않도록 먼저 걷어낸다.
 */
function stripCode(markdown: string): string {
  return markdown
    .replace(/^---\n[\s\S]*?\n---/, '')       // frontmatter
    .replace(/```[\s\S]*?```/g, '')            // fenced code
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '')                 // inline code
}

/** 마크다운 원문에서 위키링크를 모두 뽑아낸다. (코드 영역 제외) */
export function extractWikilinks(markdown: string): ParsedWikilink[] {
  const found: ParsedWikilink[] = []
  const pattern = /(!?)\[\[([^\[\]\n]+?)\]\]/g
  let match: RegExpExecArray | null
  const body = stripCode(markdown)
  while ((match = pattern.exec(body)) !== null) {
    found.push(parseWikilink(match[2], match[1] === '!'))
  }
  return found
}
