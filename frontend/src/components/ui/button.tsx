import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ── Physics Config ──────────────────────────────────────────
const PRESS_GROW_MS = 450
const MINIMUM_PRESS_MS = 300
const INITIAL_ORIGIN_SCALE = 0.2
const PADDING = 10
const SOFT_EDGE_MINIMUM_SIZE = 75
const SOFT_EDGE_CONTAINER_RATIO = 0.35
const TOUCH_DELAY_MS = 150
const EASING_STANDARD = "cubic-bezier(0.2, 0, 0, 1)"

enum RippleState {
  INACTIVE,
  TOUCH_DELAY,
  HOLDING,
  WAITING_FOR_CLICK,
}

// ── Ripple Hook ─────────────────────────────────────────────
const useMaterialRipple = (disabled = false) => {
  const [hovered, setHovered] = React.useState(false)
  const [pressed, setPressed] = React.useState(false)

  const surfaceRef = React.useRef<HTMLDivElement>(null)
  const rippleEffectRef = React.useRef<HTMLDivElement>(null)
  const stateRef = React.useRef(RippleState.INACTIVE)
  const rippleStartEventRef = React.useRef<React.PointerEvent | null>(null)
  const growAnimationRef = React.useRef<Animation | null>(null)
  const initialSizeRef = React.useRef(0)
  const rippleScaleRef = React.useRef("")
  const rippleSizeRef = React.useRef("")

  const isTouch = (e: React.PointerEvent) => e.pointerType === "touch"

  const shouldReact = (event: React.PointerEvent) => {
    if (disabled || !event.isPrimary) return false
    if (rippleStartEventRef.current && rippleStartEventRef.current.pointerId !== event.pointerId) return false
    if (event.type === "pointerenter" || event.type === "pointerleave") return !isTouch(event)
    return isTouch(event) || event.buttons === 1
  }

  const determineRippleSize = () => {
    if (!surfaceRef.current) return
    const { height, width } = surfaceRef.current.getBoundingClientRect()
    const maxDim = Math.max(height, width)
    const softEdgeSize = Math.max(SOFT_EDGE_CONTAINER_RATIO * maxDim, SOFT_EDGE_MINIMUM_SIZE)
    const initialSize = Math.floor(maxDim * INITIAL_ORIGIN_SCALE)
    const maxRadius = Math.sqrt(width ** 2 + height ** 2) + PADDING
    initialSizeRef.current = initialSize
    rippleScaleRef.current = `${(maxRadius + softEdgeSize) / initialSize}`
    rippleSizeRef.current = `${initialSize}px`
  }

  const getCoords = (event?: React.PointerEvent) => {
    if (!surfaceRef.current) return { startPoint: { x: 0, y: 0 }, endPoint: { x: 0, y: 0 } }
    const { height, width, left, top } = surfaceRef.current.getBoundingClientRect()
    const endPoint = { x: (width - initialSizeRef.current) / 2, y: (height - initialSizeRef.current) / 2 }
    let startPoint = event ? { x: event.clientX - left, y: event.clientY - top } : { x: width / 2, y: height / 2 }
    startPoint = { x: startPoint.x - initialSizeRef.current / 2, y: startPoint.y - initialSizeRef.current / 2 }
    return { startPoint, endPoint }
  }

  const startPress = (event?: React.PointerEvent) => {
    setPressed(true)
    if (!rippleEffectRef.current) return
    growAnimationRef.current?.cancel()
    determineRippleSize()
    const { startPoint, endPoint } = getCoords(event)
    growAnimationRef.current = rippleEffectRef.current.animate(
      {
        top: [0, 0], left: [0, 0],
        height: [rippleSizeRef.current, rippleSizeRef.current],
        width: [rippleSizeRef.current, rippleSizeRef.current],
        transform: [
          `translate(${startPoint.x}px, ${startPoint.y}px) scale(1)`,
          `translate(${endPoint.x}px, ${endPoint.y}px) scale(${rippleScaleRef.current})`,
        ],
      },
      { duration: PRESS_GROW_MS, easing: EASING_STANDARD, fill: "forwards" },
    )
  }

  const endPress = async () => {
    rippleStartEventRef.current = null
    stateRef.current = RippleState.INACTIVE
    const animation = growAnimationRef.current
    let time = Infinity
    if (animation && typeof animation.currentTime === "number") time = animation.currentTime
    if (time < MINIMUM_PRESS_MS) await new Promise((r) => setTimeout(r, MINIMUM_PRESS_MS - time))
    if (growAnimationRef.current !== animation) return
    setPressed(false)
  }

  const handlePointerDown = async (event: React.PointerEvent) => {
    if (!shouldReact(event)) return
    rippleStartEventRef.current = event
    if (!isTouch(event)) { stateRef.current = RippleState.WAITING_FOR_CLICK; startPress(event); return }
    stateRef.current = RippleState.TOUCH_DELAY
    await new Promise((r) => setTimeout(r, TOUCH_DELAY_MS))
    if (stateRef.current !== RippleState.TOUCH_DELAY) return
    stateRef.current = RippleState.HOLDING
    startPress(event)
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!shouldReact(event)) return
    if (stateRef.current === RippleState.HOLDING) { stateRef.current = RippleState.WAITING_FOR_CLICK; return }
    if (stateRef.current === RippleState.TOUCH_DELAY) { stateRef.current = RippleState.WAITING_FOR_CLICK; startPress(rippleStartEventRef.current || undefined); return }
  }

  const handleClick = () => {
    if (disabled) return
    if (stateRef.current === RippleState.WAITING_FOR_CLICK) { endPress(); return }
    if (stateRef.current === RippleState.INACTIVE) { startPress(); endPress() }
  }

  return {
    surfaceRef, rippleEffectRef, hovered, pressed,
    events: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerEnter: (e: React.PointerEvent) => { if (shouldReact(e)) setHovered(true) },
      onPointerLeave: (e: React.PointerEvent) => { if (shouldReact(e)) { setHovered(false); if (stateRef.current !== RippleState.INACTIVE) endPress() } },
      onClick: handleClick,
      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") handleClick() },
    },
  }
}

