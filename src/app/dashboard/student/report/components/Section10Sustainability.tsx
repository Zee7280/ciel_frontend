import React, { useMemo, useEffect } from "react";
import { Lock } from "lucide-react";
import { Label } from "./ui/label";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import { countWords } from "../utils/validation";
import { sumNonRejectedLoggedHours } from "../utils/engagementMetrics";
import { resolveReportCii } from "../utils/resolveReportCii";

const NO_MECHANISM = "No continuation mechanism";
const OTHER_MECHANISM = "Other";

const continuationOptions = [
    { id: "yes", emoji: "🌿", label: "Yes", desc: "Likely to continue independently." },
    { id: "partially", emoji: "♻️", label: "Partial", desc: "Some elements continue with support." },
    { id: "no", emoji: "⏸️", label: "No", desc: "Will not continue without further action." },
];

const ladderOptions = [
    { id: "no", emoji: "⏸️", title: "Stops when we leave", desc: "Honest and fine — say what would be needed." },
    { id: "partially", emoji: "♻️", title: "Partly continues", desc: "Some elements live on with support." },
    { id: "yes", emoji: "🌿", title: "Continues on its own", desc: "Named owner + handover mechanism." },
];

const mechanismOptions: { id: string; label: string; aliases?: string[] }[] = [
    { id: "Partner-led continuation", label: "🛡️ Partner-led continuation" },
    { id: "Community ownership", label: "🌐 Community ownership" },
    { id: "Institutional integration (course or program linkage)", label: "📚 Institutional integration", aliases: ["Institutional integration"] },
    { id: "Resource handover (materials/tools transferred)", label: "🧰 Resource handover", aliases: ["Resource handover"] },
    { id: "Policy or system change", label: "⚖️ Policy or system change" },
    { id: "Funding secured", label: "⚡ Funding secured" },
    { id: "Follow-up plan scheduled", label: "📆 Follow-up plan scheduled" },
    { id: NO_MECHANISM, label: "🚫 No continuation mechanism" },
    { id: OTHER_MECHANISM, label: "✏️ Other" },
];

const scalingOptions: { id: string; label: string; aliases?: string[] }[] = [
    { id: "Not scalable", label: "⏹️ Not scalable" },
    { id: "Scalable within institution", label: "🏫 Scalable within institution" },
    { id: "Scalable to other communities", label: "🌍 Scalable to other communities" },
    { id: "Scalable at policy or government level", label: "🏛️ Scalable at policy level", aliases: ["Scalable at policy level"] },
];

const policyOptions: { id: string; label: string; aliases?: string[] }[] = [
    { id: "No", label: "➖ No" },
    { id: "Yes — Internal institutional level", label: "🏫 Yes — institutional level", aliases: ["Yes — institutional level"] },
    { id: "Yes — Community level", label: "🌐 Yes — community level", aliases: ["Yes — community level"] },
    { id: "Yes — Policy / Government level", label: "🏛️ Yes — policy level", aliases: ["Yes — policy level"] },
];

function choiceOn(selected: string | string[] | undefined, id: string, label: string, aliases: string[] = []) {
    const values = Array.isArray(selected) ? selected : selected ? [selected] : [];
    const keys = new Set([id, label, ...aliases]);
    return values.some((value) => keys.has(value));
}

const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

