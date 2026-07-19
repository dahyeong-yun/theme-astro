import { getCollection } from 'astro:content'
import rss from '@astrojs/rss'
import config from 'virtual:blog-config'

export async function GET(context) {
  const posts = await getCollection('posts')
  return rss({
    title: config.site.title,
    description: config.site.description,
    site: context.site,
    items: posts
      .filter((p) => !p.data.draft)
      .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description ?? '',
        pubDate: post.data.date,
        link: `/blog/${post.id}/`,
      })),
  })
}
