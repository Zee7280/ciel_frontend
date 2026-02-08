import { ShieldCheck, Camera, CheckSquare, Info, FileUp, Upload, Lock, AlertTriangle, Trash2 } from "lucide-react";
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
        evidence_files,
        description,
        media_usage,
        consent_authentic,
        consent_informed,
        consent_no_harm
    } = data.section8;

    const removeFile = (index: number) => {
        const newFiles = [...(evidence_files || [])];
        newFiles.splice(index, 1);
        updateSection('section8', { evidence_files: newFiles });
    };

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
        { id: 'Videos', icon: Camera, label: 'Videos' },
        { id: 'Attendance', icon: CheckSquare, label: 'Attendance' },
        { id: 'Materials', icon: FileUp, label: 'Materials' },
        { id: 'Partner Letter', icon: ShieldCheck, label: 'Partner Letter' },
        { id: 'Survey Data', icon: Info, label: 'Survey Data' },
        { id: 'Media', icon: Camera, label: 'Media' }
    ];

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Evidence & Verification</h2>
                <p className="text-slate-600 text-sm">Provide visual and documented proof of your project's implementation and impact.</p>
            </div>

            {/* Evidence Selection */}
            <div className="space-y-4">
                <Label className="text-sm font-semibold text-slate-700">Evidence Portfolio</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {evidenceOptions.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => handleEvidenceTypeChange(opt.id, !evidence_types.includes(opt.id))}
                            className={clsx(
                                "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                evidence_types.includes(opt.id)
                                    ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                            )}
                        >
                            <opt.icon className="w-5 h-5" />
                            <span className="text-xs font-semibold text-center">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* File Upload */}
            <div className="bg-blue-600 rounded-2xl p-8 text-white">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold">Project Evidence</h4>
                            <p className="text-blue-100 text-sm">MANDATORY: Submit visual or documented proof of execution</p>
                        </div>
                    </div>
                    <FileUpload
                        label="Drop verification files"
                        multiple
                        onChange={(e) => {
                            if (e.target.files) {
                                const newFiles = Array.from(e.target.files);
                                updateSection('section8', {
                                    evidence_files: [...(evidence_files || []), ...newFiles]
                                });
                            }
                        }}
                    />

                    {evidence_files && evidence_files.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {evidence_files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-white/10 rounded-lg group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-1.5 bg-white/10 rounded">
                                            <FileUp className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-medium truncate">{file.name}</p>
                                            <p className="text-[10px] text-blue-200/60 lowercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFile(idx)}
                                        className="p-1.5 hover:bg-red-500 rounded text-blue-100 hover:text-white transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-blue-200 text-center">Supported formats: JPG, PNG, PDF (Max 10MB per file)</p>
                </div>
            </div>

            {/* Contextual Narrative */}
            <div className="space-y-4">
                <Label className="text-sm font-semibold text-slate-700">Contextual Narrative</Label>
                <Textarea
                    placeholder="Briefly explain what the uploaded evidence shows and how it validates your activities..."
                    className="min-h-[120px] rounded-lg border-slate-200 text-slate-700"
                    value={description || ''}
                    onChange={(e) => updateSection('section8', { description: e.target.value })}
                />
            </div>

            {/* Privacy & Visibility */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-slate-600" />
                    <h4 className="font-bold text-slate-900">Privacy & Visibility</h4>
                </div>
                <RadioGroup
                    value={media_usage}
                    onValueChange={(val) => updateSection('section8', { media_usage: val as 'public' | 'limited' | 'internal' })}
                    className="grid grid-cols-3 gap-3"
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
                                    "flex items-center justify-center p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all",
                                    media_usage === opt.id
                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {opt.label}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            {/* Ethical Compliance */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-5 h-5" />
                    <h4 className="text-lg font-bold">Ethical Compliance</h4>
                </div>
                <p className="text-sm text-amber-800">Verify that all data collection and media capture followed university guidelines.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { id: 'auth', label: 'Authentic Evidence', sub: 'I confirm the uploaded material is original and unaltered.', state: consent_authentic, field: 'consent_authentic' },
                        { id: 'consent', label: 'Informed Consent', sub: 'I verify that participants agreed to be recorded or photographed.', state: consent_informed, field: 'consent_informed' },
                        { id: 'harm', label: 'Zero Harm Policy', sub: 'No exploitation or misrepresentation of vulnerable groups.', state: consent_no_harm, field: 'consent_no_harm' }
                    ].map((item) => (
                        <div
                            key={item.id}
                            className={clsx(
                                "p-4 rounded-xl border transition-all cursor-pointer",
                                item.state
                                    ? "bg-white border-green-300 shadow-sm"
                                    : "bg-white border-amber-200 hover:border-amber-300"
                            )}
                            onClick={() => updateSection('section8', { [item.field]: !item.state })}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={clsx(
                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                    item.state ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                                )}>
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <Checkbox
                                    checked={item.state}
                                    onChange={(e) => updateSection('section8', { [item.field]: e.target.checked })}
                                    className="rounded-md w-5 h-5"
                                />
                            </div>
                            <h5 className="font-bold text-slate-900 text-sm mb-1">{item.label}</h5>
                            <p className="text-xs text-slate-600 leading-relaxed">{item.sub}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
