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
    { id: "Voluntary extracurricular activity", label: "Voluntary Extracurricular", color: "text-report-primary border-report-primary-border bg-report-primary-soft shadow-sm shadow-report-primary-shadow" },
    { id: "Course-linked assignment", label: "Course-linked Assignment", color: "text-report-primary border-report-primary-border bg-report-primary-soft shadow-sm shadow-report-primary-shadow" },
    { id: "Credit-bearing component", label: "Credit-bearing Component", color: "text-report-primary border-report-primary-border bg-report-primary-soft shadow-sm shadow-report-primary-shadow" },
    { id: "Capstone / Thesis-linked project", label: "Capstone / Thesis", color: "text-report-primary border-report-primary-border bg-report-primary-soft shadow-sm shadow-report-primary-shadow" },
    { id: "Research-integrated project", label: "Research-integrated", color: "text-report-primary border-report-primary-border bg-report-primary-soft shadow-sm shadow-report-primary-shadow" }
];

const competencies = [
    {
        id: 'cognitive', icon: BrainCircuit, label: 'Cognitive Competencies', items: [
            { key: 'cognitive_systemic', label: 'Understanding Interconnected Social, Environmental & Economic Issues', description: 'You can confidently connect theory to real-life problems.' },
            { key: 'cognitive_critical', label: 'Critical and Ethical Reasoning', description: 'You are developing judgment but can improve independent decision-making.' },
            { key: 'cognitive_evaluate', label: 'Ability to Evaluate Impact', description: 'You can evaluate effectiveness, not just participation.' }
        ]
    },
    {
        id: 'practical', icon: Star, label: 'Practical Competencies', items: [
            { key: 'practical_design', label: 'Project Design & Implementation', description: 'You can turn ideas into action.' },
            { key: 'practical_evidence', label: 'Evidence-Based Reporting', description: 'You worked at a professional, audit-ready level.' },
            { key: 'practical_engagement', label: 'Community Engagement', description: 'You showed strong field presence and interpersonal impact.' }
        ]
    },
    {
        id: 'social', icon: Info, label: 'Social & Civic Competencies', items: [
            { key: 'social_empathy', label: 'Responsibility & Empathy', description: 'You went beyond task completion and connected on a human level.' },
            { key: 'social_diversity', label: 'Awareness of Diversity & Inclusion', description: 'You respected and adapted to diverse community needs.' },
            { key: 'social_collaboration', label: 'Collaborative Problem-Solving', description: 'You demonstrated leadership and teamwork.' }
        ]
    },
    {
        id: 'transformative', icon: TrendingUp, label: 'Transformative Competencies', items: [
            { key: 'transformative_longterm', label: 'Long-Term Thinking', description: 'You are beginning to think beyond short-term results.' },
            { key: 'transformative_benefits', label: 'Understanding Benefits & Possible Downsides', description: 'You think in a balanced and realistic way.' },
            { key: 'transformative_sustainability', label: 'Sustainability-Oriented Decision Making', description: 'You are developing a sustainability mindset.' }
        ]
    }
];


