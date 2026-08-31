import type { APIRoute } from 'astro'

/**
 * robots.txt.
 *
 * 없어도 크롤러는 사이트를 읽는다. 다만 sitemap 위치를 알려줄 자리가 없어져
 * 검색엔진이 페이지 목록을 스스로 찾아 헤매야 한다. 한 줄이면 끝나는 일이다.
 */
export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL('sitemap-index.xml', site).href : '/sitemap-index.xml'
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n')

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
