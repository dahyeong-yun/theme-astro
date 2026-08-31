/**
 * 페이지 머리말 문구를 blog.config 의 navigation 에서 가져온다.
 *
 * 제목 아래 한 줄 설명을 테마에 박아 두면 블로그마다 고칠 수가 없다.
 * 내비에 이미 메뉴 이름이 있으니, 그 옆에 설명을 같이 두는 편이 자연스럽다.
 */
import config from 'virtual:blog-config'
import type { NavItem } from '../types.js'

function normalize(href: string): string {
  const trimmed = href.trim().replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/** href 로 내비 항목을 찾는다. 없으면 undefined */
export function findNavItem(href: string): NavItem | undefined {
  const key = normalize(href)
  return (config.navigation ?? []).find((item) => normalize(item.href) === key)
}

export interface PageHeading {
  title: string
  description?: string
}

/**
 * 그 페이지의 제목과 설명.
 *
 * 내비 설정을 먼저 보고, 없으면 넘겨준 기본값을 쓴다.
 * 메뉴에 없는 페이지도 기본값만으로 동작한다.
 */
export function pageHeading(href: string, fallback: PageHeading): PageHeading {
  const item = findNavItem(href)
  return {
    title: item?.pageTitle ?? item?.title ?? fallback.title,
    description: item?.description ?? fallback.description,
  }
}
