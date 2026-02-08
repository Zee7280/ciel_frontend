import { GraduationCap, TrendingUp } from "lucide-react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

export default function Section10Reflection() {
    const { data, updateSection } = useReportForm();
    const { personal_learning, sustainability_status, sustainability_plan } = data.section10;

    const sustainabilityOptions = [
        { id: 'yes', label: 'Self-Sustaining' },
        { id: 'partially', label: 'Partial Continuation' },
        { id: 'no', label: 'One-time Initial' }
    ];

    return (
        <div className="space-y-8">
            {/* Personal Learnings */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Personal Growth Journey</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Reflection Narrative</Label>
                        <Textarea
                            placeholder="What core skills did you develop? How did this change your perspective on social impact?"
                            className="min-h-[160px] rounded-xl border-slate-200 p-4 text-slate-700"
                            value={personal_learning}
                            onChange={(e) => updateSection('section10', { personal_learning: e.target.value })}
                        />
                        <p className="text-xs text-slate-500">Mention soft skills, challenges, and how this connects to your future career.</p>
                    </div>
                </div>
            </div>

            {/* Sustainability */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Project Sustainability</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Sustainability Status</Label>
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
                                            "flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all text-sm font-medium",
                                            sustainability_status === opt.id
                                                ? "bg-blue-600 border-blue-600 text-white"
                                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                        )}
                                    >
                                        {opt.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">
                            {sustainability_status === 'no' ? 'Improvement Strategy' : 'Continuation Strategy'}
                        </Label>
                        <Textarea
                            placeholder={sustainability_status === 'no'
                                ? 'What roadblocks prevented long-term impact? How could future projects overcome these?'
                                : 'Explain the mechanism through which the benefits of this project will persist.'}
                            className="min-h-[140px] rounded-xl border-slate-200 p-4 text-slate-700"
                            value={sustainability_plan}
                            onChange={(e) => updateSection('section10', { sustainability_plan: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