// ── Ripple Overlay ──────────────────────────────────────────
const Ripple = React.forwardRef<
  HTMLDivElement,
  { hovered: boolean; pressed: boolean; rippleEffectRef: React.RefObject<HTMLDivElement | null> }
>(({ hovered, pressed, rippleEffectRef }, ref) => (
  <div ref={ref} className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none z-0" aria-hidden="true">
    <div className={cn("absolute inset-0 bg-current transition-opacity duration-[15ms] linear", hovered ? "opacity-[0.08]" : "opacity-0")} />
    <div
      ref={rippleEffectRef}
      className="absolute rounded-full opacity-0 bg-current"
      style={{
        background: "radial-gradient(closest-side, currentColor max(calc(100% - 70px), 65%), transparent 100%)",
        transition: "opacity 375ms linear",
        opacity: pressed ? "0.12" : "0",
        transitionDuration: pressed ? "105ms" : "375ms",
      }}
    />
  </div>
))
Ripple.displayName = "Ripple"

// ── Button Variants ─────────────────────────────────────────
// Mantém TODOS os nomes existentes (default, ghost, outline, etc.)
// + adiciona novos do MD3 (filled, elevated, tonal, outlined, text)
const buttonVariants = cva(
  "group relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium tracking-[0.01em] transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none cursor-pointer",
  {
    variants: {
      variant: {
        // ── Variantes existentes (backward compat) ──
        default: "bg-primary text-primary-foreground shadow-sm",
        destructive: "bg-destructive text-destructive-foreground shadow-sm",
        outline: "border border-border bg-transparent text-primary shadow-none",
        secondary: "bg-secondary text-secondary-foreground shadow-none",
        ghost: "bg-transparent text-foreground shadow-none",
        link: "bg-transparent text-primary shadow-none underline-offset-4 hover:underline",
        success: "bg-emerald-500 text-white shadow-sm",
        // ── Variantes MD3 ──
        filled: "bg-primary text-primary-foreground shadow-sm",
        elevated: "bg-secondary text-primary shadow-md data-[pressed=true]:shadow-none",
        tonal: "bg-secondary text-secondary-foreground shadow-none",
        outlined: "border border-border bg-transparent text-primary shadow-none",
        text: "bg-transparent text-primary shadow-none",
      },
      size: {
        default: "h-10 px-6 py-2",
        xs: "h-auto rounded-md px-3 py-1.5 text-xs",
        sm: "h-auto rounded-md px-4 py-2 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
        "icon-xs": "h-7 w-7 text-xs",
        "icon-sm": "h-8 w-8",
        fab: "h-14 w-14 text-base",
      },
      shape: {
        round: "rounded-full data-[pressed=true]:rounded-xl data-[pressed=true]:duration-0 data-[pressed=true]:delay-0",
        square: "rounded-xl data-[pressed=true]:rounded-xl data-[pressed=true]:duration-0 data-[pressed=true]:delay-0",
        default: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  noRipple?: boolean
  noMorph?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, noRipple = false, noMorph = false, onClick, style, children, ...props }, ref) => {
    const isDisabled = props.disabled || (noRipple && noMorph)
    const { surfaceRef, rippleEffectRef, hovered, pressed, events } = useMaterialRipple(isDisabled)

    const componentProps = {
      className: cn(buttonVariants({ variant, size, shape, className })),
      style,
      "data-pressed": noMorph ? undefined : pressed,
      ...events,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        events.onClick()
        onClick?.(e)
      },
      ...props,
    }

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement
      return (
        <Slot ref={ref} {...componentProps}>
          {React.cloneElement(child, {
            children: (
              <>
                {!noRipple && <Ripple ref={surfaceRef} rippleEffectRef={rippleEffectRef} hovered={hovered} pressed={pressed} />}
                <span className="relative z-10 flex items-center gap-2 pointer-events-none">{child.props.children}</span>
              </>
            ),
          })}
        </Slot>
      )
    }

    return (
      <button ref={ref} {...componentProps}>
        {!noRipple && <Ripple ref={surfaceRef} rippleEffectRef={rippleEffectRef} hovered={hovered} pressed={pressed} />}
        <span className="relative z-10 flex items-center gap-2 pointer-events-none">{children}</span>
      </button>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
