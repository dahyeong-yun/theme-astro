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

여기에 [갈래](#갈래)(`content/branches/`)가 하나 더 있다. 글이라기보다 **글을 담는
상자**인데, 그 자체로 제목·설명·본문을 갖는 문서이기도 하다.

### 블로그 레포 설정

`src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { blogPostSchema, wikiPageSchema, pageSchema, branchSchema } from 'theme-astro'

export const collections = {
  posts: defineCollection({
    loader: glob({ base: './content/posts', pattern: '**/*.{md,mdx}' }),
    schema: blogPostSchema,
  }),
  wiki: defineCollection({
    loader: glob({ base: './content/wiki', pattern: '**/*.{md,mdx}' }),
    schema: wikiPageSchema,
  }),
  // 개념의 소속. 없으면 갈래 기능 전체가 조용히 꺼진다
  branches: defineCollection({
    loader: glob({ base: './content/branches', pattern: '**/*.{md,mdx}' }),
    schema: branchSchema,
  }),
  // About 처럼 날짜가 의미 없는 단독 페이지
  pages: defineCollection({
    loader: glob({ base: './content/pages', pattern: '**/*.{md,mdx}' }),
    schema: pageSchema,
  }),
}
```

스키마는 모두 `theme-astro` 에서 가져온다.

`branches` 를 빼도 빌드는 통과한다 — 색인이 빈 배열로 떨어지게 해 뒀다. 대신
[갈래](#갈래) 관련 화면이 전부 안 나오므로, 안 나온다면 여기부터 확인한다.

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
branches: [db-connection]            # 이 문서가 속한 갈래. 여러 개 적을 수 있다
tags: [db]
created: 2026-07-01
updated: 2026-08-20
status: seed | growing | evergreen   # 선택. 없으면 표시하지 않음
draft: false
---
```

위키 인덱스는 **폴더로 묶지 않는다.** 폴더는 파일을 어디 뒀는지일 뿐이라
화면에 드러내지 않는다. 문서를 묶는 축은 둘이다 — 개념의 소속은 [갈래](#갈래)가,
가로지르는 꼬리표는 `tags` 가 맡는다. 인덱스는 갈래 카드 + 제목순 전체 목록
(태그 필터 포함)으로 그린다.

`branches` 는 포스트 스키마에도 있지만 포스트 화면에는 계보가 붙지 않는다.
[갈래 — 아직 안 된 것](#아직-안-된-것) 참고.

## 갈래

문서가 **어느 개념 아래 있는가**를 나타내는 중첩 구조다. 태그를 대신한다.

| | 갈래 | 태그 | 시리즈 |
| --- | --- | --- | --- |
| 무엇 | 개념의 소속 | 가로지르는 꼬리표 | 읽는 순서 |
| 중첩 | `parent` 로 겹겹이 | 평평함 | 평평함 |
| 자기 설명 | 문서다 (제목·설명·본문) | 이름뿐 | 제목뿐 |
| 한 문서가 여럿에 | **된다** | 된다 | 하나만 |

### 갈래 만들기

갈래 하나가 파일 하나다. `content/branches/<id>.md` 이고, 파일명이 곧 id 다.

```yaml
---
title: DB 커넥션 다루기
description: 애플리케이션이 DB 커넥션을 얻고, 쥐고, 돌려주는 과정에서 생기는 문제들
parent: spring-runtime   # 없으면 최상위 갈래
order: 1                 # 형제 사이 순서. 없으면 제목 가나다순
slug: db-connection      # 선택. 없으면 id 를 URL 로 쓴다
draft: false
---

본문을 쓰면 갈래 페이지에 그대로 나온다. 이 영역이 무엇인지 적는 자리다.
```

문서는 frontmatter 한 줄로 들어간다. 값은 갈래의 **id**(파일명)다.

```yaml
branches: [db-connection]
```

**폴더는 보지 않는다.** `content/wiki/java-spring/jpa/` 에 있어도 `branches` 를
적지 않으면 어느 갈래에도 속하지 않는다. 어느 개념에 속하는지는 어디에 파일을
뒀는지와 다른 판단이라, 자동으로 옮기지 않는다.

### 한 문서가 여러 갈래에

지원한다. 배열에 여러 id 를 적으면 된다.

```yaml
branches: [jpa, db-connection]
```

이때 일어나는 일:

- 문서 머리의 계보 상자에 **계보가 여러 줄** 쌓인다 (`BranchTrail`).
- 그 문서가 **갈래 지도마다 각각** 잎으로 나타난다. 같은 문서가 두 지도에 있는 게 맞다.
- 갈래별 문서 수(`countDocs`)에 **양쪽 모두 잡힌다.** 사이트 전체 합계가 실제 문서
  수보다 커질 수 있는데, 소속이 여럿이라는 뜻이지 버그가 아니다.

### 갈래 페이지 (`/branch/<id>/`)

머리말에 자기 계보, 본문, 그다음 **갈래 지도**를 그린다. 지도는 자기 아래 서브트리를
통째로 편다 — 손자·증손자 갈래와 거기 엮인 문서까지 한 장에 들어온다.

- 담긴 게 하나라도 있으면 언제나 지도를 그린다.
- 하위 갈래가 **없을 때만** 지도 아래에 설명문 달린 문서 목록을 덧붙인다.
  갈래가 갈라지는 순간부터는 같은 문서를 두 번 늘어놓는 셈이라 지도만 남긴다.
- 아무것도 안 담긴 갈래는 빈 채로 두지 않고 안내 문구를 낸다. 자리를 먼저
  잡아 두는 순서를 허용하기 때문이다.

### 실수해도 문서가 사라지지 않게

- `parent` 에 없는 id 를 적으면 그 갈래는 **최상위로 올라간다.** 숨기지 않는다.
- `parent` 가 서로를 가리켜도 계보 계산은 멈춘다 (`ancestryOf` 의 순환 가드).
- 문서의 `branches` 에 없는 id 가 있으면 **그 값만 조용히 무시**한다.
- `branches` 컬렉션이 아예 없는 프로젝트에서도 빌드는 통과한다 (`safeCollection`).

### 아직 안 된 것

당장 고칠 필요는 없지만 알고 있어야 할 것들.

- **`/branch/` 인덱스가 없다.** 전체 갈래를 한 화면에 보는 자리가 없다.
  가장 가까운 건 `/wiki` 의 최상위 갈래 카드들이다.
- **포스트에는 계보가 안 붙는다.** `branches` 가 `blogPostSchema` 에 있고
  색인도 포스트를 읽지만, `BranchTrail` 은 `layouts/WikiPage.astro` 에만 달려 있다.
  포스트에도 붙이려면 `layouts/BlogPost.astro` 에 같은 줄을 넣으면 된다.
- **갈래 URL 은 평평하다.** `db-connection` 이 `spring-runtime` 아래여도
  `/branch/db-connection/` 이다. URL 이 계층을 담지 않는다.
- **지도에 검색·강조가 없다.** 갈래가 수십 개로 늘면 원하는 노드를 눈으로 찾아야 한다.

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

**파비콘** — 블로그 레포의 `public/` 에 둔다. 테마는 경로만 연결한다.

| 파일 | 쓰임 |
| --- | --- |
| `favicon.svg` | 브라우저 탭 (최신 브라우저가 우선 사용) |
| `favicon.ico` | 구형 브라우저 폴백. 16/32/48 을 담는다 |
| `apple-touch-icon.png` | iOS 홈 화면. 180×180. 없으면 화면 캡처가 아이콘이 된다 |

**공유 카드 이미지** — 아래 순서로 정해진다.

1. frontmatter 의 `ogImage`
2. (글) frontmatter 의 `banner`
3. `seo.defaultImage`

셋 다 없으면 이미지 태그를 아예 넣지 않는다(`twitter:card` 도 `summary` 로 내려간다).
없는 파일을 가리키면 카드가 깨진 채로 공유되기 때문에, 비워 두는 편이 낫다.
경로는 사이트 루트 기준(`/og-default.png`)으로 적고, 크롤러가 읽을 수 있도록
절대 URL 로 변환해 내보낸다.

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

### 갈래 지도를 건드릴 때

`components/BranchMap.astro` 하나에 마크업·스크립트가 다 들어 있다. 외부 라이브러리는
쓰지 않는다 (d3 없음). 손대기 전에 알아야 할 것들:

- **배치는 브라우저에서 한다.** 서버는 중첩 `<ul>` 만 내보내고 스크립트가 그걸 읽어
  SVG 를 세운다. 접으면 남은 노드 자리를 다시 계산해야 해서, 미리 그려 둔 SVG 로는
  접기가 안 되기 때문이다. 그 `<ul>` 이 JS 가 꺼진 환경의 최종 모습이기도 하므로
  **지우지 말 것.** 같은 자료를 JSON 으로 또 심지 않는 이유이기도 하다.
- **스타일은 `styles/global.css` 에 있다.** Astro 의 스코프 스타일은 컴파일 때 마크업에
  `data-astro-cid-*` 를 박는 방식이라 **스크립트가 나중에 만든 요소에는 안 붙는다.**
  지도의 노드는 전부 JS 가 만들므로 컴포넌트 `<style>` 에 두면 조용히 빠진다.
  `.mermaid-diagram` 이 거기 사는 것과 같은 이유다.
- **색은 반드시 CSS 변수로.** SVG 속성에 색을 굽지 않으면 테마를 바꿔도 다시 그릴
  필요가 없다. mermaid 는 색을 인라인해서 테마마다 재렌더하는데, 지도는 그게 필요 없다.
- **자리 폭이 0 으로 잡히는 순간이 있다.** 스크립트가 레이아웃보다 먼저 돌 때다.
  그 폭으로 배율을 내면 최소값에 눌려 굳으므로 1 로 두고 `ResizeObserver` 가 고친다.
- **`requestAnimationFrame` 은 숨은 탭에서 멈춘다.** 접기 애니메이션이 안 끝난 것처럼
  보여도 탭이 보이면 이어서 끝난다. 헤드리스로 검증할 때 헷갈리는 지점이다.
- **맞춤 배율에 바닥(`MIN_FIT`)이 있다.** 좁은 화면에서 전부 우겨넣으면 글자가
  6px 까지 줄어 못 읽는다. 다 보이는 것보다 읽히는 게 먼저고, 나머지는 끌어서 본다.

### `.prose` 안에 무언가를 넣을 때

`global.css` 의 `p` / `li` 는 본문 타이포그래피를 **절대값으로** 박아 둔다
(`font-size: 17px`, 자간, 색). `.prose` 안에 UI 조각을 넣으면 그게 그대로 새어 든다.
계보 상자(`BranchTrail`)가 한동안 본문과 같은 크기로 나와 설명문처럼 보였던 게 이것
때문이었다. 부모에 크기를 줘도 `li` 는 자기 규칙을 쓰므로, **조각 안의 `li`·`a` 에서
직접 되돌려야 한다.** mermaid 라벨도 같은 이유로 `global.css` 에 되돌리는 규칙이 있다.

## 구조

```text
src/
├── index.ts                       # Astro 통합 진입점 (라우트 주입, 플러그인 등록)
├── content.config.ts              # 테마 자체 미리보기용 컬렉션 정의
└── theme/
    ├── pages/                     # 모든 라우트. injectRoute 로만 들어간다
    │   └── branch/[...slug].astro # 갈래 페이지
    ├── layouts/                   # BlogPost, WikiPage
    ├── components/
    │   ├── BranchMap.astro        # 갈래 지도 (마크업 + 클라이언트 배치 스크립트)
    │   ├── BranchMapTree.astro    # 지도의 원본이 되는 중첩 <ul> (재귀)
    │   └── BranchTrail.astro      # 문서 머리의 계보 상자
    ├── lib/
    │   ├── wikilink.ts            # 위키링크 파싱·해석 (순수 로직)
    │   ├── fs-docs.ts             # remark 단계용 fs 기반 색인
    │   ├── collection-docs.ts     # 페이지 단계용 astro:content 기반 색인 + 백링크
    │   ├── branches.ts            # 갈래 트리 + 문서→계보 색인
    │   └── drafts.ts              # 초안을 화면에 낼지 한 곳에서 정한다
    ├── plugins/
    │   └── remark-wikilink.ts
    ├── schemas/                   # post.ts, wiki.ts, branch.ts
    └── styles/global.css
```
