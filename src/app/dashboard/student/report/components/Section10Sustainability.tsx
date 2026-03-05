import { Leaf, Recycle, TrendingUp, Info, Save, ShieldCheck, Globe, Zap, FileText, CheckCircle2, AlertCircle, Share2, Quote } from "lucide-react";
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
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
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

    let minWords = 50;
    let maxWords = 80;
    let explanationPrompt = "";
    if (continuation_status === 'yes') {
        minWords = 100; maxWords = 150;
        explanationPrompt = "Explain: Who will continue the activity? What system or structure supports continuation? Were materials/tools transferred? Is a partner formally responsible?";
    } else if (continuation_status === 'partially') {
        minWords = 50; maxWords = 80;
        explanationPrompt = "Explain: What will continue? What may stop? What support is required (funding, training, equipment, policy)?";
    } else if (continuation_status === 'no') {
        minWords = 50; maxWords = 80;
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

        if (score >= 8) return { label: "High Strength", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
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
        <div className="space-y-12 pb-16">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-100 ring-4 ring-emerald-50">
                    <Leaf className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Section 10 — Sustainability</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">Long-Term Impact & System Continuity</p>
                </div>
            </div>

            {/* ─── Purpose note ────────────────────────────────────────────── */}
            <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4">
                <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest leading-relaxed">
                        This section evaluates whether the impact continues beyond your involvement, supporting mechanisms, scaling potential, and policy influence.
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold leading-relaxed">
                        Not all projects are sustainable — honest reporting strengthens institutional credibility and identifies areas for future focus.
                    </p>
                </div>
            </div>

            {/* ─── Step 1: Continuation Status ────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">10.1</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 1 — Continuation Status (Required)</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                    <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Will the Impact Continue After Your Involvement?</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {continuationOptions.map((opt) => (
                            <button
                                key={opt.id} type="button"
                                onClick={() => update('continuation_status', opt.id)}
                                className={clsx(
                                    "flex flex-col items-center justify-center text-center p-8 rounded-[2.5rem] border-2 transition-all relative group/opt",
                                    continuation_status === opt.id
                                        ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                                        : "bg-slate-50 border-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                                )}
                            >
                                <opt.icon className={clsx("w-8 h-8 mb-4 transition-transform group-hover/opt:scale-110", continuation_status === opt.id ? "text-emerald-400" : "text-slate-300")} />
                                <span className="font-black uppercase tracking-widest text-xs mb-2">{opt.label}</span>
                                <span className="text-[9px] font-bold opacity-70 uppercase tracking-tighter leading-relaxed">{opt.desc}</span>
                                {continuation_status === opt.id && (
                                    <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">10.2</div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 2 — Explanation of Continuation</h3>
                    </div>
                    <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">
                        <div className="space-y-1">
                            <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Continuation Details (Mandatory)</Label>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
                                {explanationPrompt}
                            </p>
                        </div>
                        <Textarea
                            placeholder={`Provide explanation for ${continuation_status.toUpperCase()}...`}
                            value={continuation_details}
                            onChange={e => update('continuation_details', e.target.value)}
                            className={clsx(
                                "w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-medium text-slate-700 text-sm outline-none focus:border-emerald-200 transition-all resize-none",
                                getFieldError('section10.continuation_details') && "border-red-200"
                            )}
                        />
                        <div className="flex items-center justify-between px-2">
                            <span className={clsx(
                                "text-[10px] font-black uppercase tracking-widest",
                                cdWords >= minWords && cdWords <= maxWords ? "text-emerald-600" : cdWords > maxWords ? "text-red-500" : "text-amber-500"
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
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">10.3</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 3 — Sustainability Mechanisms</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Continuation Mechanisms (Multi-Select | Required)</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select all that apply.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {mechanismOptions.map(mech => {
                            const isSelected = (mechanisms || []).includes(mech.id);
                            return (
                                <button
                                    key={mech.id} type="button"
                                    onClick={() => toggleMechanism(mech.id)}
                                    className={clsx(
                                        "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all text-center h-full min-h-[100px]",
                                        isSelected
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm"
                                            : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                                    )}
                                >
                                    <mech.icon className={clsx("w-5 h-5", isSelected ? "text-emerald-600" : "opacity-50")} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{mech.id}</span>
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
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">10.4</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 4 — Scaling & System Influence</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-10">

                    <div className="space-y-4">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Scaling Potential (Required)</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {scalingOptions.map(opt => (
                                <button
                                    key={opt.id} type="button"
                                    onClick={() => update('scaling_potential', opt.id)}
                                    className={clsx(
                                        "px-4 py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center gap-3",
                                        scaling_potential === opt.id
                                            ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200"
                                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300"
                                    )}
                                >
                                    <div className={clsx("w-3 h-3 rounded-full border-2", scaling_potential === opt.id ? "border-white bg-white" : "border-slate-300")} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <FieldError message={getFieldError('section10.scaling_potential')} />
                    </div>

                    <div className="space-y-4 pt-8 border-t-2 border-slate-50">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Policy / Institutional Influence (Required)</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Did this project influence any long-term system?</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {policyOptions.map(opt => (
                                <button
                                    key={opt.id} type="button"
                                    onClick={() => update('policy_influence', opt.id)}
                                    className={clsx(
                                        "px-4 py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center gap-3",
                                        policy_influence === opt.id
                                            ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200"
                                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300"
                                    )}
                                >
                                    <div className={clsx("w-3 h-3 rounded-full border-2", policy_influence === opt.id ? "border-white bg-white" : "border-slate-300")} />
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
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                            <Leaf className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">System-Generated Sustainability Summary</h3>
                    </div>
                    <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">Read-Only</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Analytics Grid */}
                    <div className="md:col-span-8 bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Continuation Classification</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-sm font-black text-slate-900 leading-snug">
                                    {continuation_status ? continuation_status.charAt(0).toUpperCase() + continuation_status.slice(1) : 'Pending'}
                                </p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Sustainability Level</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-2xl font-black text-emerald-700 leading-none">
                                    {mechanisms?.length || 0}
                                </p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Mechanisms</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-xs font-black text-slate-900 leading-snug truncate">
                                    {scaling_potential || 'Pending'}
                                </p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Scaling Potential</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-xs font-black text-slate-900 leading-snug truncate">
                                    {policy_influence || 'Pending'}
                                </p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Policy Influence</p>
                            </div>
                        </div>
                    </div>

                    {/* Verification Strength */}
                    <div className="md:col-span-4 flex flex-col gap-6">
                        <div className={clsx("rounded-[2.5rem] p-8 border-2 flex-1 flex flex-col items-center justify-center text-center space-y-3", sustainabilityStrength.bg)}>
                            <TrendingUp className={clsx("w-8 h-8 opacity-80", sustainabilityStrength.color)} />
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Sustainability Strength Index</p>
                                <p className={clsx("text-lg font-black uppercase tracking-tight", sustainabilityStrength.color)}>{sustainabilityStrength.label}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Auto narrative */}
                <div className="bg-emerald-900 rounded-[2.5rem] p-8 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <span className="absolute -top-4 -left-2 text-6xl font-serif text-white/10 select-none">"</span>
                    <p className="relative z-10 text-base font-bold text-white leading-relaxed font-serif">
                        {autoNarrative}
                    </p>
                </div>
            </div>

            {/* ─── Save ─────────────────────────────────────────────────────── */}
            <div className="flex justify-center pt-10">
                <Button
                    type="button" variant="outline" onClick={() => saveReport(false)}
                    className="h-16 px-12 rounded-2xl border-2 border-slate-100 bg-white text-slate-500 font-extrabold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 hover:shadow-xl transition-all flex items-center gap-4 group"
                >
                    <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span>Save Sustainability Impact</span>
                </Button>
            </div>
        </div>
    );
}
