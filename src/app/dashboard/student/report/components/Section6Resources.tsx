import {
    Package, Plus, Trash2, FileText, Info, AlertCircle,
    Banknote, Activity, Users, BarChart3, Upload, ChevronDown,
} from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { calculateEngagementMetrics, buildIndividualRosterFromSection1 } from "../utils/engagementMetrics";
import {
    formatMergedSdgGoalsSnapshotLabels,
    mergeReportSdgSnapshotRows,
} from "../utils/reportSdgMerge";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect, useState } from "react";
import clsx from "clsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import { MAX_REPORT_UPLOAD_LABEL, splitReportFilesByImageSize } from "../utils/fileUploadLimits";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";

function filterOversizedImages(files: File[], input: HTMLInputElement): File[] {
    const { accepted, rejected } = splitReportFilesByImageSize(files);
    if (rejected.length > 0) {
        toast.error(`Each file must be ${MAX_REPORT_UPLOAD_LABEL} or smaller: ${rejected.map((file) => file.name).join(", ")}`);
        input.value = "";
    }
    return accepted;
}

const resourceTypes = [
    "Financial (Cash Funding)",
    "In-kind Materials (Food / Books / Supplies / Kits)",
    "Equipment / Tools (Medical, Digital, Technical)",
    "Infrastructure Access (Venue / Lab / Clinic / Classroom)",
    "Digital Platform / Software Access",
    "Human Resources (Trainers / Experts / Volunteers)",
    "Transport Support",
    "Energy / Utility Support",
    "Communication / Media Support",
    "Policy / Legal Support",
    "Research / Data Access",
    "Community Mobilization Support",
    "Corporate / CSR Sponsorship",
    "Government Program Support",
    "International Development Support",
    "Other (Specify)",
];

/** Emoji + a sensible default unit (from `unitOptions`) per resource type, for the tile picker. */
const RESOURCE_TYPE_META: Record<string, { emoji: string; defaultUnit?: string }> = {
    "Financial (Cash Funding)": { emoji: "💵", defaultUnit: "PKR" },
    "In-kind Materials (Food / Books / Supplies / Kits)": { emoji: "📦", defaultUnit: "Kits" },
    "Equipment / Tools (Medical, Digital, Technical)": { emoji: "🛠️", defaultUnit: "Devices" },
    "Infrastructure Access (Venue / Lab / Clinic / Classroom)": { emoji: "🏢", defaultUnit: "Sessions" },
    "Digital Platform / Software Access": { emoji: "💻", defaultUnit: "Licenses" },
    "Human Resources (Trainers / Experts / Volunteers)": { emoji: "👥", defaultUnit: "Number (#)" },
    "Transport Support": { emoji: "🚐", defaultUnit: "Number (#)" },
    "Energy / Utility Support": { emoji: "🔌", defaultUnit: "Units" },
    "Communication / Media Support": { emoji: "📣", defaultUnit: "Units" },
    "Policy / Legal Support": { emoji: "⚖️", defaultUnit: "Units" },
    "Research / Data Access": { emoji: "📊", defaultUnit: "Units" },
    "Community Mobilization Support": { emoji: "🤝", defaultUnit: "Number (#)" },
    "Corporate / CSR Sponsorship": { emoji: "🏭", defaultUnit: "PKR" },
    "Government Program Support": { emoji: "🏛️", defaultUnit: "PKR" },
    "International Development Support": { emoji: "🌐", defaultUnit: "PKR" },
    "Other (Specify)": { emoji: "✨" },
};

const unitOptions = [
    "PKR", "USD", "Number (#)", "Hours", "Units", "Kg", "Liters",
    "Sessions", "Licenses", "Devices", "Kits", "Other (Specify)",
];

const sourceOptions = [
    "Students (Personal Contribution)",
    "Partner Organization",
    "University / Institution",
    "Government Body",
    "Private Sponsor / Donor",
    "Corporate / CSR",
    "Community Members",
    "International Organization",
    "Self-Funded",
    "Other (Specify)",
];

