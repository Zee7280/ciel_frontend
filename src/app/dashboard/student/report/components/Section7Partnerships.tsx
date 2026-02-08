import { Handshake, Users2, Plus, Trash2, ShieldCheck, Mail, Building2, School, Landmark } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { FileUpload } from "./ui/file-upload";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

export default function Section7Partnerships() {
    const { data, updateSection } = useReportForm();
    const { has_partners, partners, formalization } = data.section7;

    const addPartner = () => {
        updateSection('section7', {
            partners: [...partners, { name: '', type: '', role: '', contribution: '' }]
        });
    };

    const removePartner = (index: number) => {
        const newPartners = [...partners];
        newPartners.splice(index, 1);
        updateSection('section7', { partners: newPartners });
    };

    const updatePartner = (index: number, field: string, value: string) => {
        const newPartners = [...partners];
        newPartners[index] = { ...newPartners[index], [field]: value };
        updateSection('section7', { partners: newPartners });
    };

    const handleFormalizationChange = (item: string, checked: boolean) => {
        const current = [...formalization];
        if (checked) {
            updateSection('section7', { formalization: [...current, item] });
        } else {
            updateSection('section7', { formalization: current.filter(i => i !== item) });
        }
    };

    const formalizationOptions = [
        { id: 'MOU', label: 'MOU Signed' },
        { id: 'Official Letter', label: 'Official Letter' },
        { id: 'Email Confirmation', label: 'Email Proof' },
        { id: 'No formal document', label: 'Verbal / Informal' }
    ];

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Partnerships & Collaboration</h2>
                <p className="text-slate-600 text-sm">Identify the external organizations and stakeholders that amplified your project's reach.</p>
            </div>

            {/* Participation Toggle */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                        <h3 className="text-lg font-bold text-slate-900">Stakeholder Inclusion</h3>
                    </div>
                    <RadioGroup
                        value={has_partners}
                        onValueChange={(val) => {
                            const isNo = val === 'no';
                            updateSection('section7', {
                                has_partners: val as 'yes' | 'no',
                                partners: isNo ? [] : partners,
                                formalization: isNo ? [] : formalization
                            });
                        }}
                        className="flex items-center gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no-partners" />
                            <Label htmlFor="no-partners" className="text-sm font-medium cursor-pointer">Independent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes-partners" />
                            <Label htmlFor="yes-partners" className="text-sm font-medium cursor-pointer">Collaborative</Label>
                        </div>
                    </RadioGroup>
                </div>

                {has_partners === "yes" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">Partners Directory</Label>
                            <Button
                                onClick={addPartner}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Partner
                            </Button>
                        </div>

                        {partners.length === 0 ? (
                            <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
                                <Handshake className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                <p className="text-slate-600 font-medium">No partners registered yet</p>
                                <p className="text-sm text-slate-500 mt-1">Click "Add Partner" to document collaborations</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {partners.map((p, idx) => (
                                    <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">Partner {idx + 1}</span>
                                            </div>
                                            <button onClick={() => removePartner(idx)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-slate-600">Org Name</Label>
                                                <Input
                                                    placeholder="NGO name"
                                                    className="h-10 text-sm border-slate-200 rounded-lg"
                                                    value={p.name || ''}
                                                    onChange={(e) => updatePartner(idx, 'name', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-slate-600">Type</Label>
                                                <Select
                                                    value={p.type || ''}
                                                    onChange={(e) => updatePartner(idx, 'type', e.target.value)}
                                                    className="h-10 text-sm border-slate-200 rounded-lg"
                                                >
                                                    <option value="">Category</option>
                                                    <option value="NGO">NGO / NPO</option>
                                                    <option value="School">Educational Inst.</option>
                                                    <option value="Govt Body">Government</option>
                                                    <option value="Private Company">Private Sector</option>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-slate-600">Core Role</Label>
                                                <Input
                                                    placeholder="Role..."
                                                    className="h-10 text-sm border-slate-200 rounded-lg"
                                                    value={p.role || ''}
                                                    onChange={(e) => updatePartner(idx, 'role', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-slate-600">Contribution</Label>
                                                <Input
                                                    placeholder="Details..."
                                                    className="h-10 text-sm border-slate-200 rounded-lg"
                                                    value={p.contribution || ''}
                                                    onChange={(e) => updatePartner(idx, 'contribution', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-4">
                            <Label className="text-sm font-semibold text-slate-700">Formalization Status</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {formalizationOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleFormalizationChange(opt.id, !formalization.includes(opt.id))}
                                        className={clsx(
                                            "flex items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-all text-left",
                                            formalization.includes(opt.id)
                                                ? "bg-slate-900 border-slate-900 text-white"
                                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                                            formalization.includes(opt.id) ? "bg-blue-600 border-blue-600" : "border-slate-300"
                                        )}>
                                            {formalization.includes(opt.id) && <Plus className="w-3 h-3 text-white rotate-45" />}
                                        </div>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold">Document Verification</h4>
                                    <p className="text-slate-600 text-sm">Upload signed MOUs or official letters.</p>
                                </div>
                            </div>
                            <FileUpload label="Attach legal documents" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
