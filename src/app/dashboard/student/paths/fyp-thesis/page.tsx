"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, UploadCloud } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { sdgData } from "@/utils/sdgData";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import ThesisCard from "@/components/ciel/ThesisCard";
import {
    type FypEntry,
    type FypMetric,
    type FypSdgEntry,
    type FypSectionSummaries,
    type FypTeamMember,
    EMPTY_FYP,
    mergeFypEntry,
    normalizeFypTeamMembers,
    composeFypSummaries,
    groupFypDeliverablesByLabel,
    suggestFypSdgs,
    fypRouteFor,
    FYP_MODES,
    FYP_EVIDENCE_STATUS,
    PROJECT_TYPE_OPTIONS,
    FYP_SECTION_LABELS,
    FYP_SECTION_KEYS,
} from "@/utils/fypTypes";

const EMPTY = EMPTY_FYP;
const mergeEntry = mergeFypEntry;
const composeSummaries = composeFypSummaries;
const groupDeliverablesByLabel = groupFypDeliverablesByLabel;
const SECTION_LABELS = FYP_SECTION_LABELS;
const SECTION_KEYS = FYP_SECTION_KEYS;

// ---------------------------------------------------------------------------
// Static option lists (mirror the prototype exactly)
// ---------------------------------------------------------------------------

const STEPS = [
    { key: "project", emoji: "📌", label: "Project" },
    { key: "background", emoji: "🧩", label: "Background" },
    { key: "objectives", emoji: "🎯", label: "Objectives" },
    { key: "literature", emoji: "📚", label: "Literature" },
    { key: "methodology", emoji: "🔬", label: "Method" },
    { key: "findings", emoji: "📈", label: "Findings" },
    { key: "sdg", emoji: "🌍", label: "SDG links" },
    { key: "reflection", emoji: "🪞", label: "Reflection" },
    { key: "publish", emoji: "📦", label: "Publish" },
];

const SCHOOL_OPTIONS = ["Engineering", "Computer Science / IT", "Business / Management", "Textile / Fashion", "Architecture / Planning", "Medicine / Health Sciences", "Pharmacy", "Law", "Social Sciences", "Education", "Natural Sciences", "Agriculture / Environment", "Fine Arts / Media / Design", "Languages / Humanities", "Other"];
const DEGREE_OPTIONS = ["BS / BSc", "BBA", "B.Arch", "MBBS / BDS", "Pharm-D", "LLB", "BFA", "MS / MPhil", "Other"];
const YEAR_OPTIONS = ["2025", "2026", "2027"];
const SPAN_OPTIONS = ["Semester 7", "Semester 8", "Spread across 7 & 8"];

const WHY_URGENT_OPTIONS = ["📜 Policy / regulation changing", "📈 Problem growing fast", "🤖 New tech makes a fix possible", "🏘️ Community asked for it", "💰 Market opportunity opened", "🕳️ Long-ignored gap in my field"];
const AUDIENCE_OPTIONS = ["🏭 Industry & manufacturers", "🌾 Farmers & rural communities", "🎓 Students & educators", "🏥 Patients & healthcare", "🛒 General public / consumers", "🏛️ Government & policymakers", "🔬 Researchers — advances the field", "🏘️ A specific local community"];

const LIT_SOURCES_OPTIONS = ["Under 10", "10–25", "26–50", "50+"];
const SOURCE_TYPE_OPTIONS = ["📄 Journal papers", "📊 Industry / market reports", "📚 Books & theses", "⚖️ Case law / legal texts", "🩺 Clinical studies", "🎨 Design precedents", "🌐 Credible web / datasets"];

const APPROACH_OPTIONS = ["🔢 Quantitative", "💬 Qualitative", "🔀 Mixed methods", "🧪 Experimental / lab", "📐 Design-based / studio", "🩺 Clinical / case-based", "⚖️ Doctrinal / legal", "🖥️ Simulation / modelling", "🎭 Practice-based (art & media)"];
const METHOD_OPTIONS = ["🧪 Lab experiments", "📋 Surveys", "🗣️ Interviews / focus groups", "👀 Field / user testing", "🔧 Prototype / artefact", "📊 Data analysis / modelling", "🗂️ Case study", "📜 Archival / textual analysis"];

const LIMITATION_OPTIONS = ["Small sample size", "Lab-only — not field tested", "Time constraints", "Equipment / budget limits", "Data access restrictions", "Single location / context", "Other"];

const SKILL_OPTIONS = ["🔬 Research & analysis", "🧩 Problem-solving", "🛠️ Technical / lab", "✍️ Writing & communication", "⏰ Project management", "💪 Resilience", "🫶 Community / user work", "🌱 Sustainability thinking"];
const NEXT_OPTIONS = ["Publication attempt", "Industry could take it forward", "I may build a startup on it", "Next year's students continue it", "It ends here — and that's okay"];
const VISIBILITY_OPTIONS = ["🎓 Portfolio + university repository", "🌐 Public — open access", "🔒 Restricted — supervisor & examiners"];
const METRIC_UNIT_OPTIONS = ["%", "/5 rating", "°C", "people", "participants", "samples", "trials", "responses", "items", "hours", "days", "kg", "mg/L", "ppm", "litres", "kWh", "km", "sq. ft.", "PKR", "times", "points"];

const fieldClass = "w-full rounded-ciel-sm border-2 border-ciel-border bg-ciel-page/50 px-4 py-3 text-sm font-semibold text-ciel-text outline-none focus:border-ciel-purple focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-purple";
const labelClass = "text-xs font-bold uppercase tracking-widest text-ciel-text-soft";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className={labelClass}>{label}</label>
            {hint ? <p className="text-xs text-ciel-text-soft">{hint}</p> : null}
            {children}
        </div>
    );
}

function ChipGroup({
    options,
    selected,
    onToggle,
    otherValue,
    onOtherChange,
    otherPlaceholder,
    single,
}: {
    options: string[];
    selected: string[];
    onToggle: (value: string) => void;
    otherValue?: string;
    onOtherChange?: (value: string) => void;
    otherPlaceholder?: string;
    single?: boolean;
}) {
    const hasOther = onOtherChange !== undefined;
    const [otherOn, setOtherOn] = useState(() => !!otherValue?.trim());
    const showOther = hasOther && (otherOn || !!otherValue?.trim());
    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => {
                    const isSel = selected.includes(opt);
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onToggle(opt)}
                            className={clsx(
                                "ciel-transition rounded-full border-2 px-3.5 py-2 text-xs font-bold",
                                isSel ? "border-ciel-purple bg-ciel-purple-soft text-ciel-purple-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-purple/40",
                            )}
                        >
                            {opt}
                        </button>
                    );
                })}
                {hasOther && !single ? (
                    <button
                        type="button"
                        onClick={() => {
                            if (showOther) {
                                setOtherOn(false);
                                onOtherChange!("");
                            } else {
                                setOtherOn(true);
                            }
                        }}
                        className={clsx(
                            "ciel-transition rounded-full border-2 border-dashed px-3.5 py-2 text-xs font-bold",
                            showOther ? "border-ciel-purple bg-ciel-purple-soft text-ciel-purple-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-purple/40",
                        )}
                    >
                        ＋ Other…
                    </button>
                ) : null}
            </div>
            {showOther ? (
                <input
                    type="text"
                    value={otherValue ?? ""}
                    onChange={(e) => onOtherChange!(e.target.value)}
                    placeholder={otherPlaceholder || "Type your own…"}
                    className={fieldClass}
                />
            ) : null}
        </div>
    );
}

