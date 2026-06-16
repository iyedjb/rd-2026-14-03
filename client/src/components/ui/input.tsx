import * as React from "react"

import { cn, toTitleCase } from "@/lib/utils"

const NON_TITLE_CASE_TYPES = ['email', 'password', 'number', 'date', 'time', 'datetime-local', 'month', 'week', 'url', 'tel', 'search', 'hidden', 'file', 'color', 'range'];

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, ...props }, ref) => {
    const shouldApplyTitleCase = !type || !NON_TITLE_CASE_TYPES.includes(type);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (shouldApplyTitleCase && e.target.value) {
        e.target.value = toTitleCase(e.target.value);
      }
      onChange?.(e);
    };
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
