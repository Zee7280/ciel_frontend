import { Target, Info, Plus, Trash2, CheckCircle2, HelpCircle, FileText, LayoutGrid } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select } from "./ui/select";
import { FileUpload } from "./ui/file-upload";
import { Button } from "./ui/button";
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
        if (val === 'yes' && secondary_sdgs.length === 0) {
            handleAddSecondary();
        }
    }

    return (
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                    <Target className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Global Impact Alignment</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">SDG Mapping</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Connect your project outcomes to the United Nations Sustainable Development Goals. This is the core of our impact measurement system.</p>
            </div>

            {/* Primary SDG Card - High Impact */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-lg border-2 border-amber-400">1</div>
                    <h3 className="text-xl font-bold text-slate-900">Primary Impact Goal</h3>
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] p-4 sm:p-8 border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700">
                        <Target className="w-40 h-40" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-6">
                                <div className="w-24 h-24 rounded-2xl bg-slate-900 flex items-center justify-center text-4xl font-black text-white shrink-0 shadow-xl">
                                    {projectData?.sdg || "?"}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned SDG</p>
                                    <h4 className="text-xl font-black text-slate-900">Assigned Goal</h4>
                                    <p className="text-sm text-slate-500 font-medium">Indicator: {projectData?.indicator || "Standard Framework"}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 leading-relaxed font-medium">This goal is automatically inherited from the NGO/Partner opportunity and cannot be changed.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-sm font-bold text-slate-700">Write your Contribution Explanation</Label>
                            <Textarea
                                placeholder="State how your activities achieved the targets of this SDG..."
                                className="min-h-[160px] rounded-[1.5rem] border-slate-200 p-6 font-medium text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-50 transition-all"
                                value={primary_sdg_explanation}
                                onChange={(e) => updateSection('section3', { primary_sdg_explanation: e.target.value })}
                            />
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                                <span>Guide: 80 - 120 Words</span>
                                <span className={clsx(primary_sdg_explanation.length > 500 ? "text-red-500" : "text-slate-400")}>{primary_sdg_explanation.length} chars</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary SDGs */}
            <div className="space-y-8 pt-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xl">2</div>
                        <h3 className="text-xl font-bold text-slate-900">Multi-Dimensional Impact</h3>
                    </div>
                    <RadioGroup value={hasSecondarySDG} onValueChange={handleToggleSecondary} className="hidden sm:flex items-center gap-6">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no-sec-sdg" className="border-slate-300" />
                            <Label htmlFor="no-sec-sdg" className="text-xs font-bold text-slate-500">Primary Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes-sec-sdg" className="border-slate-300" />
                            <Label htmlFor="yes-sec-sdg" className="text-xs font-bold text-slate-500">Add Secondary</Label>
                        </div>
                    </RadioGroup>
                </div>

                {hasSecondarySDG === "yes" && (
                    <div className="space-y-6">
                        {secondary_sdgs.map((sdg, index) => (
                            <div key={index} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-8 animate-fade-in-up shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400">0{index + 1}</div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Secondary Alignment</h4>
                                    </div>
                                    <button onClick={() => handleRemoveSecondary(index)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-xl">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="md:col-span-1 space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select SDG Goal</Label>
                                        <Select
                                            value={sdg.sdg_id}
                                            onChange={(e) => updateSecondary(index, 'sdg_id', e.target.value)}
                                            className="h-12 border-slate-200 rounded-xl font-bold text-slate-800"
                                        >
                                            <option value="">Choose Goal...</option>
                                            <option value="1">SDG 1: No Poverty</option>
                                            <option value="4">SDG 4: Quality Education</option>
                                            <option value="5">SDG 5: Gender Equality</option>
                                            <option value="13">SDG 13: Climate Action</option>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Justification Text</Label>
                                        <Input
                                            placeholder="Why does this goal apply to your project?"
                                            value={sdg.justification}
                                            onChange={(e) => updateSecondary(index, 'justification', e.target.value)}
                                            className="h-12 border-slate-200 rounded-xl font-medium text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                                    <div className="w-full md:w-auto shrink-0 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-sm text-blue-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Evidence Required</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Verify the secondary impact</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <FileUpload label="Drop evidence photos or documents here" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {secondary_sdgs.length < 2 && (
                            <button
                                onClick={handleAddSecondary}
                                className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-bold flex items-center justify-center gap-3 hover:border-blue-300 hover:text-blue-500 transition-all bg-white group"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </div>
                                Add Another Secondary SDG
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Help Card */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center gap-8 group">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center animate-pulse shrink-0">
                    <HelpCircle className="w-10 h-10 text-blue-400" />
                </div>
                <div className="space-y-2">
                    <h4 className="text-xl font-black tracking-tight">SDG Mapping Policy</h4>
                    <p className="text-slate-400 font-medium leading-relaxed">Mapping your project to SDGs requires evidence. If you claim secondary impact, you must upload high-quality proof (media or documents). Our verification team will review all justifications.</p>
                </div>
                <Button className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-100 rounded-2xl px-8 font-black shrink-0">
                    Read Guidelines
                </Button>
            </div>
        </div>
    )
}
