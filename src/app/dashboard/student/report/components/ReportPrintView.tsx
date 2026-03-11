import { useReportForm } from "../context/ReportContext";
import { Award, Clock, Users, Target, CheckCircle, MapPin, Building2, Calendar } from "lucide-react";
import AttendanceSummaryTable from "../../engagement/components/AttendanceSummaryTable";

interface Props {
    projectData: any;
    reportData?: any; // Added to support usage outside ReportProvider
}

export default function ReportPrintView({ projectData, reportData }: Props) {
    // Use prop if provided, otherwise fallback to context
    let data = reportData;
    try {
        const contextData = useReportForm().data;
        if (!data) data = contextData;
    } catch (e) {
        // Ignored if useReportForm fails outside context
    }

    if (!data) return <div className="p-8 text-center text-slate-500 italic">No report data available for preview.</div>;

    // --- Robust Data Calculation ---
    const calculateMetrics = () => {
        const metrics = {
            total_verified_hours: data.section1?.metrics?.total_verified_hours || 0,
            eis_score: data.section1?.metrics?.eis_score || 0,
            attendance_frequency: data.section1?.metrics?.attendance_frequency || 0,
            total_beneficiaries: data.section4?.total_beneficiaries || 0,
            engagement_span: data.section1?.metrics?.engagement_span || 0
        };

        // Fallback for verified hours if metrics missing
        if (!metrics.total_verified_hours && data.section1?.attendance_logs) {
            metrics.total_verified_hours = data.section1.attendance_logs.reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0);
        }

        // Fallback for EIS Score (Aggregate from competencies)
        if (!metrics.eis_score && data.section9?.competency_scores) {
            const scores = Object.values(data.section9.competency_scores).map(v => Number(v) || 0);
            if (scores.length > 0) {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                metrics.eis_score = Math.round((avg / 5) * 100);
            }
        }

        // Fallback for Engagement Span
        if (!metrics.engagement_span && data.section1?.attendance_logs?.length > 0) {
            const dates = data.section1.attendance_logs.map((log: any) => new Date(log.date).getTime()).filter((t: number) => !isNaN(t));
            if (dates.length > 1) {
                const span = Math.ceil((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24));
                metrics.engagement_span = span;
            }
        }

        return metrics;
    };

    const metrics = calculateMetrics();

    const SectionHeader = ({ title, number }: { title: string, number: number }) => (
        <h2 className="text-xl font-black border-b-4 border-slate-900 pb-2 mb-6 mt-10 font-sans uppercase tracking-tight text-slate-900 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-black">{number}</span>
            {title}
        </h2>
    );

    const LabelValue = ({ label, value, fullWidth = false }: { label: string, value: any, fullWidth?: boolean }) => (
        <div className={`flex flex-col mb-5 ${fullWidth ? 'w-full' : 'w-1/2 pr-6'}`}>
            <span className="font-black text-slate-400 text-[9px] uppercase tracking-[0.15em] mb-1">{label}</span>
            <div className={`text-sm text-slate-900 font-medium leading-relaxed ${fullWidth ? 'text-justify' : ''}`}>
                {value || <span className="text-slate-300 italic">Not Specified</span>}
            </div>
        </div>
    );

    return (
        <div className="font-sans text-slate-900 max-w-4xl mx-auto bg-white p-2 relative group print:p-0 print:m-0 print:max-w-none">
            {/* Print Control Overlay - Hidden on Print */}
            <div className="absolute -top-16 right-0 flex items-center gap-3 print:hidden transition-all duration-300">
                <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Document Ready</span>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0"
                >
                    <CheckCircle className="w-4 h-4" />
                    DOWNLOAD OFFICIAL PDF
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Isolation Logic: Hide body content, show only print container */
                    body { visibility: hidden !important; background: white !important; }
                    #print-root, #print-root * { visibility: visible !important; }
                    #print-root { 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important; 
                        display: block !important;
                    }
                    
                    /* Reset Dashboard Layouts / Overrides */
                    .print\\:hidden { display: none !important; }
                    
                    /* Force Colors for PDF */
                    .bg-slate-900 { background-color: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .bg-slate-50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .bg-white { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .border-slate-900 { border-color: #0f172a !important; -webkit-print-color-adjust: exact; }
                    .text-slate-900 { color: #0f172a !important; }
                    .text-slate-400 { color: #94a3b8 !important; }
                    
                    /* Page Breaks */
                    .break-inside-avoid { page-break-inside: avoid !important; break-inside: avoid !important; }
                    
                    @page {
                        margin: 1.5cm;
                        size: auto;
                    }
                }
            `}} />

            <div id="print-root" className="print-container bg-white">
                {/* Professional Header */}
                <div className="flex justify-between items-start border-b-8 border-slate-900 pb-12 mb-12">
                    <div className="space-y-6">
                        <img src="/logo-1.png" alt="CIEL" className="h-16 w-auto mb-4" />
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-12 h-[2px] bg-slate-200" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">IMPACT PROTOCOL</span>
                            </div>
                            <h1 className="text-5xl font-black tracking-tighter uppercase text-slate-900 leading-none mb-1">Community</h1>
                            <h1 className="text-5xl font-black tracking-tighter uppercase text-slate-900 opacity-30 leading-none">Engagement</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Official Dossier</span>
                            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end pt-8">
                        <div className="w-24 h-2 bg-slate-900 mb-6" />
                        <p className="font-black text-slate-900 text-2xl uppercase tracking-tighter max-w-[320px] leading-[1.1] mb-2">{projectData?.title || data.project_title || "Project Report"}</p>
                        <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VERIFICATION:</span>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{data.project_id || "CIEL-DRAFT"}</span>
                        </div>
                    </div>
                </div>

                {/* Project Identity Grid */}
                <div className="grid grid-cols-4 gap-6 mb-12 pb-12 border-b-2 border-slate-100">
                    <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Partner Organization</span>
                        <span className="text-sm font-black text-slate-900 leading-tight">{projectData?.organization_name || projectData?.organization || projectData?.partner_name || "Self-Initiated"}</span>
                    </div>
                    <div className="space-y-1 border-l-2 border-slate-50 pl-6">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Engagement Location</span>
                        <span className="text-sm font-black text-slate-900">{projectData?.city || projectData?.location_district || "Remote"}</span>
                    </div>
                    <div className="space-y-1 border-l-2 border-slate-50 pl-6">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Commencement</span>
                        <span className="text-sm font-black text-slate-900">{projectData?.start_date ? new Date(projectData.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}</span>
                    </div>
                    <div className="space-y-1 border-l-2 border-slate-50 pl-6">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Conclusion</span>
                        <span className="text-sm font-black text-slate-900">{projectData?.end_date ? new Date(projectData.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}</span>
                    </div>
                </div>

                {/* Section 1: Participation */}
                <SectionHeader number={1} title="Participation Profile" />
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-10">
                    <LabelValue label="Type" value={data.section1.participation_type} />
                    <LabelValue label="Lead Member" value={data.section1.team_lead.name} />
                    <LabelValue label="Host Institution" value={data.section1.team_lead.university} />
                    <LabelValue label="HEC Compliance" value={data.section1.metrics?.hec_compliance || 'Verified'} />
                </div>

                {data.section1.team_members.length > 0 && (
                    <div className="mb-12">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Certified Team Roster</p>
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="p-3 text-left font-black uppercase tracking-widest text-[9px]">Full Member Name</th>
                                    <th className="p-3 text-left font-black uppercase tracking-widest text-[9px]">ID / Qualification</th>
                                    <th className="p-3 text-left font-black uppercase tracking-widest text-[9px]">Strategic Capacity</th>
                                </tr>
                            </thead>
                            <tbody className="border-x border-b border-slate-100 divide-y divide-slate-50">
                                {data.section1.team_members.map((m: any, i: number) => (
                                    <tr key={i}>
                                        <td className="p-3 font-black text-slate-900">{m.name}</td>
                                        <td className="p-3 text-slate-500 font-medium">{m.cnic}</td>
                                        <td className="p-3 text-slate-900 text-[10px] font-black uppercase tracking-tight">{m.role}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Verified Engagement Portfolio */}
                {data.section1.attendance_logs && data.section1.attendance_logs.length > 0 && (
                    <div className="mb-12">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Verified Engagement Portfolio</p>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden p-1">
                            <AttendanceSummaryTable
                                entries={data.section1.attendance_logs}
                                isLocked={true}
                            />
                        </div>
                    </div>
                )}

                {/* Framework & Impact Logic */}
                <div className="grid grid-cols-2 gap-16 mb-12">
                    <div>
                        <SectionHeader number={2} title="Project Framework" />
                        <div className="space-y-6">
                            <LabelValue label="Academic Discipline" value={data.section2.discipline} fullWidth />
                            <LabelValue label="Community Problem Statement" value={data.section2.problem_statement} fullWidth />
                        </div>
                    </div>
                    <div>
                        <SectionHeader number={3} title="SDG Impact Alignment" />
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl font-black">
                                    {data.section3.primary_sdg?.goal_number || 'X'}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">PRIMARY GOAL</p>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight line-clamp-1">{data.section3.primary_sdg?.goal_title || 'N/A'}</p>
                                </div>
                            </div>
                            <LabelValue label="Impact Indicator Mapping" value={`${data.section3.primary_sdg?.target_id || data.section3.primary_sdg?.target_code || 'N/A'} / ${data.section3.primary_sdg?.indicator_id || data.section3.primary_sdg?.indicator_code || 'N/A'}`} fullWidth />
                        </div>
                    </div>
                </div>

                {/* Operations & Sustenance */}
                <SectionHeader number={4} title="Operational Metrics" />
                <div className="grid grid-cols-4 gap-6 mb-10">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Human Capital</p>
                        <p className="text-3xl font-black text-slate-900">{metrics.total_verified_hours}<span className="text-xs ml-1">HRS</span></p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sessions</p>
                        <p className="text-3xl font-black text-slate-900">{data.section4.total_sessions || data.section4.activities?.length || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Reach</p>
                        <p className="text-3xl font-black text-slate-900">{metrics.total_beneficiaries}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Span</p>
                        <p className="text-3xl font-black text-slate-900">{metrics.engagement_span}<span className="text-xs ml-1">DAYS</span></p>
                    </div>
                </div>

                {/* Systemic Outcomes */}
                <SectionHeader number={5} title="Systemic Outcomes" />
                <div className="space-y-6 mb-12">
                    {data.section5.measurable_outcomes?.map((outcome: any, i: number) => (
                        <div key={i} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 break-inside-avoid">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="w-1.5 h-6 bg-slate-900 rounded-full" />
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Outcome Measurement {i + 1}</p>
                                </div>
                                <p className="text-xl font-black text-slate-900 leading-tight mb-6">{outcome.metric || "N/A"}</p>
                                <div className="flex items-center gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Baseline</p>
                                        <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl font-black text-slate-500">{outcome.baseline} {outcome.unit}</div>
                                    </div>
                                    <div className="w-12 h-[2px] bg-slate-200 mt-4" />
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest text-center">Achieved</p>
                                        <div className="bg-slate-900 px-6 py-3 rounded-2xl font-black text-white">{outcome.endline} {outcome.unit}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6 pt-2">
                                <LabelValue label="Impact Dimension" value={outcome.outcome_area} fullWidth />
                                <LabelValue label="Data Confidence Level" value={outcome.confidence_level} fullWidth />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Resources & Partnerships */}
                <div className="grid grid-cols-2 gap-16 border-t-2 border-slate-100 pt-12 mt-12 mb-16 break-inside-avoid">
                    <div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.35em] mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-slate-900" /> Capital Deployment
                        </h3>
                        {data.section6.resources?.length > 0 ? (
                            <div className="space-y-4">
                                {data.section6.resources.map((r: any, i: number) => (
                                    <div key={i} className="flex justify-between items-end border-b border-slate-100 pb-3">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">{r.source}</p>
                                            <p className="text-xs font-black text-slate-900">{r.type}</p>
                                        </div>
                                        <p className="text-sm font-black text-slate-900">{r.amount} {r.unit}</p>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-slate-400 italic">No external resource usage reported.</p>}
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.35em] mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-slate-900" /> Strategic Alliance
                        </h3>
                        {data.section7.partners?.length > 0 ? (
                            <div className="space-y-4">
                                {data.section7.partners.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <div>
                                            <p className="text-xs font-black text-slate-900">{p.name}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest tracking-tight">{p.type} PARTNER</p>
                                        </div>
                                        <CheckCircle className="w-4 h-4 text-slate-900 opacity-20" />
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-slate-400 italic">No formal partnerships reported.</p>}
                    </div>
                </div>

                {/* Reflection & Academic Synthesis */}
                <div className="mb-16 border-t-2 border-slate-100 pt-12 break-inside-avoid">
                    <SectionHeader number={9} title="Reflection & Synthesis" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
                        <LabelValue label="Academic-Professional Synthesis" value={data.section9.academic_application} fullWidth />
                        <div className="space-y-8">
                            <LabelValue label="Sustainability Road-map" value={data.section10.continuation_details} fullWidth />
                            <div className="grid grid-cols-2 gap-8">
                                <LabelValue label="Personal Insight" value={data.section9.personal_learning} />
                                <LabelValue label="Strategy" value={data.section10.continuation_status} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Institutional Summary Dashboard - UNIFIED DESIGN (LIGHT) */}
                <div className="mt-16 p-12 bg-slate-50 rounded-[3rem] border-4 border-slate-900 relative overflow-hidden break-inside-avoid">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500 opacity-5 rounded-full -mr-48 -mt-48 blur-3xl" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-12 border-b-2 border-slate-200 pb-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">CIEL Institutional Framework</p>
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Impact Intelligence Dashboard</h2>
                            </div>
                            <Award className="w-16 h-16 text-slate-900 opacity-10" />
                        </div>
                        <div className="grid grid-cols-4 gap-8 mb-12">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Aggregate EIS</p>
                                <p className="text-4xl font-black text-slate-900">{metrics.eis_score}<span className="text-xs text-slate-400 ml-1">/100</span></p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Engagement Index</p>
                                <p className="text-4xl font-black text-slate-900">{metrics.attendance_frequency || '—'}<span className="text-xs text-slate-400 ml-1">%</span></p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Outreach</p>
                                <p className="text-4xl font-black text-slate-900">{metrics.total_beneficiaries}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Compliance</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                                    <p className="text-2xl font-black text-emerald-600 uppercase tracking-tighter">OK</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-md">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="w-12 h-[2px] bg-slate-100" />
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Strategic Perspective</p>
                            </div>
                            <p className="text-2xl font-black font-serif italic text-slate-900 leading-[1.45]">
                                "This project aligns with CIEL's impact protocol for SDG {data.section3.primary_sdg?.goal_number || 'X'}. Through {metrics.total_verified_hours} total hours of verified engagement, the initiative has successfully converted academic theory into measurable community benefit, demonstrating excellence in {data.section2.discipline || 'applied'} methodology."
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-20 flex justify-between items-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] border-t-2 border-slate-50 pt-10 mb-12">
                    <div className="flex items-center gap-6">
                        <img src="/logo-1.png" alt="CIEL" className="h-5 grayscale opacity-20" />
                        <span className="opacity-50">CIEL-DIGITAL-VERIFICATION-PROTOCOL</span>
                    </div>
                    <span className="opacity-50 tracking-[0.2em]">© {new Date().getFullYear()} Community Impact Lab</span>
                </div>
            </div>
        </div>
    );
}
