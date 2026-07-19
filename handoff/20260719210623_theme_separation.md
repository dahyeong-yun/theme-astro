# 작업 인수인계 (Handoff) - 테마 및 컨텐츠 분리 구조 설계 및 구현

## Summary
이번 세션에서는 기존 Gatsby 블로그 구조에서 벗어나 Astro 기반의 독립적인 테마 패키지(`theme-astro`)와 컨텐츠 전용 블로그 레포(`polymorlog-blog`)를 성공적으로 구축하고 분리했습니다. `theme-astro`는 `astro.config.mjs`의 `integrations` 필드에 단 한 줄의 함수 선언만으로 모든 라우트, 스타일(Tokyo Night 다크테마), 마케팅 애널리틱스(Partytown GTM), SEO 및 RSS 등을 주입하는 Astro Integration 구조를 구현했으며, 컨텐츠 레포는 `blog.config.ts`와 포스팅용 MDX 컨텐츠만 관리하도록 격리하였습니다.

## Key Decisions
- **Gatsby 대신 Astro 5 전환**: Gatsby 생태계의 쇠퇴와 유지보수의 불안정성, 그리고 Astro의 `injectRoute` API 및 `virtual` 모듈을 통한 "한 줄 테마 선언" 캡슐화 완성도가 훨씬 높기 때문에 전환을 결정함.
- **가상 모듈 (`virtual:blog-config`) 도입**: `theme-astro` 컴포넌트가 특정 로컬 상대 경로에 의존하지 않고 독립적으로 작동할 수 있도록, Integration 빌드 시점에 블로그 설정을 Vite 가상 모듈로 주입하여 호환성을 극대화함.
- **독립 레포 구조**: 모노레포(Workspaces) 대신 완전한 독립 레포지토리 방식으로 분할하여 향후 테마의 패키지 배포 및 공유를 원활하게 만듦.

## Traps to Avoid
- **경로 의존성 주의**: 테마 컴포넌트 내부에서 `blog.config.ts`를 직접 import 하려 시도하면 경로 탐색 실패 에러가 발생합니다. 반드시 `'virtual:blog-config'` 가상 모듈을 통해 설정을 읽어야 합니다.
- **이미지 상대 경로 오류**: 포스트 MDX 본문에서 `../../assets/`와 같이 `src/` 하위를 직접 참조하는 상대 경로는 컨텐츠 레포 분리 시 깨지게 됩니다. 빌드 에러를 방지하려면 이미지를 `public/` 경로 하위나 웹 URL 형태로 참조하도록 변환하거나 content 폴더 내부에 함께 위치해야 합니다.
- **lightningcss 미니파이 에러**: CSS 변수 선언 시 클래스 지정 오류(`var(--bg-header) { ... }`)처럼 잘못된 CSS 구문이 `global.css` 끝에 삽입되면 lightningcss 컴파일러에서 "Invalid empty selector" 에러를 내며 빌드가 완전히 실패합니다.

## Working Agreements
- 변경을 커밋하기 전에 반드시 사용자의 검토를 거칩니다.
- 개발 서버는 `theme-astro`는 4321 포트, `polymorlog-blog`는 4322 포트로 포트를 명시적으로 지정하여 실행합니다.

## Relevant Files
- [/Users/dahyeung/Repositories/polymorph/publish/theme-astro/src/index.ts](file:///Users/dahyeung/Repositories/polymorph/publish/theme-astro/src/index.ts#L1-L60) - 테마 Integration 및 라우트 주입, `virtual:blog-config` 가상 모듈 주입 로직의 핵심 파일입니다.
- [/Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog/astro.config.mjs](file:///Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog/astro.config.mjs#L1-L7) - 블로그 레포의 설정 진입점으로, `blogTheme(config)` 한 줄 선언이 적용되어 있습니다.
- [/Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog/blog.config.ts](file:///Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog/blog.config.ts#L1-L32) - 사이트 정보, 테마(Shiki 등), 네비게이션, GTM 속성을 결정하는 단일 진입 설정 파일입니다.
- [/Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog/src/content.config.ts](file:///Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog/src/content.config.ts#L1-L10) - 테마 패키지로부터 `blogPostSchema`를 제공받아 content collections 타입을 구축하는 파일입니다.
- [/Users/dahyeung/Repositories/polymorph/publish/theme-astro/src/theme/styles/global.css](file:///Users/dahyeung/Repositories/polymorph/publish/theme-astro/src/theme/styles/global.css#L1-L169) - Tokyo Night 기반의 다크 테마 및 코드 하이라이트 레이아웃 스타일 가이드라인을 정의합니다.

## Open Work
- **컨텐츠 마이그레이션**: 기존 `dahyeong-yun.github.io`에서 작성된 실제 포스트들을 `polymorlog-blog/content/posts/` 하위로 마이그레이션 및 렌더링 확인 작업이 대기 중인 상태입니다.
- **테마 세부 컴포넌트 튜닝**: 기존 Gatsby 테마 수준의 UI 컴포넌트(태그 서브메뉴, 상세 스타일 등)를 `theme-astro` 내에서 추가적으로 튜닝해야 하는 상태입니다.
- **프로덕션 배포 파이프라인**: GitHub Actions 등을 연동하여 GitHub Pages 배포 파이프라인을 재정비해야 하는 상태입니다.

## Prompt for New Chat
```markdown
Astro 기반 블로그 테마 분리 프로젝트를 이어 진행해 주세요.
프로젝트는 `/Users/dahyeung/Repositories/polymorph/publish/theme-astro` (테마 레포지토리)와 `/Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog` (블로그 컨텐츠 레포지토리) 두 군데로 분할되어 있습니다.
이전 세션에서는 `theme-astro`를 Integration 형태(`src/index.ts`)로 구축하고, `polymorlog-blog`에서 이를 한 줄 선언(`astro.config.mjs`)하여 주입하고 `blog.config.ts`로 설정을 통합하였습니다.

아래 나열된 주요 코드와 설정 파일을 실제로 Read 도구로 모두 읽어 보십시오.
제공된 인수인계 요약본의 내용만 믿지 말고, 파일들의 소스 코드를 읽어 이 문서에서 주장하는 Integration 구조와 가상 모듈 바인딩(`virtual:blog-config`)이 코드 수준에서 어떻게 실제로 동작하고 있는지 직접 대조하여 검증하십시오.
검증이 끝나면 다음 작업을 시작하기 전에 저의 명확한 지시를 대기해 주십시오.

[검증 대상 파일 경로]
- `/Users/dahyeung/Repositories/polymorph/publish/theme-astro/src/index.ts`
- `/Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog/astro.config.mjs`
- `/Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog/blog.config.ts`
- `/Users/dahyeung/Repositories/polymorph/publish/polymorlog-blog/src/content.config.ts`
- `/Users/dahyeung/Repositories/polymorph/publish/theme-astro/src/theme/styles/global.css`
```
