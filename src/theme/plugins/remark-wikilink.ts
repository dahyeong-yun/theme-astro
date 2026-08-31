/**
 * 옵시디언 위키링크(`[[문서]]`)를 실제 링크로 바꾸는 remark 플러그인.
 *
 * 지원 문법
 *   [[문서]]              → 문서로 가는 링크
 *   [[문서|보여줄 이름]]   → 별칭 링크
 *   [[문서#헤딩]]         → 문서 안 헤딩 앵커까지
 *   [[#헤딩]]             → 같은 문서 안 헤딩
 *   ![[문서]]             → 임베드. 이 테마는 임베드를 지원하지 않으므로 링크로 낮춰 렌더링한다.
 *
 * 대상 문서를 찾지 못하면 링크 대신 `.wikilink-broken` span 으로 남기고
 * 빌드 로그에 경고를 찍는다. 링크가 조용히 죽는 것보다 눈에 띄는 편이 낫다.
 */
import { findAndReplace } from 'mdast-util-find-and-replace'
import type { CollectionSource } from '../lib/fs-docs.js'
import { getFsDocs } from '../lib/fs-docs.js'
import { headingToAnchor, parseWikilink } from '../lib/wikilink.js'

export interface RemarkWikilinkOptions {
  sources: CollectionSource[]
}

const WIKILINK = /(!?)\[\[([^\[\]\n]+?)\]\]/g

/** 같은 깨진 링크로 로그를 도배하지 않도록 한 번씩만 경고한다. */
const warned = new Set<string>()

export function remarkWikilink(options: RemarkWikilinkOptions) {
  return function transformer(tree: any, file: any) {
    const { resolver } = getFsDocs({ sources: options.sources })

    findAndReplace(
      tree,
      [
        [
          WIKILINK,
          (_full: string, bang: string, inner: string) => {
            const link = parseWikilink(inner, bang === '!')
            const label = link.alias ?? link.heading ?? link.target
            const anchor = link.heading ? `#${headingToAnchor(link.heading)}` : ''

            // [[#헤딩]] — 같은 문서 안 이동
            if (!link.target) {
              if (!anchor) return false
              return linkNode(anchor, label, ['wikilink', 'wikilink-anchor'], inner)
            }

            const doc = resolver.resolve(link.target)

            // 초안은 페이지가 만들어지지 않으므로 링크를 걸면 404 가 된다.
            // 없는 문서와 이유가 다르니 안내 문구를 따로 준다.
            if (doc?.draft) {
              warnOnce(file, link.target, `[[${inner}]] 는 초안 문서입니다. 링크가 걸리지 않습니다.`)
              return brokenNode(label, inner, `아직 초안인 문서입니다: ${inner}`)
            }

            if (!doc) {
              warnOnce(file, link.target, `대상 문서를 찾지 못했습니다: [[${inner}]]`)
              return brokenNode(label, inner, `연결된 문서가 아직 없습니다: ${inner}`)
            }

            const classes = ['wikilink', `wikilink-${doc.kind}`]
            if (link.embed) classes.push('wikilink-embed')
            return linkNode(`${doc.url}${anchor}`, label, classes, inner, doc.title)
          },
        ],
      ],
      // 이미 링크인 곳 안에서는 다시 링크를 만들지 않는다.
      { ignore: ['link', 'linkReference', 'definition'] },
    )
  }
}

/** 같은 파일의 같은 링크에 대해서는 한 번만 알린다. */
function warnOnce(file: any, target: string, message: string) {
  const where = file?.history?.[0] ?? file?.path ?? '(unknown file)'
  const key = `${where}::${target}`
  if (!warned.has(key)) {
    warned.add(key)
    console.warn(`[wikilink] ${message} (${where})`)
  }
  file?.message?.(message, undefined, 'wikilink')
}

function linkNode(
  url: string,
  label: string,
  classNames: string[],
  raw: string,
  title?: string,
) {
  return {
    type: 'link',
    url,
    title: null,
    children: [{ type: 'text', value: label }],
    data: {
      hProperties: {
        className: classNames,
        'data-wikilink': raw,
        ...(title ? { 'data-wikilink-title': title } : {}),
      },
    },
  }
}

function brokenNode(label: string, raw: string, title: string) {
  return {
    type: 'wikilinkBroken',
    children: [{ type: 'text', value: label }],
    data: {
      hName: 'span',
      hProperties: {
        className: ['wikilink', 'wikilink-broken'],
        'data-wikilink': raw,
        title,
      },
    },
  }
}

export default remarkWikilink
