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

  for (const doc of docs) {
    const seen = new Set<string>()
    for (const link of extractWikilinks(bodies.get(refKey(doc.kind, doc.path)) ?? '')) {
      if (!link.target) continue
      const target = resolver.resolve(link.target)
      if (!target) continue
      const key = refKey(target.kind, target.path)
      if (key === refKey(doc.kind, doc.path)) continue  // 자기 참조는 제외
      if (seen.has(key)) continue                        // 같은 문서를 여러 번 걸어도 한 번만
      seen.add(key)
      const list = backlinks.get(key) ?? []
      list.push(byKey.get(refKey(doc.kind, doc.path))!)
      backlinks.set(key, list)
    }
  }

  return { docs, resolver, backlinks }
}

/** 문서 색인. 빌드 한 번에 한 번만 계산한다. */
export function getDocIndex(): Promise<DocIndex> {
  if (!indexPromise) indexPromise = buildIndex()
  return indexPromise
}

/** 이 문서를 가리키는 문서 목록. 포스트가 먼저, 그다음 제목순. */
export async function getBacklinks(kind: DocKind, id: string): Promise<DocRef[]> {
  const { backlinks } = await getDocIndex()
  const list = backlinks.get(refKey(kind, toDocPath(id))) ?? []
  return [...list].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'post' ? -1 : 1
    return a.title.localeCompare(b.title, config.site.language || 'ko')
  })
}
