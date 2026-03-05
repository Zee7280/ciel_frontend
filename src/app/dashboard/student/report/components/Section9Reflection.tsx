import { BookOpen, GraduationCap, BrainCircuit, Star, Save, Info, AlertCircle, Quote, TrendingUp } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import React, { useMemo, useEffect } from "react";
import clsx from "clsx";

// ─── Static configuration ───────────────────────────────────────────────────
const integrationOptions = [
    { id: "Voluntary extracurricular activity", label: "Voluntary Extracurricular", color: "text-amber-600 border-amber-200 bg-amber-50" },
    { id: "Course-linked assignment", label: "Course-linked Assignment", color: "text-blue-600 border-blue-200 bg-blue-50" },
    { id: "Credit-bearing component", label: "Credit-bearing Component", color: "text-emerald-600 border-emerald-200 bg-emerald-50" },
    { id: "Capstone / Thesis-linked project", label: "Capstone / Thesis", color: "text-violet-600 border-violet-200 bg-violet-50" },
    { id: "Research-integrated project", label: "Research-integrated", color: "text-rose-600 border-rose-200 bg-rose-50" }
];

const competencies = [
    {
        id: 'cognitive', icon: BrainCircuit, label: 'Cognitive Competencies', items: [
            { key: 'cognitive_systemic', label: 'Understanding interconnected social, environmental & economic issues' },
            { key: 'cognitive_critical', label: 'Critical and ethical reasoning' },
            { key: 'cognitive_evaluate', label: 'Ability to evaluate impact' }
        ]
    },
    {
        id: 'practical', icon: Star, label: 'Practical Competencies', items: [
            { key: 'practical_design', label: 'Project design & implementation' },
            { key: 'practical_evidence', label: 'Evidence-based reporting' },
            { key: 'practical_engagement', label: 'Community engagement' }
        ]
    },
    {
        id: 'social', icon: Info, label: 'Social & Civic Competencies', items: [
            { key: 'social_empathy', label: 'Responsibility & empathy' },
            { key: 'social_diversity', label: 'Awareness of diversity & inclusion' },
            { key: 'social_collaboration', label: 'Collaborative problem-solving' }
        ]
    },
    {
        id: 'transformative', icon: TrendingUp, label: 'Transformative Competencies', items: [
            { key: 'transformative_longterm', label: 'Long-term thinking' },
            { key: 'transformative_benefits', label: 'Understanding benefits and possible downsides' },
            { key: 'transformative_sustainability', label: 'Sustainability-oriented decision making' }
        ]
    }
];

