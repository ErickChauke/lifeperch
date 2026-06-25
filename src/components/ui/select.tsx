import * as React from "react"

import { cn } from "@/lib/utils"

// A neutral chevron that reads on both themes, drawn as the control's own glyph
// so the select never shows the dated native arrow. The popup itself follows the
// theme via `color-scheme` (set in globals.css).
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888f99' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"

// Native select styled to match the Input primitive, with a custom chevron. When
// a placeholder is given it renders a greyed, unselectable first option so the
// control starts blank until the user actively picks (paired with the
// grey-when-empty rule in globals.css).
function Select({
  className,
  style,
  placeholder,
  children,
  ...props
}: React.ComponentProps<"select"> & { placeholder?: string }) {
  return (
    <select
      data-slot="select"
      style={{
        backgroundImage: CHEVRON,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.625rem center",
        ...style,
      }}
      className={cn(
        "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    >
      {placeholder ? (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      ) : null}
      {children}
    </select>
  )
}

export { Select }
