"use client";

import { useState, useEffect } from "react";
import { Clock, Globe, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";

type ImpactStats = {
    activeVolunteers: number;
    partnerNgos: number;
    totalBeneficiaries: number;
};

type TrendPoint = {
    month: string;
    hours: number;
};

type SdgPoint = {
    name: string;
    value: number;
};

const emptyStats: ImpactStats = {
    activeVolunteers: 0,
    partnerNgos: 0,
    totalBeneficiaries: 0,
};

function toNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function normalizeStats(value: unknown): ImpactStats {
    const stats = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
        activeVolunteers: toNumber(stats.active_volunteers ?? stats.activeVolunteers),
        partnerNgos: toNumber(stats.partner_ngos ?? stats.partnerNgos),
        totalBeneficiaries: toNumber(stats.total_beneficiaries ?? stats.totalBeneficiaries),
    };
}

function normalizeHoursTrend(value: unknown): TrendPoint[] {
    return Array.isArray(value)
        ? value.map((row) => {
              const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
              return {
                  month: String(item.month ?? item.name ?? ""),
                  hours: toNumber(item.hours),
              };
          })
        : [];
}

function normalizeSdgImpact(value: unknown): SdgPoint[] {
    return Array.isArray(value)
        ? value.map((row) => {
              const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
              return {
                  name: String(item.name ?? item.sdg ?? "Unknown"),
                  value: toNumber(item.value ?? item.hours),
              };
          })
        : [];
}

const FETCH_OPTS = { timeoutMs: 60_000 } as const;

/** Hours trend + SDG impact charts + headline stat cards — extracted from the old standalone Impact page. */
export default function ImpactHighlightsPanel() {
    const [isLoading, setIsLoading] = useState(true);
    const [hoursData, setHoursData] = useState<TrendPoint[]>([]);
    const [sdgData, setSdgData] = useState<SdgPoint[]>([]);
    const [stats, setStats] = useState<ImpactStats>(emptyStats);
    const [impactError, setImpactError] = useState<string | null>(null);

    useEffect(() => {
        const fetchImpactData = async () => {
            setIsLoading(true);
            setImpactError(null);
            try {
                const res = await authenticatedFetch(
                    resolveSameOriginApiPath(`/api/v1/admin/analytics/impact`),
                    {},
                    FETCH_OPTS,
                );
                if (!res) {
                    setImpactError("Unable to load impact analytics (session or network).");
                    return;
                }
                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({})) as { message?: string; error?: string };
                    setImpactError(
                        (typeof errBody?.message === "string" && errBody.message) ||
                            (typeof errBody?.error === "string" && errBody.error) ||
                            `Request failed (${res.status}).`,
                    );
                    return;
                }
                const data = await res.json().catch(() => null);
                if (data?.success && data.data) {
                    setHoursData(normalizeHoursTrend(data.data.hours_trend));
                    setSdgData(normalizeSdgImpact(data.data.impact_by_sdg));
                    setStats(normalizeStats(data.data.stats));
                } else {
                    setImpactError("Impact analytics response was not successful.");
                }
            } catch (error) {
                console.error("Failed to fetch impact data", error);
                setImpactError(
                    error instanceof Error && error.name === "AbortError"
                        ? "Request timed out. Try again."
                        : "Failed to load impact analytics.",
                );
            } finally {
                setIsLoading(false);
            }
        };

        void fetchImpactData();
    }, []);

    return (
        <div>
            {impactError ? (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    <strong className="font-bold">Impact charts:</strong> {impactError}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="mb-6 flex items-center gap-2 font-bold text-slate-900">
                        <Clock className="h-5 w-5 text-blue-500" /> Volunteering Hours Trend
                    </h3>
                    <div className="h-[300px]">
                        {isLoading ? (
                            <div className="flex h-full items-center justify-center text-slate-500">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : impactError ? (
                            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                                Chart unavailable until the impact API loads successfully.
                            </div>
                        ) : hoursData.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500">
                                <p>No verified hours trend yet (no timesheets / approved impact reports in scope).</p>
                                <p className="text-xs text-slate-400">Data appears when students log verified hours or approved reports include hours.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={hoursData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="mb-6 flex items-center gap-2 font-bold text-slate-900">
                        <Globe className="h-5 w-5 text-green-500" /> Impact by SDG
                    </h3>
                    <div className="h-[300px]">
                        {isLoading ? (
                            <div className="flex h-full items-center justify-center text-slate-500">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            </div>
                        ) : impactError ? (
                            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                                Chart unavailable until the impact API loads successfully.
                            </div>
                        ) : sdgData.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500">
                                <p>No SDG impact hours in the current dataset.</p>
                                <p className="text-xs text-slate-400">Based on verified timesheets and approved student reports with hours.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sdgData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis />
                                    <Tooltip cursor={{ fill: "transparent" }} />
                                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="mb-1 text-sm text-slate-500">Active Volunteers</div>
                    <div className="mb-2 text-3xl font-bold text-slate-900">
                        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.activeVolunteers || 0).toLocaleString()}
                    </div>
                    <div className="inline-block rounded bg-green-50 px-2 py-1 text-xs font-bold text-green-600">Platform engagement</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="mb-1 text-sm text-slate-500">Partner NGOs</div>
                    <div className="mb-2 text-3xl font-bold text-slate-900">
                        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.partnerNgos || 0).toLocaleString()}
                    </div>
                    <div className="inline-block rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">Organizations</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="mb-1 text-sm text-slate-500">Total Beneficiaries</div>
                    <div className="mb-2 text-3xl font-bold text-slate-900">
                        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.totalBeneficiaries || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400">Estimated from project and report data</div>
                </div>
            </div>
        </div>
    );
}
