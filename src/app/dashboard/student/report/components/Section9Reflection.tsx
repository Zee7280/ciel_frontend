import React, { useMemo, useEffect, useRef, useState } from "react";
import {
    GraduationCap, BrainCircuit, Star, Info, TrendingUp,
    Users2, ChevronDown, Compass,
} from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import { reportTextWordMeter } from "../utils/validation";

// ─── Static configuration ───────────────────────────────────────────────────
const integrationOptions = [
    { id: "Voluntary extracurricular activity", label: "🙋 Voluntary / extracurricular" },
    { id: "Course-linked assignment", label: "📖 Part of a course" },
    { id: "Credit-bearing component", label: "🎓 For credit" },
    { id: "Capstone / Thesis-linked project", label: "📑 Capstone / thesis" },
    { id: "Research-integrated project", label: "🔬 Research project" },
];

const SKILL_OPTIONS = [
    "🗣️ Communication",
    "🤝 Teamwork",
    "📋 Planning",
    "🧩 Problem-solving",
    "📊 Working with data",
    "🎤 Leadership",
    "💗 Empathy",
    "⏰ Time management",
];

function stripEmoji(s: string): string {
    return (s || "").replace(/^[^\s]+\s/, "");
}
function lowerFirst(text: string): string {
    const t = (text || "").trim();
    return t ? t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/, "") : "";
}
function joinList(items: string[]): string {
    if (items.length < 2) return items.join("");
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const ratingGuide = [
    { val: "1", meaning: "Low", context: "No meaningful engagement — little to no involvement in this area" },
    { val: "2", meaning: "Basic", context: "Initial exposure — limited opportunity to apply independently" },
    { val: "3", meaning: "Moderate", context: "Developing capability — applied with some guidance" },
    { val: "4", meaning: "Strong", context: "Independent application — effective use in real situations" },
    { val: "5", meaning: "Advanced", context: "High proficiency — initiative or leadership demonstrated" },
];

const competencies = [
    {
        id: "cognitive",
        icon: Compass,
        label: "Cognitive competencies",
        items: [
            { key: "cognitive_systemic", label: "Understanding interconnected issues", description: "You can confidently connect theory to real-life problems." },
            { key: "cognitive_critical", label: "Critical and ethical reasoning", description: "You are developing judgment but can improve independent decision-making." },
            { key: "cognitive_evaluate", label: "Ability to evaluate impact", description: "You can evaluate effectiveness, not just participation." },
        ],
    },
    {
        id: "practical",
        icon: Star,
        label: "Practical competencies",
        items: [
            { key: "practical_design", label: "Project design & implementation", description: "You can turn ideas into action." },
            { key: "practical_evidence", label: "Evidence-based reporting", description: "You worked at a professional, audit-ready level." },
            { key: "practical_engagement", label: "Community engagement", description: "You showed strong field presence and interpersonal impact." },
        ],
    },
    {
        id: "social",
        icon: Users2,
        label: "Social & civic competencies",
        items: [
            { key: "social_empathy", label: "Responsibility & empathy", description: "You went beyond task completion and connected on a human level." },
            { key: "social_diversity", label: "Awareness of diversity & inclusion", description: "You respected and adapted to diverse community needs." },
            { key: "social_collaboration", label: "Collaborative problem-solving", description: "You demonstrated leadership and teamwork." },
        ],
    },
    {
        id: "transformative",
        icon: TrendingUp,
        label: "Transformative competencies",
        items: [
            { key: "transformative_longterm", label: "Long-term thinking", description: "You are beginning to think beyond short-term results." },
            { key: "transformative_benefits", label: "Understanding benefits & downsides", description: "You think in a balanced and realistic way." },
            { key: "transformative_sustainability", label: "Sustainability-oriented decision making", description: "You are developing a sustainability mindset." },
        ],
    },
];

const textareaClasses =
    "min-h-[140px] w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

const badgeMandatory =
    "ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700";
const badgeRequired =
    "ml-auto shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600";
const badgeOptional =
    "ml-auto shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500";

function StepHeader({
    n,
    title,
    status,
}: {
    n: string;
    title: string;
    status?: "mandatory" | "required" | "optional";
}) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                {n}
            </span>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {status === "mandatory" ? (
                <span className={badgeMandatory}>Mandatory</span>
            ) : status === "required" ? (
                <span className={badgeRequired}>Required</span>
            ) : status === "optional" ? (
                <span className={badgeOptional}>Optional</span>
            ) : null}
        </div>
    );
}

