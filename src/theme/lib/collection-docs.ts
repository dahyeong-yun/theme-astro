/**
 * astro:content 기준 문서 색인 — 페이지/컴포넌트에서 쓰는 쪽.
 *
 * remark 단계의 fs-docs.ts 와 같은 해석 규칙(wikilink.ts)을 공유하지만,
 * 이쪽은 컬렉션 엔트리를 그대로 쓰므로 제목·날짜 같은 표시용 정보까지 들고 있다.
 */
import { getCollection } from 'astro:content'
import config from 'virtual:blog-config'
import {
  buildResolver,
  extractWikilinks,
  type DocKind,
  type DocMeta,
  type Resolver,
} from './wikilink.js'

/** 링크 목록에 보여줄 만큼의 문서 정보 */
export interface DocRef extends DocMeta {
  description?: string
  date?: Date
  updated?: Date
  tags: string[]
}

export interface DocIndex {
  docs: DocRef[]
  resolver: Resolver
  /** `${kind}:${path}` → 그 문서를 가리키는 문서들 */
  backlinks: Map<string, DocRef[]>
  /** `${kind}:${path}` → 그 문서가 가리키는 문서들 */
  outgoing: Map<string, DocRef[]>
}

/**
 * 한 문서를 둘러싼 이웃들.
 *
 * 링크는 방향이 있는데 화면에서는 그게 안 보이면 그냥 목록 두 개가 된다.
 * 서로 건 문서(mutual)를 가장 가까운 사이로 앞에 두고, 한쪽 방향만 걸린 것을 뒤에 둔다.
 */
export interface RelatedDocs {
  /** 서로 링크한 문서 */
  mutual: DocRef[]
  /** 이 문서가 가리키기만 하는 문서 */
  outgoing: DocRef[]
  /** 이 문서를 가리키기만 하는 문서 */
  incoming: DocRef[]
  /** 링크는 없지만 같은 분류에 있는 위키 문서 */
  siblings: DocRef[]
}

export const POSTS_BASE = '/blog'
export const WIKI_BASE = (config.wiki?.basePath ?? '/wiki').replace(/\/+$/, '')

let indexPromise: Promise<DocIndex> | null = null

function refKey(kind: DocKind, docPath: string): string {
  return `${kind}:${docPath}`
}

function toDocPath(id: string): string {
  return id.replace(/^\/+|\/+$/g, '').replace(/\/index$/, '')
}

function toUrl(base: string, docPath: string, slugOverride?: string): string {
  const slug = slugOverride?.trim()
    ? slugOverride.trim().replace(/^\/+|\/+$/g, '')
    : docPath
  return `${base}/${slug}/`
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.valueOf()) ? undefined : parsed
  }
  return undefined
}

/** 컬렉션이 정의되지 않은 프로젝트에서도 테마가 깨지지 않도록 감싼다. */
async function safeCollection(name: string): Promise<any[]> {
  try {
    return (await getCollection(name as any)) ?? []
  } catch {
    return []
  }
}

