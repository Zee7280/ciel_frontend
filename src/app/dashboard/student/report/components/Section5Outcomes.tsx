import { Activity, TrendingUp, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { FieldError } from "./ui/FieldError";
import clsx from "clsx";

export default function Section5Outcomes() {
    const { data, updateSection, getFieldError, validationErrors } = useReportForm();
    const { section5 } = data;
    const { observed_change, outcome_area, metric, baseline, endline, unit, confidence_level, challenges } = section5;

    const sectionErrors = validationErrors['section5'] || [];
    const hasErrors = sectionErrors.length > 0;

    const handleUpdate = (field: string, value: any) => {
        updateSection('section5', { [field]: value });
    };

    const outcomeAreas = [
        "Skill Development", "Behavior Change", "Access to Resources", "Policy Change",
        "Community Infrastructure", "Environmental Impact", "Health Improvement", "Awareness / Knowledge"
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 5</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Outcomes & Impact</h2>
                <p className="text-slate-600 text-sm">Quantify the change. Compare the situation before (Baseline) and after (Endline).</p>

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

            {/* 5.1 Qualitative Change */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">5.1</div>
                    <h3 className="text-lg font-bold text-slate-900">Observed Change</h3>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                    <Label className="text-sm font-semibold text-slate-700">Qualitative Description (Story of Change)</Label>
                    <Textarea
                        placeholder="Describe the tangible difference your project made. Be specific about who benefited and how."
                        className={clsx("min-h-[140px]", getFieldError('observed_change') && "border-red-400 bg-red-50")}
                        value={observed_change}
                        onChange={(e) => handleUpdate('observed_change', e.target.value)}
                    />
                    <FieldError message={getFieldError('observed_change')} />
                </div>
            </div>

            {/* 5.2 Metrics */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">5.2</div>
                    <h3 className="text-lg font-bold text-slate-900">Key Performance Indicator (KPI)</h3>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Outcome Area</Label>
                            <Select
                                value={outcome_area}
                                onChange={(e) => handleUpdate('outcome_area', e.target.value)}
                                className={clsx(getFieldError('outcome_area') && "border-red-400 bg-red-50")}
                            >
                                <option value="">Select Area</option>
                                {outcomeAreas.map(a => <option key={a} value={a}>{a}</option>)}
                            </Select>
                            <FieldError message={getFieldError('outcome_area')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Specific Metric</Label>
                            <Input
                                placeholder="e.g. Students passing math test"
                                value={metric}
                                onChange={(e) => handleUpdate('metric', e.target.value)}
                                className={clsx(getFieldError('metric') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('metric')} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Baseline (Start)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={baseline}
                                onChange={(e) => handleUpdate('baseline', e.target.value)}
                                className={clsx(getFieldError('baseline') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('baseline')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Endline (End)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={endline}
                                onChange={(e) => handleUpdate('endline', e.target.value)}
                                className={clsx(getFieldError('endline') && "border-red-400 bg-red-50")}
                            />
                            <FieldError message={getFieldError('endline')} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Unit</Label>
                            <Select
                                value={unit}
                                onChange={(e) => handleUpdate('unit', e.target.value)}
                            >
                                <option value="#"># Count</option>
                                <option value="%">% Percent</option>
                                <option value="Scale">Scale (1-10)</option>
                                <option value="Yes/No">Yes/No</option>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Confidence Level</Label>
                        <Select
                            value={confidence_level}
                            onChange={(e) => handleUpdate('confidence_level', e.target.value)}
                            className={clsx(getFieldError('confidence_level') && "border-red-400 bg-red-50")}
                        >
                            <option value="">How sure are you?</option>
                            <option value="High - Verified Data">High - Verified Data (Surveys/Tests)</option>
                            <option value="Medium - Observation">Medium - Observation / Feedback</option>
                            <option value="Low - Estimate">Low - Rough Estimate</option>
                        </Select>
                        <FieldError message={getFieldError('confidence_level')} />
                    </div>
                </div>
            </div>

            {/* 5.3 Challenges */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">5.3</div>
                    <h3 className="text-lg font-bold text-slate-900">Challenges Faced</h3>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block">What obstacles did you encounter and how did you mitigate them?</Label>
                    <Textarea
                        placeholder="e.g. Weather caused delays, so we rescheduled..."
                        className="min-h-[100px]"
                        value={challenges}
                        onChange={(e) => handleUpdate('challenges', e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}
