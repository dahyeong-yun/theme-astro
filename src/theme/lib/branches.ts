/**
 * 갈래(branch) 색인.
 *
 * 갈래는 문서를 담는 상자이면서 그 자체로 문서다. 그래서 갈래끼리 부모-자식으로 엮이고,
 * 한 문서는 여러 갈래에 동시에 속할 수 있다.
 *
 * 화면에서 필요한 건 대개 "이 문서가 어느 계보에 있는가" 하나라,
 * 트리를 만들어 두고 문서 → 계보(들)를 뽑아 쓰는 형태로 둔다.
 */
import { getCollection } from 'astro:content'
import config from 'virtual:blog-config'
import { POSTS_BASE, WIKI_BASE, type DocRef } from './collection-docs.js'

export const BRANCH_BASE = '/branch'

export interface BranchRef {
  /** 확장자 없는 파일명. frontmatter 의 branches / parent 가 가리키는 값 */
  id: string
  title: string
  description?: string
  url: string
  parentId?: string
}

export interface BranchNode extends BranchRef {
  children: BranchNode[]
  /** 이 갈래에 직접 속한 문서들 (하위 갈래의 문서는 포함하지 않는다) */
  docs: DocRef[]
}

export interface BranchIndex {
  byId: Map<string, BranchNode>
  roots: BranchNode[]
  /** `${kind}:${path}` → 그 문서가 속한 갈래들 */
  docBranches: Map<string, BranchNode[]>
}

let indexPromise: Promise<BranchIndex> | null = null

function toId(entryId: string): string {
  return entryId.replace(/^\/+|\/+$/g, '').replace(/\/index$/, '')
}

function toDocPath(id: string): string {
  return id.replace(/^\/+|\/+$/g, '').replace(/\/index$/, '')
}

function refKey(kind: string, docPath: string): string {
  return `${kind}:${docPath}`
}

async function safeCollection(name: string): Promise<any[]> {
  try {
    return (await getCollection(name as any)) ?? []
  } catch {
    return []
  }
}

async function buildIndex(): Promise<BranchIndex> {
  const locale = config.site.language || 'ko'
  const entries = (await safeCollection('branches')).filter((entry) => !entry.data?.draft)

  const byId = new Map<string, BranchNode>()
  const orderOf = new Map<string, number>()

  for (const entry of entries) {
    const id = toId(entry.id)
    const slug = (entry.data?.slug ?? id).replace(/^\/+|\/+$/g, '')
    byId.set(id, {
      id,
      title: entry.data?.title ?? id,
      description: entry.data?.description,
      url: `${BRANCH_BASE}/${slug}/`,
      parentId: entry.data?.parent,
      children: [],
      docs: [],
    })
    if (typeof entry.data?.order === 'number') orderOf.set(id, entry.data.order)
  }

  // 부모-자식 엮기. 부모를 못 찾으면 최상위로 올린다(오타가 문서를 숨기지 않도록).
  const roots: BranchNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent && parent.id !== node.id) parent.children.push(node)
    else roots.push(node)
  }

  const sortNodes = (list: BranchNode[]) => {
    list.sort((a, b) => {
      const oa = orderOf.get(a.id)
      const ob = orderOf.get(b.id)
      if (oa !== undefined || ob !== undefined) {
        return (oa ?? Number.MAX_SAFE_INTEGER) - (ob ?? Number.MAX_SAFE_INTEGER)
      }
      return a.title.localeCompare(b.title, locale)
    })
    for (const node of list) sortNodes(node.children)
  }
  sortNodes(roots)

  // 문서 → 갈래. 포스트와 위키 양쪽 frontmatter 의 branches 를 읽는다.
  const docBranches = new Map<string, BranchNode[]>()
  const sources = [
    { kind: 'post' as const, base: POSTS_BASE, entries: await safeCollection('posts') },
    { kind: 'wiki' as const, base: WIKI_BASE, entries: await safeCollection('wiki') },
  ]

  for (const source of sources) {
    for (const entry of source.entries) {
      if (entry.data?.draft) continue
      const ids: string[] = Array.isArray(entry.data?.branches) ? entry.data.branches : []
      if (ids.length === 0) continue

      const docPath = toDocPath(entry.id)
      const slug = (entry.data?.slug ?? docPath).replace(/^\/+|\/+$/g, '')
      const ref: DocRef = {
        kind: source.kind,
        path: docPath,
        url: `${source.base}/${slug}/`,
        title: entry.data?.title ?? docPath,
        aliases: Array.isArray(entry.data?.aliases) ? entry.data.aliases : [],
        description: entry.data?.description,
        tags: Array.isArray(entry.data?.tags) ? entry.data.tags : [],
      }

      const mine: BranchNode[] = []
      for (const id of ids) {
        const node = byId.get(id)
        if (!node) continue
        node.docs.push(ref)
        mine.push(node)
      }
      if (mine.length > 0) docBranches.set(refKey(source.kind, docPath), mine)
    }
  }

  for (const node of byId.values()) {
    node.docs.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'wiki' ? -1 : 1
      return a.title.localeCompare(b.title, locale)
    })
  }

  return { byId, roots, docBranches }
}

export function getBranchIndex(): Promise<BranchIndex> {
  if (!indexPromise) indexPromise = buildIndex()
  return indexPromise
}

/** 갈래 하나의 계보. 최상위부터 자기 자신까지. */
export function ancestryOf(index: BranchIndex, id: string): BranchNode[] {
  const trail: BranchNode[] = []
  const seen = new Set<string>()
  let current = index.byId.get(id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)          // parent 를 서로 가리키는 실수에도 멈추도록
    trail.unshift(current)
    current = current.parentId ? index.byId.get(current.parentId) : undefined
  }
  return trail
}

/**
 * 문서가 속한 계보들.
 *
 * 한 문서가 여러 갈래에 속하면 계보도 여러 줄이 된다.
 * 예: REST 문서는 "API 종류" 아래에도, "스프링으로 RESTful API 만들기 › REST 계열" 아래에도 있다.
 */
export async function getDocTrails(kind: string, id: string): Promise<BranchNode[][]> {
  const index = await getBranchIndex()
  const mine = index.docBranches.get(refKey(kind, toDocPath(id))) ?? []
  return mine.map((node) => ancestryOf(index, node.id))
}

/** 하위 갈래까지 훑어 문서 수를 센다. */
export function countDocs(node: BranchNode): number {
  return node.docs.length + node.children.reduce((sum, child) => sum + countDocs(child), 0)
}
