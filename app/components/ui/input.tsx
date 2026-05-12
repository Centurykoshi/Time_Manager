import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-(--border) bg-transparent px-3 py-1 text-sm text-(--foreground) shadow-xs transition-colors outline-none placeholder:text-(--secondary-foreground)/70 focus-visible:ring-2 focus-visible:ring-(--ring)",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
