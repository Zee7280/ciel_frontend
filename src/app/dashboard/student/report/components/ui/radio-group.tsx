"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
}>({})

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string
    onValueChange?: (value: string) => void
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
    ({ className, value, onValueChange, children, ...props }, ref) => {
        return (
            <RadioGroupContext.Provider value={{ value, onValueChange }}>
                <div className={cn("grid gap-2", className)} ref={ref} {...props}>
                    {children}
                </div>
            </RadioGroupContext.Provider>
        )
    }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string
}

const RadioGroupItem = React.forwardRef<
    HTMLInputElement,
    RadioGroupItemProps
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)

    return (
        <div className="relative flex items-center">
            <input
                type="radio"
                ref={ref}
                className={cn(
                    "peer aspect-square h-4 w-4 rounded-full border border-slate-200 border-slate-900 text-slate-900 ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:border-4",
                    className
                )}
                checked={context.value === value}
                onChange={() => context.onValueChange?.(value)}
                value={value}
                {...props}
            />
        </div>
    )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
