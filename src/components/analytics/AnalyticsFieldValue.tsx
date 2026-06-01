"use client";

import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock,
    Hash,
    Layers,
    Lock,
    LockOpen,
    ShieldCheck,
    Target,
    TrendingUp,
    Users,
} from "lucide-react";
import {
    ANALYTICS_CHART_COLORS,
    progressBarColor,
    statusTone,
    toneClasses,
} from "@/components/analytics/analyticsFieldStyles";
import { section1FieldLabel, type Section1AnalyticsFieldMeta } from "@/utils/section1Analytics";

type DistributionRow = { label?: string; count?: number };

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === "object" && !Array.isArray(v);
}

function num(v: unknown, fallback = 0): number {
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function pct(v: unknown): number {
    const n = num(v);
    return Math.max(0, Math.min(100, Math.round(n)));
}

function isDistribution(value: unknown): value is DistributionRow[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((row) => isPlainObject(row) && ("label" in row || "count" in row))
    );
}

function ProgressBar({
    percent,
    label,
    sublabel,
}: {
    percent: number;
    label?: string;
    sublabel?: string;
}) {
    const p = pct(percent);
    return (
        <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
                <span className="text-2xl font-bold tabular-nums text-slate-900">{p}%</span>
                {label ? <span className="text-xs font-medium text-slate-500">{label}</span> : null}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full transition-[width] ${progressBarColor(p)}`}
                    style={{ width: `${p}%` }}
                />
            </div>
            {sublabel ? <p className="text-xs text-slate-500">{sublabel}</p> : null}
        </div>
    );
}

function StatusBadge({ text }: { text: string }) {
    const tone = statusTone(text);
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${toneClasses(tone)}`}>
            {tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}
            {tone === "warning" ? <Clock className="h-4 w-4" /> : null}
            {tone === "danger" ? <AlertTriangle className="h-4 w-4" /> : null}
            {text}
        </span>
    );
}

function RatioKpi({
    current,
    total,
    suffix,
    icon: Icon,
}: {
    current: number;
    total: number;
    suffix?: string;
    icon?: typeof Users;
}) {
    const percent = total > 0 ? Math.round((100 * current) / total) : 0;
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                {Icon ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Icon className="h-4 w-4" />
                    </div>
                ) : null}
                <div>
                    <p className="text-2xl font-bold tabular-nums text-slate-900">
                        {current.toLocaleString()}
                        <span className="text-base font-semibold text-slate-400"> / {total.toLocaleString()}</span>
                    </p>
                    {suffix ? <p className="text-xs text-slate-500">{suffix}</p> : null}
                </div>
            </div>
            <ProgressBar percent={percent} sublabel={`${percent}% of total`} />
        </div>
    );
}

