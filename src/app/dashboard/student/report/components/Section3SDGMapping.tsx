import { Target, Info, Plus, Trash2 } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select } from "./ui/select";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

interface Section3Props {
    projectData?: any;
}

export default function Section3SDGMapping({ projectData }: Section3Props) {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const { primary_sdg_explanation, secondary_sdgs } = data.section3;
    const [hasSecondarySDG, setHasSecondarySDG] = useState(secondary_sdgs.length > 0 ? "yes" : "no");

    const sectionErrors = validationErrors['section3'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleAddSecondary = () => {
        if (secondary_sdgs.length < 2) {
            updateSection('section3', {
                secondary_sdgs: [...secondary_sdgs, { sdg_id: '', justification: '', evidence_files: [] }]
            });
        }
    };

    const handleRemoveSecondary = (index: number) => {
        const newSdgs = [...secondary_sdgs];
        newSdgs.splice(index, 1);
        updateSection('section3', { secondary_sdgs: newSdgs });
    };

    const updateSecondary = (index: number, field: string, value: any) => {
        const newSdgs = [...secondary_sdgs];
        newSdgs[index] = { ...newSdgs[index], [field]: value };
        updateSection('section3', { secondary_sdgs: newSdgs });
    };

    const handleToggleSecondary = (val: string) => {
        setHasSecondarySDG(val);
        if (val === 'yes') {
            if (secondary_sdgs.length === 0) {
                handleAddSecondary();
            }
        } else {
            // Clear secondary SDGs if user selects "Primary Only"
            updateSection('section3', { secondary_sdgs: [] });
        }
    }

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 3</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">SDG Contribution Mapping</h2>
                <p className="text-slate-600 text-sm">How your project contributed to the Sustainable Development Goals</p>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-4">
                    <p className="text-xs text-blue-800">
                        <strong>Purpose:</strong> You are not claiming to solve an SDG. You are explaining how your work contributed toward progress under a specific target.
                    </p>
                </div>

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

            {/* Primary SDG */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3.1</div>
                    <h3 className="text-lg font-bold text-slate-900">Primary SDG (Auto-Selected)</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                    {/* Assigned SDG Display */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                        <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                            {projectData?.sdg || "1"}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold">Primary Goal</p>
                            <h4 className="text-lg font-bold text-slate-900">Assigned SDG Goal</h4>
                            <p className="text-sm text-slate-600">Indicator: {projectData?.indicator || "Standard Framework"}</p>
                        </div>
                    </div>

                    {/* Explanation Textarea */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">3.2 Contribution Explanation (Mandatory)</Label>
                        <p className="text-xs text-slate-500">
                            Explain: What activity did you conduct? What measurable output occurred? What change was observed?
                        </p>
                        <Textarea
                            placeholder="e.g. Our team conducted four hygiene awareness sessions for 60 students... This contributed to the SDG target by..."
                            className={clsx(
                                "min-h-[140px] rounded-xl border-slate-200 p-4 text-slate-700",
                                getFieldError('primary_sdg_explanation') && "border-red-400 bg-red-50"
                            )}
                            value={primary_sdg_explanation || ''}
                            onChange={(e) => updateSection('section3', { primary_sdg_explanation: e.target.value })}
                        />
                        <FieldError message={getFieldError('primary_sdg_explanation')} />
                        <div className="flex justify-between text-xs text-slate-500 px-1">
                            <span>Target: 80 - 120 Words</span>
                            <span className={clsx(primary_sdg_explanation.length > 500 ? "text-red-500" : "text-slate-500")}>
                                {primary_sdg_explanation.length} chars
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary SDGs */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3.3</div>
                        <h3 className="text-lg font-bold text-slate-900">Secondary SDGs (Optional)</h3>
                    </div>
                    <RadioGroup value={hasSecondarySDG} onValueChange={handleToggleSecondary} className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no-sec-sdg" />
                            <Label htmlFor="no-sec-sdg" className="text-sm font-medium">Primary Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes-sec-sdg" />
                            <Label htmlFor="yes-sec-sdg" className="text-sm font-medium">Add Secondary</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-xs text-amber-800">
                        Only add secondary SDGs if the project made a clear additional contribution supported by evidence.
                    </p>
                </div>

                {hasSecondarySDG === "yes" && (
                    <div className="space-y-4">
                        {secondary_sdgs.map((sdg, index) => (
                            <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-700">Secondary SDG #{index + 1}</h4>
                                    <button onClick={() => handleRemoveSecondary(index)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-600">Select SDG Goal</Label>
                                        <Select
                                            value={sdg.sdg_id || ''}
                                            onChange={(e) => updateSecondary(index, 'sdg_id', e.target.value)}
                                            className={clsx("h-10 border-slate-200 rounded-lg", getFieldError(`secondary_sdgs.${index}.sdg_id`) && "border-red-400 bg-red-50")}
                                        >
                                            <option value="">Choose Goal...</option>
                                            {[...Array(17)].map((_, i) => (
                                                <option key={i + 1} value={`${i + 1}`}>SDG {i + 1}</option>
                                            ))}
                                        </Select>
                                        <FieldError message={getFieldError(`secondary_sdgs.${index}.sdg_id`)} />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs font-semibold text-slate-600">Justification (50-80 words)</Label>
                                        <Input
                                            placeholder="Why does this goal apply to your project?"
                                            value={sdg.justification || ''}
                                            onChange={(e) => updateSecondary(index, 'justification', e.target.value)}
                                            className={clsx("h-10 border-slate-200 rounded-lg", getFieldError(`secondary_sdgs.${index}.justification`) && "border-red-400 bg-red-50")}
                                        />
                                        <FieldError message={getFieldError(`secondary_sdgs.${index}.justification`)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {secondary_sdgs.length < 2 && (
                            <button
                                onClick={handleAddSecondary}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-medium flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-600 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                Add Another Secondary SDG
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
