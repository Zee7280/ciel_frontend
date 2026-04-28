"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";

export type PendingActionTone = "urgent" | "warning" | "neutral" | "success";

export type PendingActionItem = {
    key: string;
    title: string;
    count: number;
    href: string;
    tone?: PendingActionTone;
    description?: string;
};

export type PendingSummary = {
    total: number;
    items: PendingActionItem[];
};

const toneStyles: Record<PendingActionTone, { card: string; icon: string; badge: string }> = {
    urgent: {
        card: "border-rose-100 bg-rose-50/60",
        icon: "bg-white text-rose-600 ring-1 ring-rose-100",
        badge: "bg-rose-600 text-white",
    },
    warning: {
        card: "border-amber-100 bg-amber-50/60",
        icon: "bg-white text-amber-600 ring-1 ring-amber-100",
        badge: "bg-amber-600 text-white",
    },
    neutral: {
        card: "border-blue-100 bg-blue-50/50",
        icon: "bg-white text-blue-600 ring-1 ring-blue-100",
        badge: "bg-blue-600 text-white",
    },
    success: {
        card: "border-emerald-100 bg-emerald-50/50",
        icon: "bg-white text-emerald-600 ring-1 ring-emerald-100",
        badge: "bg-emerald-600 text-white",
    },
};

function iconForTone(tone: PendingActionTone, count: number) {
    if (count === 0) return <CheckCircle2 className="h-5 w-5" />;
    if (tone === "urgent" || tone === "warning") return <AlertCircle className="h-5 w-5" />;
    return <Clock3 className="h-5 w-5" />;
}

export default function PendingActionCards({
    summary,
    emptyMessage = "No pending actions right now.",
}: {
    summary?: PendingSummary | null;
    emptyMessage?: string;
}) {
    const items = (summary?.items ?? []).filter((item) => item.count > 0);
    const displayTotal = summary?.total ?? items.reduce((sum, item) => sum + item.count, 0);

    if (items.length === 0) {
        return (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-600 ring-1 ring-emerald-100">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800">No pending actions</h3>
                        <p className="text-sm font-semibold text-emerald-700">{emptyMessage}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Pending actions</h3>
                    <p className="text-sm text-slate-500">
                        {displayTotal} item{displayTotal === 1 ? "" : "s"} need attention.
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {items.map((item) => {
                    const tone = item.tone ?? "neutral";
                    const styles = toneStyles[tone];
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`group flex min-h-[9rem] flex-col justify-between rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${styles.card}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
                                    {iconForTone(tone, item.count)}
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-black tabular-nums ${styles.badge}`}>
                                    {item.count > 99 ? "99+" : item.count}
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="font-black text-slate-900">{item.title}</p>
                                {item.description ? (
                                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-600">
                                        {item.description}
                                    </p>
                                ) : null}
                                <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-slate-700 transition group-hover:gap-1.5">
                                    Open <ArrowRight className="h-3.5 w-3.5" />
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
