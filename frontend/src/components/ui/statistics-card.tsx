import * as React from "react"
import { cn } from "@/lib/utils"
import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react"
import { Badge } from "./badge"

interface StatisticsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon?: LucideIcon
  iconColor?: string
  delta?: number
  subtitle?: string
  onClick?: () => void
}

function StatisticsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  delta,
  subtitle,
  onClick,
  className,
  ...props
}: StatisticsCardProps) {
  return (
    <div
      data-slot="statistics-card"
      className={cn(
        "group relative flex flex-col rounded-xl border border-border/40 shadow-sm transition-all duration-200",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
      style={{
        background: iconColor ? `color-mix(in srgb, ${iconColor} 4%, var(--color-card))` : 'var(--color-card)',
      }}
      onClick={onClick}
      {...props}
    >
      {/* Card content */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider leading-tight block mb-2">
            {title}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground tracking-tight leading-tight">
              {value}
            </span>
            {delta !== undefined && delta !== 0 && (
              <Badge
                variant={delta > 0 ? "success" : "destructive"}
                appearance="light"
                className="text-[9px] font-semibold shrink-0"
              >
                {delta > 0 ? <ArrowUp /> : <ArrowDown />}
                {Math.abs(delta)}%
              </Badge>
            )}
          </div>
        </div>
        {Icon && (
          <div
            className="flex items-center justify-center size-10 rounded-lg shrink-0 ml-4"
            style={{
              background: iconColor ? `${iconColor}18` : 'var(--color-primary-foreground)',
              color: iconColor || 'var(--color-primary)',
            }}
          >
            <Icon className="size-[18px]" />
          </div>
        )}
      </div>

      {subtitle && (
        <div className="text-[11px] text-muted-foreground border-t border-border/50 px-5 py-2.5">
          {subtitle}
        </div>
      )}

      {/* Hover glow */}
      {onClick && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"
          style={{
            boxShadow: `0 0 0 1px ${iconColor || 'var(--color-primary)'}25, 0 4px 20px ${iconColor || 'var(--color-primary)'}12`,
          }}
        />
      )}
    </div>
  )
}

function StatisticsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col bg-card rounded-xl border border-border/40 shadow-sm", className)}>
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="flex-1 space-y-2.5">
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-6 w-14 bg-muted rounded animate-pulse" />
        </div>
        <div className="size-10 rounded-lg bg-muted animate-pulse shrink-0 ml-4" />
      </div>
    </div>
  )
}

export { StatisticsCard, StatisticsCardSkeleton }
export type { StatisticsCardProps }
