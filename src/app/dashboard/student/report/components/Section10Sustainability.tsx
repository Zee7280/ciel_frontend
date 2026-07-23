import React, { useMemo, useEffect } from "react";
import {
    Leaf, Recycle, TrendingUp, Info, ShieldCheck, Globe, Zap,
    FileText, AlertCircle, Share2, Lock, Network,
} from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";

// ─── Static configuration ───────────────────────────────────────────────────
const continuationOptions = [
    { id: "yes", label: "Yes", desc: "Impact likely to continue independently", icon: Leaf },
    { id: "partially", label: "Partial", desc: "Some elements may continue but require support", icon: Recycle },
    { id: "no", label: "No", desc: "Impact will not continue without further action", icon: AlertCircle },
];

const mechanismOptions = [
    { id: "Partner-led continuation", label: "Partner-led continuation", icon: ShieldCheck },
    { id: "Community ownership", label: "Community ownership", icon: Globe },
    { id: "Institutional integration (course or program linkage)", label: "Institutional integration", icon: FileText },
    { id: "Resource handover (materials/tools transferred)", label: "Resource handover", icon: Share2 },
    { id: "Policy or system change", label: "Policy or system change", icon: Network },
    { id: "Funding secured", label: "Funding secured", icon: Zap },
    { id: "Follow-up plan scheduled", label: "Follow-up plan scheduled", icon: TrendingUp },
    { id: "No continuation mechanism", label: "No continuation mechanism", icon: Info },
];

const scalingOptions = [
    { id: "Not scalable", label: "Not scalable" },
    { id: "Scalable within institution", label: "Scalable within institution" },
    { id: "Scalable to other communities", label: "Scalable to other communities" },
    { id: "Scalable at policy or government level", label: "Scalable at policy or government level" },
];

const policyOptions = [
    { id: "No", label: "No" },
    { id: "Yes — Internal institutional level", label: "Yes — internal institutional level" },
    { id: "Yes — Community level", label: "Yes — community level" },
    { id: "Yes — Policy / Government level", label: "Yes — policy / government level" },
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

export default function Section10Sustainability() {
    const { data, updateSection, getFieldError, isEligibleForSubmission } = useReportForm();
    const { section10 } = data;
    const {
        continuation_status,
        continuation_details,
        mechanisms,
        scaling_potential,
        policy_influence,
    } = section10;

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

    const getWordCount = (text: string) =>
        (text || "").trim().split(/\s+/).filter((w) => w.length > 0).length;
    const cdWords = getWordCount(continuation_details);

    const minWords = 100;
    const maxWords = 200;

    let explanationPrompt = "";
    if (continuation_status === "yes") {
        explanationPrompt =
            "Explain: Who will continue the activity? What system or structure supports continuation? Were materials/tools transferred? Is a partner formally responsible?";
    } else if (continuation_status === "partially") {
        explanationPrompt =
            "Explain: What will continue? What may stop? What support is required (funding, training, equipment, policy)?";
    } else if (continuation_status === "no") {
        explanationPrompt =
            "Explain: Why continuation is unlikely. What structural changes could enable sustainability in the future. (Honest limitations improve institutional learning)";
    }

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
                color: "text-blue-800",
                bg: "border-blue-200 bg-blue-50 text-blue-800",
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
                    <div className="max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
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
                    "space-y-8 pb-10 transition-all duration-500",
                    !isEligibleForSubmission && "pointer-events-none opacity-40 blur-[1px] grayscale",
                )}
            >
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                            <Recycle className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                                <span className="text-indigo-600">SECTION 10:</span> Sustainability
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
                    <StepHeader n="10.1" title="Step 1 — Continuation status (required)" />

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
                                        onClick={() => update("continuation_status", opt.id)}
                                        className={clsx(
                                            "flex flex-col items-center rounded-xl border p-5 text-center transition-colors",
                                            active
                                                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
                                        )}
                                    >
                                        <opt.icon
                                            className={clsx(
                                                "mb-3 h-6 w-6",
                                                active ? "text-white" : "text-slate-400",
                                            )}
                                        />
                                        <span className="text-sm font-semibold">{opt.label}</span>
                                        <span
                                            className={clsx(
                                                "mt-1.5 text-xs leading-relaxed",
                                                active ? "text-indigo-100" : "text-slate-500",
                                            )}
                                        >
                                            {opt.desc}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <FieldError message={getFieldError("section10.continuation_status")} />
                    </div>
                </section>

                {/* 10.2 Explanation */}
                {continuation_status ? (
                    <section className="space-y-4">
                        <StepHeader n="10.2" title="Step 2 — Explanation of continuation" />

                        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div>
                                <Label className={fieldLabel}>Continuation details (mandatory)</Label>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                                    {explanationPrompt}
                                </p>
                            </div>

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

                            <span
                                className={clsx(
                                    "text-xs font-medium",
                                    cdWords >= minWords && cdWords <= maxWords
                                        ? "text-indigo-600"
                                        : cdWords > maxWords
                                            ? "text-red-500"
                                            : "text-amber-600",
                                )}
                            >
                                {cdWords} / {maxWords} words (min {minWords})
                            </span>

                            <FieldError message={getFieldError("section10.continuation_details")} />
                        </div>
                    </section>
                ) : null}

                {/* 10.3 Mechanisms */}
                <section className="space-y-4">
                    <StepHeader n="10.3" title="Step 3 — Sustainability mechanisms" />

                    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div>
                            <Label className={fieldLabel}>
                                Continuation mechanisms (multi-select — required)
                            </Label>
                            <p className="mt-1.5 text-sm text-slate-500">Select all that apply.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                            {mechanismOptions.map((mech) => {
                                const isSelected = (mechanisms || []).includes(mech.id);
                                return (
                                    <button
                                        key={mech.id}
                                        type="button"
                                        onClick={() => toggleMechanism(mech.id)}
                                        className={clsx(
                                            "flex min-h-[100px] flex-col items-center justify-center gap-2.5 rounded-xl border p-4 text-center transition-colors",
                                            isSelected
                                                ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-100 hover:bg-slate-50",
                                        )}
                                    >
                                        <mech.icon
                                            className={clsx(
                                                "h-5 w-5",
                                                isSelected ? "text-indigo-600" : "text-slate-400",
                                            )}
                                        />
                                        <span className="text-xs font-semibold leading-snug">
                                            {mech.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <FieldError message={getFieldError("section10.mechanisms")} />
                    </div>
                </section>

                {/* 10.4 Scaling & influence */}
                <section className="space-y-4">
                    <StepHeader n="10.4" title="Step 4 — Scaling & system influence" />

                    <div className="space-y-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="space-y-4">
                            <Label className={fieldLabel}>Scaling potential (required)</Label>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {scalingOptions.map((opt) => {
                                    const active = scaling_potential === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => update("scaling_potential", opt.id)}
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
                            <FieldError message={getFieldError("section10.scaling_potential")} />
                        </div>

                        <div className="space-y-4 border-t border-slate-100 pt-6">
                            <div>
                                <Label className={fieldLabel}>
                                    Policy / institutional influence (required)
                                </Label>
                                <p className="mt-1.5 text-sm text-slate-500">
                                    Did this project influence any long-term system?
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {policyOptions.map((opt) => {
                                    const active = policy_influence === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => update("policy_influence", opt.id)}
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
                            <FieldError message={getFieldError("section10.policy_influence")} />
                        </div>
                    </div>
                </section>

                {/* System summary */}
                <section className="space-y-4 border-t border-slate-200 pt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
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
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
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
