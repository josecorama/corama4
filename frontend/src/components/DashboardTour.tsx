import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../i18n'

export interface TourStep {
  target?: string
  title: string
  body: string
}

interface DashboardTourProps {
  open: boolean
  steps: TourStep[]
  onClose: (completed: boolean) => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

type Placement = 'top' | 'bottom' | 'left' | 'right' | 'center'

const SPOTLIGHT_PADDING = 8
const GAP = 14
const VIEWPORT_MARGIN = 12

const isVisible = (el: Element) => {
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return false
  if (r.right <= 0 || r.left >= window.innerWidth) return false
  const style = window.getComputedStyle(el)
  return style.visibility !== 'hidden' && style.display !== 'none'
}

export const findTourTarget = (target?: string): HTMLElement | null => {
  if (!target) return null
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)
  for (const node of Array.from(nodes)) {
    if (isVisible(node)) return node
  }
  return null
}

const toRect = (el: HTMLElement): Rect => {
  const r = el.getBoundingClientRect()
  return {
    top: r.top - SPOTLIGHT_PADDING,
    left: r.left - SPOTLIGHT_PADDING,
    width: r.width + SPOTLIGHT_PADDING * 2,
    height: r.height + SPOTLIGHT_PADDING * 2,
  }
}

const DashboardTour = ({ open, steps, onClose }: DashboardTourProps) => {
  const { t } = useTranslation()
  const [activeSteps, setActiveSteps] = useState<TourStep[]>([])
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: Placement; arrow: number }>({
    top: 0,
    left: 0,
    placement: 'center',
    arrow: 0,
  })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const frameRef = useRef<number | null>(null)

  // Only keep steps whose target is currently rendered and visible (e.g. sidebar items are hidden on mobile)
  useEffect(() => {
    if (!open) return
    setActiveSteps(steps.filter(step => !step.target || findTourTarget(step.target)))
    setIndex(0)
  }, [open, steps])

  const step = activeSteps[index]
  const isLast = index === activeSteps.length - 1

  const measure = useCallback(() => {
    if (!step) return
    const el = findTourTarget(step.target)
    setRect(el ? toRect(el) : null)
  }, [step])

  // Bring the target into view, then measure
  useEffect(() => {
    if (!open || !step) return
    const el = findTourTarget(step.target)
    if (el) {
      const r = el.getBoundingClientRect()
      const fullyVisible = r.top >= 72 && r.bottom <= window.innerHeight - VIEWPORT_MARGIN
      if (!fullyVisible) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    measure()
    const settle = window.setTimeout(measure, 350)
    return () => window.clearTimeout(settle)
  }, [open, step, measure])

  useEffect(() => {
    if (!open) return
    const onChange = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(measure)
    }
    window.addEventListener('resize', onChange)
    window.addEventListener('scroll', onChange, true)
    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('scroll', onChange, true)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [open, measure])

  // Position the tooltip next to the spotlight, flipping/clamping to stay on screen
  useLayoutEffect(() => {
    if (!open || !step || !tooltipRef.current) return
    const tip = tooltipRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const clampX = (x: number) => Math.min(Math.max(x, VIEWPORT_MARGIN), vw - tip.width - VIEWPORT_MARGIN)
    const clampY = (y: number) => Math.min(Math.max(y, VIEWPORT_MARGIN), vh - tip.height - VIEWPORT_MARGIN)

    if (!rect) {
      setTooltipPos({ top: (vh - tip.height) / 2, left: (vw - tip.width) / 2, placement: 'center', arrow: 0 })
      return
    }

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const spaceBelow = vh - (rect.top + rect.height)
    const spaceAbove = rect.top
    const spaceRight = vw - (rect.left + rect.width)
    const spaceLeft = rect.left

    let placement: Placement
    if (spaceRight >= tip.width + GAP + VIEWPORT_MARGIN && rect.left + rect.width < vw * 0.35) {
      placement = 'right'
    } else if (spaceBelow >= tip.height + GAP + VIEWPORT_MARGIN) {
      placement = 'bottom'
    } else if (spaceAbove >= tip.height + GAP + VIEWPORT_MARGIN) {
      placement = 'top'
    } else if (spaceRight >= tip.width + GAP + VIEWPORT_MARGIN) {
      placement = 'right'
    } else if (spaceLeft >= tip.width + GAP + VIEWPORT_MARGIN) {
      placement = 'left'
    } else {
      placement = 'bottom'
    }

    let top: number
    let left: number
    let arrow: number
    if (placement === 'bottom' || placement === 'top') {
      left = clampX(centerX - tip.width / 2)
      top = placement === 'bottom' ? rect.top + rect.height + GAP : rect.top - tip.height - GAP
      top = clampY(top)
      arrow = Math.min(Math.max(centerX - left, 20), tip.width - 20)
    } else {
      top = clampY(centerY - tip.height / 2)
      left = placement === 'right' ? rect.left + rect.width + GAP : rect.left - tip.width - GAP
      left = clampX(left)
      arrow = Math.min(Math.max(centerY - top, 20), tip.height - 20)
    }
    setTooltipPos({ top, left, placement, arrow })
  }, [open, step, rect, index])

  useEffect(() => {
    if (open) nextButtonRef.current?.focus({ preventScroll: true })
  }, [open, index, activeSteps])

  const goNext = useCallback(() => {
    if (isLast) onClose(true)
    else setIndex(i => Math.min(i + 1, activeSteps.length - 1))
  }, [isLast, onClose, activeSteps.length])

  const goBack = useCallback(() => setIndex(i => Math.max(i - 1, 0)), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose(false)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, goNext, goBack, onClose])

  if (!open || !step) return null

  const arrowStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 14,
      height: 14,
      backgroundColor: '#0b2c48',
      transform: 'rotate(45deg)',
    }
    switch (tooltipPos.placement) {
      case 'bottom':
        return { ...base, top: -8, left: tooltipPos.arrow - 7, borderTop: '1px solid #6bb4b5', borderLeft: '1px solid #6bb4b5' }
      case 'top':
        return { ...base, bottom: -8, left: tooltipPos.arrow - 7, borderBottom: '1px solid #6bb4b5', borderRight: '1px solid #6bb4b5' }
      case 'right':
        return { ...base, left: -8, top: tooltipPos.arrow - 7, borderBottom: '1px solid #6bb4b5', borderLeft: '1px solid #6bb4b5' }
      case 'left':
        return { ...base, right: -8, top: tooltipPos.arrow - 7, borderTop: '1px solid #6bb4b5', borderRight: '1px solid #6bb4b5' }
      default:
        return { display: 'none' }
    }
  })()

  return (
    <div className="fixed inset-0 z-[200]" aria-live="polite">
      {/* Click shield: blocks interaction with the page while the tour is running */}
      <div className="absolute inset-0" onClick={e => e.stopPropagation()} />

      {rect ? (
        <div
          className="fixed pointer-events-none rounded-xl transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 2px #6bb4b5, 0 0 24px 4px rgba(107, 180, 181, 0.55), 0 0 0 9999px rgba(3, 15, 28, 0.72)',
          }}
          aria-hidden="true"
        />
      ) : (
        <div className="fixed inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(3, 15, 28, 0.72)' }} aria-hidden="true" />
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-tour-title"
        aria-describedby="dashboard-tour-body"
        className="fixed rounded-2xl p-5 font-poppins text-white transition-[top,left] duration-300 ease-out"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: `min(340px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
          backgroundColor: '#0b2c48',
          border: '1px solid #6bb4b5',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
        }}
      >
        <span style={arrowStyle} aria-hidden="true" />

        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 id="dashboard-tour-title" className="font-semibold text-base">{step.title}</h3>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-white transition-colors -mt-1 -mr-1 p-1"
            aria-label={t('tourSkip')}
          >
            <X size={16} />
          </button>
        </div>

        <p id="dashboard-tour-body" className="text-sm text-gray-300 leading-relaxed">{step.body}</p>

        <div className="flex gap-1.5 mt-4" aria-hidden="true">
          {activeSteps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-corama-teal' : i < index ? 'w-1.5 bg-corama-teal/60' : 'w-1.5 bg-white/20'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 mt-4">
          <button
            onClick={() => onClose(false)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {t('tourSkip')}
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={goBack}
                className="px-4 py-1.5 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'rgb(39, 69, 110)' }}
              >
                {t('back')}
              </button>
            )}
            <button
              ref={nextButtonRef}
              onClick={goNext}
              className="px-4 py-1.5 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ backgroundColor: 'rgb(92, 191, 192)' }}
            >
              {isLast ? t('tourFinish') : t('next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardTour
