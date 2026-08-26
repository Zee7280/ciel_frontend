import React, { useMemo, useEffect, useRef } from "react";
import {
    Leaf, Recycle, TrendingUp, Info, Lock,
} from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";
import { REPORT_TEXT_RANGE_LABEL, countWords, reportTextWordMeter } from "../utils/validation";

// ─── Static configuration ───────────────────────────────────────────────────
const continuationOptions = [
    { id: "yes", emoji: "🌳", label: "Yes, on its own", desc: "It runs without us now" },
    { id: "partially", emoji: "🌿", label: "Partly", desc: "Some parts continue, some need support" },
    { id: "no", emoji: "🍂", label: "Not really", desc: "It needs someone to keep it going" },
];

const mechanismOptions = [
    { id: "Partner-led continuation", label: "🤝 Partner is taking it over" },
    { id: "Community ownership", label: "🏘️ Community owns it now" },
    { id: "Institutional integration (course or program linkage)", label: "🎓 It's part of a course / program now" },
    { id: "Resource handover (materials/tools transferred)", label: "📦 We handed over materials & tools" },
    { id: "Funding secured", label: "💵 Funding is secured" },
    { id: "Follow-up plan scheduled", label: "🗓️ Follow-up visit planned" },
    { id: "Policy or system change", label: "📜 A rule / policy changed" },
    { id: "No continuation mechanism", label: "🤷 Nothing in place (honest!)" },
];

const scalingOptions = [
    { id: "Not scalable", label: "Not really" },
    { id: "Scalable within institution", label: "In our university" },
    { id: "Scalable to other communities", label: "Other communities" },
    { id: "Scalable at policy or government level", label: "Policy level" },
];

const policyOptions = [
    { id: "No", label: "No" },
    { id: "Yes — Internal institutional level", label: "In the partner org" },
    { id: "Yes — Community level", label: "In the community" },
    { id: "Yes — Policy / Government level", label: "Government / policy" },
];

const textareaClasses =
    "min-h-[140px] w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const badgeMandatory =
    "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700";
const badgeRequired =
    "shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600";

function StepHeader({
    n,
    title,
    status,
}: {
    n: string;
    title: string;
    status?: "mandatory" | "required";
}) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                {n}
            </span>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {status ? (
                <span className={clsx(status === "mandatory" ? badgeMandatory : badgeRequired, "ml-auto")}>
                    {status === "mandatory" ? "Mandatory" : "Required"}
                </span>
            ) : null}
        </div>
    );
}

