export interface SiteConfig {
  title: string
  description: string
  url: string
  author: string
  language: string
  /**
   * 날짜 표기에 쓰는 시간대(IANA 이름, 예: 'Asia/Seoul').
   * 지정하지 않으면 UTC. 빌드 머신의 시간대에 결과가 흔들리지 않도록 고정해 둔다.
   */
  timeZone?: string
}

export interface ThemeConfig {
  colorScheme: 'light' | 'dark' | 'auto'
  codeTheme: string   // Shiki 테마 이름
  fontFamily: string
}

export interface NavItem {
  /** 내비게이션에 보이는 이름 */
  title: string
  href: string
  /**
   * 그 페이지 제목 아래에 붙는 한 줄 설명.
   * 적지 않으면 설명 줄을 그리지 않는다.
   */
  description?: string
  /**
   * 페이지 제목. 내비에 짧게 쓰고 페이지에서는 길게 쓰고 싶을 때만 적는다.
   * 적지 않으면 title 을 그대로 쓴다.
   */
  pageTitle?: string
}

export interface GtmConfig {
  id: string
  includeInDevelopment?: boolean
}

export interface GaConfig {
  id: string
  includeInDevelopment?: boolean
}

export interface AnalyticsConfig {
  gtm?: GtmConfig
  ga?: GaConfig
}

export interface SeoConfig {
  openGraph?: boolean
  twitterCard?: 'summary' | 'summary_large_image'
  /**
   * 공유 카드 기본 이미지. 사이트 루트 기준 경로(예: '/og-default.png').
   * 지정하지 않으면 이미지 태그를 넣지 않는다 —
   * 없는 파일을 가리키면 카드가 깨진 채로 공유된다.
   */
  defaultImage?: string
  /** robots.txt 를 만들지 여부. 기본값 true */
  robots?: boolean
}

export interface WikiConfig {
  /** 위키 라우트(/wiki) 활성화 여부. 기본값 true */
  enabled?: boolean
  /** URL 접두사. 기본값 '/wiki' */
  basePath?: string
  /** 콘텐츠 디렉터리. 프로젝트 루트 기준 상대 경로. 기본값 'content/wiki' */
  contentDir?: string
  /** 위키 인덱스 페이지 제목. 기본값 'Wiki' */
  title?: string
  /** 위키 인덱스 페이지 설명 */
  description?: string
}

export interface ContentConfig {
  /** 포스트 콘텐츠 디렉터리. 기본값 'content/posts' */
  postsDir?: string
  /** 목록 한 쪽에 보여줄 글 수. 기본값 10 */
  postsPerPage?: number
}

export interface BlogConfig {
  site: SiteConfig
  theme: ThemeConfig
  navigation: NavItem[]
  analytics?: AnalyticsConfig
  seo?: SeoConfig
  content?: ContentConfig
  wiki?: WikiConfig
}
