import { Handshake, Users2, Plus, Trash2, ShieldCheck, Mail, Building2, School, Landmark } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { FileUpload } from "./ui/file-upload";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function Section7Partnerships() {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const { has_partners, partners, formalization_status, formalization_files } = data.section7;

    const sectionErrors = validationErrors['section7'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleUpdate = (field: string, value: any) => {
        updateSection('section7', { [field]: value });
    };

    const addPartner = () => {
        handleUpdate('partners', [...partners, { name: '', type: '', role: '', contribution: [], verification: '' }]);
    };

    const updatePartner = (index: number, field: string, value: any) => {
        const newPartners = [...partners];
        newPartners[index] = { ...newPartners[index], [field]: value };
        handleUpdate('partners', newPartners);
    };

    const removePartner = (index: number) => {
        const newPartners = [...partners];
        newPartners.splice(index, 1);
        handleUpdate('partners', newPartners);
    };

    const handleFormalizationChange = (item: string) => {
        const current = formalization_status || [];
        if (current.includes(item)) {
            handleUpdate('formalization_status', current.filter(i => i !== item));
        } else {
            handleUpdate('formalization_status', [...current, item]);
        }
    };

    const contributionOptions = [
        "Financial Support", "Technical Expertise", "Venue / Space", "Materials / Equipment",
        "Human Resources", "Mentorship", "Community Access"
    ];

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 7</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Partnerships & Networks</h2>
                <p className="text-slate-600 text-sm">Did you work alone or with external partners?</p>

                {/* Error Summary */}
                {hasErrors && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mt-4">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-red-900 text-sm">Please fix the following errors:</h4>
                            <ul className="mt-2 space-y-1">
                                {sectionErrors.slice(0, 5).map((error, idx) => (
                                    <li key={idx} className="text-xs text-red-700">• {error.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-900">Did you have external partners?</span>
                <RadioGroup
                    value={has_partners}
                    onValueChange={(val) => handleUpdate('has_partners', val)}
                    className="flex gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="no-partner" />
                        <Label htmlFor="no-partner">No (Independent)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="yes-partner" />
                        <Label htmlFor="yes-partner">Yes (Collaborative)</Label>
                    </div>
                </RadioGroup>
            </div>

            {has_partners === 'yes' && (
                <div className="space-y-8">
                    {/* Partners List */}
                    <div className="space-y-4">
                        {partners.map((p, idx) => (
                            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 relative space-y-4">
                                <button
                                    onClick={() => removePartner(idx)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <h4 className="font-bold text-sm text-slate-500">Partner Organization #{idx + 1}</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Organization Name</Label>
                                        <Input
                                            placeholder="e.g. WWF Pakistan"
                                            value={p.name}
                                            onChange={(e) => updatePartner(idx, 'name', e.target.value)}
                                            className={clsx(getFieldError(`partners.${idx}.name`) && "border-red-400 bg-red-50")}
                                        />
                                        <FieldError message={getFieldError(`partners.${idx}.name`)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Type</Label>
                                        <Select
                                            value={p.type}
                                            onChange={(e) => updatePartner(idx, 'type', e.target.value)}
                                            className={clsx(getFieldError(`partners.${idx}.type`) && "border-red-400 bg-red-50")}
                                        >
                                            <option value="">Select Type</option>
                                            <option value="NGO">Non-Profit (NGO)</option>
                                            <option value="Government">Government Agency</option>
                                            <option value="Corporate">Corporate / Private</option>
                                            <option value="Educational">School / University</option>
                                            <option value="Community">Community Group</option>
                                        </Select>
                                        <FieldError message={getFieldError(`partners.${idx}.type`)} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Nature of Contribution (Select all that apply)</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {contributionOptions.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => {
                                                    const current = p.contribution || [];
                                                    if (current.includes(opt)) {
                                                        updatePartner(idx, 'contribution', current.filter(c => c !== opt));
                                                    } else {
                                                        updatePartner(idx, 'contribution', [...current, opt]);
                                                    }
                                                }}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                                    (p.contribution || []).includes(opt)
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
                                    <Label className="text-xs">Verification Details</Label>
                                    <Input
                                        placeholder="Name of contact person / Designation"
                                        value={p.verification}
                                        onChange={(e) => updatePartner(idx, 'verification', e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                        <Button onClick={addPartner} variant="outline" className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> Add External Partner
                        </Button>
                    </div>

                    {/* Formalization */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Label className="text-sm font-semibold text-slate-700">Formalization Status</Label>
                            <div className="space-y-2">
                                {["MOU Signed", "Letter of Intent", "Email Confirmation", "Verbal Agreement"].map(opt => (
                                    <div key={opt} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={opt}
                                            checked={(formalization_status || []).includes(opt)}
                                            onChange={() => handleFormalizationChange(opt)}
                                            className="rounded border-slate-300 text-blue-600"
                                        />
                                        <label htmlFor={opt} className="text-sm text-slate-700">{opt}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-sm font-semibold text-slate-700">Upload Agreements</Label>
                            <FileUpload
                                label="Upload MOU/Letters"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        handleUpdate('formalization_files', [...(formalization_files || []), ...Array.from(e.target.files)]);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