export default function Section10Sustainability() {
    const { data, updateSection, getFieldError, isEligibleForSubmission } = useReportForm();
    const { section10 } = data;
    const {
        continuation_status,
        continuation_details,
        mechanisms,
        scaling_potential,
        policy_influence,
        continuation_keep_going = "",
        continuation_risk = "",
    } = section10;
    const continuationWords = countWords(continuation_details || "");
    const continuationMeter = reportTextWordMeter(continuationWords);

    const update = (field: string, val: unknown) => updateSection("section10", { [field]: val });

    const toggleMechanism = (item: string) => {
        const current = mechanisms || [];
        if (item === "No continuation mechanism") {
            update("mechanisms", current.includes(item) ? [] : [item]);
        } else {
            const next = current.includes(item)
                ? current.filter((i) => i !== item)
                : [...current.filter((i) => i !== "No continuation mechanism"), item];
            update("mechanisms", next);
        }
    };

    const OPENERS: Record<string, string> = {
        yes: "The impact of this project is likely to continue independently.",
        partially: "The impact of this project will partly continue.",
        no: "The impact of this project is unlikely to continue without further support.",
    };
    const lowerFirst = (text: string) => {
        const t = (text || "").trim();
        return t ? t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/, "") : "";
    };
    const capFirst = (text: string) => {
        const t = (text || "").trim();
        return t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/\.$/, "") : "";
    };

    /** Tracks the last text WE composed, so a student's hand-edit is never silently overwritten. */
    const lastAutoDetailsRef = useRef("");
    const composeAndUpdate = (fieldPatch: Record<string, unknown>) => {
        const keepGoing = (fieldPatch.continuation_keep_going as string | undefined) ?? continuation_keep_going;
        const risk = (fieldPatch.continuation_risk as string | undefined) ?? continuation_risk;
        const status = (fieldPatch.continuation_status as string | undefined) ?? continuation_status;

        let composed = "";
        if (status && (keepGoing || risk)) {
            composed = OPENERS[status] || "";
            if (keepGoing) composed += ` ${capFirst(keepGoing)}.`;
            if (risk) composed += ` However, ${lowerFirst(risk)}.`;
        }

        const patch: Record<string, unknown> = { ...fieldPatch };
        const stillAuto = !continuation_details || continuation_details === lastAutoDetailsRef.current;
        if (stillAuto && composed) {
            lastAutoDetailsRef.current = composed;
            patch.continuation_details = composed;
        }
        updateSection("section10", patch);
    };

    const sustainabilityStrength = useMemo(() => {
        if (!continuation_status) {
            return {
                label: "Pending",
                color: "text-slate-500",
                bg: "border-slate-200 bg-slate-50 text-slate-700",
            };
        }
        let score = 0;
        if (continuation_status === "yes") score += 4;
        else if (continuation_status === "partially") score += 2;

        const activeMechanisms = (mechanisms || []).filter((m) => m !== "No continuation mechanism").length;
        score += Math.min(activeMechanisms, 3);

        if (scaling_potential?.includes("policy") || scaling_potential?.includes("other communities")) score += 2;
        else if (scaling_potential) score += 1;

        if (policy_influence?.includes("Policy") || policy_influence?.includes("Community")) score += 2;
        else if (policy_influence?.includes("institution")) score += 1;

        if (score >= 8) {
            return {
                label: "High Strength",
                color: "text-indigo-800",
                bg: "border-indigo-200 bg-indigo-50 text-indigo-800",
            };
        }
        if (score >= 4) {
            return {
                label: "Moderate Strength",
                color: "text-indigo-600",
                bg: "border-indigo-200 bg-indigo-50 text-indigo-600",
            };
        }
        return {
            label: "Basic Strength",
            color: "text-amber-800",
            bg: "border-amber-200 bg-amber-50 text-amber-800",
        };
    }, [continuation_status, mechanisms, scaling_potential, policy_influence]);

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

    const verifiedHours = data.section1.metrics?.total_verified_hours || 0;
    const requiredHours = data.required_hours || 16;

    return (
        <div className="relative">
            {!isEligibleForSubmission && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-start rounded-2xl bg-slate-50/60 p-8 pt-24 text-center backdrop-blur-[2px]">
                    <div className="max-w-md space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-xl">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                            <Lock className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-slate-900">Section locked</h3>
                            <p className="text-sm leading-relaxed text-slate-500">
                                Sustainability analysis activates once the{" "}
                                <span className="font-semibold text-indigo-600">{requiredHours}-hour minimum</span>{" "}
                                engagement is verified. Complete your attendance logs in Section 1 to unlock this step.
                            </p>
                        </div>
                        <div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-1000"
                                    style={{
                                        width: `${Math.min((verifiedHours / requiredHours) * 100, 100)}%`,
                                    }}
                                />
                            </div>
                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Current progress: {verifiedHours} / {requiredHours} hours
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div
                className={clsx(
                    "mx-auto max-w-6xl space-y-8 pb-10 transition-all duration-500",
                    !isEligibleForSubmission && "pointer-events-none opacity-40 blur-[1px] grayscale",
                )}
            >
                {/* Header */}
                <div className="cer-dup-head space-y-4">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                            <Recycle className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                                <span className="text-indigo-600">SECTION 9:</span> Sustainability
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 sm:px-5">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                        <div>
                            <p className="text-sm font-semibold text-indigo-900">
                                This section evaluates whether the impact continues beyond your involvement.
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-indigo-900/80">
                                Not all projects are sustainable — honest reporting strengthens institutional credibility
                                and identifies areas for future focus.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 10.1 Continuation status */}
                <section className="space-y-4">
                    <StepHeader n="10.1" title="Step 1 — Continuation status" status="required" />

                    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <Label className={fieldLabel}>
                            Will the impact continue after your involvement?
                        </Label>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {continuationOptions.map((opt) => {
                                const active = continuation_status === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => composeAndUpdate({ continuation_status: opt.id })}
                                        className={clsx(
                                            "rounded-xl border-2 p-5 text-center transition-colors",
                                            active
                                                ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
                                        )}
                                    >
                                        <p className="text-2xl">{opt.emoji}</p>
                                        <p className="mt-2 text-sm font-semibold text-slate-900">{opt.label}</p>
                                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                            {opt.desc}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                            <span>💛</span>
                            <p>
                                <span className="font-semibold">No penalty for honesty.</span> Most student projects are &ldquo;Partly&rdquo; or &ldquo;Not really&rdquo; — examiners trust reports that say so.
                            </p>
                        </div>

                        <FieldError message={getFieldError("section10.continuation_status")} />
                    </div>
                </section>

                {/* 10.2 Explanation */}
                {continuation_status ? (
                    <section className="space-y-4">
                        <StepHeader n="10.2" title="Step 2 — Tell us in two lines" status="mandatory" />

                        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <p className="text-sm text-slate-500">{REPORT_TEXT_RANGE_LABEL} — we still draft it from the two lines below.</p>

                            <div className="space-y-1.5">
                                <Label className={fieldLabel}>
                                    {continuation_status === "no" ? "What did the project leave behind?" : "What will keep going?"}
                                </Label>
                                <Input
                                    placeholder="e.g. the renovated classrooms and trained caregivers stay"
                                    value={continuation_keep_going}
                                    onChange={(e) => composeAndUpdate({ continuation_keep_going: e.target.value })}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-100"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className={fieldLabel}>What might stop, and what would keep it alive?</Label>
                                <Input
                                    placeholder="e.g. weekly reading sessions may stop without a volunteer or small budget"
                                    value={continuation_risk}
                                    onChange={(e) => composeAndUpdate({ continuation_risk: e.target.value })}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-100"
                                />
                            </div>

                            <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-sm leading-relaxed text-slate-700">
                                {continuation_details || <span className="text-slate-400">Your continuation statement appears here…</span>}
                            </div>

                            <div className="space-y-2 border-t border-slate-100 pt-4">
                                <Label className={fieldLabel}>Fine-tune it directly if you like</Label>
                                <Textarea
                                    placeholder={`Provide explanation for ${continuation_status.toUpperCase()}...`}
                                    value={continuation_details}
                                    onChange={(e) => update("continuation_details", e.target.value)}
                                    className={clsx(
                                        textareaClasses,
                                        getFieldError("section10.continuation_details") &&
                                            "border-red-200 focus:border-red-300 focus:ring-red-100",
                                    )}
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-48">
                                        <div className={clsx("h-full rounded-full transition-all", continuationMeter.barClass)} style={{ width: `${continuationMeter.widthPct}%` }} />
                                    </div>
                                    <p className={clsx("text-[11px] tabular-nums", continuationMeter.textClass)}>
                                        {continuationWords} / 200 words
                                    </p>
                                </div>
                            </div>

                            <FieldError message={getFieldError("section10.continuation_details")} />
                        </div>
                    </section>
                ) : null}

                {/* 10.3 Mechanisms */}
                <section className="space-y-4">
                    <StepHeader n="10.3" title="Step 3 — Sustainability mechanisms" status="required" />

                    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div>
                            <Label className={fieldLabel}>What&apos;s in place to keep it alive?</Label>
                            <p className="mt-1.5 text-sm text-slate-500">Tap all that apply — plain words, no jargon.</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {mechanismOptions.map((mech) => {
                                const isSelected = (mechanisms || []).includes(mech.id);
                                return (
                                    <button
                                        key={mech.id}
                                        type="button"
                                        onClick={() => toggleMechanism(mech.id)}
                                        className={clsx(
                                            "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                                            isSelected
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
                                        )}
                                    >
                                        {mech.label}
                                    </button>
                                );
                            })}
                        </div>

                        <FieldError message={getFieldError("section10.mechanisms")} />
                    </div>
                </section>

                {/* 10.4 Scaling & influence */}
                <section className="space-y-4">
                    <StepHeader n="10.4" title="Step 4 — Two last taps" status="required" />

                    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="space-y-2">
                            <Label className={fieldLabel}>Could others copy this project?</Label>
                            <p className="text-xs text-slate-500">e.g. another campus, village, or city</p>
                            <div className="flex flex-wrap gap-2">
                                {scalingOptions.map((opt) => {
                                    const active = scaling_potential === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => update("scaling_potential", opt.id)}
                                            className={clsx(
                                                "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                                                active
                                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <FieldError message={getFieldError("section10.scaling_potential")} />
                        </div>

                        <div className="space-y-2 border-t border-slate-100 pt-5">
                            <Label className={fieldLabel}>Did it change how any institution works?</Label>
                            <p className="text-xs text-slate-500">a rule, routine, or way of doing things that outlasts you</p>
                            <div className="flex flex-wrap gap-2">
                                {policyOptions.map((opt) => {
                                    const active = policy_influence === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => update("policy_influence", opt.id)}
                                            className={clsx(
                                                "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                                                active
                                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <FieldError message={getFieldError("section10.policy_influence")} />
                        </div>
                    </div>
                </section>

                {/* System summary */}
                <section className="space-y-4 border-t border-slate-200 pt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                                <Leaf className="h-4 w-4" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">
                                System-generated sustainability summary
                            </h3>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Read-only
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-8 sm:p-6">
                            <p className={fieldLabel}>Continuation classification</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {continuation_status
                                            ? continuation_status.charAt(0).toUpperCase() +
                                              continuation_status.slice(1)
                                            : "Pending"}
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        Sustainability level
                                    </p>
                                </div>
                                <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
                                    <p className="text-2xl font-semibold text-indigo-700">
                                        {mechanisms?.length || 0}
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600/80">
                                        Mechanisms
                                    </p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <p className="truncate text-xs font-semibold text-slate-900">
                                        {scaling_potential || "Pending"}
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        Scaling potential
                                    </p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <p className="truncate text-xs font-semibold text-slate-900">
                                        {policy_influence || "Pending"}
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        Policy influence
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-4">
                            <div
                                className={clsx(
                                    "flex h-full flex-col items-center justify-center space-y-2 rounded-xl border p-6 text-center",
                                    sustainabilityStrength.bg,
                                )}
                            >
                                <TrendingUp className={clsx("h-7 w-7 opacity-70", sustainabilityStrength.color)} />
                                <p className="text-xs opacity-60">Sustainability strength</p>
                                <p className={clsx("text-lg font-semibold", sustainabilityStrength.color)}>
                                    {sustainabilityStrength.label}
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
                                <Leaf className="h-4 w-4" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">
                                Sustainability summary
                            </h3>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Auto-generated
                        </span>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="absolute -bottom-10 -right-10 rotate-12 opacity-5">
                            <Leaf className="h-64 w-64 text-slate-900" />
                        </div>
                        <p className="relative z-10 text-sm leading-relaxed text-slate-700">
                            {autoNarrative}
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
