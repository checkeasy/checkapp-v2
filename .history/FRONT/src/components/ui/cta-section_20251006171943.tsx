import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "./button"

const ctaSectionVariants = cva(
  "fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gradient-to-t from-background/95 via-background/90 to-transparent backdrop-blur-xl border-t border-white/20 shadow-floating animate-slide-up",
  {
    variants: {
      variant: {
        default: "p-4 space-y-3",
        compact: "p-3 space-y-2",
        padded: "p-6 space-y-4",
      },
      safeArea: {
        true: "pb-safe",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      safeArea: true,
    },
  }
)

export interface CTASectionProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof ctaSectionVariants> {
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
    variant?: "cta" | "cta-secondary" | "default"
    disabled?: boolean
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: "outline" | "ghost" | "link"
  }
  bottomText?: {
    label: string
    onClick?: () => void
    badge?: React.ReactNode
  }
}

const CTASection = React.forwardRef<HTMLDivElement, CTASectionProps>(
  ({ 
    className, 
    variant, 
    safeArea, 
    primaryAction,
    secondaryAction,
    bottomText,
    children,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(ctaSectionVariants({ variant, safeArea }), className)}
        {...props}
      >
        {children ? (
          children
        ) : (
          <>
            {/* Primary and Secondary Actions */}
            <div className="space-y-2">
              {secondaryAction && primaryAction ? (
                // Two button layout - horizontal
                <div className="flex gap-2">
                  <Button
                    variant={secondaryAction.variant || "outline"}
                    size="touch-friendly"
                    onClick={secondaryAction.onClick}
                    className="flex-1"
                  >
                    {secondaryAction.label}
                  </Button>
                  <Button
                    variant={primaryAction.variant || "cta"}
                    size="cta"
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.disabled}
                    className="flex-1"
                  >
                    {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
                    {primaryAction.label}
                  </Button>
                </div>
              ) : primaryAction ? (
                // Single primary button
                <Button
                  variant={primaryAction.variant || "cta"}
                  size="cta"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  className="w-full"
                >
                  {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
                  {primaryAction.label}
                </Button>
              ) : null}

              {/* Secondary action as standalone button (when no primary) */}
              {secondaryAction && !primaryAction && (
                <Button
                  variant={secondaryAction.variant || "outline"}
                  size="touch-friendly"
                  onClick={secondaryAction.onClick}
                  className="w-full"
                >
                  {secondaryAction.label}
                </Button>
              )}
            </div>

            {/* Bottom text/link */}
            {bottomText && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {bottomText.onClick ? (
                    <button
                      onClick={bottomText.onClick}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 underline underline-offset-2"
                    >
                      {bottomText.label}
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {bottomText.label}
                    </p>
                  )}
                  {bottomText.badge}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }
)

CTASection.displayName = "CTASection"

export { CTASection, ctaSectionVariants }