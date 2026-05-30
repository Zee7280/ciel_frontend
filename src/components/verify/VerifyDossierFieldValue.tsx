import type { ReactNode } from "react";

function valueIsEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") {
        const t = value.trim();
        return !t || t.toLowerCase() === "not provided" || t === "—" || t === "-";
    }
    if (Array.isArray(value)) return value.length === 0;
    return false;
}

export function VerifyDossierFieldValue({ value }: { value: unknown }): ReactNode {
    if (valueIsEmpty(value)) {
        return (
            <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                Not provided
            </span>
        );
    }
    if (typeof value === "boolean") {
        return value ? (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Yes
            </span>
        ) : (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                No
            </span>
        );
    }
    if (typeof value === "string") {
        const t = value.trim();
        const lower = t.toLowerCase();
        if (lower === "yes" || lower === "true") {
            return (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Yes
                </span>
            );
        }
        if (lower === "no" || lower === "false") {
            return (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    No
                </span>
            );
        }
        return <span className="text-sm font-semibold text-slate-800 break-words">{t}</span>;
    }
    if (typeof value === "number") {
        return <span className="text-sm font-semibold text-slate-800">{value}</span>;
    }
    return <span className="text-sm font-semibold text-slate-800 break-words">{String(value)}</span>;
}
