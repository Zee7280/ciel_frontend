import { CheckCircle, Clock, Users, Target, ShieldCheck, Download, Award, TrendingUp, X, Printer } from "lucide-react";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";
import { useState } from "react";
import ReportPrintView from "./ReportPrintView";

export default function Section11Summary() {
    const { data } = useReportForm();
    const { section1, section2, section3, section4, section5, section8, section10 } = data;

    const [showPreview, setShowPreview] = useState(false);

    // Derived Metrics
    const isTeam = section1.participation_type === 'team';
    const totalHours = isTeam
        ? (parseFloat(section4.my_hours) || 0)
        : (parseFloat(section4.duration_val) || 0); // Simplified logic

    const beneficiaries = section4.total_beneficiaries || 0;
    const engagementScore = section1.engagement_score || 0; // Assuming this is calculated in Section 1 or context
    const impactLevel = parseInt(section5.endline) > parseInt(section5.baseline) ? "Positive" : "Neutral";

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <span className="text-sm font-bold">🔹 SECTION 11</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Report Summary & Intelligence</h2>
                <p className="text-slate-600 text-sm">Review your generated impact profile before submission.</p>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-600 text-white p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold">Verified Hours</span>
                    </div>
                    <p className="text-2xl font-bold">{totalHours} hrs</p>
                </div>
                <div className="bg-slate-900 text-white p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-semibold">Beneficiaries</span>
                    </div>
                    <p className="text-2xl font-bold">{beneficiaries}</p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-slate-500">
                        <Target className="w-4 h-4" />
                        <span className="text-xs font-semibold">Primary Goal</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">SDG {data.section3?.primary_sdg_explanation ? (data as any).project_id /* Mock for now */ : "1"}</p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-slate-500">
                        <Award className="w-4 h-4" />
                        <span className="text-xs font-semibold">Engagement Score</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{engagementScore}/100</p>
                </div>
            </div>

            {/* Impact Narrative */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-slate-900">Impact Narrative Generated</h3>
                <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed italic">
                    "{section2.problem_statement ? `Addressing the need where '${section2.problem_statement.substring(0, 50)}...', ` : ''}
                    {isTeam ? 'the team' : 'the student'} implemented {section4.activity_type} activities.
                    This resulted in {section5.observed_change ? section5.observed_change : 'measurable social change'},
                    contributing directly to SDG targets.
                    Sustainability is rated as '{section10.continuation_status}' with {section10.mechanisms?.length || 0} support mechanisms identified."
                </div>
            </div>

            {/* Verification Status */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="font-bold text-slate-900 mb-4">Verification Audit</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className={clsx("w-5 h-5", section8.partner_verification ? "text-green-600" : "text-slate-300")} />
                            <span className="text-sm font-medium text-slate-700">Partner Verification Letter</span>
                        </div>
                        <span className={clsx("text-xs font-bold px-2 py-1 rounded", section8.partner_verification ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                            {section8.partner_verification ? "VERIFIED" : "PENDING"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                            <CheckCircle className={clsx("w-5 h-5", section8.ethical_compliance.informed_consent ? "text-green-600" : "text-amber-500")} />
                            <span className="text-sm font-medium text-slate-700">Ethical Compliance</span>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600">SELF-DECLARED</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-slate-700">Data Connectivity</span>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded bg-blue-50 text-blue-700">READY</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-4">
                <Button variant="outline" className="gap-2" onClick={() => setShowPreview(true)}>
                    <Download className="w-4 h-4" /> Preview PDF Report
                </Button>
            </div>

            {/* ── Print Preview Modal ── */}
            {showPreview && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4 print:hidden">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10 print:hidden">
                            <h3 className="font-bold text-slate-900 text-lg">PDF Preview</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                                >
                                    <Printer className="w-4 h-4" /> Print / Save as PDF
                                </button>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {/* Report Content */}
                        <div id="print-area" className="p-10">
                            <ReportPrintView projectData={null} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

