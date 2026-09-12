/**
 * 원 뭉치기(circle packing).
 *
 * 태그를 줄줄이 흘려 놓으면 태그가 늘어날 때마다 화면이 아래로 자란다.
 * 뭉쳐 놓으면 자리는 한 덩어리로 고정되고, 늘어난 만큼 각자가 작아진다.
 *
 * 방법은 단순하다. 큰 것부터 놓고, 이미 놓인 두 원에 동시에 닿는 자리 가운데
 * 한가운데에서 가장 덜 벗어나는 곳을 고른다. 큰 원이 먼저 들어가니 자연히
 * 가운데를 차지하고 작은 원이 가장자리로 밀린다.
 */

export interface PackedCircle {
  /** 넣어 준 순서에서의 자리. 정렬을 되돌릴 때 쓴다. */
  index: number
  x: number
  y: number
  r: number
}

export interface PackResult {
  circles: PackedCircle[]
  width: number
  height: number
}

/** 겹침 판정에 쓰는 여유. 부동소수점 오차로 닿은 원이 겹쳤다고 나오면 자리를 못 찾는다. */
const SLACK = 1e-3

/** 가장자리 후보로 남겨 둘 원의 수. 안쪽에 묻힌 원은 새 원이 닿을 자리를 못 내준다. */
const FRONTIER = 32

/** A·B 두 원에 동시에 외접하는 반지름 r 짜리 원의 중심 후보 (없거나, 하나거나, 둘) */
function tangentCenters(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number,
  r: number,
): { x: number; y: number }[] {
  const dx = bx - ax
  const dy = by - ay
  const d = Math.hypot(dx, dy)
  if (d < SLACK) return []

  const ra = ar + r
  const rb = br + r
  if (d > ra + rb || d < Math.abs(ra - rb)) return []

  const a = (ra * ra - rb * rb + d * d) / (2 * d)
  const hSquared = ra * ra - a * a
  if (hSquared < 0) return []

  const h = Math.sqrt(hSquared)
  const mx = ax + (a * dx) / d
  const my = ay + (a * dy) / d
  const ox = (-dy * h) / d
  const oy = (dx * h) / d

  if (h < SLACK) return [{ x: mx, y: my }]
  return [
    { x: mx + ox, y: my + oy },
    { x: mx - ox, y: my - oy },
  ]
}