const verificationOptions = [
    "Evidence Uploaded",
    "Partner Confirmed",
    "University Confirmed",
    "Official Documentation",
    "Self-Reported",
    "Pending Verification",
];

const evidenceDocTypes = [
    "Receipts", "Sponsorship letters", "Official emails", "Photos",
    "Venue confirmation", "Partner letter", "Government approval",
];

const emptyResource = () => ({
    type: "", type_other: "", amount: "", unit: "", unit_other: "",
    sources: [] as string[], source_other: "", purpose: "", verification: [] as string[],
});

const inputClasses =
    "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const selectClasses =
    "h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const badgeRequired =
    "shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600";

function CheckGrid({
    options,
    selected,
    onToggle,
}: {
    options: string[];
    selected: string[];
    onToggle: (value: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
                const active = selected.includes(opt);
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onToggle(opt)}
                        className={clsx(
                            "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                            active
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
                        )}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

function FilePreview({ file }: { file: any }) {
    const isImage = file?.type?.startsWith("image/") || file?.name?.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    useEffect(() => {
        if (isImage) {
            if (file instanceof File || file instanceof Blob) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url);
            } else if (typeof file === "string") {
                setPreviewUrl(file);
            } else if (file?.url) {
                setPreviewUrl(file.url);
            }
        }
    }, [file, isImage]);

    if (isImage && previewUrl) {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img src={previewUrl} alt={file?.name || "Preview"} className="h-full w-full object-cover" />
            </div>
        );
    }

    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
            <FileText className="h-5 w-5" />
        </div>
    );
}

function FullFilePreview({ file }: { file: any }) {
    const isImage = file?.type?.startsWith("image/") || file?.name?.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    useEffect(() => {
        if (!file) return;
        if (isImage) {
            if (file instanceof File || file instanceof Blob) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url);
            } else if (typeof file === "string") {
                setPreviewUrl(file);
            } else if (file?.url) {
                setPreviewUrl(file.url);
            }
        }
    }, [file, isImage]);

    if (!file) return null;

    if (isImage && previewUrl) {
        return (
            <img src={previewUrl} alt={file?.name || "Preview"} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-12 text-slate-400">
            <FileText className="h-16 w-16 text-slate-200" />
            <p className="text-sm font-semibold">Preview not available for this file type</p>
            <p className="text-xs text-slate-400">({file?.name})</p>
        </div>
    );
}

