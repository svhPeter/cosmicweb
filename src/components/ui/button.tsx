import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background,color,border-color,transform,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-foreground text-background hover:bg-foreground/90 shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset]",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow",
        "accent-2":
          "bg-accent-2 text-background hover:bg-accent-2/90 shadow-[0_0_24px_-6px_hsl(var(--accent-2)_/_0.35)]",
        ghost: "text-foreground/80 hover:text-foreground hover:bg-white/5",
        outline:
          "border border-border bg-transparent text-foreground/90 hover:border-foreground/30 hover:bg-white/[0.03]",
        subtle: "bg-white/5 text-foreground/90 hover:bg-white/10",
        /** HUD chip-like button (instrument feel, opt-in). */
        hud: "cosmos-glass text-muted-foreground hover:text-foreground hover:border-foreground/20 border border-border/60 shadow-panel",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-5",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10",
        "icon-sm": "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