export function packCircles(radii: number[]): PackResult {
  if (radii.length === 0) return { circles: [], width: 0, height: 0 }

  // 큰 것부터. 순서가 곧 배치라, 가장 굵은 태그가 한가운데에 앉는다.
  const order = radii
    .map((r, index) => ({ r, index }))
    .sort((a, b) => b.r - a.r)

  const placed: PackedCircle[] = []

  for (const { r, index } of order) {
    if (placed.length === 0) {
      placed.push({ index, x: 0, y: 0, r })
      continue
    }
    if (placed.length === 1) {
      placed.push({ index, x: placed[0].r + r, y: 0, r })
      continue
    }

    // 가운데에서 먼 것부터 — 안쪽에 묻힌 원은 어차피 자리를 못 내준다.
    const frontier = [...placed]
      .sort((a, b) => Math.hypot(b.x, b.y) + b.r - (Math.hypot(a.x, a.y) + a.r))
      .slice(0, FRONTIER)

    let best: { x: number; y: number } | null = null
    let bestScore = Infinity

    for (let i = 0; i < frontier.length; i++) {
      for (let j = i + 1; j < frontier.length; j++) {
        const a = frontier[i]
        const b = frontier[j]
        for (const candidate of tangentCenters(a.x, a.y, a.r, b.x, b.y, b.r, r)) {
          // 한가운데에서 가장 덜 벗어나는 자리. 덩어리가 둥글게 자란다.
          const score = Math.hypot(candidate.x, candidate.y) + r
          if (score >= bestScore) continue

          let free = true
          for (const other of placed) {
            if (Math.hypot(candidate.x - other.x, candidate.y - other.y) < other.r + r - SLACK) {
              free = false
              break
            }
          }
          if (!free) continue

          bestScore = score
          best = candidate
        }
      }
    }

    // 닿을 자리를 못 찾으면 덩어리 바깥에 붙인다. 가장자리만 넓게 보고 있어
    // 드물게 생길 수 있는 일이고, 빠뜨리는 것보다 밀어 두는 편이 낫다.
    if (!best) {
      const far = placed.reduce((max, c) => Math.max(max, Math.hypot(c.x, c.y) + c.r), 0)
      const angle = (placed.length * 2.399963) % (Math.PI * 2) // 황금각
      best = { x: Math.cos(angle) * (far + r), y: Math.sin(angle) * (far + r) }
    }

    placed.push({ index, x: best.x, y: best.y, r })
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const c of placed) {
    minX = Math.min(minX, c.x - c.r)
    minY = Math.min(minY, c.y - c.r)
    maxX = Math.max(maxX, c.x + c.r)
    maxY = Math.max(maxY, c.y + c.r)
  }

  return {
    circles: placed
      .map((c) => ({ ...c, x: c.x - minX, y: c.y - minY }))
      .sort((a, b) => a.index - b.index),
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * 원 안에 글자를 앉힌다.
 *
 * 원은 네모가 아니라 가운데만 넓다. 이름이 길면 글자를 줄이는 수밖에 없고,
 * 그래서 긴 이름의 태그는 작게 적힌다. 첨부한 워드 클라우드도 같은 일을 한다.
 */
export interface FittedLabel {
  lines: string[]
  fontSize: number
}

/** 글자 하나가 차지하는 폭(em). 한글은 네모 한 칸, 라틴 소문자는 그 절반쯤. */
function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0
  if (code > 0x1100) return 1 // 한글·한자·가나
  if (ch === ' ') return 0.3
  if (ch === '-' || ch === '.' || ch === 'i' || ch === 'l' || ch === 'j') return 0.32
  if (ch >= 'A' && ch <= 'Z') return 0.66
  if (ch === 'm' || ch === 'w') return 0.85
  return 0.55
}

function textWidth(text: string): number {
  let total = 0
  for (const ch of text) total += charWidth(ch)
  return total
}

/** 하이픈과 공백에서 끊는다. 그래도 안 들어가면 글자 사이에서 끊는다. */
function wrap(label: string, maxWidth: number): string[] {
  const chunks = label.split(/(?<=-)|\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  const pushLine = () => {
    if (line) lines.push(line)
    line = ''
  }

  for (const chunk of chunks) {
    const candidate = line + chunk
    if (!line || textWidth(candidate) <= maxWidth) {
      line = candidate
      continue
    }
    pushLine()
    line = chunk
  }
  pushLine()

  // 한 덩어리가 통째로 넘치면 글자 사이에서 끊는다.
  const out: string[] = []
  for (const entry of lines) {
    if (textWidth(entry) <= maxWidth) {
      out.push(entry)
      continue
    }
    let current = ''
    for (const ch of entry) {
      if (current && textWidth(current + ch) > maxWidth) {
        out.push(current)
        current = ''
      }
      current += ch
    }
    if (current) out.push(current)
  }
  return out
}

const LINE_HEIGHT = 1.16
const MIN_FONT = 6.5

export function fitLabel(label: string, diameter: number, maxFont: number): FittedLabel {
  // 원 안에 들어가는 네모는 지름의 0.707배지만, 가운데 줄은 더 넓게 쓸 수 있다.
  const boxWidth = diameter * 0.78
  const boxHeight = diameter * 0.82

  for (let fontSize = maxFont; fontSize >= MIN_FONT; fontSize -= 0.25) {
    const lines = wrap(label, boxWidth / fontSize)
    if (lines.length * fontSize * LINE_HEIGHT <= boxHeight) {
      return { lines, fontSize }
    }
  }
  return { lines: wrap(label, boxWidth / MIN_FONT), fontSize: MIN_FONT }
}

/** 태그 이름에서 늘 같은 색상값을 뽑는다. 같은 태그는 어느 화면에서든 같은 색. */
export function hueOf(tag: string): number {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  }
  // 황금비로 흩어 놓는다. 이름이 비슷한 태그가 나란히 같은 색이 되지 않게.
  return Math.round((hash * 137.508) % 360)
}
