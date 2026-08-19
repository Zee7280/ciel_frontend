"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, UploadCloud, X, ChevronDown, ArrowLeft, Star } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { sdgData } from "@/utils/sdgData";
import { pakistaniUniversities } from "@/utils/universityData";
import { hecPrograms } from "@/utils/hecProgramsData";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import SearchableSelect from "@/components/ui/SearchableSelect";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import {
    type CourseProjectEntry,
    type CourseProjectModuleInclusion,
    type CourseProjectSectionSummaries,
    EMPTY_COURSE_PROJECT,
    mergeCourseProjectEntry,
    composeCourseProjectSummaries,
    activeSectionKeys,
    SECTION_LABELS,
} from "@/utils/courseProjectTypes";

const STEPS = [
    { key: "course", emoji: "📌", label: "Course" },
    { key: "format", emoji: "🚀", label: "Format" },
    { key: "aims", emoji: "🎯", label: "Aims" },
    { key: "process", emoji: "🛠️", label: "Process" },
    { key: "results", emoji: "📦", label: "Results" },
    { key: "sdg", emoji: "🌍", label: "SDG map" },
    { key: "reflection", emoji: "💡", label: "Reflection" },
    { key: "submit", emoji: "📤", label: "Submit" },
];

const DEPARTMENT_OPTIONS = ["Business & Management", "Economics", "Architecture", "Design", "Fine Arts", "Media & Communication", "Computer Science", "Engineering", "Social Sciences", "Psychology", "Education", "Liberal Arts", "Natural Sciences", "Law", "Health Sciences"];
const SEMESTER_OPTIONS = Array.from({ length: 10 }, (_, i) => `Semester ${i + 1}`);
const TEAM_MODE_OPTIONS = ["Individual", "Pair", "Group / Team", "Whole class", "Interdisciplinary team"];
const COURSEWORK_TYPE_OPTIONS = ["Assignment", "Semester project", "Research task", "Case study", "Studio / design project", "Practical / lab work", "Field-based work", "Presentation", "Creative production", "Campaign / activity", "Digital / software project", "Performance / exhibition", "Other"];

/** Which optional modules apply to this assignment's format (Aim, Activities, Methods, Findings, Impact/Results, Limitations). */
const FORMATS: Record<string, { p: CourseProjectModuleInclusion; note: string }> = {
    "✍️ Essay / written argument": { p: { aim: true, act: false, meth: true, find: true, imp: false, lim: true }, note: "Aim → Research → Argument → Findings → SDG connection." },
    "📑 Report": { p: { aim: true, act: true, meth: false, find: true, imp: true, lim: true }, note: "A report usually has objectives, activities, findings and impact." },
    "🔬 Research paper": { p: { aim: true, act: false, meth: true, find: true, imp: true, lim: true }, note: "Question → Method → Findings → Limitations → SDG connection." },
    "🧭 Case study": { p: { aim: true, act: false, meth: true, find: true, imp: false, lim: true }, note: "Case → Analysis → Insights → Recommendation → SDG connection." },
    "🎤 Presentation / slides": { p: { aim: true, act: false, meth: false, find: true, imp: false, lim: false }, note: "A presentation gets your core message and key points — nothing else needed." },
    "🎨 Design / visual work": { p: { aim: true, act: true, meth: false, find: true, imp: true, lim: true }, note: "Design objective → Creative process → Iterations → Final design → Sustainability." },
    "📐 Model": { p: { aim: true, act: true, meth: false, find: false, imp: true, lim: true }, note: "A model gets the brief, the process, and the final piece." },
    "🔧 Prototype": { p: { aim: true, act: true, meth: true, find: false, imp: true, lim: true }, note: "Problem → Build → Test → Result → Sustainability link." },
    "🧱 Physical product / making": { p: { aim: true, act: true, meth: false, find: false, imp: true, lim: true }, note: "Making work gets the brief, the process, and the final piece." },
    "📱 App / website / software": { p: { aim: true, act: true, meth: true, find: false, imp: true, lim: true }, note: "Problem → Development → Testing → Users → Output → SDG link." },
    "📊 Data / analysis": { p: { aim: true, act: false, meth: true, find: true, imp: true, lim: true }, note: "Question → Data → Analysis → Findings → SDG connection." },
    "🎬 Video / film / audio": { p: { aim: true, act: true, meth: false, find: true, imp: false, lim: false }, note: "Concept → Creative process → Audience → Message → SDG link." },
    "🖼️ Artwork / creative production": { p: { aim: true, act: true, meth: false, find: true, imp: false, lim: false }, note: "Concept → Creative process → Audience → Message → SDG link." },
    "📣 Campaign / communication": { p: { aim: true, act: true, meth: false, find: false, imp: true, lim: true }, note: "Goal → Campaign → Reach → Response → SDG link." },
    "🪧 Poster / infographic": { p: { aim: true, act: true, meth: false, find: false, imp: false, lim: false }, note: "Goal → Design → Message → SDG link." },
    "🎭 Performance / exhibition": { p: { aim: true, act: true, meth: false, find: true, imp: false, lim: false }, note: "Concept → Creative process → Audience → Message → SDG link." },
    "🥾 Fieldwork output": { p: { aim: true, act: true, meth: false, find: true, imp: true, lim: true }, note: "Field work gets objectives, activities, what you observed, and impact." },
    "🧭 Strategy / proposal / plan": { p: { aim: true, act: false, meth: true, find: true, imp: true, lim: true }, note: "A plan gets the opportunity, your research, key numbers and limitations." },
    "✍️ Other": { p: { aim: true, act: true, meth: true, find: true, imp: true, lim: true }, note: "We've switched everything on — turn off whatever doesn't apply to your work." },
};
const FORMAT_OPTIONS = Object.keys(FORMATS);

const INC_TILES: { key: keyof CourseProjectModuleInclusion; emoji: string; label: string }[] = [
    { key: "aim", emoji: "🎯", label: "Aim & objectives" },
    { key: "act", emoji: "🛠️", label: "Activities" },
    { key: "meth", emoji: "🔬", label: "Method / research" },
    { key: "find", emoji: "📈", label: "Findings" },
    { key: "imp", emoji: "📏", label: "Results & evidence" },
    { key: "lim", emoji: "⚠️", label: "Limitations" },
];

