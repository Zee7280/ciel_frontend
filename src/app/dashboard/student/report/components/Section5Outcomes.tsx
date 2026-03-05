import { TrendingUp, AlertCircle, Info, Save, Activity, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useEffect, useMemo } from "react";
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
        "Students able to apply learned concept in practice"
    ],
    "Behaviour / Practice Change": [
        "Adoption of recommended practice", "Behaviour change adoption rate",
        "Hygiene practices improved", "Safe health practices adopted",
        "Increased school attendance behaviour", "Improved waste disposal behaviour",
        "Improved financial management behaviour", "Increased exercise / healthy lifestyle adoption",
        "Reduction in harmful behaviour", "Increased civic participation behaviour",
        "Adoption of climate-friendly practices", "Reduction in risky behaviour"
    ],
    "Access Improvement": [
        "People gaining access to services", "People gaining access to digital tools",
        "People gaining access to education resources", "Households gaining access to clean water",
        "Individuals gaining access to healthcare services", "Students gaining access to learning materials",
        "Communities gaining internet access", "Beneficiaries accessing new facilities",
        "Beneficiaries accessing financial services", "Communities accessing environmental resources",
        "Users accessing digital platform"
    ],
    "Economic Improvement": [
        "Jobs created", "Income opportunities generated", "Businesses strengthened",
        "Businesses created / started", "Participants employed after training",
        "Participants starting income activity", "Cost savings achieved",
        "Increase in household income", "Market access improved", "Microenterprise created",
        "Participants accessing microfinance", "Financial resources mobilized"
    ],
    "Environmental Improvement": [
        "Trees planted", "Waste reduced", "Waste recycled", "Water saved",
        "Water access improved", "Energy consumption reduced", "Carbon emissions reduced",
        "Green spaces created", "Environmental awareness improved",
        "Households adopting sustainable practices", "Plastic use reduction",
        "Compost systems implemented", "Biodiversity protection actions implemented"
    ],
    "Institutional / System Strengthening": [
        "Systems developed or improved", "Policies developed", "Institutional procedures improved",
        "Digital systems implemented", "Institutional capacity improved",
        "Staff trained in new procedures", "Monitoring systems established",
        "Reporting systems developed", "Data systems implemented",
        "Organizational processes improved", "Institutional service capacity increased"
    ],
    "Inclusion / Participation Increase": [
        "Participation of women increased", "Participation of youth increased",
        "Participation of marginalized groups increased",
        "Participation of persons with disabilities increased",
        "Community participation rate increased", "Stakeholder engagement increased",
        "Representation of vulnerable groups improved", "Volunteer participation increased",
        "Community meeting attendance increased", "Civic participation increased"
    ],
    "Partnership Strengthening": [
        "Partnerships established", "Collaboration agreements signed",
        "Multi-stakeholder initiatives launched", "Partner organizations engaged",
        "Joint programs implemented", "Resource sharing agreements established",
        "Cross-sector collaborations initiated", "Institutional collaboration frameworks developed"
    ],
    "Policy / Governance Change": [
        "Policy recommendations submitted", "Policy consultations conducted",
        "Policy briefs developed", "Local regulations influenced",
        "Community governance structures improved", "Public consultations facilitated",
        "Institutional policy adopted", "Government program collaboration initiated",
        "Public service delivery improved"
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
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
                        {index + 1}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Measurable Outcome</span>
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
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">5.2A — Outcome Category</Label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {outcomeCategories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => onUpdate('outcome_area', cat)}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border-2 text-left text-[10px] font-black uppercase tracking-wider transition-all",
                                        outcome.outcome_area === cat
                                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-md shadow-emerald-50"
                                            : "border-slate-50 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        {outcome.outcome_area === 'Other' && (
                            <input
                                type="text"
                                placeholder="Specify custom outcome area..."
                                value={outcome.outcome_area_other || ''}
                                onChange={e => onUpdate('outcome_area_other', e.target.value)}
                                className="w-full h-10 bg-slate-50 border-2 border-emerald-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-emerald-300"
                            />
                        )}
                    </div>

                    {/* 5.2B Metric */}
                    {outcome.outcome_area && (
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">5.2B — Specific Metric</Label>
                            {outcome.outcome_area !== 'Other' && metrics.length > 0 ? (
                                <select
                                    value={outcome.metric}
                                    onChange={e => onUpdate('metric', e.target.value)}
                                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-slate-700 text-xs outline-none focus:border-emerald-200"
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
                                <input
                                    type="text"
                                    placeholder="Specify custom metric..."
                                    value={outcome.metric_other || ''}
                                    onChange={e => onUpdate('metric_other', e.target.value)}
                                    className="w-full h-10 bg-slate-50 border-2 border-emerald-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-emerald-300"
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
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5.2C — Baseline (Before)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={outcome.baseline}
                                onChange={e => onUpdate('baseline', e.target.value)}
                                className="h-14 bg-white border-2 border-slate-100 rounded-2xl px-4 font-black text-lg focus:border-emerald-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5.2D — Endline (After)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={outcome.endline}
                                onChange={e => onUpdate('endline', e.target.value)}
                                className="h-14 bg-white border-2 border-slate-100 rounded-2xl px-4 font-black text-lg text-emerald-600 focus:border-emerald-200"
                            />
                        </div>
                    </div>

                    {/* Live improvement */}
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Improvement</span>
                        <span className={clsx(
                            "text-xl font-black rounded-xl px-4 py-1",
                            improvement > 0 ? "text-emerald-600 bg-emerald-50" : improvement < 0 ? "text-red-600 bg-red-50" : "text-slate-400 bg-slate-100"
                        )}>
                            {improvement > 0 ? '+' : ''}{improvement}
                        </span>
                    </div>

                    {/* Unit */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit of Measurement</Label>
                        <select
                            value={outcome.unit}
                            onChange={e => onUpdate('unit', e.target.value)}
                            className="w-full h-11 bg-white border-2 border-slate-100 rounded-xl px-4 font-bold text-slate-700 text-xs outline-none focus:border-emerald-200"
                        >
                            <option value="">Select Unit...</option>
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        {outcome.unit === 'Other' && (
                            <input
                                type="text"
                                placeholder="Specify unit..."
                                value={outcome.unit_other || ''}
                                onChange={e => onUpdate('unit_other', e.target.value)}
                                className="w-full h-10 bg-white border-2 border-emerald-100 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none"
                            />
                        )}
                    </div>

                    {/* 5.2F Confidence Level */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5.2F — Confidence Level</Label>
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
        const first = outcomes[0];
        if (!first?.metric || !first?.endline) return "Impact narrative will appear once outcomes are recorded.";
        const imp = calcImprovement(first);
        const extra = outcomes.length > 1 ? ` Additionally, ${outcomes.length - 1} supplementary outcome(s) were recorded.` : '';
        return `The project recorded measurable improvement aligned with the primary SDG. The ${first.metric.toLowerCase()} improved from ${first.baseline} to ${first.endline} (${imp > 0 ? '+' : ''}${imp} ${first.unit}). Change was ${first.confidence_level?.toLowerCase() || 'recorded'} through structured measurement.${extra}`;
    }, [outcomes]);

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
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-100 ring-4 ring-emerald-50">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Section 5 — Outcomes & Results</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">Measurable Change Resulting from Your Project</p>
                    </div>
                </div>
            </div>

            {/* ─── 5.0 Project Snapshot ────────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">5.0</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Project Snapshot</h3>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Auto-Generated · Read-Only</span>
                </div>

                <div className="p-6 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary SDG</p>
                            <p className="text-xs font-black truncate">{data.section3.primary_sdg.goal_title || "—"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SDG Target</p>
                            <p className="text-xs font-black">{data.section3.primary_sdg.target_code || "—"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Participation</p>
                            <p className="text-xs font-black capitalize">{data.section1.participation_type}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Beneficiaries</p>
                            <p className="text-xs font-black">{section4.total_beneficiaries || "0"} Reached</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Output Types</p>
                            <p className="text-xs font-black">{section4.outputs.filter(o => o.type).length} Recorded</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Hours</p>
                            <p className="text-xs font-black">{data.section1.metrics.total_verified_hours}h</p>
                        </div>
                    </div>
                </div>

                {/* Reminder note */}
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-blue-800 uppercase tracking-widest">📌 Reminder</p>
                        <p className="text-[9px] text-blue-700 font-semibold">Your outcome must reflect measurable change resulting from the outputs recorded in Section 4. No SDG selection is required here — the SDG framework is already assigned from Section 3.</p>
                    </div>
                </div>
            </div>

            {/* ─── Step 1: Observed Change ─────────────────────────────────── */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">5.1</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Step 1 — Observed Change (Narrative)</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Describe the change that occurred (Required)</Label>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            What improved or strengthened? What can beneficiaries now do that they could not before? How does this relate to the assigned SDG target?
                            <span className="text-emerald-600 font-bold ml-1 italic">(80–120 Words)</span>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Guidelines</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {["Refer to beneficiaries from Section 4", "Connect change to activities & outputs", "Be realistic and specific"].map(g => (
                                <p key={g} className="text-[9px] text-emerald-700 font-semibold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3 h-3" /> {g}
                                </p>
                            ))}
                            {["Do not claim problem was fully solved", "Do not claim SDG achievement"].map(g => (
                                <p key={g} className="text-[9px] text-red-600 font-semibold flex items-center gap-1.5">
                                    <AlertCircle className="w-3 h-3" /> {g}
                                </p>
                            ))}
                        </div>
                    </div>

                    <Textarea
                        placeholder="Explain the direction and nature of change resulting from your activities..."
                        className={clsx(
                            "min-h-[160px] rounded-[1.5rem] border-2 border-slate-50 p-6 text-slate-700 font-medium bg-slate-50 outline-none focus:border-emerald-200 transition-all focus:bg-white",
                            getFieldError('observed_change') && "border-red-200 bg-red-50"
                        )}
                        value={section5.observed_change || ''}
                        onChange={(e) => updateSection('section5', { observed_change: e.target.value })}
                    />
                    <FieldError message={getFieldError('observed_change')} />
                    <div className="flex justify-between items-center px-2">
                        <p className={clsx(
                            "text-[10px] font-black uppercase tracking-widest",
                            observedWords >= 80 && observedWords <= 120 ? "text-emerald-600" : observedWords > 120 ? "text-red-500" : "text-slate-400"
                        )}>
                            Word Count: {observedWords} / 120
                        </p>
                        {observedWords >= 80 && observedWords <= 120 && (
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Within range
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Step 2: Measurable Outcomes ─────────────────────────────── */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">5.2</div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Step 2 — Measurable Outcomes</h3>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={addOutcome}
                        className="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100"
                    >
                        <Plus className="w-3 h-3 mr-1.5" /> Add Measurable Outcome
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
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">5.3</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Step 3 — Challenges & Limitations</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Reflect honestly on limitations (Required)</Label>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            What limited scale of impact? What could not be fully measured? What barriers affected sustainability?
                            <span className="text-orange-600 font-bold ml-1 italic">(Max 150 Words)</span>
                        </p>
                    </div>
                    <Textarea
                        placeholder="Reflect honestly on barriers, unintended effects, or what could not be fully measured..."
                        className={clsx(
                            "min-h-[120px] rounded-[1.5rem] border-2 border-slate-50 p-6 text-slate-700 font-medium bg-slate-50 outline-none focus:border-emerald-200 transition-all",
                            getFieldError('challenges') && "border-red-200 bg-red-50"
                        )}
                        value={section5.challenges || ''}
                        onChange={(e) => updateSection('section5', { challenges: e.target.value })}
                    />
                    <FieldError message={getFieldError('challenges')} />
                    <p className={clsx(
                        "text-[10px] font-black uppercase tracking-widest px-2",
                        challengeWords > 150 ? "text-red-500" : "text-slate-400"
                    )}>
                        {challengeWords} / 150 words — Transparent reporting strengthens institutional credibility.
                    </p>
                </div>
            </div>

            {/* ─── Auto-Generated Summary ──────────────────────────────────── */}
            <div className="pt-16 border-t-2 border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-100">
                            <Activity className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Outcome Measurement Summary</h3>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                        System-Generated · Read-Only
                    </div>
                </div>

                <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-10 relative overflow-hidden shadow-xl space-y-8 group">
                    <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12">
                        <TrendingUp className="w-80 h-80 text-slate-900" />
                    </div>

                    {/* Stats grid for first outcome */}
                    {outcomes[0]?.metric && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-20 pb-8 border-b border-slate-100">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary SDG</span>
                                <p className="text-xs font-black text-slate-900">{data.section3.primary_sdg.goal_title || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Metric</span>
                                <p className="text-xs font-black text-slate-900 truncate">{outcomes[0].metric}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Improvement</span>
                                <p className="text-xs font-black text-emerald-600">
                                    {calcImprovement(outcomes[0]) > 0 ? '+' : ''}{calcImprovement(outcomes[0])} {outcomes[0].unit}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confidence</span>
                                <p className="text-xs font-black text-slate-900">{outcomes[0].confidence_level || "—"}</p>
                            </div>
                        </div>
                    )}

                    <div className="relative z-10 space-y-4 pt-2">
                        <span className="absolute -top-8 -left-4 text-7xl font-serif text-slate-100 select-none">"</span>
                        <div className="text-xl font-bold text-slate-800 leading-[1.7] tracking-tight font-serif">
                            {autoSummary}
                        </div>
                        <span className="absolute -bottom-12 -right-4 text-7xl font-serif text-slate-100 select-none rotate-180">"</span>
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
