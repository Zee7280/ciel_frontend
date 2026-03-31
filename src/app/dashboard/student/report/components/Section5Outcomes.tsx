import React, { useEffect, useMemo, useState } from "react";
import { generateAISummary } from "../utils/aiSummarizer";
import { toast } from "sonner";
import { TrendingUp, AlertCircle, Info, Save, Activity, Plus, Trash2, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { useDebounce } from "@/hooks/useDebounce";
import { FieldError } from "./ui/FieldError";
import { sdgData } from "@/utils/sdgData";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────
type MeasurableOutcome = {
    id: string;
    outcome_area: string;
    outcome_area_other?: string;
    metric: string;
    metric_other?: string;
    baseline: string;
    endline: string;
    unit: string;
    unit_other?: string;
    confidence_level: string;
};

// ─── Static data ──────────────────────────────────────────────────────────────
const outcomeCategories = [
    "Skills / Knowledge Improvement",
    "Behaviour / Practice Change",
    "Access Improvement",
    "Economic Improvement",
    "Environmental Improvement",
    "Institutional / System Strengthening",
    "Inclusion / Participation Increase",
    "Partnership Strengthening",
    "Policy / Governance Change",
    "Other"
];

const metricLibrary: Record<string, string[]> = {
    "Skills / Knowledge Improvement": [
        "Participants able to perform task independently", "Assessment score improvement",
        "Certification completion", "Skill competency improvement",
        "Participants demonstrating correct technique", "Digital literacy improvement",
        "Financial literacy improvement", "Health knowledge improvement",
        "Environmental awareness improvement", "Technical skill acquisition",
        "Literacy improvement", "Numeracy improvement",
        "Coding / digital tool proficiency gained", "Training completion rate",
        "Knowledge retention rate", "Participants passing post-training evaluation",
        "Students able to apply learned concept in practice", "Other"
    ],
    "Behaviour / Practice Change": [
        "Adoption of recommended practice", "Behaviour change adoption rate",
        "Hygiene practices improved", "Safe health practices adopted",
        "Increased school attendance behaviour", "Improved waste disposal behaviour",
        "Improved financial management behaviour", "Increased exercise / healthy lifestyle adoption",
        "Reduction in harmful behaviour", "Increased civic participation behaviour",
        "Adoption of climate-friendly practices", "Reduction in risky behaviour", "Other"
    ],
    "Access Improvement": [
        "People gaining access to services", "People gaining access to digital tools",
        "People gaining access to education resources", "Households gaining access to clean water",
        "Individuals gaining access to healthcare services", "Students gaining access to learning materials",
        "Communities gaining internet access", "Beneficiaries accessing new facilities",
        "Beneficiaries accessing financial services", "Communities accessing environmental resources",
        "Users accessing digital platform", "Other"
    ],
    "Economic Improvement": [
        "Jobs created", "Income opportunities generated", "Businesses strengthened",
        "Businesses created / started", "Participants employed after training",
        "Participants starting income activity", "Cost savings achieved",
        "Increase in household income", "Market access improved", "Microenterprise created",
        "Participants accessing microfinance", "Financial resources mobilized", "Other"
    ],
    "Environmental Improvement": [
        "Trees planted", "Waste reduced", "Waste recycled", "Water saved",
        "Water access improved", "Energy consumption reduced", "Carbon emissions reduced",
        "Green spaces created", "Environmental awareness improved",
        "Households adopting sustainable practices", "Plastic use reduction",
        "Compost systems implemented", "Biodiversity protection actions implemented", "Other"
    ],
    "Institutional / System Strengthening": [
        "Systems developed or improved", "Policies developed", "Institutional procedures improved",
        "Digital systems implemented", "Institutional capacity improved",
        "Staff trained in new procedures", "Monitoring systems established",
        "Reporting systems developed", "Data systems implemented",
        "Organizational processes improved", "Institutional service capacity increased", "Other"
    ],
    "Inclusion / Participation Increase": [
        "Participation of women increased", "Participation of youth increased",
        "Participation of marginalized groups increased",
        "Participation of persons with disabilities increased",
        "Community participation rate increased", "Stakeholder engagement increased",
        "Representation of vulnerable groups improved", "Volunteer participation increased",
        "Community meeting attendance increased", "Civic participation increased", "Other"
    ],
    "Partnership Strengthening": [
        "Partnerships established", "Collaboration agreements signed",
        "Multi-stakeholder initiatives launched", "Partner organizations engaged",
        "Joint programs implemented", "Resource sharing agreements established",
        "Cross-sector collaborations initiated", "Institutional collaboration frameworks developed", "Other"
    ],
    "Policy / Governance Change": [
        "Policy recommendations submitted", "Policy consultations conducted",
        "Policy briefs developed", "Local regulations influenced",
        "Community governance structures improved", "Public consultations facilitated",
        "Institutional policy adopted", "Government program collaboration initiated",
        "Public service delivery improved", "Other"
    ]
};

const units = [
    "Number (#)", "People", "Households", "Organizations", "Percentage (%)",
    "Kg", "Liters", "Trees", "PKR", "Hours", "Days", "Score",
    "Units", "Kits", "Devices", "Policies", "Programs",
    "Level (Low / Medium / High)", "Yes / No", "Other"
];

const confidenceLevels = ["Directly measured", "Partner confirmed", "Observed", "Estimated"];

// ─── Helper: improvement calculation ──────────────────────────────────────────
function calcImprovement(o: MeasurableOutcome): number {
    return (parseFloat(o.endline) || 0) - (parseFloat(o.baseline) || 0);
}

// ─── Single Outcome Card ───────────────────────────────────────────────────────
function OutcomeCard({
    outcome,
    index,
    canRemove,
    onUpdate,
    onRemove,
}: {
    outcome: MeasurableOutcome;
    index: number;
    canRemove: boolean;
    onUpdate: (field: keyof MeasurableOutcome, val: string) => void;
    onRemove: () => void;
}) {
    const improvement = calcImprovement(outcome);
    const metrics = metricLibrary[outcome.outcome_area] || [];

    return (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-8 relative">
            {/* Card header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-report-primary text-white flex items-center justify-center font-black text-[10px]">
                        {index + 1}
                    </div>
                    <span className="report-label">Measurable Outcome</span>
                </div>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Category & Metric */}
                <div className="space-y-6">
                    {/* 5.2A Outcome Category */}
                    <div className="space-y-3">
                        <Label className="report-label">5.2A — Outcome Category</Label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {outcomeCategories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => onUpdate('outcome_area', cat)}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border-2 text-left text-[10px] font-black uppercase tracking-wider transition-all",
                                        outcome.outcome_area === cat
                                            ? "border-report-primary bg-report-primary-soft text-report-primary shadow-md shadow-report-primary-shadow"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        {outcome.outcome_area === 'Other' && (
                            <Textarea
                                placeholder="Specify custom outcome area (100-200 Words)..."
                                value={outcome.outcome_area_other || ''}
                                onChange={e => onUpdate('outcome_area_other', e.target.value)}
                                className="w-full h-24 bg-slate-50 border-2 border-report-primary-border rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-report-primary resize-none mt-2"
                            />
                        )}
                    </div>

                    {/* 5.2B Metric */}
                    {outcome.outcome_area && (
                        <div className="space-y-3">
                            <Label className="report-label">5.2B — Specific Metric</Label>
                            {outcome.outcome_area !== 'Other' && metrics.length > 0 ? (
                                <select
                                    value={outcome.metric}
                                    onChange={e => onUpdate('metric', e.target.value)}
                                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-slate-700 text-xs outline-none focus:border-report-primary-border"
                                >
                                    <option value="">Select Metric...</option>
                                    {metrics.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            ) : (
                                <Input
                                    placeholder="Enter custom metric name..."
                                    value={outcome.metric}
                                    onChange={e => onUpdate('metric', e.target.value)}
                                    className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold"
                                />
                            )}
                            {outcome.metric === 'Other' && (
                                <Textarea
                                    placeholder="Specify custom metric (100-200 Words)..."
                                    value={outcome.metric_other || ''}
                                    onChange={e => onUpdate('metric_other', e.target.value)}
                                    className="w-full h-24 bg-slate-50 border-2 border-report-primary-border rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-report-primary animate-in fade-in slide-in-from-top-1 resize-none mt-2"
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Data Points */}
                <div className="space-y-6 bg-slate-50/60 p-6 rounded-[1.5rem] border-2 border-slate-50">
                    {/* Baseline + Endline */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="report-label">5.2C — Baseline (Before)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={outcome.baseline}
                                onChange={e => onUpdate('baseline', e.target.value)}
                                className="h-14 bg-white border-2 border-slate-100 rounded-2xl px-4 font-black text-lg focus:border-report-primary-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="report-label">5.2D — Endline (After)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={outcome.endline}
                                onChange={e => onUpdate('endline', e.target.value)}
                                className="h-14 bg-white border-2 border-slate-100 rounded-2xl px-4 font-black text-lg text-report-primary focus:border-report-primary-border"
                            />
                        </div>
                    </div>

                    {/* Live improvement */}
                    <div className="flex items-center justify-between px-2">
                        <span className="report-label">Improvement</span>
                        <span className={clsx(
                            "text-xl font-black rounded-xl px-4 py-1",
                            improvement > 0 ? "text-report-primary bg-report-primary-soft" : improvement < 0 ? "text-red-600 bg-red-50" : "text-slate-400 bg-slate-100"
                        )}>
                            {improvement > 0 ? '+' : ''}{improvement}
                        </span>
                    </div>

                    {/* Unit and Confidence Level Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Unit */}
                        <div className="space-y-2">
                            <Label className="report-label">Unit of Measurement</Label>
                            <select
                                value={outcome.unit}
                                onChange={e => onUpdate('unit', e.target.value)}
                                className="w-full h-11 bg-white border-2 border-slate-100 rounded-xl px-4 font-bold text-slate-700 text-xs outline-none focus:border-report-primary-border"
                            >
                                <option value="">Select Unit...</option>
                                {units.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            {outcome.unit === 'Other' && (
                                <Textarea
                                    placeholder="Specify unit (100-200 Words)..."
                                    value={outcome.unit_other || ''}
                                    onChange={e => onUpdate('unit_other', e.target.value)}
                                    className="w-full h-24 bg-white border-2 border-emerald-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none resize-none mt-2"
                                />
                            )}
                        </div>

                        {/* 5.2F Confidence Level */}
                        <div className="space-y-2">
                            <Label className="report-label">5.2F — Confidence Level</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {confidenceLevels.map(lvl => (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => onUpdate('confidence_level', lvl)}
                                        className={clsx(
                                            "px-3 py-2 rounded-xl border-2 text-[9px] font-black uppercase tracking-wider text-left transition-all",
                                            outcome.confidence_level === lvl
                                                ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                                : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Validation note */}
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold text-amber-800 uppercase leading-relaxed">
                            Baseline cannot exceed total beneficiaries from Section 4. Percentages cannot exceed 100%.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Section5Outcomes() {
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
    const { section4, section5 } = data;
    const { observed_change } = section5;

    const outcomes: MeasurableOutcome[] = section5.measurable_outcomes || [];

    // ── Outcome handlers ──────────────────────────────────────────────────────
    const addOutcome = () => {
        updateSection('section5', {
            measurable_outcomes: [
                ...outcomes,
                { id: `outcome-${Date.now()}`, outcome_area: '', metric: '', baseline: '', endline: '', unit: '', confidence_level: '' }
            ]
        });
    };

    const removeOutcome = (idx: number) => {
        updateSection('section5', { measurable_outcomes: outcomes.filter((_, i) => i !== idx) });
    };

    const updateOutcome = (idx: number, field: keyof MeasurableOutcome, val: string) => {
        const next = [...outcomes];
        next[idx] = { ...next[idx], [field]: val };
        // Reset metric when category changes
        if (field === 'outcome_area') next[idx].metric = '';
        updateSection('section5', { measurable_outcomes: next });
    };

    // ── Challenges word count ─────────────────────────────────────────────────
    const challengeWords = (section5.challenges || '').trim().split(/\s+/).filter(w => w.length > 0).length;

    // ── Auto-generated summary ────────────────────────────────────────────────


    const autoSummary = useMemo(() => {
        if (section5.summary_text && (section5.summary_text.length > 50 || !section5.summary_text.includes("The project successfully achieved"))) {
            return section5.summary_text;
        }

        const primaryOutcome = outcomes[0];
        if (!primaryOutcome?.metric) return "Outcomes will be summarized here after you add measurable results.";

        const change = calcImprovement(primaryOutcome);
        return `The project successfully achieved a ${change} ${primaryOutcome.unit} improvement in ${primaryOutcome.metric}. This contributes to the broader observed change: ${observed_change}. These results demonstrate the tangible impact of the structured interventions conducted.`;
    }, [outcomes, observed_change, section5.summary_text]);

    useEffect(() => {
        if (section5.summary_text !== autoSummary) {
            updateSection('section5', { summary_text: autoSummary });
        }
    }, [autoSummary, section5.summary_text]);



    // ── Observed change word count ────────────────────────────────────────────
    const observedWords = (section5.observed_change || '').trim().split(/\s+/).filter(w => w.length > 0).length;

    return (
        <div className="space-y-12 pb-16">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-4">

                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                        <TrendingUp className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                        <h2 className="report-h2">
                            Section 5 — Outcomes & Results
                        </h2>

                        <p className="report-label text-slate-500">
                            Measurable Change Resulting from Your Project
                        </p>
                    </div>

                </div>

            </div>

            {/* ─── 5.0 Project Snapshot ────────────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold">
                        5.0
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                        Project Snapshot
                    </h3>

                    <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-full">
                        Auto-Generated · Read-Only
                    </span>

                </div>


                {/* Snapshot Card */}

                <div className="p-6 rounded-2xl text-white shadow-lg bg-gradient-to-r from-[#0B1F3A] to-[#08172E]">

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">

                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                Primary SDG
                            </p>
                            <p className="text-sm font-semibold truncate">
                                {sdgData.find(s => s.id === data.section3.primary_sdg.goal_number?.toString())?.title || "—"}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                SDG Target
                            </p>
                            <p className="text-sm font-semibold">
                                {data.section3.primary_sdg.target_id || "—"}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                Participation
                            </p>
                            <p className="text-sm font-semibold capitalize">
                                {data.section1.participation_type}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                Beneficiaries
                            </p>
                            <p className="text-sm font-semibold">
                                {section4.total_beneficiaries || "0"} Reached
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                Output Types
                            </p>
                            <p className="text-sm font-semibold">
                                {section4.outputs.filter(o => o.type).length} Recorded
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                Verified Hours
                            </p>
                            <p className="text-sm font-semibold">
                                {data.section1.metrics.total_verified_hours}h
                            </p>
                        </div>

                    </div>

                </div>


                {/* Reminder */}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">

                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />

                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-blue-800">
                            Reminder
                        </p>

                        <p className="text-sm text-blue-700">
                            Your outcome must reflect measurable change resulting from the outputs recorded in Section 4.
                            No SDG selection is required here — the SDG framework is already assigned from Section 3.
                        </p>
                    </div>

                </div>

            </div>

            {/* ─── Step 1: Observed Change ─────────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold">
                        5.1
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 italic">
                        Step 1 — Observed Change (Narrative)
                    </h3>
                </div>


                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-800">
                            Describe the change that occurred (Required)
                        </Label>

                        <p className="text-sm text-slate-500 leading-relaxed">
                            What improved or strengthened? What can beneficiaries now do that they could not before?
                            How does this relate to the assigned SDG target?
                            <span className="text-report-primary font-semibold ml-1 italic">
                                (100–200 Words)
                            </span>
                        </p>
                    </div>


                    {/* Guidelines */}
                    <div className="space-y-2">

                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Guidelines
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                            {[
                                "Refer to beneficiaries from Section 4",
                                "Connect change to activities & outputs",
                                "Be realistic and specific"
                            ].map(g => (
                                <p
                                    key={g}
                                    className="text-xs text-report-primary font-medium flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-3 h-3" />
                                    {g}
                                </p>
                            ))}

                            {[
                                "Do not claim problem was fully solved",
                                "Do not claim SDG achievement"
                            ].map(g => (
                                <p
                                    key={g}
                                    className="text-xs text-red-600 font-medium flex items-center gap-2"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {g}
                                </p>
                            ))}

                        </div>

                    </div>


                    {/* Textarea */}
                    <Textarea
                        placeholder="Explain the direction and nature of change resulting from your activities..."
                        className={clsx(
                            "min-h-[150px] rounded-lg border border-slate-200 p-5 text-sm text-slate-700 bg-slate-50 outline-none focus:border-report-primary transition focus:bg-white",
                            getFieldError('observed_change') && "border-red-300 bg-red-50"
                        )}
                        value={section5.observed_change || ''}
                        onChange={(e) => updateSection('section5', { observed_change: e.target.value })}
                    />

                    <FieldError message={getFieldError('observed_change')} />


                    {/* Word Count */}
                    <div className="flex justify-between items-center text-xs">

                        <p
                            className={clsx(
                                "font-medium",
                                observedWords >= 100 && observedWords <= 200
                                    ? "text-report-primary"
                                    : observedWords > 200
                                        ? "text-red-500"
                                        : "text-slate-400"
                            )}
                        >
                            Word Count: {observedWords} / 200 (Min 100)
                        </p>

                        {observedWords >= 100 && observedWords <= 200 && (
                            <span className="text-xs font-semibold text-report-primary flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Within range
                            </span>
                        )}

                    </div>

                </div>

            </div>

            {/* ─── Step 2: Measurable Outcomes ─────────────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold">
                            5.2
                        </div>

                        <h3 className="text-base font-semibold text-slate-900 italic">
                            Step 2 — Measurable Outcomes
                        </h3>

                    </div>


                    <Button
                        type="button"
                        variant="ghost"
                        onClick={addOutcome}
                        className="h-9 px-4 rounded-lg bg-report-primary-soft text-report-primary text-xs font-semibold uppercase tracking-wide hover:bg-report-primary-border transition"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Measurable Outcome
                    </Button>

                </div>


                <div className="space-y-6">

                    {outcomes.map((outcome, idx) => (

                        <OutcomeCard
                            key={outcome.id}
                            outcome={outcome}
                            index={idx}
                            canRemove={outcomes.length > 1}
                            onUpdate={(field, val) => updateOutcome(idx, field, val)}
                            onRemove={() => removeOutcome(idx)}
                        />

                    ))}

                </div>

            </div>

            {/* ─── Step 3: Challenges & Limitations ───────────────────────── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold">
                        5.3
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 italic">
                        Step 3 — Challenges & Limitations
                    </h3>

                </div>


                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-5">

                    <div className="space-y-2">

                        <Label className="text-sm font-semibold text-slate-800">
                            Reflect honestly on limitations (Required)
                        </Label>

                        <p className="text-sm text-slate-500 leading-relaxed">
                            What limited scale of impact? What could not be fully measured?
                            What barriers affected sustainability?
                            <span className="text-orange-600 font-semibold ml-1 italic">
                                (100–200 Words)
                            </span>
                        </p>

                    </div>


                    <Textarea
                        placeholder="Reflect honestly on barriers, unintended effects, or what could not be fully measured..."
                        className={clsx(
                            "min-h-[130px] rounded-lg border border-slate-200 p-5 text-sm text-slate-700 bg-slate-50 outline-none focus:border-report-primary transition focus:bg-white",
                            getFieldError('challenges') && "border-red-300 bg-red-50"
                        )}
                        value={section5.challenges || ''}
                        onChange={(e) => updateSection('section5', { challenges: e.target.value })}
                    />

                    <FieldError message={getFieldError('challenges')} />


                    <p
                        className={clsx(
                            "text-xs px-2 font-medium",
                            challengeWords > 200 ? "text-red-500" : "text-slate-400"
                        )}
                    >
                        {challengeWords} / 200 words (Min 100) — Transparent reporting strengthens institutional credibility.
                    </p>

                </div>

            </div>



            {/* ─── Auto-Generated Summary ─────────────────────────────────── */}
            <div className="pt-14 border-t border-slate-200">

                <div className="flex items-center justify-between mb-8">

                    <div className="flex items-center gap-4">

                        <div className="w-10 h-10 rounded-lg bg-report-primary text-white flex items-center justify-center shadow-md">
                            <Activity className="w-5 h-5" />
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 italic">
                            Outcome Measurement Summary
                        </h3>

                    </div>


                    <div className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold uppercase tracking-wide">
                        System-Generated · Read-Only
                    </div>

                </div>



                <div className="bg-white border border-slate-200 rounded-xl p-8 relative overflow-hidden shadow-sm space-y-6">

                    <div className="absolute -bottom-10 -right-10 opacity-5">
                        <TrendingUp className="w-64 h-64 text-slate-900" />
                    </div>


                    {/* Stats grid */}
                    {outcomes[0]?.metric && (

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-slate-200">

                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Primary SDG
                                </span>

                                <p className="text-sm font-semibold text-slate-900">
                                    {sdgData.find(s => s.id === data.section3.primary_sdg.goal_number?.toString())?.title || "—"}
                                </p>
                            </div>


                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Metric
                                </span>

                                <p className="text-sm font-semibold text-slate-900 truncate">
                                    {outcomes[0].metric}
                                </p>
                            </div>


                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Improvement
                                </span>

                                <p className="text-sm font-semibold text-report-primary">
                                    {calcImprovement(outcomes[0]) > 0 ? "+" : ""}
                                    {calcImprovement(outcomes[0])} {outcomes[0].unit}
                                </p>
                            </div>


                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Confidence
                                </span>

                                <p className="text-sm font-semibold text-slate-900">
                                    {outcomes[0].confidence_level || "—"}
                                </p>
                            </div>

                        </div>

                    )}



                    <div className="relative space-y-3 pt-2">

                        <span className="absolute -top-6 -left-4 text-6xl font-serif text-slate-100 select-none">
                            "
                        </span>

                        <p className="report-ai-text">
                            {autoSummary}
                        </p>

                        <span className="absolute -bottom-10 -right-4 text-6xl font-serif text-slate-100 rotate-180 select-none">
                            "
                        </span>

                    </div>

                </div>

            </div>

            {/* ─── Save ─────────────────────────────────────────────────────── */}
            <div className="flex justify-center pt-10">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveReport(false)}
                    className="h-16 px-12 rounded-2xl border-2 border-slate-100 bg-white text-slate-500 font-extrabold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 hover:shadow-2xl hover:shadow-slate-100 transition-all flex items-center gap-4 group"
                >
                    <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span>Save Section 5 Progress</span>
                </Button>
            </div>
        </div>
    );
}
