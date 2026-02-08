import * as React from "react"
import { cn } from "@/lib/utils"

const HelperText = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-[0.8rem] text-slate-500", className)}
        {...props}
    />
))
HelperText.displayName = "HelperText"

export { HelperText }
