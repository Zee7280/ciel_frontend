import { TrendingUp, BarChart3, Plus, Trash2, ArrowRightLeft, Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Select } from "./ui/select";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

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
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Impact Verification</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Change & Outcomes</h2>
                <p className="text-slate-500 max-w-2xl font-medium">Quantify the transformation your project created. Compare the situation before and after your intervention.</p>
            </div>

            {/* Qualitative Change */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg border-2 border-slate-700">1</div>
                    <div className="flex-1 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Observed Change</h3>
                        <Badge className="bg-red-50 text-red-600 border-red-100 px-3 py-1 rounded-lg">MANDATORY</Badge>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <TrendingUp className="w-40 h-40" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
                        <div className="lg:col-span-2 space-y-4">
                            <Label className="text-sm font-bold text-slate-700">Qualitative Description of Change</Label>
                            <Textarea
                                placeholder="Describe the behavior shift, skill acquisition, or system improvement..."
                                className="min-h-[220px] rounded-[1.5rem] border-slate-200 p-6 font-medium text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-50 transition-all bg-white"
                                value={observed_change}
                                onChange={(e) => updateSection('section5', { observed_change: e.target.value })}
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-3 h-3 text-blue-500" /> Focus Areas
                                </h4>
                                <ul className="space-y-3">
                                    {[
                                        "New skills acquired by beneficiaries.",
                                        "Improved access to resources.",
                                        "Shifts in community attitude.",
                                        "Time or cost savings achieved."
                                    ].map((area, i) => (
                                        <li key={i} className="text-xs font-medium text-slate-500 leading-relaxed flex gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-100 mt-1 shrink-0" />
                                            {area}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quantitative Metrics */}
            <div className="space-y-8 pt-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xl">2</div>
                        <h3 className="text-xl font-bold text-slate-900">Baseline vs Endline</h3>
                    </div>
                    <Button
                        onClick={addMetric}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-6"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Numeric Metric
                    </Button>
                </div>

                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {["Metric Descriptor", "Baseline (Before)", "Endline (After)", "Unit", ""].map((h, i) => (
                                        <th key={i} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {metrics.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center text-slate-400 font-medium italic">
                                            No quantitative metrics defined. Add at least one to show impact weight.
                                        </td>
                                    </tr>
                                ) : (
                                    metrics.map((m, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                                                        <BarChart3 className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                    <Input
                                                        placeholder="e.g. Students score in test"
                                                        className="h-10 border-slate-200 rounded-xl font-bold text-sm min-w-[200px]"
                                                        value={m.metric}
                                                        onChange={(e) => updateMetric(i, 'metric', e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 border-l border-slate-50">
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        className="h-10 border-slate-200 rounded-xl font-black text-sm w-28 bg-slate-50/50 focus:bg-white"
                                                        value={m.baseline}
                                                        onChange={(e) => updateMetric(i, 'baseline', e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 border-l border-slate-50 bg-green-50/30">
                                                <div className="flex items-center gap-4">
                                                    <ArrowRightLeft className="w-4 h-4 text-slate-300" />
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        className="h-10 border-green-200 rounded-xl font-black text-sm w-28 bg-white"
                                                        value={m.endline}
                                                        onChange={(e) => updateMetric(i, 'endline', e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <Select
                                                    value={m.unit}
                                                    onChange={(e) => updateMetric(i, 'unit', e.target.value)}
                                                    className="h-10 border-slate-200 rounded-xl font-bold text-sm w-24"
                                                >
                                                    <option value="#"># Count</option>
                                                    <option value="%">% Percent</option>
                                                    <option value="Score">Score</option>
                                                    <option value="Yes/No">Yes/No</option>
                                                </Select>
                                            </td>
                                            <td className="px-6 py-6">
                                                <button onClick={() => removeMetric(i)} className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex flex-col md:flex-row items-center gap-6 group">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium leading-relaxed italic opacity-80">"Significant impact is defined by meaningful change in baseline data, even if the numbers are small."</p>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quality over Quantity</p>
                </div>
            </div>
        </div>
    )
}
