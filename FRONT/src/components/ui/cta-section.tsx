import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { ReportProblemButton } from "@/components/ReportProblemButton"

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
    shortLabel?: string  // 🎯 NOUVEAU: Texte court pour mobile
    onClick: () => void
    icon?: React.ReactNode
    variant?: "cta" | "cta-secondary" | "default"
    disabled?: boolean
  }
  secondaryAction?: {
    label: string
    shortLabel?: string  // 🎯 NOUVEAU: Texte court pour mobile
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
                    {/* 🎯 NOUVEAU: Afficher le texte court sur mobile, complet sur desktop */}
                    <span className="sm:hidden">
                      {secondaryAction.shortLabel || secondaryAction.label}
                    </span>
                    <span className="hidden sm:inline">
                      {secondaryAction.label}
                    </span>
                  </Button>
                  <Button
                    variant={primaryAction.variant || "cta"}
                    size="cta"
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.disabled}
                    className="flex-1"
                  >
                    {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
                    {/* 🎯 NOUVEAU: Afficher le texte court sur mobile, complet sur desktop */}
                    <span className="sm:hidden">
                      {primaryAction.shortLabel || primaryAction.label}
                    </span>
                    <span className="hidden sm:inline">
                      {primaryAction.label}
                    </span>
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
                  {/* 🎯 NOUVEAU: Afficher le texte court sur mobile, complet sur desktop */}
                  <span className="sm:hidden">
                    {primaryAction.shortLabel || primaryAction.label}
                  </span>
                  <span className="hidden sm:inline">
                    {primaryAction.label}
                  </span>
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
                  {/* 🎯 NOUVEAU: Afficher le texte court sur mobile, complet sur desktop */}
                  <span className="sm:hidden">
                    {secondaryAction.shortLabel || secondaryAction.label}
                  </span>
                  <span className="hidden sm:inline">
                    {secondaryAction.label}
                  </span>
                </Button>
              )}
            </div>

            {/* Bottom text/link */}
            {bottomText && (
              <div className="text-center pt-3 mt-3 border-t border-border/50">
                <div className="flex items-center justify-center gap-2">
                  {bottomText.label === "Signaler un problème" && bottomText.onClick ? (
                    // 🎯 NOUVEAU: Utiliser le ReportProblemButton pour "Signaler un problème"
                    <ReportProblemButton
                      onClick={bottomText.onClick}
                      variant="outline"
                      size="md"
                    />
                  ) : bottomText.onClick ? (
                    <button
                      onClick={bottomText.onClick}
                      className="text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent/60 transition-all duration-300 px-4 py-2 rounded-lg hover:scale-105 active:scale-95"
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