"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer"

// Detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

const Select = ({ children, value, onValueChange, defaultValue, ...props }) => {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  if (isMobile) {
    return (
      <SelectMobileContext.Provider value={{ value, onValueChange, open, setOpen, defaultValue }}>
        {children}
      </SelectMobileContext.Provider>
    )
  }

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} defaultValue={defaultValue} {...props}>
      {children}
    </SelectPrimitive.Root>
  )
}

const SelectMobileContext = React.createContext(null)

const SelectGroup = SelectPrimitive.Group

const SelectValue = React.forwardRef(({ className, placeholder, ...props }, ref) => {
  const mobile = React.useContext(SelectMobileContext)

  if (mobile) {
    const label = mobile.value && mobile.value !== "" ? mobile.value : placeholder
    return (
      <span ref={ref} className={cn("pointer-events-none", className)} {...props}>
        {label}
      </span>
    )
  }

  return <SelectPrimitive.Value ref={ref} placeholder={placeholder} className={className} {...props} />
})
SelectValue.displayName = "SelectValue"

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const mobile = React.useContext(SelectMobileContext)

  if (mobile) {
    return (
      <button
        ref={ref}
        onClick={() => mobile.setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>
    )
  }

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const mobile = React.useContext(SelectMobileContext)

  if (mobile) {
    // Extract SelectItems from children to render in drawer
    return (
      <Drawer open={mobile.open} onOpenChange={mobile.setOpen}>
        <DrawerContent className="pb-safe max-h-[70vh]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="overflow-y-auto px-2 pb-4 pt-2">
            <SelectMobileItemsContext.Provider value={{ value: mobile.value, onValueChange: mobile.onValueChange, setOpen: mobile.setOpen }}>
              {children}
            </SelectMobileItemsContext.Provider>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = "SelectContent"

const SelectMobileItemsContext = React.createContext(null)

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const mobileCtx = React.useContext(SelectMobileItemsContext)

  if (mobileCtx) {
    const isSelected = mobileCtx.value === value
    return (
      <button
        className={cn(
          "relative flex w-full items-center rounded-md py-3 px-4 text-sm outline-none text-left transition-colors",
          isSelected ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50",
          className
        )}
        onClick={() => {
          mobileCtx.onValueChange?.(value)
          mobileCtx.setOpen(false)
        }}
      >
        {children}
        {isSelected && (
          <span className="absolute right-4">
            <Check className="h-4 w-4" />
          </span>
        )}
      </button>
    )
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}