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
        "group relative flex flex-col bg-card text-card-foreground rounded-xl border border-border overflow-hidden",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {/* Colored top accent */}
      <div
        className="h-1 w-full shrink-0"
        style={{ background: iconColor || 'var(--color-primary)' }}
      />

      <div className="flex items-start justify-between px-3 pt-3 pb-2.5">
        <div className="min-w-0 flex-1">
          <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider leading-none block mb-1.5 truncate">
            {title}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-foreground tracking-tight leading-none truncate">
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
            className="flex items-center justify-center size-8 rounded-lg shrink-0 ml-2"
            style={{
              background: iconColor ? `${iconColor}15` : 'var(--color-primary-foreground)',
              color: iconColor || 'var(--color-primary)',
            }}
          >
            <Icon className="size-4" />
          </div>
        )}
      </div>

      {subtitle && (
        <div className="text-[10px] text-muted-foreground border-t border-border px-3 py-2">
          {subtitle}
        </div>
      )}

      {/* Hover glow */}
      {onClick && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"
          style={{
            boxShadow: `0 0 0 1px ${iconColor || 'var(--color-primary)'}30, 0 4px 16px ${iconColor || 'var(--color-primary)'}10`,
          }}
        />
      )}
    </div>
  )
}

function StatisticsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col bg-card rounded-xl border border-border overflow-hidden", className)}>
      <div className="h-1 w-full shrink-0 bg-muted animate-pulse" />
      <div className="flex items-start justify-between px-3 pt-3 pb-2.5">
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-5 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="size-8 rounded-lg bg-muted animate-pulse shrink-0 ml-2" />
      </div>
    </div>
  )
}

export { StatisticsCard, StatisticsCardSkeleton }
export type { StatisticsCardProps }
