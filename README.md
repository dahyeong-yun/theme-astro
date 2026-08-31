# theme-astro

Astro 블로그 테마. 라우트·레이아웃·스키마를 테마가 모두 소유하고, 블로그 레포는
`blog.config.ts` 와 `content/` 만 들고 있으면 된다.

## 브랜치

| 브랜치 | 성격 |
| --- | --- |
| `main` | 애플 스타일 미니멀 문서형 베이스 |
| `neob` | 네오브루탈리즘 |
| `garden` | 미니멀 문서형 + 옵시디언 위키링크 + 포스트/위키 분리 |

블로그 레포에서는 `package.json` 의 의존성으로 브랜치를 고른다.

```json
"theme-astro": "github:dahyeong-yun/theme-astro#garden"
```

## 문서 두 종류

| | 포스트 | 위키 |
| --- | --- | --- |
| 성격 | 나의 통찰·경험·생각 | 정리된 정보 |
| 위치 | `content/posts/` | `content/wiki/` |
| 라우트 | `/blog/...` | `/wiki/...` |
| 기준 시각 | `date` (쓴 날) | `updated` (마지막으로 손댄 날) |
| 컬렉션 | `posts` | `wiki` |

두 컬렉션은 서로 자유롭게 링크할 수 있고, 백링크도 종류를 가리지 않는다.

### 블로그 레포 설정

`src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { blogPostSchema, wikiPageSchema } from 'theme-astro'

export const collections = {
  posts: defineCollection({
    loader: glob({ base: './content/posts', pattern: '**/*.{md,mdx}' }),
    schema: blogPostSchema,
  }),
  wiki: defineCollection({
    loader: glob({ base: './content/wiki', pattern: '**/*.{md,mdx}' }),
    schema: wikiPageSchema,
  }),
  // About 처럼 날짜가 의미 없는 단독 페이지
  pages: defineCollection({
    loader: glob({ base: './content/pages', pattern: '**/*.{md,mdx}' }),
    schema: pageSchema,
  }),
}
```

`import { blogPostSchema, wikiPageSchema, pageSchema } from 'theme-astro'` 로 가져온다.

`/about` 본문은 `content/pages/about.md` 에서 온다. 블로그마다 다를 수밖에 없는
글을 테마가 들고 있으면 고칠 수가 없다. frontmatter 의 `title` / `description` 을
적으면 `navigation` 에 적은 값보다 우선한다.

`blog.config.ts`:

```ts
const config: BlogConfig = {
  // ...
  navigation: [
    // description 은 그 페이지 제목 아래 한 줄 설명으로 들어간다.
    // 적지 않으면 설명 줄을 그리지 않는다.
    { title: 'Blog',   href: '/blog',   description: '겪은 일과 그때 한 생각을 남깁니다.' },
    { title: 'Wiki',   href: '/wiki',   description: '정리해 둔 정보성 문서들. 계속 고쳐 씁니다.' },
    { title: 'Series', href: '/series', description: '이어서 읽으면 좋은 글들을 묶었습니다.' },
    { title: 'About',  href: '/about' },
  ],
  content: {
    postsPerPage: 10,     // /blog 한 쪽에 보여줄 글 수. 기본 10
  },
  wiki: {
    enabled: true,        // false 면 /wiki 라우트를 만들지 않는다
    basePath: '/wiki',
    contentDir: 'content/wiki',
    title: 'Wiki',
    description: '정리해 둔 정보성 문서 모음.',
  },
}
```

### 페이지 머리말 문구

각 페이지 제목과 그 아래 한 줄 설명은 `navigation` 에서 온다.
메뉴 이름과 설명이 한 곳에 모여 있어야 고칠 때 헤매지 않는다.

| 항목 | 쓰임 |
| --- | --- |
| `title` | 내비게이션에 보이는 이름 겸 페이지 제목 |
| `description` | 페이지 제목 아래 한 줄 설명. 없으면 설명 줄을 그리지 않는다 |
| `pageTitle` | 내비에는 짧게, 페이지에서는 길게 쓰고 싶을 때만 |

