import { PackageOpen, Boxes, Plus, Trash2, Info, FileSearch, ShieldCheck, Wallet } from "lucide-react";
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
        <div className="space-y-8">
            {/* Section Header */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Project Resources</h2>
                <p className="text-slate-600 text-sm">Document the tangible and intangible assets used during the implementation phase.</p>
            </div>

            {/* Participation Toggle */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                        <h3 className="text-lg font-bold text-slate-900">Resource Declaration</h3>
                    </div>
                    <RadioGroup
                        value={used_resources}
                        onValueChange={(val) => {
                            const isNo = val === 'no';
                            updateSection('section6', {
                                used_resources: val as 'yes' | 'no',
                                resources: isNo ? [] : resources
                            });
                        }}
                        className="flex items-center gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no-resources" />
                            <Label htmlFor="no-resources" className="text-sm font-medium cursor-pointer">Time Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes-resources" />
                            <Label htmlFor="yes-resources" className="text-sm font-medium cursor-pointer">Physical/Financial</Label>
                        </div>
                    </RadioGroup>
                </div>

                {used_resources === "yes" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">Resources Inventory</Label>
                            <Button
                                onClick={addResource}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Resource Row
                            </Button>
                        </div>

                        {resources.length === 0 ? (
                            <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
                                <Boxes className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                <p className="text-slate-600 font-medium">No resources added yet</p>
                                <p className="text-sm text-slate-500 mt-1">Click "Add Resource Row" to document assets</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {resources.map((res, idx) => (
                                    <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">Resource {idx + 1}</span>
                                            </div>
                                            <button onClick={() => removeResource(idx)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-slate-600">Type</Label>
                                                <Select
                                                    value={res.type || ''}
                                                    onChange={(e) => updateResource(idx, 'type', e.target.value)}
                                                    className="h-10 text-sm border-slate-200 rounded-lg"
                                                >
                                                    <option value="">Select Category</option>
                                                    <option value="Financial">Financial</option>
                                                    <option value="In-kind">In-kind</option>
                                                    <option value="Human Resources">Human Resources</option>
                                                    <option value="Infrastructure">Infrastructure</option>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-slate-600">Amount / Vol</Label>
                                                <Input
                                                    placeholder="e.g. 50 kits"
                                                    className="h-10 text-sm border-slate-200 rounded-lg"
                                                    value={res.amount || ''}
                                                    onChange={(e) => updateResource(idx, 'amount', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-slate-600">Source</Label>
                                                <Select
                                                    value={res.source || ''}
                                                    onChange={(e) => updateResource(idx, 'source', e.target.value)}
                                                    className="h-10 text-sm border-slate-200 rounded-lg"
                                                >
                                                    <option value="">Choose Source</option>
                                                    <option value="Partner NGO">Partner NGO</option>
                                                    <option value="University">University</option>
                                                    <option value="Personal">Personal</option>
                                                    <option value="Other">Other</option>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-slate-600">Purpose</Label>
                                                <Input
                                                    placeholder="Explain usage..."
                                                    className="h-10 text-sm border-slate-200 rounded-lg"
                                                    value={res.purpose || ''}
                                                    onChange={(e) => updateResource(idx, 'purpose', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Resource Evidence Card */}
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                                    <FileSearch className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold">Material Verification</h4>
                                    <p className="text-slate-600 text-sm">Upload photos or receipts to verify resources.</p>
                                </div>
                            </div>
                            <FileUpload label="Upload resource evidence" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
