"use client";

import { usePlatformStats } from "@/utils/usePlatformStats";

/** The stats bar directly under the Hero — all real, backend-computed counts (same endpoint the
 * Hero ledger reads from), never illustrative numbers. */
export default function ImpactStrip() {
    const { stats } = usePlatformStats();

    const metrics = [
        { label: "Universities", value: stats?.universities ?? 0 },
        { label: "Partner organisations", value: stats?.partner_organisations ?? 0 },
        { label: "Verified projects", value: stats?.verified_projects_all_paths ?? 0 },
        { label: "Cities live", value: stats?.cities_live ?? 0 },
        { label: "SDGs touched", value: stats?.sdgs_touched_by_reports ?? 0 },
        { label: "Partners come back", value: stats?.partners_come_back_pct ?? 0, suffix: "%" },
    ];

    return (
        <div className="border-t border-white/10 bg-ciel-navy">
            <div className="mx-auto grid max-w-[1600px] grid-cols-2 bg-black/20 sm:grid-cols-3 lg:grid-cols-6">
                {metrics.map((m, i) => (
                    <div
                        key={m.label}
                        className={`px-5 py-5 sm:px-6 ${i < metrics.length - 1 ? "border-b border-r border-white/10 sm:border-b-0" : "border-b border-white/10 sm:border-b-0"}`}
                    >
                        <span className="block text-[28px] font-black leading-none text-white">
                            {m.value.toLocaleString("en-US")}
                            {m.suffix ?? ""}
                        </span>
                        <span className="mt-1.5 block text-[11.5px] font-semibold tracking-[0.02em] text-white/60">{m.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
