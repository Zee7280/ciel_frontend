"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY_DIAL_ENTRIES, DEFAULT_PHONE_COUNTRY_KEY } from "@/utils/countryCallingCodes";

export type PhoneConnectivityRowProps = {
    /** Select value: `ISO|+dial` (see `DEFAULT_PHONE_COUNTRY_KEY`). */
    phoneCountryKey: string;
    nationalDigits: string;
    onPhoneCountryKeyChange?: (key: string) => void;
    onNationalDigitsChange?: (digits: string) => void;
    disabled?: boolean;
    readOnly?: boolean;
    errorText?: string;
    maxNationalDigits?: number;
    placeholderNational?: string;
    selectClassName?: string;
    inputClassName?: string;
    rowClassName?: string;
    /**
     * Use a portal-mounted picker instead of a native `<select>`.
     * Prefer this inside scrollable modals — native selects are often clipped by `overflow-auto`.
     */
    usePortalCountryPicker?: boolean;
};

function entryKey(e: { iso2: string; dial: string }) {
    return `${e.iso2}|${e.dial}`;
}

function entryForKey(key: string) {
    const found = COUNTRY_DIAL_ENTRIES.find((e) => entryKey(e) === key);
    if (found) return found;
    const fallback = COUNTRY_DIAL_ENTRIES.find((e) => entryKey(e) === DEFAULT_PHONE_COUNTRY_KEY);
    return fallback ?? COUNTRY_DIAL_ENTRIES[0]!;
}

function nativeSelectValue(key: string) {
    const ok = COUNTRY_DIAL_ENTRIES.some((e) => entryKey(e) === key);
    return ok ? key : DEFAULT_PHONE_COUNTRY_KEY;
}

type PortalCountryPickerProps = {
    phoneCountryKey: string;
    onPhoneCountryKeyChange?: (key: string) => void;
    disabled: boolean;
    buttonClassName?: string;
};

