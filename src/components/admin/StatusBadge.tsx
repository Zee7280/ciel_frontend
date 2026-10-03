import type { ReactNode } from "react";

type Tone = "green" | "amber" | "red" | "slate" | "blue" | "purple";

const TONE: Record<Tone, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_TONE: Record<string, Tone> = {
    active: "green",
    approved: "green",
    verified: "green",
    live: "green",
    completed: "green",
    pending: "amber",
    pending_membership_payment: "amber",
    pending_approval: "amber",
    pending_review: "amber",
    revision_requested: "amber",
    submitted: "blue",
    inactive: "slate",
    draft: "slate",
    suspended: "red",
    rejected: "red",
    declined: "red",
    expired: "red",
};

export function statusLabel(status: string | null | undefined): string {
    const s = String(status ?? "").trim();
    if (!s) return "Unknown";
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusTone(status: string | null | undefined): Tone {
    return STATUS_TONE[String(status ?? "").trim().toLowerCase()] ?? "slate";
}

export default function StatusBadge({
    status,
    label,
    tone,
    className = "",
    children,
}: {
    status?: string | null;
    label?: string;
    tone?: Tone;
    className?: string;
    children?: ReactNode;
}) {
    const t = tone ?? statusTone(status);
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${TONE[t]} ${className}`}
        >
            {children ?? label ?? statusLabel(status)}
        </span>
    );
}
