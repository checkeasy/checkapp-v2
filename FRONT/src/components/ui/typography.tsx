import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const typographyVariants = cva("", {
  variants: {
    variant: {
      // Page titles - responsive sizing
      "page-title": "text-lg sm:text-xl font-semibold text-foreground leading-tight",
      "page-subtitle": "text-xs sm:text-sm text-muted-foreground leading-snug",

      // Section headers - responsive sizing
      "section-title": "text-base sm:text-lg font-semibold text-foreground leading-tight",
      "section-subtitle": "text-sm sm:text-base font-medium text-foreground leading-snug",

      // Content text - responsive sizing
      "body": "text-xs sm:text-sm text-foreground leading-snug",
      "body-secondary": "text-xs sm:text-sm text-muted-foreground leading-snug",
      "caption": "text-xs text-muted-foreground leading-snug",

      // Cards and components - responsive sizing
      "card-title": "text-sm sm:text-base font-semibold text-foreground leading-tight",
      "card-description": "text-xs sm:text-sm text-muted-foreground leading-snug",

      // Status and metadata
      "status": "text-xs font-medium leading-none",
      "metadata": "text-xs text-muted-foreground leading-snug",
    },
    align: {
      left: "text-left",
      center: "text-center", 
      right: "text-right",
    },
  },
  defaultVariants: {
    variant: "body",
    align: "left",
  },
})

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div"
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, align, as: Component = "p", ...props }, ref) => {
    return (
      <Component
        className={cn(typographyVariants({ variant, align }), className)}
        ref={ref as any}
        {...props}
      />
    )
  }
)

Typography.displayName = "Typography"

export { Typography, typographyVariants }