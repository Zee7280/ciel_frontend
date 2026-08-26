import React, { useMemo, useRef } from "react";
import {
    TrendingUp, Info, Plus, Trash2, CheckCircle2, AlertCircle,
    BarChart3, PlusCircle, ChevronDown, Target, Lock, Pencil, Repeat, Sparkle,
} from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { FieldError } from "./ui/FieldError";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

type MeasurableOutcome = {
    id: string;
    outcome_area: string;
    outcome_area_other?: string;
    outcome_sub_category: string;
    metric_category: string;
    metric: string;
    metric_other?: string;
    baseline: string;
    endline: string;
    unit: string;
    unit_other?: string;
    confidence_level: string[];
    measurement_explanation?: string;
};

const outcomeHierarchy: Record<string, string[]> = {
    "1. Access Improvement": [
        "Access to Education", "Access to Healthcare", "Access to Food / Nutrition",
        "Access to Clean Water / Sanitation", "Access to Financial Services",
        "Access to Public Services", "Access to Information",
    ],
    "2. Service Delivery / Immediate Relief": [
        "Food Distribution", "Medical Camps / Health Services",
        "Emergency Relief (Disaster / Crisis)", "Shelter Support",
        "Clothing Distribution", "Ramadan / Seasonal Campaigns",
    ],
    "3. Behavior Change": [
        "Hygiene Practices", "Environmental Awareness", "Health Awareness",
        "Financial Behavior Change", "Social Attitude Change (e.g., gender, inclusivity)",
        "Civic Responsibility",
    ],
    "4. Knowledge / Skills Improvement": [
        "Basic Education Support", "Literacy / Numeracy",
        "Soft Skills (Communication, Teamwork)", "Digital Literacy",
        "Academic Support / Tutoring", "Awareness Sessions",
    ],
    "5. Capacity Building (Advanced Training)": [
        "Vocational Training", "Professional Skills Development",
        "Entrepreneurship Training", "Leadership Development",
        "Technical Skills Training", "Teacher / Staff Training",
    ],
    "6. Economic Improvement": [
        "Household Income Support", "Cost Reduction / Financial Relief",
        "Microfinance / Financial Inclusion", "Business Support (Small Scale)",
        "Resource Optimization",
    ],
    "7. Livelihood / Employment Generation": [
        "Job Creation", "Freelancing Opportunities", "Small Business Setup",
        "Women Employment Initiatives", "Youth Employment Programs",
    ],
    "8. Health & Well-being": [
        "Physical Health Improvement", "Mental Health Support",
        "Nutrition Improvement", "Maternal / Child Health",
        "Preventive Healthcare", "Fitness & Lifestyle Improvement",
    ],
    "9. Environmental Improvement": [
        "Waste Management", "Tree Plantation", "Cleanliness Drives",
        "Water Conservation", "Climate Awareness", "Pollution Reduction",
    ],
    "10. Infrastructure / Facility Development": [
        "School Infrastructure Development", "Library Setup",
        "Water System Installation", "Sanitation Facilities",
        "Community Space Development", "Digital Labs / Learning Spaces",
    ],
    "11. Digital Inclusion / Technology Access": [
        "Access to Devices", "Internet Access", "Digital Skills Training",
        "Platform / System Development", "E-learning Enablement",
    ],
    "12. Institutional Strengthening": [
        "Process Improvement", "Capacity Building of Organization",
        "System Development", "Documentation & Reporting Systems",
        "Governance Support",
    ],
    "13. Inclusion / Participation": [
        "Gender Inclusion", "Disability Inclusion", "Youth Engagement",
        "Community Participation", "Marginalized Group Inclusion",
    ],
    "14. Partnership Strengthening": [
        "NGO Collaboration", "Corporate Partnerships", "Academic Partnerships",
        "Community Networks", "Public-Private Partnerships",
    ],
    "15. Policy Change / Advocacy": [
        "Policy Recommendations", "Awareness Campaigns for Policy",
        "Advocacy Initiatives", "Legal Awareness", "Community Mobilization",
    ],
    "16. Other": [],
};

