import { Target, Info, Plus, Trash2 } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select } from "./ui/select";
import { useReportForm } from "../context/ReportContext";
import { useState } from "react";
import clsx from "clsx";

interface Section3Props {
    projectData?: any;
}

export default function Section3SDGMapping({ projectData }: Section3Props) {
    const { data, updateSection } = useReportForm();
    const { primary_sdg_explanation, secondary_sdgs } = data.section3;
    const [hasSecondarySDG, setHasSecondarySDG] = useState(secondary_sdgs.length > 0 ? "yes" : "no");

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
            {/* Primary SDG */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">1</div>
                    <h3 className="text-xl font-bold text-slate-900">Primary Impact Goal</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                    {/* Assigned SDG Display */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                        <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center text-2xl font-bold text-white">
                            {projectData?.sdg || "1"}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold">Assigned SDG</p>
                            <h4 className="text-lg font-bold text-slate-900">Assigned Goal</h4>
                            <p className="text-sm text-slate-600">Indicator: {projectData?.indicator || "Standard Framework"}</p>
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800">This goal is automatically inherited from the NGO/Partner opportunity and cannot be changed.</p>
                    </div>

                    {/* Explanation Textarea */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Write your Contribution Explanation</Label>
                        <Textarea
                            placeholder="State how your activities achieved the targets of this SDG..."
                            className="min-h-[140px] rounded-xl border-slate-200 p-4 text-slate-700"
                            value={primary_sdg_explanation || ''}
                            onChange={(e) => updateSection('section3', { primary_sdg_explanation: e.target.value })}
                        />
                        <div className="flex justify-between text-xs text-slate-500 px-1">
                            <span>Guide: 80 - 120 Words</span>
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
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">2</div>
                        <h3 className="text-xl font-bold text-slate-900">Multi-Dimensional Impact</h3>
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
                                            className="h-10 border-slate-200 rounded-lg"
                                        >
                                            <option value="">Choose Goal...</option>
                                            <option value="1">SDG 1: No Poverty</option>
                                            <option value="4">SDG 4: Quality Education</option>
                                            <option value="5">SDG 5: Gender Equality</option>
                                            <option value="13">SDG 13: Climate Action</option>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs font-semibold text-slate-600">Justification</Label>
                                        <Input
                                            placeholder="Why does this goal apply to your project?"
                                            value={sdg.justification || ''}
                                            onChange={(e) => updateSecondary(index, 'justification', e.target.value)}
                                            className="h-10 border-slate-200 rounded-lg"
                                        />
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
