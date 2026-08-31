import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { blogPostSchema } from './theme/schemas/post.js'
import { wikiPageSchema } from './theme/schemas/wiki.js'

// 포스트: 나의 통찰·경험·생각이 담긴 글. 발행일 기준으로 흐른다.
const posts = defineCollection({
  loader: glob({ base: './content/posts', pattern: '**/*.{md,mdx}' }),
  schema: blogPostSchema,
})

// 위키: 정리된 정보 위주의 문서. 갱신일 기준으로 자란다.
const wiki = defineCollection({
  loader: glob({ base: './content/wiki', pattern: '**/*.{md,mdx}' }),
  schema: wikiPageSchema,
})

export const collections = { posts, wiki }