export default function Section9Reflection() {
    const { data, updateSection, getFieldError, saveReport } = useReportForm();
    const { section9, section2 } = data;
    const {
        academic_integration, personal_learning, academic_application,
        competency_scores
    } = section9;

    const update = (field: string, val: any) => updateSection('section9', { [field]: val });
    const updateScore = (key: string, val: number) => update('competency_scores', { ...competency_scores, [key]: val });

    const getWordCount = (text: string) => (text || '').trim().split(/\s+/).filter(w => w.length > 0).length;
    const plWords = getWordCount(personal_learning);
    const aaWords = getWordCount(academic_application);

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

        return `This project was classified as a ${typeStr}. The student demonstrated strong ${bestCategory} competencies, with high ratings across key development areas.`;
    }, [academic_integration, competency_scores]);

    useEffect(() => {
        if (section9.summary_text !== autoNarrative) {
            updateSection('section9', { summary_text: autoNarrative });
        }
    }, [autoNarrative, section9.summary_text]);


    return (
        <div className="space-y-5 pb-10">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">

                <div className="w-14 h-14 rounded-2xl bg-report-primary text-white flex items-center justify-center shadow-xl shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                    <GraduationCap className="w-7 h-7" />
                </div>

                <div>
                    <h2 className="report-h2">
                        Section 9 — Reflection
                    </h2>

                    <p className="report-label">
                        Student Growth & Academic Integration
                    </p>
                </div>

            </div>

            {/* ─── Purpose note ────────────────────────────────────────────── */}
            <div className="p-5 bg-report-primary-soft border border-report-primary-border rounded-2xl flex items-start gap-4">
                <Info className="w-5 h-5 text-report-primary shrink-0 mt-0.5" />

                <div className="space-y-2">
                    <p className="report-label !text-report-primary">
                        This section captures what you learned, how your academic knowledge was applied, and which competencies you developed.
                    </p>

                    <p className="report-help !text-report-primary">
                        It transforms your report from simple volunteering into structured academic engagement.
                    </p>
                </div>
            </div>


            {/* ─── Step 1: Academic Integration ───────────────────────────── */}
            <div className="space-y-4">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center font-black text-[10px]">
                        9.0
                    </div>

                    <h3 className="report-h3">
                        Step 1 — Academic Integration Level (Mandatory)
                    </h3>
                </div>


                <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm space-y-6">

                    <Label className="report-h3 !text-sm !tracking-tight">
                        How does this project connect to your academic program?
                    </Label>


                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

                        {integrationOptions.map(opt => (

                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => update('academic_integration', opt.id)}
                                className={clsx(
                                    "p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden",
                                    academic_integration === opt.id
                                        ? opt.color
                                        : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-white"
                                )}
                            >

                                <p className="report-label !tracking-wide !text-xs">
                                    {opt.label}
                                </p>

                                {academic_integration === opt.id && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-current animate-pulse" />
                                )}

                            </button>

                        ))}

                    </div>

                    <FieldError message={getFieldError('academic_integration')} />

                </div>

            </div>
            {/* ─── Step 2: Personal Learning ──────────────────────────────── */}
            <div className="space-y-4">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center font-black text-[10px]">
                        9.1
                    </div>

                    <h3 className="report-h3">
                        Step 2 — Personal Learning Reflection
                    </h3>
                </div>


                <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">

                    <div className="space-y-1">
                        <Label className="report-h3 !text-sm !tracking-tight">
                            Personal Learning Reflecting (Mandatory)
                        </Label>

                        <p className="report-help">
                            Reflect on new skills, community insights, perspective changes, and challenges. Focus on learning, not just repeating activities.
                        </p>
                    </div>


                    <Textarea
                        placeholder="Through this project, I improved my communication and teamwork skills while working with community members..."
                        value={personal_learning}
                        onChange={e => update('personal_learning', e.target.value)}
                        className="min-h-[140px] w-full rounded-[1.5rem] border-2 border-slate-50 p-6 text-slate-700 font-medium bg-slate-50 outline-none focus:border-report-primary-border transition-all focus:bg-white resize-none"
                    />


                    <div className="flex items-center justify-between px-2">
                        <span className={clsx(
                            "report-label",
                            plWords >= 100 && plWords <= 200
                                ? "text-report-primary"
                                : plWords > 200
                                    ? "text-red-500"
                                    : "text-amber-500"
                        )}>
                            {plWords} / 200 words (Min 100)
                        </span>
                    </div>

                    <FieldError message={getFieldError('personal_learning')} />

                </div>

            </div>


            {/* ─── Step 3: Academic Application ───────────────────────────── */}
            <div className="space-y-4">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center font-black text-[10px]">
                        9.2
                    </div>

                    <h3 className="report-h3">
                        Step 3 — Academic Application
                    </h3>
                </div>


                <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm space-y-4">

                    <div className="space-y-1">

                        <Label className="report-h3 !text-sm !tracking-tight">
                            Academic Application & Discipline Contribution (Mandatory)
                        </Label>

                        <p className="report-help">
                            Explain how your field of study helped you understand the problem, design the intervention, or apply technical methods.
                        </p>

                        {section2?.discipline && (
                            <p className="report-label !text-report-primary bg-report-primary-soft !px-3 !py-1 !rounded-lg !inline-flex mt-2">
                                Your Discipline: {section2.discipline}
                            </p>
                        )}

                    </div>


                    <Textarea
                        placeholder="As a student, I applied basic data analysis techniques to track attendance and measure improvement..."
                        value={academic_application}
                        onChange={e => update('academic_application', e.target.value)}
                        className="min-h-[120px] w-full rounded-[1.5rem] border-2 border-slate-50 p-6 text-slate-700 font-medium bg-slate-50 outline-none focus:border-report-primary-border transition-all focus:bg-white resize-none"
                    />


                    <div className="flex items-center justify-between px-2">
                        <span className={clsx(
                            "report-label",
                            aaWords >= 100 && aaWords <= 200
                                ? "text-report-primary"
                                : aaWords > 200
                                    ? "text-red-500"
                                    : "text-amber-500"
                        )}>
                            {aaWords} / 200 words (Min 100)
                        </span>
                    </div>

                    <FieldError message={getFieldError('academic_application')} />

                </div>

            </div>




            {/* ─── Step 5: Competencies ───────────────────────────────────── */}
            <div className="space-y-4">

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-report-primary text-white flex items-center justify-center font-black text-[10px]">
                        9.3
                    </div>

                    <h3 className="report-h3">
                        Step 4 — Competency Self-Assessment
                    </h3>
                </div>


                <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-10 space-y-12">

                    <div className="space-y-4 max-w-3xl mx-auto">
                        <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b-2 border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</th>
                                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Meaning</th>
                                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">What it looks like in your work</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {[
                                        { val: "1", meaning: "Low", context: "No meaningful engagement — You had little to no involvement in this area and did not develop this competency during the project" },
                                        { val: "2", meaning: "Basic", context: "Initial exposure — You were introduced to this competency but had limited opportunity to apply it independently" },
                                        { val: "3", meaning: "Moderate", context: "Developing capability — You applied this competency with some guidance and are building confidence in using it" },
                                        { val: "4", meaning: "Strong", context: "Independent application — You applied this competency effectively and independently in real project situations" },
                                        { val: "5", meaning: "Advanced", context: "High level of proficiency — You demonstrated strong command, initiative, or leadership in applying this competency" }
                                    ].map(r => (
                                        <tr key={r.val} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-black text-[10px] tracking-tight">{r.val}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-slate-700">{r.meaning}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[10px] font-medium text-slate-500 leading-relaxed">{r.context}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {competencies.map(cat => (

                            <div
                                key={cat.id}
                                className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-6"
                            >

                                <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-4">
                                    <cat.icon className="w-5 h-5 text-report-primary" />

                                    <h4 className="report-h3 !text-sm !tracking-tight">
                                        {cat.label}
                                    </h4>
                                </div>


                                <div className="space-y-6">

                                    {cat.items.map(item => {

                                        const score =
                                            competency_scores[item.key as keyof typeof competency_scores] || 0;

                                        return (

                                            <div key={item.key} className="space-y-3">

                                                <div className="flex justify-between items-center gap-4">

                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-slate-900 text-[11px] leading-tight">
                                                            {item.label}
                                                        </p>
                                                        {item.description && (
                                                            <p className="text-[10px] font-medium text-slate-400 italic">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
 
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 text-slate-900 flex items-center justify-center font-black text-xs shrink-0">
                                                        {score > 0 ? score : '-'}
                                                    </div>

                                                </div>


                                                <div className="flex gap-1.5 h-10">

                                                    {[1, 2, 3, 4, 5].map(v => (

                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() => updateScore(item.key, v)}
                                                            className={clsx(
                                                                "flex-1 rounded-md transition-all report-label !not-italic !text-xs flex items-center justify-center",
                                                                score === v
                                                                    ? "bg-report-primary text-white scale-105 shadow-md shadow-report-primary-shadow"
                                                                    : score > v
                                                                        ? "bg-report-primary-soft text-report-primary"
                                                                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
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
                        <div className="w-10 h-10 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-lg shadow-report-primary-shadow">
                            <BrainCircuit className="w-5 h-5" />
                        </div>

                        <h3 className="report-h3 !text-lg">
                            System-Generated Academic Summary
                        </h3>
                    </div>

                    <span className="report-label !bg-slate-100 !px-3 !py-1 !rounded-xl">
                        Read-Only
                    </span>

                </div>


                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* Academic Integration Grid */}
                    <div className="md:col-span-12 bg-white border-2 border-slate-100 rounded-[2rem] p-8 space-y-6">

                        <p className="report-label !mb-4">
                            Academic Integration Overview
                        </p>


                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                                    {integrationOptions.find(o => o.id === academic_integration)?.label || 'Pending'}
                                </p>

                                <p className="report-label !text-[8px] !text-slate-500">
                                    Integration Level
                                </p>
                            </div>


                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                                    {section2?.discipline || 'N/A'}
                                </p>

                                <p className="report-label !text-[8px] !text-slate-500">
                                    Discipline Applied
                                </p>
                            </div>


                            <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                                <p className="report-h3 !text-2xl font-black">
                                    {(Object.values(competency_scores).reduce((a, b) => a + Number(b), 0) / 12).toFixed(1)}
                                </p>

                                <p className="report-label !text-[8px] !text-slate-500">
                                    Avg Competency Score
                                </p>
                            </div>



                        </div>

                    </div>

                </div>


                {/* Auto narrative */}
                {/* ─── Auto-Generated Summary ────────────────────────────── */}
                <div className="pt-16 border-t-2 border-slate-100">

                    <div className="flex items-center justify-between mb-8">

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-lg shadow-report-primary-shadow">
                                <BrainCircuit className="w-6 h-6" />
                            </div>

                            <h3 className="report-h3 !text-xl !italic">
                                Academic Reflection Summary
                            </h3>
                        </div>

                        <div className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest border border-slate-800">
                            Auto-Generated
                        </div>

                    </div>


                    <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-12 relative overflow-hidden shadow-xl space-y-10 group">

                        {/* watermark icon */}
                        <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12">
                            <BrainCircuit className="w-80 h-80 text-slate-900" />
                        </div>

                        <div className="relative z-10 space-y-6">

                            {/* opening quote */}
                            <span className="absolute -top-10 -left-6 text-7xl font-serif text-slate-100 select-none">
                                “
                            </span>

                            <p className="report-ai-text">
                                {autoNarrative}
                            </p>

                            {/* closing quote */}
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
