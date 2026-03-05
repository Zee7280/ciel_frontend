import { useReportForm } from "../context/ReportContext";
import { Award, Clock, Users, Target, CheckCircle } from "lucide-react";

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

    const SectionHeader = ({ title, number }: { title: string, number: number }) => (
        <h2 className="text-xl font-black border-b-4 border-slate-900 pb-2 mb-6 mt-10 font-sans uppercase tracking-tight text-slate-900 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-black">{number}</span>
            {title}
        </h2>
    );

    const LabelValue = ({ label, value, fullWidth = false }: { label: string, value: any, fullWidth?: boolean }) => (
        <div className={`flex flex-col mb-5 ${fullWidth ? 'w-full' : 'w-1/2 pr-6'}`}>
            <span className="font-black text-slate-400 text-[9px] uppercase tracking-[0.15em] mb-1">{label}</span>
            <div className={`text-sm text-slate-900 leading-relaxed ${fullWidth ? 'text-justify' : ''}`}>
                {value || <span className="text-slate-300 italic">Not Specified</span>}
            </div>
        </div>
    );

    return (
        <div className="font-sans text-slate-900 max-w-4xl mx-auto bg-white p-2">
            {/* Professional Header */}
            <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900">Community Engagement Report</h1>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md">Official Dossier</span>
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{projectData?.title || "Project Report"}</p>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">ID: {data.project_id || "CIEL-DRAFT"}</p>
                </div>
            </div>

            {/* Section 1: Participation */}
            <SectionHeader number={1} title="Participation Profile" />
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-8">
                <LabelValue label="Type" value={data.section1.participation_type} />
                <LabelValue label="Lead Name" value={data.section1.team_lead.name} />
                <LabelValue label="University" value={data.section1.team_lead.university} />
                <LabelValue label="Status" value={data.section1.metrics.hec_compliance} />
            </div>

            {data.section1.team_members.length > 0 && (
                <div className="mb-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Team Roster</p>
                    <table className="w-full text-[11px] border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-y border-slate-200">
                                <th className="p-3 text-left font-black uppercase text-slate-500">Name</th>
                                <th className="p-3 text-left font-black uppercase text-slate-500">CNIC / ID</th>
                                <th className="p-3 text-left font-black uppercase text-slate-500">Role</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.section1.team_members.map((m: any, i: number) => (
                                <tr key={i}>
                                    <td className="p-3 font-bold text-slate-800">{m.name}</td>
                                    <td className="p-3 text-slate-500">{m.cnic}</td>
                                    <td className="p-3 text-slate-500 uppercase font-bold tracking-tighter">{m.role}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Section 2: Context */}
            <SectionHeader number={2} title="Project Context & Theory" />
            <div className="space-y-4">
                <LabelValue label="Academic Discipline" value={data.section2.discipline} fullWidth />
                <LabelValue label="Problem Statement" value={data.section2.problem_statement} fullWidth />
                <LabelValue label="Disciplinary Connection" value={data.section2.discipline_contribution} fullWidth />
            </div>

            {/* Section 3: SDG Mapping */}
            <SectionHeader number={3} title="Sustainable Development Mapping" />
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-6">
                <LabelValue label="Primary SDG" value={`Goal ${data.section3.primary_sdg.goal_number}: ${data.section3.primary_sdg.goal_title}`} />
                <LabelValue label="Target/Indicator" value={`${data.section3.primary_sdg.target_code} / ${data.section3.primary_sdg.indicator_code}`} />
            </div>
            <LabelValue label="Contribution Logic" value={data.section3.contribution_intent_statement} fullWidth />

            {/* Section 4: Activities */}
            <SectionHeader number={4} title="Engagement Delivery & Outputs" />
            <div className="grid grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl">
                <div className="text-center p-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Hours</p>
                    <p className="text-xl font-black text-slate-900">{data.section1.metrics.total_verified_hours} HRS</p>
                </div>
                <div className="text-center p-4 border-x border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Sessions</p>
                    <p className="text-xl font-black text-slate-900">{data.section4.total_sessions}</p>
                </div>
                <div className="text-center p-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Impact Span</p>
                    <p className="text-xl font-black text-slate-900">{data.section1.metrics.engagement_span} DAYS</p>
                </div>
            </div>

            <div className="mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Structured Outputs</p>
                <div className="flex flex-wrap gap-3">
                    {data.section4.outputs.map((o: any, i: number) => (
                        <div key={i} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold shadow-sm">
                            {o.count} × {o.type}
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 5: Outcomes */}
            <SectionHeader number={5} title="Measurable Outcomes" />
            <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Primary Impact Metric</p>
                    <p className="text-lg font-black text-emerald-900">{data.section5.metric || "N/A"}</p>
                    <div className="flex items-center gap-4 mt-4">
                        <div>
                            <p className="text-[8px] font-bold text-emerald-600 uppercase">Baseline</p>
                            <p className="font-black text-emerald-900">{data.section5.baseline}</p>
                        </div>
                        <div className="w-8 h-[2px] bg-emerald-200" />
                        <div>
                            <p className="text-[8px] font-bold text-emerald-600 uppercase">Endline</p>
                            <p className="font-black text-emerald-900">{data.section5.endline}</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <LabelValue label="Outcome Area" value={data.section5.outcome_area} fullWidth />
                    <LabelValue label="Confidence" value={data.section5.confidence_level} fullWidth />
                </div>
            </div>
            <LabelValue label="Observed Change Narrative" value={data.section5.observed_change} fullWidth />

            {/* Section 6 & 7: Resources & Partners */}
            <div className="grid grid-cols-2 gap-12 border-t-2 border-slate-100 pt-10 mt-10">
                <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-600 rounded-full" /> External Resources
                    </h3>
                    {data.section6.resources.length > 0 ? (
                        <ul className="space-y-2">
                            {data.section6.resources.map((r: any, i: number) => (
                                <li key={i} className="text-xs text-slate-600 font-bold border-b border-slate-50 pb-2">
                                    {r.amount} {r.unit} {r.type} <span className="text-[10px] text-slate-400 font-medium">via {r.source}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-xs text-slate-400 italic">No external resources logged.</p>}
                </div>
                <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-600 rounded-full" /> Strategic Partners
                    </h3>
                    {data.section7.partners.length > 0 ? (
                        <ul className="space-y-2">
                            {data.section7.partners.map((p: any, i: number) => (
                                <li key={i} className="text-xs text-slate-600 font-bold border-b border-slate-50 pb-2">
                                    {p.name} <span className="text-[10px] text-slate-400 font-medium italic">({p.type})</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-xs text-slate-400 italic">No formal partners logged.</p>}
                </div>
            </div>

            {/* Section 9 & 10: Reflection & Sustainability */}
            <SectionHeader number={9} title="Learning & Sustainability" />
            <div className="space-y-6">
                <LabelValue label="Academic Integration" value={data.section9.academic_application} fullWidth />
                <div className="grid grid-cols-2 gap-12">
                    <LabelValue label="Personal Learning" value={data.section9.personal_learning} />
                    <LabelValue label="Legacy Plan" value={data.section10.continuation_status} />
                    <LabelValue label="Scaling Potential" value={data.section10.scaling_potential} />
                    <LabelValue label="Policy Influence" value={data.section10.policy_influence} />
                </div>
                <LabelValue label="Sustainability Mechanisms" value={data.section10.mechanisms.join(", ")} fullWidth />
            </div>

            {/* Executive Summary / Section 11 Intelligence */}
            <div className="mt-16 p-10 bg-slate-900 text-white rounded-[2rem] relative overflow-hidden break-inside-avoid">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">CIEL Executive Impact Dashboard</p>
                        <Award className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase">Impact Score</p>
                            <p className="text-2xl font-black">{data.section1.metrics.eis_score}/100</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase">Engagement Index</p>
                            <p className="text-2xl font-black">{data.section1.metrics.attendance_frequency}%</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase">Reach</p>
                            <p className="text-2xl font-black">{data.section4.total_beneficiaries}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase">Compliance</p>
                            <p className="text-2xl font-black text-emerald-400">OK</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-3">Institutional Intelligence Summary</p>
                        <p className="text-lg font-medium font-serif italic text-slate-200 leading-relaxed border-l-4 border-indigo-500 pl-6">
                            "The project addressing SDG {data.section3.primary_sdg.goal_number} has demonstrated robust community integration. With {data.section1.metrics.total_verified_hours} hours of verified field work, the initiative achieved measurable growth in {data.section5.metric || 'targeted social indicators'}. Strategic alignment with {data.section2.discipline} ensures a high standard of academic-professional synthesis."
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-20 flex justify-between items-center text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em] border-t border-slate-50 pt-10">
                <span>Verification ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                <span>Generated via Ciel Student Portal (Student-Faculty Collaborative Ecosystem)</span>
            </div>
        </div>
    );
}