const outcomeCategories = Object.keys(outcomeHierarchy);

const metricHierarchy: Record<string, string[]> = {
    "🔹 People-Based Metrics": [
        "Number of Individuals", "Number of Beneficiaries", "Number of Households",
        "Number of Participants", "Number of Students", "Number of Patients",
    ],
    "🔹 Distribution / Items": [
        "Number of Items Distributed", "Number of Kits Distributed",
        "Number of Packages Distributed", "Number of Meals Served", "Number of Units Delivered",
    ],
    "🔹 Financial Metrics": [
        "Amount (PKR)", "Amount (USD)", "Value of In-Kind Support (PKR/USD)",
        "Cost Savings Generated (PKR/USD)", "Funds Raised (PKR/USD)",
    ],
    "🔹 Time & Effort": [
        "Number of Hours Contributed", "Number of Volunteer Hours", "Number of Days", "Number of Weeks",
    ],
    "🔹 Sessions & Activities": [
        "Number of Sessions Conducted", "Number of Trainings Conducted",
        "Number of Workshops Conducted", "Number of Events Conducted", "Number of Campaigns Conducted",
    ],
    "🔹 Infrastructure / Outputs": [
        "Number of Facilities Developed", "Number of Systems Installed",
        "Number of Projects Completed", "Number of Spaces Created",
    ],
    "🔹 Environmental Metrics": [
        "Number of Trees Planted", "Waste Collected (kg / tons)",
        "Water Saved (liters)", "Area Cleaned (sq. ft / acres)",
    ],
    "🔹 Digital & Technology": [
        "Number of Devices Distributed", "Number of Users Enabled",
        "Number of Systems Developed", "Number of Platforms Created",
    ],
    "🔹 Economic / Livelihood": [
        "Number of Jobs Created", "Number of Businesses Supported", "Number of Individuals Employed",
    ],
    "🔹 Partnership & Engagement": [
        "Number of Partnerships", "Number of Organizations Engaged", "Number of Stakeholder Meetings",
    ],
    "🔹 Percentage-Based (Advanced)": [
        "Percentage Improvement (%)", "Percentage Increase in Access (%)", "Percentage Behavior Change (%)",
    ],
    "🔹 Other": [],
};

const metricCategories = Object.keys(metricHierarchy);
const METRIC_CATEGORY_OTHER = "🔹 Other";
const confidenceLevels = ["Directly Measured", "Partner Confirmed", "Observed", "Estimated"];

const inputClasses =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const selectClasses =
    "h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const textareaClasses =
    "min-h-[110px] w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const badgeMandatory =
    "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700";

function wordCount(text: string): number {
    return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

function lowerFirst(text: string): string {
    const t = (text || "").trim();
    return t ? t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/, "") : "";
}

function stripEmojiPrefix(text: string): string {
    return (text || "").replace(/^[^\s]+\s/, "");
}

const CHALLENGE_TAGS = [
    "⏰ Not enough time",
    "💸 Limited budget",
    "🚪 Access to the site",
    "📐 Hard to measure change",
    "🗓️ Scheduling with partner",
    "✨ Other",
];

function outcomeTitle(outcome: MeasurableOutcome): string {
    if (outcome.outcome_sub_category) return outcome.outcome_sub_category;
    if (outcome.outcome_area_other) return outcome.outcome_area_other;
    if (outcome.outcome_area) return outcome.outcome_area.replace(/^\d+\.\s*/, "");
    return "Unnamed outcome";
}

