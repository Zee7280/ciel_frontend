"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, UploadCloud, X, ChevronDown, Star } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { sdgData } from "@/utils/sdgData";
import { pakistaniUniversities } from "@/utils/universityData";
import { hecPrograms } from "@/utils/hecProgramsData";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import SearchableSelect from "@/components/ui/SearchableSelect";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import { TeamInviteBadge } from "@/components/ciel/TeamInviteBadge";
import RichSummaryText from "@/components/ciel/RichSummaryText";
import { CourseworkCrumb, CourseworkHero, HubBackButton } from "@/components/ciel/coursework/CourseworkHubChrome";
import { courseworkStatusLabel } from "@/utils/courseworkSectionReview";
import {
    type CourseProjectEntry,
    type CourseProjectModuleInclusion,
    type CourseProjectSectionSummaries,
    type CourseProjectGroupMember,
    type CourseProjectMetric,
    type CourseProjectRoute,
    EMPTY_COURSE_PROJECT,
    mergeCourseProjectEntry,
    composeCourseProjectSummaries,
    courseProjectMetricLine,
    normalizeGroupMembers,
    stripBoldMarkup,
    activeSectionKeys,
    SECTION_LABELS,
    COURSEWORK_MODES,
    FORMAT_ROUTE,
    courseProjectRouteFor,
} from "@/utils/courseProjectTypes";

const STEPS = [
    { key: "course", emoji: "📌", label: "Course" },
    { key: "format", emoji: "🚀", label: "Format" },
    { key: "aims", emoji: "🎯", label: "Aims" },
    { key: "process", emoji: "🛠️", label: "Process" },
    { key: "results", emoji: "📦", label: "Results" },
    { key: "sdg", emoji: "🌍", label: "SDG map" },
    { key: "reflection", emoji: "💡", label: "Reflection" },
    { key: "submit", emoji: "📩", label: "Submit" },
];
const SEMESTER_OPTIONS = Array.from({ length: 10 }, (_, i) => `Semester ${i + 1}`);
/** Older drafts may have saved a bare number (e.g. "5") from before this was a dropdown — match it to its option so it still shows as selected instead of appearing blank. */
function semesterSelectValue(raw?: string): string {
    if (!raw) return "";
    if (SEMESTER_OPTIONS.includes(raw)) return raw;
    const digit = raw.match(/\d+/)?.[0];
    const canonical = digit ? `Semester ${digit}` : "";
    return SEMESTER_OPTIONS.includes(canonical) ? canonical : "";
}
const TEAM_MODE_OPTIONS = ["Individual", "Pair", "Group / Team", "Whole class", "Interdisciplinary team"];

/** The 27 raw format choices. Each maps to one of five pathways (COURSEWORK_MODES / FORMAT_ROUTE in courseProjectTypes.ts) which supplies its module-inclusion preset, field vocabulary, and roadmap. */
const FORMAT_OPTIONS = [
    "✍️ Essay / written argument", "📑 Report", "🔬 Research paper", "📖 Literature review", "🧪 Lab / practical report",
    "🧭 Case study", "🩺 Clinical case / care plan", "⚖️ Legal brief / moot",
    "🎤 Presentation / slides", "🎨 Design / visual work", "📐 Model", "🔧 Prototype", "🧱 Physical product / making",
    "📱 App / website / software", "📊 Data / analysis", "🌐 Translation / language work",
    "🎬 Video / film / audio", "🖼️ Artwork / creative production", "📣 Campaign / communication", "🪧 Poster / infographic", "🎭 Performance / exhibition",
    "🧑‍🏫 Lesson plan / teaching practice", "🎪 Event / experience organised",
    "🥾 Fieldwork output", "🧭 Strategy / proposal / plan", "💼 Business plan",
    "✍️ Other",
];

const INC_TILES: { key: keyof CourseProjectModuleInclusion; emoji: string; label: string; idleClass: string; onClass: string }[] = [
    { key: "aim", emoji: "🎯", label: "Aim & objectives", idleClass: "border-ciel-green/35 bg-ciel-green-soft/50 text-ciel-green-deep", onClass: "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" },
    { key: "act", emoji: "🛠️", label: "Activities", idleClass: "border-ciel-purple/35 bg-ciel-purple-soft/70 text-ciel-purple-deep", onClass: "border-ciel-purple bg-ciel-purple-soft text-ciel-purple-deep" },
    { key: "meth", emoji: "🔬", label: "Method / research", idleClass: "border-ciel-indigo/35 bg-ciel-indigo-soft/70 text-ciel-indigo", onClass: "border-ciel-indigo bg-ciel-indigo-soft text-ciel-indigo" },
    { key: "find", emoji: "📊", label: "Findings", idleClass: "border-ciel-green/35 bg-ciel-green-soft/50 text-ciel-green-deep", onClass: "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" },
    { key: "res", emoji: "📏", label: "Results & evidence", idleClass: "border-ciel-purple/35 bg-ciel-purple-soft/70 text-ciel-purple-deep", onClass: "border-ciel-purple bg-ciel-purple-soft text-ciel-purple-deep" },
    { key: "lim", emoji: "⚠️", label: "Limitations", idleClass: "border-ciel-gold/40 bg-ciel-gold-soft/70 text-ciel-gold-deep", onClass: "border-ciel-gold bg-ciel-gold-soft text-ciel-gold-deep" },
];

