"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import clsx from "clsx";

export type SearchableSelectProps = {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    searchPlaceholder?: string;
    hasError?: boolean;
    ariaLabel?: string;
    /** Allow committing a value that isn't in `options` (defaults to true). */
    allowCustomValue?: boolean;
    disabled?: boolean;
};

/**
 * Searchable dropdown ("combobox"): a text input with a search bar that
 * filters a long option list, matching the app's rounded pill input style.
 * Falls back to allowing free text if the user's exact option isn't listed.
 */
export default function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = "Select an option",
    searchPlaceholder = "Search...",
    hasError = false,
    ariaLabel,
    allowCustomValue = true,
    disabled = false,
}: SearchableSelectProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((option) => option.toLowerCase().includes(q));
    }, [options, query]);

    const updateQuery = (nextQuery: string) => {
        setQuery(nextQuery);
        setHighlightedIndex(0);
    };

    const commitValue = (nextValue: string) => {
        onChange(nextValue);
        setQuery("");
        setIsOpen(false);
    };

    const openDropdown = () => {
        if (disabled) return;
        setQuery("");
        setHighlightedIndex(0);
        setIsOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === "Enter" || e.key === "ArrowDown") {
                e.preventDefault();
                openDropdown();
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredOptions[highlightedIndex]) {
                commitValue(filteredOptions[highlightedIndex]);
            } else if (allowCustomValue && query.trim()) {
                commitValue(query.trim());
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
            setQuery("");
        } else if (e.key === "Tab") {
            if (allowCustomValue && query.trim() && !filteredOptions.includes(query.trim())) {
                onChange(query.trim());
            }
            setIsOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={clsx(
                    "w-full cursor-pointer px-5 py-4 pr-12 rounded-2xl border-2 bg-slate-50/50 focus:bg-white outline-none transition-all font-bold text-left disabled:cursor-not-allowed disabled:opacity-60",
                    value ? "text-slate-800" : "text-slate-300",
                    hasError ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-emerald-600",
                    isOpen && "hidden",
                )}
            >
                {value || placeholder}
            </button>
            {!isOpen && (
                <ChevronDown
                    className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                />
            )}

            {isOpen && (
                <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => updateQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={searchPlaceholder}
                        aria-label={ariaLabel}
                        className={clsx(
                            "w-full pl-11 pr-5 py-4 rounded-2xl border-2 bg-white outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300",
                            hasError ? "border-red-500 focus:border-red-500" : "border-emerald-600",
                        )}
                    />

                    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border-2 border-slate-100 bg-white shadow-2xl shadow-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-150">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <button
                                    key={option}
                                    type="button"
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    onClick={() => commitValue(option)}
                                    className={clsx(
                                        "block w-full truncate px-5 py-3 text-left text-sm font-bold transition-colors",
                                        index === highlightedIndex ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50",
                                    )}
                                >
                                    {option}
                                </button>
                            ))
                        ) : (
                            <div className="px-5 py-3 text-sm font-bold text-slate-400">
                                {allowCustomValue ? "No match — press Enter to use your own text" : "No matching results"}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
