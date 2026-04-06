import * as React from "react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string
  size?: "sm" | "md" | "lg"
}

function LoadingSpinner({
  text = "Carregando...",
  size = "md",
  className,
  ...props
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  }

  return (
    <div
      className={cn("flex flex-col items-center justify-center py-8 gap-3", className)}
      {...props}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-muted-foreground/25 border-t-primary",
          sizeClasses[size]
        )}
      />
      {text && <p className="text-xs text-muted-foreground">{text}</p>}
    </div>
  )
}

// Table loading row - fits inside a <tbody>
function TableLoadingRow({
  colSpan = 7,
  text = "Carregando...",
}: {
  colSpan?: number
  text?: string
}) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <LoadingSpinner text={text} size="sm" className="py-6" />
      </td>
    </tr>
  )
}

// Table empty row - fits inside a <tbody>
function TableEmptyRow({
  colSpan = 7,
  text = "Nenhum dado encontrado",
}: {
  colSpan?: number
  text?: string
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-8 text-sm text-muted-foreground">
        {text}
      </td>
    </tr>
  )
}

export { LoadingSpinner, TableLoadingRow, TableEmptyRow }
