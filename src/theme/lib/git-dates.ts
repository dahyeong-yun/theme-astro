/**
 * 콘텐츠 파일이 언제 저장소에 들어왔는지 git 에서 읽는다.
 *
 * frontmatter 에 `date: 2026-08-30` 처럼 날짜만 적으면 시각 정보가 없다.
 * 그 자리를 00:00:00 으로 채우는 대신, 그 글이 처음 커밋된 시각을 쓴다.
 *
 * 파일마다 git 을 부르면 느리니 한 번의 git log 로 전체 지도를 만들어 캐시한다.
 * 파일이 이름을 바꿔 온 경우에는 이름을 바꾼 커밋이 최초 커밋으로 잡힌다.
 * (--follow 는 경로 하나에만 쓸 수 있어 일괄 조회와 함께 쓸 수 없다.)
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'

let createdMap: Map<string, Date> | null = null

interface CommitEntry {
  time: Date
  /** 'A' 는 [경로], 'R'/'C' 는 [옛 경로, 새 경로] */
  status: string
  paths: string[]
}

function readLog(): CommitEntry[] {
  let out: string
  try {
    out = execFileSync(
      'git',
      ['log', '-M', '-C', '--diff-filter=ARC', '--name-status', '--format=%x00%aI'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    )
  } catch {
    // git 이 없거나 저장소가 아니면 조용히 포기한다. 날짜만 표기될 뿐이다.
    return []
  }

  const entries: CommitEntry[] = []
  let time: Date | null = null
  for (const line of out.split('\n')) {
    if (line.startsWith('\0')) {
      const parsed = new Date(line.slice(1).trim())
      time = Number.isNaN(parsed.valueOf()) ? null : parsed
      continue
    }
    if (!line.trim() || !time) continue
    // "A\tpath" 또는 "R098\told\tnew"
    const [status, ...paths] = line.split('\t')
    if (!status || paths.length === 0) continue
    entries.push({ time, status: status[0], paths })
  }
  return entries
}

function buildCreatedMap(): Map<string, Date> {
  const map = new Map<string, Date>()

  // git log 는 최신 커밋부터 내놓는다. 이름이 바뀐 파일의 원래 생성 시각을
  // 따라가려면 오래된 커밋부터 순서대로 처리해야 한다.
  for (const entry of readLog().reverse()) {
    if (entry.status === 'A') {
      map.set(entry.paths[0], entry.time)
      continue
    }
    // 이름이 바뀌었거나 복사됐으면 원래 경로가 들고 있던 생성 시각을 물려준다.
    // 물려받을 게 없으면(예: 히스토리가 잘린 경우) 그 커밋 시각을 쓴다.
    const [from, to] = entry.paths
    if (!to) continue
    map.set(to, map.get(from) ?? entry.time)
    if (entry.status === 'R') map.delete(from)
  }
  return map
}

/** 저장소 루트 기준 상대 경로로 정규화 */
function normalize(filePath: string): string {
  const relative = path.isAbsolute(filePath)
    ? path.relative(process.cwd(), filePath)
    : filePath
  return relative.split(path.sep).join('/')
}

/** 이 파일이 처음 커밋된 시각. 알 수 없으면 undefined */
export function getGitCreated(filePath?: string): Date | undefined {
  if (!filePath) return undefined
  if (!createdMap) createdMap = buildCreatedMap()
  return createdMap.get(normalize(filePath))
}

/** dev 서버에서 커밋이 생겼을 때 다시 읽도록 */
export function invalidateGitDates(): void {
  createdMap = null
}
