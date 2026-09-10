/**
 * Node dragging on top of a rendered PlantUML SVG.
 *
 * The PlantUML/Graphviz engine lays graph diagrams out absolutely and marks
 * its elements: node groups carry `class="entity"`, edge groups carry
 * `class="link"` and contain a `<path>` (plus an optional arrowhead
 * `<polygon>`). There is no re-layout here: a node is translated via its
 * `transform` and the endpoints of every connected edge path are re-anchored
 * to follow it (intermediate waypoints are preserved).
 *
 * Only graph-like diagrams emit `g.entity` groups; sequence, timing, activity
 * and mindmap diagrams do not, so {@link supportsNodeDragging} returns `false`
 * for them and the UI disables the feature.
 */

/** Minimal 2D point in SVG user units. */
export interface Point {
  x: number
  y: number
}

/** Axis-aligned box in SVG user units (subset of `DOMRect`). */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Maximum distance between an edge endpoint and a node bounding box for the
 * edge to be considered attached to that node. Arrowheads leave a small gap
 * (the path stops at the base of the arrow), hence a tolerance of a few units.
 */
export const ATTACHMENT_TOLERANCE = 24

const PATH_SEGMENT_PATTERN = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g

interface PathSegment {
  command: string
  args: number[]
}

/** Rounds a coordinate to 4 decimals and drops trailing zeros. */
export function formatCoordinate(value: number): string {
  return String(Math.round(value * 10000) / 10000)
}

function parsePathSegments(d: string): PathSegment[] | null {
  const segments: PathSegment[] = []
  PATH_SEGMENT_PATTERN.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = PATH_SEGMENT_PATTERN.exec(d)) !== null) {
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
    if (args.some((value) => !Number.isFinite(value))) return null
    segments.push({ command: match[1], args })
  }

  return segments
}

function serializePathSegments(segments: PathSegment[]): string {
  return segments
    .map((segment) =>
      segment.args.length === 0
        ? segment.command
        : `${segment.command}${segment.args.map(formatCoordinate).join(' ')}`,
    )
    .join(' ')
}

export interface PathEndpoints {
  start: Point | null
  end: Point | null
}

/**
 * Walks a path `d` attribute and returns its absolute start and end anchors,
 * resolving relative commands and shorthand (`H`/`V`, `Z`).
 */
export function tracePath(d: string): PathEndpoints {
  const segments = parsePathSegments(d)
  if (!segments || segments.length === 0) return { start: null, end: null }

  let x = 0
  let y = 0
  let start: Point | null = null

  for (const segment of segments) {
    const command = segment.command.toUpperCase()
    const relative = segment.command !== command
    const args = segment.args

    switch (command) {
      case 'M':
        for (let index = 0; index + 1 < args.length; index += 2) {
          x = relative ? x + args[index] : args[index]
          y = relative ? y + args[index + 1] : args[index + 1]
          if (start === null) start = { x, y }
        }
        break
      case 'L':
      case 'T':
        for (let index = 0; index + 1 < args.length; index += 2) {
          x = relative ? x + args[index] : args[index]
          y = relative ? y + args[index + 1] : args[index + 1]
        }
        break
      case 'H':
        for (const value of args) x = relative ? x + value : value
        break
      case 'V':
        for (const value of args) y = relative ? y + value : value
        break
      case 'C':
        for (let index = 0; index + 5 < args.length; index += 6) {
          x = relative ? x + args[index + 4] : args[index + 4]
          y = relative ? y + args[index + 5] : args[index + 5]
        }
        break
      case 'S':
      case 'Q':
        for (let index = 0; index + 3 < args.length; index += 4) {
          x = relative ? x + args[index + 2] : args[index + 2]
          y = relative ? y + args[index + 3] : args[index + 3]
        }
        break
      case 'A':
        for (let index = 0; index + 6 < args.length; index += 7) {
          x = relative ? x + args[index + 5] : args[index + 5]
          y = relative ? y + args[index + 6] : args[index + 6]
        }
        break
      default:
        break
    }
  }

  return { start, end: start === null ? null : { x, y } }
}

/** Absolute first point of a path, `null` when the path cannot be parsed. */
export function getPathStart(d: string): Point | null {
  return tracePath(d).start
}

/** Absolute last point of a path, `null` when the path cannot be parsed. */
export function getPathEnd(d: string): Point | null {
  return tracePath(d).end
}

/**
 * Moves the start point of a path by `(dx, dy)`. Only absolute `M` starts are
 * supported (what Graphviz emits); other paths are returned unchanged.
 */
export function translatePathStart(d: string, dx: number, dy: number): string {
  const segments = parsePathSegments(d)
  if (!segments || segments.length === 0) return d

  const first = segments[0]
  if (first.command !== 'M' || first.args.length < 2) return d
  first.args[0] += dx
  first.args[1] += dy

  return serializePathSegments(segments)
}

