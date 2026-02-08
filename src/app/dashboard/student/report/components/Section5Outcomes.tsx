import { TrendingUp, BarChart3, Plus, Trash2 } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";

export default function Section5Outcomes() {
    const { data, updateSection } = useReportForm();
    const { observed_change, metrics } = data.section5;

    const updateMetric = (index: number, field: string, value: string) => {
        const newMetrics = [...metrics];
        newMetrics[index] = { ...newMetrics[index], [field]: value };
        updateSection('section5', { metrics: newMetrics });
    };

    const addMetric = () => {
        updateSection('section5', { metrics: [...metrics, { metric: '', baseline: '', endline: '', unit: '#' }] });
    };

    const removeMetric = (index: number) => {
        const newMetrics = [...metrics];
        newMetrics.splice(index, 1);
        updateSection('section5', { metrics: newMetrics });
    };

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Change & Outcomes</h2>
                <p className="text-slate-600 text-sm">Quantify the transformation your project created. Compare the situation before and after your intervention.</p>
            </div>

            {/* Qualitative Change */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                    <h3 className="text-lg font-bold text-slate-900">Observed Change</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                    <div>
                        <Label className="text-sm font-semibold text-slate-700 mb-2 block">Qualitative Description of Change</Label>
                        <Textarea
                            placeholder="Describe the behavior shift, skill acquisition, or system improvement..."
                            className="min-h-[180px] rounded-lg border-slate-200 text-slate-700"
                            value={observed_change}
                            onChange={(e) => updateSection('section5', { observed_change: e.target.value })}
                        />
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs font-semibold text-blue-800 mb-2">Focus Areas:</p>
                        <ul className="space-y-1 text-xs text-blue-700">
                            <li>• New skills acquired by beneficiaries</li>
                            <li>• Improved access to resources</li>
                            <li>• Shifts in community attitude</li>
                            <li>• Time or cost savings achieved</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Quantitative Metrics */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                        <h3 className="text-lg font-bold text-slate-900">Baseline vs Endline</h3>
                    </div>
                    <Button
                        onClick={addMetric}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Metric
                    </Button>
                </div>

                {metrics.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
                        <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">No quantitative metrics defined</p>
                        <p className="text-sm text-slate-500 mt-1">Add at least one metric to show impact</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {metrics.map((m, i) => (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">Metric {i + 1}</span>
                                    </div>
                                    <button
                                        onClick={() => removeMetric(i)}
                                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-600">Metric Descriptor</Label>
                                        <Input
                                            placeholder="e.g. Students score in test"
                                            className="h-10 text-sm border-slate-200 rounded-lg"
                                            value={m.metric}
                                            onChange={(e) => updateMetric(i, 'metric', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-600">Baseline (Before)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            className="h-10 text-sm border-slate-200 rounded-lg"
                                            value={m.baseline}
                                            onChange={(e) => updateMetric(i, 'baseline', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-600">Endline (After)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            className="h-10 text-sm border-slate-200 rounded-lg"
                                            value={m.endline}
                                            onChange={(e) => updateMetric(i, 'endline', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-600">Unit</Label>
                                        <Select
                                            value={m.unit}
                                            onChange={(e) => updateMetric(i, 'unit', e.target.value)}
                                            className="h-10 text-sm border-slate-200 rounded-lg"
                                        >
                                            <option value="#"># Count</option>
                                            <option value="%">% Percent</option>
                                            <option value="Score">Score</option>
                                            <option value="Yes/No">Yes/No</option>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-800">
                        💡 <strong>Tip:</strong> Significant impact is defined by meaningful change in baseline data, even if the numbers are small.
                    </p>
                </div>
            </div>
        </div>
    )
}
