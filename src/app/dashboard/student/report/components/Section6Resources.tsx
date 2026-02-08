import { PackageOpen, Boxes, Plus, Trash2, Info, FileSearch, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { FileUpload } from "./ui/file-upload";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

export default function Section6Resources() {
    const { data, updateSection } = useReportForm();
    const { used_resources, resources } = data.section6;

    const addResource = () => {
        updateSection('section6', {
            resources: [...resources, { type: '', amount: '', source: '', purpose: '' }]
        });
    };

    const removeResource = (index: number) => {
        const newResources = [...resources];
        newResources.splice(index, 1);
        updateSection('section6', { resources: newResources });
    };

    const updateResource = (index: number, field: string, value: string) => {
        const newResources = [...resources];
        newResources[index] = { ...newResources[index], [field]: value };
        updateSection('section6', { resources: newResources });
    };

    return (
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <PackageOpen className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Input Inventory</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Project Resources</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Document the tangible and intangible assets used during the implementation phase.</p>
            </div>

            {/* Participation Toggle */}
            <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xl">
                            <Boxes className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Resource Declaration</h3>
                    </div>
                    <RadioGroup
                        value={used_resources}
                        onValueChange={(val) => updateSection('section6', { used_resources: val as 'yes' | 'no' })}
                        className="flex items-center gap-6"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no-resources" className="border-slate-300" />
                            <Label htmlFor="no-resources" className="text-xs font-bold text-slate-500 cursor-pointer">Time Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes-resources" className="border-slate-300" />
                            <Label htmlFor="yes-resources" className="text-xs font-bold text-slate-500 cursor-pointer">Physical/Financial</Label>
                        </div>
                    </RadioGroup>
                </div>

                {used_resources === "yes" && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            {["Resource Type", "Quantity / Volume", "Primary Source", "Purpose / Usage", ""].map((h, i) => (
                                                <th key={i} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {resources.map((res, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-6 border-r border-slate-50">
                                                    <Select
                                                        value={res.type}
                                                        onChange={(e) => updateResource(idx, 'type', e.target.value)}
                                                        className="h-10 border-slate-200 rounded-xl font-bold text-sm bg-white"
                                                    >
                                                        <option value="">Select Category</option>
                                                        <option value="Financial">Financial</option>
                                                        <option value="In-kind">In-kind</option>
                                                        <option value="Human Resources">Human Resources</option>
                                                        <option value="Infrastructure">Infrastructure</option>
                                                    </Select>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <Input
                                                        placeholder="e.g. 50 kits"
                                                        className="h-10 border-slate-200 rounded-xl font-medium text-sm"
                                                        value={res.amount}
                                                        onChange={(e) => updateResource(idx, 'amount', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-6 py-6">
                                                    <Select
                                                        value={res.source}
                                                        onChange={(e) => updateResource(idx, 'source', e.target.value)}
                                                        className="h-10 border-slate-200 rounded-xl font-medium text-sm"
                                                    >
                                                        <option value="">Choose Source</option>
                                                        <option value="Partner NGO">Partner NGO</option>
                                                        <option value="University">University</option>
                                                        <option value="Personal">Personal</option>
                                                        <option value="Other">Other</option>
                                                    </Select>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <Input
                                                        placeholder="Explain usage..."
                                                        className="h-10 border-slate-200 rounded-xl font-medium text-sm min-w-[150px]"
                                                        value={res.purpose}
                                                        onChange={(e) => updateResource(idx, 'purpose', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-6 py-6">
                                                    <button onClick={() => removeResource(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-6 bg-slate-50/80 border-t border-slate-100">
                                <Button
                                    onClick={addResource}
                                    variant="outline"
                                    className="w-full bg-white border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:text-blue-600 transition-all font-bold"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Resource Row
                                </Button>
                            </div>
                        </div>

                        {/* Resource Evidence Card */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                                        <FileSearch className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900 tracking-tight">Material Verification</h4>
                                    <p className="text-sm text-slate-500 font-medium max-w-sm">Please upload photos of the items, handover notes, or donation receipts to verify these resources.</p>
                                </div>
                                <div className="pt-8">
                                    <FileUpload label="Upload resource evidence" />
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="w-5 h-5 text-green-400" />
                                        <h5 className="text-sm font-black uppercase tracking-widest text-slate-400">Compliance Check</h5>
                                    </div>
                                    <p className="text-xs font-medium text-slate-300 leading-relaxed">University policy requires full transparency for any in-kind or financial resources over Rs. 5,000. Ensure your source documentation matches your declaration.</p>
                                </div>
                                <div className="flex items-center gap-4 pt-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Financial Integrity is key to impact reporting.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
