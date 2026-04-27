"use client";

import * as React from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import clsx from "clsx";

export interface MultiSelectOption {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: string[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** Tighter control for dense report sections (e.g. Section 4). Default preserves existing UI. */
    compact?: boolean;
    /** Override label shown in selected chips (e.g. Section 2.4 "Other" slots). */
    getTagLabel?: (value: string) => string;
    /** When set, use instead of `selected.includes(option)` for the dropdown checkmark (e.g. "Other" vs `__o_0` tokens). */
    isDropdownOptionSelected?: (option: string, selected: string[]) => boolean;
    /** Return full new selection; used for advanced toggles. If unset, default add/remove is used. */
    resolveToggle?: (option: string, selected: string[]) => string[];
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select options...",
    disabled = false,
    className,
    compact = false,
    getTagLabel,
    isDropdownOptionSelected,
    resolveToggle,
}: MultiSelectProps) {
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

    const toggleOption = (option: string) => {
        if (resolveToggle) {
            onChange(resolveToggle(option, selected));
            return;
        }
        if (selected.includes(option)) {
            onChange(selected.filter((item) => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const isOptionRowSelected = (option: string) => {
        if (isDropdownOptionSelected) {
            return isDropdownOptionSelected(option, selected);
        }
        return selected.includes(option);
    };

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={clsx(
                    "flex w-full items-center justify-between bg-white transition-all cursor-pointer group",
                    compact
                        ? "min-h-10 rounded-lg border border-slate-200 px-2.5 py-1.5"
                        : "min-h-[56px] rounded-2xl border-2 px-4 py-2",
                    isOpen
                        ? compact
                            ? "border-indigo-500 ring-2 ring-indigo-500/15"
                            : "border-report-primary ring-4 ring-report-primary-soft"
                        : compact
                          ? "hover:border-slate-300"
                          : "border-slate-100 hover:border-report-primary-border/50",
                    disabled && "opacity-50 cursor-not-allowed bg-slate-50"
                )}
            >
                <div className={clsx("flex flex-wrap", compact ? "gap-1" : "gap-2")}>
                    {selected.length > 0 ? (
                        selected.map((item) => (
                            <div
                                key={item}
                                className={clsx(
                                    "flex items-center gap-1 rounded-md bg-report-primary text-white font-bold uppercase shadow-sm animate-in zoom-in-95 duration-200",
                                    compact
                                        ? "px-2 py-0.5 text-[8px] tracking-wide"
                                        : "gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest",
                                )}
                            >
                                {getTagLabel ? getTagLabel(item) : item}
                                {!disabled && (
                                    <X
                                        className="w-3 h-3 cursor-pointer hover:text-white/80"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOption(item);
                                        }}
                                    />
                                )}
                            </div>
                        ))
                    ) : (
                        <span className={clsx("text-slate-400 font-medium", compact ? "text-xs" : "text-sm")}>{placeholder}</span>
                    )}
                </div>
                <ChevronDown
                    className={clsx(
                        "text-slate-400 transition-transform duration-300 shrink-0",
                        compact ? "w-4 h-4" : "w-5 h-5",
                        isOpen && "rotate-180",
                    )}
                />
            </div>

            {isOpen && (
                <div
                    className={clsx(
                        "absolute z-[100] w-full bg-white overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200",
                        compact
                            ? "mt-1 rounded-lg border border-slate-200 shadow-lg"
                            : "mt-3 rounded-[2rem] border-2 border-slate-100 shadow-2xl shadow-slate-200/60",
                    )}
                >
                    <div className={clsx("max-h-[300px] overflow-y-auto custom-scrollbar", compact ? "p-1" : "p-2")}>
                        {options.map((option) => {
                            const isSelected = isOptionRowSelected(option);
                            return (
                                <div
                                    key={option}
                                    onClick={() => toggleOption(option)}
                                    className={clsx(
                                        "flex items-center justify-between cursor-pointer transition-all mb-0.5 last:mb-0 group/item",
                                        compact
                                            ? "px-2.5 py-2 rounded-md text-left"
                                            : "px-5 py-4 rounded-2xl mb-1 last:mb-0",
                                        isSelected
                                            ? "bg-report-primary-soft/50 text-report-primary"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <span
                                        className={clsx(
                                            "font-bold uppercase",
                                            compact ? "text-[9px] tracking-wide leading-snug pr-2" : "text-[11px] font-black tracking-[0.05em]",
                                        )}
                                    >
                                        {option}
                                    </span>
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
