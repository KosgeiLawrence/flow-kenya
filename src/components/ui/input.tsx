import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg px-3.5 py-2 text-base md:text-sm",
          "bg-[rgba(255,255,255,0.04)] backdrop-blur-[14px]",
          "border border-[rgba(255,255,255,0.1)]",
          "text-foreground placeholder:text-muted-foreground",
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "focus-visible:outline-none focus-visible:border-[rgba(255,255,255,0.18)]",
          "focus-visible:ring-2 focus-visible:ring-primary/20",
          "focus-visible:bg-[rgba(255,255,255,0.06)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
