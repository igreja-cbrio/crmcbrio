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
        "flex flex-col bg-card text-card-foreground rounded-xl border border-border shadow-xs",
        onClick && "cursor-pointer transition-all hover:shadow-md hover:-translate-y-px",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <Icon
            className="size-4 shrink-0"
            style={iconColor ? { color: iconColor } : undefined}
          />
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold text-foreground tracking-tight">
            {value}
          </span>
          {delta !== undefined && delta !== 0 && (
            <Badge
              variant={delta > 0 ? "success" : "destructive"}
              appearance="light"
              className="text-[10px] font-semibold"
            >
              {delta > 0 ? <ArrowUp /> : <ArrowDown />}
              {Math.abs(delta)}%
            </Badge>
          )}
        </div>
        {subtitle && (
          <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

export { StatisticsCard }
export type { StatisticsCardProps }
