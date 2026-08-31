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
    { title: 'Blog', href: '/blog', description: '테마 미리보기용 더미 글 목록입니다.' },
    { title: 'Wiki', href: '/wiki', description: '테마 미리보기용 더미 위키 문서들입니다.' },
    { title: 'About', href: '/about', description: '테마 개발용 미리보기 사이트입니다.' },
  ],
  analytics: {},
  seo: {
    openGraph: true,
    twitterCard: 'summary_large_image',
  },
}

export default defineConfig({
  integrations: [blogTheme(devConfig)],
})
