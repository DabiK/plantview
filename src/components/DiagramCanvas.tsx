import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch'
import {
  beginNodeDrag,
  findDraggableNode,
  supportsNodeDragging,
  type NodeDragSession,
  type Point,
} from '../lib/svg-drag'

export interface DiagramCanvasHandle {
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  reset: () => void
  /** Serializes the displayed SVG, including positions adjusted by dragging. */
  getSvg: () => string | null
  /** Restores the original rendered layout (drops every drag change). */
  resetLayout: () => void
}

export interface DiagramCanvasProps {
  /** Sanitized SVG markup produced by `renderPlantUml`. */
  svg: string
  /** Enables node dragging on top of the rendered SVG. */
  adjustMode?: boolean
  /** Notifies when a drag changed the layout (`true`) or restored it (`false`). */
  onLayoutChanged?: (modified: boolean) => void
}

const ZOOM_STEP = 0.25
const ANIMATION_TIME = 180
/** SVG-unit threshold so a tiny pointer tremor does not flag the layout as modified. */
const DRAG_ACTIVATION_DISTANCE = 0.5

interface ActiveDrag {
  session: NodeDragSession
  pointerId: number
  start: Point
  modified: boolean
}

/** Maps a screen point to SVG user units (includes the zoom/pan transform). */
function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point | null {
  const matrix = svg.getScreenCTM()
  if (!matrix) return null
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
  return { x: point.x, y: point.y }
}

/**
 * Full-size zoom/pan surface for a sanitized PlantUML SVG. Fits the diagram
 * on mount (remount the component, e.g. with a `key`, to fit a new diagram).
 * In `adjustMode`, graph nodes can be dragged: the SVG pan start is excluded
 * on `g.entity` groups so panning only triggers on the background.
 */
export const DiagramCanvas = forwardRef<DiagramCanvasHandle, DiagramCanvasProps>(
  function DiagramCanvas({ svg, adjustMode = false, onLayoutChanged }, ref) {
    const controlsRef = useRef<ReactZoomPanPinchContentRef | null>(null)
    const hostRef = useRef<HTMLDivElement | null>(null)
    const dragRef = useRef<ActiveDrag | null>(null)
    const onLayoutChangedRef = useRef(onLayoutChanged)
    /** Bumping it remounts the SVG host, restoring the original markup. */
    const [layoutVersion, setLayoutVersion] = useState(0)
    const [dragging, setDragging] = useState(false)

    const adjustable = useMemo(() => supportsNodeDragging(svg), [svg])

    useEffect(() => {
      onLayoutChangedRef.current = onLayoutChanged
    }, [onLayoutChanged])

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          void controlsRef.current?.zoomIn(ZOOM_STEP, ANIMATION_TIME)
        },
        zoomOut: () => {
          void controlsRef.current?.zoomOut(ZOOM_STEP, ANIMATION_TIME)
        },
        fit: () => {
          void controlsRef.current?.fitToView({ animationTime: ANIMATION_TIME })
        },
        reset: () => {
          void controlsRef.current?.resetTransform(ANIMATION_TIME)
        },
        getSvg: () => {
          const element = hostRef.current?.querySelector('svg')
          return element ? new XMLSerializer().serializeToString(element) : null
        },
        resetLayout: () => {
          dragRef.current = null
          setDragging(false)
          setLayoutVersion((version) => version + 1)
          onLayoutChangedRef.current?.(false)
        },
      }),
      [],
    )

    const handlePointerDown = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!adjustMode || !adjustable || dragRef.current !== null) return
        const svgElement = hostRef.current?.querySelector('svg')
        if (!svgElement) return

        const node = findDraggableNode(event.target as Element, svgElement)
        if (!node) return

        const start = toSvgPoint(svgElement, event.clientX, event.clientY)
        if (!start) return

        const session = beginNodeDrag(svgElement, node)
        if (!session) return

        // Keep the pointer events for the drag and stop react-zoom-pan-pinch.
        event.preventDefault()
        event.stopPropagation()
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Pointer capture is best-effort (unsupported pointer ids, tests).
        }
        dragRef.current = { session, pointerId: event.pointerId, start, modified: false }
        setDragging(true)
      },
      [adjustMode, adjustable],
    )

    const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return

      const svgElement = hostRef.current?.querySelector('svg')
      if (!svgElement) return

      const point = toSvgPoint(svgElement, event.clientX, event.clientY)
      if (!point) return

      const dx = point.x - drag.start.x
      const dy = point.y - drag.start.y
      drag.session.move(dx, dy)
      if (!drag.modified && Math.hypot(dx, dy) >= DRAG_ACTIVATION_DISTANCE) {
        drag.modified = true
      }
    }, [])

    const finishDrag = useCallback((event?: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag) return
      if (event && event.pointerId !== drag.pointerId) return

      dragRef.current = null
      setDragging(false)
      if (drag.modified) {
        onLayoutChangedRef.current?.(true)
      }
    }, [])

    const hostClassName = [
      'diagram-svg',
      adjustMode ? 'diagram-adjusting' : '',
      dragging ? 'diagram-dragging' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <TransformWrapper
        ref={controlsRef}
        minScale={0.05}
        maxScale={12}
        fitOnInit
        centerOnInit
        doubleClick={{ mode: 'zoomIn', step: 0.4, animationTime: ANIMATION_TIME }}
        wheel={{ step: 0.15 }}
        panning={adjustMode && adjustable ? { excluded: ['g.entity'] } : undefined}
        zoomAnimation={{ animationTime: ANIMATION_TIME }}
        autoAlignment={{ animationTime: ANIMATION_TIME }}
      >
        <TransformComponent
          wrapperClass="h-full w-full"
          contentClass="diagram-content"
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ padding: '48px' }}
        >
          <div
            key={layoutVersion}
            ref={hostRef}
            className={hostClassName}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onLostPointerCapture={() => finishDrag()}
            // Sanitized by renderPlantUml (DOMPurify, SVG profile) before injection.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </TransformComponent>
      </TransformWrapper>
    )
  },
)
