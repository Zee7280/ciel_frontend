"use client";

import { useState, useEffect } from "react";
import { Loader2, Building2, Landmark, Flag } from "lucide-react";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";

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

function toNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
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

/** HEC / Government / UN stakeholder snapshot cards — extracted from the old standalone Impact page. */
export default function StakeholderSnapshotPanel() {
    const [stakeholderLoading, setStakeholderLoading] = useState(true);
    const [stakeholder, setStakeholder] = useState<StakeholderData | null>(null);
    const [stakeholderError, setStakeholderError] = useState<string | null>(null);

    useEffect(() => {
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

        void fetchStakeholders();
    }, []);

    const hec = stakeholder?.hec;
    const gov = stakeholder?.government;
    const un = stakeholder?.un;

    return (
        <div>
            <p className="text-sm text-slate-600">
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
    );
}
