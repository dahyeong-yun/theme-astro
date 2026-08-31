import partytown from '@astrojs/partytown'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { unified } from '@astrojs/markdown-remark'
import _remarkMath from 'remark-math'
import _rehypeKatex from 'rehype-katex'
import type { AstroIntegration } from 'astro'
import type { BlogConfig } from './theme/types.js'
import type { CollectionSource } from './theme/lib/fs-docs.js'
import { invalidateFsDocs } from './theme/lib/fs-docs.js'
import { remarkWikilink } from './theme/plugins/remark-wikilink.js'

import { execSync } from 'child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const remarkMath = (_remarkMath as any).default || _remarkMath
const rehypeKatex = (_rehypeKatex as any).default || _rehypeKatex

export const DEFAULT_POSTS_DIR = 'content/posts'
export const DEFAULT_WIKI_DIR = 'content/wiki'
export const DEFAULT_WIKI_BASE = '/wiki'

/**
 * 테마 페이지의 절대 경로를 만든다.
 *
 * 페이지를 src/pages 가 아닌 src/theme/pages 에 두는 이유는,
 * 이 레포에서 테마를 직접 띄울 때 Astro 가 src/pages 를 자동 라우팅해서
 * injectRoute 로 넣은 같은 파일과 라우트가 충돌하기 때문이다.
 * 모든 라우트는 injectRoute 한 곳으로만 들어온다.
 *
 * 경로를 'theme-astro/src/pages/...' 같은 패키지명 문자열로 주면 자기 자신이
 * node_modules 에 없는 이 레포에서는 풀리지 않는다. import.meta.url 기준으로
 * 잡으면 테마 레포와 블로그 레포 양쪽에서 같은 파일을 가리킨다.
 */
function themePage(relative: string): string {
  return fileURLToPath(new URL(`./theme/pages/${relative}`, import.meta.url))
}

function remarkModifiedTime() {
  return function (tree: any, file: any) {
    const filepath = file.history[0]
    if (!filepath) return
    try {
      const result = execSync(`git log -1 --pretty=format:%aI -- "${filepath}"`)
      const dateStr = result.toString().trim()
      if (dateStr) {
        file.data.astro.frontmatter.lastModified = dateStr
      }
    } catch (e) {
      // ignore
    }
  }
}

export function blogTheme(config: BlogConfig): AstroIntegration {
  const wikiEnabled = config.wiki?.enabled !== false
  const wikiBase = (config.wiki?.basePath ?? DEFAULT_WIKI_BASE).replace(/\/+$/, '')

  return {
    name: 'theme-astro',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig, config: astroConfig }) => {
        const root = fileURLToPath(astroConfig.root)
        const postsDir = path.resolve(root, config.content?.postsDir ?? DEFAULT_POSTS_DIR)
        const wikiDir = path.resolve(root, config.wiki?.contentDir ?? DEFAULT_WIKI_DIR)

        // 위키링크 해석에 쓰는 콘텐츠 소스 목록.
        // remark 단계는 콘텐츠 컬렉션보다 먼저 돌기 때문에 경로를 직접 넘겨준다.
        const sources: CollectionSource[] = [
          { kind: 'post', dir: postsDir, base: '/blog' },
          ...(wikiEnabled ? [{ kind: 'wiki' as const, dir: wikiDir, base: wikiBase }] : []),
        ]

        const remarkPlugins = [
          remarkMath,
          remarkModifiedTime,
          [remarkWikilink, { sources }] as const,
        ]

        // 모든 라우트를 테마가 소유 → 블로그 레포에 page 파일 불필요
        injectRoute({
          pattern: '/',
          entrypoint: themePage('index.astro'),
        })
        injectRoute({
          pattern: '/blog',
          entrypoint: themePage('blog/index.astro'),
        })
        injectRoute({
          pattern: '/blog/page/[page]',
          entrypoint: themePage('blog/page/[page].astro'),
        })
        injectRoute({
          pattern: '/blog/[...slug]',
          entrypoint: themePage('blog/[...slug].astro'),
        })
        injectRoute({
          pattern: '/about',
          entrypoint: themePage('about.astro'),
        })
        injectRoute({
          pattern: '/rss.xml',
          entrypoint: themePage('rss.xml.js'),
        })
        injectRoute({
          pattern: '/series',
          entrypoint: themePage('series/index.astro'),
        })
        injectRoute({
          pattern: '/series/[slug]',
          entrypoint: themePage('series/[slug].astro'),
        })

        if (wikiEnabled) {
          injectRoute({
            pattern: wikiBase,
            entrypoint: themePage('wiki/index.astro'),
          })
          injectRoute({
            pattern: `${wikiBase}/[...slug]`,
            entrypoint: themePage('wiki/[...slug].astro'),
          })
        }

        // blog.config를 virtual:blog-config 가상 모듈로 주입
        // → 테마 컴포넌트들이 경로에 무관하게 설정을 읽을 수 있음
        const serializedConfig = JSON.stringify(config, null, 2)

        updateConfig({
          site: config.site.url,
          output: 'static',
          integrations: [
            mdx({
              remarkPlugins: remarkPlugins as any,
              rehypePlugins: [rehypeKatex],
            }),
            sitemap(),
            ...((config.analytics?.gtm?.id || config.analytics?.ga?.id)
              ? [
                  partytown({
                    config: {
                      forward: ['dataLayer.push', 'gtag'],
                    },
                  }),
                ]
              : []),
          ],
          markdown: {
            // Astro 7 의 기본 처리기(Sätteri)는 remark/rehype 플러그인을 돌리지 않는다.
            // .mdx 는 mdx() 통합이 unified 로 처리하지만 .md 는 여기서 지정해 줘야
            // 위키링크·수식·수정시각 플러그인이 동일하게 적용된다.
            processor: unified({
              remarkPlugins: remarkPlugins as any,
              rehypePlugins: [rehypeKatex],
            }),
            shikiConfig: {
              theme: config.theme?.codeTheme ?? 'tokyo-night',
              wrap: true,
            },
          },
          vite: {
            plugins: [
              {
                name: 'virtual:blog-config',
                resolveId(id: string) {
                  if (id === 'virtual:blog-config') return '\0virtual:blog-config'
                },
                load(id: string) {
                  if (id === '\0virtual:blog-config') {
                    return `export default ${serializedConfig}`
                  }
                },
              },
              {
                // 콘텐츠 파일이 추가·삭제·수정되면 위키링크 색인을 다시 만든다.
                // (dev 서버에서 새 문서를 만들자마자 링크가 붙도록)
                name: 'theme-astro:wikilink-index',
                configureServer(server: any) {
                  const isContentFile = (file: string) =>
                    /\.(md|mdx)$/i.test(file) &&
                    sources.some((s) => file.startsWith(s.dir))
                  for (const event of ['add', 'unlink', 'change'] as const) {
                    server.watcher.on(event, (file: string) => {
                      if (isContentFile(file)) invalidateFsDocs()
                    })
                  }
                },
              },
            ],
          },
        })
      },
    },
  }
}

export type { BlogConfig, WikiConfig, ContentConfig } from './theme/types.js'
export { blogPostSchema } from './theme/schemas/post.js'
export { wikiPageSchema } from './theme/schemas/wiki.js'