async function buildIndex(): Promise<DocIndex> {
  const sources: { kind: DocKind; base: string; entries: any[] }[] = [
    { kind: 'post', base: POSTS_BASE, entries: await safeCollection('posts') },
    { kind: 'wiki', base: WIKI_BASE, entries: await safeCollection('wiki') },
  ]

  const docs: DocRef[] = []
  const bodies = new Map<string, string>()

  for (const source of sources) {
    for (const entry of source.entries) {
      if (entry.data?.draft) continue
      const docPath = toDocPath(entry.id)
      const ref: DocRef = {
        kind: source.kind,
        path: docPath,
        url: toUrl(source.base, docPath, entry.data?.slug),
        title: entry.data?.title ?? docPath,
        aliases: Array.isArray(entry.data?.aliases) ? entry.data.aliases : [],
        description: entry.data?.description,
        date: toDate(entry.data?.date ?? entry.data?.created),
        updated: toDate(entry.data?.updated),
        tags: Array.isArray(entry.data?.tags) ? entry.data.tags : [],
      }
      docs.push(ref)
      bodies.set(refKey(ref.kind, ref.path), entry.body ?? '')
    }
  }

  const resolver = buildResolver(docs)
  const byKey = new Map(docs.map((d) => [refKey(d.kind, d.path), d]))
  const backlinks = new Map<string, DocRef[]>()
  const outgoing = new Map<string, DocRef[]>()

  for (const doc of docs) {
    const from = refKey(doc.kind, doc.path)
    const seen = new Set<string>()
    for (const link of extractWikilinks(bodies.get(from) ?? '')) {
      if (!link.target) continue
      const target = resolver.resolve(link.target)
      if (!target) continue
      const key = refKey(target.kind, target.path)
      if (key === from) continue     // 자기 참조는 제외
      if (seen.has(key)) continue    // 같은 문서를 여러 번 걸어도 한 번만
      seen.add(key)

      const inbound = backlinks.get(key) ?? []
      inbound.push(byKey.get(from)!)
      backlinks.set(key, inbound)

      const forward = outgoing.get(from) ?? []
      forward.push(byKey.get(key)!)
      outgoing.set(from, forward)
    }
  }

  return { docs, resolver, backlinks, outgoing }
}

/** 문서 색인. 빌드 한 번에 한 번만 계산한다. */
export function getDocIndex(): Promise<DocIndex> {
  if (!indexPromise) indexPromise = buildIndex()
  return indexPromise
}

/** 이 문서를 가리키는 문서 목록. 포스트가 먼저, 그다음 제목순. */
export async function getBacklinks(kind: DocKind, id: string): Promise<DocRef[]> {
  const { backlinks } = await getDocIndex()
  return sortRefs(backlinks.get(refKey(kind, toDocPath(id))) ?? [])
}

function sortRefs(list: DocRef[]): DocRef[] {
  const locale = config.site.language || 'ko'
  return [...list].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'post' ? -1 : 1
    return a.title.localeCompare(b.title, locale)
  })
}

/** 위키 분류 = 최상위 폴더. 루트에 바로 놓인 문서는 분류가 없다. */
function groupOf(docPath: string): string | null {
  const segments = docPath.split('/').filter(Boolean)
  return segments.length > 1 ? segments[0] : null
}

/**
 * 문서를 둘러싼 이웃을 방향별로 모은다.
 *
 * 링크로 이어진 문서는 mutual → outgoing → incoming 순으로 가까운 사이다.
 * 어느 쪽으로도 안 걸렸지만 같은 분류에 있는 위키 문서는 siblings 로 따로 둔다.
 * 링크를 아직 안 건 문서만 있는 새 분류에서도 화면이 비지 않게 하려는 것이다.
 */
export async function getRelatedDocs(kind: DocKind, id: string): Promise<RelatedDocs> {
  const { backlinks, outgoing, docs } = await getDocIndex()
  const docPath = toDocPath(id)
  const self = refKey(kind, docPath)

  const out = outgoing.get(self) ?? []
  const inc = backlinks.get(self) ?? []
  const outKeys = new Set(out.map((d) => refKey(d.kind, d.path)))
  const incKeys = new Set(inc.map((d) => refKey(d.kind, d.path)))

  const mutual = out.filter((d) => incKeys.has(refKey(d.kind, d.path)))
  const mutualKeys = new Set(mutual.map((d) => refKey(d.kind, d.path)))

  const linked = new Set([...outKeys, ...incKeys])
  const group = kind === 'wiki' ? groupOf(docPath) : null
  const siblings = group
    ? docs.filter(
        (d) =>
          d.kind === 'wiki' &&
          d.path !== docPath &&
          groupOf(d.path) === group &&
          !linked.has(refKey(d.kind, d.path)),
      )
    : []

  return {
    mutual: sortRefs(mutual),
    outgoing: sortRefs(out.filter((d) => !mutualKeys.has(refKey(d.kind, d.path)))),
    incoming: sortRefs(inc.filter((d) => !mutualKeys.has(refKey(d.kind, d.path)))),
    siblings: sortRefs(siblings),
  }
}
