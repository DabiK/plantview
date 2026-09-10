import { forwardRef, useImperativeHandle, useRef } from 'react'
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch'

export interface DiagramCanvasHandle {
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  reset: () => void
}

export interface DiagramCanvasProps {
  /** Sanitized SVG markup produced by `renderPlantUml`. */
  svg: string
}

const ZOOM_STEP = 0.25
const ANIMATION_TIME = 180

/**
 * Full-size zoom/pan surface for a sanitized PlantUML SVG. Fits the diagram
 * on mount (remount the component, e.g. with a `key`, to fit a new diagram).
 */
export const DiagramCanvas = forwardRef<DiagramCanvasHandle, DiagramCanvasProps>(
  function DiagramCanvas({ svg }, ref) {
    const controlsRef = useRef<ReactZoomPanPinchContentRef | null>(null)

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
      }),
      [],
    )

    return (
      <TransformWrapper
        ref={controlsRef}
        minScale={0.05}
        maxScale={12}
        fitOnInit
        centerOnInit
        doubleClick={{ mode: 'zoomIn', step: 0.4, animationTime: ANIMATION_TIME }}
        wheel={{ step: 0.15 }}
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
            className="diagram-svg"
            // Sanitized by renderPlantUml (DOMPurify, SVG profile) before injection.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </TransformComponent>
      </TransformWrapper>
    )
  },
)