function ResourceCard({
    res, idx, onUpdate, onUpdateFields, onRemove, canRemove, getFieldError,
}: {
    res: any; idx: number; canRemove: boolean;
    onUpdate: (field: string, val: any) => void;
    onUpdateFields: (fields: Record<string, any>) => void;
    onRemove: () => void;
    getFieldError: (key: string) => string | undefined;
}) {
    const sources: string[] = res.sources || [];
    const verifications: string[] = Array.isArray(res.verification)
        ? res.verification
        : typeof res.verification === "string" && res.verification
            ? [res.verification]
            : [];

    const toggleSource = (s: string) => {
        onUpdate("sources", sources.includes(s) ? sources.filter(x => x !== s) : [...sources, s]);
    };

    const toggleVerification = (v: string) => {
        onUpdate("verification", verifications.includes(v) ? verifications.filter(x => x !== v) : [...verifications, v]);
    };

    return (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        {idx + 1}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Resource entry
                    </span>
                </div>
                {canRemove ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 transition-colors hover:text-red-700"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                    </button>
                ) : null}
            </div>

            <div className="space-y-1.5">
                <Label className={fieldLabel}>
                    6.2.1 Resource type — what kind?
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {resourceTypes.map(t => {
                        const active = res.type === t;
                        const meta = RESOURCE_TYPE_META[t];
                        return (
                            <button
                                key={t}
                                type="button"
                                onClick={() => onUpdateFields(
                                    !res.unit && meta?.defaultUnit
                                        ? { type: t, unit: meta.defaultUnit }
                                        : { type: t },
                                )}
                                className={clsx(
                                    "flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-colors",
                                    active
                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
                                )}
                            >
                                <span className="text-xl">{meta?.emoji || "📦"}</span>
                                <span className="text-[11px] font-semibold leading-tight">{t.split(" (")[0]}</span>
                            </button>
                        );
                    })}
                </div>
                {res.type === "Other (Specify)" ? (
                    <div className="space-y-1.5 pt-1">
                        <Input
                            placeholder="Describe the resource type in a few words…"
                            value={res.type_other || ""}
                            onChange={e => onUpdate("type_other", e.target.value)}
                            className={inputClasses}
                        />
                        <FieldError message={getFieldError(`resources.${idx}.type_other`)} />
                    </div>
                ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>6.2.2 Amount</Label>
                    <Input
                        type="number"
                        placeholder="0"
                        value={res.amount}
                        onChange={e => onUpdate("amount", e.target.value)}
                        className={inputClasses}
                    />
                    <FieldError message={getFieldError(`resources.${idx}.amount`)} />
                </div>
                <div className="space-y-1.5">
                    <Label className={fieldLabel}>6.2.3 Unit</Label>
                    <div className="relative">
                        <select
                            value={res.unit}
                            onChange={e => onUpdate("unit", e.target.value)}
                            className={selectClasses}
                        >
                            <option value="">Select unit...</option>
                            {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
            </div>

            {res.unit === "Other (Specify)" ? (
                <div className="space-y-1.5">
                    <Input
                        placeholder="Describe the unit in a few words…"
                        value={res.unit_other || ""}
                        onChange={e => onUpdate("unit_other", e.target.value)}
                        className={inputClasses}
                    />
                    <FieldError message={getFieldError(`resources.${idx}.unit_other`)} />
                </div>
            ) : null}

            <div className="space-y-2">
                <Label className={fieldLabel}>6.2.4 Source of resource</Label>
                <p className="text-xs text-slate-500">Select all that apply</p>
                <CheckGrid options={sourceOptions} selected={sources} onToggle={toggleSource} />
                {sources.includes("Other (Specify)") ? (
                    <div className="space-y-1.5 pt-1">
                        <Input
                            placeholder="Describe the source in a few words…"
                            value={res.source_other || ""}
                            onChange={e => onUpdate("source_other", e.target.value)}
                            className={inputClasses}
                        />
                        <FieldError message={getFieldError(`resources.${idx}.source_other`)} />
                    </div>
                ) : null}
            </div>

            <div className="space-y-2">
                <Label className={fieldLabel}>6.2.5 Verification status</Label>
                <p className="text-xs text-slate-500">Select all that apply</p>
                <CheckGrid options={verificationOptions} selected={verifications} onToggle={toggleVerification} />
            </div>

            <div className="space-y-1.5">
                <Label className={fieldLabel}>6.2.6 What did it make possible? (one line)</Label>
                <Input
                    placeholder="e.g. bought paint and furniture for both classrooms"
                    value={res.purpose}
                    onChange={e => onUpdate("purpose", e.target.value)}
                    className={inputClasses}
                />
                <p className="text-xs text-slate-500">One clear line beats a 50-word minimum. ✂️</p>
                <FieldError message={getFieldError(`resources.${idx}.purpose`)} />
            </div>
        </div>
    );
}

export default function Section6Resources({ projectData }: { projectData?: unknown } = {}) {
    const { data, updateSection, getFieldError } = useReportForm();
    const { section1, section3, section4, section6 } = data;
    const { use_resources, resources } = section6;

    const [previewFile, setPreviewFile] = useState<any>(null);

    const update = (field: string, val: any) => updateSection("section6", { [field]: val });

    const addResource = () => update("resources", [...resources, emptyResource()]);
    const removeResource = (i: number) => update("resources", resources.filter((_, idx) => idx !== i));
    const updateResource = (i: number, field: string, val: any) => {
        const next = [...resources];
        next[i] = { ...next[i], [field]: val };
        update("resources", next);
    };
    const updateResourceFields = (i: number, fields: Record<string, any>) => {
        const next = [...resources];
        next[i] = { ...next[i], ...fields };
        update("resources", next);
    };

    const verifiedHoursSnapshot = useMemo(() => {
        const logs = section1.attendance_logs || [];
        if (logs.length > 0) {
            const teamSize = (section1.participation_type === "team" ? section1.team_members.length : 0) + 1;
            const req = data.required_hours || 16;
            const rosterIds = buildIndividualRosterFromSection1(section1, section1.team_lead?.id);
            const calc = calculateEngagementMetrics(logs, req, teamSize, undefined, rosterIds);
            return Number(calc.total_verified_hours.toFixed(1));
        }
        const stored = Number(section1.metrics?.total_verified_hours);
        return Number.isFinite(stored) ? Number(stored.toFixed(1)) : 0;
    }, [
        section1.attendance_logs,
        section1.participation_type,
        section1.team_members,
        section1.team_lead?.id,
        section1.metrics?.total_verified_hours,
        data.required_hours,
    ]);

    const { goalsLine: mappedSdgsDisplay, targetsLine: mappedSdgTargetsDisplay } = useMemo(() => {
        const rows = mergeReportSdgSnapshotRows(projectData ?? null, section3);
        return formatMergedSdgGoalsSnapshotLabels(rows);
    }, [projectData, section3]);

    const activityTypesCount = useMemo(
        () => (section4.activity_blocks || []).filter((a: any) => a.primary_category || a.title).length,
        [section4.activity_blocks],
    );

    const outputsCount = useMemo(
        () => (section4.activity_blocks || []).reduce((acc: number, b: any) => acc + (b.outputs?.length || 0), 0),
        [section4.activity_blocks],
    );

    const autoNarrative = useMemo(() => {
        if (use_resources === "no" || use_resources === "") {
            return `Resource Model: Volunteer-Based Implementation. Total Verified Hours: ${verifiedHoursSnapshot}h. Financial Mobilization: 0.`;
        }
        if (resources.length === 0) return "Resource narrative will appear once entries are added.";
        const typesUsed = [...new Set(resources.map(r => r.type).filter(Boolean))];
        const allSources = [...new Set(resources.flatMap(r => r.sources || []).filter(Boolean))];
        return `The project mobilized ${typesUsed.length > 0 ? typesUsed.slice(0, 2).join(" and ").toLowerCase() : "resources"} from ${allSources.length > 0 ? allSources.slice(0, 2).join(" and ").toLowerCase() : "contributing sources"}, enabling structured delivery of activities and beneficiary engagement. A total of ${resources.length} resource ${resources.length === 1 ? "category was" : "categories were"} recorded to support implementation.`;
    }, [use_resources, resources, verifiedHoursSnapshot]);

    useEffect(() => {
        if (section6.summary_text !== autoNarrative) {
            updateSection("section6", { summary_text: autoNarrative });
        }
    }, [autoNarrative, section6.summary_text, updateSection]);

    const financialTypes = resources.filter(r =>
        r.type?.toLowerCase().includes("financial") || r.unit === "PKR" || r.unit === "USD",
    );
    const inKindTypes = resources.filter(r => !financialTypes.includes(r));
    const uniqueSources = new Set(resources.flatMap(r => r.sources || [])).size;
    const moneyByUnit = useMemo(() => {
        const totals: Record<string, number> = {};
        resources.forEach(r => {
            if (r.unit !== "PKR" && r.unit !== "USD") return;
            const amt = parseFloat(r.amount) || 0;
            if (!amt) return;
            totals[r.unit] = (totals[r.unit] || 0) + amt;
        });
        return totals;
    }, [resources]);

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-10">
            {/* Header */}
            <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 6:</span> Resources &amp; implementation support
                        </h2>
                    </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 sm:px-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                        Purpose of this section
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                        This section records the{" "}
                        <span className="font-semibold text-slate-900">
                            resources and implementation support
                        </span>{" "}
                        that made your activities possible. List each resource type, amount, and
                        source, explain what it enabled, and note how it was verified (evidence,
                        partner confirmation, or official documentation).
                    </p>
                </div>
            </div>

            {/* 6.0 Project Snapshot */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                            6.0
                        </span>
                        <h3 className="text-base font-semibold text-slate-900">Project snapshot</h3>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Auto-generated · read-only
                    </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                        {[
                            { label: "SDG goals", val: mappedSdgsDisplay },
                            { label: "SDG targets", val: mappedSdgTargetsDisplay },
                            { label: "Beneficiaries", val: `${section4.project_summary?.distinct_total_beneficiaries || "0"} reached` },
                            { label: "Verified hours", val: `${verifiedHoursSnapshot}h` },
                            { label: "Activity types", val: `${activityTypesCount} recorded` },
                            { label: "Outputs", val: `${outputsCount} recorded` },
                        ].map(({ label, val }) => (
                            <div key={label} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                                <p className={clsx(fieldLabel, "mb-1")}>{label}</p>
                                <p className="truncate text-sm font-semibold text-slate-900" title={typeof val === "string" ? val : undefined}>
                                    {val}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    <p className="text-sm leading-relaxed text-indigo-900/90">
                        This information is automatically pulled from previous sections and cannot be edited.
                    </p>
                </div>
            </section>

            {/* 6.1 Resource Confirmation */}
            <section className="space-y-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        6.1
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">Step 1 — Resource confirmation</h3>
                </div>

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <Label className={fieldLabel}>What did your project run on?</Label>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => update("use_resources", "no")}
                            className={clsx(
                                "rounded-xl border-2 p-5 text-center transition-colors",
                                use_resources === "no"
                                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                            )}
                        >
                            <p className="text-2xl">💪</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">Just our time &amp; effort</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                No money, materials, or outside support used.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => update("use_resources", "yes")}
                            className={clsx(
                                "rounded-xl border-2 p-5 text-center transition-colors",
                                use_resources === "yes"
                                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
                            )}
                        >
                            <p className="text-2xl">📦</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">We used resources</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                Money, materials, venue, equipment, or expert help.
                            </p>
                        </button>
                    </div>

                    {use_resources === "no" ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                System records
                            </p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {[
                                    { label: "Resource model", val: "Volunteer-based" },
                                    { label: "Verified hours", val: `${verifiedHoursSnapshot}h` },
                                    { label: "Financial mobilization", val: "0" },
                                ].map(({ label, val }) => (
                                    <div key={label}>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                                        <p className="mt-0.5 text-sm font-semibold text-slate-800">{val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </section>

            {/* 6.2 + 6.3 when yes */}
            {use_resources === "yes" ? (
                <div className="space-y-8">
                    <section className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                    6.2
                                </span>
                                <h3 className="text-base font-semibold text-slate-900">
                                    Step 2 — Resource contribution details
                                </h3>
                            </div>
                            <div className="ml-auto flex shrink-0 items-center gap-3">
                                <span className={badgeRequired}>Required</span>
                                <Button
                                    type="button"
                                    onClick={addResource}
                                    className="h-10 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Add resource entry
                                </Button>
                            </div>
                        </div>

                        {resources.length === 0 ? (
                            <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center">
                                <Package className="h-10 w-10 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-700">No resources added yet</p>
                                <Button
                                    type="button"
                                    onClick={addResource}
                                    className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Add first resource
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {resources.map((res, idx) => (
                                    <ResourceCard
                                        key={idx}
                                        res={res}
                                        idx={idx}
                                        canRemove={resources.length > 1}
                                        onUpdate={(field, val) => updateResource(idx, field, val)}
                                        onUpdateFields={(fields) => updateResourceFields(idx, fields)}
                                        onRemove={() => removeResource(idx)}
                                        getFieldError={getFieldError}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* 6.3 Evidence */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                6.3
                            </span>
                            <h3 className="text-base font-semibold text-slate-900">
                                Step 3 — Optional evidence upload
                            </h3>
                        </div>

                        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                                <p className="text-sm leading-relaxed text-indigo-900/90">
                                    Upload supporting documentation. Max 5 files per resource entry. Max 10MB per file.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className={fieldLabel}>Accepted document types</Label>
                                <div className="flex flex-wrap gap-2">
                                    {evidenceDocTypes.map(doc => (
                                        <span
                                            key={doc}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                                        >
                                            <FileText className="h-3 w-3 text-slate-400" />
                                            {doc}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="relative rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/30">
                                <Upload className="mx-auto h-8 w-8 text-slate-300" />
                                <p className="mt-3 text-sm font-medium text-slate-600">
                                    Drag &amp; drop files here, or click to browse
                                </p>
                                <p className="mt-1 text-xs text-slate-400">Images, PDF, Word — max {MAX_REPORT_UPLOAD_LABEL}</p>
                                <input
                                    type="file"
                                    multiple
                                    accept={REPORT_ATTACHMENT_ACCEPT}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    onChange={e => {
                                        if (e.target.files) {
                                            const newFiles = filterOversizedImages(Array.from(e.target.files), e.currentTarget);
                                            if (!newFiles.length) return;
                                            updateSection("section6", {
                                                evidence_files: [...(section6.evidence_files || []), ...newFiles],
                                            });
                                        }
                                    }}
                                />
                            </div>

                            {section6.evidence_files && section6.evidence_files.length > 0 ? (
                                <div className="space-y-3">
                                    <Label className={fieldLabel}>
                                        Selected files ({section6.evidence_files.length})
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {section6.evidence_files.map((file, fIdx) => (
                                            <div
                                                key={fIdx}
                                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                                            >
                                                <div
                                                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                                                    onClick={() => setPreviewFile(file)}
                                                >
                                                    <FilePreview file={file} />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-slate-700">
                                                            {file.name}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {file.size ? (file.size / (1024 * 1024)).toFixed(2) : 0} MB
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const kept = section6.evidence_files.filter((_, i) => i !== fIdx);
                                                        updateSection("section6", { evidence_files: kept });
                                                    }}
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                                    aria-label="Remove file"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </section>

                    {/* Auto summary */}
                    <section className="space-y-4 border-t border-slate-200 pt-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900">
                                    System-generated resource summary
                                </h3>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Read-only
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {[
                                { icon: Banknote, label: "Financial entries", val: financialTypes.length },
                                { icon: Package, label: "In-kind entries", val: inKindTypes.length },
                                { icon: Users, label: "Unique sources", val: uniqueSources },
                                { icon: BarChart3, label: "Total entries", val: resources.length },
                            ].map(({ icon: Icon, label, val }) => (
                                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <Icon className="mb-2 h-4 w-4 text-indigo-600" />
                                    <p className="text-xl font-semibold text-slate-900">{val}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
                                </div>
                            ))}
                        </div>

                        {Object.keys(moneyByUnit).length > 0 ? (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 px-5 py-3.5 text-sm font-bold text-indigo-700">
                                <span>💵 Total money used</span>
                                <span>
                                    {Object.entries(moneyByUnit)
                                        .map(([unit, amt]) => `${unit} ${amt.toLocaleString()}`)
                                        .join(" · ")}
                                </span>
                            </div>
                        ) : null}

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <p className="text-sm leading-relaxed text-slate-700">{autoNarrative}</p>
                        </div>
                    </section>
                </div>
            ) : null}

            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="flex max-w-4xl flex-col items-center bg-white p-6">
                    <DialogHeader className="mb-4 flex w-full flex-col items-start justify-start">
                        <DialogTitle className="w-full truncate break-all pr-8 text-sm font-bold text-slate-800">
                            {previewFile?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex max-h-[80vh] w-full items-center justify-center overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-2">
                        <FullFilePreview file={previewFile} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