function PortalCountryPicker({
    phoneCountryKey,
    onPhoneCountryKeyChange,
    disabled,
    buttonClassName,
}: PortalCountryPickerProps) {
    const listId = `${useId().replace(/:/g, "")}-phone-country-list`;
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const selected = entryForKey(phoneCountryKey);
    const selectedKey = entryKey(selected);

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return COUNTRY_DIAL_ENTRIES;
        return COUNTRY_DIAL_ENTRIES.filter((e) => {
            const dialDigits = e.dial.replace(/\D/g, "");
            return (
                e.name.toLowerCase().includes(q) ||
                e.iso2.toLowerCase().includes(q) ||
                e.dial.toLowerCase().includes(q) ||
                dialDigits.includes(q.replace(/\D/g, ""))
            );
        });
    }, [filter]);

    const updatePosition = useCallback(() => {
        const el = btnRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const width = Math.max(r.width, 280);
        let left = r.left;
        if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
        setCoords({ top: r.bottom + 6, left, width });
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        const onScroll = () => updatePosition();
        const onResize = () => updatePosition();
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
        };
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => searchRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key === "Escape") {
                ev.stopPropagation();
                setOpen(false);
                setFilter("");
                btnRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (ev: MouseEvent | TouchEvent) => {
            const t = ev.target as Node;
            if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
            setOpen(false);
            setFilter("");
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("touchstart", onPointerDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("touchstart", onPointerDown);
        };
    }, [open]);

    const panel =
        open &&
        typeof document !== "undefined" &&
        createPortal(
            <div
                ref={panelRef}
                role="listbox"
                id={listId}
                className="fixed z-[200] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5"
                style={{
                    top: coords.top,
                    left: coords.left,
                    width: coords.width,
                    maxHeight: "min(320px, calc(100vh - 24px))",
                }}
            >
                <div className="border-b border-slate-100 p-2">
                    <input
                        ref={searchRef}
                        type="search"
                        autoComplete="off"
                        placeholder="Search country or code…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <ul className="max-h-[min(260px,calc(100vh-120px))] overflow-y-auto overscroll-contain py-1">
                    {filtered.length === 0 ? (
                        <li className="px-3 py-6 text-center text-sm text-slate-500">No matches</li>
                    ) : (
                        filtered.map((e) => {
                            const key = entryKey(e);
                            const isSel = key === selectedKey;
                            return (
                                <li key={key} role="presentation">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isSel}
                                        className={cn(
                                            "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-indigo-50",
                                            isSel && "bg-indigo-50/80",
                                        )}
                                        onClick={() => {
                                            onPhoneCountryKeyChange?.(key);
                                            setOpen(false);
                                            setFilter("");
                                            btnRef.current?.focus();
                                        }}
                                    >
                                        <span className="font-semibold text-slate-800">{e.name}</span>
                                        <span className="text-xs font-medium text-slate-500">
                                            {e.iso2} · {e.dial}
                                        </span>
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>,
            document.body,
        );

    return (
        <div className="relative shrink-0">
            <button
                ref={btnRef}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                onClick={() => {
                    if (disabled) return;
                    setOpen((o) => !o);
                    if (open) setFilter("");
                }}
                className={cn(
                    "inline-flex h-10 w-full min-w-[7.5rem] max-w-[42vw] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-800 shadow-sm outline-none transition-colors hover:bg-slate-50/80 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[9rem] sm:max-w-[11rem]",
                    buttonClassName,
                )}
            >
                <span className="min-w-0 truncate">
                    {selected.iso2} {selected.dial}
                </span>
                <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
                    aria-hidden
                />
            </button>
            {panel}
        </div>
    );
}

/**
 * Country calling code dropdown + national number input (matches signup / profile UX).
 */
export default function PhoneConnectivityRow({
    phoneCountryKey,
    nationalDigits,
    onPhoneCountryKeyChange,
    onNationalDigitsChange,
    disabled = false,
    readOnly = false,
    errorText,
    maxNationalDigits = 15,
    placeholderNational = "3001234567",
    selectClassName,
    inputClassName,
    rowClassName,
    usePortalCountryPicker = false,
}: PhoneConnectivityRowProps) {
    const locked = readOnly || disabled;

    const handleNational = (e: React.ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value.replace(/\D/g, "");
        if (maxNationalDigits > 0 && v.length > maxNationalDigits) v = v.slice(0, maxNationalDigits);
        onNationalDigitsChange?.(v);
    };

    return (
        <div className="space-y-1.5">
            <div className={cn("flex gap-2", usePortalCountryPicker && "items-stretch gap-3", rowClassName)}>
                {usePortalCountryPicker ? (
                    <PortalCountryPicker
                        phoneCountryKey={phoneCountryKey}
                        onPhoneCountryKeyChange={onPhoneCountryKeyChange}
                        disabled={locked}
                        buttonClassName={selectClassName}
                    />
                ) : (
                    <select
                        value={nativeSelectValue(phoneCountryKey)}
                        onChange={(e) => onPhoneCountryKeyChange?.(e.target.value)}
                        disabled={locked}
                        aria-label="Country calling code"
                        className={cn(
                            "shrink-0 min-w-[6.5rem] max-w-[40%] truncate rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-2 py-4 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[8.5rem] sm:max-w-[11rem]",
                            selectClassName,
                        )}
                    >
                        {COUNTRY_DIAL_ENTRIES.map((e) => {
                            const key = entryKey(e);
                            return (
                                <option key={key} value={key} title={`${e.name} (${e.dial})`}>
                                    {e.iso2} {e.dial}
                                </option>
                            );
                        })}
                    </select>
                )}
                <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={placeholderNational}
                    value={nationalDigits}
                    onChange={handleNational}
                    readOnly={readOnly}
                    disabled={disabled && !readOnly}
                    className={cn(
                        usePortalCountryPicker
                            ? "h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                            : "min-w-0 flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-emerald-600 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70",
                        inputClassName,
                    )}
                />
            </div>
            {errorText ? (
                <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-red-500">{errorText}</p>
            ) : null}
        </div>
    );
}