const ACTIVITY_OPTIONS = ["🔍 Research & reading", "📊 Data collection", "🎨 Designing / creating", "🧩 Ideation / concepts", "🧪 Testing / experimenting", "🧱 Building / making", "🖥 Coding / development", "👀 Observation / site visit", "🤝 Working with an organisation", "📣 Running a campaign / event", "🎤 Presenting / pitching", "✍️ Drafting & editing", "🎬 Filming / recording"];
const METHOD_OPTIONS = ["📋 Survey", "🗣️ Interviews", "🧪 Experiment", "👀 Observation / site visit", "📊 Data analysis", "🗂️ Case analysis", "📚 Literature search", "⚖️ Legal / doctrinal analysis", "Not applicable"];
const BENEFICIARY_OPTIONS = ["Students", "University / campus", "Community", "Business / industry", "Government / public sector", "Schools", "Environment / ecosystems", "Specific user group", "General public", "No specific external beneficiary"];
const STAKEHOLDER_OPTIONS = ["No external stakeholders", "Students", "Faculty", "Community members", "Business / industry", "NGO / nonprofit", "Government / public body", "School", "Experts / professionals", "Clients / users"];
const OUTPUT_OPTIONS = ["📄 Report / plan", "✍️ Essay / written piece", "📽️ Presentation / slides", "📐 Design / model", "🔧 Prototype", "📱 App / website", "📣 Campaign materials", "🎬 Video / artwork", "🎭 Performance / exhibit", "📊 Dataset / findings", "📜 Brief / memo", "🌐 Translation / portfolio"];
const SKILL_OPTIONS = ["🗣️ Communication", "🤝 Teamwork", "🔬 Research", "🧩 Problem-solving", "🎨 Creativity", "⏰ Time management", "🌍 Sustainability thinking", "⚖️ Ethical reasoning", "✍️ Writing", "🎤 Presenting"];
const ORIGIN_OPTIONS = ["📋 Built into the assignment", "📘 Built into the course", "💡 Introduced by the student / team", "👩‍🏫 Suggested by the instructor", "🔍 Emerged during the work", "🔗 Identified when reviewing the completed work"];
const INTEGRATION_OPTIONS = ["🌱 Central to the work and demonstrated", "📊 Clearly connected, outcome not measured", "🌓 Partially integrated", "🔗 Indirectly connected", "🔍 Identified retrospectively"];
const EVIDENCE_STATUS: { emoji: string; label: string }[] = [
    { emoji: "📊", label: "Actual measured result" },
    { emoji: "📝", label: "Qualitative evidence" },
    { emoji: "🎯", label: "Proposed target" },
    { emoji: "📈", label: "Estimated / projected" },
    { emoji: "💡", label: "Conceptual recommendation" },
    { emoji: "⏳", label: "Not measured yet" },
    { emoji: "➖", label: "Not applicable" },
];
const NUMBER_REPRESENTS_OPTIONS = ["Baseline", "Target", "Estimated / projected", "Actual measured result"];
const NEXT_STEP_OPTIONS = ["Completed as coursework", "Could be developed further", "Further research recommended", "Could be tested / piloted", "Recommended for implementation", "Share with external stakeholder", "Continued in another course", "Already taken forward", "Other"];

const fieldClass = "w-full rounded-ciel-sm border-2 border-ciel-border bg-ciel-page/50 px-4 py-3 text-sm font-semibold text-ciel-text outline-none focus:border-ciel-green focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-green";
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

function ChipSingle({ options, value, onChange }: { options: string[]; value?: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={clsx(
                        "ciel-transition rounded-full border-2 px-3.5 py-2 text-xs font-bold",
                        value === opt ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40",
                    )}
                >
                    {opt}
                </button>
            ))}
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
}: {
    options: string[];
    selected: string[];
    onToggle: (value: string) => void;
    otherValue?: string;
    onOtherChange?: (value: string) => void;
    otherPlaceholder?: string;
}) {
    const hasOther = onOtherChange !== undefined;
    const otherSelected = hasOther && !!otherValue?.trim();
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
                                isSel ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40",
                            )}
                        >
                            {opt}
                        </button>
                    );
                })}
                {hasOther ? (
                    <button
                        type="button"
                        onClick={() => onOtherChange!(otherSelected ? "" : " ")}
                        className={clsx(
                            "ciel-transition rounded-full border-2 border-dashed px-3.5 py-2 text-xs font-bold",
                            otherSelected ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40",
                        )}
                    >
                        ＋ Other…
                    </button>
                ) : null}
            </div>
            {hasOther && otherSelected ? (
                <input
                    type="text"
                    value={otherValue?.trim() ?? ""}
                    onChange={(e) => onOtherChange!(e.target.value)}
                    placeholder={otherPlaceholder || "Type your own…"}
                    className={fieldClass}
                />
            ) : null}
        </div>
    );
}

