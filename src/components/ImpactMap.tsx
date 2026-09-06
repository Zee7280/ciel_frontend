"use client";

import { useMemo, useState } from "react";
import { usePlatformStats, type CityImpactStat } from "@/utils/usePlatformStats";
import { PAKISTAN_PROVINCE_LABELS, pakistanOutlinePath, pakistanProvincePaths, projectLonLat } from "@/utils/pakistanMapGeo";

type MetricKey = "peopleServing" | "peopleServed" | "verifiedHours" | "resourcesDeployedPkr" | "communityDividendPkr";

const METRICS: { key: MetricKey; label: string; format: (n: number) => string }[] = [
    { key: "peopleServing", label: "People serving", format: (n) => n.toLocaleString("en-US") },
    { key: "peopleServed", label: "Community served", format: (n) => n.toLocaleString("en-US") },
    { key: "verifiedHours", label: "Hours", format: (n) => `${n.toLocaleString("en-US")} h` },
    { key: "resourcesDeployedPkr", label: "Resources (PKR)", format: (n) => `PKR ${n.toLocaleString("en-US")}` },
    { key: "communityDividendPkr", label: "Dividend (PKR)", format: (n) => `PKR ${n.toLocaleString("en-US")}` },
];

function StatTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="block text-lg font-black leading-none text-slate-900">{value}</span>
            <span className="mt-1 block text-[10.5px] font-semibold text-slate-500">{label}</span>
        </div>
    );
}

