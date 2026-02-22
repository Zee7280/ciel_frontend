import { Package, Plus, Trash2, FileText } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { FileUpload } from "./ui/file-upload";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function Section6Resources() {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const { use_resources, resources, evidence_files } = data.section6;

    const sectionErrors = validationErrors['section6'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleUpdate = (field: string, value: any) => {
        updateSection('section6', { [field]: value });
    };

    const addResource = () => {
        handleUpdate('resources', [...resources, { type: '', amount: '', unit: '', source: '', purpose: '', verification: '' }]);
    };

    const updateResourceRow = (index: number, field: string, value: string) => {
        const newRes = [...resources];
        newRes[index] = { ...newRes[index], [field]: value };
        handleUpdate('resources', newRes);
    };

    const removeResource = (index: number) => {
        const newRes = [...resources];
        newRes.splice(index, 1);
        handleUpdate('resources', newRes);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 6</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Resource Inventory</h2>
                <p className="text-slate-600 text-sm">Did you utilize any physical, financial, or human resources?</p>

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

            {/* Toggle */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-900">Did you use tangible resources?</span>
                <RadioGroup
                    value={use_resources}
                    onValueChange={(val) => handleUpdate('use_resources', val)}
                    className="flex gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="no-res" />
                        <Label htmlFor="no-res">No, Time Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="yes-res" />
                        <Label htmlFor="yes-res">Yes</Label>
                    </div>
                </RadioGroup>
            </div>

            {use_resources === 'yes' && (
                <div className="space-y-6">
                    {/* Resource Table */}
                    <div className="space-y-4">
                        {resources.map((res, idx) => (
                            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 relative">
                                <button
                                    onClick={() => removeResource(idx)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <h4 className="font-bold text-sm text-slate-500 mb-3">Resource #{idx + 1}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Type</Label>
                                        <Select
                                            value={res.type}
                                            onChange={(e) => updateResourceRow(idx, 'type', e.target.value)}
                                            className={clsx(getFieldError(`resources.${idx}.type`) && "border-red-400 bg-red-50")}
                                        >
                                            <option value="">Select Type</option>
                                            <option value="Financial">Financial (Cash)</option>
                                            <option value="In-Kind">In-Kind (Goods)</option>
                                            <option value="Infrastructure">Infrastructure</option>
                                            <option value="Human Capital">Human Capital</option>
                                        </Select>
                                        <FieldError message={getFieldError(`resources.${idx}.type`)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Amount</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="0"
                                                value={res.amount}
                                                onChange={(e) => updateResourceRow(idx, 'amount', e.target.value)}
                                                className={clsx(getFieldError(`resources.${idx}.amount`) && "border-red-400 bg-red-50")}
                                            />
                                            <Input
                                                placeholder="Unit"
                                                className="w-20"
                                                value={res.unit}
                                                onChange={(e) => updateResourceRow(idx, 'unit', e.target.value)}
                                            />
                                        </div>
                                        <FieldError message={getFieldError(`resources.${idx}.amount`)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Source</Label>
                                        <Input
                                            placeholder="e.g. Personal, NGO"
                                            value={res.source}
                                            onChange={(e) => updateResourceRow(idx, 'source', e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-3 space-y-1">
                                        <Label className="text-xs">Purpose & Visualization</Label>
                                        <Input
                                            placeholder="How was this used?"
                                            value={res.purpose}
                                            onChange={(e) => updateResourceRow(idx, 'purpose', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button onClick={addResource} variant="outline" className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> Add Resource
                        </Button>
                    </div>

                    {/* Evidence Upload */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                        <Label className="font-semibold">Resource Verification (Receipts/Photos)</Label>
                        <FileUpload
                            label="Upload proofs"
                            onChange={(e) => {
                                if (e.target.files) {
                                    handleUpdate('evidence_files', [...(evidence_files || []), ...Array.from(e.target.files)]);
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
