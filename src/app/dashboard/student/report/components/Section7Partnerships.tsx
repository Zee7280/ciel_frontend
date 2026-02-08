import { Handshake, Users2, Plus, Trash2, ShieldCheck, Mail, Building2, School, Landmark } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { FileUpload } from "./ui/file-upload";
import { Checkbox } from "./ui/checkbox";
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
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <Handshake className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Collaborative Network</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Partnerships & Collaboration</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Identify the external organizations and stakeholders that amplified your project's reach.</p>
            </div>

            {/* Participation Toggle */}
            <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-xl italic font-serif">P</div>
                        <h3 className="text-xl font-bold text-slate-900">Stakeholder Inclusion</h3>
                    </div>
                    <RadioGroup
                        value={has_partners}
                        onValueChange={(val) => updateSection('section7', { has_partners: val as 'yes' | 'no' })}
                        className="flex items-center gap-6"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no-partners" className="border-slate-300" />
                            <Label htmlFor="no-partners" className="text-xs font-bold text-slate-500 cursor-pointer">Independent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes-partners" className="border-slate-300" />
                            <Label htmlFor="yes-partners" className="text-xs font-bold text-slate-500 cursor-pointer">Collaborative</Label>
                        </div>
                    </RadioGroup>
                </div>

                {has_partners === "yes" && (
                    <div className="space-y-10 animate-fade-in-up">
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            {["Organization Name", "Entity Type", "Core Role", "Contribution Details", ""].map((h, i) => (
                                                <th key={i} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {partners.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-6 border-r border-slate-50">
                                                    <Input
                                                        placeholder="e.g. Hope Foundation"
                                                        className="h-10 border-slate-200 rounded-xl font-bold text-sm bg-white"
                                                        value={p.name}
                                                        onChange={(e) => updatePartner(idx, 'name', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-6 py-6 font-medium">
                                                    <Select
                                                        value={p.type}
                                                        onChange={(e) => updatePartner(idx, 'type', e.target.value)}
                                                        className="h-10 border-slate-200 rounded-xl text-sm"
                                                    >
                                                        <option value="">Select Category</option>
                                                        <option value="NGO">NGO / NPO</option>
                                                        <option value="School">Educational Inst.</option>
                                                        <option value="Govt Body">Government</option>
                                                        <option value="Private Company">Private Sector</option>
                                                    </Select>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <Input
                                                        placeholder="e.g. Hosting Partner"
                                                        className="h-10 border-slate-200 rounded-xl text-sm"
                                                        value={p.role}
                                                        onChange={(e) => updatePartner(idx, 'role', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-6 py-6">
                                                    <Input
                                                        placeholder="Venue for sessions..."
                                                        className="h-10 border-slate-200 rounded-xl text-sm min-w-[150px]"
                                                        value={p.contribution}
                                                        onChange={(e) => updatePartner(idx, 'contribution', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-6 py-6">
                                                    <button onClick={() => removePartner(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-6 bg-slate-50/80 border-t border-slate-100 text-center">
                                <Button
                                    onClick={addPartner}
                                    variant="outline"
                                    className="px-8 border-dashed border-slate-300 rounded-2xl hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                    <Plus className="w-3 h-3 mr-2" /> Register New Partner
                                </Button>
                            </div>
                        </div>

                        {/* Formalization Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900">Formalization Status</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {formalizationOptions.map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleFormalizationChange(opt.id, !formalization.includes(opt.id))}
                                            className={clsx(
                                                "flex items-center justify-between p-4 rounded-3xl border transition-all text-left group",
                                                formalization.includes(opt.id)
                                                    ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                                                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                                            )}
                                        >
                                            <span className="text-xs font-black uppercase tracking-wider">{opt.label}</span>
                                            <div className={clsx(
                                                "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                                formalization.includes(opt.id)
                                                    ? "bg-blue-500 border-blue-500"
                                                    : "border-slate-200 group-hover:border-slate-300"
                                            )}>
                                                {formalization.includes(opt.id) && <Plus className="w-3 h-3 text-white rotate-45" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
                                    <div className="space-y-2">
                                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Upload</h5>
                                        <p className="text-[10px] text-slate-500 font-medium">Upload signed MOUs or official correspondence.</p>
                                    </div>
                                    <FileUpload label="Attach legal documents" />
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-start gap-3 shadow-sm">
                                        <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">Email confirmations are also accepted as valid proof of collaboration.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