function WordCount({ count }: { count: number }) {
    const meter = reportTextWordMeter(count);
    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-48">
                <div
                    className={clsx("h-full rounded-full transition-all", meter.barClass)}
                    style={{ width: `${meter.widthPct}%` }}
                />
            </div>
            <p className={clsx("text-[11px] tabular-nums", meter.textClass)}>
                {count} / 200 words (min 20)
            </p>
        </div>
    );
}

export default function Section9Reflection() {
    const { data, updateSection, getFieldError } = useReportForm();
    const { section9, section2 } = data;
    const {
        academic_integration,
        personal_learning,
        academic_application,
        competency_scores,
        skills_grown = [],
        reflection_biggest_learning = "",
        reflection_moment = "",
        reflection_discipline_help = "",
    } = section9;

    const [showRatingGuide, setShowRatingGuide] = useState(false);

    const update = (field: string, val: unknown) => updateSection("section9", { [field]: val });
    const updateScore = (key: string, val: number) =>
        update("competency_scores", { ...competency_scores, [key]: val });

    /** Tracks the last text WE composed into each field, so a student's hand-edit is never silently overwritten. */
    const lastAutoPersonalRef = useRef("");
    const lastAutoAppRef = useRef("");

    const composeAndUpdate = (fieldPatch: Record<string, unknown>) => {
        const skills = (fieldPatch.skills_grown as string[] | undefined) ?? skills_grown;
        const biggest = (fieldPatch.reflection_biggest_learning as string | undefined) ?? reflection_biggest_learning;
        const moment = (fieldPatch.reflection_moment as string | undefined) ?? reflection_moment;
        const disciplineHelp = (fieldPatch.reflection_discipline_help as string | undefined) ?? reflection_discipline_help;

        const personalParts: string[] = [];
        if (skills.length) personalParts.push(`Through this project I grew my ${joinList(skills.map((s) => stripEmoji(s).toLowerCase()))}.`);
        if (biggest) personalParts.push(`The biggest thing I learned was ${lowerFirst(biggest)}.`);
        if (moment) personalParts.push(`A moment that changed how I see things was ${lowerFirst(moment)}.`);
        const composedPersonal = personalParts.join(" ");
        const composedApplication = disciplineHelp ? `My field of study helped because ${lowerFirst(disciplineHelp)}.` : "";

        const patch: Record<string, unknown> = { ...fieldPatch };
        const personalStillAuto = !personal_learning || personal_learning === lastAutoPersonalRef.current;
        if (personalStillAuto && composedPersonal) {
            lastAutoPersonalRef.current = composedPersonal;
            patch.personal_learning = composedPersonal;
        }
        const appStillAuto = !academic_application || academic_application === lastAutoAppRef.current;
        if (appStillAuto && composedApplication) {
            lastAutoAppRef.current = composedApplication;
            patch.academic_application = composedApplication;
        }
        updateSection("section9", patch);
    };

    const toggleSkill = (skill: string) => {
        const next = skills_grown.includes(skill) ? skills_grown.filter((s) => s !== skill) : [...skills_grown, skill];
        composeAndUpdate({ skills_grown: next });
    };

    /** Combined preview only — the real, validated text lives in personal_learning / academic_application below. */
    const reflectionPreview = useMemo(() => {
        const parts: string[] = [];
        if (skills_grown.length) parts.push(`Through this project I grew my ${joinList(skills_grown.map((s) => stripEmoji(s).toLowerCase()))}.`);
        if (reflection_biggest_learning) parts.push(`The biggest thing I learned was ${lowerFirst(reflection_biggest_learning)}.`);
        if (reflection_moment) parts.push(`A moment that changed how I see things was ${lowerFirst(reflection_moment)}.`);
        if (reflection_discipline_help) parts.push(`My field of study helped because ${lowerFirst(reflection_discipline_help)}.`);
        return parts.join(" ");
    }, [skills_grown, reflection_biggest_learning, reflection_moment, reflection_discipline_help]);

    const getWordCount = (text: string) =>
        (text || "").trim().split(/\s+/).filter((w) => w.length > 0).length;
    const plWords = getWordCount(personal_learning);
    const aaWords = getWordCount(academic_application);

    const avgScore = useMemo(() => {
        const values = Object.values(competency_scores || {}).map(Number);
        if (!values.length) return 0;
        return values.reduce((a, b) => a + b, 0) / 12;
    }, [competency_scores]);

    const autoNarrative = useMemo(() => {
        const typeStr =
            integrationOptions.find((o) => o.id === academic_integration)?.label.toLowerCase() ||
            "unspecified academic engagement";

        let bestCategory = "technical and social";
        let highestAvg = 0;
        competencies.forEach((cat) => {
            const scores = cat.items.map(
                (i) => competency_scores[i.key as keyof typeof competency_scores] || 0,
            );
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg > highestAvg) {
                highestAvg = avg;
                bestCategory = cat.label.replace(/ competencies$/i, "").toLowerCase();
            }
        });

        return `This project was classified as a ${typeStr}. The student demonstrated strong ${bestCategory} competencies, with high ratings across key development areas.`;
    }, [academic_integration, competency_scores]);

    useEffect(() => {
        if (section9.summary_text !== autoNarrative) {
            updateSection("section9", { summary_text: autoNarrative });
        }
    }, [autoNarrative, section9.summary_text, updateSection]);

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-10">
            {/* Header */}
            <div className="cer-dup-head space-y-4">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 8:</span> Reflection
                        </h2>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 sm:px-5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    <div>
                        <p className="text-sm font-semibold text-indigo-900">
                            This section captures what you learned, how your academic knowledge was applied, and which competencies you developed.
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-indigo-900/80">
                            It transforms your report from simple volunteering into structured academic engagement.
                        </p>
                    </div>
                </div>
            </div>

            {/* 9.0 Academic integration */}
            <section className="space-y-4">
                <StepHeader n="9.0" title="Step 1 — Academic integration level" status="mandatory" />

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <Label className={fieldLabel}>
                        How does this project connect to your academic program?
                    </Label>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {integrationOptions.map((opt) => {
                            const active = academic_integration === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => update("academic_integration", opt.id)}
                                    className={clsx(
                                        "rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors",
                                        active
                                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
                                    )}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    <FieldError message={getFieldError("academic_integration")} />
                </div>
            </section>

            {/* 9.1 + 9.2 merged — guided reflection */}
            <section className="space-y-4">
                <StepHeader n="9.1" title="Step 2 — Your reflection" status="mandatory" />

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-sm text-slate-500">
                        Tap the skills you grew, then finish three sentences — that composes the reflection below. Edit it directly any time.
                    </p>

                    <div className="space-y-2">
                        <Label className={fieldLabel}>Skills I grew (tap all that apply)</Label>
                        <div className="flex flex-wrap gap-2">
                            {SKILL_OPTIONS.map((skill) => {
                                const active = skills_grown.includes(skill);
                                return (
                                    <button
                                        key={skill}
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        className={clsx(
                                            "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                                            active
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
                                        )}
                                    >
                                        {skill}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>The biggest thing I learned was…</Label>
                        <Input
                            placeholder="e.g. that listening to the community matters more than my plan"
                            value={reflection_biggest_learning}
                            onChange={(e) => composeAndUpdate({ reflection_biggest_learning: e.target.value })}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-100"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>A moment that changed how I see things…</Label>
                        <Input
                            placeholder="e.g. seeing children choose books over the playground on day one"
                            value={reflection_moment}
                            onChange={(e) => composeAndUpdate({ reflection_moment: e.target.value })}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-100"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={fieldLabel}>My field of study helped because…</Label>
                        {section2?.discipline ? (
                            <p className="text-xs font-semibold text-indigo-700">Your discipline: {section2.discipline}</p>
                        ) : null}
                        <Input
                            placeholder="e.g. I used simple data tracking to measure attendance improvements"
                            value={reflection_discipline_help}
                            onChange={(e) => composeAndUpdate({ reflection_discipline_help: e.target.value })}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-100"
                        />
                    </div>

                    <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-sm leading-relaxed text-slate-700">
                        {reflectionPreview || <span className="text-slate-400">Your reflection builds here as you tap and type…</span>}
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-5">
                        <div>
                            <Label className={fieldLabel}>Personal learning reflection</Label>
                            <p className="mt-1.5 text-xs text-slate-500">Filled in from your answers above — fine-tune it here if you like.</p>
                        </div>
                        <Textarea
                            placeholder="Through this project, I improved my communication and teamwork skills while working with community members..."
                            value={personal_learning}
                            onChange={(e) => update("personal_learning", e.target.value)}
                            className={textareaClasses}
                        />
                        <WordCount count={plWords} />
                        <FieldError message={getFieldError("personal_learning")} />
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-5">
                        <div>
                            <Label className={fieldLabel}>Academic application &amp; discipline contribution</Label>
                            <p className="mt-1.5 text-xs text-slate-500">Filled in from your answer above — fine-tune it here if you like.</p>
                        </div>
                        <Textarea
                            placeholder="As a student, I applied basic data analysis techniques to track attendance and measure improvement..."
                            value={academic_application}
                            onChange={(e) => update("academic_application", e.target.value)}
                            className={textareaClasses}
                        />
                        <WordCount count={aaWords} />
                        <FieldError message={getFieldError("academic_application")} />
                    </div>
                </div>
            </section>

            {/* 9.3 Competency self-assessment */}
            <section className="space-y-4">
                <StepHeader n="9.2" title="Step 3 — Rate yourself, be honest" />

                <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <button
                        type="button"
                        onClick={() => setShowRatingGuide((v) => !v)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        Rating guide — what each score means
                        <ChevronDown
                            className={clsx(
                                "h-4 w-4 transition-transform",
                                showRatingGuide && "rotate-180",
                            )}
                        />
                    </button>

                    {showRatingGuide ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left">
                                <thead className="border-b border-slate-100 bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                            Rating
                                        </th>
                                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                            Meaning
                                        </th>
                                        <th className="hidden px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">
                                            What it looks like
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {ratingGuide.map((r) => (
                                        <tr key={r.val}>
                                            <td className="px-4 py-3">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
                                                    {r.val}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                                {r.meaning}
                                            </td>
                                            <td className="hidden px-4 py-3 text-xs text-slate-500 sm:table-cell">
                                                {r.context}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {competencies.map((cat) => (
                            <div
                                key={cat.id}
                                className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"
                            >
                                <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                                    <cat.icon className="h-4 w-4 text-indigo-600" />
                                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-800">
                                        {cat.label}
                                    </h4>
                                </div>

                                <div className="space-y-5">
                                    {cat.items.map((item) => {
                                        const score =
                                            competency_scores[item.key as keyof typeof competency_scores] || 0;
                                        return (
                                            <div key={item.key} className="space-y-2.5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 space-y-0.5">
                                                        <p className="text-xs font-semibold leading-snug text-slate-900">
                                                            {item.label}
                                                        </p>
                                                        {item.description ? (
                                                            <p className="text-[11px] italic leading-relaxed text-slate-400">
                                                                {item.description}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-800">
                                                        {score > 0 ? score : "—"}
                                                    </span>
                                                </div>

                                                <div className="flex gap-1.5">
                                                    {[1, 2, 3, 4, 5].map((v) => (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() => updateScore(item.key, v)}
                                                            className={clsx(
                                                                "flex h-9 flex-1 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                                                                score === v
                                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                                    : score > v
                                                                        ? "bg-indigo-100 text-indigo-700"
                                                                        : "bg-white text-slate-400 hover:bg-slate-100 border border-slate-200",
                                                            )}
                                                        >
                                                            {v}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 sm:px-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
                            Average competency score
                        </p>
                        <p className="text-sm font-semibold text-indigo-900">
                            {avgScore > 0 ? avgScore.toFixed(1) : "—"} / 5
                        </p>
                    </div>
                </div>
            </section>

            {/* System summary */}
            <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                            <BrainCircuit className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                            System-generated academic summary
                        </h3>
                    </div>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Read-only
                    </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className={clsx(fieldLabel, "mb-4")}>Academic integration overview</p>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold leading-snug text-slate-900 line-clamp-2">
                                {integrationOptions.find((o) => o.id === academic_integration)?.label || "Pending"}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Integration level
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold leading-snug text-slate-900 line-clamp-2">
                                {section2?.discipline || "N/A"}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Discipline applied
                            </p>
                        </div>
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4 col-span-2 lg:col-span-1">
                            <p className="text-2xl font-semibold text-indigo-700">
                                {avgScore > 0 ? avgScore.toFixed(1) : "—"}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600/80">
                                Avg competency score
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Auto narrative */}
            <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                            <BrainCircuit className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                            Academic reflection summary
                        </h3>
                    </div>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Auto-generated
                    </span>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="absolute -bottom-10 -right-10 rotate-12 opacity-5">
                        <BrainCircuit className="h-64 w-64 text-slate-900" />
                    </div>
                    <p className="relative z-10 text-sm leading-relaxed text-slate-700">
                        {autoNarrative}
                    </p>
                </div>
            </section>
        </div>
    );
}
