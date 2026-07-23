import React, { useMemo, useEffect, useState } from "react";
import {
    GraduationCap, BrainCircuit, Star, Info, TrendingUp,
    Users2, ChevronDown, Compass,
} from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";

// ─── Static configuration ───────────────────────────────────────────────────
const integrationOptions = [
    { id: "Voluntary extracurricular activity", label: "Voluntary extracurricular" },
    { id: "Course-linked assignment", label: "Course-linked assignment" },
    { id: "Credit-bearing component", label: "Credit-bearing component" },
    { id: "Capstone / Thesis-linked project", label: "Capstone / thesis" },
    { id: "Research-integrated project", label: "Research-integrated" },
];

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
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";

function StepHeader({ n, title }: { n: string; title: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                {n}
            </span>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
    );
}

function WordCount({ count }: { count: number }) {
    return (
        <span
            className={clsx(
                "text-xs font-medium",
                count >= 100 && count <= 200
                    ? "text-indigo-600"
                    : count > 200
                        ? "text-red-500"
                        : "text-amber-600",
            )}
        >
            {count} / 200 words (min 100)
        </span>
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
    } = section9;

    const [showRatingGuide, setShowRatingGuide] = useState(false);

    const update = (field: string, val: unknown) => updateSection("section9", { [field]: val });
    const updateScore = (key: string, val: number) =>
        update("competency_scores", { ...competency_scores, [key]: val });

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
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            <span className="text-indigo-600">SECTION 9:</span> Reflection
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
                <StepHeader n="9.0" title="Step 1 — Academic integration level (mandatory)" />

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

            {/* 9.1 Personal learning */}
            <section className="space-y-4">
                <StepHeader n="9.1" title="Step 2 — Personal learning reflection" />

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <Label className={fieldLabel}>Personal learning reflection (mandatory)</Label>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                            Reflect on new skills, community insights, perspective changes, and challenges.
                            Focus on learning, not just repeating activities.
                        </p>
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
            </section>

            {/* 9.2 Academic application */}
            <section className="space-y-4">
                <StepHeader n="9.2" title="Step 3 — Academic application" />

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <Label className={fieldLabel}>
                            Academic application &amp; discipline contribution (mandatory)
                        </Label>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                            Explain how your field of study helped you understand the problem, design the
                            intervention, or apply technical methods.
                        </p>
                        {section2?.discipline ? (
                            <p className="mt-2 inline-flex rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                Your discipline: {section2.discipline}
                            </p>
                        ) : null}
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
            </section>

            {/* 9.3 Competency self-assessment */}
            <section className="space-y-4">
                <StepHeader n="9.3" title="Step 4 — Competency self-assessment" />

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
                        <div className="overflow-hidden rounded-xl border border-slate-200">
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
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <BrainCircuit className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                            System-generated academic summary
                        </h3>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <BrainCircuit className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                            Academic reflection summary
                        </h3>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
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