const ACTIVITY_OPTIONS = ["🔍 Research & reading", "📊 Data collection", "🎨 Designing / creating", "🧩 Ideation / concepts", "🧪 Testing / experimenting", "🧱 Building / making", "🖥 Coding / development", "👀 Observation / site visit", "🤝 Working with an organisation", "📣 Running a campaign / event", "🎤 Presenting / pitching", "✍️ Drafting & editing", "🎬 Filming / recording", "📐 Modelling / simulation", "🔬 Lab / practical work", "👥 Stakeholder engagement", "🎭 Performance / exhibition", "📚 Teaching / facilitating", "🧠 Analysis / evaluation"];
const METHOD_OPTIONS = ["📋 Survey", "🗣️ Interviews", "🗣️ Focus groups", "🧪 Experiment", "👀 Observation / site visit", "🥾 Site visit / field study", "📊 Data analysis", "🗂️ Case analysis", "📚 Literature search", "🗄️ Document / archival analysis", "🧑‍🤝‍🧑 User research", "🧪 User testing", "🎨 Design research", "📐 Modelling / simulation", "🧫 Lab testing", "🛠️ Technical testing", "⚖️ Legal / doctrinal analysis", "📜 Legal / policy analysis", "🎨 Creative / practice-based inquiry", "📊 Comparative analysis", "Not applicable"];
const BENEFICIARY_OPTIONS = ["Students", "University / campus", "Community", "Business / industry", "Government / public sector", "Schools", "Environment / ecosystems", "Specific user group", "General public", "Knowledge / understanding", "No specific external beneficiary"];
const STAKEHOLDER_OPTIONS = ["No external stakeholders", "Students", "Faculty", "Community members", "Business / industry", "NGO / nonprofit", "Government / public body", "School", "Experts / professionals", "Clients / users"];
const OUTPUT_OPTIONS = ["📄 Report / plan", "✍️ Essay / written piece", "📽️ Presentation / slides", "📐 Design / model", "🔧 Prototype", "📱 App / website", "📣 Campaign materials", "🎬 Video / artwork", "🎭 Performance / exhibit", "📊 Dataset / findings", "📜 Brief / memo", "🌐 Translation / portfolio", "📋 Proposal / plan", "💼 Business plan", "🧱 Product", "🏛️ Architectural / spatial design", "📚 Teaching / learning material", "🎪 Event / workshop / activity", "🤝 Community intervention", "🧮 Model / simulation", "🛠️ Technical solution"];
const SKILL_OPTIONS = ["🗣️ Communication", "🤝 Teamwork", "🔬 Research", "🧩 Problem-solving", "🎨 Creativity", "⏰ Time management", "🌍 Sustainability thinking", "⚖️ Ethical reasoning", "✍️ Writing", "🎤 Presenting", "🧠 Critical thinking", "📋 Project management", "🔗 Systems thinking", "📊 Data literacy", "💻 Digital / technical", "🚀 Leadership", "🤝 Stakeholder engagement"];
const ORIGIN_OPTIONS = ["📋 Built into the assignment", "📘 Built into the course", "💡 Introduced by the student / team", "👩‍🏫 Suggested by the instructor", "🔍 Emerged during the work", "🔗 Identified when reviewing the completed work"];
const INTEGRATION_OPTIONS = ["🌱 Central to the work and demonstrated", "📊 Clearly connected, outcome not measured", "🌓 Partially integrated", "🔗 Indirectly connected", "🔍 Identified retrospectively"];
const MEASURED_OPTIONS = ["✅ Yes — a result was actually measured", "🌓 Partly — some evidence, not enough to confirm", "📋 No — findings / designs / recommendations only", "⏳ Not yet — will be measured later"];
const METRIC_TYPE_OPTIONS = ["People / participation", "Behaviour / practice", "Awareness / knowledge", "Learning / skills", "Environmental", "Social / community", "Economic / financial", "Health / well-being", "Design / technical performance", "User / customer", "Business / entrepreneurship", "Digital / technology", "Research", "Other"];
const METRIC_UNIT_OPTIONS = ["Count / number", "Percentage (%)", "People", "Units / items", "Ratio", "Score / rating", "Hours", "Days", "kg", "Tonnes", "Litres", "m²", "km", "kWh", "CO₂e (kg)", "CO₂e (tonnes)", "PKR", "USD", "Other"];
const METRIC_STATUS_OPTIONS = ["Actual — measured", "Target — intended future result", "Estimated / projected", "Proposed — not yet tested"];
const METRIC_SOURCE_OPTIONS = ["Survey", "Interview", "Focus group", "Observation", "Experiment / lab test", "Prototype testing", "Pre/post assessment", "System / platform analytics", "Sales / financial records", "Attendance records", "Client / user feedback", "Partner records", "Environmental measurement", "Photos / video", "Documents / reports", "Published data", "Simulation / modelling", "Expert assessment", "Other"];
const METRIC_CHARACTER_OPTIONS = ["Positive / expected", "Mixed", "No significant change", "Negative / unsuccessful", "Unexpected finding", "Too early to determine"];
const METRIC_VERIFIER_OPTIONS = ["Faculty / supervisor", "University department", "Client / user", "Community partner", "NGO", "Business / industry partner", "Government / public institution", "Laboratory / technical facility", "System / digital records", "Student team records", "No external verifier", "Other"];
const LIMITATION_OPTIONS = ["Small sample size", "Limited time", "One location only", "Limited access to participants", "No baseline available", "Prototype not tested in real conditions", "Self-reported responses only", "Technical limitations", "No long-term follow-up", "Other — describe below"];
const NEXT_STEP_OPTIONS = ["Completed as coursework", "Could be developed further", "Further research recommended", "Could be tested / piloted", "Recommended for implementation", "Share with external stakeholder", "Continued in another course", "Already taken forward", "Other"];
const EVIDENCE_TYPE_OPTIONS = ["📄 Report", "🎤 Slides", "🪧 Poster", "📸 Photos", "🎬 Video", "🖼️ Artwork / design", "🔧 Prototype docs", "📊 Dataset", "🌐 Link"];
/** Broad discipline/field categories — distinct from Programme (a specific HEC degree title, e.g. "BBA"). */
const DISCIPLINE_OPTIONS = ["Business & Management", "Economics", "Architecture", "Design", "Fine Arts", "Textile & Fashion", "Media & Communication", "Computer Science", "Engineering", "Mathematics & Statistics", "Social Sciences", "Psychology", "Education", "Liberal Arts", "Languages & Linguistics", "Natural Sciences", "Law", "Medicine & Nursing", "Pharmacy", "Health Sciences", "Agriculture & Food", "Hospitality & Tourism", "Islamic Studies & Theology"];

function metricUnitSuffix(m: { unit?: string; unitOther?: string }): string {
    if (m.unit === "Percentage (%)") return "%";
    if (!m.unit || m.unit === "Other") return m.unit === "Other" && m.unitOther ? ` ${m.unitOther}` : "";
    return ` ${m.unit}`;
}
function metricDeltaLine(m: CourseProjectMetric): string {
    if (!m.comparedBeforeAfter || m.baseline === undefined || m.baseline === "" || m.value === undefined || m.value === "") return "";
    const d = Number(m.value) - Number(m.baseline);
    const pp = m.unit === "Percentage (%)";
    return `📈 Change: ${d >= 0 ? "+" : ""}${Math.round(d * 100) / 100}${pp ? " percentage points" : metricUnitSuffix(m)} (${m.baseline} → ${m.value})`;
}
const METRIC_STATUS_CHIP_CLASS: Record<string, string> = {
    "Actual — measured": "border-ciel-green bg-ciel-green-soft text-ciel-green-deep",
    "Target — intended future result": "border-ciel-indigo bg-ciel-indigo-soft text-ciel-indigo",
    "Estimated / projected": "border-ciel-gold bg-ciel-gold-soft text-ciel-gold-deep",
    "Proposed — not yet tested": "border-ciel-teal bg-ciel-teal-soft text-ciel-teal",
};