export default function Section9Reflection() {
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
    const { section9, section2 } = data;
    const {
        academic_integration, personal_learning, academic_application,
        sustainability_reflection, competency_scores
    } = section9;

    const update = (field: string, val: any) => updateSection('section9', { [field]: val });
    const updateScore = (key: string, val: number) => update('competency_scores', { ...competency_scores, [key]: val });

    const getWordCount = (text: string) => (text || '').trim().split(/\s+/).filter(w => w.length > 0).length;
    const plWords = getWordCount(personal_learning);
    const aaWords = getWordCount(academic_application);
    const srWords = getWordCount(sustainability_reflection);

    // ── Content generation ────────────────────────────────────────────────────
    const autoNarrative = useMemo(() => {
        const typeStr = integrationOptions.find(o => o.id === academic_integration)?.label.toLowerCase() || 'unspecified academic engagement';

        // find strongest category average
        let bestCategory = 'technical and social';
        let highestAvg = 0;
        competencies.forEach(cat => {
            const scores = cat.items.map(i => competency_scores[i.key as keyof typeof competency_scores] || 0);
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg > highestAvg) {
                highestAvg = avg;
                bestCategory = cat.label.replace(' Competencies', '').toLowerCase();
            }
        });

        const susStr = srWords > 80 ? "strong long-term systems awareness" : srWords > 40 ? "moderate long-term systems awareness" : "developing long-term systems awareness";

        return `This project was classified as a ${typeStr}. The student demonstrated strong ${bestCategory} competencies, with high ratings across key development areas. Sustainability reflection indicates ${susStr}.`;
    }, [academic_integration, competency_scores, srWords]);

    useEffect(() => {
        if (section9.summary_text !== autoNarrative) {
            updateSection('section9', { summary_text: autoNarrative });
        }
    }, [autoNarrative, section9.summary_text]);


    return (
        <div className="space-y-12 pb-16">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-xl shadow-violet-100 ring-4 ring-violet-50">
                    <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Section 9 — Reflection</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">Student Growth & Academic Integration</p>
                </div>
            </div>

            {/* ─── Purpose note ────────────────────────────────────────────── */}
            <div className="p-5 bg-violet-50 border border-violet-100 rounded-2xl flex items-start gap-4">
                <Info className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-violet-900 uppercase tracking-widest leading-relaxed">
                        This section captures what you learned, how your academic knowledge was applied, and which competencies you developed.
                    </p>
                    <p className="text-[10px] text-violet-700 font-semibold leading-relaxed">
                        It transforms your report from simple volunteering into structured academic engagement.
                    </p>
                </div>
            </div>

            {/* ─── Step 1: Academic Integration ───────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">9.0</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 1 — Academic Integration Level (Mandatory)</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">
                    <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">How does this project connect to your academic program?</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {integrationOptions.map(opt => (
                            <button
                                key={opt.id} type="button"
                                onClick={() => update('academic_integration', opt.id)}
                                className={clsx(
                                    "p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden",
                                    academic_integration === opt.id ? opt.color : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300"
                                )}
                            >
                                <p className="text-xs font-black tracking-wide leading-relaxed">{opt.label}</p>
                                {academic_integration === opt.id && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-current animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                    <FieldError message={getFieldError('section9.academic_integration')} />
                </div>
            </div>

            {/* ─── Step 2: Personal Learning ──────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">9.1</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 2 — Personal Learning Reflection</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">
                    <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Personal Learning Reflecting (Mandatory)</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                            Reflect on new skills, community insights, perspective changes, and challenges. Focus on learning, not just repeating activities.
                        </p>
                    </div>
                    <Textarea
                        placeholder="Through this project, I improved my communication and teamwork skills while working with community members..."
                        value={personal_learning}
                        onChange={e => update('personal_learning', e.target.value)}
                        className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-medium text-slate-700 text-sm outline-none focus:border-violet-200 transition-all resize-none"
                    />
                    <div className="flex items-center justify-between px-2">
                        <span className={clsx(
                            "text-[10px] font-black uppercase tracking-widest",
                            plWords >= 80 && plWords <= 120 ? "text-emerald-600" : plWords > 120 ? "text-red-500" : "text-amber-500"
                        )}>
                            {plWords} / 120 words (Min 80)
                        </span>
                    </div>
                    <FieldError message={getFieldError('section9.personal_learning')} />
                </div>
            </div>

            {/* ─── Step 3: Academic Application ───────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">9.2</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 3 — Academic Application</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">
                    <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Academic Application & Discipline Contribution (Mandatory)</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                            Explain how your field of study helped you understand the problem, design the intervention, or apply technical methods.
                        </p>
                        {section2?.discipline && (
                            <p className="text-[10px] font-black text-violet-600 bg-violet-50 px-3 py-1 rounded-lg inline-flex mt-2">
                                Your Discipline: {section2.discipline}
                            </p>
                        )}
                    </div>
                    <Textarea
                        placeholder="As a student, I applied basic data analysis techniques to track attendance and measure improvement..."
                        value={academic_application}
                        onChange={e => update('academic_application', e.target.value)}
                        className="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-medium text-slate-700 text-sm outline-none focus:border-violet-200 transition-all resize-none"
                    />
                    <div className="flex items-center justify-between px-2">
                        <span className={clsx(
                            "text-[10px] font-black uppercase tracking-widest",
                            aaWords <= 60 ? "text-emerald-600" : "text-red-500"
                        )}>
                            {aaWords} / 60 words (Max 60)
                        </span>
                    </div>
                    <FieldError message={getFieldError('section9.academic_application')} />
                </div>
            </div>

            {/* ─── Step 4: Sustainability ─────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">9.3</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 4 — Sustainability & Systems Thinking</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">
                    <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Sustainability Reflection (Mandatory)</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                            Reflect on the long-term dimension. Will impact continue? What limits sustainability? Any unintended effects?
                        </p>
                    </div>
                    <Textarea
                        placeholder="While the immediate training was successful, long-term impact depends on community access to resources..."
                        value={sustainability_reflection}
                        onChange={e => update('sustainability_reflection', e.target.value)}
                        className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-medium text-slate-700 text-sm outline-none focus:border-violet-200 transition-all resize-none"
                    />
                    <div className="flex items-center justify-between px-2">
                        <span className={clsx(
                            "text-[10px] font-black uppercase tracking-widest",
                            srWords >= 60 && srWords <= 100 ? "text-emerald-600" : srWords > 100 ? "text-red-500" : "text-amber-500"
                        )}>
                            {srWords} / 100 words (Min 60)
                        </span>
                    </div>
                    <FieldError message={getFieldError('section9.sustainability_reflection')} />
                </div>
            </div>

            {/* ─── Step 5: Competencies ───────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">9.4</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 5 — Competency Self-Assessment</h3>
                </div>
                <div className="bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-10 space-y-12">
                    <div className="space-y-1 text-center">
                        <Label className="text-sm font-black text-slate-900 uppercase tracking-tight">Competency Development Rating</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rate each from 1 (Low) to 5 (Strong)</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {competencies.map(cat => (
                            <div key={cat.id} className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-4">
                                    <cat.icon className="w-5 h-5 text-violet-600" />
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{cat.label}</h4>
                                </div>
                                <div className="space-y-6">
                                    {cat.items.map(item => {
                                        const score = competency_scores[item.key as keyof typeof competency_scores] || 0;
                                        return (
                                            <div key={item.key} className="space-y-3">
                                                <div className="flex justify-between items-center gap-4">
                                                    <p className="text-xs font-bold text-slate-600 leading-snug pr-4">{item.label}</p>
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 text-slate-900 flex items-center justify-center font-black text-xs shrink-0">
                                                        {score > 0 ? score : '-'}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1.5 h-10">
                                                    {[1, 2, 3, 4, 5].map(v => (
                                                        <button
                                                            key={v} type="button"
                                                            onClick={() => updateScore(item.key, v)}
                                                            className={clsx(
                                                                "flex-1 rounded-md transition-all font-black text-[10px] flex items-center justify-center",
                                                                score === v ? "bg-violet-600 text-white scale-105 shadow-md shadow-violet-200" :
                                                                    score > v ? "bg-violet-300 text-violet-800" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                                            )}
                                                        >
                                                            {v}
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
                </div>
            </div>

            {/* ─── Auto-Generated System Analytics ────────────────────────────── */}
            <div className="pt-8 border-t-2 border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">System-Generated Academic Summary</h3>
                    </div>
                    <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">Read-Only</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Academic Integration Grid */}
                    <div className="md:col-span-12 bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Academic Integration Overview</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                                    {integrationOptions.find(o => o.id === academic_integration)?.label || 'Pending'}
                                </p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Integration Level</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                                    {section2?.discipline || 'N/A'}
                                </p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Discipline Applied</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-2xl font-black text-violet-700">
                                    {(Object.values(competency_scores).reduce((a, b) => a + Number(b), 0) / 12).toFixed(1)}
                                </p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Avg Competency Score</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-sm font-black text-emerald-700 leading-snug">
                                    {srWords >= 60 && srWords <= 100 ? "Strong" : srWords > 30 ? "Moderate" : "Basic"}
                                </p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Sustainability Reflection</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Auto narrative */}
                <div className="bg-violet-900 rounded-[2.5rem] p-8 relative overflow-hidden">
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
                    <span>Save Reflection Section</span>
                </Button>
            </div>
        </div>
    );
}
