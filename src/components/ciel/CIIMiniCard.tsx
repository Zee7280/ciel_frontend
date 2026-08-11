"use client";

import Link from "next/link";
import { impactScoreBand } from "@/utils/cielImpactBand";
import ProgressBar from "./ProgressBar";

export default function CIIMiniCard({ score, collapsed }: { score: number; collapsed?: boolean }) {
    const clamped = Math.max(0, Math.min(100, score));

    if (collapsed) {
        return (
            <Link
                href="/dashboard/student"
                className="ciel-transition mx-auto flex h-10 w-10 items-center justify-center rounded-ciel-sm bg-white/5 text-xs font-black text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                aria-label={`Composite impact index ${Math.round(clamped)}, ${impactScoreBand(clamped)}`}
            >
                {Math.round(clamped)}
            </Link>
        );
    }

    return (
        <Link
            href="/dashboard/student"
            className="ciel-transition block rounded-ciel-md border border-white/10 bg-white/5 p-3.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
        >
            <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">Impact Index</span>
                <span className="text-lg font-black text-white">{Math.round(clamped)}</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-ciel-green">{impactScoreBand(clamped)}</p>
            <ProgressBar value={clamped} className="mt-2" trackClassName="bg-white/10" />
        </Link>
    );
}
