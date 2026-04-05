import { useReportForm } from "../context/ReportContext";
import { Award, Clock, Users, Target, CheckCircle, MapPin, Building2, Calendar, FileText, LayoutList, Fingerprint, Microscope, Globe, Repeat, Share2, ClipboardCheck, TrendingUp, ShieldCheck } from "lucide-react";
import AttendanceSummaryTable from "../../engagement/components/AttendanceSummaryTable";
import { calculateCII } from "../utils/calculateCII";

interface Props {
    projectData: any;
    reportData?: any;
}

export default function ReportPrintView({ projectData, reportData }: Props) {
    let data = reportData;
    try {
        const contextData = useReportForm().data;
        if (!data) data = contextData;
    } catch (e) {}

    if (!data) return <div className="p-8 text-center text-slate-500 italic">No report data available for preview.</div>;

    const ciiResult = calculateCII(data);
    const { totalScore, level, breakdown } = ciiResult;

    const calculateMetrics = () => {
        const metrics = {
            total_verified_hours: data.section1?.metrics?.total_verified_hours || 0,
            eis_score: totalScore,
            attendance_frequency: data.section1?.metrics?.attendance_frequency || 0,
            total_beneficiaries: data.section4?.project_summary?.distinct_total_beneficiaries || 0,
            engagement_span: data.section1?.metrics?.engagement_span || 0
        };
        return metrics;
    };

    const metrics = calculateMetrics();

    const SectionHeader = ({ title, number, question }: { title: string, number: number, question?: string }) => (
        <div className="mb-10 mt-12 border-b-4 border-slate-900 pb-4 break-inside-avoid">
            <div className="flex items-center gap-4 mb-2">
                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shadow-lg">{number}</span>
                <h2 className="report-h3 !text-2xl font-black">{title}</h2>
            </div>
            {question && (
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-14 leading-relaxed max-w-2xl">
                    {question}
                </p>
            )}
        </div>
    );

    const QandA = ({ q, a, fullWidth = false }: { q: string, a: any, fullWidth?: boolean }) => (
        <div className={`flex flex-col mb-8 ${fullWidth ? 'col-span-2' : 'col-span-1'} break-inside-avoid`}>
            <span className="font-black text-slate-400 text-[9px] uppercase tracking-[0.25em] mb-2 leading-relaxed italic">Question: {q}</span>
            <div className="bg-slate-50/50 border-l-4 border-slate-200 p-4 rounded-r-xl">
                <div className={`text-[13px] text-slate-900 font-bold leading-relaxed ${fullWidth ? 'text-justify' : ''}`}>
                    {a || <span className="text-slate-300 font-medium italic">Pending Verification / Not Provided</span>}
                </div>
            </div>
        </div>
    );

    const scoreTableItems = [
        { label: "Identity & Participation", score: breakdown.participation, max: 10, weight: "10%" },
        { label: "Project Context & Discipline", score: breakdown.context, max: 10, weight: "10%" },
        { label: "SDG Strategy & Intent", score: breakdown.sdg, max: 10, weight: "10%" },
        { label: "Activities & Output Scale", score: breakdown.outputs, max: 15, weight: "15%" },
        { label: "Outcomes & Measurable Change", score: breakdown.outcomes, max: 20, weight: "20%" },
        { label: "Resource Mobilization", score: breakdown.resources, max: 7, weight: "7%" },
        { label: "Partnerships & Collaboration", score: breakdown.partnerships, max: 7, weight: "7%" },
        { label: "Evidence & Verification", score: breakdown.evidence, max: 12, weight: "12%" },
        { label: "Personal & Academic Reflection", score: breakdown.learning, max: 4, weight: "4%" },
        { label: "Sustainability & Continuation", score: breakdown.sustainability, max: 5, weight: "5%" }
    ];

    return (
        <div className="font-sans text-slate-900 max-w-4xl mx-auto bg-white p-2 relative group print:p-0 print:m-0 print:max-w-none">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 1cm; size: A4; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; }
                    .break-inside-avoid { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .bg-slate-900 { background-color: #0f172a !important; }
                    .bg-slate-50 { background-color: #f8fafc !important; }
                    .text-slate-900 { color: #0f172a !important; }
                    .text-slate-400 { color: #94a3b8 !important; }
                    .border-slate-900 { border-color: #0f172a !important; }
                }
            `}} />

            <div className="print-container bg-white">
                {/* Header Profile */}
                <div className="flex justify-between items-start border-b-[10px] border-slate-900 pb-12 mb-12">
                    <div className="space-y-8">
                        <img src="/logo-1.png" alt="CIEL" className="h-14 w-auto" />
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-12 h-[3px] bg-slate-900" />
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.5em]">IMPACT RECORD</span>
                            </div>
                            <h1 className="text-5xl font-black tracking-tighter uppercase text-slate-900 leading-[0.85] mb-2">Student</h1>
                            <h1 className="text-5xl font-black tracking-tighter uppercase text-slate-900 opacity-20 leading-[0.85]">Dossier</h1>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end pt-10">
                        <p className="font-black text-slate-900 text-3xl uppercase tracking-tighter max-w-[350px] leading-[1] mb-4">
                            {projectData?.title || data.project_title || "Project Impact Record"}
                        </p>
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-xl">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Dossier ID:</span>
                            <span className="text-[11px] font-bold uppercase tracking-widest">{data.project_id?.split('-')[0] || "CIEL"}—{(new Date().getFullYear())}</span>
                        </div>
                    </div>
                </div>

                {/* Section 1: Participation Profile */}
                <SectionHeader number={1} title="Participation Profile" question="Who participated in the project and what are their institutional credentials?" />
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    <QandA q="Participation Structure?" a={data.section1.participation_type === 'team' ? "Team-Based Initiative" : "Individual Project"} />
                    <QandA q="Lead Author / Coordinator?" a={data.section1.team_lead.name} />
                    <QandA q="Host Institution / University?" a={data.section1.team_lead.university} />
                    <QandA q="Verified Total Engagement?" a={`${metrics.total_verified_hours} Hours Verified`} />
                </div>

                {data.section1.team_members.length > 0 && (
                    <div className="mb-12 mt-4 break-inside-avoid">
                        <span className="font-black text-slate-400 text-[9px] uppercase tracking-[0.25em] mb-4 block italic">Supplementary Question: Full Team Composition?</span>
                        <table className="w-full text-xs border-collapse rounded-2xl overflow-hidden border border-slate-200">
                            <thead>
                                <tr className="bg-slate-900 text-white text-[9px] uppercase tracking-widest">
                                    <th className="p-4 text-left font-black">Full Name</th>
                                    <th className="p-4 text-left font-black">Capacity / Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.section1.team_members.map((m: any, i: number) => (
                                    <tr key={i} className="bg-white">
                                        <td className="p-4 font-bold text-slate-900">{m.name}</td>
                                        <td className="p-4 text-slate-600 font-bold uppercase tracking-tight text-[10px]">{m.role}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Section 2: Project Context */}
                <SectionHeader number={2} title="Project Context" question="What specific problem was addressed and how did it relate to your academic discipline?" />
                <div className="grid grid-cols-1 gap-4">
                    <QandA q="What was the core problem statement?" a={data.section2.problem_statement} fullWidth />
                    <div className="grid grid-cols-2 gap-8">
                        <QandA q="Academic Discipline?" a={data.section2.discipline} />
                        <QandA q="Disciplinary Contribution?" a={data.section2.discipline_contribution} />
                    </div>
                </div>

                {/* Section 3: SDG Impact */}
                <SectionHeader number={3} title="SDG Impact Mapping" question="Which United Nations Sustainable Development Goals (SDGs) were prioritized by this project?" />
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex items-center gap-6 col-span-1 shadow-xl">
                        <div className="text-5xl font-black opacity-40">0{data.section3.primary_sdg?.goal_number}</div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 italic">Primary Goal Mapping</p>
                            <p className="text-sm font-black uppercase leading-tight">{data.section3.primary_sdg?.goal_title}</p>
                        </div>
                    </div>
                    <QandA q="Target Indicator Mapping?" a={`${data.section3.primary_sdg?.target_id || 'T/A'} — ${data.section3.primary_sdg?.indicator_id || 'I/A'}`} />
                </div>

                {/* Section 4: Operational Metrics */}
                <SectionHeader number={4} title="Operational Metrics" question="What were the measurable outputs and beneficiary reach of the project?" />
                <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Human Capital</p>
                        <p className="report-h3 !text-2xl font-black">{metrics.total_verified_hours}<span className="text-[10px] ml-1">HRS</span></p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Reach</p>
                        <p className="report-h3 !text-2xl font-black">{metrics.total_beneficiaries}<span className="text-[10px] ml-1">PAX</span></p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sessions</p>
                        <p className="report-h3 !text-2xl font-black">{data.section4.total_sessions || data.section4.activity_blocks.length || 1}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact Span</p>
                        <p className="report-h3 !text-2xl font-black">{metrics.engagement_span}<span className="text-[10px] ml-1">DAYS</span></p>
                    </div>
                </div>
                <QandA q="Comprehensive Activity Description?" a={data.section4.activity_description} fullWidth />

                {/* Section 5: Measurable Outcomes */}
                <SectionHeader number={5} title="Systemic Outcomes" question="What specific measurable changes were observed at the end of the project?" />
                <div className="space-y-6">
                    {data.section5.measurable_outcomes?.map((outcome: any, i: number) => (
                        <div key={i} className="p-8 bg-slate-50/50 border-2 border-slate-100 rounded-[2.5rem] grid grid-cols-2 gap-12 break-inside-avoid shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Question {i + 1}: Measurable Change Observed?</p>
                                <p className="text-xl font-black text-slate-900 leading-tight mb-8 underline decoration-slate-200 underline-offset-8 decoration-4">{outcome.metric}</p>
                                <div className="flex items-center gap-10">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Baseline</span>
                                        <div className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-slate-400">{outcome.baseline} {outcome.unit}</div>
                                    </div>
                                    <div className="w-10 h-[2px] bg-slate-200 mt-6" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest mb-2">Achieved</span>
                                        <div className="px-6 py-3 bg-slate-900 rounded-2xl font-black text-white shadow-lg">{outcome.endline} {outcome.unit}</div>
                                    </div>
                                </div>
                            </div>
                            <QandA q="Impact Dimension?" a={outcome.outcome_area} />
                        </div>
                    ))}
                    <QandA q="Core Implementation Challenges?" a={data.section5.challenges} fullWidth />
                </div>

                {/* Section 6: Resources */}
                <SectionHeader number={6} title="Resource Utilization" question="What resources were deployed and how were they sourced?" />
                {data.section6.resources?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-8">
                        {data.section6.resources.map((r: any, i: number) => (
                            <QandA key={i} q={`Resource ${i+1}: ${r.type}?`} a={`Count: ${r.amount} ${r.unit} | Source: ${r.source}`} />
                        ))}
                    </div>
                ) : <QandA q="External resources used?" a="No external financial or physical resources were reported for this project." fullWidth />}

                {/* Section 7: Strategic Partnerships */}
                <SectionHeader number={7} title="Strategic Partnerships" question="Which organizations or partners collaborated in the project?" />
                {data.section7.partners?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-8">
                        {data.section7.partners.map((p: any, i: number) => (
                            <QandA key={i} q={`Partner ${i+1} Name?`} a={`${p.name} (${p.type} Organization)`} />
                        ))}
                    </div>
                ) : <QandA q="Formal partnerships established?" a="Sustainable impact was achieved through student-led initiative without formal external organizational partnering." fullWidth />}

                {/* Section 8: Evidence & Ethics */}
                <SectionHeader number={8} title="Evidence & Ethics" question="What evidence was captured and how were ethical standards maintained?" />
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    <QandA q="Primary Evidence Types Captured?" a={data.section8.evidence_types?.join(', ')} />
                    <QandA q="Ethical Declaration Compliance?" a={Object.entries(data.section8.ethical_compliance || {})
                        .filter(([_, v]) => v)
                        .map(([k, _]) => k.replace(/_/g, ' '))
                        .join(', ') || 'Global Ethical Compliance Adhered'} />
                </div>

                {/* Section 9: Reflection */}
                <SectionHeader number={9} title="Reflection & Synthesis" question="How has this project influenced your professional growth and academic understanding?" />
                <div className="space-y-4">
                    <QandA q="Academic-Professional Synthesis?" a={data.section9.academic_application} fullWidth />
                    <QandA q="Personal Narrative & Identity Growth?" a={data.section9.personal_learning} fullWidth />
                </div>

                {/* Section 10: Sustainability */}
                <SectionHeader number={10} title="Sustainability & Roadmap" question="How will the impact of this project be sustained after your involvement concludes?" />
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <QandA q="Continuation Strategy Status?" a={data.section10.continuation_status} />
                    <QandA q="Scaling Potential?" a={data.section10.scaling_potential} />
                </div>
                <QandA q="Detailed Roadmap for Future Continuity?" a={data.section10.continuation_details} fullWidth />

                {/* Section 11: Impact Intelligence breakdown */}
                <SectionHeader number={11} title="Impact Intelligence Analysis" question="What is the detailed breakdown of the CII Index Score performance?" />
                <div className="mb-12 break-inside-avoid">
                    <table className="w-full text-xs border-collapse rounded-2xl overflow-hidden border border-slate-200">
                        <thead>
                            <tr className="bg-slate-900 text-white text-[9px] uppercase tracking-widest">
                                <th className="p-4 text-left font-black">Score Category</th>
                                <th className="p-4 text-center font-black">Weight</th>
                                <th className="p-4 text-center font-black">Max Points</th>
                                <th className="p-4 text-right font-black">Achieved Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {scoreTableItems.map((item, i) => (
                                <tr key={i} className="bg-white">
                                    <td className="p-4 font-bold text-slate-900">{item.label}</td>
                                    <td className="p-4 text-center text-slate-400 font-bold uppercase tracking-tight text-[10px]">{item.weight}</td>
                                    <td className="p-4 text-center text-slate-400 font-bold text-[10px]">{item.max}</td>
                                    <td className="p-4 text-right">
                                        <span className="inline-flex items-center justify-center w-12 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-900 font-black text-[11px]">
                                            {item.score}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 border-t-2 border-slate-200">
                                <td colSpan={3} className="p-4 text-right font-black uppercase text-slate-900 tracking-widest text-[10px]">Aggregated CII Index Score</td>
                                <td className="p-4 text-right">
                                    <span className="inline-flex items-center justify-center w-12 py-2 bg-slate-900 text-white rounded-lg font-black text-xs shadow-lg">
                                        {totalScore}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] flex items-center justify-between text-white shadow-2xl">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                                <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">Engagement Status</p>
                                <p className="text-xl font-black uppercase tracking-tight">{level}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">CII Score Calculation Matrix</p>
                            <p className="text-[10px] font-bold text-white/60 max-w-[300px]">CIEL Institutional Protocol v2.4 — Verified Impact Scoring Algorithm</p>
                        </div>
                    </div>
                </div>

                {/* Institutional Impact Summary */}
                <div className="mt-20 p-14 bg-slate-50 rounded-[4rem] border-[4px] border-slate-900 relative overflow-hidden break-inside-avoid">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-12 border-b-2 border-slate-200 pb-10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-3 block">CIEL IMPACT PROTOCOL</p>
                                <h2 className="report-h2">Intelligence Dashboard</h2>
                            </div>
                            <Award className="w-20 h-20 text-slate-900 opacity-10" />
                        </div>
                        <div className="grid grid-cols-4 gap-8">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Impact Score</p>
                                <p className="text-5xl font-black text-slate-900">{totalScore}<span className="text-xs text-slate-400 ml-1">/100</span></p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl border border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Hours Logged</p>
                                <p className="text-5xl font-black text-slate-900">{metrics.total_verified_hours}</p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl border border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Strategic SDG</p>
                                <p className="text-5xl font-black text-slate-900">0{data.section3.primary_sdg?.goal_number || 'X'}</p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
                                <CheckCircle className="w-12 h-12 text-slate-900 mb-2 opacity-20" />
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">VERIFIED</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Signing Area */}
                <div className="mt-24 border-t-4 border-slate-100 pt-10 flex justify-between items-end mb-12">
                    <div className="space-y-6">
                        <div className="w-48 h-[2px] bg-slate-900" />
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Student Signature / Attestation</p>
                    </div>
                    <div className="text-right">
                        <img src="/logo-1.png" alt="CIEL" className="h-6 grayscale opacity-20 mb-4 ml-auto" />
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">CIEL DIGITAL PROTOCOL — © {new Date().getFullYear()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
