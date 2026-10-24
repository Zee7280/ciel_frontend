"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, X } from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";
import { hubStatusLabel, hubStatusTone } from "@/utils/integrationHub";

export function HubBadge({ status }: { status: string | null | undefined }) {
    return <StatusBadge label={hubStatusLabel(status)} tone={hubStatusTone(status)} />;
}

export function Pager({
    page,
    limit,
    total,
    onPage,
    disabled,
}: {
    page: number;
    limit: number;
    total: number;
    onPage: (p: number) => void;
    disabled?: boolean;
}) {
    const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    return (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <span>
                {total === 0 ? "No rows" : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
            </span>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={disabled || page <= 1}
                    onClick={() => onPage(page - 1)}
                    className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2">
                    Page {page} / {pages}
                </span>
                <button
                    type="button"
                    disabled={disabled || page >= pages}
                    onClick={() => onPage(page + 1)}
                    className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

export function TableShell({
    children,
    loading,
    error,
    empty,
    emptyText = "Nothing here yet.",
    footer,
}: {
    children: ReactNode;
    loading: boolean;
    error: string | null;
    empty: boolean;
    emptyText?: string;
    footer?: ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {error ? (
                <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                </div>
            ) : null}
            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
            ) : empty ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                    <Inbox className="h-6 w-6 text-slate-300" />
                    <p className="text-sm">{emptyText}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">{children}</div>
            )}
            {footer}
        </div>
    );
}

export const TH = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
    <th className={`px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 ${className}`}>{children}</th>
);
export const TD = ({ children, className = "", title }: { children?: ReactNode; className?: string; title?: string }) => (
    <td title={title} className={`px-4 py-2.5 align-top text-sm text-slate-800 ${className}`}>
        {children}
    </td>
);

export const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";
export const btnPrimary =
    "inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50";
export const btnSecondary =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
export const btnDanger =
    "inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50";
export const btnSmall = "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
            {children}
            {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
        </label>
    );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <span>
                <span className="block text-sm font-medium text-slate-800">{label}</span>
                {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
            </span>
        </label>
    );
}

export function JsonBlock({ value }: { value: unknown }) {
    let text = "";
    try {
        text = JSON.stringify(value ?? null, null, 2);
    } catch {
        text = String(value);
    }
    return <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">{text}</pre>;
}

export function KV({ items }: { items: Array<[string, ReactNode]> }) {
    return (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {items.map(([k, v]) => (
                <div key={k} className="min-w-0">
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{k}</dt>
                    <dd className="break-words text-slate-800">{v ?? "—"}</dd>
                </div>
            ))}
        </dl>
    );
}

export function Modal({
    open,
    title,
    onClose,
    children,
    wide,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    wide?: boolean;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);
    if (!open || typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(e) => e.stopPropagation()}
                className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"}`}
            >
                <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="px-5 py-4">{children}</div>
            </div>
        </div>,
        document.body,
    );
}

export function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

export function Tile({ label, value, sub, tone = "slate" }: { label: string; value: ReactNode; sub?: string; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
    const ring: Record<string, string> = {
        slate: "border-slate-200",
        green: "border-emerald-200 bg-emerald-50/50",
        amber: "border-amber-200 bg-amber-50/50",
        red: "border-red-200 bg-red-50/50",
        blue: "border-blue-200 bg-blue-50/50",
    };
    return (
        <div className={`rounded-xl border bg-white p-3 ${ring[tone]}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
        </div>
    );
}

export function ScopeChecklist({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
    return (
        <div className="grid gap-1.5 sm:grid-cols-2">
            {options.map((o) => {
                const on = value.includes(o);
                return (
                    <label key={o} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${on ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                        <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={on}
                            onChange={(e) => onChange(e.target.checked ? [...value, o] : value.filter((x) => x !== o))}
                        />
                        <code className="text-xs">{o}</code>
                    </label>
                );
            })}
        </div>
    );
}