function formatImprovement(baseline: number, endline: number, metricCategory: string): string {
    const delta = endline - baseline;
    if (baseline === 0 && endline > 0) return "new";
    if (baseline === 0 && endline === 0) return "0";
    const isPercent =
        metricCategory.includes("Percentage") ||
        (metricCategory && metricCategory.toLowerCase().includes("percent"));
    if (isPercent || baseline !== 0) {
        const pct = baseline !== 0 ? ((delta / baseline) * 100) : 0;
        const rounded = Math.round(pct * 10) / 10;
        return `${rounded > 0 ? "+" : ""}${rounded}%`;
    }
    return `${delta > 0 ? "+" : ""}${delta}`;
}

function OutcomeCard({
    outcome,
    index,
    canRemove,
    onUpdate,
    onUpdateFields,
    onRemove,
    getFieldError,
}: {
    outcome: MeasurableOutcome;
    index: number;
    canRemove: boolean;
    onUpdate: (field: keyof MeasurableOutcome, val: any) => void;
    onUpdateFields: (fields: Partial<MeasurableOutcome>) => void;
    onRemove: () => void;
    getFieldError: (fieldPath: string) => string | undefined;
}) {
    const baseline = parseFloat(outcome.baseline) || 0;
    const endline = parseFloat(outcome.endline) || 0;
    const improvementLabel = formatImprovement(baseline, endline, outcome.metric_category);
    const explanationWords = wordCount(outcome.measurement_explanation || "");

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-sm font-bold text-indigo-700">
                        {index + 1}
                    </div>
                    <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-slate-900">
                            {outcomeTitle(outcome)}
                        </h4>
                        {outcome.outcome_area ? (
                            <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                {outcome.outcome_area.replace(/^\d+\.\s*/, "")}
                            </span>
                        ) : null}
                    </div>
                </div>
                {canRemove ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                        aria-label="Remove outcome"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                ) : null}
            </div>

            <div className="space-y-5 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>Outcome category</Label>
                        <div className="relative">
                            <select
                                value={outcome.outcome_area}
                                onChange={e => {
                                    onUpdateFields({
                                        outcome_area: e.target.value,
                                        outcome_sub_category: "",
                                    });
                                }}
                                className={selectClasses}
                            >
                                <option value="">Select category...</option>
                                {outcomeCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    {outcome.outcome_area && outcome.outcome_area !== "16. Other" ? (
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Specific sub-category</Label>
                            <div className="relative">
                                <select
                                    value={outcome.outcome_sub_category}
                                    onChange={e => onUpdate("outcome_sub_category", e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="">Select sub-category...</option>
                                    {outcomeHierarchy[outcome.outcome_area]?.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    ) : null}

                    {outcome.outcome_area === "16. Other" ? (
                        <div className="space-y-1.5 md:col-span-2">
                            <Label className={fieldLabel}>Specify other outcome area</Label>
                            <Input
                                placeholder="Mandatory explanation..."
                                value={outcome.outcome_area_other}
                                onChange={e => onUpdate("outcome_area_other", e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>Standard metric scale</Label>
                        <div className="relative">
                            <select
                                value={outcome.metric_category}
                                onChange={e => {
                                    onUpdateFields({
                                        metric_category: e.target.value,
                                        metric: "",
                                    });
                                }}
                                className={selectClasses}
                            >
                                <option value="">Select metric group...</option>
                                {metricCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    {outcome.metric_category && outcome.metric_category !== METRIC_CATEGORY_OTHER ? (
                        <div className="space-y-1.5">
                            <Label className={fieldLabel}>Specific metric unit</Label>
                            <div className="relative">
                                <select
                                    value={outcome.metric}
                                    onChange={e => {
                                        onUpdateFields({
                                            metric: e.target.value,
                                            unit: e.target.value,
                                        });
                                    }}
                                    className={selectClasses}
                                >
                                    <option value="">Select unit...</option>
                                    {metricHierarchy[outcome.metric_category]?.map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    ) : null}

                    {outcome.metric_category === METRIC_CATEGORY_OTHER ? (
                        <div className="space-y-1.5 md:col-span-2">
                            <Label className={fieldLabel}>Define custom metric unit</Label>
                            <Input
                                placeholder="e.g. Number of solar panels installed"
                                value={outcome.metric_other ?? ""}
                                onChange={e => {
                                    const v = e.target.value;
                                    onUpdateFields({
                                        metric: v.trim() ? v : "Other",
                                        metric_other: v,
                                        unit: v.trim(),
                                    });
                                }}
                                className={inputClasses}
                            />
                        </div>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>Baseline (before)</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={outcome.baseline}
                            onChange={e => onUpdate("baseline", e.target.value)}
                            className={inputClasses}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>Endline (after)</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={outcome.endline}
                            onChange={e => onUpdate("endline", e.target.value)}
                            className={inputClasses}
                        />
                    </div>
                </div>

                <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                            <TrendingUp className="h-4 w-4" />
                            {outcome.baseline || outcome.endline ? `${outcome.baseline || 0} → ${outcome.endline || 0}` : "Improvement"}
                        </div>
                        <span className="text-sm font-bold text-emerald-700">{improvementLabel}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                                width: `${endline > 0 ? Math.min(100, (Math.abs(endline - baseline) / endline) * 100) : 0}%`,
                            }}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className={fieldLabel}>Confidence level</Label>
                    <div className="flex flex-wrap gap-2">
                        {confidenceLevels.map(lvl => {
                            const isSelected = outcome.confidence_level?.includes(lvl);
                            return (
                                <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => {
                                        const current = Array.isArray(outcome.confidence_level)
                                            ? outcome.confidence_level
                                            : [];
                                        const next = isSelected
                                            ? current.filter(c => c !== lvl)
                                            : [...current, lvl];
                                        onUpdate("confidence_level", next);
                                    }}
                                    className={clsx(
                                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                        isSelected
                                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50",
                                    )}
                                >
                                    {lvl}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className={fieldLabel}>Measurement explanation</Label>
                    <Textarea
                        placeholder="Explain how your numbers come from Section 4 and what data supports this..."
                        value={outcome.measurement_explanation}
                        onChange={e => onUpdate("measurement_explanation", e.target.value)}
                        className={clsx(
                            textareaClasses,
                            getFieldError(`measurable_outcomes.${index}.measurement_explanation`) &&
                                "border-red-300",
                        )}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-48">
                            <div
                                className={clsx(
                                    "h-full rounded-full transition-all",
                                    explanationWords < 50
                                        ? "bg-amber-400"
                                        : explanationWords > 100
                                          ? "bg-red-500"
                                          : "bg-emerald-500",
                                )}
                                style={{
                                    width: `${Math.min((explanationWords / 100) * 100, 100)}%`,
                                }}
                            />
                        </div>
                        <p
                            className={clsx(
                                "text-[11px] tabular-nums",
                                explanationWords >= 50 && explanationWords <= 100
                                    ? "text-emerald-600"
                                    : explanationWords > 100
                                      ? "text-red-500"
                                      : "text-slate-400",
                            )}
                        >
                            {explanationWords} / 50–100 words
                        </p>
                    </div>
                    <FieldError
                        message={getFieldError(`measurable_outcomes.${index}.measurement_explanation`)}
                    />
                </div>
            </div>
        </div>
    );
}

export default function Section5Outcomes() {
    const { data, updateSection, getFieldError } = useReportForm();
    const { section4, section5 } = data;

    const outcomes: MeasurableOutcome[] = section5.measurable_outcomes || [];
    const update = (field: string, val: any) => updateSection("section5", { [field]: val });

    const linkedActivities = useMemo(
        () =>
            (section4.activity_blocks || [])
                .map((b: { title?: string }) => (b.title || "").trim())
                .filter(Boolean),
        [section4.activity_blocks],
    );

    // ── Finalise Section 5 — "the change" shortlist card ─────────────────────
    const directlyMeasuredCount = outcomes.filter((o) => o.confidence_level?.includes("Directly Measured")).length;
    const biggestShiftPercent = useMemo(() => {
        let max = 0;
        outcomes.forEach((o) => {
            const b = parseFloat(o.baseline) || 0;
            const e = parseFloat(o.endline) || 0;
            if (b === 0) return;
            const pct = ((e - b) / b) * 100;
            if (Math.abs(pct) > Math.abs(max)) max = pct;
        });
        return Math.round(max * 10) / 10;
        // `outcomes` is a plain `section5.measurable_outcomes || []` alias, not independent state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section5.measurable_outcomes]);
    const honestLimitsCount = Math.max((section5.challenge_tags || []).length, (section5.challenges || "").trim() ? 1 : 0);
    const canFinalizeSection5 = outcomes.length > 0 && !!(section5.observed_change || "").trim() && outcomes.some((o) => o.baseline !== "" && o.endline !== "");
    const isSection5Finalized = !!section5.finalized;

    const section5Snapshot = useMemo(
        () => JSON.stringify({ outcomes, observed_change: section5.observed_change, challenges: section5.challenges, challenge_tags: section5.challenge_tags }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [section5.measurable_outcomes, section5.observed_change, section5.challenges, section5.challenge_tags],
    );
    const lastFinalizedSection5SnapshotRef = useRef("");
    React.useEffect(() => {
        if (!isSection5Finalized) return;
        // First render after a finalized report loads — seed the baseline instead of comparing against an empty ref.
        if (!lastFinalizedSection5SnapshotRef.current) {
            lastFinalizedSection5SnapshotRef.current = section5Snapshot;
            return;
        }
        if (section5Snapshot !== lastFinalizedSection5SnapshotRef.current) {
            update("finalized", false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section5Snapshot, isSection5Finalized]);
    const handleFinalizeSection5 = () => {
        lastFinalizedSection5SnapshotRef.current = section5Snapshot;
        update("finalized", true);
    };
    const handleUnfinalizeSection5 = () => update("finalized", false);

    const addOutcome = () => {
        update("measurable_outcomes", [
            ...outcomes,
            {
                id: `outcome-${Date.now()}`,
                outcome_area: "",
                outcome_sub_category: "",
                metric_category: "",
                metric: "",
                baseline: "",
                endline: "",
                unit: "",
                confidence_level: [],
                measurement_explanation: "",
            },
        ]);
    };

    const removeOutcome = (idx: number) => {
        update("measurable_outcomes", outcomes.filter((_, i) => i !== idx));
    };

    const updateOutcome = (idx: number, field: keyof MeasurableOutcome, val: any) => {
        const next = [...outcomes];
        next[idx] = { ...next[idx], [field]: val };
        update("measurable_outcomes", next);
    };

    const updateOutcomeFields = (idx: number, fields: Partial<MeasurableOutcome>) => {
        const next = [...outcomes];
        next[idx] = { ...next[idx], ...fields };
        update("measurable_outcomes", next);
    };

    const observedWords = wordCount(section5.observed_change);
    const challengeWords = wordCount(section5.challenges);

    /** Tracks the last story sentence WE composed, so a student's hand-edit is never silently overwritten. */
    const lastAutoStoryRef = useRef("");
    const updateStoryBlank = (field: "story_before" | "story_now" | "story_because", val: string) => {
        const before = field === "story_before" ? val : section5.story_before || "";
        const now = field === "story_now" ? val : section5.story_now || "";
        const because = field === "story_because" ? val : section5.story_because || "";
        const composed = `Before our project, ${lowerFirst(before) || "…"}. Now, ${lowerFirst(now) || "…"}. We can see this change because ${lowerFirst(because) || "…"}.`;
        const isStillAuto = !section5.observed_change || section5.observed_change === lastAutoStoryRef.current;
        const patch: Record<string, string> = { [field]: val };
        if (isStillAuto && (before || now || because)) {
            lastAutoStoryRef.current = composed;
            patch.observed_change = composed;
        }
        updateSection("section5", patch);
    };

    const toggleChallengeTag = (tag: string) => {
        const cur = section5.challenge_tags || [];
        const next = cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag];
        updateSection("section5", { challenge_tags: next });
    };

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-10">
            {/* Header */}
            <div className="cer-dup-head space-y-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 5:</span> Outcomes &amp; results
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            What changed because of your project, measured with data, and its limitations.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Required field
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        Auto-filled / smart default
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Lock className="h-3 w-3" />
                        Read-only, system-populated
                    </span>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-600">
                            <BarChart3 className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                                Purpose of this section
                            </h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                                This section explains exactly what changed because of your project.
                                You will describe the qualitative change, measure it with data, and reflect
                                on the limitations of your impact.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5.1 Observed Change */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        5.1
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">Observed change (narrative)</h3>
                    <span className={clsx(badgeMandatory, "ml-auto")}>Mandatory · 100–200 words</span>
                </div>

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    {linkedActivities.length > 0 ? (
                        <div className="space-y-2">
                            <Label className={fieldLabel}>Linked activities</Label>
                            <p className="text-xs text-slate-500">
                                Pulled from Section 4 activity titles for reference.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {linkedActivities.map((title: string) => (
                                    <span
                                        key={title}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                                    >
                                        <Target className="h-3 w-3" />
                                        {title}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                            <div>
                                <p className="text-xs font-semibold text-indigo-900">Be specific</p>
                                <p className="mt-1 text-xs leading-relaxed text-indigo-800/80">
                                    Use real-world data and observations from your time in the field.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                            <div>
                                <p className="text-xs font-semibold text-rose-900">Avoid exaggeration</p>
                                <p className="mt-1 text-xs leading-relaxed text-rose-800/80">
                                    Do not repeat activities here — focus only on the resulting change.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">✍️ Tell the story of the change</p>
                            <p className="text-xs text-slate-500">Three blanks — we&apos;ll draft the paragraph below. Edit it directly once it appears.</p>
                        </div>
                        <div className="space-y-1">
                            <Label className={fieldLabel}>Before our project…</Label>
                            <Input
                                placeholder="e.g. classes were held in bare rooms with no materials"
                                value={section5.story_before || ""}
                                onChange={e => updateStoryBlank("story_before", e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className={fieldLabel}>Now…</Label>
                            <Input
                                placeholder="e.g. 120 children learn in two renovated, equipped classrooms"
                                value={section5.story_now || ""}
                                onChange={e => updateStoryBlank("story_now", e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className={fieldLabel}>We know because…</Label>
                            <Input
                                placeholder="e.g. we compared attendance registers and photos from day one"
                                value={section5.story_because || ""}
                                onChange={e => updateStoryBlank("story_because", e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700">
                            Describe what changed as a result of your project
                        </Label>
                        <p className="text-xs text-slate-500">
                            Include: before (baseline), after (change), link to Section 4 activities/outputs,
                            and what beneficiaries can now do differently.
                        </p>
                        <Textarea
                            placeholder="Explain the direction and nature of change (100–200 words)…"
                            className={clsx(textareaClasses, "min-h-[160px]")}
                            value={section5.observed_change}
                            onChange={e => update("observed_change", e.target.value)}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-48">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all",
                                        observedWords < 100
                                            ? "bg-amber-400"
                                            : observedWords > 200
                                              ? "bg-red-500"
                                              : "bg-emerald-500",
                                    )}
                                    style={{
                                        width: `${Math.min((observedWords / 200) * 100, 100)}%`,
                                    }}
                                />
                            </div>
                            <p
                                className={clsx(
                                    "text-[11px] tabular-nums",
                                    observedWords >= 100 && observedWords <= 200
                                        ? "text-emerald-600"
                                        : observedWords > 200
                                          ? "text-red-500"
                                          : "text-slate-400",
                                )}
                            >
                                {observedWords} / 200 words
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5.2 Measurable Outcomes */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                            5.2
                        </span>
                        <h3 className="text-base font-semibold text-slate-900">Measurable outcomes</h3>
                        <span className={badgeMandatory}>Mandatory</span>
                    </div>
                    <Button
                        type="button"
                        onClick={addOutcome}
                        className="h-10 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                    >
                        <PlusCircle className="mr-1.5 h-4 w-4" />
                        Add measurable outcome
                    </Button>
                </div>

                <div className="space-y-4">
                    {outcomes.map((outcome, idx) => (
                        <OutcomeCard
                            key={outcome.id}
                            outcome={outcome}
                            index={idx}
                            canRemove={outcomes.length > 1}
                            onUpdate={(field, val) => updateOutcome(idx, field, val)}
                            onUpdateFields={fields => updateOutcomeFields(idx, fields)}
                            onRemove={() => removeOutcome(idx)}
                            getFieldError={getFieldError}
                        />
                    ))}
                </div>
            </section>

            {/* 5.3 Challenges */}
            <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        5.3
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">Challenges &amp; limitations</h3>
                    <span className={clsx(badgeMandatory, "ml-auto")}>Mandatory · 100–200 words</span>
                </div>

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    {outcomes.some(o => outcomeTitle(o) !== "Unnamed outcome") ? (
                        <div className="space-y-2">
                            <Label className={fieldLabel}>Affected outcomes</Label>
                            <p className="text-xs text-slate-500">
                                Outcomes defined above — reference these when describing limitations.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {outcomes.map((o, i) => (
                                    <span
                                        key={o.id}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                                    >
                                        <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                                        {i + 1}. {outcomeTitle(o)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        <Label className={fieldLabel}>What was hard? <span className="font-normal normal-case text-slate-400">(tap all that apply)</span></Label>
                        <p className="text-xs text-slate-500">Being honest here makes your report stronger, not weaker.</p>
                        <div className="flex flex-wrap gap-2">
                            {CHALLENGE_TAGS.map((tag) => {
                                const active = (section5.challenge_tags || []).includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleChallengeTag(tag)}
                                        className={clsx(
                                            "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                                            active
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
                                        )}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700">
                            What challenges did you face?
                        </Label>
                        <p className="text-xs text-slate-500">
                            Include scaling barriers, delivery issues, and what could not be fully measured.
                        </p>
                        <Textarea
                            placeholder="Reflect honestly on the limitations of your project scale or measurement accuracy…"
                            className={clsx(textareaClasses, "min-h-[140px]")}
                            value={section5.challenges}
                            onChange={e => update("challenges", e.target.value)}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-48">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all",
                                        challengeWords < 100
                                            ? "bg-amber-400"
                                            : challengeWords > 200
                                              ? "bg-red-500"
                                              : "bg-emerald-500",
                                    )}
                                    style={{
                                        width: `${Math.min((challengeWords / 200) * 100, 100)}%`,
                                    }}
                                />
                            </div>
                            <p
                                className={clsx(
                                    "text-[11px] tabular-nums",
                                    challengeWords >= 100 && challengeWords <= 200
                                        ? "text-emerald-600"
                                        : challengeWords > 200
                                          ? "text-red-500"
                                          : "text-slate-400",
                                )}
                            >
                                {challengeWords} / 200 words
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-sm leading-relaxed text-amber-900/90">
                        <span className="font-semibold">Note on evidence (Step 8):</span>{" "}
                        Activities and outcomes you define here will later link to evidence uploads in
                        Section 8.
                    </p>
                </div>
            </section>

            {/* ── Finalise Section 5 ────────────────────────────────────── */}
            <section className="space-y-3 border-t border-slate-200 pt-8">
                {!isSection5Finalized ? (
                    <>
                        <button
                            type="button"
                            onClick={handleFinalizeSection5}
                            disabled={!canFinalizeSection5}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Finalise Section 5 →
                        </button>
                        <p className="text-center text-xs text-slate-500">
                            {canFinalizeSection5
                                ? "Ready ✨"
                                : "Add at least one measured outcome with baseline/endline values and your change story above to finalise."}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                            <div className="bg-gradient-to-br from-violet-950 to-violet-800 px-5 py-5 text-white sm:px-6">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">
                                    Section 5 · The change — finalised
                                </p>
                                <h3 className="mt-2 text-lg font-bold">
                                    🌟 {outcomes.length} measured change{outcomes.length === 1 ? "" : "s"} · {directlyMeasuredCount} directly measured
                                </h3>
                                {section5.observed_change ? (
                                    <p className="mt-1 text-sm text-violet-200">{section5.observed_change}</p>
                                ) : null}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {[
                                        { label: "Indicators", value: String(outcomes.length) },
                                        { label: "Directly measured", value: `${directlyMeasuredCount}/${outcomes.length}` },
                                        { label: "Biggest shift", value: `${biggestShiftPercent > 0 ? "+" : ""}${biggestShiftPercent}%` },
                                        { label: "Honest limits", value: String(honestLimitsCount) },
                                    ].map((stat) => (
                                        <span key={stat.label} className="rounded-lg bg-white/10 px-4 py-2.5 text-center">
                                            <span className="block text-lg font-bold leading-none">{stat.value}</span>
                                            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-wide text-violet-200">{stat.label}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="divide-y divide-slate-100 bg-white">
                                {outcomes.map((o, i) => {
                                    const isDirectlyMeasured = o.confidence_level?.includes("Directly Measured");
                                    const category = (o.outcome_area || "").replace(/^\d+\.\s*/, "");
                                    const causedBy = linkedActivities.length === 1 ? linkedActivities[0] : null;
                                    return (
                                        <div key={o.id || i} className="flex gap-4 p-5 sm:px-6">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                                                <Repeat className="h-5 w-5" />
                                            </span>
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-sm font-bold text-slate-900">
                                                        {i + 1}. {outcomeTitle(o)}
                                                    </h4>
                                                    {isDirectlyMeasured ? (
                                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                                            Directly measured
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {category}
                                                    {causedBy ? ` · caused by: ${causedBy}` : ""}
                                                    {o.measurement_explanation ? ` · measured: ${o.measurement_explanation}` : ""}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-lg font-bold text-violet-700">
                                                    {o.baseline} → {o.endline}
                                                </p>
                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                    {o.unit}{o.unit ? ", " : ""}{formatImprovement(parseFloat(o.baseline) || 0, parseFloat(o.endline) || 0, o.metric_category)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {(honestLimitsCount > 0) ? (
                                <div className="space-y-2 bg-amber-50/70 px-5 py-4 sm:px-6">
                                    <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                                        <Sparkle className="h-4 w-4" /> What we say honestly
                                    </p>
                                    {(section5.challenge_tags || []).map((tag) => (
                                        <p key={tag} className="text-xs font-semibold text-amber-800">{stripEmojiPrefix(tag)}</p>
                                    ))}
                                    {section5.challenges ? (
                                        <p className="text-sm text-amber-900">&ldquo;{section5.challenges}&rdquo;</p>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:px-6">
                                <span className="inline-flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5" /> Locked into your report
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Pencil className="h-3.5 w-3.5" /> Edit any outcome above to update
                                </span>
                                <button
                                    type="button"
                                    onClick={handleUnfinalizeSection5}
                                    className="ml-auto shrink-0 text-xs font-semibold text-violet-600 hover:underline"
                                >
                                    Edit shortlist
                                </button>
                            </div>
                        </div>

                        <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Section 5 saved — your change summary above travels with your report.
                        </p>
                    </>
                )}
            </section>
        </div>
    );
}



