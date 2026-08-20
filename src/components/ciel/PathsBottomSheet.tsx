"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { CIEL_PATHS } from "@/utils/cielPaths";
import type { CielImpactSummary } from "@/utils/cielImpactSummary";
import { pathStateLabel } from "@/utils/cielPaths";

export default function PathsBottomSheet({
    open,
    onClose,
    pathsStatus,
}: {
    open: boolean;
    onClose: () => void;
    pathsStatus?: CielImpactSummary["pathsStatus"];
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="My paths">
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 bg-ciel-text/40"
            />
            <div className="ciel-crossfade-enter absolute inset-x-0 bottom-0 rounded-t-ciel-xl bg-white p-5 pb-8 shadow-[0_-12px_30px_-20px_rgba(15,23,42,0.45)]">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-ciel-text">My paths</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-ciel-text-soft hover:bg-ciel-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-4 space-y-2">
                    {CIEL_PATHS.map((path) => {
                        const status = pathsStatus?.[path.key];
                        return (
                            <Link
                                key={path.key}
                                href={path.href}
                                onClick={onClose}
                                className="ciel-transition flex items-center gap-3 rounded-ciel-md border border-ciel-border px-4 py-3 hover:border-ciel-green/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                            >
                                <span className="text-xl" aria-hidden>{path.emoji}</span>
                                <span className="flex-1">
                                    <span className="block text-sm font-bold text-ciel-text">{path.label}</span>
                                    <span className="block text-xs text-ciel-text-soft">{pathStateLabel(status?.state ?? "not_started")}</span>
                                </span>
                                {status?.needsAction && <span className="h-2 w-2 rounded-full bg-ciel-amber" aria-label="Needs action" />}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