`/wiki` 는 `navigation` 에 적은 값을 먼저 보고, 없으면 `wiki.title` / `wiki.description`
을 쓴다. 위키를 메뉴에 두지 않는 경우를 위한 것이다.

`site.timeZone` 은 날짜 표기에 쓸 시간대다. 지정하지 않으면 UTC 를 쓴다.
정적 빌드라 빌드 머신(로컬 KST / CI UTC)에 따라 표기가 흔들리지 않도록 고정해 둔다.

### frontmatter

포스트 (`content/posts/**/index.mdx`):

```yaml
---
title: 글 제목
date: 2026-08-01
updated: 2026-08-20        # 고쳐 쓴 글에만. 적었을 때만 '고쳐 씀'으로 표시된다
description: 한 줄 요약
tags: [java, spring]
aliases: [다른 이름]     # 위키링크에서 이 글을 부를 수 있는 이름
series: 시리즈명
seriesOrder: 1
draft: false
---
```

### 날짜 표기

- `date` 에 날짜만 적으면(`date: 2026-08-30`) 없는 시각을 00:00:00 으로 지어내지 않고,
  그 파일이 저장소에 처음 커밋된 시각을 빌려 쓴다. 시각까지 정하고 싶으면
  `date: 2026-08-30 21:30:00` 처럼 적으면 그 값이 그대로 나온다.
- `updated` 는 **직접 적었을 때만** 표시된다. git 커밋 이력에서 자동으로 뽑지 않는다.
  오타 하나 고쳐도 전부 '업데이트'로 찍히면 그 표시는 아무 뜻도 갖지 못하기 때문이다.
  정말 고쳐 쓴 글에만 적는다.

위키 (`content/wiki/**/*.md`):

```yaml
---
title: 문서 제목
description: 한 줄 요약
aliases: [다른 이름, another name]
tags: [db]
created: 2026-07-01
updated: 2026-08-20
status: seed | growing | evergreen   # 선택. 없으면 표시하지 않음
draft: false
---
```

위키 인덱스는 `content/wiki/` 의 **최상위 폴더명**으로 문서를 묶는다.
루트에 바로 놓인 문서는 `기타` 로 간다.

## 위키링크

옵시디언 문법 그대로 쓴다.

| 쓰는 법 | 결과 |
| --- | --- |
| `[[문서명]]` | 해당 문서로 가는 링크 |
| `[[문서명\|보여줄 이름]]` | 별칭 링크 |
| `[[문서명#헤딩]]` | 문서 안 헤딩 앵커까지 |
| `[[#헤딩]]` | 같은 문서 안 이동 |
| `![[문서명]]` | 임베드는 지원하지 않아 링크로 낮춰 렌더링 |

`[[문서명]]` 자리에는 이 셋 중 아무거나 쓸 수 있고, 위에서부터 먼저 맞는 걸 고른다.

1. 전체 경로 — `[[java-spring/stack-vs-chm]]`
2. 파일명 — `[[stack-vs-chm]]` (`폴더/index.mdx` 는 폴더명이 파일명 역할)
3. `title` 또는 `aliases` — `[[낙관적 락]]`

대소문자는 구분하지 않는다. 코드 블록·인라인 코드·이미 링크인 곳 안에서는
링크로 바뀌지 않는다.

대상 문서가 없거나 초안이면 링크 대신 `.wikilink-broken` 으로 렌더링하고
빌드 로그에 경고를 찍는다.

## 페이지 구조

색인 페이지(`/`, `/blog`, `/wiki`, `/series`, `/about`)는 모두 같은 뼈대를 쓴다.
페이지마다 제목 크기와 여백을 따로 정하면 사이트가 중구난방이 된다.