export default function Section10Sustainability() {
    const { data, updateSection, getFieldError, isEligibleForSubmission, incompleteSectionsSummary } = useReportForm();
    const { section10 } = data;
    const {
        continuation_status,
        continuation_details,
        mechanisms,
        scaling_potential,
        policy_influence,
        mechanism_other = "",
    } = section10;
    const continuationWords = countWords(continuation_details || "");
    const detailsInRange = continuationWords >= 60 && continuationWords <= 120;

    const update = (field: string, val: unknown) => updateSection("section10", { [field]: val });

    const toggleMechanism = (item: string) => {
        const option = mechanismOptions.find((entry) => entry.id === item);
        const current = mechanisms || [];
        const on = choiceOn(current, item, option?.label || item, option?.aliases);
        const drop = (value: string) => choiceOn([value], item, option?.label || item, option?.aliases)
            || choiceOn([value], NO_MECHANISM, "🚫 No continuation mechanism");
        if (item === NO_MECHANISM) {
            update("mechanisms", on ? current.filter((value) => !choiceOn([value], NO_MECHANISM, "🚫 No continuation mechanism")) : [item]);
            return;
        }
        const next = current.filter((value) => !drop(value));
        update("mechanisms", on ? next.filter((value) => !choiceOn([value], item, option?.label || item, option?.aliases)) : [...next, item]);
    };

    const autoNarrative = useMemo(() => {
        if (!continuation_status) return "Sustainability statement will generate once project details are selected.";

        const statusMap = {
            yes: "sustainable, with independently ongoing impact expected",
            partially: "partially sustainable, requiring some follow-up support",
            no: "completed as a one-off objective cycle with limited independent continuation",
        };
        const statusText = statusMap[continuation_status as keyof typeof statusMap];

        const mechStr =
            (mechanisms?.length || 0) > 0 && !mechanisms?.includes("No continuation mechanism")
                ? ` Continuation depends on ${mechanisms[0].toLowerCase()}${mechanisms.length > 1 ? " and associated mechanisms" : ""}.`
                : " No structural continuation mechanisms were established.";

        const scalingStr =
            scaling_potential && scaling_potential !== "Not scalable"
                ? ` Scaling potential has been identified at the ${scaling_potential.replace("Scalable ", "").replace("at ", "")} level.`
                : "";

        return `The project is classified as ${statusText}.${mechStr}${scalingStr}`;
    }, [continuation_status, mechanisms, scaling_potential]);

    useEffect(() => {
        if (section10.summary_text !== autoNarrative) {
            updateSection("section10", { summary_text: autoNarrative });
        }
    }, [autoNarrative, section10.summary_text, updateSection]);

    const loggedHours = sumNonRejectedLoggedHours(data.section1.attendance_logs || []);
    const requiredHours = data.required_hours || 16;

    if (!isEligibleForSubmission) {
        return (
            <div className="mx-auto max-w-6xl pb-10">
                <div className="mx-auto max-w-md space-y-5 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gold-soft)] text-[var(--gold)]">
                        <Lock className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-900">Section locked</h3>
                        <p className="text-sm leading-relaxed text-slate-500">
                            Sustainability analysis activates once the{" "}
                            <span className="font-semibold text-[var(--teal)]">{requiredHours}-hour minimum</span>{" "}
                            is logged. Complete your attendance logs in Section 1 to unlock this step. Faculty reviews the flash card after you submit.
                        </p>
                    </div>
                    <div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full bg-[var(--gold)]"
                                style={{
                                    width: `${Math.min((loggedHours / Math.max(requiredHours, 1)) * 100, 100)}%`,
                                }}
                            />
                        </div>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Current progress: {loggedHours} / {requiredHours} hours
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const legacyMechanisms = (mechanisms || []).filter(
        (value) => !mechanismOptions.some((opt) => choiceOn([value], opt.id, opt.label, opt.aliases)),
    );
    const otherMechanismOn = choiceOn(mechanisms, OTHER_MECHANISM, "✏️ Other");

    return (
        <div className="mx-auto max-w-6xl space-y-3 pb-10">
            <div className="rounded-xl border border-[#cbe7e3] bg-[#f5fbfa] px-4 py-3 text-sm leading-relaxed text-slate-700">
                <b>Not all projects are sustainable — that’s okay to say.</b> The rubric rewards accuracy, not optimism.
            </div>

            <section className="cer-card space-y-4">
                <div className="cer-secl">
                    <span className="cer-secn">9.1</span>
                    <h3>Will the impact continue after you?</h3>
                    <span className="cer-tag">Required</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {continuationOptions.map((opt) => {
                        const active = continuation_status === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => update("continuation_status", opt.id)}
                                className={clsx(
                                    "rounded-xl border-2 p-5 text-center transition-colors",
                                    active
                                        ? "border-[#0f9d79] bg-[#eefaf6] shadow-sm"
                                        : "border-slate-200 bg-white hover:border-[#0f9d79]/40",
                                )}
                            >
                                <p className="text-2xl">{opt.emoji}</p>
                                <p className="mt-2 text-sm font-semibold text-slate-900">{opt.label}</p>
                                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{opt.desc}</p>
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {ladderOptions.map((step) => {
                        const active = continuation_status === step.id;
                        return (
                            <div
                                key={step.id}
                                className={clsx(
                                    "rounded-xl border px-3 py-3 text-sm",
                                    active ? "border-[#0f9d79] bg-[#eefaf6]" : "border-slate-200 bg-white",
                                )}
                            >
                                <p className="font-semibold text-slate-900">{step.emoji} {step.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.desc}</p>
                            </div>
                        );
                    })}
                </div>
                <FieldError message={getFieldError("continuation_status")} />
            </section>

            <section className="cer-card space-y-4">
                <div className="cer-secl">
                    <span className="cer-secn">9.2</span>
                    <h3>What continues, what stops?</h3>
                    <span className="cer-tag">Mandatory · 60–120 words</span>
                </div>
                <p className="cer-hint">What will continue? What may stop? What support is required (funding, training, equipment, policy)?</p>
                <textarea
                    className="cer-input min-h-[96px]"
                    placeholder="e.g. The renovated classroom stays in daily use — that continues on its own. Weekly tutoring stops unless SOS staff take it over; we handed over session plans and trained two staff members…"
                    value={continuation_details}
                    onChange={(e) => update("continuation_details", e.target.value)}
                />
                <p className={clsx("cer-wc", detailsInRange && "ok")}>{continuationWords} WORDS · TARGET 60–120</p>
                <FieldError message={getFieldError("continuation_details")} />
            </section>

            <section className="cer-card space-y-4">
                <div className="cer-secl">
                    <span className="cer-secn">9.3</span>
                    <h3>What keeps it alive?</h3>
                    <span className="cer-tag">Multi-select · required</span>
                </div>
                <div className="cer-chips">
                    {mechanismOptions.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleMechanism(opt.id)}
                            className={clsx("cer-chip", choiceOn(mechanisms, opt.id, opt.label, opt.aliases) && "on")}
                        >
                            {opt.label}
                        </button>
                    ))}
                    {legacyMechanisms.map((value) => (
                        <button key={value} type="button" className="cer-chip on" onClick={() => toggleMechanism(value)}>
                            {value}
                        </button>
                    ))}
                </div>
                {otherMechanismOn ? (
                    <input
                        className="cer-input"
                        placeholder="What else keeps it going?"
                        value={mechanism_other}
                        onChange={(e) => update("mechanism_other", e.target.value)}
                    />
                ) : null}
                <FieldError message={getFieldError("mechanisms")} />
                <FieldError message={getFieldError("mechanism_other")} />
            </section>

            <section className="cer-card space-y-4">
                <div className="cer-secl">
                    <span className="cer-secn">9.4</span>
                    <h3>Scaling &amp; system influence</h3>
                    <span className="cer-tag">Required</span>
                </div>
                <div>
                    <Label className={fieldLabel}>Scaling potential</Label>
                    <div className="cer-chips mt-2">
                        {scalingOptions.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => update("scaling_potential", opt.id)}
                                className={clsx("cer-chip", choiceOn(scaling_potential, opt.id, opt.label, opt.aliases) && "on")}
                            >
                                {opt.label}
                            </button>
                        ))}
                        {scaling_potential && !scalingOptions.some((opt) => choiceOn(scaling_potential, opt.id, opt.label, opt.aliases)) ? (
                            <button type="button" className="cer-chip on" onClick={() => update("scaling_potential", scaling_potential)}>
                                {scaling_potential}
                            </button>
                        ) : null}
                    </div>
                    <FieldError message={getFieldError("scaling_potential")} />
                </div>
                <div>
                    <Label className={fieldLabel}>Did this project influence any long-term system?</Label>
                    <div className="cer-chips mt-2">
                        {policyOptions.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => update("policy_influence", opt.id)}
                                className={clsx("cer-chip", choiceOn(policy_influence, opt.id, opt.label, opt.aliases) && "on")}
                            >
                                {opt.label}
                            </button>
                        ))}
                        {policy_influence && !policyOptions.some((opt) => choiceOn(policy_influence, opt.id, opt.label, opt.aliases)) ? (
                            <button type="button" className="cer-chip on" onClick={() => update("policy_influence", policy_influence)}>
                                {policy_influence}
                            </button>
                        ) : null}
                    </div>
                    <FieldError message={getFieldError("policy_influence")} />
                </div>
            </section>

            <ConsistencyReview data={data} gaps={incompleteSectionsSummary} />
            <ReportTravelCard />
        </div>
    );
}

