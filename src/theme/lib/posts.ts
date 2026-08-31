/**
 * 글 목록을 만드는 공통 로직.
 * /blog 첫 페이지와 /blog/page/[page] 가 같은 결과를 써야 해서 한 곳에 모았다.
 */
import { getCollection } from 'astro:content'
import config from 'virtual:blog-config'
import type { DocListItem } from '../components/DocList.astro'
import { getGitCreated } from './git-dates.js'

export const DEFAULT_POSTS_PER_PAGE = 10

export function postsPerPage(): number {
  const configured = config.content?.postsPerPage
  return configured && configured > 0 ? configured : DEFAULT_POSTS_PER_PAGE
}

export function postUrl(entry: any): string {
  const fallback = entry.id.replace(/\/index$/, '')
  const slug = (entry.data.slug ?? fallback).replace(/^\/+|\/+$/g, '')
  return `/blog/${slug}/`
}

/** 발행일 내림차순, 초안 제외 */
export async function getPublishedPosts(): Promise<any[]> {
  let entries: any[] = []
  try {
    entries = (await getCollection('posts' as any)) ?? []
  } catch {
    return []
  }
  return entries
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

export function toDocListItem(entry: any): DocListItem {
  return {
    title: entry.data.title,
    url: postUrl(entry),
    description: entry.data.description,
    date: entry.data.date,
    timeFrom: getGitCreated(entry.filePath),
    tags: entry.data.tags,
  }
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / postsPerPage()))
}

/** 1부터 세는 페이지 번호 기준으로 잘라낸다 */
export function sliceForPage<T>(items: T[], page: number): T[] {
  const size = postsPerPage()
  return items.slice((page - 1) * size, page * size)
}

/** 페이지 번호 → URL. 1쪽은 /blog 자체다. */
export function blogPageUrl(page: number): string {
  return page <= 1 ? '/blog' : `/blog/page/${page}`
}
