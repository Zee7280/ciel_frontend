"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import clsx from "clsx";

interface SingleSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function SingleSelect({
    options,
    value,
    onChange,
    placeholder = "Select an option...",
    disabled = false,
    className
}: SingleSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={clsx(
                    "flex h-[56px] w-full items-center justify-between rounded-2xl border-2 bg-white px-5 transition-all cursor-pointer group",
                    isOpen ? "border-report-primary ring-4 ring-report-primary-soft" : "border-slate-100 hover:border-report-primary-border/50",
                    disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "hover:bg-slate-50/30"
                )}
            >
                <div className="flex flex-col">
                    {value ? (
                        <span className="text-[11px] font-black uppercase tracking-[0.05em] text-report-primary animate-in fade-in duration-300">
                            {value}
                        </span>
                    ) : (
                        <span className="text-slate-400 text-sm font-medium">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={clsx("w-5 h-5 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] mt-3 w-full bg-white rounded-[2rem] border-2 border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                        {options.map((option) => {
                            const isSelected = value === option;
                            return (
                                <div
                                    key={option}
                                    onClick={() => handleSelect(option)}
                                    className={clsx(
                                        "flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer transition-all mb-1 last:mb-0 group/item",
                                        isSelected
                                            ? "bg-report-primary-soft/50 text-report-primary"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <span className="text-[11px] font-black uppercase tracking-[0.05em]">{option}</span>
                                    {isSelected && <Check className="w-4 h-4 text-report-primary" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