/** Up-to-5 structured results builder — replaces the old single evidence-status + metric/value/unit fields. */
function MetricsBuilder({ metrics, onChange }: { metrics: CourseProjectMetric[]; onChange: (next: CourseProjectMetric[]) => void }) {
    const [openId, setOpenId] = useState<string | null>(metrics[0]?.id ?? null);

    const addMetric = () => {
        if (metrics.length >= 5) return;
        const id = `m${Date.now()}`;
        onChange([...metrics, { id }]);
        setOpenId(id);
    };
    const setMetric = (id: string, patch: Partial<CourseProjectMetric>) => onChange(metrics.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    const delMetric = (id: string) => onChange(metrics.filter((m) => m.id !== id));

    return (
        <div className="space-y-2.5">
            {metrics.map((m, i) => {
                const open = openId === m.id;
                return (
                    <div key={m.id} className="overflow-hidden rounded-ciel-sm border-2 border-ciel-border bg-white">
                        <button
                            type="button"
                            onClick={() => setOpenId(open ? null : m.id)}
                            className="flex w-full flex-wrap items-center gap-2 bg-ciel-page/50 px-3.5 py-2.5 text-left"
                        >
                            <span className="shrink-0 rounded-full bg-ciel-gold px-2.5 py-1 text-[9px] font-black text-white">RESULT {String(i + 1).padStart(2, "0")}</span>
                            <span className="min-w-0 flex-1 truncate text-xs font-bold text-ciel-text">
                                {m.name ? <>{m.name}{m.value ? <>: <b>{m.value}{metricUnitSuffix(m)}</b></> : null}</> : <i className="text-ciel-text-soft">New result — tap to fill</i>}
                            </span>
                            {m.status && <span className="shrink-0 rounded-full bg-ciel-teal-soft px-2 py-0.5 text-[9px] font-black text-ciel-teal">{m.status.split(" — ")[0].toUpperCase()}</span>}
                            <ChevronDown className={clsx("h-4 w-4 shrink-0 text-ciel-text-soft transition-transform", open && "rotate-180")} />
                        </button>
                        {open && (
                            <div className="space-y-3 p-3.5">
                                {/* Tier 1 — the essentials, just three things */}
                                <Field label="What did you measure?" hint="The thing, not the method.">
                                    <input type="text" value={m.name ?? ""} onChange={(e) => setMetric(m.id, { name: e.target.value })} placeholder="e.g. Students willing to reduce single-use plastic" className={fieldClass} />
                                </Field>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field label="The number">
                                            <input type="number" value={m.value ?? ""} onChange={(e) => setMetric(m.id, { value: e.target.value })} placeholder="74" className={fieldClass} />
                                        </Field>
                                        <Field label="…of what?">
                                            <select value={m.unit ?? ""} onChange={(e) => setMetric(m.id, { unit: e.target.value })} className={fieldClass}>
                                                <option value="">Unit…</option>
                                                {METRIC_UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                            {m.unit === "Other" && (
                                                <input type="text" value={m.unitOther ?? ""} onChange={(e) => setMetric(m.id, { unitOther: e.target.value })} placeholder="Your own unit — e.g. meals, stalls, lux" className={clsx(fieldClass, "mt-1.5")} />
                                            )}
                                        </Field>
                                    </div>
                                    <Field label="Is this real, or planned?" hint="One tap.">
                                        <div className="flex flex-wrap gap-2">
                                            {METRIC_STATUS_OPTIONS.map((s) => {
                                                const short = s.split(" — ")[0];
                                                const active = m.status === s;
                                                return (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setMetric(m.id, { status: s })}
                                                        className={clsx(
                                                            "ciel-transition rounded-full border-2 px-3 py-1.5 text-xs font-bold",
                                                            active ? METRIC_STATUS_CHIP_CLASS[s] : "border-ciel-border text-ciel-text-mid hover:border-ciel-gold/40",
                                                        )}
                                                    >
                                                        {short}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </Field>
                                </div>

                                {/* Tier 2 — everything else lives in one fold */}
                                <details className="rounded-ciel-xs border border-ciel-border">
                                    <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-ciel-teal">＋ Add detail <span className="font-semibold text-ciel-text-soft">(all optional — what it means, who &amp; when, proof, baseline)</span></summary>
                                    <div className="space-y-3 border-l-2 border-ciel-teal-soft px-3 pb-3 pt-1">
                                        <Field label="📖 What does this number mean?" hint="One sentence.">
                                            <input type="text" value={m.meaning ?? ""} onChange={(e) => setMetric(m.id, { meaning: e.target.value })} placeholder="e.g. 74% of surveyed students said they'd switch if reusables were available" className={fieldClass} />
                                        </Field>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <Field label="Based on" hint="“Not applicable” is fine.">
                                                <input type="text" value={m.sample ?? ""} onChange={(e) => setMetric(m.id, { sample: e.target.value })} placeholder="e.g. 120 students" className={fieldClass} />
                                            </Field>
                                            <Field label="When?" hint="Exact dates.">
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <input type="date" value={m.periodFrom ?? ""} onChange={(e) => setMetric(m.id, { periodFrom: e.target.value })} className={fieldClass} title="From" />
                                                    <input type="date" value={m.periodTo ?? ""} onChange={(e) => setMetric(m.id, { periodTo: e.target.value })} className={fieldClass} title="To" />
                                                </div>
                                            </Field>
                                            <Field label="Type of result">
                                                <select value={m.type ?? ""} onChange={(e) => setMetric(m.id, { type: e.target.value })} className={fieldClass}>
                                                    <option value="">Select…</option>
                                                    {METRIC_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                                {m.type === "Other" && (
                                                    <input type="text" value={m.typeOther ?? ""} onChange={(e) => setMetric(m.id, { typeOther: e.target.value })} placeholder="What kind — in your words" className={clsx(fieldClass, "mt-1.5")} />
                                                )}
                                            </Field>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <Field label="🧾 Evidenced by">
                                                <select value={m.source ?? ""} onChange={(e) => setMetric(m.id, { source: e.target.value })} className={fieldClass}>
                                                    <option value="">Select…</option>
                                                    {METRIC_SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                {m.source === "Other" && (
                                                    <input type="text" value={m.sourceOther ?? ""} onChange={(e) => setMetric(m.id, { sourceOther: e.target.value })} placeholder="How was it evidenced — in your words" className={clsx(fieldClass, "mt-1.5")} />
                                                )}
                                            </Field>
                                            <Field label="Who can verify it?">
                                                <select value={m.verifier ?? ""} onChange={(e) => setMetric(m.id, { verifier: e.target.value })} className={fieldClass}>
                                                    <option value="">Select…</option>
                                                    {METRIC_VERIFIER_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                                {m.verifier === "Other" && (
                                                    <input type="text" value={m.verifierOther ?? ""} onChange={(e) => setMetric(m.id, { verifierOther: e.target.value })} placeholder="Who can verify — in your words" className={clsx(fieldClass, "mt-1.5")} />
                                                )}
                                            </Field>
                                            <Field label="How did it turn out?" hint="Honest is fine.">
                                                <select value={m.character ?? ""} onChange={(e) => setMetric(m.id, { character: e.target.value })} className={fieldClass}>
                                                    <option value="">Select…</option>
                                                    {METRIC_CHARACTER_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </Field>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <ChipSingle options={["📈 I have a before-number (baseline)"]} value={m.comparedBeforeAfter ? "📈 I have a before-number (baseline)" : undefined} onChange={() => setMetric(m.id, { comparedBeforeAfter: !m.comparedBeforeAfter })} />
                                            <ChipSingle
                                                options={[m.evidenceAttached ? "✅ Evidence attached" : "📎 Attach evidence file"]}
                                                value={m.evidenceAttached ? "✅ Evidence attached" : undefined}
                                                onChange={() => setMetric(m.id, { evidenceAttached: !m.evidenceAttached })}
                                            />
                                        </div>
                                        {m.comparedBeforeAfter && (
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <Field label="Baseline (before)">
                                                    <input type="number" value={m.baseline ?? ""} onChange={(e) => setMetric(m.id, { baseline: e.target.value })} placeholder="42" className={fieldClass} />
                                                </Field>
                                                <p className="self-end text-xs font-bold text-ciel-green-deep">{metricDeltaLine(m) || "Enter baseline + result to compute the change"}</p>
                                            </div>
                                        )}
                                    </div>
                                </details>
                                <div className="flex justify-end border-t border-ciel-border pt-2.5">
                                    <button type="button" onClick={() => delMetric(m.id)} className="text-xs font-bold text-red-600 hover:underline">🗑 Remove this result</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            <button
                type="button"
                onClick={addMetric}
                disabled={metrics.length >= 5}
                className="ciel-transition w-full rounded-ciel-sm border-2 border-dashed border-ciel-gold/50 bg-ciel-gold-soft px-4 py-3 text-xs font-black text-ciel-gold-deep hover:bg-ciel-gold-soft/70 disabled:cursor-not-allowed disabled:opacity-45"
            >
                {metrics.length >= 5 ? "Maximum 5 results reached" : metrics.length ? "➕ Add another result / metric" : "➕ Add your first result / metric"}
            </button>
            {metrics.length > 0 && <p className="text-center text-[10.5px] text-ciel-text-soft">{metrics.length} of 5 results added · tap a header to fold it away</p>}
        </div>
    );
}

const fieldClass = "w-full rounded-ciel-sm border-2 border-ciel-border bg-ciel-page/50 px-4 py-3 text-sm font-semibold text-ciel-text outline-none focus:border-ciel-gold focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-gold";
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

/** Live, read-only preview of this section's auto-composed paragraph — updates on every keystroke/tap. */
function SectionSummaryBox({ text }: { text?: string }) {
    const filled = Boolean(text?.trim());
    return (
        <div
            className="mt-1 rounded-[14px] p-[1.5px]"
            style={{ background: "linear-gradient(120deg,#e4d5ff,#f3e3b8 60%,#cde8d2)" }}
        >
            <div className="rounded-[13px] bg-white px-3.5 py-3">
                <span className="block text-[8.5px] font-black tracking-[0.14em] text-[#6d3df5]">✨ SECTION SUMMARY</span>
                <div className={filled ? "mt-1.5 text-[12.5px] leading-[1.7] text-[#2a3350]" : "mt-1.5 text-[12.5px] italic leading-[1.7] text-[#a2a8bb]"}>
                    {filled ? <RichSummaryText text={text!} /> : "Fills as you type…"}
                </div>
            </div>
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
                        value === opt ? "border-ciel-gold bg-ciel-gold-soft text-ciel-gold-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-gold/40",
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
                                isSel ? "border-ciel-gold bg-ciel-gold-soft text-ciel-gold-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-gold/40",
                            )}
                        >
                            {opt}
                        </button>
                    );
                })}
                {hasOther ? (
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
                            showOther ? "border-ciel-gold bg-ciel-gold-soft text-ciel-gold-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-gold/40",
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

const SCALE_UNIT_OPTIONS = ["survey responses", "interviews", "focus-group participants", "observation sites / visits", "design iterations", "prototypes / versions", "test cases", "works / pieces created", "events / sessions held", "people engaged", "documents analysed", "samples tested", "Other…"];
const SCALE_NA_OPTIONS = ["🚫 Not applicable", "🖥️ Desk research only", "🏫 Class exercise — no external scale"];

interface ScaleRow { n: string; u: string; o: string }

/** Reverses ScaleBuilder's own "120 survey responses · 3 sites" composition back into rows, so
 * reopening this step after a save shows what was actually entered instead of a blank builder. */
function parseScaleRows(value: string): ScaleRow[] {
    if (!value || SCALE_NA_OPTIONS.includes(value)) return [];
    return value.split(" · ").flatMap((segment) => {
        const m = segment.trim().match(/^(\d+)\s+(.*)$/);
        if (!m) return [];
        const [, n, rest] = m;
        const known = SCALE_UNIT_OPTIONS.includes(rest) && rest !== "Other…";
        return [{ n, u: known ? rest : "Other…", o: known ? "" : rest }];
    });
}

/** Tap-based scale/scope builder — composes a plain "120 survey responses · 3 sites" string, same field as before. */
function ScaleBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [naVal, setNaVal] = useState<string>(() => (SCALE_NA_OPTIONS.includes(value) ? value : ""));
    const [rows, setRows] = useState<ScaleRow[]>(() => parseScaleRows(value));

    const compose = (nextNa: string, nextRows: ScaleRow[]) =>
        nextNa || nextRows.filter((r) => r.n && (r.u || r.o)).map((r) => `${r.n} ${r.u === "Other…" ? r.o : r.u}`).join(" · ");

    const pickNa = (opt: string) => {
        const next = naVal === opt ? "" : opt;
        setNaVal(next);
        if (next) setRows([]);
        onChange(compose(next, next ? [] : rows));
    };
    const addRow = () => {
        if (rows.length >= 6) return;
        const next = [...rows, { n: "", u: "", o: "" }];
        setRows(next);
        onChange(compose(naVal, next));
    };
    const setRow = (i: number, patch: Partial<ScaleRow>) => {
        const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
        setRows(next);
        onChange(compose(naVal, next));
    };
    const delRow = (i: number) => {
        const next = rows.filter((_, idx) => idx !== i);
        setRows(next);
        onChange(compose(naVal, next));
    };

    const composed = compose(naVal, rows);

    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap gap-2">
                {SCALE_NA_OPTIONS.map((opt) => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => pickNa(opt)}
                        className={clsx(
                            "ciel-transition rounded-full border-2 px-3.5 py-2 text-xs font-bold",
                            naVal === opt ? "border-ciel-gold bg-ciel-gold-soft text-ciel-gold-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-gold/40",
                        )}
                    >
                        {opt}
                    </button>
                ))}
            </div>
            {!naVal && (
                <div className="space-y-2">
                    {rows.map((r, i) => (
                        <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <input type="number" value={r.n} onChange={(e) => setRow(i, { n: e.target.value })} placeholder="How many? e.g. 120" className={fieldClass} />
                            <select value={r.u} onChange={(e) => setRow(i, { u: e.target.value })} className={fieldClass}>
                                <option value="">…of what?</option>
                                {SCALE_UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <div className="flex gap-2">
                                {r.u === "Other…" && <input type="text" value={r.o} onChange={(e) => setRow(i, { o: e.target.value })} placeholder="your unit" className={fieldClass} />}
                                <button type="button" onClick={() => delRow(i)} className="shrink-0 rounded-ciel-xs border border-red-200 bg-red-50 px-3 text-red-600 hover:bg-red-100" aria-label="Remove row">🗑</button>
                            </div>
                        </div>
                    ))}
                    {rows.length < 6 && (
                        <button type="button" onClick={addRow} className="text-xs font-bold text-ciel-gold-deep hover:underline">
                            ＋ add a number (e.g. 120 survey responses)
                        </button>
                    )}
                    <p className="text-xs text-ciel-text-soft">{composed ? <>✨ <b>Your scale, composed:</b> {composed}</> : "Add only the numbers that are true — one is fine, none is fine."}</p>
                </div>
            )}
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
    const [declarationChecked, setDeclarationChecked] = useState(false);
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

    /** Populate un-accepted/un-edited review blocks whenever step 8 opens — mirrors "your teacher sees only what you approve": accepted or hand-edited text never gets silently overwritten. Prefers the student's previously saved/edited wording over a fresh AI draft, so reopening an already-submitted report doesn't discard their earlier edits. */
    useEffect(() => {
        if (step !== 7) return;
        setReview((prev) => {
            const next = { ...prev };
            for (const key of activeStepIdx) {
                const existing = next[key];
                if (!existing || (!existing.accepted && !existing.edited)) {
                    const saved = entry.sectionSummaries?.[key];
                    next[key] = { accepted: false, edited: false, text: stripBoldMarkup(saved || sums[key] || "") };
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
            for (const key of activeStepIdx) next[key] = { accepted: false, edited: false, text: stripBoldMarkup(sums[key] || "") };
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

    const updateGroupMember = (i: number, patch: Partial<CourseProjectGroupMember>) => {
        const current = normalizeGroupMembers(entry.studentInfo?.groupMembers);
        const next = [...current];
        next[i] = { ...(next[i] ?? { name: "" }), ...patch };
        patchGroup("studentInfo", { groupMembers: next });
    };

    const toggleFormat = (fmt: string) => {
        const cur = entry.assignmentInfo?.formats ?? (entry.assignmentInfo?.format ? [entry.assignmentInfo.format] : []);
        const next = cur.includes(fmt) ? cur.filter((x) => x !== fmt) : [...cur, fmt];
        patchGroup("assignmentInfo", { formats: next, format: next[0] });
        // Only re-apply the "which sections apply" preset when the leading route actually changes —
        // adding/removing a secondary format that keeps the same route shouldn't silently discard
        // any manual tile customization the student already made.
        const prevRoute = cur.length ? courseProjectRouteFor(cur) : null;
        const nextRoute = next.length ? courseProjectRouteFor(next) : null;
        if (nextRoute && nextRoute !== prevRoute) {
            const preset = COURSEWORK_MODES[nextRoute].i;
            setEntry((e) => ({ ...e, moduleInclusion: { ...preset } }));
        }
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

    /** The primary assignment file — distinct from evidenceUrls' supporting files, drives half the Verifiability score. */
    const handleAssignmentFile = async (file: File) => {
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
            setEntry((e) => ({ ...e, assignmentFileUrl: publicUrl }));
            await save({ assignmentFileUrl: publicUrl });
        } catch {
            setError("Assignment upload failed. Try again.");
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <WorkspaceSkeleton />;

    if (notFound) {
        return (
            <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
                <p className="text-lg font-black text-ciel-text">This coursework report doesn&apos;t exist, or isn&apos;t yours.</p>
                <Link href="/dashboard/student/paths/course-project" className="text-sm font-bold text-ciel-gold-deep hover:underline">
                    ← Back to my coursework
                </Link>
            </div>
        );
    }

    const acceptedCount = activeStepIdx.filter((k) => review[k]?.accepted).length;
    const allAccepted = activeStepIdx.length > 0 && acceptedCount === activeStepIdx.length;
    // Accepting a section's summary doesn't itself validate its underlying fields — a few load-bearing
    // ones are checked explicitly so a card can't reach faculty missing its title, its SDG stance, or
    // any honest read of how integrated the sustainability angle actually was.
    const hasSdgStance = !!(entry.sdgMapping?.entries?.length || entry.sdgMapping?.notApplicable);
    const hasIntegrationLevel = !!(entry.reflectionInfo?.integrationLevel || entry.reflectionInfo?.sdgLinkHonesty);
    const missingRequiredFields = !entry.course?.trim() || !entry.projectTitle?.trim() || !hasSdgStance || !hasIntegrationLevel;
    const finalSectionSummaries = (): CourseProjectSectionSummaries => {
        const out: CourseProjectSectionSummaries = {};
        for (const key of activeStepIdx) out[key] = review[key]?.text ?? stripBoldMarkup(sums[key] || "");
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

    const isOwner = entry.isOwner !== false;
    const statusChip = courseworkStatusLabel(entry);
    const showCard = entry.status === "submitted" && !editing;
    const teamMode = entry.studentInfo?.teamMode ?? "";
    // Legacy entries may still say "Solo" instead of "Individual" — treat both as not-a-team.
    const isTeam = !!teamMode && !/^(individual|solo)$/i.test(teamMode);
    const allFormats = entry.assignmentInfo?.formats ?? (entry.assignmentInfo?.format ? [entry.assignmentInfo.format] : []);
    const primaryFormat = allFormats[0];
    const routesIn = Array.from(new Set(allFormats.map((f) => FORMAT_ROUTE[f] || "writer")));
    const leadRoute = entry.assignmentInfo?.leadRoute;
    const leadRouteValid = leadRoute && (routesIn as string[]).includes(leadRoute) ? (leadRoute as CourseProjectRoute) : undefined;
    const route = leadRouteValid ?? (primaryFormat ? FORMAT_ROUTE[primaryFormat] || "writer" : undefined);
    const routeMode = route ? COURSEWORK_MODES[route] : undefined;
    const blended = routesIn.length > 1;
    const stepLabels = STEPS.map((s, i) => (routeMode && i >= 2 && i <= 4 ? routeMode.steps[i - 2] : s.label));

    const primarySdg = entry.sdgMapping?.entries?.[0];
    const supportingSdgs = entry.sdgMapping?.entries?.slice(1) ?? [];
    const metricLines = (entry.resultsInfo?.metrics ?? []).map(courseProjectMetricLine).filter(Boolean);
    const snapshotRows: [string, string][] = [
        ["Course", [entry.course, entry.studentInfo?.programme, entry.studentInfo?.semester].filter(Boolean).join(" · ") || "—"],
        ["Coursework", [entry.projectTitle, allFormats.join(" + "), teamMode].filter(Boolean).join(" · ") || "—"],
        ["Format", allFormats.join(" + ") || "—"],
        ["Aim", entry.aimsInfo?.aimStatement || (inc.aim === false ? "Not applicable to this format" : "—")],
        ["Activities", (entry.processInfo?.activities ?? []).join(" · ") || "—"],
        ["Main output", entry.resultsInfo?.outputDescription || "—"],
        ["Key insight", entry.resultsInfo?.findings?.[0] || "—"],
        [
            "Evidence status",
            metricLines.join(" · ") ||
              entry.resultsInfo?.evidenceStatus ||
              (/Yes|Partly/.test(entry.resultsInfo?.measured ?? "") ? "—" : entry.resultsInfo?.measured ? "Findings only — no measured result claimed" : "—"),
        ],
        ["Limitation", entry.resultsInfo?.limitationType || "—"],
        [
            "Primary SDG",
            entry.sdgMapping?.notApplicable
                ? "➖ Not applicable — honestly declared, flagged for teacher confirmation"
                : primarySdg
                  ? `SDG ${primarySdg.goalNumber}${primarySdg.targets?.length ? ` · ${primarySdg.targets.join(", ")}` : ""}`
                  : "—",
        ],
        ["Supporting SDGs", entry.sdgMapping?.notApplicable ? "—" : supportingSdgs.map((e) => `SDG ${e.goalNumber} (${e.strength || "supporting"})`).join(" · ") || "—"],
        ["Sustainability integration", entry.reflectionInfo?.integrationLevel || entry.reflectionInfo?.sdgLinkHonesty || "Not answered yet"],
        [
            "Attachment",
            entry.assignmentFileUrl
                ? `📎 Assignment attached (+ supporting files: ${entry.evidenceUrls?.length ? "yes" : "no"}) — private, reviewer-visible`
                : "None — optional, but it lifts your Verifiability score",
        ],
        ["Instructor", [entry.studentInfo?.teacherName, entry.studentInfo?.teacherEmail].filter(Boolean).join(" · ") || "—"],
    ];

    return (
        <div className="mx-auto max-w-[1040px] pb-16">
            <CourseworkCrumb role="Student" view="Build project" />
            <CourseworkHero
                kicker="MY PATHS · COURSEWORK"
                title="Build project"
                subtitle="Fill each section. Your draft saves as you go — faculty only sees this after you submit."
                gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#12a5a0 110%)"
                stats={[
                    { value: statusChip.label, label: "STATUS" },
                    { value: `${entry.stepCompleted}/8`, label: "STEPS COMPLETE" },
                ]}
            />
            <div className="mt-5">
                <HubBackButton href="/dashboard/student/paths/course-project" label="← Back to my coursework" />
            </div>

            {showCard ? (
                <div className="space-y-4">
                    {!isOwner && (
                        <div className="rounded-ciel-sm border border-ciel-indigo-soft bg-ciel-indigo-soft/60 px-4 py-2 text-xs font-semibold leading-relaxed text-ciel-indigo">
                            Team report led by {entry.studentInfo?.studentName || "a teammate"} — you can view and edit the same file.
                        </div>
                    )}
                    <CourseworkCard entry={entry} defaultOpen studentReminder={entry.status === "submitted" ? "faculty" : "team"} />
                    <button
                        type="button"
                        onClick={() => {
                            setStep(0);
                            setEditing(true);
                        }}
                        className="ciel-transition rounded-ciel-sm border border-ciel-border px-4 py-2.5 text-sm font-bold text-ciel-text-mid hover:border-ciel-gold/40"
                    >
                        Edit this report
                    </button>
                </div>
            ) : null}

            {!showCard && (
            <>
                {!isOwner && (
                    <div className="mb-4 rounded-ciel-sm border border-ciel-indigo-soft bg-ciel-indigo-soft/60 px-4 py-2 text-xs font-semibold leading-relaxed text-ciel-indigo">
                        Shared team report — you and {entry.studentInfo?.studentName || "your teammates"} can all edit this same file.
                    </div>
                )}
                {entry.facultyApprovalStatus !== "approved" && entry.facultyApprovalNote ? (
                    <div className="mb-4 rounded-ciel-sm border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                        <b>{courseworkStatusLabel(entry).label} by {entry.studentInfo?.teacherName || "your supervisor"}.</b>{" "}
                        {entry.facultyApprovalNote} Fix and resubmit — nothing is penalised.
                    </div>
                ) : null}
                <div className="mb-[18px]">
                    <div className="flex gap-1 overflow-x-auto py-[7px] pl-1 [scrollbar-width:thin]">
                        {STEPS.map((s, i) => {
                            const isCurrent = i === step;
                            const isDone = i < entry.stepCompleted && !isCurrent;
                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => setStep(i)}
                                    title={stepLabels[i]}
                                    className={clsx(
                                        "relative min-w-16 flex-1 rounded-[11px] border px-1 py-[7px] text-center ciel-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
                                        isCurrent
                                            ? "border-[#d5aa46] bg-black text-white shadow-[inset_0_0_0_1px_#d5aa46]"
                                            : isDone
                                              ? "border-black bg-black text-white"
                                              : "border-black bg-black text-white/70 hover:text-white",
                                    )}
                                >
                                    <div className="text-sm leading-none">{isDone ? "✓" : s.emoji}</div>
                                    <div
                                        className={clsx(
                                            "mt-0.5 text-[9px] font-extrabold uppercase leading-tight tracking-wide",
                                            isCurrent ? "text-white" : "text-white/75",
                                        )}
                                    >
                                        {stepLabels[i]}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
                <div className="space-y-5">
                    {step === 0 && (
                        <>
                            <Field label="Your name">
                                <input type="text" value={entry.studentInfo?.studentName ?? ""} onChange={(e) => patchGroup("studentInfo", { studentName: e.target.value })} className={fieldClass} />
                            </Field>
                            <Field label="Roll no.">
                                <input type="text" value={entry.studentInfo?.rollNumber ?? ""} onChange={(e) => patchGroup("studentInfo", { rollNumber: e.target.value })} placeholder="F2023-1234" className={fieldClass} />
                            </Field>
                            <Field label="Your email">
                                <input type="email" value={entry.studentInfo?.studentEmail ?? ""} onChange={(e) => patchGroup("studentInfo", { studentEmail: e.target.value })} placeholder="you@university.edu.pk" className={fieldClass} />
                            </Field>
                            <Field label="Course name">
                                <input type="text" value={entry.course ?? ""} onChange={(e) => setEntry((s) => ({ ...s, course: e.target.value }))} placeholder="e.g. Marketing Management" className={fieldClass} />
                            </Field>
                            <Field label="Programme" hint="Pick from HEC undergraduate programmes — or type your own.">
                                <SearchableSelect value={entry.studentInfo?.programme ?? ""} onChange={(v) => patchGroup("studentInfo", { programme: v })} options={hecPrograms} placeholder="Start typing — e.g. BBA" />
                            </Field>
                            <Field label="University">
                                <SearchableSelect value={entry.studentInfo?.universityName ?? ""} onChange={(v) => patchGroup("studentInfo", { universityName: v })} options={pakistaniUniversities} placeholder="Type your university" />
                            </Field>
                            <Field label="Discipline" hint="Broad field of study — Programme above is the specific degree title.">
                                <SearchableSelect value={entry.studentInfo?.disciplineName ?? ""} onChange={(v) => patchGroup("studentInfo", { disciplineName: v })} options={DISCIPLINE_OPTIONS} placeholder="e.g. Business & Management" />
                            </Field>
                            <Field label="Semester">
                                <div className="relative">
                                    <select value={semesterSelectValue(entry.studentInfo?.semester)} onChange={(e) => patchGroup("studentInfo", { semester: e.target.value })} className={clsx(fieldClass, "appearance-none pr-9")}>
                                        <option value="">Select…</option>
                                        {SEMESTER_OPTIONS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ciel-text-soft" />
                                </div>
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
                                <Field label="👥 Team members — name everyone" hint="Add each teammate's email — we'll email them a confirmation link. Once they accept, this report appears on their dashboard too.">
                                    <div className="space-y-3">
                                        {(normalizeGroupMembers(entry.studentInfo?.groupMembers).length ? normalizeGroupMembers(entry.studentInfo?.groupMembers) : [{ name: "" }]).map((m, i) => (
                                            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                                <input
                                                    type="text"
                                                    value={m.name}
                                                    onChange={(e) => updateGroupMember(i, { name: e.target.value })}
                                                    placeholder={`Member ${i + 1} — full name`}
                                                    className={fieldClass}
                                                />
                                                <input
                                                    type="text"
                                                    value={m.rollNumber ?? ""}
                                                    onChange={(e) => updateGroupMember(i, { rollNumber: e.target.value })}
                                                    placeholder={`Member ${i + 1} — roll no.`}
                                                    className={fieldClass}
                                                />
                                                <input
                                                    type="email"
                                                    value={m.email ?? ""}
                                                    onChange={(e) => updateGroupMember(i, { email: e.target.value })}
                                                    placeholder="Email — confirmation link sent here"
                                                    className={fieldClass}
                                                />
                                                <TeamInviteBadge kind="course_project" entryId={entry.id} email={m.email} inviteStatus={m.inviteStatus} />
                                            </div>
                                        ))}
                                        {(entry.studentInfo?.groupMembers?.length ?? 0) < 20 && (
                                            <button
                                                type="button"
                                                onClick={() => patchGroup("studentInfo", { groupMembers: [...normalizeGroupMembers(entry.studentInfo?.groupMembers), { name: "" }] })}
                                                className="text-xs font-bold text-ciel-gold-deep hover:underline"
                                            >
                                                + Add another member
                                            </button>
                                        )}
                                        <div className="flex flex-wrap items-center gap-1.5 rounded-ciel-sm border border-ciel-teal/30 bg-ciel-teal-soft/60 px-3 py-2.5 text-[10px] font-black text-ciel-teal">
                                            🔗 <span className="rounded-full bg-white px-2.5 py-1">🃏 Card created</span>→<span className="rounded-full bg-white px-2.5 py-1">👥 On every member&apos;s dashboard (once submitted)</span>→<span className="rounded-full bg-white px-2.5 py-1">🖋️ Teacher&apos;s approval in her dashboard</span>→<span className="rounded-full bg-white px-2.5 py-1">🧑‍🎓 + 🧑‍🏫 + 🏫 profiles</span>
                                        </div>
                                    </div>
                                </Field>
                            )}
                            <Field label="➕ Anything else about you or the course?">
                                <textarea rows={2} value={entry.studentInfo?.notes ?? ""} onChange={(e) => patchGroup("studentInfo", { notes: e.target.value })} placeholder="Anything you'd like on the record…" className={fieldClass} />
                            </Field>
                            <SectionSummaryBox text={sums.course} />
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
                            {routeMode && (
                                <div className="rounded-ciel-sm border-2 border-ciel-indigo/30 bg-ciel-indigo-soft/50 px-4 py-3 text-xs font-semibold leading-relaxed text-ciel-indigo">
                                    🧬 <b>{routeMode.name}</b>{leadRouteValid ? " — you chose this to lead" : <> — led by your first pick, <b>{primaryFormat}</b></>}. The questions ahead now speak this language; adjust the tiles below if your work differs.
                                    {blended && (
                                        <>
                                            <br />🔀 <b>You picked formats from {routesIn.length} pathways.</b> The <b>main deliverable</b> should lead (the essay leads an essay-with-presentation; the slides are just how you shared it). Tap to choose:
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                {routesIn.map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => patchGroup("assignmentInfo", { leadRoute: r })}
                                                        className={clsx(
                                                            "ciel-transition rounded-full border-2 px-3 py-1.5 text-[10.5px] font-bold",
                                                            r === route ? "border-ciel-gold bg-ciel-gold-soft text-ciel-gold-deep" : "border-ciel-border bg-white text-ciel-text-mid hover:border-ciel-gold/40",
                                                        )}
                                                    >
                                                        {COURSEWORK_MODES[r as CourseProjectRoute].name}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {routeMode && (
                                <div>
                                    <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-ciel-gold-deep">🗺️ Your pathway through this form</div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {routeMode.road.map((r, i) => (
                                            <div key={r} className="flex items-center gap-1.5">
                                                <span className="rounded-full border border-ciel-gold-soft bg-ciel-gold-soft/70 px-3 py-1.5 text-[10px] font-bold text-ciel-gold-deep">{r}</span>
                                                {i < routeMode.road.length - 1 && <span className="font-bold text-ciel-border">→</span>}
                                            </div>
                                        ))}
                                    </div>
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
                                                "ciel-transition rounded-[11px] border-[1.5px] px-3 py-3 text-center",
                                                inc[t.key] ? `${t.onClass} shadow-sm ring-2 ring-current/15` : t.idleClass,
                                            )}
                                        >
                                            <span className="block text-[15px] leading-none">{t.emoji}</span>
                                            <span className="mt-1.5 block text-[11px] font-extrabold leading-snug">{t.label}</span>
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
                            <SectionSummaryBox text={sums.assignment} />
                        </>
                    )}

                    {step === 2 && inc.aim === false && (
                        <div className="rounded-ciel-sm border border-dashed border-ciel-green/40 bg-ciel-green-soft/40 px-4 py-3.5 text-sm text-ciel-green-deep">
                            🎯 Your format doesn&apos;t usually need formal aims — <b>skipped.</b> Tap the 🎯 tile in the Format step to bring it back.
                        </div>
                    )}
                    {step === 2 && inc.aim !== false && (
                            <>
                                <Field label={`${routeMode?.aimL ?? "The overall aim"} (one line)`}>
                                    <input type="text" value={entry.aimsInfo?.aimStatement ?? ""} onChange={(e) => patchGroup("aimsInfo", { aimStatement: e.target.value })} placeholder={routeMode?.aimPh ?? "e.g. Develop a practical strategy to reduce cafeteria waste"} className={fieldClass} />
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
                                        <button type="button" onClick={() => patchGroup("aimsInfo", { objectives: [...(entry.aimsInfo?.objectives ?? [""]), ""] })} className="text-xs font-bold text-ciel-gold-deep hover:underline">
                                            + Add another objective
                                        </button>
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
                                <SectionSummaryBox text={sums.aims} />
                            </>
                    )}

                    {step === 3 && (
                        <>
                            {inc.act !== false && (
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
                            {inc.meth !== false && (
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
                            )}
                            <Field label="Scale / scope of the work" hint="Taps only — this is a class assignment, not a PhD; “not applicable” is a complete answer.">
                                <ScaleBuilder value={entry.processInfo?.sampleScale ?? ""} onChange={(v) => patchGroup("processInfo", { sampleScale: v })} />
                            </Field>
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
                            <SectionSummaryBox text={sums.process} />
                        </>
                    )}

                    {step === 4 && (
                        <div className="space-y-5">
                            <div className="flex flex-wrap items-center gap-1.5 rounded-ciel-sm border border-dashed border-ciel-gold/40 bg-ciel-gold-soft/40 px-3.5 py-2.5 text-[10.5px] font-black text-ciel-gold-deep">
                                <span>THE LADDER:</span>
                                <span className="rounded-full bg-white px-2.5 py-1">📦 OUTPUT — what you made</span>→
                                <span className="rounded-full bg-white px-2.5 py-1">💡 FINDING — what you learned</span>→
                                <span className="rounded-full bg-white px-2.5 py-1">📊 RESULT — what you measured</span>→
                                <span className="rounded-full bg-white px-2.5 py-1 opacity-65">🌍 IMPACT — only if real change is evidenced</span>
                                <span className="w-full font-semibold text-ciel-gold-deep/80">Finishing with only the first three is completely legitimate coursework.</span>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-black uppercase tracking-widest text-ciel-text-soft">A · Your output — what did you produce?</p>
                                <Field label="" hint="Tap all that apply.">
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
                                <Field label="Describe the main output in one sentence">
                                    <input type="text" maxLength={250} value={entry.resultsInfo?.outputDescription ?? ""} onChange={(e) => patchGroup("resultsInfo", { outputDescription: e.target.value })} placeholder="What did you create, develop, design, investigate or deliver?" className={fieldClass} />
                                </Field>
                            </div>

                            {inc.find !== false && (
                            <div className="space-y-3">
                                <p className="text-xs font-black uppercase tracking-widest text-ciel-text-soft">B · What you found <span className="normal-case font-semibold text-ciel-text-soft/80">(up to 5 — a finding doesn&apos;t have to be numerical)</span></p>
                                    <Field label={routeMode?.fndL ?? "Most important findings, conclusions or insights"}>
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
                                                    placeholder={i === 0 ? "e.g. Convenience was the main reason students kept using single-use plastic" : "Another…"}
                                                    className={fieldClass}
                                                />
                                            ))}
                                            {(entry.resultsInfo?.findings?.length ?? 0) < 5 && (
                                                <button type="button" onClick={() => patchGroup("resultsInfo", { findings: [...(entry.resultsInfo?.findings ?? [""]), ""] })} className="text-xs font-bold text-ciel-gold-deep hover:underline">
                                                    + Add finding (max 5)
                                                </button>
                                            )}
                                        </div>
                                    </Field>
                            </div>
                            )}

                            {inc.res !== false && (
                            <div className="space-y-3">
                                <p className="text-xs font-black uppercase tracking-widest text-ciel-text-soft">C · Your numbers — did anything countable come out of this work? <span className="font-semibold normal-case tracking-normal text-ciel-text-soft">(most class assignments have one number at most — that&apos;s normal)</span></p>
                                <ChipSingle options={MEASURED_OPTIONS} value={entry.resultsInfo?.measured} onChange={(v) => patchGroup("resultsInfo", { measured: v })} />
                                <p className="text-xs text-ciel-text-soft">💡 &ldquo;Yes&rdquo; means something was really counted or observed — a survey %, a temperature, attendance. A hope or a plan isn&apos;t a result yet, and &ldquo;findings only&rdquo; is an honest, full answer. Each number needs just 3 taps: what, how much, real-or-planned. Everything else is optional.</p>
                                {/Yes|Partly/.test(entry.resultsInfo?.measured ?? "") && (
                                    <MetricsBuilder metrics={entry.resultsInfo?.metrics ?? []} onChange={(next) => patchGroup("resultsInfo", { metrics: next })} />
                                )}
                            </div>
                            )}

                            {inc.lim !== false && (
                            <div className="space-y-3">
                                <p className="text-xs font-black uppercase tracking-widest text-ciel-text-soft">D · Limitations — what could and couldn&apos;t be concluded?</p>
                                    <Field label="Main limitation">
                                        <select
                                            value={LIMITATION_OPTIONS.includes(entry.resultsInfo?.limitationType ?? "") ? entry.resultsInfo?.limitationType : entry.resultsInfo?.limitationType ? "Other — describe below" : ""}
                                            onChange={(e) => patchGroup("resultsInfo", { limitationType: e.target.value })}
                                            className={fieldClass}
                                        >
                                            <option value="">Select the closest…</option>
                                            {LIMITATION_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </Field>
                                    {entry.resultsInfo?.limitationType === "Other — describe below" && (
                                        <Field label="Describe the limitation">
                                            <input type="text" value={entry.resultsInfo?.limitationOther ?? ""} onChange={(e) => patchGroup("resultsInfo", { limitationOther: e.target.value })} placeholder="Describe your limitation" className={fieldClass} />
                                        </Field>
                                    )}
                                    <Field label="Optional — briefly explain the limitation">
                                        <input type="text" value={entry.resultsInfo?.limitationDetail ?? ""} onChange={(e) => patchGroup("resultsInfo", { limitationDetail: e.target.value })} placeholder="e.g. costing based on one supplier's quote" className={fieldClass} />
                                    </Field>
                                    <Field label="How should this limitation be considered when reading your results?" hint="One sentence.">
                                        <input type="text" value={entry.resultsInfo?.limitationInterpretation ?? ""} onChange={(e) => patchGroup("resultsInfo", { limitationInterpretation: e.target.value })} placeholder="e.g. The findings show interest in change but can't confirm actual plastic use decreased" className={fieldClass} />
                                    </Field>
                            </div>
                            )}

                            <div className="space-y-3">
                                <p className="text-xs font-black uppercase tracking-widest text-ciel-text-soft">E · Recommendations — what should happen next? <span className="normal-case font-semibold text-ciel-text-soft/80">(optional, up to 3)</span></p>
                                <div className="space-y-2">
                                    {(entry.resultsInfo?.recommendations ?? [""]).map((r, i) => (
                                        <input
                                            key={i}
                                            type="text"
                                            value={r}
                                            onChange={(e) => {
                                                const next = [...(entry.resultsInfo?.recommendations ?? [""])];
                                                next[i] = e.target.value;
                                                patchGroup("resultsInfo", { recommendations: next });
                                            }}
                                            placeholder={i === 0 ? "e.g. Install refill stations at high-traffic campus locations" : "Another recommendation…"}
                                            className={fieldClass}
                                        />
                                    ))}
                                    {(entry.resultsInfo?.recommendations?.length ?? 0) < 3 && (
                                        <button type="button" onClick={() => patchGroup("resultsInfo", { recommendations: [...(entry.resultsInfo?.recommendations ?? [""]), ""] })} className="text-xs font-bold text-ciel-gold-deep hover:underline">
                                            + Add recommendation (max 3)
                                        </button>
                                    )}
                                </div>
                            </div>

                            <Field label="Summarise your most important result in 2–3 sentences">
                                <textarea rows={3} value={entry.resultsInfo?.resultsSummary ?? ""} onChange={(e) => patchGroup("resultsInfo", { resultsSummary: e.target.value })} placeholder="What you produced or discovered, the strongest evidence, and what the findings suggest…" className={fieldClass} />
                            </Field>
                            <Field label="➕ Anything else about your results?" hint="Optional.">
                                <input type="text" value={entry.resultsInfo?.notes ?? ""} onChange={(e) => patchGroup("resultsInfo", { notes: e.target.value })} placeholder="Only if something important wasn't captured above…" className={fieldClass} />
                            </Field>
                            <SectionSummaryBox text={sums.results} />
                        </div>
                    )}

                    {step === 5 && (
                        <>
                            <SdgStep entry={entry} patchGroup={patchGroup} />
                            <SectionSummaryBox text={sums.sdg} />
                        </>
                    )}

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
                            <SectionSummaryBox text={sums.reflection} />
                        </>
                    )}

                    {step === 7 && (
                        <div className="space-y-5">
                            <div className="rounded-ciel-sm border border-ciel-border bg-white">
                                {snapshotRows.map(([k, val]) => (
                                    <div key={k} className="flex gap-3 border-b border-ciel-border px-4 py-2.5 text-xs leading-relaxed last:border-b-0">
                                        <span className="w-36 shrink-0 text-[10px] font-black uppercase tracking-widest text-ciel-text-soft">{k}</span>
                                        <span className="text-ciel-text">{val}</span>
                                    </div>
                                ))}
                            </div>

                            <Field label="📎 Upload your files" hint="Optional — PDF · DOCX · PPTX · images · links. Files stay with this record for faculty review.">
                                <label className={clsx("ciel-transition flex cursor-pointer items-center gap-3 rounded-ciel-sm border-2 border-dashed px-4 py-3 text-sm font-semibold", entry.assignmentFileUrl ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-gold/50 bg-ciel-gold-soft text-ciel-gold-deep hover:border-ciel-gold", uploading && "opacity-60")}>
                                    <UploadCloud className="h-4 w-4" />
                                    {entry.assignmentFileUrl ? "✅ Assignment uploaded — travels privately with your card" : "📄 Upload your assignment — the essay, deck, design file. Lifts your Verifiability score (+3)."}
                                    <input type="file" accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => e.target.files?.[0] && handleAssignmentFile(e.target.files[0])} />
                                </label>
                                <label className={clsx("ciel-transition mt-2 flex cursor-pointer items-center gap-3 rounded-ciel-sm border-2 border-dashed px-4 py-3 text-sm font-semibold", entry.evidenceUrls?.length ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-gold/50 bg-ciel-gold-soft text-ciel-gold-deep hover:border-ciel-gold", uploading && "opacity-60")}>
                                    <UploadCloud className="h-4 w-4" />
                                    {uploading ? "Uploading..." : entry.evidenceUrls?.length ? "✅ Supporting files uploaded" : "🖼️ Upload supporting files — photos, data, video, survey sheets (+2)."}
                                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleEvidenceFile(e.target.files[0])} />
                                </label>
                                <p className="mt-1.5 text-xs text-ciel-text-soft">🔒 Files stay private — visible to your teacher and reviewers only, never on the public card.</p>
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

                            <Field label="What do the files include?" hint="Tap all that apply.">
                                <ChipGroup
                                    options={EVIDENCE_TYPE_OPTIONS}
                                    selected={entry.evidenceTypes ?? []}
                                    onToggle={(v) => {
                                        const cur = entry.evidenceTypes ?? [];
                                        setEntry((s) => ({ ...s, evidenceTypes: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }));
                                    }}
                                />
                            </Field>

                            <div className="rounded-ciel-sm border border-ciel-border bg-ciel-page/40 p-4 text-[11.5px] leading-relaxed text-ciel-text">
                                <p className="mb-2 text-xs font-black uppercase tracking-widest text-ciel-text-soft">🧮 How your flash card will be judged <span className="normal-case font-semibold text-ciel-text-soft/80">(same rubric for every discipline)</span></p>
                                <p>
                                    <b className="text-[#3F7E44]">Sustainability &amp; SDG quality — 25</b> (genuine, targeted, explained; honest &ldquo;not applicable&rdquo; scores respectably) ·{" "}
                                    <b className="text-[#c98a04]">Substance of results — 20</b> (measured &gt; qualitative &gt; target; depth of evidence earns more, within your pathway) ·{" "}
                                    <b className="text-[#2563eb]">Clarity of the idea — 14</b> ·{" "}
                                    <b className="text-[#0f766e]">Rigor, pathway-adjusted — 13</b> (a deep study and a brief class exercise are judged against their own scale) ·{" "}
                                    <b className="text-[#dc2626]">Honesty &amp; consistency — 15</b> ·{" "}
                                    <b className="text-[#7c3aed]">Reflection — 8</b> ·{" "}
                                    <b className="text-[#0e7490]">Verifiability — 5</b> (attach your actual assignment — optional, but the real work always outranks a claim about it)
                                </p>
                                <p className="mt-1.5 text-[10.5px] text-ciel-text-soft">After your teacher approves, the AI ranks all flash cards best → least on this rubric — with a written reason for every top pick. Depth is rewarded; honesty is never punished.</p>
                            </div>

                            <Field label="➕ Anything the summary missed?">
                                <textarea rows={2} value={entry.addedNote ?? ""} onChange={(e) => setEntry((s) => ({ ...s, addedNote: e.target.value }))} placeholder="e.g. Our essay was selected for the department journal." className={fieldClass} />
                            </Field>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-black text-ciel-text">📤 Your story, in your words</h3>
                                    <button type="button" onClick={regenerateAllReview} className="ciel-transition shrink-0 rounded-ciel-xs border border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-gold/40">
                                        ↻ Regenerate all
                                    </button>
                                </div>
                                <p className="text-xs text-ciel-text-soft">🗣️ Everything below is assembled <b>from what you wrote — in your voice, not the computer&apos;s</b>. Read it as your teacher will; edit any section until it sounds like you. Accept each, edit inline, or reset — your teacher sees only what you approve.</p>

                                <div className="flex items-center gap-3">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ciel-border">
                                        <div className="h-full rounded-full bg-ciel-green transition-all" style={{ width: `${(acceptedCount / Math.max(1, activeStepIdx.length)) * 100}%` }} />
                                    </div>
                                    <span className="shrink-0 text-xs font-bold text-ciel-text-soft">{acceptedCount} of {activeStepIdx.length} accepted</span>
                                </div>

                                {activeStepIdx.map((key) => {
                                    const meta = SECTION_LABELS[key];
                                    const r = review[key] ?? { accepted: false, edited: false, text: stripBoldMarkup(sums[key] || "") };
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
                                                className="w-full resize-none bg-white p-4 text-sm leading-relaxed text-ciel-text outline-none focus-visible:ring-2 focus-visible:ring-ciel-gold"
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
                                                    onClick={() => setReview((prev) => ({ ...prev, [key]: { accepted: false, edited: false, text: stripBoldMarkup(sums[key] || "") } }))}
                                                    className="ciel-transition rounded-ciel-xs border-2 border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-gold/40"
                                                >
                                                    ↻ Reset to auto-drafted version
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!allAccepted && <p className="text-xs font-semibold text-ciel-text-soft">Accept every section above to unlock submission.</p>}
                            </div>

                            <label className="flex items-start gap-3 rounded-ciel-sm border border-ciel-gold/40 bg-ciel-gold-soft/50 px-4 py-3 text-xs leading-relaxed text-ciel-gold-deep">
                                <input
                                    type="checkbox"
                                    checked={declarationChecked}
                                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                                    className="mt-0.5 h-[18px] w-[18px] shrink-0"
                                />
                                <span>
                                    <b>Final declaration:</b> I confirm this accurately represents the coursework completed. Any targets,
                                    estimates or projected outcomes are identified as such and not presented as measured results.
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                {error && <p className="mt-4 text-xs font-semibold text-red-600">{error}</p>}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-36">
                    <button
                        type="button"
                        disabled={step === 0}
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        className="ciel-transition rounded-ciel-sm border border-ciel-border px-4 py-2.5 text-sm font-bold text-ciel-text-mid hover:border-ciel-gold/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-gold"
                    >
                        Back
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                        {step < 7 ? (
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => save(saveAllFields(), step + 1)}
                                className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-gold focus-visible:ring-offset-2"
                            >
                                {saving ? "Saving..." : "Save & continue"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={saving || !allAccepted || !declarationChecked || missingRequiredFields}
                                title={
                                    !allAccepted
                                        ? "Accept every section above first"
                                        : missingRequiredFields
                                          ? "Go back and fill in the course name, title, SDG stance and sustainability integration level first"
                                          : !declarationChecked
                                            ? "Confirm the final declaration first"
                                            : undefined
                                }
                                onClick={async () => {
                                    await save({ ...saveAllFields(), status: "submitted", sectionSummaries: finalSectionSummaries() }, 8);
                                    router.push("/dashboard/student/paths/course-project");
                                }}
                                className="ciel-transition rounded-ciel-sm bg-ciel-gold px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-gold/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-gold focus-visible:ring-offset-2"
                            >
                                {saving ? "Submitting..." : "Submit project"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            </>
            )}
        </div>
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
                                                        p.targets.includes(t.id) ? "border-ciel-gold bg-ciel-gold-soft text-ciel-gold-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-gold/40",
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
                                                        (p.strength || (i === 0 ? "Direct" : "Supporting")) === s ? "border-ciel-gold bg-ciel-gold-soft text-ciel-gold-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-gold/40",
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

            <label className="flex cursor-pointer items-start gap-2.5 rounded-ciel-sm border border-dashed border-ciel-gold/50 bg-ciel-gold-soft/40 px-4 py-3 text-xs leading-relaxed text-ciel-gold-deep">
                <input
                    type="checkbox"
                    checked={!!entry.sdgMapping?.notApplicable}
                    onChange={(e) => {
                        const checked = e.target.checked;
                        patchGroup("sdgMapping", { notApplicable: checked, ...(checked ? { entries: [] } : {}) });
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span><b>➖ Not applicable — this assignment has no genuine SDG link.</b> A completely acceptable answer: it&apos;s flagged for your teacher&apos;s confirmation instead of force-mapped, and the record still counts fully.</span>
            </label>
        </>
    );
}
