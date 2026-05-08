import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 rounded-full px-2.5 py-0.5",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-2.5 py-0.5",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 rounded-full px-2.5 py-0.5",
        outline: "text-foreground rounded-full px-2.5 py-0.5",
        success: "border-transparent rounded-md px-1.5 py-0.5 gap-0.5",
      },
      appearance: {
        default: "",
        light: "",
      },
    },
    compoundVariants: [
      {
        variant: "success",
        appearance: "default",
        className: "bg-green-500 text-white",
      },
      {
        variant: "success",
        appearance: "light",
        className: "text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-500",
      },
      {
        variant: "destructive",
        appearance: "light",
        className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-500",
      },
    ],
    defaultVariants: {
      variant: "default",
      appearance: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, appearance, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, appearance }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