/**
 * Moves the end point of a path by `(dx, dy)`, whatever the command
 * (absolute/relative `L`, `C`, `Q`, `A`… and `H`/`V`). A trailing `Z` is
 * ignored so the anchor stays the last drawn point.
 */
export function translatePathEnd(d: string, dx: number, dy: number): string {
  const segments = parsePathSegments(d)
  if (!segments || segments.length === 0) return d

  let index = segments.length - 1
  while (index >= 0 && segments[index].command.toUpperCase() === 'Z') index -= 1
  if (index < 0) return d

  const segment = segments[index]
  const command = segment.command.toUpperCase()
  const args = segment.args

  if (command === 'H') {
    args[args.length - 1] += dx
  } else if (command === 'V') {
    args[args.length - 1] += dy
  } else if (args.length >= 2) {
    args[args.length - 2] += dx
    args[args.length - 1] += dy
  } else {
    return d
  }

  return serializePathSegments(segments)
}

/** Parses a `points` attribute (`"x1,y1 x2,y2 …"`); `[]` when malformed. */
export function parsePolygonPoints(points: string): Point[] {
  const pairs = points.trim().split(/\s+/).filter(Boolean)
  const parsed: Point[] = []

  for (const pair of pairs) {
    const [x, y] = pair.split(',').map(Number)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return []
    parsed.push({ x, y })
  }

  return parsed
}

/** Translates every point of a `points` attribute by `(dx, dy)`. */
export function translatePolygonPoints(points: string, dx: number, dy: number): string {
  const parsed = parsePolygonPoints(points)
  if (parsed.length === 0) return points

  return parsed
    .map((point) => `${formatCoordinate(point.x + dx)},${formatCoordinate(point.y + dy)}`)
    .join(' ')
}

/** Distance from a point to a bounding box (`0` when inside). */
export function distanceToBox(point: Point, box: BoundingBox): number {
  const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.width))
  const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.height))
  return Math.hypot(dx, dy)
}

/**
 * True when the sanitized SVG contains at least one PlantUML `entity` group,
 * i.e. a graph diagram whose nodes can be moved.
 */
export function supportsNodeDragging(svg: string): boolean {
  for (const match of svg.matchAll(/class="([^"]*)"/g)) {
    if (match[1].split(/\s+/).includes('entity')) return true
  }
  return false
}

/* -------------------------------------------------------------------------- */
/* DOM helpers (browser only)                                                 */
/* -------------------------------------------------------------------------- */

interface EntityCandidate {
  element: SVGGElement
  box: BoundingBox
}

function findNearestEntity(
  point: Point,
  entities: EntityCandidate[],
): SVGGElement | null {
  let nearest: SVGGElement | null = null
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const entity of entities) {
    const distance = distanceToBox(point, entity.box)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = entity.element
    }
  }

  return nearestDistance <= ATTACHMENT_TOLERANCE ? nearest : null
}

/**
 * Walks up from an event target to the closest draggable `g.entity` of this
 * SVG. Returns `null` for cluster groups, note text or the background.
 */
export function findDraggableNode(
  target: Element,
  svg: SVGSVGElement,
): SVGGElement | null {
  const node = target.closest('g.entity')
  if (!node || !svg.contains(node)) return null
  if (!node.classList.contains('entity')) return null
  return node as SVGGElement
}

/** Farthest polygon point from `from`, i.e. the arrowhead tip. */
function getPolygonTip(points: string, from: Point): Point | null {
  const parsed = parsePolygonPoints(points)
  if (parsed.length === 0) return null

  return parsed.reduce((tip, point) =>
    Math.hypot(point.x - from.x, point.y - from.y) >
    Math.hypot(tip.x - from.x, tip.y - from.y)
      ? point
      : tip,
  )
}

