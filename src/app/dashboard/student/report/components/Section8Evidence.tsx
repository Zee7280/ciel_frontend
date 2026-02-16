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
    const { section8 } = data;

    const handleUpdate = (field: string, value: any) => {
        updateSection('section8', { [field]: value });
    };

    const handleEthicalUpdate = (field: string, value: boolean) => {
        handleUpdate('ethical_compliance', { ...section8.ethical_compliance, [field]: value });
    };

    const toggleEvidenceType = (type: string) => {
        const current = section8.evidence_types || [];
        if (current.includes(type)) {
            handleUpdate('evidence_types', current.filter(t => t !== type));
        } else {
            handleUpdate('evidence_types', [...current, type]);
        }
    };

    const evidenceOptions = [
        "Photos", "Videos", "Attendance Sheets", "Feedback Forms",
        "Material Samples", "Social Media Links", "Reports/Publications"
    ];

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 8</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Evidence & Verification</h2>
                <p className="text-slate-600 text-sm">Provide proofs to validate your reported activities.</p>
            </div>

            {/* Evidence Types & Upload */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">8.1</div>
                    <h3 className="text-lg font-bold text-slate-900">Evidence Upload</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">What evidence are you submitting?</Label>
                        <div className="flex flex-wrap gap-2">
                            {evidenceOptions.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => toggleEvidenceType(opt)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                        (section8.evidence_types || []).includes(opt)
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Files</Label>
                        <FileUpload
                            label="Drag and drop evidence files"
                            multiple
                            onChange={(e) => {
                                if (e.target.files) {
                                    handleUpdate('evidence_files', [...(section8.evidence_files || []), ...Array.from(e.target.files)]);
                                }
                            }}
                        />
                        <div className="text-xs text-slate-500">
                            {section8.evidence_files?.length || 0} files selected
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Description</Label>
                        <Textarea
                            placeholder="Briefly describe what these files demonstrate..."
                            value={section8.description}
                            onChange={(e) => handleUpdate('description', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Ethical Compliance */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">8.2</div>
                    <h3 className="text-lg font-bold text-slate-900">Ethical Declarations</h3>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
                        <ShieldCheck className="w-5 h-5" />
                        <span>Mandatory Checks</span>
                    </div>

                    {[
                        { key: 'authentic', label: 'I certify that all evidence provided is authentic and un-altered.' },
                        { key: 'informed_consent', label: 'I confirm that informed consent was obtained from all participants filmed or photographed.' },
                        { key: 'no_harm', label: 'I confirm that these activities caused no harm to the community or environment.' },
                        { key: 'privacy_respected', label: 'I confirm that the privacy and dignity of beneficiaries has been respected.' }
                    ].map(item => (
                        <div key={item.key} className="flex items-start gap-3">
                            <Checkbox
                                id={item.key}
                                checked={section8.ethical_compliance?.[item.key as keyof typeof section8.ethical_compliance]}
                                onChange={(e) => handleEthicalUpdate(item.key, e.target.checked)}
                                className="mt-1"
                            />
                            <Label htmlFor={item.key} className="text-sm text-slate-700 font-normal leading-relaxed cursor-pointer">
                                {item.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Partner Verification */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">8.3</div>
                    <h3 className="text-lg font-bold text-slate-900">Partner Verification</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-semibold text-slate-700">Do you have a verification letter from a partner?</Label>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <RadioGroupItem
                                    value="yes"
                                    id="pv-yes"
                                    checked={section8.partner_verification}
                                    onClick={() => handleUpdate('partner_verification', true)}
                                    className="border-slate-300 text-blue-600"
                                />
                                <Label htmlFor="pv-yes">Yes</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem
                                    value="no"
                                    id="pv-no"
                                    checked={!section8.partner_verification}
                                    onClick={() => handleUpdate('partner_verification', false)}
                                    className="border-slate-300 text-blue-600"
                                />
                                <Label htmlFor="pv-no">No</Label>
                            </div>
                        </div>
                    </div>

                    {section8.partner_verification && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-xs font-semibold text-slate-600">Upload Letter / Evaluation Form</Label>
                            <FileUpload
                                label="Upload Partner Verification"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        handleUpdate('partner_verification_files', [...(section8.partner_verification_files || []), ...Array.from(e.target.files)]);
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
