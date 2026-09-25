import React, { useMemo, useEffect, useRef } from "react";
import { Label } from "./ui/label";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";

// ─── Static configuration ───────────────────────────────────────────────────
const integrationOptions = [
    { id: "Voluntary extracurricular activity", label: "💛 Voluntary / extracurricular" },
    { id: "Course-linked assignment", label: "📘 Part of a course" },
    { id: "Credit-bearing component", label: "🎓 For credit" },
    { id: "Capstone / Thesis-linked project", label: "📖 Capstone / thesis" },
    { id: "Research-integrated project", label: "🔬 Research project" },
];

const SKILL_OTHER = "✏️ Other";

const SKILL_OPTIONS = [
    "💬 Communication",
    "🤝 Teamwork",
    "🗓️ Planning",
    "🧩 Problem solving",
    "📊 Working with data",
    "⭐ Leadership",
    "💗 Empathy",
    "⏱️ Time management",
    "🔬 Research & inquiry",
    "🎨 Design thinking",
    "🎤 Public speaking",
    "✍️ Writing & documentation",
    "💻 Digital tools",
    "💰 Budgeting & finance",
    "🧑‍🏫 Teaching & mentoring",
    "🌏 Cross-cultural collaboration",
    "🔄 Adaptability",
    "🕊️ Conflict resolution",
    "🌱 Systems thinking",
    SKILL_OTHER,
];

const SKILL_ALIASES: Record<string, string[]> = {
    "💬 Communication": ["🗣️ Communication"],
    "🗓️ Planning": ["📋 Planning"],
    "🧩 Problem solving": ["🧩 Problem-solving"],
    "⭐ Leadership": ["🎤 Leadership"],
    "⏱️ Time management": ["⏰ Time management"],
    "🎤 Public speaking": ["🗣️ Public speaking"],
};

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

const competencies = [
    {
        id: "cognitive",
        emoji: "🧠",
        label: "Cognitive",
        items: [
            { key: "cognitive_systemic", label: "Understanding interconnected issues" },
            { key: "cognitive_critical", label: "Critical and ethical reasoning" },
            { key: "cognitive_evaluate", label: "Ability to evaluate impact" },
        ],
    },
    {
        id: "practical",
        emoji: "🛠️",
        label: "Practical",
        items: [
            { key: "practical_design", label: "Project design & implementation" },
            { key: "practical_evidence", label: "Evidence-based reporting" },
            { key: "practical_engagement", label: "Community engagement" },
        ],
    },
    {
        id: "social",
        emoji: "👥",
        label: "Social & civic",
        items: [
            { key: "social_empathy", label: "Responsibility & empathy" },
            { key: "social_diversity", label: "Awareness of diversity & inclusion" },
            { key: "social_collaboration", label: "Collaborative problem solving" },
        ],
    },
    {
        id: "transformative",
        emoji: "📈",
        label: "Transformative",
        items: [
            { key: "transformative_longterm", label: "Long-term thinking" },
            { key: "transformative_benefits", label: "Understanding benefits & downsides" },
            { key: "transformative_sustainability", label: "Sustainability-oriented decisions" },
        ],
    },
];

const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

function skillOn(selected: string[], id: string) {
    if (selected.includes(id)) return true;
    return (SKILL_ALIASES[id] || []).some((alias) => selected.includes(alias));
}

