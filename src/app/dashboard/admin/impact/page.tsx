"use client";

import { useState, useEffect } from "react";
import { Clock, Globe, Loader2, Building2, Landmark, Flag } from "lucide-react";
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

type DistributionRow = { count: number; [key: string]: string | number };

type StakeholderData = {
    hec?: {
        total_participants?: number;
        verified_students?: number;
        verification_rate_percent?: number;
        institution_count?: number;
        degree_distribution?: Array<{ degree: string; count: number }>;
        academic_integration_distribution?: Array<{ academic_integration_type: string; count: number }>;
        total_required_hours?: number;
    };
    government?: {
        total_engagement?: number;
        participation_by_region?: Array<{ region: string; count: number }>;
        academic_integration_mix?: Array<{ academic_integration_type: string; count: number }>;
        growth_rate_percent?: number | null;
        growth_meta?: { previous_total?: number; current_total?: number; previous_label?: string };
    };
    un?: {
        total_participants?: number;
        formal_integration_rate_percent?: number;
        formal_integration_enrollments?: number;
        formal_integration_denominator_enrollments?: number;
        participation_structure?: Array<{ participation_type: string; count: number }>;
    };
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

function labelParticipationType(raw: string): string {
    const v = raw.toLowerCase();
    if (v === "team") return "Team";
    if (v === "individual") return "Individual";
    return raw;
}

function DistributionBars({
    title,
    rows,
    labelKey,
}: {
    title: string;
    rows: DistributionRow[];
    labelKey: string;
}) {
    if (!rows.length) {
        return (
            <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
                <p className="mt-1 text-sm text-slate-500">No rows in scope.</p>
            </div>
        );
    }
    const max = Math.max(...rows.map((r) => r.count), 1);
    return (
        <div className="mt-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
            {rows.map((row, i) => {
                const label = String(row[labelKey] ?? "");
                const pct = (row.count / max) * 100;
                return (
                    <div key={`${label}-${i}`} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span className="min-w-0 truncate pr-2">{label}</span>
                            <span className="shrink-0 tabular-nums">{row.count.toLocaleString()}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const FETCH_OPTS = { timeoutMs: 60_000 } as const;

export default function AdminImpactPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [stakeholderLoading, setStakeholderLoading] = useState(true);
    const [hoursData, setHoursData] = useState<TrendPoint[]>([]);
    const [sdgData, setSdgData] = useState<SdgPoint[]>([]);
    const [stats, setStats] = useState<ImpactStats>(emptyStats);
    const [stakeholder, setStakeholder] = useState<StakeholderData | null>(null);
    const [impactError, setImpactError] = useState<string | null>(null);
    const [stakeholderError, setStakeholderError] = useState<string | null>(null);

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

        const fetchStakeholders = async () => {
            setStakeholderLoading(true);
            setStakeholderError(null);
            try {
                const res = await authenticatedFetch(
                    resolveSameOriginApiPath(`/api/v1/admin/analytics/impact-stakeholders`),
                    {},
                    FETCH_OPTS,
                );
                if (!res) {
                    setStakeholderError("Unable to load stakeholder metrics (session or network).");
                    return;
                }
                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({})) as { message?: string; error?: string };
                    setStakeholderError(
                        (typeof errBody?.message === "string" && errBody.message) ||
                            (typeof errBody?.error === "string" && errBody.error) ||
                            `Stakeholder metrics failed (${res.status}). Is the API deployed?`,
                    );
                    return;
                }
                const data = await res.json().catch(() => null);
                if (data?.success && data.data) {
                    setStakeholder(data.data as StakeholderData);
                } else {
                    setStakeholderError("Stakeholder response was not successful.");
                }
            } catch (error) {
                console.error("Failed to fetch stakeholder impact data", error);
                setStakeholderError(
                    error instanceof Error && error.name === "AbortError"
                        ? "Request timed out. Try again."
                        : "Failed to load stakeholder metrics.",
                );
            } finally {
                setStakeholderLoading(false);
            }
        };

        void fetchImpactData();
        void fetchStakeholders();
    }, []);

    const hec = stakeholder?.hec;
    const gov = stakeholder?.government;
    const un = stakeholder?.un;

    return (
        <div className="p-0 lg:p-8">
            <div className="mb-8 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Impact Analytics</h1>
                    <p className="text-slate-500">Deep dive into social impact metrics and stakeholder views (HEC, Government, UN).</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex">
                    <select className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 outline-none">
                        <option>Last 6 Months</option>
                        <option>This Year</option>
                    </select>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Download Report</button>
                </div>
            </div>

            {(impactError || stakeholderError) && (
                <div className="mb-6 space-y-2">
                    {impactError ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                            <strong className="font-bold">Impact charts:</strong> {impactError}
                        </div>
                    ) : null}
                    {stakeholderError ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                            <strong className="font-bold">Stakeholder metrics:</strong> {stakeholderError}
                        </div>
                    ) : null}
                </div>
            )}

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

            <div className="mt-12 border-t border-slate-200 pt-10">
                <h2 className="text-xl font-bold text-slate-900">Stakeholder reporting</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Derived from all student accounts and active (non-rejected) enrolment rows. Regions use student city when present,
                    else opportunity location (city or province).
                </p>

                {stakeholderLoading ? (
                    <div className="mt-8 flex items-center justify-center gap-2 py-16 text-slate-600">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <span className="text-sm font-medium">Loading stakeholder metrics…</span>
                    </div>
                ) : stakeholderError ? (
                    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                        {stakeholderError}
                    </div>
                ) : (
                    <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <Building2 className="h-6 w-6 text-amber-600" />
                                <h3 className="text-lg font-bold text-slate-900">HEC</h3>
                            </div>
                            <ul className="space-y-3 text-sm">
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-600">Total participants</span>
                                    <span className="font-bold tabular-nums text-slate-900">
                                        {(hec?.total_participants ?? 0).toLocaleString()}
                                    </span>
                                </li>
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-600">Verification rate</span>
                                    <span className="font-bold tabular-nums text-slate-900">
                                        {(hec?.verification_rate_percent ?? 0).toLocaleString()}%
                                    </span>
                                </li>
                                <li className="text-xs text-slate-500">
                                    {toNumber(hec?.verified_students).toLocaleString()} verified (profile + identity) of{" "}
                                    {toNumber(hec?.total_participants).toLocaleString()} students
                                </li>
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-600">Institution count</span>
                                    <span className="font-bold tabular-nums text-slate-900">
                                        {(hec?.institution_count ?? 0).toLocaleString()}
                                    </span>
                                </li>
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-600">Total required hours</span>
                                    <span className="font-bold tabular-nums text-slate-900">
                                        {toNumber(hec?.total_required_hours).toLocaleString(undefined, {
                                            maximumFractionDigits: 1,
                                        })}
                                    </span>
                                </li>
                            </ul>
                            <DistributionBars
                                title="Degree distribution"
                                rows={hec?.degree_distribution ?? []}
                                labelKey="degree"
                            />
                            <DistributionBars
                                title="Academic integration"
                                rows={hec?.academic_integration_distribution ?? []}
                                labelKey="academic_integration_type"
                            />
                        </section>

                        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <Landmark className="h-6 w-6 text-emerald-700" />
                                <h3 className="text-lg font-bold text-slate-900">Government</h3>
                            </div>
                            <ul className="space-y-3 text-sm">
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-600">Total engagement</span>
                                    <span className="font-bold tabular-nums text-slate-900">
                                        {(gov?.total_engagement ?? 0).toLocaleString()}
                                    </span>
                                </li>
                                <li className="text-xs text-slate-500">Count of all student accounts (same basis as HEC participants).</li>
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-600">Growth rate</span>
                                    <span className="font-bold tabular-nums text-emerald-700">
                                        {gov?.growth_rate_percent == null
                                            ? "—"
                                            : `${gov.growth_rate_percent >= 0 ? "+" : ""}${gov.growth_rate_percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
                                    </span>
                                </li>
                                <li className="text-xs text-slate-500">
                                    vs students created before this UTC month (
                                    {toNumber(gov?.growth_meta?.previous_total).toLocaleString()} →{" "}
                                    {toNumber(gov?.growth_meta?.current_total).toLocaleString()})
                                </li>
                            </ul>
                            <DistributionBars
                                title="Participation by region"
                                rows={gov?.participation_by_region ?? []}
                                labelKey="region"
                            />
                            <DistributionBars
                                title="Academic integration mix"
                                rows={gov?.academic_integration_mix ?? []}
                                labelKey="academic_integration_type"
                            />
                        </section>

                        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <Flag className="h-6 w-6 text-sky-600" />
                                <h3 className="text-lg font-bold text-slate-900">UN</h3>
                            </div>
                            <ul className="space-y-3 text-sm">
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-600">Total participants</span>
                                    <span className="font-bold tabular-nums text-slate-900">
                                        {(un?.total_participants ?? 0).toLocaleString()}
                                    </span>
                                </li>
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-600">Formal integration rate</span>
                                    <span className="font-bold tabular-nums text-slate-900">
                                        {(un?.formal_integration_rate_percent ?? 0).toLocaleString()}%
                                    </span>
                                </li>
                                <li className="text-xs text-slate-500">
                                    Course-linked, credit-bearing, and research-integrated rows:{" "}
                                    {toNumber(un?.formal_integration_enrollments).toLocaleString()} of{" "}
                                    {toNumber(un?.formal_integration_denominator_enrollments).toLocaleString()} enrolments
                                </li>
                            </ul>
                            <div className="mt-4 space-y-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Participation structure</p>
                                {(un?.participation_structure ?? []).length === 0 ? (
                                    <p className="text-sm text-slate-500">No enrolments in scope.</p>
                                ) : (
                                    (un?.participation_structure ?? []).map((row, i) => {
                                        const max = Math.max(...(un?.participation_structure ?? []).map((r) => r.count), 1);
                                        const pct = (row.count / max) * 100;
                                        return (
                                            <div key={`${row.participation_type}-${i}`} className="space-y-1">
                                                <div className="flex justify-between text-xs font-semibold text-slate-700">
                                                    <span>{labelParticipationType(row.participation_type)}</span>
                                                    <span className="tabular-nums">{row.count.toLocaleString()}</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