function ConsistencyReview({
    data,
    gaps,
}: {
    data: ReturnType<typeof useReportForm>["data"];
    gaps: Array<{ section: number; label: string }>;
}) {
    const cii = resolveReportCii(data);
    const score = Math.round(cii.totalScore);
    const hold = gaps.length > 0;
    return (
        <section className="cer-card space-y-3" style={{ border: "2px solid #e2d9f7" }}>
            <div className="cer-secl">
                <span className="cer-secn">9.6</span>
                <h3>Automated consistency review</h3>
                <span className="cer-tag auto">Auto — updates live</span>
            </div>
            <p className="cer-sub">
                This is the same reading the flashcard and the detailed report use for the CII score. It does not create a second score.
            </p>
            <div className="rounded-xl border border-[#d7c8f5] bg-[#faf8ff] px-4 py-3">
                <p className="text-sm font-extrabold text-[#3b2a6d]">
                    {hold ? "Hold CII · required corrections" : cii.official ? "CII on record" : "CII input ready"} · {score}/100
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {cii.source === "faculty_locked"
                        ? "Faculty has locked this total. The flashcard and the detailed report both show it."
                        : cii.source === "submitted_snapshot"
                          ? "This is the score saved when the report was submitted. Both views print this number."
                          : "Live preview from the answers on this report. It becomes the saved score at submit."}
                </p>
                {hold ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                        {gaps.slice(0, 8).map((gap) => (
                            <li key={gap.section}>{gap.label}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-xs text-slate-600">No missing required section. Faculty still checks evidence quality.</p>
                )}
            </div>
        </section>
    );
}

function ReportTravelCard() {
    const stops = [
        ["⭐＋📄", "1 · Flashcard + detailed report", "Both are built from this report. Nothing is re-typed, and both carry the same CII."],
        ["🧑‍🏫", "2 · Faculty approves — once", "One review of the flashcard and the detailed report. That locks the official CII."],
        ["📬", "3 · Who receives what", "You keep the flashcard and the full report. University, partner and HEC receive the flashcard. CIEL PK archives the detailed report."],
    ];
    return (
        <section className="cer-card space-y-3">
            <div className="cer-secl">
                <span className="cer-secn">9.7</span>
                <h3>Where your report travels</h3>
                <span className="cer-tag auto">Who gets what</span>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
                {stops.map(([icon, title, text]) => (
                    <div key={title} className="rounded-xl border border-slate-200 bg-[#f5fbfa] px-3 py-3">
                        <div className="text-base">{icon}</div>
                        <b className="mt-1 block text-xs text-slate-900">{title}</b>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{text}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
