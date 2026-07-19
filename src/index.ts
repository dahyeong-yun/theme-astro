import partytown from '@astrojs/partytown'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import type { AstroIntegration } from 'astro'
import type { BlogConfig } from './theme/types.js'

export function blogTheme(config: BlogConfig): AstroIntegration {
  return {
    name: 'theme-astro',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig }) => {
        // 모든 라우트를 테마가 소유 → 블로그 레포에 page 파일 불필요
        injectRoute({
          pattern: '/',
          entrypoint: 'theme-astro/src/pages/index.astro',
        })
        injectRoute({
          pattern: '/blog',
          entrypoint: 'theme-astro/src/pages/blog/index.astro',
        })
        injectRoute({
          pattern: '/blog/[...slug]',
          entrypoint: 'theme-astro/src/pages/blog/[...slug].astro',
        })
        injectRoute({
          pattern: '/rss.xml',
          entrypoint: 'theme-astro/src/pages/rss.xml.js',
        })

        // blog.config를 virtual:blog-config 가상 모듈로 주입
        // → 테마 컴포넌트들이 경로에 무관하게 설정을 읽을 수 있음
        const serializedConfig = JSON.stringify(config, null, 2)

        updateConfig({
          site: config.site.url,
          output: 'static',
          integrations: [
            mdx(),
            sitemap(),
            ...(config.analytics?.gtm?.id
              ? [partytown({ config: { forward: ['dataLayer.push'] } })]
              : []),
          ],
          markdown: {
            shikiConfig: {
              theme: config.theme?.codeTheme ?? 'tokyo-night',
              wrap: false,
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
            ],
          },
        })
      },
    },
  }
}

export type { BlogConfig } from './theme/types.js'
export { blogPostSchema } from './theme/schemas/post.js'