function CompetencyRadar({
    scores,
}: {
    scores: Record<string, number>;
}) {
    const axes = competencies.flatMap((group) =>
        group.items.map((item) => ({
            emoji: group.emoji,
            value: Number(scores[item.key]) || 0,
        })),
    );
    const count = axes.length;
    const cx = 120;
    const cy = 120;
    const radius = 78;
    const point = (index: number, r: number) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
        return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    };
    const ring = (level: number) =>
        axes.map((_, index) => point(index, radius * level / 5).join(",")).join(" ");
    const hasScore = axes.some((axis) => axis.value > 0);
    const shape = axes.map((axis, index) => point(index, radius * axis.value / 5).join(",")).join(" ");

    return (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e2d9f7] bg-[#fbfaff] p-4 sm:flex-row sm:items-center sm:p-5">
            <svg viewBox="0 0 240 240" className="h-52 w-52 shrink-0" aria-hidden>
                {[1, 2, 3, 4, 5].map((level) => (
                    <polygon key={level} points={ring(level)} fill="none" stroke="#d9d3f3" strokeWidth="1" />
                ))}
                {hasScore ? (
                    <polygon points={shape} fill="rgba(111,98,217,0.28)" stroke="#6f62d9" strokeWidth="2" />
                ) : null}
                {axes.map((axis, index) => {
                    if (!axis.value) return null;
                    const [x, y] = point(index, radius * axis.value / 5);
                    return <circle key={index} cx={x} cy={y} r="3.5" fill="#6f62d9" />;
                })}
                {axes.map((axis, index) => {
                    const [x, y] = point(index, radius + 16);
                    return (
                        <text key={`label-${index}`} x={x} y={y} fontSize="12" textAnchor="middle" fill="#58707a">
                            {axis.emoji}
                        </text>
                    );
                })}
            </svg>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Your competency radar</p>
                <div className="mt-3 space-y-1.5">
                    {competencies.map((group) => {
                        const values = group.items.map((item) => Number(scores[item.key]) || 0).filter((value) => value > 0);
                        const avg = values.length
                            ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
                            : "—";
                        return (
                            <div key={group.id} className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-semibold text-slate-600">{group.emoji} {group.label}</span>
                                <b className="text-slate-900">{avg}/5</b>
                            </div>
                        );
                    })}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                    Fills in live as you rate yourself below. Honest beats high — the rubric reads reflection quality, not the score.
                </p>
            </div>
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
        skills_grown_other = "",
        reflection_biggest_learning = "",
        reflection_moment = "",
        reflection_discipline_help = "",
    } = section9;

    const update = (field: string, val: unknown) => updateSection("section9", { [field]: val });
    const updateScore = (key: string, val: number) =>
        update("competency_scores", { ...competency_scores, [key]: val });

    /** Tracks the last text WE composed into each field, so a student's hand-edit is never silently overwritten. */
    const lastAutoPersonalRef = useRef("");
    const lastAutoAppRef = useRef("");

    const skillLabel = (s: string, otherText: string) =>
        s === SKILL_OTHER ? lowerFirst(otherText).replace(/\.$/, "") : stripEmoji(s).toLowerCase();

    const composeAndUpdate = (fieldPatch: Record<string, unknown>) => {
        const skills = (fieldPatch.skills_grown as string[] | undefined) ?? skills_grown;
        const skillsOther = (fieldPatch.skills_grown_other as string | undefined) ?? skills_grown_other;
        const biggest = (fieldPatch.reflection_biggest_learning as string | undefined) ?? reflection_biggest_learning;
        const moment = (fieldPatch.reflection_moment as string | undefined) ?? reflection_moment;
        const disciplineHelp = (fieldPatch.reflection_discipline_help as string | undefined) ?? reflection_discipline_help;
        const namedSkills = skills.filter((s) => s !== SKILL_OTHER || skillsOther.trim()).map((s) => skillLabel(s, skillsOther));

        const personalParts: string[] = [];
        if (namedSkills.length) personalParts.push(`Through this project, I grew my ${joinList(namedSkills)} skills while working with community members.`);
        if (biggest) personalParts.push(`The biggest thing I learned was ${lowerFirst(biggest)}.`);
        if (moment) personalParts.push(`A moment that changed how I see things: ${lowerFirst(moment)}.`);
        const composedPersonal = personalParts.join(" ");
        const discipline = (section2?.discipline || "").trim();
        const composedApplication = disciplineHelp
            ? `As a ${discipline || "university"} student, ${lowerFirst(disciplineHelp)} — connecting my coursework directly to the community’s daily reality.`
            : "";

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
        const aliases = SKILL_ALIASES[skill] || [];
        const on = skillOn(skills_grown, skill);
        const next = skills_grown.filter((value) => value !== skill && !aliases.includes(value));
        composeAndUpdate({ skills_grown: on ? next : [...next, skill] });
    };

    const getWordCount = (text: string) =>
        (text || "").trim().split(/\s+/).filter((w) => w.length > 0).length;
    const plWords = getWordCount(personal_learning);
    const aaWords = getWordCount(academic_application);

    const ratedCount = useMemo(
        () => Object.values(competency_scores || {}).filter((value) => Number(value) > 0).length,
        [competency_scores],
    );
    const avgScore = useMemo(() => {
        const values = Object.values(competency_scores || {}).map(Number).filter((value) => value > 0);
        if (!values.length) return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }, [competency_scores]);
    const overallLabel = ratedCount === 12 ? `${avgScore.toFixed(1)} / 5` : ratedCount ? `${ratedCount}/12 rated` : "— / 5";
    const legacySkills = skills_grown.filter((skill) => !SKILL_OPTIONS.some((option) => skillOn([skill], option)));

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
        <div className="mx-auto max-w-6xl space-y-3 pb-10">
            <section className="cer-card space-y-4">
                <div className="cer-secl">
                    <span className="cer-secn">8.1</span>
                    <h3>Academic integration</h3>
                    <span className="cer-tag auto">Carried from your program — tap to change</span>
                </div>
                <div className="cer-chips">
                    {integrationOptions.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => update("academic_integration", opt.id)}
                            className={clsx("cer-chip", academic_integration === opt.id && "on")}
                        >
                            {opt.label}
                        </button>
                    ))}
                    {academic_integration && !integrationOptions.some((opt) => opt.id === academic_integration) ? (
                        <button type="button" className="cer-chip on" onClick={() => update("academic_integration", academic_integration)}>
                            {academic_integration}
                        </button>
                    ) : null}
                </div>
                <FieldError message={getFieldError("academic_integration")} />
            </section>

            <section className="cer-card space-y-4">
                <div className="cer-secl">
                    <span className="cer-secn">8.2</span>
                    <h3>Your reflection</h3>
                    <span className="cer-tag">Mandatory</span>
                </div>

                <div>
                    <Label className={fieldLabel}>Skills I grew · any discipline · tap all that apply</Label>
                    <div className="cer-chips mt-2">
                        {SKILL_OPTIONS.map((skill) => (
                            <button
                                key={skill}
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className={clsx("cer-chip", skillOn(skills_grown, skill) && "on")}
                            >
                                {skill}
                            </button>
                        ))}
                        {legacySkills.map((skill) => (
                            <button key={skill} type="button" className="cer-chip on" onClick={() => toggleSkill(skill)}>
                                {skill}
                            </button>
                        ))}
                    </div>
                    {skillOn(skills_grown, SKILL_OTHER) ? (
                        <input
                            className="cer-input mt-2"
                            placeholder="What else did you grow?"
                            value={skills_grown_other}
                            onChange={(e) => composeAndUpdate({ skills_grown_other: e.target.value })}
                        />
                    ) : null}
                    <FieldError message={getFieldError("skills_grown_other")} />
                    <FieldError message={getFieldError("skills_grown")} />
                </div>

                <div>
                    <div className="flex items-end justify-between gap-3">
                        <Label className={fieldLabel}>The biggest thing I learned was…</Label>
                        <span className="cer-wc">{getWordCount(reflection_biggest_learning)} words · 5–30 recommended</span>
                    </div>
                    <input
                        className="cer-input mt-2"
                        placeholder="e.g. that listening to the community matters more than my plan"
                        value={reflection_biggest_learning}
                        onChange={(e) => composeAndUpdate({ reflection_biggest_learning: e.target.value })}
                    />
                    <FieldError message={getFieldError("reflection_biggest_learning")} />
                </div>

                <div>
                    <div className="flex items-end justify-between gap-3">
                        <Label className={fieldLabel}>A moment that changed how I see things…</Label>
                        <span className="cer-wc">{getWordCount(reflection_moment)} words · 5–30 recommended</span>
                    </div>
                    <input
                        className="cer-input mt-2"
                        placeholder="e.g. seeing children choose books over the playground on day one"
                        value={reflection_moment}
                        onChange={(e) => composeAndUpdate({ reflection_moment: e.target.value })}
                    />
                    <FieldError message={getFieldError("reflection_moment")} />
                </div>

                <div>
                    <div className="flex items-end justify-between gap-3">
                        <Label className={fieldLabel}>An academic skill I actually applied…</Label>
                        <span className="cer-wc">{getWordCount(reflection_discipline_help)} words · 5–30 recommended</span>
                    </div>
                    {section2?.discipline ? (
                        <p className="mt-1 text-xs font-semibold text-[var(--teal)]">Your discipline: {section2.discipline}</p>
                    ) : null}
                    <input
                        className="cer-input mt-2"
                        placeholder="e.g. I used simple data tracking to measure attendance improvements"
                        value={reflection_discipline_help}
                        onChange={(e) => composeAndUpdate({ reflection_discipline_help: e.target.value })}
                    />
                    <FieldError message={getFieldError("reflection_discipline_help")} />
                </div>

                <div>
                    <div className="flex items-end justify-between gap-3">
                        <Label className={fieldLabel}>Personal learning reflection · auto-drafted, edit freely</Label>
                        <span className="cer-wc">{plWords} words · recommended 40–100</span>
                    </div>
                    <textarea
                        className="cer-input mt-2 min-h-[96px]"
                        value={personal_learning}
                        onChange={(e) => update("personal_learning", e.target.value)}
                    />
                    <FieldError message={getFieldError("personal_learning")} />
                </div>

                <div>
                    <div className="flex items-end justify-between gap-3">
                        <Label className={fieldLabel}>Academic application · auto-drafted, edit freely</Label>
                        <span className="cer-wc">{aaWords} words · recommended 25–70</span>
                    </div>
                    <textarea
                        className="cer-input mt-2 min-h-[96px]"
                        value={academic_application}
                        onChange={(e) => update("academic_application", e.target.value)}
                    />
                    <FieldError message={getFieldError("academic_application")} />
                </div>
            </section>

            <CompetencyRadar scores={competency_scores || {}} />

            <section className="cer-card space-y-4">
                <div className="cer-secl">
                    <span className="cer-secn">8.3</span>
                    <h3>Rate yourself — be honest</h3>
                    <span className="cer-tag">Mandatory</span>
                </div>
                <p className="cer-hint">
                    <b>1</b> just starting · <b>3</b> did it independently · <b>5</b> could teach it. Honest middles beat a row of 5s — the rubric checks ratings against evidence.
                </p>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {competencies.map((group) => (
                        <div key={group.id} className="rounded-xl border border-slate-200 p-4">
                            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-700">
                                {group.emoji} {group.label}
                            </p>
                            <div className="space-y-3">
                                {group.items.map((item) => {
                                    const score = Number(competency_scores?.[item.key as keyof typeof competency_scores]) || 0;
                                    return (
                                        <div key={item.key} className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="min-w-0 flex-1 text-xs font-semibold text-slate-800">{item.label}</p>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => updateScore(item.key, value)}
                                                        className={clsx(
                                                            "flex h-7 w-7 items-center justify-center rounded-md border text-[11px] font-bold",
                                                            score === value
                                                                ? "border-[#6f62d9] bg-[#6f62d9] text-white"
                                                                : "border-slate-200 bg-white text-slate-500 hover:border-[#6f62d9]",
                                                        )}
                                                    >
                                                        {value}
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
                <div className="flex items-center text-xs font-extrabold text-[var(--teal)]">
                    Overall competency
                    <span className="ml-auto text-sm">{overallLabel}</span>
                </div>
                <FieldError message={getFieldError("competency_scores")} />
            </section>
        </div>
    );
}
