import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-lg",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow-primary active:bg-primary/80",
        destructive: "bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 active:bg-destructive/80",
        outline: "rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-foreground hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] active:bg-[rgba(255,255,255,0.1)]",
        secondary: "bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/85 active:bg-secondary/75",
        ghost: "rounded-lg hover:bg-[rgba(255,255,255,0.05)] hover:text-accent-foreground active:bg-[rgba(255,255,255,0.08)]",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 hover:shadow-glow-primary active:bg-primary/80",
        "hero-outline": "border border-primary/30 text-foreground font-semibold rounded-lg hover:bg-primary/10 hover:border-primary/45 active:bg-primary/15",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-lg px-8",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
