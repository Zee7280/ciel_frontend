import React, { useMemo } from "react";
import { TrendingUp, Info, Save, Activity, Plus, Trash2, CheckCircle2, AlertCircle, Sparkles, Target, BarChart3, HelpCircle, PlusCircle } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";
import { sdgData } from "@/utils/sdgData";

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
    measurement_explanation?: string;
};

// ─── Static data ──────────────────────────────────────────────────────────────
const outcomeCategories = [
    "Access Improvement", "Behavior Change", "Knowledge / Skills Improvement",
    "Economic Improvement", "Health & Well-being", "Environmental Improvement",
    "Institutional Strengthening", "Inclusion / Participation", "Partnership Strengthening",
    "Policy Change", "Other"
];

const confidenceLevels = ["Directly Measured", "Partner Confirmed", "Observed", "Estimated"];

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
    const baseline = parseFloat(outcome.baseline) || 0;
    const endline = parseFloat(outcome.endline) || 0;
    const improvement = endline - baseline;

    return (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-8 relative group">
            {/* Card header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-report-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-report-primary-shadow">
                        {index + 1}
                    </div>
                    <span className="report-h3 !text-sm">Measurable Outcome</span>
                </div>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="w-10 h-10 rounded-2xl bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all duration-300"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left side: Category & Metric */}
                <div className="space-y-6">
                    <div className="space-y-3">
                        <Label className="report-label">5.2.1 Outcome Category (Select One)</Label>
                        <select
                            value={outcome.outcome_area}
                            onChange={e => onUpdate('outcome_area', e.target.value)}
                            className="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-bold text-slate-700 text-sm outline-none focus:border-report-primary-border transition-all"
                        >
                            <option value="">Select Category...</option>
                            {outcomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <Label className="report-label">5.2.2 Specific Metric</Label>
                        <p className="text-[10px] text-slate-400 font-medium italic mb-1">e.g. Number of students trained / Number of people receiving food</p>
                        <Input
                            placeholder="What exactly are you measuring?"
                            value={outcome.metric}
                            onChange={e => onUpdate('metric', e.target.value)}
                            className="h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 font-bold text-slate-700 focus:bg-white"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label className="report-label">5.2.7 Measurement Explanation (IMPORTANT)</Label>
                        <Textarea
                            placeholder="Explain how your numbers come from Section 4 and what data supports this..."
                            value={outcome.measurement_explanation}
                            onChange={e => onUpdate('measurement_explanation', e.target.value)}
                            className="min-h-[100px] rounded-2xl border-2 border-slate-50 bg-slate-50 p-6 text-xs font-bold text-slate-700 focus:bg-white resize-none"
                        />
                    </div>
                </div>

                {/* Right side: Values & Confidence */}
                <div className="space-y-6 bg-slate-50/50 p-8 rounded-[2rem] border-2 border-slate-50">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="report-label">5.2.3 Baseline (Before)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={outcome.baseline}
                                onChange={e => onUpdate('baseline', e.target.value)}
                                className="h-14 bg-white border-2 border-slate-100 rounded-2xl px-6 font-black text-xl text-slate-400 focus:border-report-primary-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="report-label">5.2.4 Endline (After)</Label>
                            <Input
                                type="number"
                                placeholder="300"
                                value={outcome.endline}
                                onChange={e => onUpdate('endline', e.target.value)}
                                className="h-14 bg-white border-2 border-slate-100 rounded-2xl px-6 font-black text-xl text-report-primary focus:border-report-primary-border"
                            />
                        </div>
                    </div>

                    {/* Auto-calc improvement */}
                    <div className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <TrendingUp className={clsx("w-5 h-5", improvement > 0 ? "text-emerald-500" : "text-slate-300")} />
                            <span className="report-label !mb-0">Improvement</span>
                        </div>
                        <span className={clsx(
                            "text-2xl font-black rounded-lg px-4",
                            improvement > 0 ? "text-emerald-600" : improvement < 0 ? "text-red-500" : "text-slate-300"
                        )}>
                            {improvement > 0 ? '+' : ''}{improvement}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <Label className="report-label">5.2.6 Confidence Level</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {confidenceLevels.map(lvl => (
                                <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => onUpdate('confidence_level', lvl)}
                                    className={clsx(
                                        "px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider text-left transition-all",
                                        outcome.confidence_level === lvl
                                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-md shadow-emerald-100"
                                            : "border-white bg-white text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Section5Outcomes() {
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
    const { section4, section5, section1, section3 } = data;

    const outcomes: MeasurableOutcome[] = section5.measurable_outcomes || [];
    const update = (field: string, val: any) => updateSection('section5', { [field]: val });

    const addOutcome = () => {
        update('measurable_outcomes', [
            ...outcomes,
            { id: `outcome-${Date.now()}`, outcome_area: '', metric: '', baseline: '', endline: '', unit: '', confidence_level: '', measurement_explanation: '' }
        ]);
    };

    const removeOutcome = (idx: number) => {
        update('measurable_outcomes', outcomes.filter((_, i) => i !== idx));
    };

    const updateOutcome = (idx: number, field: keyof MeasurableOutcome, val: string) => {
        const next = [...outcomes];
        next[idx] = { ...next[idx], [field]: val };
        update('measurable_outcomes', next);
    };

    const observedWords = (section5.observed_change || '').trim().split(/\s+/).filter(w => w.length > 0).length;
    const challengeWords = (section5.challenges || '').trim().split(/\s+/).filter(w => w.length > 0).length;

    return (
        <div className="space-y-12 pb-16">
            {/* Header */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="report-h2">Section 5 — Outcomes & Results</h2>
                        <p className="report-label text-slate-500">What Changed Because of Your Project</p>
                    </div>
                </div>

                <div className="p-6 bg-report-primary-soft border border-report-primary-border rounded-3xl space-y-4">
                    <div className="flex items-center gap-3 text-report-primary">
                        <BarChart3 className="w-5 h-5" />
                        <h3 className="report-h3 !text-sm">Purpose of This Section</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        This section explains exactly what changed because of your project.
                        You will describe the qualitative change, measure it with data, and reflect on the limitations of your impact.
                    </p>
                </div>
            </div>

            {/* 5.1 Observed Change */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">5.1</div>
                    <h3 className="report-h3">Observed Change (Narrative)</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <Label className="report-label text-slate-800">Describe what changed as a result of your project</Label>
                        <p className="text-[10px] text-slate-400 font-medium italic">
                            Include: 1. Before (Baseline), 2. After (Change), 3. Link to Section 4 Activities/Outputs, 4. What beneficiaries can now do differently.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                            <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center border border-amber-100 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-amber-900 uppercase">Be Specific</p>
                                <p className="text-[9px] font-medium text-amber-800 uppercase">Use real world data and observations from your time in the field.</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-4">
                            <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center border border-red-100 shrink-0">
                                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-red-900 uppercase">Avoid Exaggeration</p>
                                <p className="text-[9px] font-medium text-red-800 uppercase">Do not repeat activities here; focus only on the resulting change.</p>
                            </div>
                        </div>
                    </div>

                    <Textarea
                        placeholder="Explain the direction and nature of change (100–200 words)..."
                        className="min-h-[180px] rounded-[1.5rem] border-2 border-slate-50 bg-slate-50 p-8 text-xs font-bold text-slate-700 outline-none focus:border-report-primary-border transition-all focus:bg-white resize-none"
                        value={section5.observed_change}
                        onChange={e => update('observed_change', e.target.value)}
                    />

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Word Count: {observedWords}</span>
                        <span className={clsx(observedWords >= 100 && observedWords <= 200 ? "text-emerald-600" : "text-amber-500")}>Range: 100-200 Words</span>
                    </div>
                </div>
            </div>

            {/* 5.2 Measurable Outcomes */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">5.2</div>
                        <h3 className="report-h3">Measurable Outcomes</h3>
                    </div>
                    <Button
                        type="button"
                        onClick={addOutcome}
                        variant="outline"
                        className="h-10 px-6 rounded-xl border-2 border-emerald-600 text-emerald-600 font-black text-[10px] uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all shadow-md shadow-emerald-50"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" /> Add Measurable Outcome
                    </Button>
                </div>

                <div className="space-y-8">
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

            {/* 5.3 Challenges */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">5.3</div>
                    <h3 className="report-h3">Challenges & Limitations</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <Label className="report-label text-slate-800">What challenges did you face? (Required)</Label>
                        <p className="text-[10px] text-slate-400 font-medium italic">
                            Include: scaling barriers, delivery issues, and what could not be fully measured.
                        </p>
                    </div>

                    <Textarea
                        placeholder="Reflect honestly on the limitations of your project scale or measurement accuracy..."
                        className="min-h-[140px] rounded-[1.5rem] border-2 border-slate-50 bg-slate-50 p-8 text-xs font-bold text-slate-700 outline-none focus:border-report-primary-border transition-all focus:bg-white resize-none"
                        value={section5.challenges}
                        onChange={e => update('challenges', e.target.value)}
                    />

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Word Count: {challengeWords}</span>
                        <span className="text-emerald-600">Be Honest and Transparent</span>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-center pt-10">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveReport(false)}
                    className="h-16 px-12 rounded-2xl border-2 border-slate-100 bg-white text-slate-500 font-extrabold uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 hover:shadow-xl transition-all flex items-center gap-4 group"
                >
                    <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span>Save Outcomes Section</span>
                </Button>
            </div>
        </div>
    );
}
