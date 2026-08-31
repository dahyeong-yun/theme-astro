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
  title: string
  href: string
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