/** Up to 3 structured results, each status-tagged Measured/Estimated/Target — feeds the FYP Merit
 * Model's outcome & honesty criteria directly (unlike a flat single metric, which the model can only
 * read as a fallback with no status). */
function FypMetricsBuilder({ metrics, onChange }: { metrics: FypMetric[]; onChange: (next: FypMetric[]) => void }) {
    const addMetric = () => {
        if (metrics.length >= 3) return;
        onChange([...metrics, { id: `m${metrics.length}-${Math.random().toString(36).slice(2, 8)}` }]);
    };
    const setMetric = (id: string, patch: Partial<FypMetric>) => {
        onChange(metrics.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    };
    const delMetric = (id: string) => onChange(metrics.filter((m) => m.id !== id));

    return (
        <div className="space-y-3">
            <datalist id="fyp-metric-unit">
                {METRIC_UNIT_OPTIONS.map((u) => <option key={u} value={u} />)}
            </datalist>
            {metrics.map((m, i) => (
                <div key={m.id} className="space-y-3 rounded-ciel-sm border-2 border-ciel-border p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ciel-purple">Metric {i + 1}</span>
                        <button type="button" onClick={() => delMetric(m.id!)} className="text-xs font-bold text-red-600 hover:text-red-700">
                            🗑 Remove
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Field label="Metric">
                            <input type="text" value={m.name ?? ""} onChange={(e) => setMetric(m.id!, { name: e.target.value })} placeholder="e.g. Wash-fastness score" className={fieldClass} />
                        </Field>
                        <Field label="Value">
                            <input type="text" value={m.value ?? ""} onChange={(e) => setMetric(m.id!, { value: e.target.value })} placeholder="4.5" className={fieldClass} />
                        </Field>
                        <Field label="Unit">
                            <input type="text" list="fyp-metric-unit" value={m.unit ?? ""} onChange={(e) => setMetric(m.id!, { unit: e.target.value })} placeholder="/5 grade · % · °C" className={fieldClass} />
                        </Field>
                    </div>
                    <Field label="This number is…">
                        <ChipGroup
                            options={["Measured", "Estimated", "Target"]}
                            selected={m.status ? [m.status] : []}
                            onToggle={(v) => setMetric(m.id!, { status: m.status === v ? undefined : v })}
                        />
                    </Field>
                </div>
            ))}
            {metrics.length < 3 ? (
                <button
                    type="button"
                    onClick={addMetric}
                    className="ciel-transition w-full rounded-ciel-sm border-2 border-dashed border-ciel-purple/40 bg-ciel-purple-soft/40 px-4 py-3 text-xs font-bold text-ciel-purple-deep hover:border-ciel-purple"
                >
                    ➕ Add {metrics.length ? "another" : "a"} number
                </button>
            ) : null}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FypThesisPage() {
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<FypEntry>(EMPTY);
    const [step, setStep] = useState(0);
    const [editing, setEditing] = useState(false);
    const [review, setReview] = useState<Record<string, { accepted: boolean; edited: boolean; text: string }>>({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    /** Stashes SDG picks when "No SDG applies" is checked, so unchecking it restores them instead of losing them. */
    const stashedSdgEntriesRef = useRef<FypSdgEntry[]>([]);
    const [expandedDeliverableLabel, setExpandedDeliverableLabel] = useState<string | null>(null);
    const [aiSdgOpen, setAiSdgOpen] = useState(false);
    const [declarations, setDeclarations] = useState<[boolean, boolean]>([false, false]);
    const declarationsOk = declarations.every(Boolean);

    useEffect(() => {
        authenticatedFetch("/api/v1/paths/fyp-thesis", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) {
                    const data = result.data as Partial<FypEntry>;
                    setEntry(mergeEntry(EMPTY, data));
                    setStep(Math.min(8, data.stepCompleted ?? 0));
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const sums = composeSummaries(entry);
    const showCard = entry.status === "submitted" && !editing;

    const save = async (patch: Partial<FypEntry>, advanceTo?: number) => {
        setSaving(true);
        setError(null);
        const nextStepCompleted = advanceTo !== undefined ? Math.max(entry.stepCompleted, advanceTo) : entry.stepCompleted;
        try {
            const res = await authenticatedFetch(
                "/api/v1/paths/fyp-thesis",
                { method: "PATCH", body: JSON.stringify({ ...patch, stepCompleted: nextStepCompleted }) },
                { redirectToLogin: false },
            );
            const result = res?.ok ? await res.json() : null;
            if (!result?.data) throw new Error("Could not save your progress");
            setEntry((e) => mergeEntry(e, result.data as Partial<FypEntry>));
            if (advanceTo !== undefined) setStep(Math.min(8, advanceTo));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save your progress");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const patchGroup = <K extends keyof FypEntry>(key: K, patch: Partial<NonNullable<FypEntry[K]>>) => {
        setEntry((e) => ({ ...e, [key]: { ...(e[key] as object), ...patch } }));
    };

    /** Populate un-accepted/un-edited review blocks with the latest draft whenever the publish step opens. */
    useEffect(() => {
        if (step !== 8) return;
        setReview((prev) => {
            const next = { ...prev };
            for (const key of SECTION_KEYS) {
                const existing = next[key];
                if (!existing || (!existing.accepted && !existing.edited)) {
                    next[key] = { accepted: false, edited: false, text: sums[key] || "" };
                }
            }
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const regenerateAllReview = () => {
        setReview(() => {
            const next: Record<string, { accepted: boolean; edited: boolean; text: string }> = {};
            for (const key of SECTION_KEYS) next[key] = { accepted: false, edited: false, text: sums[key] || "" };
            return next;
        });
    };
    const acceptedCount = SECTION_KEYS.filter((k) => review[k]?.accepted).length;
    const allAccepted = acceptedCount === SECTION_KEYS.length;
    const finalSectionSummaries = (): FypSectionSummaries => {
        const out: FypSectionSummaries = {};
        for (const key of SECTION_KEYS) out[key] = review[key]?.text ?? sums[key] ?? "";
        return out;
    };

    const hasThesisPdf = entry.deliverables.some((d) => d.label === "Full thesis (PDF)");
    const handleDeliverableFile = async (file: File, label: string) => {
        setUploading(label);
        setError(null);
        try {
            const presignRes = await authenticatedFetch(
                "/api/v1/paths/evidence/presign",
                { method: "POST", body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) },
                { redirectToLogin: false },
            );
            const presign = presignRes?.ok ? await presignRes.json() : null;
            const { uploadUrl, publicUrl } = presign?.data ?? {};
            if (!uploadUrl || !publicUrl) throw new Error("Could not prepare the upload");
            const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
            if (!putRes.ok) throw new Error("Upload failed — please try again");
            const res = await authenticatedFetch(
                "/api/v1/paths/fyp-thesis/deliverables",
                { method: "POST", body: JSON.stringify({ label, fileUrl: publicUrl }) },
                { redirectToLogin: false },
            );
            const result = res?.ok ? await res.json() : null;
            if (result?.data?.deliverables) setEntry((e) => ({ ...e, deliverables: result.data.deliverables }));
        } catch {
            setError("Upload failed. Try again.");
        } finally {
            setUploading(null);
        }
    };

    const saveAllFields = () => ({
        projectTitle: entry.projectInfo?.title ?? entry.projectTitle,
        projectInfo: entry.projectInfo ?? undefined,
        background: entry.background ?? undefined,
        objectivesInfo: entry.objectivesInfo ?? undefined,
        literature: entry.literature ?? undefined,
        methodology: entry.methodology ?? undefined,
        findings: entry.findings ?? undefined,
        routeDetails: entry.routeDetails ?? undefined,
        sdgMapping: entry.sdgMapping ?? undefined,
        reflectionInfo: entry.reflectionInfo ?? undefined,
        repository: entry.repository ?? undefined,
        addedNote: entry.addedNote ?? undefined,
    });

    const updateTeamMember = (i: number, patch: Partial<FypTeamMember>) => {
        const current = normalizeFypTeamMembers(entry.projectInfo?.teamMembers);
        const next = [...current];
        next[i] = { ...(next[i] ?? { name: "" }), ...patch };
        patchGroup("projectInfo", { teamMembers: next });
    };

    if (loading) return <WorkspaceSkeleton />;

    const isOwner = entry.isOwner !== false;
    const route = fypRouteFor(entry.projectInfo?.projectType);
    const routeMode = FYP_MODES[route];

    const picked = entry.sdgMapping?.entries ?? [];
    const toggleGoal = (num: number) => {
        const exists = picked.some((p) => p.goalNumber === num);
        if (exists) patchGroup("sdgMapping", { entries: picked.filter((p) => p.goalNumber !== num) });
        else {
            if (picked.length >= 3) return;
            patchGroup("sdgMapping", { entries: [...picked, { goalNumber: num, targets: [] }] });
        }
    };
    const toggleTarget = (num: number, targetId: string) => {
        patchGroup("sdgMapping", {
            entries: picked.map((p) => (p.goalNumber !== num ? p : { ...p, targets: p.targets.includes(targetId) ? p.targets.filter((t) => t !== targetId) : [...p.targets, targetId] })),
        });
    };
    const setHow = (num: number, how: string) => {
        patchGroup("sdgMapping", { entries: picked.map((p) => (p.goalNumber === num ? { ...p, how } : p)) });
    };
    const sdgSuggestionText = [entry.background?.problem, entry.objectivesInfo?.aim, ...(entry.findings?.findings ?? [])].filter(Boolean).join(" ");
    const sdgSuggestions = aiSdgOpen ? suggestFypSdgs(sdgSuggestionText) : [];

    return (
        <PathWorkspaceShell
            title="FYP / Thesis"
            stats={[
                { label: "Status", value: entry.status === "submitted" ? "Submitted" : "Draft" },
                { label: "Steps complete", value: `${entry.stepCompleted}/9`, hint: "Contributes to sections 2, 3 of your impact score" },
            ]}
            tabs={[{ key: "build", label: "Build my record" }]}
            activeTab="build"
            onTabChange={() => {}}
        >
            {showCard || !isOwner ? (
                <div className="space-y-4">
                    {!isOwner && (
                        <div className="rounded-ciel-sm border border-ciel-indigo-soft bg-ciel-indigo-soft/60 px-4 py-2.5 text-xs font-semibold text-ciel-indigo">
                            👥 You&apos;re named as a co-author on this record — the lead author owns it and is the only one who can edit or submit changes.
                        </div>
                    )}
                    <ThesisCard entry={entry} defaultOpen />
                    {isOwner && (
                        <button
                            type="button"
                            onClick={() => {
                                // Clear stale review acceptances AND declarations from the last submission so every
                                // section is re-reviewed and re-affirmed against whatever the student changes this
                                // time, instead of resubmitting on consent that was given for the old content.
                                setReview({});
                                setDeclarations([false, false]);
                                setStep(0);
                                setEditing(true);
                            }}
                            className="ciel-transition rounded-ciel-sm border border-ciel-border px-4 py-2.5 text-sm font-bold text-ciel-text-mid hover:border-ciel-purple/40"
                        >
                            Edit this record
                        </button>
                    )}
                </div>
            ) : (
            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                    {STEPS.map((s, i) => (
                        <div key={s.key} className="flex flex-1 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => i <= entry.stepCompleted && setStep(i)}
                                disabled={i > entry.stepCompleted}
                                className={clsx(
                                    "ciel-transition flex h-10 min-w-[2.5rem] items-center justify-center gap-1 rounded-full px-2 text-xs font-black",
                                    step === i ? "bg-ciel-navy text-white" : i < entry.stepCompleted ? "bg-ciel-green-soft text-ciel-green-deep" : i === entry.stepCompleted ? "border-2 border-ciel-border text-ciel-text-mid" : "cursor-not-allowed text-ciel-border",
                                )}
                                title={s.label}
                            >
                                {i < entry.stepCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{s.emoji}</span>}
                            </button>
                            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-ciel-border" />}
                        </div>
                    ))}
                </div>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Step {step + 1} of {STEPS.length} — {STEPS[step].emoji} {STEPS[step].label}</p>

                <div className="mt-5 space-y-5">
                    {/* 1. Project & supervisor */}
                    {step === 0 && (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="FYP span" hint="HEC allows splitting across the final year.">
                                    <ChipGroup
                                        options={SPAN_OPTIONS}
                                        selected={entry.projectInfo?.span ? [entry.projectInfo.span] : []}
                                        onToggle={(v) => patchGroup("projectInfo", { span: entry.projectInfo?.span === v ? undefined : v })}
                                    />
                                </Field>
                                <Field label="Credit hours (optional)" hint="Typically 6 under HEC policy.">
                                    <input type="number" value={entry.projectInfo?.creditHours ?? ""} onChange={(e) => patchGroup("projectInfo", { creditHours: e.target.value })} placeholder="6" className={fieldClass} />
                                </Field>
                            </div>
                            <Field label="What kind of final project is this?" hint="The form adapts its language to your answer — same eight sections, only the wording changes.">
                                <ChipGroup
                                    options={PROJECT_TYPE_OPTIONS}
                                    selected={entry.projectInfo?.projectType ? [entry.projectInfo.projectType] : []}
                                    onToggle={(v) => patchGroup("projectInfo", { projectType: entry.projectInfo?.projectType === v ? undefined : v })}
                                />
                            </Field>
                            {entry.projectInfo?.projectType && (
                                <div className="rounded-ciel-sm border-2 border-ciel-purple/30 bg-ciel-purple-soft/50 px-4 py-3 text-xs font-semibold leading-relaxed text-ciel-purple-deep">
                                    🧭 {routeMode.note} Same eight sections for every school — only the language changes, so your work stays comparable university-wide.
                                </div>
                            )}
                            <Field label="Thesis / project title">
                                <input type="text" value={entry.projectInfo?.title ?? ""} onChange={(e) => patchGroup("projectInfo", { title: e.target.value })} placeholder="e.g. Biodegradable denim from banana-fibre waste" className={fieldClass} />
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field label="Discipline / school">
                                    <select value={entry.projectInfo?.school ?? ""} onChange={(e) => patchGroup("projectInfo", { school: e.target.value })} className={fieldClass}>
                                        <option value="">Select…</option>
                                        {SCHOOL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Degree">
                                    <select value={entry.projectInfo?.degree ?? ""} onChange={(e) => patchGroup("projectInfo", { degree: e.target.value })} className={fieldClass}>
                                        <option value="">Select…</option>
                                        {DEGREE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Graduation year">
                                    <select value={entry.projectInfo?.graduationYear ?? ""} onChange={(e) => patchGroup("projectInfo", { graduationYear: e.target.value })} className={fieldClass}>
                                        <option value="">Select…</option>
                                        {YEAR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field label="Your name">
                                    <input type="text" value={entry.projectInfo?.studentName ?? ""} onChange={(e) => patchGroup("projectInfo", { studentName: e.target.value })} placeholder="Full name" className={fieldClass} />
                                </Field>
                                <Field label="Your email" hint="Your record links here.">
                                    <input type="email" value={entry.projectInfo?.studentEmail ?? ""} onChange={(e) => patchGroup("projectInfo", { studentEmail: e.target.value })} placeholder="you@university.edu.pk" className={fieldClass} />
                                </Field>
                                <Field label="Roll / registration no.">
                                    <input type="text" value={entry.projectInfo?.rollNumber ?? ""} onChange={(e) => patchGroup("projectInfo", { rollNumber: e.target.value })} placeholder="F21-0342" className={fieldClass} />
                                </Field>
                            </div>
                            <Field label="Co-authors / team members" hint="Optional — each gets named on the record, and the submitted record appears on their own dashboard too.">
                                <div className="space-y-3">
                                    {(normalizeFypTeamMembers(entry.projectInfo?.teamMembers).length ? normalizeFypTeamMembers(entry.projectInfo?.teamMembers) : [{ name: "" }]).map((m, i) => (
                                        <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                            <input
                                                type="text"
                                                value={m.name}
                                                onChange={(e) => updateTeamMember(i, { name: e.target.value })}
                                                placeholder={`Co-author ${i + 1} — full name`}
                                                className={fieldClass}
                                            />
                                            <input
                                                type="email"
                                                value={m.email ?? ""}
                                                onChange={(e) => updateTeamMember(i, { email: e.target.value })}
                                                placeholder={`Co-author ${i + 1} — email`}
                                                className={fieldClass}
                                            />
                                            <input
                                                type="text"
                                                value={m.role ?? ""}
                                                onChange={(e) => updateTeamMember(i, { role: e.target.value })}
                                                placeholder="Role — optional"
                                                className={fieldClass}
                                            />
                                        </div>
                                    ))}
                                    {(entry.projectInfo?.teamMembers?.length ?? 0) < 20 && (
                                        <button
                                            type="button"
                                            onClick={() => patchGroup("projectInfo", { teamMembers: [...normalizeFypTeamMembers(entry.projectInfo?.teamMembers), { name: "" }] })}
                                            className="text-xs font-bold text-ciel-purple-deep hover:underline"
                                        >
                                            + Add co-author → sends invitation
                                        </button>
                                    )}
                                </div>
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Supervisor name">
                                    <input type="text" value={entry.projectInfo?.supervisorName ?? ""} onChange={(e) => patchGroup("projectInfo", { supervisorName: e.target.value })} placeholder="Dr. A. Malik" className={fieldClass} />
                                </Field>
                                <Field label="Supervisor email" hint="Their one-click approval link goes here.">
                                    <input type="email" value={entry.projectInfo?.supervisorEmail ?? ""} onChange={(e) => patchGroup("projectInfo", { supervisorEmail: e.target.value })} placeholder="name@uni.edu.pk" className={fieldClass} />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Co-supervisor" hint="Optional — industry co-supervisors welcome; HEC CS programs require joint industry supervision.">
                                    <input type="text" value={entry.projectInfo?.coSupervisorName ?? ""} onChange={(e) => patchGroup("projectInfo", { coSupervisorName: e.target.value })} placeholder="e.g. Engr. Adeel Khan — Interloop Ltd." className={fieldClass} />
                                </Field>
                                <Field label="Co-supervisor's email (optional)">
                                    <input type="email" value={entry.projectInfo?.coSupervisorEmail ?? ""} onChange={(e) => patchGroup("projectInfo", { coSupervisorEmail: e.target.value })} placeholder="—" className={fieldClass} />
                                </Field>
                            </div>
                        </>
                    )}

                    {/* 2. Background & problem */}
                    {step === 1 && (
                        <>
                            <Field label={`${routeMode.probL} (1–2 lines)`}>
                                <input type="text" value={entry.background?.problem ?? ""} onChange={(e) => patchGroup("background", { problem: e.target.value })} placeholder="e.g. textile production is a top water polluter while banana crop waste is burned" className={fieldClass} />
                            </Field>
                            <Field label="Why is it urgent now? (tap all that apply)">
                                <ChipGroup
                                    options={WHY_URGENT_OPTIONS}
                                    selected={entry.background?.whyUrgent ?? []}
                                    onToggle={(v) => {
                                        const cur = entry.background?.whyUrgent ?? [];
                                        patchGroup("background", { whyUrgent: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                    }}
                                    otherValue={entry.background?.whyUrgentOther}
                                    onOtherChange={(v) => patchGroup("background", { whyUrgentOther: v })}
                                    otherPlaceholder="Type your own reason…"
                                />
                            </Field>
                            <Field label="Target audience — who benefits? (tap all that apply)">
                                <ChipGroup
                                    options={AUDIENCE_OPTIONS}
                                    selected={entry.background?.audience ?? []}
                                    onToggle={(v) => {
                                        const cur = entry.background?.audience ?? [];
                                        patchGroup("background", { audience: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                    }}
                                    otherValue={entry.background?.audienceOther}
                                    onOtherChange={(v) => patchGroup("background", { audienceOther: v })}
                                    otherPlaceholder="Type your own audience…"
                                />
                            </Field>
                        </>
                    )}

                    {/* 3. Objectives */}
                    {step === 2 && (
                        <>
                        <Field label={routeMode.aimL}>
                            <input type="text" value={entry.objectivesInfo?.aim ?? ""} onChange={(e) => patchGroup("objectivesInfo", { aim: e.target.value })} placeholder={routeMode.aimPh} className={fieldClass} />
                        </Field>
                        <Field label={routeMode.objsL} hint="Start each with a verb. Add as many as your thesis has.">
                            <div className="space-y-2.5">
                                {(entry.objectivesInfo?.objectives?.length ? entry.objectivesInfo.objectives : [""]).map((obj, i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        value={obj}
                                        onChange={(e) => {
                                            const next = [...(entry.objectivesInfo?.objectives?.length ? entry.objectivesInfo.objectives : [""])];
                                            next[i] = e.target.value;
                                            patchGroup("objectivesInfo", { objectives: next });
                                        }}
                                        placeholder={i === 0 ? "e.g. Develop a banana-cotton blend matching denim strength" : `Objective ${i + 1} (optional)`}
                                        className={fieldClass}
                                    />
                                ))}
                            </div>
                            {(entry.objectivesInfo?.objectives?.length ?? 1) < 6 ? (
                                <button
                                    type="button"
                                    onClick={() => patchGroup("objectivesInfo", { objectives: [...(entry.objectivesInfo?.objectives?.length ? entry.objectivesInfo.objectives : [""]), ""] })}
                                    className="text-xs font-bold text-ciel-purple-deep hover:underline"
                                >
                                    + Add another objective
                                </button>
                            ) : null}
                        </Field>
                        <Field label="Scope — what you deliberately did NOT cover" hint="Optional, but reviewers love it.">
                            <input type="text" value={entry.objectivesInfo?.scope ?? ""} onChange={(e) => patchGroup("objectivesInfo", { scope: e.target.value })} placeholder="e.g. we tested cotton only, not blends; cost modelling excluded labour" className={fieldClass} />
                        </Field>
                        </>
                    )}

                    {/* 4. Literature review */}
                    {step === 3 && (
                        <>
                            <Field label="Sources reviewed" hint={routeMode.litL}>
                                <select value={entry.literature?.sourcesReviewed ?? ""} onChange={(e) => patchGroup("literature", { sourcesReviewed: e.target.value })} className={clsx(fieldClass, "sm:max-w-xs")}>
                                    <option value="">Select…</option>
                                    {LIT_SOURCES_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Kinds of sources (tap all that apply)">
                                <ChipGroup
                                    options={SOURCE_TYPE_OPTIONS}
                                    selected={entry.literature?.sourceTypes ?? []}
                                    onToggle={(v) => {
                                        const cur = entry.literature?.sourceTypes ?? [];
                                        patchGroup("literature", { sourceTypes: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                    }}
                                    otherValue={entry.literature?.sourceTypesOther}
                                    onOtherChange={(v) => patchGroup("literature", { sourceTypesOther: v })}
                                    otherPlaceholder="Type your own source type…"
                                />
                            </Field>
                            <Field label="The gap you found (one line)">
                                <input type="text" value={entry.literature?.gap ?? ""} onChange={(e) => patchGroup("literature", { gap: e.target.value })} placeholder="e.g. no study tested banana-fibre blends for commercial denim durability in Pakistan" className={fieldClass} />
                            </Field>
                        </>
                    )}

                    {/* 5. Methodology */}
                    {step === 4 && (
                        <>
                            <Field label="Approach(es)">
                                <ChipGroup
                                    options={APPROACH_OPTIONS}
                                    selected={entry.methodology?.approaches ?? []}
                                    onToggle={(v) => {
                                        const cur = entry.methodology?.approaches ?? [];
                                        patchGroup("methodology", { approaches: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                    }}
                                />
                            </Field>
                            <Field label="Methods used (tap all that apply)">
                                <ChipGroup
                                    options={METHOD_OPTIONS}
                                    selected={entry.methodology?.methods ?? []}
                                    onToggle={(v) => {
                                        const cur = entry.methodology?.methods ?? [];
                                        patchGroup("methodology", { methods: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                    }}
                                    otherValue={entry.methodology?.methodsOther}
                                    onOtherChange={(v) => patchGroup("methodology", { methodsOther: v })}
                                    otherPlaceholder="Type your own method…"
                                />
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Sample / data scale">
                                    <input type="text" value={entry.methodology?.sampleScale ?? ""} onChange={(e) => patchGroup("methodology", { sampleScale: e.target.value })} placeholder="e.g. 40 samples · 120 responses · 12 interviews" className={fieldClass} />
                                </Field>
                                <Field label="Key tools / techniques (optional)">
                                    <input type="text" value={entry.methodology?.tools ?? ""} onChange={(e) => patchGroup("methodology", { tools: e.target.value })} placeholder="e.g. SPSS, tensile rig, NVivo, AutoCAD" className={fieldClass} />
                                </Field>
                            </div>
                            <Field label="When was the work carried out? (optional)">
                                <div className="flex max-w-sm items-center gap-2">
                                    <input type="month" value={entry.methodology?.periodFrom ?? ""} onChange={(e) => patchGroup("methodology", { periodFrom: e.target.value })} className={fieldClass} />
                                    <span className="shrink-0 text-xs font-black text-ciel-text-soft">→</span>
                                    <input type="month" value={entry.methodology?.periodTo ?? ""} onChange={(e) => patchGroup("methodology", { periodTo: e.target.value })} className={fieldClass} />
                                </div>
                            </Field>
                        </>
                    )}

                    {/* 6. Findings, impact & limitations */}
                    {step === 5 && (
                        <>
                            <Field label={routeMode.fndListL} hint="Theses rarely have just one finding — add each as its own line.">
                                <div className="space-y-2.5">
                                    {(entry.findings?.findings?.length ? entry.findings.findings : [""]).map((f, i) => (
                                        <input
                                            key={i}
                                            type="text"
                                            value={f}
                                            onChange={(e) => {
                                                const next = [...(entry.findings?.findings?.length ? entry.findings.findings : [""])];
                                                next[i] = e.target.value;
                                                patchGroup("findings", { findings: next });
                                            }}
                                            placeholder={i === 0 ? "e.g. a 60/40 blend matches denim strength at 30% less water" : `Finding ${i + 1} (optional)`}
                                            className={fieldClass}
                                        />
                                    ))}
                                </div>
                                {(entry.findings?.findings?.length ?? 1) < 6 ? (
                                    <button
                                        type="button"
                                        onClick={() => patchGroup("findings", { findings: [...(entry.findings?.findings?.length ? entry.findings.findings : [""]), ""] })}
                                        className="text-xs font-bold text-ciel-purple-deep hover:underline"
                                    >
                                        + Add another finding
                                    </button>
                                ) : null}
                            </Field>

                            {routeMode.blk === "discussion" && (
                                <div className="space-y-3 rounded-ciel-sm border-2 border-ciel-border p-4">
                                    <Field label="💬 Discussion — what do your findings mean?" hint="The HEC thesis chain ends here: interpret, don't just report.">
                                        <textarea rows={3} value={entry.routeDetails?.discussion ?? ""} onChange={(e) => patchGroup("routeDetails", { discussion: e.target.value })} placeholder="e.g. The results suggest craft knowledge outperforms lab-only approaches at small scale — challenging the assumption that industrial methods transfer downward…" className={fieldClass} />
                                    </Field>
                                    <Field label="Conclusion in one line" hint="What should the field take away?">
                                        <input type="text" value={entry.routeDetails?.conclusion ?? ""} onChange={(e) => patchGroup("routeDetails", { conclusion: e.target.value })} placeholder="e.g. Food-waste dyes are viable for cotton at small-unit scale; blends need further work" className={fieldClass} />
                                    </Field>
                                </div>
                            )}
                            {routeMode.blk === "studio" && (
                                <div className="space-y-3 rounded-ciel-sm border-2 border-ciel-border p-4">
                                    <p className={labelClass}>🎪 Degree show / exhibition (optional)</p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <input type="month" value={entry.routeDetails?.showMonth ?? ""} onChange={(e) => patchGroup("routeDetails", { showMonth: e.target.value })} className={fieldClass} title="Exhibition / degree show month" />
                                        <input type="number" value={entry.routeDetails?.piecesShown ?? ""} onChange={(e) => patchGroup("routeDetails", { piecesShown: e.target.value ? Number(e.target.value) : undefined })} placeholder="Works / pieces shown" className={fieldClass} />
                                        <input type="text" value={entry.routeDetails?.juryExaminer ?? ""} onChange={(e) => patchGroup("routeDetails", { juryExaminer: e.target.value })} placeholder="Jury / external examiner" className={fieldClass} />
                                    </div>
                                </div>
                            )}
                            {routeMode.blk === "build" && (
                                <div className="space-y-3 rounded-ciel-sm border-2 border-ciel-border p-4">
                                    <p className={labelClass}>🔧 Build status (optional)</p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <select value={entry.routeDetails?.buildStatus ?? ""} onChange={(e) => patchGroup("routeDetails", { buildStatus: e.target.value })} className={fieldClass}>
                                            <option value="">Status…</option>
                                            <option>Concept / drawings</option>
                                            <option>Working prototype</option>
                                            <option>Tested with users</option>
                                            <option>Deployed / in use</option>
                                        </select>
                                        <input type="number" value={entry.routeDetails?.testersCount ?? ""} onChange={(e) => patchGroup("routeDetails", { testersCount: e.target.value ? Number(e.target.value) : undefined })} placeholder="People who tested it" className={fieldClass} />
                                        <input type="number" value={entry.routeDetails?.iterationsCount ?? ""} onChange={(e) => patchGroup("routeDetails", { iterationsCount: e.target.value ? Number(e.target.value) : undefined })} placeholder="Iterations / versions" className={fieldClass} />
                                    </div>
                                </div>
                            )}
                            {routeMode.blk === "media" && (
                                <div className="space-y-3 rounded-ciel-sm border-2 border-ciel-border p-4">
                                    <p className={labelClass}>🎥 Screening / release (optional)</p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <input type="month" value={entry.routeDetails?.screeningMonth ?? ""} onChange={(e) => patchGroup("routeDetails", { screeningMonth: e.target.value })} className={fieldClass} title="Screening / release month" />
                                        <input type="number" value={entry.routeDetails?.audienceReached ?? ""} onChange={(e) => patchGroup("routeDetails", { audienceReached: e.target.value ? Number(e.target.value) : undefined })} placeholder="Audience reached" className={fieldClass} />
                                        <input type="text" value={entry.routeDetails?.runtimeFormat ?? ""} onChange={(e) => patchGroup("routeDetails", { runtimeFormat: e.target.value })} placeholder="Runtime / format" className={fieldClass} />
                                    </div>
                                </div>
                            )}
                            {routeMode.blk === "client" && (
                                <div className="space-y-3 rounded-ciel-sm border-2 border-ciel-border p-4">
                                    <p className={labelClass}>🏢 Client / engagement (optional)</p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <input type="text" value={entry.routeDetails?.clientOrg ?? ""} onChange={(e) => patchGroup("routeDetails", { clientOrg: e.target.value })} placeholder="Client organisation" className={fieldClass} />
                                        <select value={entry.routeDetails?.engagementBasis ?? ""} onChange={(e) => patchGroup("routeDetails", { engagementBasis: e.target.value })} className={fieldClass}>
                                            <option value="">Engagement basis…</option>
                                            <option>Formal — engagement letter on file</option>
                                            <option>Informal — verbal cooperation</option>
                                            <option>Academic simulation — no real client</option>
                                        </select>
                                        <select value={entry.routeDetails?.recommendationStatus ?? ""} onChange={(e) => patchGroup("routeDetails", { recommendationStatus: e.target.value })} className={fieldClass}>
                                            <option value="">Recommendation status…</option>
                                            <option>Accepted / being implemented</option>
                                            <option>Under consideration by client</option>
                                            <option>Presented — no decision yet</option>
                                            <option>Not shared with client</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <Field label="What evidence supports your strongest claim?" hint="Choose one — honesty scores higher.">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {FYP_EVIDENCE_STATUS.map((ev) => {
                                        const isSel = entry.findings?.evidenceStatus === ev.label;
                                        return (
                                        <button
                                            key={ev.label}
                                            type="button"
                                            onClick={() => patchGroup("findings", { evidenceStatus: ev.label })}
                                            style={isSel ? { borderColor: ev.color, backgroundColor: ev.bg } : undefined}
                                            className={clsx(
                                                "ciel-transition flex flex-col items-center gap-1 rounded-ciel-sm border-2 px-3 py-3 text-center",
                                                !isSel && "border-ciel-border",
                                            )}
                                        >
                                            <span className="text-lg">{ev.emoji}</span>
                                            <span className="text-[10px] font-bold leading-tight" style={isSel ? { color: ev.color } : undefined}>{ev.label}</span>
                                        </button>
                                        );
                                    })}
                                </div>
                            </Field>
                            {entry.findings?.evidenceStatus && /measured|estimated/i.test(entry.findings.evidenceStatus) && (
                                <Field label="Your numbers" hint="Up to 3 — name the thing, give the number, tag what kind it is.">
                                    <FypMetricsBuilder
                                        metrics={entry.findings?.metrics ?? []}
                                        onChange={(next) => patchGroup("findings", { metrics: next })}
                                    />
                                </Field>
                            )}
                            <Field label="Measurable impact — a number if you have one">
                                <input type="text" value={entry.findings?.measurableImpact ?? ""} onChange={(e) => patchGroup("findings", { measurableImpact: e.target.value })} placeholder="e.g. −30% water per metre, verified across 40 samples" className={fieldClass} />
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Main limitation (honest)">
                                    <select value={entry.findings?.limitationType ?? ""} onChange={(e) => patchGroup("findings", { limitationType: e.target.value })} className={fieldClass}>
                                        <option value="">Select…</option>
                                        {LIMITATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="One line on it (optional)">
                                    <input type="text" value={entry.findings?.limitationDetail ?? ""} onChange={(e) => patchGroup("findings", { limitationDetail: e.target.value })} placeholder="e.g. tested to 20 washes; industry standard is 50" className={fieldClass} />
                                </Field>
                            </div>
                        </>
                    )}

                    {/* 7. SDG linking */}
                    {step === 6 && (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAiSdgOpen(true)}
                                    className="ciel-transition rounded-ciel-sm bg-ciel-purple px-4 py-2.5 text-xs font-bold text-white hover:bg-ciel-purple/90"
                                >
                                    🤖 Not sure? Let AI read my answers &amp; suggest SDGs
                                </button>
                            </div>
                            {aiSdgOpen && (
                                <div className="relative rounded-ciel-sm border border-ciel-indigo-soft bg-ciel-indigo-soft/60 px-4 py-3 pr-9 text-xs leading-relaxed text-ciel-indigo">
                                    <button
                                        type="button"
                                        onClick={() => setAiSdgOpen(false)}
                                        aria-label="Close suggestions"
                                        className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full text-ciel-indigo/70 hover:bg-ciel-indigo/10 hover:text-ciel-indigo"
                                    >
                                        ✕
                                    </button>
                                    {sdgSuggestions.length ? (
                                        <>
                                            🤖 <b>I read your problem, aim and findings.</b> This work most likely connects to:
                                            <ul className="mt-1.5 space-y-1">
                                                {sdgSuggestions.map((s, i) => (
                                                    <li key={s.goalNumber}>
                                                        <b>{i === 0 ? "★ " : ""}SDG {s.goalNumber} — {sdgData.find((d) => d.number === s.goalNumber)?.title}</b>
                                                        {" "}<span className="text-ciel-indigo/70">(you mentioned: {s.matchedKeywords.map((k) => `"${k}"`).join(", ")})</span>
                                                        {" — "}
                                                        <button type="button" onClick={() => !picked.some((p) => p.goalNumber === s.goalNumber) && toggleGoal(s.goalNumber)} className="font-bold underline">tap to add</button>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="mt-1.5 text-[10.5px]">Suggestions only — you choose, your supervisor verifies. &quot;No SDG applies&quot; below is also a respected answer.</p>
                                        </>
                                    ) : (
                                        <>🤖 I couldn&apos;t find a clear SDG signal in your answers — that may simply mean <b>no SDG applies</b>, which is academically respectable. Tick the option below, or write your problem in more detail and try again.</>
                                    )}
                                </div>
                            )}
                            <Field label="Which SDGs does this work support?" hint="Pick up to 3 — tap a tile, then choose the target that fits.">
                                <div className={clsx("grid grid-cols-2 gap-2 sm:grid-cols-3", entry.sdgMapping?.noSdgApplies && "pointer-events-none opacity-30")}>
                                    {sdgData.map((sdg) => {
                                        const isSel = picked.some((p) => p.goalNumber === sdg.number);
                                        const isDisabled = !isSel && picked.length >= 3;
                                        return (
                                            <button
                                                key={sdg.id}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => toggleGoal(sdg.number)}
                                                style={{ backgroundColor: sdg.color }}
                                                className={clsx(
                                                    "relative flex min-h-[66px] flex-col gap-0.5 rounded-lg border-2 p-2 text-left text-[11px] font-bold leading-tight text-white transition-all",
                                                    isSel ? "border-slate-900 shadow-lg" : isDisabled ? "cursor-not-allowed border-transparent opacity-15" : "border-transparent opacity-70 hover:-translate-y-0.5 hover:opacity-100",
                                                )}
                                            >
                                                {isSel ? <CheckCircle2 className="absolute right-1.5 top-1.5 h-3.5 w-3.5" /> : null}
                                                <span className="text-base font-extrabold">{sdg.number}</span>
                                                {sdg.title}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>

                            {picked.length > 0 && (
                                <div className="space-y-3">
                                    {picked.map((p) => {
                                        const sdg = sdgData.find((s) => s.number === p.goalNumber);
                                        if (!sdg) return null;
                                        return (
                                            <div key={p.goalNumber} className="overflow-hidden rounded-ciel-sm border-2 border-ciel-border">
                                                <div className="flex items-center justify-between px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: sdg.color }}>
                                                    <span>SDG {sdg.number} · {sdg.title}</span>
                                                    <button type="button" onClick={() => toggleGoal(sdg.number)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs">✕</button>
                                                </div>
                                                <div className="space-y-2 bg-white p-4">
                                                    <p className={labelClass}>Which target fits? (pick one or more)</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {sdg.targets.map((t) => (
                                                            <button
                                                                key={t.id}
                                                                type="button"
                                                                onClick={() => toggleTarget(p.goalNumber, t.id)}
                                                                className={clsx(
                                                                    "ciel-transition rounded-ciel-xs border-2 px-2.5 py-1.5 text-left text-xs font-semibold",
                                                                    p.targets.includes(t.id) ? "border-ciel-purple bg-ciel-purple-soft text-ciel-purple-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-purple/40",
                                                                )}
                                                            >
                                                                <span className="font-black">{t.id}</span> {t.description}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={p.how ?? ""}
                                                        onChange={(e) => setHow(p.goalNumber, e.target.value)}
                                                        placeholder="One line: how does your thesis support this goal?"
                                                        className={clsx(fieldClass, "mt-1")}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="rounded-ciel-sm border-2 border-ciel-purple/30 bg-ciel-purple-soft/50 px-4 py-3 text-xs font-semibold leading-relaxed text-ciel-purple-deep">
                                🏛️ <b>The living repository:</b> every approved record joins your university&apos;s searchable FYP repository — so next year&apos;s students stand on this year&apos;s work instead of repeating it. Records without an attached thesis are <b>ineligible for AI picks and showcase</b>.
                            </div>

                            <label className="ciel-transition flex cursor-pointer items-start gap-3 rounded-ciel-sm border-2 border-amber-200 bg-amber-50 p-4">
                                <input
                                    type="checkbox"
                                    checked={!!entry.sdgMapping?.noSdgApplies}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            stashedSdgEntriesRef.current = picked;
                                            patchGroup("sdgMapping", { noSdgApplies: true, entries: [] });
                                        } else {
                                            patchGroup("sdgMapping", { noSdgApplies: false, entries: stashedSdgEntriesRef.current });
                                        }
                                    }}
                                    className="mt-0.5 h-4 w-4 accent-amber-600"
                                />
                                <span>
                                    <span className="block text-sm font-bold text-amber-900">No SDG applies to this research</span>
                                    <span className="block text-xs leading-relaxed text-amber-800">Rare but possible (pure mathematics, abstract theory). A CIEL reviewer will double-check.</span>
                                </span>
                            </label>
                        </>
                    )}

                    {/* 8. Reflection */}
                    {step === 7 && (
                        <>
                            <Field label="What is the single most important thing this thesis taught you?">
                                <input type="text" value={entry.reflectionInfo?.biggestLesson ?? ""} onChange={(e) => patchGroup("reflectionInfo", { biggestLesson: e.target.value })} placeholder="e.g. sustainable materials only win if they also win on cost and quality" className={fieldClass} />
                            </Field>
                            <Field label="What was your hardest moment — and how did you get through it?">
                                <input type="text" value={entry.reflectionInfo?.hardestMoment ?? ""} onChange={(e) => patchGroup("reflectionInfo", { hardestMoment: e.target.value })} placeholder="e.g. our first 20 samples failed; we changed the fibre treatment and kept going" className={fieldClass} />
                            </Field>
                            <Field label="Which assumption of yours turned out to be wrong?">
                                <input type="text" value={entry.reflectionInfo?.wrongAssumption ?? ""} onChange={(e) => patchGroup("reflectionInfo", { wrongAssumption: e.target.value })} placeholder="e.g. we assumed cost was the barrier — it was actually supply consistency" className={fieldClass} />
                            </Field>
                            <Field label="How did this work change how you think about sustainability?">
                                <input type="text" value={entry.reflectionInfo?.sustainabilityShift ?? ""} onChange={(e) => patchGroup("reflectionInfo", { sustainabilityShift: e.target.value })} placeholder="e.g. it's an engineering constraint that improves design, not a marketing label" className={fieldClass} />
                            </Field>
                            <Field label="Skills you grew (tap all that apply)">
                                <ChipGroup
                                    options={SKILL_OPTIONS}
                                    selected={entry.reflectionInfo?.skills ?? []}
                                    onToggle={(v) => {
                                        const cur = entry.reflectionInfo?.skills ?? [];
                                        patchGroup("reflectionInfo", { skills: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                    }}
                                />
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="What's next for this work?">
                                    <select value={entry.reflectionInfo?.whatsNext ?? ""} onChange={(e) => patchGroup("reflectionInfo", { whatsNext: e.target.value })} className={fieldClass}>
                                        <option value="">Select…</option>
                                        {NEXT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="One line of advice for next year's students">
                                    <input type="text" value={entry.reflectionInfo?.adviceForNext ?? ""} onChange={(e) => patchGroup("reflectionInfo", { adviceForNext: e.target.value })} placeholder="e.g. pick your supervisor for their time, not their title" className={fieldClass} />
                                </Field>
                            </div>
                        </>
                    )}

                    {/* 9. Repository, review & publish */}
                    {step === 8 && (
                        <div className="space-y-5">
                            <Field label="Full thesis / report (PDF) — required">
                                <label className={clsx("ciel-transition flex cursor-pointer items-center gap-3 rounded-ciel-sm border-2 border-dashed px-4 py-3 text-sm font-semibold hover:border-ciel-purple/40", hasThesisPdf ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid", uploading === "Full thesis (PDF)" && "opacity-60")}>
                                    <UploadCloud className="h-4 w-4" />
                                    {uploading === "Full thesis (PDF)" ? "Uploading..." : hasThesisPdf ? "✅ Thesis uploaded — click to replace" : "Upload full thesis (PDF)"}
                                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleDeliverableFile(e.target.files[0], "Full thesis (PDF)")} />
                                </label>
                            </Field>
                            <Field label="Supplementary evidence (optional)" hint="Data, photos, poster, slides…">
                                <label className={clsx("ciel-transition flex cursor-pointer items-center gap-3 rounded-ciel-sm border-2 border-dashed border-ciel-border px-4 py-3 text-sm font-semibold text-ciel-text-mid hover:border-ciel-purple/40", uploading === "Supplementary evidence" && "opacity-60")}>
                                    <UploadCloud className="h-4 w-4" />
                                    {uploading === "Supplementary evidence" ? "Uploading..." : "Upload supplementary evidence"}
                                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleDeliverableFile(e.target.files[0], "Supplementary evidence")} />
                                </label>
                                {entry.deliverables.length > 0 && (
                                    <ul className="mt-2 space-y-1.5">
                                        {groupDeliverablesByLabel(entry.deliverables).map(({ label, latest, earlier }) => (
                                            <li key={label} className="rounded-ciel-xs bg-ciel-page px-3 py-2 text-xs font-semibold text-ciel-text-mid">
                                                <a href={latest.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">{latest.label} (v{latest.version} — current)</a>
                                                {earlier.length > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedDeliverableLabel((cur) => (cur === label ? null : label))}
                                                        className="ml-2 text-ciel-text-soft underline decoration-dotted"
                                                    >
                                                        {expandedDeliverableLabel === label ? "hide" : `+${earlier.length} earlier`}
                                                    </button>
                                                ) : null}
                                                {expandedDeliverableLabel === label && earlier.length > 0 ? (
                                                    <ul className="mt-1.5 space-y-1 border-l-2 border-ciel-border pl-3">
                                                        {earlier.map((d) => (
                                                            <li key={d.version} className="font-normal text-ciel-text-soft">
                                                                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">v{d.version} (superseded)</a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Field>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="External links (optional)">
                                    <input type="text" value={entry.repository?.externalLinks ?? ""} onChange={(e) => patchGroup("repository", { externalLinks: e.target.value })} placeholder="GitHub, demo video, journal submission…" className={fieldClass} />
                                </Field>
                                <Field label="Repository visibility">
                                    <select value={entry.repository?.visibility ?? VISIBILITY_OPTIONS[0]} onChange={(e) => patchGroup("repository", { visibility: e.target.value })} className={fieldClass}>
                                        {VISIBILITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                            </div>

                            <Field label="Declarations">
                                <div className="space-y-2">
                                    {[
                                        "This record accurately represents our work; findings are stated as found, not improved.",
                                        "All co-authors are named above and consent to institutional review.",
                                    ].map((text, i) => (
                                        <label key={i} className="flex cursor-pointer items-start gap-3 rounded-ciel-sm border border-ciel-border bg-white px-4 py-3 text-sm leading-relaxed text-ciel-text">
                                            <input
                                                type="checkbox"
                                                checked={declarations[i]}
                                                onChange={(e) => setDeclarations((d) => (i === 0 ? [e.target.checked, d[1]] : [d[0], e.target.checked]))}
                                                className="mt-0.5 h-4 w-4 shrink-0 accent-ciel-purple"
                                            />
                                            <span>{text}</span>
                                        </label>
                                    ))}
                                </div>
                            </Field>

                            <div className="rounded-ciel-sm border border-ciel-indigo-soft bg-ciel-indigo-soft/60 px-4 py-3 text-xs leading-relaxed text-ciel-indigo">
                                🏛️ <b>Institutional review notice:</b> authorised faculty and reviewers may access this record for assessment, quality assurance and verification. Review is not publication — showcase and public visibility are separate, later, and consent-based.
                            </div>

                            <div className="space-y-3 border-t border-ciel-border pt-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-black text-ciel-text">✨ Review your baseline summary</h3>
                                    <button type="button" onClick={regenerateAllReview} className="ciel-transition shrink-0 rounded-ciel-xs border border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-purple/40">
                                        ↻ Regenerate all
                                    </button>
                                </div>
                                <p className="text-xs text-ciel-text-soft">Accept each block, edit inline, or reset. Nothing goes to your supervisor until every block is green.</p>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ciel-border">
                                        <div className="h-full rounded-full bg-ciel-green transition-all" style={{ width: `${(acceptedCount / SECTION_KEYS.length) * 100}%` }} />
                                    </div>
                                    <span className="shrink-0 text-xs font-bold text-ciel-text-soft">{acceptedCount} of {SECTION_KEYS.length} accepted</span>
                                </div>

                                {SECTION_KEYS.map((key) => {
                                    const meta = SECTION_LABELS[key];
                                    const r = review[key] ?? { accepted: false, edited: false, text: sums[key] || "" };
                                    return (
                                        <div key={key} className={clsx("overflow-hidden rounded-ciel-sm border-2", r.accepted ? "border-ciel-green" : "border-ciel-border")}>
                                            <div className={clsx("flex flex-wrap items-center gap-2 px-4 py-2.5", r.accepted ? "bg-ciel-green-soft" : "bg-ciel-page/60")}>
                                                <span className="text-xs font-black uppercase tracking-widest text-ciel-text-soft">{meta.emoji} {meta.label}</span>
                                                {r.edited && <span className="text-[10px] font-bold text-ciel-indigo">✏️ edited</span>}
                                                <span className={clsx("ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-black", r.accepted ? "bg-ciel-green text-white" : "bg-ciel-border text-ciel-text-mid")}>
                                                    {r.accepted ? "✓ ACCEPTED" : "REVIEW"}
                                                </span>
                                            </div>
                                            <textarea
                                                rows={3}
                                                value={r.text}
                                                onChange={(e) => setReview((prev) => ({ ...prev, [key]: { ...r, text: e.target.value, edited: true, accepted: false } }))}
                                                placeholder="Nothing captured — go back and fill it in, or type here."
                                                className="w-full resize-none bg-white p-4 text-sm leading-relaxed text-ciel-text outline-none focus-visible:ring-2 focus-visible:ring-ciel-purple"
                                            />
                                            <div className="flex gap-2 border-t border-ciel-border bg-white px-4 py-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setReview((prev) => ({ ...prev, [key]: { ...r, accepted: true } }))}
                                                    className={clsx("ciel-transition rounded-ciel-xs border-2 px-3 py-1.5 text-xs font-bold", r.accepted ? "border-ciel-green bg-ciel-green text-white" : "border-ciel-green text-ciel-green-deep hover:bg-ciel-green-soft")}
                                                >
                                                    {r.accepted ? "✓ Accepted" : "✓ Accept"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReview((prev) => ({ ...prev, [key]: { accepted: false, edited: false, text: sums[key] || "" } }))}
                                                    className="ciel-transition rounded-ciel-xs border-2 border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-purple/40"
                                                >
                                                    ↻ Reset
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!allAccepted && <p className="text-xs font-semibold text-ciel-text-soft">Accept every section above to unlock submission.</p>}
                            </div>

                            <Field label="➕ Anything the AI missed? (optional)">
                                <input type="text" value={entry.addedNote ?? ""} onChange={(e) => setEntry((s) => ({ ...s, addedNote: e.target.value }))} placeholder="e.g. This work was presented at the BNU Research Expo 2026." className={fieldClass} />
                            </Field>
                        </div>
                    )}
                </div>

                {error && <p className="mt-4 text-xs font-semibold text-red-600">{error}</p>}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={step === 0}
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        className="ciel-transition rounded-ciel-sm border border-ciel-border px-4 py-2.5 text-sm font-bold text-ciel-text-mid hover:border-ciel-purple/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-purple"
                    >
                        Back
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                        {step < 8 ? (
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => save(saveAllFields(), step + 1)}
                                className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-purple focus-visible:ring-offset-2"
                            >
                                {saving ? "Saving..." : "Save & continue"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={saving || !allAccepted || !hasThesisPdf || !declarationsOk}
                                title={!hasThesisPdf ? "Upload your full thesis PDF first" : !allAccepted ? "Accept every section above first" : !declarationsOk ? "Confirm both declarations first" : undefined}
                                onClick={async () => {
                                    const ok = await save({ ...saveAllFields(), status: "submitted", sectionSummaries: finalSectionSummaries() }, 9);
                                    if (ok) setEditing(false);
                                }}
                                className="ciel-transition rounded-ciel-sm bg-ciel-purple px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-purple/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-purple focus-visible:ring-offset-2"
                            >
                                {saving ? "Sending..." : "Send to supervisor for sign-off →"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            )}
        </PathWorkspaceShell>
    );
}