export default function ImpactMap() {
    const { stats } = usePlatformStats();
    const cities = useMemo(() => stats?.cities ?? [], [stats]);
    const [metric, setMetric] = useState<MetricKey>("peopleServing");
    const [sdgFilter, setSdgFilter] = useState<number | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const availableSdgs = useMemo(() => {
        const s = new Set<number>();
        for (const c of cities) for (const g of c.sdgs) s.add(g);
        return [...s].sort((a, b) => a - b);
    }, [cities]);

    const filteredCities = useMemo(
        () => (sdgFilter == null ? cities : cities.filter((c) => c.sdgs.includes(sdgFilter))),
        [cities, sdgFilter],
    );

    const metricDef = METRICS.find((m) => m.key === metric)!;
    const maxVal = Math.max(1, ...filteredCities.map((c) => c[metric] as number));
    const rankedCities = useMemo(
        () => [...filteredCities].sort((a, b) => (b[metric] as number) - (a[metric] as number)),
        [filteredCities, metric],
    );
    const selected: CityImpactStat | null = filteredCities.find((c) => c.id === selectedId) ?? rankedCities[0] ?? null;

    const outlinePath = useMemo(() => pakistanOutlinePath(), []);
    const provincePaths = useMemo(() => pakistanProvincePaths(), []);

    return (
        <section id="impact-map" className="scroll-mt-24 bg-white px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <p className="mb-3 text-xs font-black uppercase tracking-widest text-emerald-600">Where impact lands</p>
                        <h2 className="max-w-[22ch] text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                            Zoom into any city. Every pin is a verified record.
                        </h2>
                    </div>
                    <p className="max-w-md text-base font-medium text-slate-500">
                        Bubble size follows the metric you pick. Filter by an SDG to see which cities are working on it — every number here comes from verified reports, not estimates.
                    </p>
                </div>

                {cities.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-8 py-16 text-center">
                        <p className="text-sm font-semibold text-slate-500">
                            🌱 Pilot is live — no city has a fully verified Community Service record yet. This map lights up the moment the first one clears review.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                        {/* MAP CARD */}
                        <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-[0_18px_50px_rgba(14,42,51,0.08)]">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3">
                                <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
                                    {METRICS.map((m) => (
                                        <button
                                            key={m.key}
                                            type="button"
                                            onClick={() => setMetric(m.key)}
                                            className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
                                                metric === m.key ? "bg-ciel-navy text-white" : "text-slate-600 hover:text-slate-900"
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                                {availableSdgs.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
                                        <button
                                            type="button"
                                            onClick={() => setSdgFilter(null)}
                                            className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
                                                sdgFilter === null ? "bg-ciel-green text-ciel-navy" : "text-slate-600 hover:text-slate-900"
                                            }`}
                                        >
                                            All SDGs
                                        </button>
                                        {availableSdgs.map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setSdgFilter(n)}
                                                className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
                                                    sdgFilter === n ? "bg-ciel-green text-ciel-navy" : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                SDG {n}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <svg viewBox="0 0 560 500" className="w-full" role="img" aria-label="Map of Pakistan with CIEL verified activity by city">
                                <path d={outlinePath} fill="#F3F6F4" stroke="#C3D1CD" strokeWidth={1.2} />
                                {provincePaths.map((d, i) => (
                                    <path key={i} d={d} fill="none" stroke="#C3D1CD" strokeWidth={1} strokeDasharray="3 3" />
                                ))}
                                {PAKISTAN_PROVINCE_LABELS.map(([label, lon, lat]) => {
                                    const [x, y] = projectLonLat(lon, lat);
                                    return (
                                        <text key={label} x={x} y={y} textAnchor="middle" fontSize={9} fontWeight={700} letterSpacing={1} fill="#7C9198">
                                            {label}
                                        </text>
                                    );
                                })}
                                {[...filteredCities]
                                    .sort((a, b) => (b[metric] as number) - (a[metric] as number))
                                    .map((c) => {
                                        const [x, y] = projectLonLat(c.lon, c.lat);
                                        const val = c[metric] as number;
                                        const r = 6 + (val / maxVal) * 16;
                                        const isSelected = selected?.id === c.id;
                                        return (
                                            <g
                                                key={c.id}
                                                onClick={() => setSelectedId(c.id)}
                                                className="cursor-pointer"
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => e.key === "Enter" && setSelectedId(c.id)}
                                            >
                                                <title>
                                                    {c.name}: {metricDef.format(val)}
                                                </title>
                                                <circle cx={x} cy={y} r={r + 6} fill={isSelected ? "rgba(201,138,4,.15)" : "rgba(76,195,138,.15)"} />
                                                <circle cx={x} cy={y} r={r} fill={isSelected ? "#C98A04" : "#1FA377"} fillOpacity={0.85} />
                                                <circle cx={x} cy={y} r={3.5} fill={isSelected ? "#8A6003" : "#0B6B4C"} />
                                                <text x={x + 12} y={y - 8} fontSize={10.5} fontWeight={700} fill="#12272E">
                                                    {c.name}
                                                </text>
                                            </g>
                                        );
                                    })}
                            </svg>
                        </div>

                        {/* SIDE PANEL */}
                        <div className="flex flex-col gap-4">
                            {selected ? (
                                <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_18px_50px_rgba(14,42,51,0.08)]">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                                        Selected city · {selected.province}
                                    </p>
                                    <h3 className="mt-1 text-2xl font-black text-slate-900">{selected.name}</h3>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        {selected.verifiedReports} verified {selected.verifiedReports === 1 ? "report" : "reports"} · {selected.partners.length}{" "}
                                        {selected.partners.length === 1 ? "partner" : "partners"}
                                    </p>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <StatTile label="People serving" value={selected.peopleServing.toLocaleString("en-US")} />
                                        <StatTile label="Community served" value={selected.peopleServed.toLocaleString("en-US")} />
                                        <StatTile label="Verified hours" value={selected.verifiedHours.toLocaleString("en-US")} />
                                        <StatTile label="Resources deployed" value={`PKR ${(selected.resourcesDeployedPkr / 1000).toFixed(0)}k`} />
                                    </div>

                                    <div className="mt-2 rounded-xl border border-ciel-gold/35 bg-gradient-to-br from-ciel-gold/15 to-ciel-gold/5 p-3">
                                        <span className="block text-xl font-black leading-none text-ciel-gold-deep">
                                            PKR {selected.communityDividendPkr.toLocaleString("en-US")}
                                        </span>
                                        <span className="mt-1 block text-[10.5px] font-semibold text-slate-500">
                                            {selected.verifiedHours} h × 500 + PKR {selected.outOfPocketPkr.toLocaleString("en-US")} out-of-pocket
                                        </span>
                                    </div>

                                    {selected.sdgs.length ? (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {selected.sdgs.map((n) => (
                                                <span key={n} className="rounded-full bg-ciel-green-soft px-2 py-0.5 text-[10px] font-bold text-ciel-green-deep">
                                                    SDG {n}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}

                                    {selected.partners.length ? (
                                        <p className="mt-3 text-xs text-slate-500">
                                            <b className="font-semibold text-slate-700">Partners:</b> {selected.partners.join(", ")}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="rounded-[18px] border border-slate-100 bg-white p-2 shadow-[0_18px_50px_rgba(14,42,51,0.08)]">
                                {rankedCities.map((c) => {
                                    const val = c[metric] as number;
                                    const pct = Math.max(4, Math.round((val / maxVal) * 100));
                                    const isSelected = selected?.id === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setSelectedId(c.id)}
                                            className={`block w-full rounded-xl px-3 py-2 text-left transition ${isSelected ? "bg-ciel-green-soft" : "hover:bg-slate-50"}`}
                                        >
                                            <span className="flex items-center justify-between text-[12.5px]">
                                                <span className="font-bold text-slate-800">{c.name}</span>
                                                <span className="font-mono text-slate-500">{metricDef.format(val)}</span>
                                            </span>
                                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <span
                                                    className={`block h-full rounded-full ${isSelected ? "bg-ciel-gold" : "bg-ciel-green"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
