import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-[1.02] active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-[0.95]",
        link: "text-primary underline-offset-4 hover:underline hover:scale-105",
        // Primary CTA - Always h-12 for optimal mobile touch
        cta: "w-full h-12 font-medium text-base rounded-xl bg-gradient-primary hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] shadow-card text-primary-foreground",
        // Secondary CTA - Mobile optimized
        "cta-secondary": "w-full h-12 font-medium text-base rounded-xl bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
        // Glass effect for modern look
        glass: "bg-white/10 backdrop-blur-sm border border-white/20 text-foreground hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] shadow-card",
        // Floating action for special cases
        floating: "bg-gradient-primary text-primary-foreground shadow-floating hover:shadow-glow hover:scale-[1.05] active:scale-[0.95] rounded-full",
      },
      size: {
        default: "h-11 px-4 py-2.5 sm:h-10", // 44px on mobile, 40px on desktop
        sm: "h-9 rounded-md px-3 text-xs", // 36px for compact areas
        lg: "h-12 rounded-lg px-8", // 48px for large actions
        icon: "h-11 w-11 sm:h-10 sm:w-10", // 44px on mobile, 40px on desktop
        cta: "h-12 px-6", // 48px for CTA variant
        "touch-friendly": "h-11 px-6", // 44px for mobile touch targets
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
