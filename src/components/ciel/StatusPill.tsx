"use client";

import clsx from "clsx";
import { Circle, Clock, CheckCircle2 } from "lucide-react";

export type CielHourStatus = "logged" | "pending" | "verified";

const CONFIG: Record<CielHourStatus, { label: string; icon: typeof Circle; classes: string }> = {
    logged: {
        label: "Logged",
        icon: Circle,
        classes: "bg-slate-100 text-ciel-text-mid border-ciel-border",
    },
    pending: {
        label: "Pending",
        icon: Clock,
        classes: "bg-ciel-amber-soft text-ciel-amber border-ciel-amber/20",
    },
    verified: {
        label: "Verified",
        icon: CheckCircle2,
        classes: "bg-ciel-green-soft text-ciel-green-deep border-ciel-green/30",
    },
};

/** Hours status is always icon + label together — never colour alone. */
export default function StatusPill({ status, className }: { status: CielHourStatus; className?: string }) {
    const cfg = CONFIG[status];
    const Icon = cfg.icon;
    return (
        <span
            className={clsx(
                "inline-flex items-center gap-1.5 rounded-ciel-xs border px-2.5 py-1 text-xs font-semibold",
                cfg.classes,
                className,
            )}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {cfg.label}
        </span>
    );
}
