/**
 * 파일 시스템을 직접 훑어 문서 색인을 만든다.
 *
 * remark 플러그인은 astro:content 를 쓸 수 없기 때문에(마크다운 변환 단계가
 * 콘텐츠 컬렉션보다 먼저다) 링크 해석용 색인은 fs 로 따로 구성한다.
 * Astro 컴포넌트 쪽 색인은 collection-docs.ts 가 담당한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { buildResolver, type DocKind, type DocMeta, type Resolver } from './wikilink.js'

export interface CollectionSource {
  kind: DocKind
  /** 콘텐츠 디렉터리 절대 경로 */
  dir: string
  /** URL 접두사. 예: '/blog' */
  base: string
}

export interface FsDocsOptions {
  sources: CollectionSource[]
}

interface CacheEntry {
  docs: DocMeta[]
  resolver: Resolver
}

const cache = new Map<string, CacheEntry>()

/** 콘텐츠 파일이 바뀌었을 때 색인을 버린다. (dev 서버용) */
export function invalidateFsDocs(): void {
  cache.clear()
}

function cacheKey(options: FsDocsOptions): string {
  return options.sources.map((s) => `${s.kind}:${s.dir}:${s.base}`).join('|')
}

function walk(dir: string, acc: string[] = []): string[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (/\.(md|mdx)$/i.test(entry.name)) acc.push(full)
  }
  return acc
}

/** 파일 앞머리의 YAML frontmatter 만 떼어 파싱한다. 없으면 빈 객체 */
export function readFrontmatter(file: string): Record<string, unknown> {
  let raw: string
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch {
    return {}
  }
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)
  if (!match) return {}
  try {
    const parsed = yaml.load(match[1])
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string') return [value]
  return []
}

/**
 * 파일 경로를 문서 경로로 바꾼다.
 * `a/b/index.mdx` → `a/b`, `a/b.md` → `a/b`
 */
export function toDocPath(dir: string, file: string): string {
  return path
    .relative(dir, file)
    .replace(/\\/g, '/')
    .replace(/\.(md|mdx)$/i, '')
    .replace(/\/index$/, '')
}

/** 문서 경로와 frontmatter 로 최종 URL 을 만든다. */
export function toDocUrl(base: string, docPath: string, slugOverride?: unknown): string {
  const slug =
    typeof slugOverride === 'string' && slugOverride.trim()
      ? slugOverride.trim().replace(/^\/+|\/+$/g, '')
      : docPath
  return `${base.replace(/\/+$/, '')}/${slug}/`
}

/** 설정된 모든 콘텐츠 디렉터리를 훑어 문서 색인과 해석기를 만든다. (캐시됨) */
export function getFsDocs(options: FsDocsOptions): CacheEntry {
  const key = cacheKey(options)
  const cached = cache.get(key)
  if (cached) return cached

  const docs: DocMeta[] = []
  for (const source of options.sources) {
    for (const file of walk(source.dir)) {
      const data = readFrontmatter(file)
      const docPath = toDocPath(source.dir, file)
      docs.push({
        kind: source.kind,
        path: docPath,
        url: toDocUrl(source.base, docPath, data.slug),
        title: typeof data.title === 'string' ? data.title : '',
        aliases: toStringArray(data.aliases),
        draft: data.draft === true,
      })
    }
  }

  const entry: CacheEntry = { docs, resolver: buildResolver(docs) }
  cache.set(key, entry)
  return entry
}