function toNumberOrNull(value: string | null): number | null {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function collectLinkLabels(group: SVGGElement): DraggableLinkLabel[] {
  return Array.from(group.querySelectorAll<SVGTextElement>('text')).map((element) => ({
    element,
    x: toNumberOrNull(element.getAttribute('x')),
    y: toNumberOrNull(element.getAttribute('y')),
    tspans: Array.from(element.querySelectorAll<SVGTSpanElement>('tspan')).map((tspan) => ({
      element: tspan,
      x: toNumberOrNull(tspan.getAttribute('x')),
      y: toNumberOrNull(tspan.getAttribute('y')),
    })),
    originalTransform: element.getAttribute('transform') ?? '',
  }))
}

interface DraggableLinkLabel {
  element: SVGTextElement
  x: number | null
  y: number | null
  tspans: { element: SVGTSpanElement; x: number | null; y: number | null }[]
  originalTransform: string
}

interface DraggableLink {
  path: SVGPathElement
  originalPath: string
  startAttached: boolean
  endAttached: boolean
  polygon: SVGPolygonElement | null
  polygonSide: 'start' | 'end' | null
  originalPolygonPoints: string | null
  labels: DraggableLinkLabel[]
}

/** A live drag: `move` applies the cumulative delta since the drag started. */
export interface NodeDragSession {
  move(dx: number, dy: number): void
}

/**
 * Snapshots everything needed to drag `node`: the edge endpoints attached to
 * it (found by proximity between path anchors and node boxes), the arrow
 * polygons and the edge labels that must follow. Returns `null` when the node
 * is not draggable.
 */
export function beginNodeDrag(
  svg: SVGSVGElement,
  node: SVGGElement,
): NodeDragSession | null {
  const entityElements = Array.from(svg.querySelectorAll<SVGGElement>('g.entity'))
  if (!entityElements.includes(node)) return null

  const entities: EntityCandidate[] = entityElements.map((element) => ({
    element,
    box: element.getBBox(),
  }))

  const links: DraggableLink[] = []

  for (const group of svg.querySelectorAll<SVGGElement>('g.link')) {
    const path = group.querySelector<SVGPathElement>('path')
    const originalPath = path?.getAttribute('d')
    if (!path || !originalPath) continue

    const start = getPathStart(originalPath)
    const end = getPathEnd(originalPath)
    if (!start || !end) continue

    const polygon = group.querySelector<SVGPolygonElement>('polygon')
    const originalPolygonPoints = polygon?.getAttribute('points') ?? null
    const tip = originalPolygonPoints ? getPolygonTip(originalPolygonPoints, end) : null

    let polygonSide: 'start' | 'end' | null = null
    if (originalPolygonPoints && tip) {
      const points = parsePolygonPoints(originalPolygonPoints)
      if (points.length > 0) {
        const centroid = {
          x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
          y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
        }
        polygonSide =
          Math.hypot(centroid.x - start.x, centroid.y - start.y) <=
          Math.hypot(centroid.x - end.x, centroid.y - end.y)
            ? 'start'
            : 'end'
      }
    }

    const startAnchor = polygonSide === 'start' && tip ? tip : start
    const endAnchor = polygonSide === 'end' && tip ? tip : end

    const startAttached = findNearestEntity(startAnchor, entities) === node
    const endAttached = findNearestEntity(endAnchor, entities) === node
    if (!startAttached && !endAttached) continue

    links.push({
      path,
      originalPath,
      startAttached,
      endAttached,
      polygon,
      polygonSide,
      originalPolygonPoints,
      labels: collectLinkLabels(group),
    })
  }

  const originalTransform = node.getAttribute('transform') ?? ''

  return {
    move(dx: number, dy: number) {
      node.setAttribute(
        'transform',
        `${originalTransform} translate(${formatCoordinate(dx)} ${formatCoordinate(dy)})`.trim(),
      )

      for (const link of links) {
        let d = link.originalPath
        if (link.startAttached) d = translatePathStart(d, dx, dy)
        if (link.endAttached) d = translatePathEnd(d, dx, dy)
        link.path.setAttribute('d', d)

        if (link.polygon && link.originalPolygonPoints && link.polygonSide) {
          const attached =
            link.polygonSide === 'start' ? link.startAttached : link.endAttached
          if (attached) {
            link.polygon.setAttribute(
              'points',
              translatePolygonPoints(link.originalPolygonPoints, dx, dy),
            )
          }
        }

        // A label sits near the middle of the edge: moving one endpoint
        // shifts it by half the delta (a full delta for self-loops).
        const attachedCount =
          (link.startAttached ? 1 : 0) + (link.endAttached ? 1 : 0)
        const labelDx = (dx * attachedCount) / 2
        const labelDy = (dy * attachedCount) / 2
        for (const label of link.labels) {
          if (label.x !== null || label.y !== null) {
            if (label.x !== null) {
              label.element.setAttribute('x', formatCoordinate(label.x + labelDx))
            }
            if (label.y !== null) {
              label.element.setAttribute('y', formatCoordinate(label.y + labelDy))
            }
          } else if (label.tspans.length > 0) {
            for (const tspan of label.tspans) {
              if (tspan.x !== null) {
                tspan.element.setAttribute('x', formatCoordinate(tspan.x + labelDx))
              }
              if (tspan.y !== null) {
                tspan.element.setAttribute('y', formatCoordinate(tspan.y + labelDy))
              }
            }
          } else {
            label.element.setAttribute(
              'transform',
              `${label.originalTransform} translate(${formatCoordinate(labelDx)} ${formatCoordinate(labelDy)})`.trim(),
            )
          }
        }
      }
    },
  }
}
