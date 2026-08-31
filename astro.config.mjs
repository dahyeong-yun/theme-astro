// @ts-check
// 테마 개발용 config — 블로그 레포를 흉내낸 구조
import { defineConfig } from 'astro/config'
import { blogTheme } from './src/index.ts'

/** @type {import('./src/theme/types').BlogConfig} */
const devConfig = {
  site: {
    title: 'theme-astro (dev)',
    description: '테마 개발용 미리보기',
    url: 'http://localhost:4321/',
    author: '@polymorph1216',
    language: 'ko',
  },
  theme: {
    colorScheme: 'dark',
    codeTheme: 'tokyo-night',
    fontFamily: 'Pretendard',
  },
  navigation: [
    { title: 'Blog', href: '/blog' },
    { title: 'Wiki', href: '/wiki' },
    { title: 'About', href: '/about' },
  ],
  wiki: {
    title: 'Wiki',
    description: '정리해 둔 정보성 문서 모음. 계속 고쳐 씁니다.',
  },
  analytics: {},
  seo: {
    openGraph: true,
    twitterCard: 'summary_large_image',
  },
}

export default defineConfig({
  integrations: [blogTheme(devConfig)],
})
