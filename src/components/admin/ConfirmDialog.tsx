"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description?: ReactNode;
    children?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "warning" | "danger";
    loading?: boolean;
    /** When set, the user must type this exact text before the confirm button is enabled. */
    requireText?: string;
    /** Extra reason to keep the confirm button disabled (e.g. unchecked acknowledgement). */
    confirmDisabled?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

const VARIANT_BTN: Record<string, string> = {
    default: "bg-slate-900 hover:bg-slate-800 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
};
const VARIANT_ICON: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    warning: "bg-amber-100 text-amber-600",
    danger: "bg-red-100 text-red-600",
};

export default function ConfirmDialog({
    open,
    title,
    description,
    children,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    loading = false,
    requireText,
    confirmDisabled = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const titleId = useId();
    const descId = useId();
    const [typed, setTyped] = useState("");
    const panelRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        if (open) setTyped("");
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const prevFocus = document.activeElement as HTMLElement | null;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const t = window.setTimeout(() => {
            const el = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
                panelRef.current?.querySelector<HTMLElement>("button");
            el?.focus();
        }, 0);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !loading) {
                e.stopPropagation();
                onCancel();
            } else if (e.key === "Tab" && panelRef.current) {
                const f = panelRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
                );
                if (f.length === 0) return;
                const first = f[0];
                const last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            window.clearTimeout(t);
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
            prevFocus?.focus?.();
        };
    }, [open, loading, onCancel]);

    if (!open || !mounted) return null;

    const typedOk = !requireText || typed.trim() === requireText.trim();
    const disabled = loading || !typedOk || confirmDisabled;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !loading) onCancel();
            }}
        >
            <div
                ref={panelRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${VARIANT_ICON[variant]}`}>
                        <AlertTriangle className="w-5 h-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="text-base font-semibold text-slate-900 break-words">
                            {title}
                        </h2>
                        {description && (
                            <div id={descId} className="mt-1.5 text-sm text-slate-600 break-words">
                                {description}
                            </div>
                        )}
                    </div>
                </div>
                {children && <div className="mt-4">{children}</div>}
                {requireText && (
                    <div className="mt-4">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Type <span className="font-mono font-semibold text-slate-900 break-all">{requireText}</span> to confirm
                        </label>
                        <input
                            data-autofocus
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            autoComplete="off"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                        />
                    </div>
                )}
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => void onConfirm()}
                        disabled={disabled}
                        className={`px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_BTN[variant]}`}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
