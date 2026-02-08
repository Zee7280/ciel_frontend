import { Compass, Lightbulb, TrendingUp, HelpCircle, GraduationCap, Target } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

export default function Section10Reflection() {
    const { data, updateSection } = useReportForm();
    const { personal_learning, sustainability_status, sustainability_plan } = data.section10;

    const sustainabilityOptions = [
        { id: 'yes', label: 'Self-Sustaining', sub: 'Impact continues independently.' },
        { id: 'partially', label: 'Partial Continuation', sub: 'Requires some follow-up.' },
        { id: 'no', label: 'One-time Initial', sub: 'Completed as a standalone.' }
    ];

    return (
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <Compass className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Growth & Future</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Reflection & Sustainability</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Reflect on your personal growth and the long-term viability of your project's impact.</p>
            </div>

            {/* Personal Learnings */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xl shadow-sm border border-amber-200">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Personal Growth Journey</h3>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-4">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reflection Narrative</Label>
                            <Textarea
                                placeholder="What core skills did you develop? How did this change your perspective on social impact?"
                                className="min-h-[180px] rounded-[1.5rem] border-slate-200 p-6 font-medium text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-50 transition-all bg-slate-50/30"
                                value={personal_learning}
                                onChange={(e) => updateSection('section10', { personal_learning: e.target.value })}
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 space-y-4">
                                <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                                    <Lightbulb className="w-3 h-3" /> Tips for Reflection
                                </h4>
                                <ul className="space-y-3">
                                    {[
                                        "Mention soft skills (Leadership, Empathy).",
                                        "Highlight any unexpected challenges.",
                                        "Connect learnings to your future career.",
                                        "Be honest and self-critical."
                                    ].map((tip, i) => (
                                        <li key={i} className="text-[10px] font-bold text-amber-800/60 leading-relaxed flex gap-2">
                                            <div className="w-1 h-1 rounded-full bg-amber-300 mt-1.5 shrink-0" />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sustainability */}
            <div className="space-y-8 pt-8 border-t border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xl">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Project Sustainability</h3>
                        </div>
                    </div>

                    <RadioGroup
                        value={sustainability_status}
                        onValueChange={(val) => updateSection('section10', { sustainability_status: val as 'yes' | 'partially' | 'no' })}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                    >
                        {sustainabilityOptions.map((opt) => (
                            <div key={opt.id}>
                                <RadioGroupItem value={opt.id} id={`sust-${opt.id}`} className="sr-only" />
                                <Label
                                    htmlFor={`sust-${opt.id}`}
                                    className={clsx(
                                        "flex flex-col p-4 rounded-2xl border cursor-pointer transition-all min-w-[140px]",
                                        sustainability_status === opt.id
                                            ? "bg-slate-900 border-slate-900 shadow-xl"
                                            : "bg-white border-slate-100 hover:border-slate-200"
                                    )}
                                >
                                    <span className={clsx("text-[10px] font-black uppercase tracking-widest mb-1", sustainability_status === opt.id ? "text-blue-400" : "text-slate-400")}>{opt.label}</span>
                                    <span className={clsx("text-[9px] font-medium leading-tight", sustainability_status === opt.id ? "text-slate-300" : "text-slate-500")}>{opt.sub}</span>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Target className="w-24 h-24" />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                            <h4 className="text-xl font-black tracking-tight underline decoration-blue-500 decoration-4 underline-offset-8 mb-4">
                                {sustainability_status === 'no' ? 'Improvement Strategy' : 'Continuation Strategy'}
                            </h4>
                            <p className="text-slate-400 text-sm font-medium">
                                {sustainability_status === 'no'
                                    ? 'What roadblocks prevented long-term impact? How could future projects overcome these?'
                                    : 'Explain the mechanism through which the benefits of this project will persist.'}
                            </p>
                        </div>
                        <Textarea
                            placeholder="Detail the exit strategy or the mechanism for ongoing benefits..."
                            className="min-h-[140px] rounded-[1.5rem] border-white/10 bg-white/5 p-6 font-medium text-white placeholder:text-white/20 focus:bg-white/10 transition-all border-none shadow-inner"
                            value={sustainability_plan}
                            onChange={(e) => updateSection('section10', { sustainability_plan: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
