import { LayoutGrid, CheckCircle2, AlertCircle, Target } from "lucide-react";
import { useReportForm } from "../context/ReportContext";

export default function Section11Summary() {
    const { data } = useReportForm();
    const { secondary_sdgs } = data.section3;
    const { metrics } = data.section5;
    const { evidence_types } = data.section8;

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Cross SDG Overview</h2>
                <p className="text-slate-600">An automatically generated summary linking your SDG objectives with outcomes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Table */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-600">SDG Category</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-600">Metric Status</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-600">Evidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {/* Primary SDG Row */}
                                <tr>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                                                <Target className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">Primary SDG</div>
                                                <div className="text-xs text-slate-500">Core Mission</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-slate-900">
                                            {metrics.filter((m: any) => m.metric).length} Indicators
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {evidence_types.length > 0 ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Verified ({evidence_types.length})
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                                                <AlertCircle className="w-3 h-3" />
                                                Missing
                                            </div>
                                        )}
                                    </td>
                                </tr>

                                {/* Secondary SDGs */}
                                {secondary_sdgs.map((sdg, idx) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                                                    <LayoutGrid className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">Secondary SDG {sdg.sdg_id}</div>
                                                    <div className="text-xs text-slate-500">Impact Multiplier</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-600">
                                                {sdg.justification ? 'Documented' : 'Pending'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                Cross-cutting
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                    <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">Insight Summary</h4>
                        <p className="text-sm text-slate-600">Your project has effectively targeted multimodal developmental goals.</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs font-semibold text-slate-600">Total Impacts</span>
                            <span className="text-lg font-bold text-blue-600">{1 + secondary_sdgs.length} Goals</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs font-semibold text-slate-600">Evidence Score</span>
                            <span className="text-lg font-bold text-green-600">{evidence_types.length > 0 ? 'High' : 'None'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
