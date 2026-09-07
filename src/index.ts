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

        const remarkPlugins = [remarkMath, [remarkWikilink, { sources }] as const]

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
        if (config.seo?.robots !== false) {
          injectRoute({
            pattern: '/robots.txt',
            entrypoint: themePage('robots.txt.ts'),
          })
        }
        injectRoute({
          pattern: '/series',
          entrypoint: themePage('series/index.astro'),
        })
        injectRoute({
          pattern: '/series/[slug]',
          entrypoint: themePage('series/[slug].astro'),
        })
        // 갈래: 개념의 소속을 담는 상자. 상자 자체가 문서라서 라우트를 가진다.
        injectRoute({
          pattern: '/branch/[...slug]',
          entrypoint: themePage('branch/[...slug].astro'),
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
            // remark/rehype 플러그인은 아래 markdown.processor 한 곳에서만 정한다.
            // mdx() 는 extendMarkdownConfig 기본값(true)으로 그 processor 를 그대로
            // 물려받는다. 여기에 다시 적으면 deprecation 경고가 나고 설정 자리가 둘로 갈라진다.
            mdx(),
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
            // .md 는 여기서 처리기를 지정해 줘야 위키링크·수식 플러그인이 걸리고,
            // .mdx 는 mdx() 가 이 processor 를 물려받아 같은 파이프라인을 쓴다.
            // 플러그인을 추가할 곳은 여기 하나뿐이다.
            processor: unified({
              remarkPlugins: remarkPlugins as any,
              rehypePlugins: [rehypeKatex],
            }),
            // shiki 를 건너뛴 언어는 <pre><code class="language-X"> 원본 그대로 남는다.
            // mermaid 는 그 원본이 있어야 브라우저에서 그림으로 바꿀 수 있다(MermaidScript).
            // 이 설정은 .md 와 .mdx 가 함께 읽는 공유 설정이라 한 번만 적으면 된다.
            // 'math' 는 Astro 의 기본 제외 목록이라 명시적으로 다시 적어 준다.
            syntaxHighlight: {
              type: 'shiki',
              excludeLangs: ['math', 'mermaid'],
            },
            shikiConfig: {
              theme: config.theme?.codeTheme ?? 'tokyo-night',
              wrap: true,
            },
          },
          vite: {
            // mermaid 는 테마의 의존성이다. 블로그 레포 기준으로는 바로 풀리지 않아
            // 'mermaid' 라고만 적으면 해석 실패 경고가 난다. 'theme-astro > mermaid' 는
            // 테마를 먼저 찾고 그 안에서 mermaid 를 찾는 중첩 표기라 양쪽에서 다 풀린다.
            // 미리 번들에 넣어 두지 않으면 첫 다이어그램 페이지에서 Vite 가
            // 의존성을 다시 최적화하며 페이지를 통째로 새로고침한다.
            optimizeDeps: { include: ['theme-astro > mermaid'] },
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
export { pageSchema } from './theme/schemas/page.js'
export { branchSchema } from './theme/schemas/branch.js'