function DistributionChart({ rows }: { rows: DistributionRow[] }) {
    const sorted = [...rows].sort((a, b) => num(b.count) - num(a.count)).slice(0, 6);
    const max = Math.max(1, ...sorted.map((r) => num(r.count)));

    return (
        <div className="space-y-3">
            {sorted.map((row, index) => {
                const label = String(row.label ?? "Unspecified");
                const count = num(row.count);
                const width = (count / max) * 100;
                const color = ANALYTICS_CHART_COLORS[index % ANALYTICS_CHART_COLORS.length];
                return (
                    <div key={`${label}-${index}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate font-medium text-slate-700" title={label}>
                                {label}
                            </span>
                            <span className="shrink-0 font-bold tabular-nums text-slate-900">{count.toLocaleString()}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function StatusBreakdown({ completed, inProgress }: { completed: number; inProgress: number }) {
    const c = pct(completed);
    const p = pct(inProgress);
    return (
        <div className="space-y-3">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: `${c}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${p}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClasses("success")}`}>
                    Completed {c}%
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClasses("warning")}`}>
                    In progress {p}%
                </span>
            </div>
        </div>
    );
}

function StepperProgress({
    current,
    total,
    percent,
    aggregated,
}: {
    current?: number;
    total?: number;
    percent?: number;
    aggregated?: boolean;
}) {
    if (aggregated && percent != null) {
        return <ProgressBar percent={percent} label="Average completion" sublabel="Across cohort" />;
    }
    const cur = num(current);
    const tot = Math.max(1, num(total));
    const p = percent != null ? pct(percent) : pct((cur / tot) * 100);
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">
                    Step {cur} of {tot}
                </span>
                <span className="font-bold tabular-nums text-indigo-600">{p}%</span>
            </div>
            <div className="flex gap-1">
                {Array.from({ length: Math.min(tot, 11) }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-2 flex-1 rounded-full ${i < cur ? "bg-indigo-500" : "bg-slate-200"}`}
                    />
                ))}
            </div>
        </div>
    );
}

function ScoreCard({ score, breakdown }: { score: number; breakdown?: Record<string, unknown> }) {
    const s = num(score);
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
                    <Target className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-3xl font-black tabular-nums text-slate-900">{s}</p>
                    <p className="text-xs font-medium text-slate-500">Readiness score</p>
                </div>
            </div>
            {breakdown && Object.keys(breakdown).length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(breakdown).map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-slate-50 px-2.5 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                            <p className="text-sm font-bold tabular-nums text-slate-800">{pct(v)}%</p>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function TitleCard({ value }: { value: unknown }) {
    if (typeof value === "string") {
        return <p className="text-base font-semibold leading-snug text-slate-900">{value || "—"}</p>;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return <p className="text-sm text-slate-500">No projects in scope</p>;
        return (
            <ul className="space-y-1.5">
                {value.slice(0, 4).map((item, i) => (
                    <li key={i} className="truncate text-sm font-medium text-slate-800" title={String(item)}>
                        {String(item)}
                    </li>
                ))}
                {value.length > 4 ? (
                    <li className="text-xs font-semibold text-indigo-600">+{value.length - 4} more projects</li>
                ) : null}
            </ul>
        );
    }
    if (isPlainObject(value) && "project_count" in value) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Layers className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold tabular-nums text-slate-900">{num(value.project_count)}</p>
                    <p className="text-xs text-slate-500">Projects in scope</p>
                </div>
            </div>
        );
    }
    return null;
}

function BooleanBanner({
    positive,
    positiveLabel,
    negativeLabel,
    detail,
}: {
    positive: boolean;
    positiveLabel: string;
    negativeLabel: string;
    detail?: string;
}) {
    return (
        <div
            className={`rounded-xl border px-4 py-3 ${
                positive ? "border-emerald-200 bg-emerald-50/80" : "border-amber-200 bg-amber-50/80"
            }`}
        >
            <div className="flex items-start gap-2">
                {positive ? (
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                )}
                <div>
                    <p className={`text-sm font-bold ${positive ? "text-emerald-800" : "text-amber-900"}`}>
                        {positive ? positiveLabel : negativeLabel}
                    </p>
                    {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
                </div>
            </div>
        </div>
    );
}

type AnalyticsFieldValueProps = {
    fieldKey: string;
    value: unknown;
    meta?: Section1AnalyticsFieldMeta;
};

export default function AnalyticsFieldValue({ fieldKey, value }: AnalyticsFieldValueProps) {
    if (value == null) {
        return <p className="text-sm text-slate-500">No data yet</p>;
    }

    if (fieldKey === "project_title") {
        return <TitleCard value={value} />;
    }

    if (typeof value === "string") {
        return <StatusBadge text={value} />;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return (
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Hash className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {typeof value === "boolean" ? (value ? "Yes" : "No") : value.toLocaleString()}
                </p>
            </div>
        );
    }

    if (isDistribution(value)) {
        return <DistributionChart rows={value} />;
    }

    if (isPlainObject(value)) {
        if ("completed_percent" in value && "in_progress_percent" in value) {
            return (
                <StatusBreakdown
                    completed={num(value.completed_percent)}
                    inProgress={num(value.in_progress_percent)}
                />
            );
        }

        if ("current_step" in value || "average_percent" in value || value.aggregated === true) {
            return (
                <StepperProgress
                    current={num(value.current_step)}
                    total={num(value.total_steps)}
                    percent={value.percent != null ? num(value.percent) : num(value.average_percent)}
                    aggregated={value.aggregated === true}
                />
            );
        }

        if ("verified_hours" in value && "required_hours" in value) {
            const verified = num(value.verified_hours);
            const required = num(value.required_hours);
            const hourPercent =
                value.percent != null ? num(value.percent) : required > 0 ? Math.round((100 * verified) / required) : 0;
            return (
                <ProgressBar
                    percent={hourPercent}
                    label={`${verified.toLocaleString()} / ${required.toLocaleString()} hrs`}
                    sublabel="Verified community hours"
                />
            );
        }

        if ("unlocked_count" in value && "total" in value) {
            const unlocked = num(value.unlocked_count);
            const total = num(value.total);
            return (
                <div className="space-y-3">
                    <BooleanBanner
                        positive={unlocked >= total && total > 0}
                        positiveLabel="Attendance logging unlocked"
                        negativeLabel="Attendance logging partially locked"
                        detail={`${unlocked.toLocaleString()} of ${total.toLocaleString()} enrollments unlocked`}
                    />
                    <RatioKpi current={unlocked} total={Math.max(total, 1)} icon={unlocked >= total ? LockOpen : Lock} />
                </div>
            );
        }

        if ("configured_teams" in value && "total_teams" in value) {
            return (
                <RatioKpi
                    current={num(value.configured_teams)}
                    total={Math.max(num(value.total_teams), 1)}
                    suffix="Teams configured"
                    icon={Users}
                />
            );
        }

        if ("verified_students" in value && "total_students" in value) {
            return (
                <RatioKpi
                    current={num(value.verified_students)}
                    total={Math.max(num(value.total_students), 1)}
                    suffix="Identity verified"
                    icon={ShieldCheck}
                />
            );
        }

        if ("students_with_academic_link" in value && "total_students" in value) {
            return (
                <RatioKpi
                    current={num(value.students_with_academic_link)}
                    total={Math.max(num(value.total_students), 1)}
                    suffix="Academic records linked"
                    icon={TrendingUp}
                />
            );
        }

        if ("students_acknowledged" in value && "total_students" in value) {
            return (
                <RatioKpi
                    current={num(value.students_acknowledged)}
                    total={Math.max(num(value.total_students), 1)}
                    suffix="Institutional purpose acknowledged"
                />
            );
        }

        if ("projects_with_audit_ready_logs" in value && "total_projects" in value) {
            return (
                <RatioKpi
                    current={num(value.projects_with_audit_ready_logs)}
                    total={Math.max(num(value.total_projects), 1)}
                    suffix="Projects with audit-ready logs"
                    icon={BarChart3}
                />
            );
        }

        if ("score" in value) {
            return (
                <ScoreCard
                    score={num(value.score)}
                    breakdown={isPlainObject(value.breakdown) ? value.breakdown : undefined}
                />
            );
        }

        if ("percent" in value) {
            const label =
                "completed_fields" in value && "required_fields" in value
                    ? `${num(value.completed_fields)} / ${num(value.required_fields)} fields`
                    : undefined;
            return <ProgressBar percent={num(value.percent)} sublabel={label} />;
        }

        if ("enabled" in value) {
            return (
                <BooleanBanner
                    positive={value.enabled === true}
                    positiveLabel="Audit-ready participation enabled"
                    negativeLabel="Audit-ready logs not yet available"
                    detail={
                        "audit_ready_log_count" in value
                            ? `${num(value.audit_ready_log_count)} verified log entries`
                            : undefined
                    }
                />
            );
        }

        if ("linked" in value) {
            return (
                <BooleanBanner
                    positive={value.linked === true}
                    positiveLabel="Academic record linked"
                    negativeLabel="Academic linkage pending"
                />
            );
        }

        if ("unlocked" in value) {
            return (
                <BooleanBanner
                    positive={value.unlocked === true}
                    positiveLabel="Unlocked"
                    negativeLabel="Locked"
                />
            );
        }

        if ("active" in value || "has_duplicates" in value || "warning_count" in value) {
            const warn =
                value.active === true || value.has_duplicates === true || num(value.warning_count) > 0;
            return (
                <BooleanBanner
                    positive={!warn}
                    positiveLabel="No compliance warnings"
                    negativeLabel="Compliance attention needed"
                    detail={
                        "warning_count" in value
                            ? `${num(value.warning_count)} items flagged`
                            : value.has_duplicates
                              ? "Potential duplicates detected"
                              : undefined
                    }
                />
            );
        }

        if ("verified" in value && typeof value.verified === "boolean") {
            return (
                <BooleanBanner
                    positive={value.verified}
                    positiveLabel="Verified"
                    negativeLabel="Not verified"
                />
            );
        }

        if ("fully_verified_teams" in value && "total_teams" in value) {
            return (
                <RatioKpi
                    current={num(value.fully_verified_teams)}
                    total={Math.max(num(value.total_teams), 1)}
                    suffix="Fully verified teams"
                    icon={Users}
                />
            );
        }

        if ("flagged_enrollments" in value) {
            const flagged = num(value.flagged_enrollments);
            return (
                <BooleanBanner
                    positive={flagged === 0}
                    positiveLabel="No red flags in scope"
                    negativeLabel={`${flagged.toLocaleString()} enrollments flagged`}
                />
            );
        }

        if ("progress_mode_count" in value) {
            return (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums text-slate-900">{num(value.progress_mode_count)}</p>
                        <p className="text-xs text-slate-500">Reports in progress mode</p>
                    </div>
                </div>
            );
        }

        if ("count" in value && Object.keys(value).length <= 2) {
            return (
                <p className="text-2xl font-bold tabular-nums text-slate-900">{num(value.count).toLocaleString()}</p>
            );
        }
    }

    return (
        <p className="text-sm font-medium leading-relaxed text-slate-700">
            {section1FieldLabel(fieldKey)} data is available but not yet visualized.
        </p>
    );
}

export function analyticsFieldSpan(fieldKey: string, value: unknown): "normal" | "wide" | "full" {
    if (fieldKey === "project_title") return "full";
    if (isDistribution(value)) return "wide";
    if (isPlainObject(value) && ("completed_percent" in value || "average_percent" in value)) return "wide";
    return "normal";
}
