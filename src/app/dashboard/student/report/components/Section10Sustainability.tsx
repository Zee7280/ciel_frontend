import { Leaf, Recycle, TrendingUp, Info, Save, ShieldCheck, Globe, Zap, FileText, CheckCircle2, AlertCircle, Share2, Quote, Lock } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect } from "react";
import clsx from "clsx";

// ─── Static configuration ───────────────────────────────────────────────────
const continuationOptions = [
    { id: 'yes', label: 'Yes', desc: 'Impact likely to continue independently', icon: Leaf },
    { id: 'partially', label: 'Partial', desc: 'Some elements may continue but require support', icon: Recycle },
    { id: 'no', label: 'No', desc: 'Impact will not continue without further action', icon: AlertCircle }
];

const mechanismOptions = [
    { id: "Partner-led continuation", icon: ShieldCheck },
    { id: "Community ownership", icon: Globe },
    { id: "Institutional integration (course or program linkage)", icon: FileText },
    { id: "Resource handover (materials/tools transferred)", icon: Share2 },
    { id: "Policy or system change", icon: Info },
    { id: "Funding secured", icon: Zap },
    { id: "Follow-up plan scheduled", icon: TrendingUp },
    { id: "No continuation mechanism", icon: AlertCircle }
];

const scalingOptions = [
    { id: "Not scalable", label: "Not scalable" },
    { id: "Scalable within institution", label: "Scalable within institution" },
    { id: "Scalable to other communities", label: "Scalable to other communities" },
    { id: "Scalable at policy or government level", label: "Scalable at policy or government level" }
];

const policyOptions = [
    { id: "No", label: "No" },
    { id: "Yes — Internal institutional level", label: "Yes — Internal institutional level" },
    { id: "Yes — Community level", label: "Yes — Community level" },
    { id: "Yes — Policy / Government level", label: "Yes — Policy / Government level" }
];

export default function Section10Sustainability() {
    const { data, updateSection, getFieldError, saveReport, isEligibleForSubmission } = useReportForm();
    const { section10 } = data;
    const {
        continuation_status, continuation_details,
        mechanisms, scaling_potential, policy_influence
    } = section10;

    const update = (field: string, val: any) => updateSection('section10', { [field]: val });

    const toggleMechanism = (item: string) => {
        const current = mechanisms || [];
        if (item === "No continuation mechanism") {
            // If selecting "None", clear others
            update('mechanisms', current.includes(item) ? [] : [item]);
        } else {
            // If selecting normal mechanism, remove "None"
            const next = current.includes(item) ? current.filter(i => i !== item) : [...current.filter(i => i !== "No continuation mechanism"), item];
            update('mechanisms', next);
        }
    };

    const getWordCount = (text: string) => (text || '').trim().split(/\s+/).filter(w => w.length > 0).length;
    const cdWords = getWordCount(continuation_details);

    let minWords = 100;
    let maxWords = 200;
    let explanationPrompt = "";
    if (continuation_status === 'yes') {
        explanationPrompt = "Explain: Who will continue the activity? What system or structure supports continuation? Were materials/tools transferred? Is a partner formally responsible?";
    } else if (continuation_status === 'partially') {
        explanationPrompt = "Explain: What will continue? What may stop? What support is required (funding, training, equipment, policy)?";
    } else if (continuation_status === 'no') {
        explanationPrompt = "Explain: Why continuation is unlikely. What structural changes could enable sustainability in the future. (Honest limitations improve institutional learning)";
    }

    // ── Content generation ────────────────────────────────────────────────────
    const sustainabilityStrength = useMemo(() => {
        if (!continuation_status) return { label: "Pending", color: "text-slate-500", bg: "bg-slate-50 border-slate-200" };
        let score = 0;
        if (continuation_status === 'yes') score += 4;
        else if (continuation_status === 'partially') score += 2;

        const activeMechanisms = (mechanisms || []).filter(m => m !== 'No continuation mechanism').length;
        score += Math.min(activeMechanisms, 3); // cap at 3 points for mechanisms

        if (scaling_potential?.includes('policy') || scaling_potential?.includes('other communities')) score += 2;
        else if (scaling_potential) score += 1;

        if (policy_influence?.includes('Policy') || policy_influence?.includes('Community')) score += 2;
        else if (policy_influence?.includes('institution')) score += 1;

        if (score >= 8) return { label: "High Strength", color: "text-report-primary", bg: "bg-report-primary-soft border-report-primary-border shadow-sm shadow-report-primary-shadow" };
        if (score >= 4) return { label: "Moderate Strength", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" };
        return { label: "Basic Strength", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
    }, [continuation_status, mechanisms, scaling_potential, policy_influence]);

    const autoNarrative = useMemo(() => {
        if (!continuation_status) return "Sustainability statement will generate once project details are selected.";

        const statusMap = {
            yes: "sustainable, with independently ongoing impact expected",
            partially: "partially sustainable, requiring some follow-up support",
            no: "completed as a one-off objective cycle with limited independent continuation"
        };
        const statusText = statusMap[continuation_status as keyof typeof statusMap];

        const mechStr = (mechanisms?.length || 0) > 0 && !mechanisms?.includes('No continuation mechanism')
            ? ` Continuation depends on ${mechanisms[0].toLowerCase()}${mechanisms.length > 1 ? ' and associated mechanisms' : ''}.`
            : ' No structural continuation mechanisms were established.';

        const scalingStr = scaling_potential && scaling_potential !== 'Not scalable'
            ? ` Scaling potential has been identified at the ${scaling_potential.replace('Scalable ', '').replace('at ', '')} level.`
            : '';

        return `The project is classified as ${statusText}.${mechStr}${scalingStr}`;
    }, [continuation_status, mechanisms, scaling_potential]);

    useEffect(() => {
        if (section10.summary_text !== autoNarrative) {
            updateSection('section10', { summary_text: autoNarrative });
        }
    }, [autoNarrative, section10.summary_text]);


    return (
        <div className="relative">
            {/* Lock Overlay */}
            {!isEligibleForSubmission && (
                <div className="absolute inset-0 z-50 bg-slate-50/60 backdrop-blur-[2px] flex flex-col items-center justify-start pt-32 text-center p-8 rounded-[3rem] animate-in fade-in duration-500">
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-slate-100 max-w-md space-y-6">
                        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                            <Lock className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Section Locked</h3>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed">
                                Sustainability analysis activates once the <span className="text-report-primary">16-hour minimum</span> engagement is verified. 
                                <br/><br/>
                                Please complete your attendance logs in Section 1 to unlock this final verification.
                            </p>
                        </div>
                        <div className="pt-4">
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-amber-500 transition-all duration-1000" 
                                    style={{ width: `${Math.min((data.section1.metrics?.total_verified_hours || 0) / (data.required_hours || 16) * 100, 100)}%` }} 
                                />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">
                                Current Progress: {data.section1.metrics?.total_verified_hours || 0} / {data.required_hours || 16} Hours
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className={clsx("space-y-12 pb-16 transition-all duration-500", !isEligibleForSubmission && "opacity-40 grayscale pointer-events-none blur-[1px]")}>
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">

                <div className="w-14 h-14 rounded-2xl bg-report-primary text-white flex items-center justify-center shadow-xl shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                    <Leaf className="w-7 h-7" />
                </div>

                <div className="space-y-0.5">
                    <h2 className="report-h2">
                        Section 10 — Sustainability
                    </h2>

                    <p className="report-label">
                        Long-Term Impact & System Continuity
                    </p>
                </div>

            </div>

            {/* ─── Purpose note ────────────────────────────────────────────── */}
            <div className="p-5 bg-report-primary-soft border border-report-primary-border rounded-2xl flex items-start gap-4">
                <Info className="w-5 h-5 text-report-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                    <p className="report-label !text-report-primary">
                        This section evaluates whether the impact continues beyond your involvement, supporting mechanisms, scaling potential, and policy influence.
                    </p>

                    <p className="report-help !text-report-primary">
                        Not all projects are sustainable — honest reporting strengthens institutional credibility and identifies areas for future focus.
                    </p>
                </div>
            </div>



            {/* ─── Step 1: Continuation Status ────────────────────────────── */}
            <div className="space-y-4">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center font-black text-[10px]">
                        10.1
                    </div>

                    <h3 className="report-h3">
                        Step 1 — Continuation Status (Required)
                    </h3>
                </div>


                <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">

                    <Label className="report-h3 !text-sm !tracking-tight">
                        Will the Impact Continue After Your Involvement?
                    </Label>


                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {continuationOptions.map((opt) => (

                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => update('continuation_status', opt.id)}
                                className={clsx(
                                    "flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 transition-all relative group/opt",
                                    continuation_status === opt.id
                                        ? "bg-report-primary border-report-primary text-white shadow-lg shadow-report-primary-shadow"
                                        : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-white"
                                )}
                            >

                                <opt.icon
                                    className={clsx(
                                        "w-7 h-7 mb-3 transition-transform group-hover/opt:scale-110",
                                        continuation_status === opt.id
                                            ? "text-white"
                                            : "text-slate-300"
                                    )}
                                />

                                <span className="report-label !mb-1 !text-xs">
                                    {opt.label}
                                </span>

                                <span className="report-help !text-[9px] !opacity-70 leading-relaxed">
                                    {opt.desc}
                                </span>

                                {continuation_status === opt.id && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-white opacity-60 animate-pulse" />
                                )}

                            </button>

                        ))}

                    </div>

                    <FieldError message={getFieldError('section10.continuation_status')} />

                </div>

            </div>

            {/* ─── Step 2: Explanation ──────────────────────────────────────── */}
            {continuation_status && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center font-black text-[10px]">
                            10.2
                        </div>

                        <h3 className="report-h3">
                            Step 2 — Explanation of Continuation
                        </h3>
                    </div>


                    <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">

                        <div className="space-y-1">
                            <Label className="report-h3 !text-sm !tracking-tight">
                                Continuation Details (Mandatory)
                            </Label>

                            <p className="report-help">
                                {explanationPrompt}
                            </p>
                        </div>


                        <Textarea
                            placeholder={`Provide explanation for ${continuation_status.toUpperCase()}...`}
                            value={continuation_details}
                            onChange={e => update('continuation_details', e.target.value)}
                            className={clsx(
                                "min-h-[140px] w-full rounded-[1.5rem] border-2 border-slate-50 p-6 text-slate-700 font-medium bg-slate-50 outline-none focus:border-report-primary-border transition-all focus:bg-white resize-none",
                                getFieldError('section10.continuation_details') && "border-red-200 bg-red-50"
                            )}
                        />

                        <div className="flex items-center justify-between px-2">
                            <span className={clsx(
                                "report-label",
                                cdWords >= minWords && cdWords <= maxWords
                                    ? "text-report-primary"
                                    : cdWords > maxWords
                                        ? "text-red-500"
                                        : "text-amber-500"
                            )}>
                                {cdWords} / {maxWords} words (Min {minWords})
                            </span>
                        </div>

                        <FieldError message={getFieldError('section10.continuation_details')} />

                    </div>

                </div>
            )}



            {/* ─── Step 3: Sustainability Mechanisms ───────────────────────── */}
            <div className="space-y-4">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center font-black text-[10px]">
                        10.3
                    </div>

                    <h3 className="report-h3">
                        Step 3 — Sustainability Mechanisms
                    </h3>
                </div>


                <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">

                    <div className="space-y-1">
                        <Label className="report-h3 !text-sm !tracking-tight">
                            Continuation Mechanisms (Multi-Select | Required)
                        </Label>

                        <p className="report-help">
                            Select all that apply.
                        </p>
                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                        {mechanismOptions.map(mech => {

                            const isSelected = (mechanisms || []).includes(mech.id);

                            return (

                                <button
                                    key={mech.id}
                                    type="button"
                                    onClick={() => toggleMechanism(mech.id)}
                                    className={clsx(
                                        "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all text-center min-h-[100px]",
                                        isSelected
                                            ? "border-report-primary bg-report-primary-soft text-report-primary shadow-sm shadow-report-primary-shadow"
                                            : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                                    )}
                                >

                                    <mech.icon
                                        className={clsx(
                                            "w-5 h-5",
                                            isSelected ? "text-report-primary" : "opacity-50"
                                        )}
                                    />

                                    <span className="report-label !text-[10px]">
                                        {mech.id}
                                    </span>

                                </button>

                            );

                        })}

                    </div>

                    <FieldError message={getFieldError('section10.mechanisms')} />

                </div>

            </div>

            {/* ─── Step 4: Scaling & System Influence ──────────────────────── */}
            <div className="space-y-4">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center font-black text-[10px]">
                        10.4
                    </div>

                    <h3 className="report-h3">
                        Step 4 — Scaling & System Influence
                    </h3>
                </div>


                <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm space-y-10">


                    {/* Scaling Potential */}
                    <div className="space-y-4">

                        <Label className="report-h3 !text-sm !tracking-tight">
                            Scaling Potential (Required)
                        </Label>


                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                            {scalingOptions.map(opt => (

                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => update('scaling_potential', opt.id)}
                                    className={clsx(
                                        "px-4 py-3 rounded-xl border-2 report-label !text-[10px] transition-all text-left flex items-center gap-3",
                                        scaling_potential === opt.id
                                            ? "bg-report-primary border-report-primary text-white shadow-sm shadow-report-primary-shadow"
                                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-white"
                                    )}
                                >

                                    <div
                                        className={clsx(
                                            "w-3 h-3 rounded-full border-2",
                                            scaling_potential === opt.id
                                                ? "border-white bg-white"
                                                : "border-slate-300"
                                        )}
                                    />

                                    {opt.label}

                                </button>

                            ))}

                        </div>

                        <FieldError message={getFieldError('section10.scaling_potential')} />

                    </div>



                    {/* Policy Influence */}
                    <div className="space-y-4 pt-8 border-t-2 border-slate-50">

                        <Label className="report-h3 !text-sm !tracking-tight">
                            Policy / Institutional Influence (Required)
                        </Label>

                        <p className="report-help">
                            Did this project influence any long-term system?
                        </p>


                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                            {policyOptions.map(opt => (

                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => update('policy_influence', opt.id)}
                                    className={clsx(
                                        "px-4 py-3 rounded-xl border-2 report-label !text-[10px] transition-all text-left flex items-center gap-3",
                                        policy_influence === opt.id
                                            ? "bg-report-primary border-report-primary text-white shadow-sm shadow-report-primary-shadow"
                                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-white"
                                    )}
                                >

                                    <div
                                        className={clsx(
                                            "w-3 h-3 rounded-full border-2",
                                            policy_influence === opt.id
                                                ? "border-white bg-white"
                                                : "border-slate-300"
                                        )}
                                    />

                                    {opt.label}

                                </button>

                            ))}

                        </div>

                        <FieldError message={getFieldError('section10.policy_influence')} />

                    </div>


                </div>

            </div>
            {/* ─── Auto-Generated System Analytics ────────────────────────────── */}
            <div className="pt-8 border-t-2 border-slate-100 space-y-6">

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-lg shadow-report-primary-shadow">
                            <Leaf className="w-5 h-5" />
                        </div>

                        <h3 className="report-h3 !text-lg">
                            System-Generated Sustainability Summary
                        </h3>
                    </div>

                    <span className="report-label !bg-slate-100 !px-3 !py-1 !rounded-xl">
                        Read-Only
                    </span>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* Analytics Grid */}
                    <div className="md:col-span-8 bg-white border-2 border-slate-100 rounded-[2rem] p-8 space-y-6">

                        <p className="report-label !mb-4">
                            Continuation Classification
                        </p>


                        <div className="grid grid-cols-2 gap-4">

                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-sm font-black text-slate-900 leading-snug">
                                    {continuation_status
                                        ? continuation_status.charAt(0).toUpperCase() + continuation_status.slice(1)
                                        : 'Pending'}
                                </p>

                                <p className="report-label !text-[8px] !text-slate-500">
                                    Sustainability Level
                                </p>
                            </div>


                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="report-h3 !text-2xl font-black">
                                    {mechanisms?.length || 0}
                                </p>

                                <p className="report-label !text-[8px] !text-slate-500">
                                    Mechanisms
                                </p>
                            </div>


                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-xs font-black text-slate-900 leading-snug truncate">
                                    {scaling_potential || 'Pending'}
                                </p>

                                <p className="report-label !text-[8px] !text-slate-500">
                                    Scaling Potential
                                </p>
                            </div>


                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-xs font-black text-slate-900 leading-snug truncate">
                                    {policy_influence || 'Pending'}
                                </p>

                                <p className="report-label !text-[8px] !text-slate-500">
                                    Policy Influence
                                </p>
                            </div>

                        </div>

                    </div>



                    {/* Sustainability Strength */}
                    <div className="md:col-span-4 flex flex-col gap-6">

                        <div className={clsx(
                            "rounded-[2rem] p-8 border-2 flex-1 flex flex-col items-center justify-center text-center space-y-3",
                            sustainabilityStrength.bg
                        )}>

                            <TrendingUp className={clsx(
                                "w-8 h-8 opacity-80",
                                sustainabilityStrength.color
                            )} />

                            <div className="space-y-1">
                                <p className="report-label !text-[9px] !opacity-60">
                                    Sustainability Strength Index
                                </p>

                                <p className={clsx(
                                    "report-h3 !text-lg !tracking-tight",
                                    sustainabilityStrength.color
                                )}>
                                    {sustainabilityStrength.label}
                                </p>
                            </div>

                        </div>

                    </div>

                </div>



                {/* Auto Narrative */}
                <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-12 relative overflow-hidden shadow-xl space-y-10 group">

                    <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12">
                        <Leaf className="w-80 h-80 text-slate-900" />
                    </div>

                    <div className="relative z-10 space-y-6">

                        <span className="absolute -top-10 -left-6 text-7xl font-serif text-slate-100 select-none">
                            “
                        </span>

                        <p className="report-ai-text">
                            {autoNarrative}
                        </p>

                        <span className="absolute -bottom-16 -right-6 text-7xl font-serif text-slate-100 select-none rotate-180">
                            “
                        </span>

                    </div>

                </div>

            </div>

            
            </div>
        </div>
    );
}
