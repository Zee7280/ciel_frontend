import { ShieldCheck, Camera, CheckSquare, Info, Lock, Eye, AlertTriangle, FileUp } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { FileUpload } from "./ui/file-upload";
import { useReportForm } from "../context/ReportContext";
import { Textarea } from "./ui/textarea";
import clsx from "clsx";

export default function Section8Evidence() {
    const { data, updateSection } = useReportForm();
    const {
        evidence_types,
        description,
        media_usage,
        consent_authentic,
        consent_informed,
        consent_no_harm
    } = data.section8;

    const handleEvidenceTypeChange = (item: string, checked: boolean) => {
        const current = [...evidence_types];
        if (checked) {
            updateSection('section8', { evidence_types: [...current, item] });
        } else {
            updateSection('section8', { evidence_types: current.filter(i => i !== item) });
        }
    };

    const evidenceOptions = [
        { id: 'Photos', icon: Camera, label: 'Photos' },
        { id: 'Videos', icon: Eye, label: 'Videos' },
        { id: 'Attendance', icon: CheckSquare, label: 'Attendance' },
        { id: 'Materials', icon: FileUp, label: 'Materials' },
        { id: 'Partner Letter', icon: ShieldCheck, label: 'Partner Letter' },
        { id: 'Survey Data', icon: Info, label: 'Survey Data' },
        { id: 'Media', icon: Camera, label: 'Media' }
    ];

    return (
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Trust & Accountability</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Evidence & Verification</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Provide visual and documented proof of your project's implementation and impact.</p>
            </div>

            {/* Evidence Selection & Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Evidence Portfolio</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {evidenceOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleEvidenceTypeChange(opt.id, !evidence_types.includes(opt.id))}
                                    className={clsx(
                                        "flex flex-col items-center justify-center gap-3 p-4 rounded-[2rem] border transition-all aspect-square",
                                        evidence_types.includes(opt.id)
                                            ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    <opt.icon className={clsx("w-6 h-6", evidence_types.includes(opt.id) ? "text-blue-400" : "text-slate-300")} />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-center">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contextual Narrative</Label>
                        <Textarea
                            placeholder="Briefly explain what the uploaded evidence shows and how it validates your activities..."
                            className="min-h-[140px] rounded-[1.5rem] border-slate-200 p-6 font-medium text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-50 transition-all bg-slate-50/50"
                            value={description}
                            onChange={(e) => updateSection('section8', { description: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-blue-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <FileUp className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <div className="space-y-2">
                                <h4 className="text-2xl font-black tracking-tight">Project Evidence</h4>
                                <p className="text-blue-100/70 text-sm font-medium">MANDATORY: Submit visual or documented proof of execution.</p>
                            </div>
                            <FileUpload label="Drop verification files" />
                            <p className="text-[10px] text-blue-200/50 font-medium italic text-center">Supported formats: JPG, PNG, PDF (Max 10MB per file)</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-slate-400" />
                            <h4 className="font-bold text-slate-900">Privacy & Visibility</h4>
                        </div>
                        <RadioGroup
                            value={media_usage}
                            onValueChange={(val) => updateSection('section8', { media_usage: val as 'public' | 'limited' | 'internal' })}
                            className="grid grid-cols-3 gap-2"
                        >
                            {[
                                { id: 'public', label: 'Public Content' },
                                { id: 'limited', label: 'Limited Access' },
                                { id: 'internal', label: 'University Only' }
                            ].map((opt) => (
                                <div key={opt.id}>
                                    <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
                                    <Label
                                        htmlFor={opt.id}
                                        className={clsx(
                                            "flex items-center justify-center p-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all",
                                            media_usage === opt.id
                                                ? "bg-white border-blue-200 text-blue-600 shadow-sm"
                                                : "bg-white/50 border-slate-100 text-slate-400 hover:bg-white"
                                        )}
                                    >
                                        {opt.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                </div>
            </div>

            {/* Ethical Compliance Card */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-[3rem] p-10 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-amber-100">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="w-5 h-5" />
                            <h4 className="text-xl font-black tracking-tight">Ethical Compliance</h4>
                        </div>
                        <p className="text-sm text-amber-800/60 font-medium">Verify that all data collection and media capture followed university guidelines.</p>
                    </div>
                    <div className="px-4 py-2 bg-amber-100 rounded-full text-[10px] font-black text-amber-800 uppercase tracking-widest">Final Validation</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { id: 'auth', label: 'Authentic Evidence', sub: 'I confirm the uploaded material is original and unaltered.', state: consent_authentic, field: 'consent_authentic' },
                        { id: 'consent', label: 'Informed Consent', sub: 'I verify that participants agreed to be recorded or photographed.', state: consent_informed, field: 'consent_informed' },
                        { id: 'harm', label: 'Zero Harm Policy', sub: 'No exploitation or misrepresentation of vulnerable groups.', state: consent_no_harm, field: 'consent_no_harm' }
                    ].map((item) => (
                        <div
                            key={item.id}
                            className={clsx(
                                "p-6 rounded-[2rem] border transition-all cursor-pointer group",
                                item.state
                                    ? "bg-white border-green-200 shadow-lg shadow-green-50"
                                    : "bg-white/30 border-amber-100 hover:border-amber-200"
                            )}
                            onClick={() => updateSection('section8', { [item.field]: !item.state })}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={clsx(
                                    "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                    item.state ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-500"
                                )}>
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <Checkbox
                                    checked={item.state}
                                    className="rounded-full w-5 h-5 border-amber-200 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                />
                            </div>
                            <h5 className="font-bold text-slate-900 text-sm mb-1">{item.label}</h5>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.sub}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
