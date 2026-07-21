"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type Choice = { value: string; label: React.ReactNode; disabled?: boolean }
type Group = { label: string; choices: Choice[] }

function isOption(node: React.ReactNode, tag: string): node is React.ReactElement {
  return React.isValidElement(node) && node.type === tag
}

function toChoice(node: React.ReactElement): Choice | null {
  const props = node.props as {
    value?: string | number
    children?: React.ReactNode
    disabled?: boolean
    hidden?: boolean
  }
  // A hidden option is the native placeholder trick; the popup shows its own.
  if (props.hidden) return null
  return {
    value: String(props.value ?? ""),
    label: props.children,
    disabled: props.disabled,
  }
}

// Reads the <option> and <optgroup> children the call sites already pass, so the
// popup can render them without every form having to change shape.
export function collect(children: React.ReactNode): (Choice | Group)[] {
  const out: (Choice | Group)[] = []
  React.Children.forEach(children, (child) => {
    if (isOption(child, "optgroup")) {
      const props = child.props as { label?: string; children?: React.ReactNode }
      const choices: Choice[] = []
      React.Children.forEach(props.children, (option) => {
        if (isOption(option, "option")) {
          const choice = toChoice(option)
          if (choice) choices.push(choice)
        }
      })
      if (choices.length > 0) out.push({ label: props.label ?? "", choices })
    } else if (isOption(child, "option")) {
      const choice = toChoice(child)
      if (choice) out.push(choice)
    }
  })
  return out
}

export function flatten(entries: (Choice | Group)[]): Choice[] {
  return entries.flatMap((e) => ("choices" in e ? e.choices : [e]))
}

// Sets a select's value the way a user would, so React and any form library
// listening for change react to it.
function commit(el: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value",
  )?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

/**
 * A themed select. A real <select> stays in the tree, hidden, holding the value
 * so existing form wiring (including uncontrolled react-hook-form fields) works
 * untouched; the visible control is a portalled popup that follows the theme,
 * keeps clear of the viewport edges and never renders the dated OS listbox.
 */
function Select({
  className,
  style,
  placeholder,
  children,
  id,
  disabled,
  required: _required,
  onBlur,
  ref: forwardedRef,
  ...props
}: React.ComponentProps<"select"> & { placeholder?: string }) {
  const innerRef = React.useRef<HTMLSelectElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  const setRef = React.useCallback(
    (el: HTMLSelectElement | null) => {
      innerRef.current = el
      if (typeof forwardedRef === "function") forwardedRef(el)
      else if (forwardedRef) forwardedRef.current = el
    },
    [forwardedRef],
  )

  // The hidden select is the source of truth. Events cover a user pick and any
  // library that dispatches one; a library that assigns el.value silently (a
  // react-hook-form reset or setValue) shows through on the next render, since
  // getSnapshot re-reads the element every time.
  const subscribe = React.useCallback((onChange: () => void) => {
    const el = innerRef.current
    if (!el) return () => {}
    el.addEventListener("change", onChange)
    el.addEventListener("input", onChange)
    onChange()
    return () => {
      el.removeEventListener("change", onChange)
      el.removeEventListener("input", onChange)
    }
  }, [])

  // Before the select mounts there is nothing to read, so both snapshots fall
  // back to the same value and the first client render matches the server.
  const fallback = String(props.value ?? props.defaultValue ?? "")
  const value = React.useSyncExternalStore(
    subscribe,
    () => innerRef.current?.value ?? fallback,
    () => fallback,
  )

  const entries = collect(children)
  const selected = flatten(entries).find((c) => c.value === value)

  // Reports the trigger's blur against the hidden select, since that is the
  // element a form library registered and the one carrying the field name.
  function handleBlur(event: React.FocusEvent<HTMLButtonElement>) {
    if (!onBlur) return
    const el = innerRef.current ?? event.target
    onBlur({ ...event, target: el, currentTarget: el } as unknown as React.FocusEvent<HTMLSelectElement>)
  }

  function renderChoice(choice: Choice) {
    return (
      <SelectPrimitive.Item
        key={choice.value}
        value={choice.value}
        disabled={choice.disabled}
        className="flex cursor-default items-center gap-2 rounded-[var(--r-sm)] px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-2 data-[selected]:text-accent-read"
      >
        <span className="flex size-3.5 shrink-0 items-center justify-center">
          <SelectPrimitive.ItemIndicator>
            <Check className="size-3.5" />
          </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText className="truncate">
          {choice.label}
        </SelectPrimitive.ItemText>
      </SelectPrimitive.Item>
    )
  }

  return (
    <>
      <select
        ref={setRef}
        aria-hidden
        tabIndex={-1}
        disabled={disabled}
        className="sr-only"
        // Form libraries focus the field they registered to flag an error. That
        // ref points here, so hand focus to the visible trigger instead of
        // stranding it on a hidden element.
        onFocus={() => triggerRef.current?.focus()}
        {...props}
      >
        {placeholder ? <option value="" /> : null}
        {children}
      </select>

      <SelectPrimitive.Root
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          const el = innerRef.current
          if (el) commit(el, String(next ?? ""))
        }}
      >
        <SelectPrimitive.Trigger
          ref={triggerRef}
          id={id}
          type="button"
          style={style}
          // The hidden select can never be blurred, so a form library tracking
          // touched fields only hears about it from here.
          onBlur={handleBlur}
          className={cn(
            "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-2.5 text-base transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:bg-input/50 data-[disabled]:opacity-50 md:text-sm dark:bg-input/30",
            className,
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              selected ? "text-fg" : "text-fg-3",
            )}
          >
            {selected ? selected.label : (placeholder ?? "")}
          </span>
          <ChevronDown className="text-fg-3 size-4 shrink-0" strokeWidth={2} />
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Positioner
            className="z-50"
            sideOffset={6}
            alignItemWithTrigger={false}
            collisionPadding={16}
          >
            <SelectPrimitive.Popup
              style={{ boxShadow: "var(--shadow-pop)" }}
              className="bg-surface max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-y-auto overscroll-contain rounded-[var(--r)] border p-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--border-2)] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5"
            >
              {entries.map((entry, i) =>
                "choices" in entry ? (
                  <SelectPrimitive.Group key={`${entry.label}-${i}`}>
                    <SelectPrimitive.GroupLabel className="text-fg-3 px-2 pt-2 pb-1 font-mono text-[10.5px] tracking-[0.10em] uppercase">
                      {entry.label}
                    </SelectPrimitive.GroupLabel>
                    {entry.choices.map(renderChoice)}
                  </SelectPrimitive.Group>
                ) : (
                  renderChoice(entry)
                ),
              )}
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </>
  )
}

export { Select }
