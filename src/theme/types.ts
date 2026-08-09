export interface SiteConfig {
  title: string
  description: string
  url: string
  author: string
  language: string
  footerDescription?: string
  heroDescription?: string
  heroBadge?: string
  marqueeText?: string[]
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

export interface BlogConfig {
  site: SiteConfig
  theme: ThemeConfig
  navigation: NavItem[]
  analytics?: AnalyticsConfig
  seo?: SeoConfig
}