| 요소 | 담당 |
| --- | --- |
| 읽기 폭 | `--content-width` (global.css) |
| 바깥 여백·폭 | `.page` / `.doc-layout` (global.css) |
| 제목·설명 | `PageHeader.astro` → `.page-head` |
| 묶음 제목 | `.section-title` |
| 문서 줄 목록 | `DocList.astro` → `.doc-list` |
| 쪽 이동 | `Pagination.astro` |

목록 페이지(`.page`)와 글 페이지(`.doc-layout`)는 같은 `--content-width` 를 쓴다.
목록에서 글로 들어갈 때 글 상자가 좌우로 흔들리면 안 되기 때문이다.
목차를 본문과 나란히 놓고 둘을 함께 가운데 정렬하면 목차 너비의 절반만큼 본문이
밀리므로, `.doc-layout` 은 가운데 칸에 본문을 두고 양옆을 같은 비율로 벌린 뒤
목차를 오른쪽 여백에 얹는다. 오른쪽 여백이 목차를 담지 못하는 폭(1180px 이하)
부터는 목차가 본문 위로 접혀 들어간다.

헤더 안의 조작 요소(내비 링크, 테마 토글)는 `--header-control-size` /
`--header-control-radius` 를 공유한다. 하나만 원형이거나 하나만 각지면
그 줄이 통째로 엉성해 보인다. 활성 상태에서 글자 굵기를 바꾸지 않는 것도
같은 이유다 — 굵어지면 칸 너비가 늘어 내비 전체가 미세하게 밀린다.

## 검색·공유 (SEO)

| | 상태 |
| --- | --- |
| `sitemap-index.xml` | `@astrojs/sitemap` 이 자동 생성 |
| `robots.txt` | 테마가 생성. sitemap 위치를 함께 알린다. `seo.robots: false` 로 끌 수 있다 |
| canonical URL | 모든 페이지 |
| Open Graph / Twitter Card | `seo.openGraph`, `seo.twitterCard` |
| RSS | `/rss.xml` |

글 페이지는 `og:type: article` 과 `article:published_time` / `article:modified_time` 을
함께 내보낸다. 목록·소개 페이지는 `website` 다.

**설명문(description)** — frontmatter 에 적으면 그것을 쓰고, 없으면 본문 앞부분에서
자동으로 뽑는다. 적지 않은 글이 모두 사이트 기본 설명으로 나가면 검색 결과와 공유
카드에서 글끼리 구분되지 않기 때문이다. 직접 적은 문장이 언제나 더 낫다.

**공유 카드 이미지** — `seo.defaultImage` 에 경로를 적으면 그 이미지를 쓴다.
적지 않으면 이미지 태그를 아예 넣지 않는다. 없는 파일을 가리키면 카드가 깨진 채로
공유되기 때문에, 비워 두는 편이 낫다.

## 백링크

각 문서 하단에 그 문서를 `[[...]]` 로 가리키는 문서 목록이 자동으로 붙는다.
가리키는 문서가 없으면 아무것도 그리지 않는다. 포스트·위키 모두 적용된다.

## 개발

```sh
npm install
npm run dev
```

`content/` 아래에 미리보기용 더미 문서가 들어 있다. 실제 글이 아니라
위키링크·백링크 렌더링을 눈으로 확인하기 위한 픽스처다.

## 구조

```text
src/
├── index.ts                       # Astro 통합 진입점 (라우트 주입, 플러그인 등록)
├── content.config.ts              # 테마 자체 미리보기용 컬렉션 정의
└── theme/
    ├── pages/                     # 모든 라우트. injectRoute 로만 들어간다
    ├── layouts/                   # BlogPost, WikiPage
    ├── components/
    ├── lib/
    │   ├── wikilink.ts            # 위키링크 파싱·해석 (순수 로직)
    │   ├── fs-docs.ts             # remark 단계용 fs 기반 색인
    │   └── collection-docs.ts     # 페이지 단계용 astro:content 기반 색인 + 백링크
    ├── plugins/
    │   └── remark-wikilink.ts
    ├── schemas/                   # post.ts, wiki.ts
    └── styles/global.css
```