export default function CourseProjectWizardPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params.id;

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [entry, setEntry] = useState<CourseProjectEntry>(EMPTY_COURSE_PROJECT);
    const [step, setStep] = useState(0);
    const [editing, setEditing] = useState(false);
    const [review, setReview] = useState<Record<string, { accepted: boolean; edited: boolean; text: string }>>({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        authenticatedFetch(`/api/v1/paths/course-projects/${id}`, {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) {
                    const data = result.data as CourseProjectEntry;
                    setEntry(mergeCourseProjectEntry(EMPTY_COURSE_PROJECT, data));
                    setStep(Math.min(7, data.stepCompleted ?? 0));
                } else {
                    setNotFound(true);
                }
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    const sums = composeCourseProjectSummaries(entry);
    const activeStepIdx = activeSectionKeys(entry);

    /** Populate un-accepted/un-edited review blocks with the latest AI draft whenever step 8 opens — mirrors "your teacher sees only what you approve": accepted or hand-edited text never gets silently overwritten. */
    useEffect(() => {
        if (step !== 7) return;
        setReview((prev) => {
            const next = { ...prev };
            for (const key of activeStepIdx) {
                const existing = next[key];
                if (!existing || (!existing.accepted && !existing.edited)) {
                    next[key] = { accepted: false, edited: false, text: sums[key] || "" };
                }
            }
            return next;
        });
        // Intentionally only re-syncs when the step changes to 8 (not on every keystroke elsewhere).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const regenerateAllReview = () => {
        setReview(() => {
            const next: Record<string, { accepted: boolean; edited: boolean; text: string }> = {};
            for (const key of activeStepIdx) next[key] = { accepted: false, edited: false, text: sums[key] || "" };
            return next;
        });
    };

    const inc: CourseProjectModuleInclusion = entry.moduleInclusion || {};

    const save = async (patch: Partial<CourseProjectEntry>, advanceTo?: number) => {
        setSaving(true);
        setError(null);
        const nextStepCompleted = advanceTo !== undefined ? Math.max(entry.stepCompleted, advanceTo) : entry.stepCompleted;
        try {
            const res = await authenticatedFetch(
                `/api/v1/paths/course-projects/${id}`,
                { method: "PATCH", body: JSON.stringify({ ...patch, stepCompleted: nextStepCompleted }) },
                { redirectToLogin: false },
            );
            const result = res?.ok ? await res.json() : null;
            if (!result?.data) throw new Error("Could not save your progress");
            setEntry((e) => mergeCourseProjectEntry(e, result.data as Partial<CourseProjectEntry>));
            if (advanceTo !== undefined) setStep(Math.min(7, advanceTo));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save your progress");
        } finally {
            setSaving(false);
        }
    };

    const patchGroup = <K extends keyof CourseProjectEntry>(key: K, patch: Partial<NonNullable<CourseProjectEntry[K]>>) => {
        setEntry((e) => ({ ...e, [key]: { ...(e[key] as object), ...patch } }));
    };

    const toggleFormat = (fmt: string) => {
        const cur = entry.assignmentInfo?.formats ?? (entry.assignmentInfo?.format ? [entry.assignmentInfo.format] : []);
        const next = cur.includes(fmt) ? cur.filter((x) => x !== fmt) : [...cur, fmt];
        patchGroup("assignmentInfo", { formats: next, format: next[0] });
        const preset = next[0] ? FORMATS[next[0]]?.p : undefined;
        if (preset) setEntry((e) => ({ ...e, moduleInclusion: { ...preset } }));
    };

    const handleEvidenceFile = async (file: File) => {
        setUploading(true);
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
            const nextUrls = [...(entry.evidenceUrls ?? []), publicUrl];
            setEntry((e) => ({ ...e, evidenceUrls: nextUrls }));
            await save({ evidenceUrls: nextUrls });
        } catch {
            setError("Evidence upload failed. Try again.");
        } finally {
            setUploading(false);
        }
    };
    const removeEvidence = (url: string) => {
        const nextUrls = (entry.evidenceUrls ?? []).filter((u) => u !== url);
        setEntry((e) => ({ ...e, evidenceUrls: nextUrls }));
        save({ evidenceUrls: nextUrls });
    };

    if (loading) return <WorkspaceSkeleton />;

    if (notFound) {
        return (
            <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
                <p className="text-lg font-black text-ciel-text">This coursework report doesn&apos;t exist, or isn&apos;t yours.</p>
                <Link href="/dashboard/student/paths/course-project" className="text-sm font-bold text-ciel-green-deep hover:underline">
                    ← Back to my coursework
                </Link>
            </div>
        );
    }

    const acceptedCount = activeStepIdx.filter((k) => review[k]?.accepted).length;
    const allAccepted = activeStepIdx.length > 0 && acceptedCount === activeStepIdx.length;
    const finalSectionSummaries = (): CourseProjectSectionSummaries => {
        const out: CourseProjectSectionSummaries = {};
        for (const key of activeStepIdx) out[key] = review[key]?.text ?? sums[key] ?? "";
        return out;
    };
    const saveAllFields = () => ({
        course: entry.course,
        projectTitle: entry.projectTitle,
        studentInfo: entry.studentInfo ?? undefined,
        assignmentInfo: entry.assignmentInfo ?? undefined,
        aimsInfo: entry.aimsInfo ?? undefined,
        processInfo: entry.processInfo ?? undefined,
        resultsInfo: entry.resultsInfo ?? undefined,
        sdgMapping: entry.sdgMapping ?? undefined,
        reflectionInfo: entry.reflectionInfo ?? undefined,
        moduleInclusion: entry.moduleInclusion ?? undefined,
        addedNote: entry.addedNote ?? undefined,
    });

    const showCard = entry.status === "submitted" && !editing;
    const teamMode = entry.studentInfo?.teamMode ?? "";
    const isTeam = !!teamMode && teamMode !== "Individual";
    const primaryFormat = entry.assignmentInfo?.formats?.[0] ?? entry.assignmentInfo?.format;
    const formatMeta = primaryFormat ? FORMATS[primaryFormat] : undefined;
    const showMetricFields = /measured|target|estimated/i.test(entry.resultsInfo?.evidenceStatus ?? "");

    return (
        <PathWorkspaceShell
            title="Course Project"
            stats={[
                { label: "Status", value: entry.status === "submitted" ? "Submitted" : "Draft" },
                { label: "Steps complete", value: `${entry.stepCompleted}/8`, hint: "Contributes to sections 2, 3 of your impact score" },
            ]}
            tabs={[{ key: "build", label: "Build project" }]}
            activeTab="build"
            onTabChange={() => {}}
        >
            <div className="mb-4">
                <Link href="/dashboard/student/paths/course-project" className="inline-flex items-center gap-1.5 text-xs font-bold text-ciel-text-mid hover:text-ciel-navy">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to my coursework
                </Link>
            </div>

            {showCard ? (
                <div className="space-y-4">
                    <CourseworkCard entry={entry} defaultOpen />
                    <button
                        type="button"
                        onClick={() => {
                            setStep(0);
                            setEditing(true);
                        }}
                        className="ciel-transition rounded-ciel-sm border border-ciel-border px-4 py-2.5 text-sm font-bold text-ciel-text-mid hover:border-ciel-green/40"
                    >
                        Edit this report
                    </button>
                </div>
            ) : null}

            {!showCard && (
            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                    {STEPS.map((s, i) => (
                        <div key={s.key} className="flex flex-1 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => i <= entry.stepCompleted && setStep(i)}
                                disabled={i > entry.stepCompleted}
                                className={clsx(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ciel-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                                    i === step ? "bg-ciel-green text-white" : i < entry.stepCompleted ? "bg-ciel-green-soft text-ciel-green-deep" : "bg-ciel-page text-ciel-text-soft",
                                )}
                                title={s.label}
                            >
                                {i < entry.stepCompleted ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                            </button>
                            <span className={clsx("hidden text-xs font-bold sm:block", i === step ? "text-ciel-text" : "text-ciel-text-soft")}>
                                {s.emoji} {s.label}
                            </span>
                            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-ciel-border" />}
                        </div>
                    ))}
                </div>

                <div className="mt-6 space-y-5">
                    {step === 0 && (
                        <>
                            <Field label="Your name">
                                <input type="text" value={entry.studentInfo?.studentName ?? ""} onChange={(e) => patchGroup("studentInfo", { studentName: e.target.value })} className={fieldClass} />
                            </Field>
                            <Field label="Roll no.">
                                <input type="text" value={entry.studentInfo?.rollNumber ?? ""} onChange={(e) => patchGroup("studentInfo", { rollNumber: e.target.value })} placeholder="F2023-1234" className={fieldClass} />
                            </Field>
                            <Field label="Course name">
                                <input type="text" value={entry.course ?? ""} onChange={(e) => setEntry((s) => ({ ...s, course: e.target.value }))} placeholder="e.g. Marketing Management" className={fieldClass} />
                            </Field>
                            <Field label="Course code (if any)">
                                <input type="text" value={entry.studentInfo?.courseCode ?? ""} onChange={(e) => patchGroup("studentInfo", { courseCode: e.target.value })} placeholder="MKT-301" className={fieldClass} />
                            </Field>
                            <Field label="School / department">
                                <input type="text" list="cw-depts" value={entry.studentInfo?.department ?? ""} onChange={(e) => patchGroup("studentInfo", { department: e.target.value })} placeholder="e.g. School of Business" className={fieldClass} />
                                <datalist id="cw-depts">
                                    {DEPARTMENT_OPTIONS.map((d) => <option key={d} value={d} />)}
                                </datalist>
                            </Field>
                            <Field label="Programme">
                                <input type="text" value={entry.studentInfo?.programme ?? ""} onChange={(e) => patchGroup("studentInfo", { programme: e.target.value })} placeholder="e.g. BBA" className={fieldClass} />
                            </Field>
                            <Field label="University">
                                <SearchableSelect value={entry.studentInfo?.universityName ?? ""} onChange={(v) => patchGroup("studentInfo", { universityName: v })} options={pakistaniUniversities} placeholder="Type your university" />
                            </Field>
                            <Field label="Discipline">
                                <SearchableSelect value={entry.studentInfo?.disciplineName ?? ""} onChange={(v) => patchGroup("studentInfo", { disciplineName: v })} options={hecPrograms} placeholder="Type your discipline" />
                            </Field>
                            <Field label="Semester">
                                <input type="text" list="cw-semesters" value={entry.studentInfo?.semester ?? ""} onChange={(e) => patchGroup("studentInfo", { semester: e.target.value })} placeholder="e.g. Semester 5" className={fieldClass} />
                                <datalist id="cw-semesters">
                                    {SEMESTER_OPTIONS.map((s) => <option key={s} value={s} />)}
                                </datalist>
                            </Field>
                            <Field label="Instructor">
                                <input type="text" value={entry.studentInfo?.teacherName ?? ""} onChange={(e) => patchGroup("studentInfo", { teacherName: e.target.value })} placeholder="Prof. Bilal Ahmed" className={fieldClass} />
                            </Field>
                            <Field label="Instructor's email">
                                <input type="email" value={entry.studentInfo?.teacherEmail ?? ""} onChange={(e) => patchGroup("studentInfo", { teacherEmail: e.target.value })} placeholder="name@uni.edu.pk" className={fieldClass} />
                            </Field>
                            <Field label="How was this coursework completed?">
                                <ChipSingle options={TEAM_MODE_OPTIONS} value={teamMode} onChange={(v) => patchGroup("studentInfo", { teamMode: v })} />
                            </Field>
                            {isTeam && (
                                <Field label="👥 Team members — name everyone">
                                    <div className="space-y-2">
                                        {(entry.studentInfo?.groupMembers ?? [""]).map((m, i) => (
                                            <input
                                                key={i}
                                                type="text"
                                                value={m}
                                                onChange={(e) => {
                                                    const next = [...(entry.studentInfo?.groupMembers ?? [""])];
                                                    next[i] = e.target.value;
                                                    patchGroup("studentInfo", { groupMembers: next });
                                                }}
                                                placeholder={`Member ${i + 1} — full name`}
                                                className={fieldClass}
                                            />
                                        ))}
                                        {(entry.studentInfo?.groupMembers?.length ?? 0) < 20 && (
                                            <button
                                                type="button"
                                                onClick={() => patchGroup("studentInfo", { groupMembers: [...(entry.studentInfo?.groupMembers ?? [""]), ""] })}
                                                className="text-xs font-bold text-ciel-green-deep hover:underline"
                                            >
                                                + Add another member
                                            </button>
                                        )}
                                    </div>
                                </Field>
                            )}
                            <Field label="What type of coursework was this?">
                                <ChipSingle options={COURSEWORK_TYPE_OPTIONS} value={entry.studentInfo?.courseworkType} onChange={(v) => patchGroup("studentInfo", { courseworkType: v })} />
                                {entry.studentInfo?.courseworkType === "Other" && (
                                    <input type="text" value={entry.studentInfo?.courseworkTypeOther ?? ""} onChange={(e) => patchGroup("studentInfo", { courseworkTypeOther: e.target.value })} placeholder="Describe the type" className={clsx(fieldClass, "mt-2")} />
                                )}
                            </Field>
                            <Field label="➕ Anything else about you or the course?">
                                <textarea rows={2} value={entry.studentInfo?.notes ?? ""} onChange={(e) => patchGroup("studentInfo", { notes: e.target.value })} placeholder="Anything you'd like on the record…" className={fieldClass} />
                            </Field>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <Field label="Title of your coursework">
                                <input type="text" value={entry.projectTitle ?? ""} onChange={(e) => setEntry((s) => ({ ...s, projectTitle: e.target.value }))} placeholder="e.g. Zero-Waste Plan for a Plastic-Free Cafeteria" className={fieldClass} />
                            </Field>
                            <Field label="What format did the work take?" hint="Tap all that apply — first pick leads.">
                                <ChipGroup
                                    options={FORMAT_OPTIONS}
                                    selected={entry.assignmentInfo?.formats ?? (entry.assignmentInfo?.format ? [entry.assignmentInfo.format] : [])}
                                    onToggle={toggleFormat}
                                    otherValue={entry.assignmentInfo?.formatOther}
                                    onOtherChange={(v) => patchGroup("assignmentInfo", { formatOther: v })}
                                    otherPlaceholder="Describe your format"
                                />
                            </Field>
                            {formatMeta && (
                                <div className="rounded-ciel-sm border-2 border-ciel-green/30 bg-ciel-green-soft/50 px-4 py-3 text-xs font-semibold leading-relaxed text-ciel-green-deep">
                                    🧬 <b>{primaryFormat}</b> detected — we&apos;ll walk you through: <b>{formatMeta.note}</b> Adjust the tiles below if your work differs.
                                </div>
                            )}
                            <Field label="Which sections apply to your work?" hint="Pre-set from your format — tap to adjust.">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {INC_TILES.map((t) => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setEntry((e) => ({ ...e, moduleInclusion: { ...e.moduleInclusion, [t.key]: !e.moduleInclusion?.[t.key] } }))}
                                            className={clsx(
                                                "ciel-transition flex items-center gap-2 rounded-ciel-sm border-2 px-3 py-2.5 text-xs font-bold",
                                                inc[t.key] ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid",
                                            )}
                                        >
                                            <span>{t.emoji}</span> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <Field label="What were you asked to do? (one line)">
                                <input type="text" value={entry.assignmentInfo?.whatAsked ?? ""} onChange={(e) => patchGroup("assignmentInfo", { whatAsked: e.target.value })} placeholder="e.g. Design a low-waste packaging solution for a local food business" className={fieldClass} />
                            </Field>
                            <Field label="What issue, question, need or opportunity did it address? (one line)">
                                <input type="text" value={entry.assignmentInfo?.realWorldIssue ?? ""} onChange={(e) => patchGroup("assignmentInfo", { realWorldIssue: e.target.value })} placeholder="e.g. How can takeaway packaging be redesigned to reduce material waste?" className={fieldClass} />
                            </Field>
                            <Field label="➕ Anything else about the coursework?">
                                <textarea rows={2} value={entry.assignmentInfo?.notes ?? ""} onChange={(e) => patchGroup("assignmentInfo", { notes: e.target.value })} placeholder="Anything we didn't ask…" className={fieldClass} />
                            </Field>
                        </>
                    )}

                    {step === 2 && (
                        inc.aim ? (
                            <>
                                <Field label="The overall aim (one line)">
                                    <input type="text" value={entry.aimsInfo?.aimStatement ?? ""} onChange={(e) => patchGroup("aimsInfo", { aimStatement: e.target.value })} placeholder="e.g. Develop a practical strategy to reduce cafeteria waste" className={fieldClass} />
                                </Field>
                                <Field label="Objectives">
                                    <div className="space-y-2">
                                        {(entry.aimsInfo?.objectives ?? [""]).map((o, i) => (
                                            <input
                                                key={i}
                                                type="text"
                                                value={o}
                                                onChange={(e) => {
                                                    const next = [...(entry.aimsInfo?.objectives ?? [""])];
                                                    next[i] = e.target.value;
                                                    patchGroup("aimsInfo", { objectives: next });
                                                }}
                                                placeholder={i === 0 ? "e.g. Identify major sources of waste" : "Start with a verb…"}
                                                className={fieldClass}
                                            />
                                        ))}
                                        {(entry.aimsInfo?.objectives?.length ?? 0) < 8 && (
                                            <button type="button" onClick={() => patchGroup("aimsInfo", { objectives: [...(entry.aimsInfo?.objectives ?? [""]), ""] })} className="text-xs font-bold text-ciel-green-deep hover:underline">
                                                + Add another objective
                                            </button>
                                        )}
                                    </div>
                                </Field>
                                <Field label="Who or what was it intended to benefit, influence or improve?" hint="Tap all that apply.">
                                    <ChipGroup
                                        options={BENEFICIARY_OPTIONS}
                                        selected={entry.aimsInfo?.beneficiaries ?? []}
                                        onToggle={(v) => {
                                            const cur = entry.aimsInfo?.beneficiaries ?? [];
                                            patchGroup("aimsInfo", { beneficiaries: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                        }}
                                        otherValue={entry.aimsInfo?.beneficiariesOther}
                                        onOtherChange={(v) => patchGroup("aimsInfo", { beneficiariesOther: v })}
                                        otherPlaceholder="Who else?"
                                    />
                                </Field>
                                <Field label="➕ Anything else here?">
                                    <textarea rows={2} value={entry.aimsInfo?.notes ?? ""} onChange={(e) => patchGroup("aimsInfo", { notes: e.target.value })} placeholder="Anything we didn't ask…" className={fieldClass} />
                                </Field>
                            </>
                        ) : (
                            <p className="rounded-ciel-sm bg-ciel-page px-4 py-6 text-center text-sm font-semibold text-ciel-text-soft">
                                Not applicable for this format — go back to step 2 to turn it on if that&apos;s wrong.
                            </p>
                        )
                    )}

                    {step === 3 && (
                        (inc.act || inc.meth) ? (
                            <>
                                {inc.act && (
                                    <Field label="Activities conducted" hint="Tap all that apply.">
                                        <ChipGroup
                                            options={ACTIVITY_OPTIONS}
                                            selected={entry.processInfo?.activities ?? []}
                                            onToggle={(v) => {
                                                const cur = entry.processInfo?.activities ?? [];
                                                patchGroup("processInfo", { activities: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                            }}
                                            otherValue={entry.processInfo?.activitiesOther}
                                            onOtherChange={(v) => patchGroup("processInfo", { activitiesOther: v })}
                                            otherPlaceholder="What else did you do?"
                                        />
                                    </Field>
                                )}
                                {inc.meth && (
                                    <>
                                        <Field label="🔬 Research / method used" hint="Tap all that apply — “Not applicable” is a valid answer.">
                                            <ChipGroup
                                                options={METHOD_OPTIONS}
                                                selected={entry.processInfo?.methods ?? []}
                                                onToggle={(v) => {
                                                    const cur = entry.processInfo?.methods ?? [];
                                                    patchGroup("processInfo", { methods: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                                }}
                                                otherValue={entry.processInfo?.methodsOther}
                                                onOtherChange={(v) => patchGroup("processInfo", { methodsOther: v })}
                                                otherPlaceholder="Your method"
                                            />
                                        </Field>
                                        <Field label="Sample / data scale">
                                            <input type="text" value={entry.processInfo?.sampleScale ?? ""} onChange={(e) => patchGroup("processInfo", { sampleScale: e.target.value })} placeholder="e.g. 120 responses · 3 site visits · 40 samples" className={fieldClass} />
                                        </Field>
                                    </>
                                )}
                                <Field label="Who did you engage or work with?" hint="Optional — tap all that apply.">
                                    <ChipGroup
                                        options={STAKEHOLDER_OPTIONS}
                                        selected={entry.processInfo?.stakeholders ?? []}
                                        onToggle={(v) => {
                                            const cur = entry.processInfo?.stakeholders ?? [];
                                            patchGroup("processInfo", { stakeholders: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                        }}
                                        otherValue={entry.processInfo?.stakeholdersOther}
                                        onOtherChange={(v) => patchGroup("processInfo", { stakeholdersOther: v })}
                                        otherPlaceholder="Who else?"
                                    />
                                </Field>
                                <Field label="➕ Anything else about the process?">
                                    <textarea rows={2} value={entry.processInfo?.notes ?? ""} onChange={(e) => patchGroup("processInfo", { notes: e.target.value })} placeholder="Anything we didn't ask…" className={fieldClass} />
                                </Field>
                            </>
                        ) : (
                            <p className="rounded-ciel-sm bg-ciel-page px-4 py-6 text-center text-sm font-semibold text-ciel-text-soft">
                                Not applicable for this format — go back to step 2 to turn it on if that&apos;s wrong.
                            </p>
                        )
                    )}

                    {step === 4 && (
                        <>
                            <Field label="Output — what did you produce?" hint="Tap all that apply.">
                                <ChipGroup
                                    options={OUTPUT_OPTIONS}
                                    selected={entry.resultsInfo?.outputs ?? []}
                                    onToggle={(v) => {
                                        const cur = entry.resultsInfo?.outputs ?? [];
                                        patchGroup("resultsInfo", { outputs: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                    }}
                                    otherValue={entry.resultsInfo?.outputsOther}
                                    onOtherChange={(v) => patchGroup("resultsInfo", { outputsOther: v })}
                                    otherPlaceholder="What else?"
                                />
                            </Field>
                            <Field label="Describe the main output (one line)">
                                <input type="text" value={entry.resultsInfo?.outputDescription ?? ""} onChange={(e) => patchGroup("resultsInfo", { outputDescription: e.target.value })} placeholder="e.g. A zero-waste cafeteria strategy with implementation recommendations" className={fieldClass} />
                            </Field>
                            {inc.find && (
                                <Field label="📈 Key findings / conclusions / insights" hint="What did it reveal, demonstrate, propose or conclude?">
                                    <div className="space-y-2">
                                        {(entry.resultsInfo?.findings ?? [""]).map((f, i) => (
                                            <input
                                                key={i}
                                                type="text"
                                                value={f}
                                                onChange={(e) => {
                                                    const next = [...(entry.resultsInfo?.findings ?? [""])];
                                                    next[i] = e.target.value;
                                                    patchGroup("resultsInfo", { findings: next });
                                                }}
                                                placeholder={i === 0 ? "e.g. Reusable alternatives could substantially cut single-use plastics" : "Another…"}
                                                className={fieldClass}
                                            />
                                        ))}
                                        {(entry.resultsInfo?.findings?.length ?? 0) < 5 && (
                                            <button type="button" onClick={() => patchGroup("resultsInfo", { findings: [...(entry.resultsInfo?.findings ?? [""]), ""] })} className="text-xs font-bold text-ciel-green-deep hover:underline">
                                                + Add another finding
                                            </button>
                                        )}
                                    </div>
                                </Field>
                            )}
                            {inc.imp && (
                                <>
                                    <Field label="What evidence of result or outcome did the work produce?" hint="Choose one — honesty scores higher.">
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {EVIDENCE_STATUS.map((ev) => (
                                                <button
                                                    key={ev.label}
                                                    type="button"
                                                    onClick={() => patchGroup("resultsInfo", { evidenceStatus: ev.label })}
                                                    className={clsx(
                                                        "ciel-transition flex flex-col items-center gap-1 rounded-ciel-sm border-2 px-3 py-3 text-center",
                                                        entry.resultsInfo?.evidenceStatus === ev.label ? "border-ciel-green bg-ciel-green-soft" : "border-ciel-border",
                                                    )}
                                                >
                                                    <span className="text-lg">{ev.emoji}</span>
                                                    <span className="text-[10px] font-bold leading-tight text-ciel-text-mid">{ev.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    {showMetricFields && (
                                        <div className="space-y-3 rounded-ciel-sm border border-ciel-border bg-ciel-page/40 p-4">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                <Field label="Metric">
                                                    <input type="text" value={entry.resultsInfo?.metricName ?? ""} onChange={(e) => patchGroup("resultsInfo", { metricName: e.target.value })} placeholder="e.g. Plastic waste reduction" className={fieldClass} />
                                                </Field>
                                                <Field label="Value">
                                                    <input type="text" inputMode="decimal" value={entry.resultsInfo?.metricValue ?? ""} onChange={(e) => patchGroup("resultsInfo", { metricValue: e.target.value })} placeholder="22" className={fieldClass} />
                                                </Field>
                                                <Field label="Unit">
                                                    <input type="text" value={entry.resultsInfo?.metricUnit ?? ""} onChange={(e) => patchGroup("resultsInfo", { metricUnit: e.target.value })} placeholder="%" className={fieldClass} />
                                                </Field>
                                            </div>
                                            <Field label="This number represents…">
                                                <ChipSingle options={NUMBER_REPRESENTS_OPTIONS} value={entry.resultsInfo?.numberRepresents} onChange={(v) => patchGroup("resultsInfo", { numberRepresents: v })} />
                                            </Field>
                                        </div>
                                    )}
                                    <Field label="📏 Measurable impact — put a number on it (optional)">
                                        <input type="text" value={entry.resultsInfo?.measurableImpact ?? ""} onChange={(e) => patchGroup("resultsInfo", { measurableImpact: e.target.value })} placeholder="e.g. pilot week cut plastic waste 22% (weighed daily)" className={fieldClass} />
                                    </Field>
                                </>
                            )}
                            {inc.lim && (
                                <>
                                    <Field label="⚠️ Main limitation">
                                        <input type="text" value={entry.resultsInfo?.limitationType ?? ""} onChange={(e) => patchGroup("resultsInfo", { limitationType: e.target.value })} placeholder="e.g. Limited pilot period — results cover 3 weeks, not a full term" className={fieldClass} />
                                    </Field>
                                    <Field label="One line on how it affected the work">
                                        <input type="text" value={entry.resultsInfo?.limitationDetail ?? ""} onChange={(e) => patchGroup("resultsInfo", { limitationDetail: e.target.value })} placeholder="e.g. costing based on one supplier's quote" className={fieldClass} />
                                    </Field>
                                </>
                            )}
                            <Field label="➕ Anything else about the results?">
                                <textarea rows={2} value={entry.resultsInfo?.notes ?? ""} onChange={(e) => patchGroup("resultsInfo", { notes: e.target.value })} placeholder="Anything we didn't ask…" className={fieldClass} />
                            </Field>
                        </>
                    )}

                    {step === 5 && <SdgStep entry={entry} patchGroup={patchGroup} />}

                    {step === 6 && (
                        <>
                            <Field label="What did this work teach you?">
                                <textarea rows={2} value={entry.reflectionInfo?.lessonLearned ?? ""} onChange={(e) => patchGroup("reflectionInfo", { lessonLearned: e.target.value })} placeholder="Reflect on what you learned about the issue, your discipline, or the way you approached the work…" className={fieldClass} />
                            </Field>
                            <Field label="How strongly was sustainability connected to the actual work?">
                                <ChipSingle options={INTEGRATION_OPTIONS} value={entry.reflectionInfo?.integrationLevel} onChange={(v) => patchGroup("reflectionInfo", { integrationLevel: v })} />
                            </Field>
                            <Field label="Skills you developed" hint="Tap all that apply.">
                                <ChipGroup
                                    options={SKILL_OPTIONS}
                                    selected={entry.reflectionInfo?.skills ?? []}
                                    onToggle={(v) => {
                                        const cur = entry.reflectionInfo?.skills ?? [];
                                        patchGroup("reflectionInfo", { skills: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
                                    }}
                                    otherValue={entry.reflectionInfo?.skillsOther}
                                    onOtherChange={(v) => patchGroup("reflectionInfo", { skillsOther: v })}
                                    otherPlaceholder="What else?"
                                />
                            </Field>
                            <Field label="What could happen next with this work?" hint="“Completed as coursework” is a complete answer.">
                                <ChipSingle options={NEXT_STEP_OPTIONS} value={entry.reflectionInfo?.nextSteps} onChange={(v) => patchGroup("reflectionInfo", { nextSteps: v })} />
                                <input type="text" value={entry.reflectionInfo?.whatsNext ?? ""} onChange={(e) => patchGroup("reflectionInfo", { whatsNext: e.target.value })} placeholder="Optional — one line on what's next" className={clsx(fieldClass, "mt-2")} />
                            </Field>
                            <Field label="One line you'd tell next semester's class">
                                <input type="text" value={entry.reflectionInfo?.adviceNextSemester ?? ""} onChange={(e) => patchGroup("reflectionInfo", { adviceNextSemester: e.target.value })} placeholder="e.g. Talk to the cafeteria staff in week one — they know where the waste is" className={fieldClass} />
                            </Field>
                            <Field label="➕ Anything else you'd like to reflect on?">
                                <textarea rows={2} value={entry.reflectionInfo?.notes ?? ""} onChange={(e) => patchGroup("reflectionInfo", { notes: e.target.value })} placeholder="Anything we didn't ask…" className={fieldClass} />
                            </Field>
                        </>
                    )}

                    {step === 7 && (
                        <div className="space-y-5">
                            <Field label="Evidence (screenshots, deliverables, photos)">
                                <label className={clsx("ciel-transition flex cursor-pointer items-center gap-3 rounded-ciel-sm border-2 border-dashed border-ciel-border px-4 py-3 text-sm font-semibold text-ciel-text-mid hover:border-ciel-green/40", uploading && "opacity-60")}>
                                    <UploadCloud className="h-4 w-4" />
                                    {uploading ? "Uploading..." : "Upload evidence (screenshots, deliverables, photos)"}
                                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleEvidenceFile(e.target.files[0])} />
                                </label>
                                {!!entry.evidenceUrls?.length && (
                                    <ul className="mt-2 space-y-1.5">
                                        {entry.evidenceUrls.map((url) => (
                                            <li key={url} className="flex items-center justify-between gap-2 rounded-ciel-xs bg-ciel-page px-3 py-2 text-xs font-semibold text-ciel-text-mid">
                                                <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">{url.split("/").pop()}</a>
                                                <button type="button" onClick={() => removeEvidence(url)} aria-label="Remove" className="text-ciel-text-soft hover:text-red-600">
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Field>

                            <Field label="➕ Anything the AI missed?">
                                <textarea rows={2} value={entry.addedNote ?? ""} onChange={(e) => setEntry((s) => ({ ...s, addedNote: e.target.value }))} placeholder="e.g. Our essay was selected for the department journal." className={fieldClass} />
                            </Field>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-black text-ciel-text">✨ Review your baseline summary</h3>
                                    <button type="button" onClick={regenerateAllReview} className="ciel-transition shrink-0 rounded-ciel-xs border border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-green/40">
                                        ↻ Regenerate all
                                    </button>
                                </div>
                                <p className="text-xs text-ciel-text-soft">Only the sections your format used appear below. Accept each, edit inline, or reset. Your teacher sees only what you approve.</p>

                                <div className="flex items-center gap-3">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ciel-border">
                                        <div className="h-full rounded-full bg-ciel-green transition-all" style={{ width: `${(acceptedCount / Math.max(1, activeStepIdx.length)) * 100}%` }} />
                                    </div>
                                    <span className="shrink-0 text-xs font-bold text-ciel-text-soft">{acceptedCount} of {activeStepIdx.length} accepted</span>
                                </div>

                                {activeStepIdx.map((key) => {
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
                                                className="w-full resize-none bg-white p-4 text-sm leading-relaxed text-ciel-text outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                                            />
                                            <div className="flex gap-2 border-t border-ciel-border bg-white px-4 py-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setReview((prev) => ({ ...prev, [key]: { ...r, accepted: true } }))}
                                                    className={clsx(
                                                        "ciel-transition rounded-ciel-xs border-2 px-3 py-1.5 text-xs font-bold",
                                                        r.accepted ? "border-ciel-green bg-ciel-green text-white" : "border-ciel-green text-ciel-green-deep hover:bg-ciel-green-soft",
                                                    )}
                                                >
                                                    {r.accepted ? "✓ Accepted" : "✓ Accept"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReview((prev) => ({ ...prev, [key]: { accepted: false, edited: false, text: sums[key] || "" } }))}
                                                    className="ciel-transition rounded-ciel-xs border-2 border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-green/40"
                                                >
                                                    ↻ Reset to AI version
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!allAccepted && <p className="text-xs font-semibold text-ciel-text-soft">Accept every section above to unlock submission.</p>}
                            </div>
                        </div>
                    )}
                </div>

                {error && <p className="mt-4 text-xs font-semibold text-red-600">{error}</p>}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={step === 0}
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        className="ciel-transition rounded-ciel-sm border border-ciel-border px-4 py-2.5 text-sm font-bold text-ciel-text-mid hover:border-ciel-green/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                    >
                        Back
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                        {step < 7 ? (
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => save(saveAllFields(), step + 1)}
                                className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                            >
                                {saving ? "Saving..." : "Save & continue"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={saving || !allAccepted}
                                title={allAccepted ? undefined : "Accept every section above first"}
                                onClick={async () => {
                                    await save({ ...saveAllFields(), status: "submitted", sectionSummaries: finalSectionSummaries() }, 8);
                                    router.push("/dashboard/student/paths/course-project");
                                }}
                                className="ciel-transition rounded-ciel-sm bg-ciel-green-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-green-deep/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                            >
                                {saving ? "Submitting..." : "Submit project"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            )}
        </PathWorkspaceShell>
    );
}

// ---------------------------------------------------------------------------
// Step 6 — SDG mapping (up to 3 goals, first = primary, rest = supporting)
// ---------------------------------------------------------------------------

function SdgStep({
    entry,
    patchGroup,
}: {
    entry: CourseProjectEntry;
    patchGroup: <K extends keyof CourseProjectEntry>(key: K, patch: Partial<NonNullable<CourseProjectEntry[K]>>) => void;
}) {
    const picked = entry.sdgMapping?.entries ?? [];

    const toggleGoal = (num: number) => {
        const exists = picked.some((p) => p.goalNumber === num);
        if (exists) {
            patchGroup("sdgMapping", { entries: picked.filter((p) => p.goalNumber !== num) });
        } else {
            if (picked.length >= 3) return;
            patchGroup("sdgMapping", { entries: [...picked, { goalNumber: num, targets: [], strength: picked.length ? "Supporting" : "Direct" }] });
        }
    };
    const makePrimary = (num: number) => {
        const idx = picked.findIndex((p) => p.goalNumber === num);
        if (idx <= 0) return;
        const next = [...picked];
        const [item] = next.splice(idx, 1);
        next.unshift({ ...item, strength: "Direct" });
        patchGroup("sdgMapping", { entries: next });
    };
    const toggleTarget = (num: number, targetId: string) => {
        const next = picked.map((p) => {
            if (p.goalNumber !== num) return p;
            const has = p.targets.includes(targetId);
            return { ...p, targets: has ? p.targets.filter((t) => t !== targetId) : [...p.targets, targetId] };
        });
        patchGroup("sdgMapping", { entries: next });
    };
    const setHow = (num: number, how: string) => {
        patchGroup("sdgMapping", { entries: picked.map((p) => (p.goalNumber === num ? { ...p, how } : p)) });
    };
    const setStrength = (num: number, strength: string) => {
        patchGroup("sdgMapping", { entries: picked.map((p) => (p.goalNumber === num ? { ...p, strength } : p)) });
    };

    return (
        <>
            <Field label="How did sustainability become part of this coursework?">
                <ChipSingle options={ORIGIN_OPTIONS} value={entry.sdgMapping?.origin} onChange={(v) => patchGroup("sdgMapping", { origin: v })} />
            </Field>

            <Field label="Which SDGs does this work support?" hint="Pick up to 3 — first tapped becomes ★ primary; use “make primary” on a block to change.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {sdgData.map((sdg) => {
                        const isSel = picked.some((p) => p.goalNumber === sdg.number);
                        const isPrimary = picked[0]?.goalNumber === sdg.number;
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
                                {isPrimary ? (
                                    <span className="absolute -right-1 -top-2 flex items-center gap-0.5 rounded-full bg-ciel-navy px-1.5 py-0.5 text-[7px] font-black text-amber-300">
                                        <Star className="h-2 w-2 fill-current" /> PRIMARY
                                    </span>
                                ) : isSel ? (
                                    <CheckCircle2 className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />
                                ) : null}
                                <span className="text-base font-extrabold">{sdg.number}</span>
                                {sdg.title}
                            </button>
                        );
                    })}
                </div>
            </Field>

            {picked.length > 0 && (
                <div className="space-y-3">
                    {picked.map((p, i) => {
                        const sdg = sdgData.find((s) => s.number === p.goalNumber);
                        if (!sdg) return null;
                        return (
                            <div key={p.goalNumber} className="overflow-hidden rounded-ciel-sm border-2 border-ciel-border">
                                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: sdg.color }}>
                                    <span>SDG {sdg.number} · {sdg.title} · {i === 0 ? "★ PRIMARY" : "SUPPORTING"}</span>
                                    <div className="flex items-center gap-2">
                                        {i > 0 && (
                                            <button type="button" onClick={() => makePrimary(sdg.number)} className="rounded-full bg-white/20 px-2 py-1 text-[10px] font-black">
                                                ☆ make primary
                                            </button>
                                        )}
                                        <button type="button" onClick={() => toggleGoal(sdg.number)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs">✕</button>
                                    </div>
                                </div>
                                <div className="space-y-3 bg-white p-4">
                                    <div>
                                        <p className={labelClass}>Which target fits your work? (pick one or more)</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {sdg.targets.map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => toggleTarget(p.goalNumber, t.id)}
                                                    className={clsx(
                                                        "ciel-transition rounded-full border-2 px-3 py-1.5 text-left text-[11px] font-bold",
                                                        p.targets.includes(t.id) ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40",
                                                    )}
                                                    title={t.description}
                                                >
                                                    {t.id} · {t.description}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className={labelClass}>How strong is the connection?</p>
                                        <div className="mt-2 flex gap-2">
                                            {["Direct", "Supporting"].map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setStrength(p.goalNumber, s)}
                                                    className={clsx(
                                                        "ciel-transition rounded-full border-2 px-3.5 py-1.5 text-xs font-bold",
                                                        (p.strength || (i === 0 ? "Direct" : "Supporting")) === s ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40",
                                                    )}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={p.how ?? ""}
                                        onChange={(e) => setHow(p.goalNumber, e.target.value)}
                                        placeholder="One line: how does your work support this goal?"
                                        className={fieldClass}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Field label="➕ Anything else about the SDG link?">
                <textarea rows={2} value={entry.sdgMapping?.notes ?? ""} onChange={(e) => patchGroup("sdgMapping", { notes: e.target.value })} placeholder="Anything we didn't ask…" className={fieldClass} />
            </Field>
        </>
    );
}
