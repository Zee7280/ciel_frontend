import { AlertCircle } from "lucide-react";
import clsx from "clsx";

interface FieldErrorProps {
    message?: string;
    className?: string;
}

export function FieldError({ message, className }: FieldErrorProps) {
    if (!message) return null;
    return (
        <div className={clsx("flex items-center gap-1.5 text-red-600 text-xs font-medium mt-1 animate-in fade-in slide-in-from-top-1", className)}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{message}</span>
        </div>
    );
}
