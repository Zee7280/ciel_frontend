import { useReportForm } from "../context/ReportContext";

interface Props {
    projectData: any;
    reportData?: any; // Added to support usage outside ReportProvider
}

export default function ReportPrintView({ projectData, reportData }: Props) {
    // Use prop if provided, otherwise fallback to context
    let data = reportData;
    try {
        const { data: contextData } = reportData ? { data: null } : useReportForm();
        if (!data) data = contextData;
    } catch (e) {
        // Ignored if useReportForm fails outside context
    }

    if (!data) return <div className="p-8 text-center text-slate-500">No report data available for preview.</div>;

    const SectionHeader = ({ title, number }: { title: string, number: number }) => (
        <h2 className="text-xl font-bold border-b-2 border-slate-800 pb-2 mb-4 mt-8 font-serif text-slate-800">
            {number}. {title}
        </h2>
    );

    const LabelValue = ({ label, value, fullWidth = false }: { label: string, value: any, fullWidth?: boolean }) => (
        <div className={`flex flex-col mb-4 ${fullWidth ? 'w-full' : 'w-1/2 pr-4'}`}>
            <span className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-1">{label}</span>
            <div className="text-sm text-slate-900 leading-relaxed text-justify">{value || "N/A"}</div>
        </div>
    );

    return (
        <div className="font-serif text-slate-900 max-w-4xl mx-auto">
            {/* Section 1: Participation */}
            <SectionHeader number={1} title="Participation Profile" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <div className="mb-4">
                    <span className="font-bold text-sm">Participation Type:</span> <span className="text-sm capitalize">{data.section1.participation_type}</span>
                </div>

                <h3 className="font-bold text-md mb-3 bg-slate-100 p-2">Team Lead / Individual</h3>
                <div className="flex flex-wrap mb-4">
                    <LabelValue label="Name" value={data.section1.team_lead.name} />
                    <LabelValue label="University" value={data.section1.team_lead.university} />
                    <LabelValue label="Degree" value={data.section1.team_lead.degree} />
                    <LabelValue label="Email" value={data.section1.team_lead.email} />
                </div>

                {data.section1.team_members.length > 0 && (
                    <>
                        <h3 className="font-bold text-md mb-3 bg-slate-100 p-2">Team Members</h3>
                        <table className="w-full text-sm border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="border p-2 text-left">Name</th>
                                    <th className="border p-2 text-left">CNIC</th>
                                    <th className="border p-2 text-left">Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.section1.team_members.map((m: any, i: number) => (
                                    <tr key={i}>
                                        <td className="border p-2">{m.name}</td>
                                        <td className="border p-2">{m.cnic}</td>
                                        <td className="border p-2">{m.role}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            {/* Section 2: Context */}
            <SectionHeader number={2} title="Project Context" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <div className="flex flex-wrap mb-4">
                    <LabelValue label="Project Title" value={projectData?.title} fullWidth />
                    <LabelValue label="Discipline" value={data.section2.discipline} />
                </div>
                <LabelValue label="Problem / Need Statement" value={data.section2.problem_statement} fullWidth />
            </div>

            {/* Section 3: SDG Mapping */}
            <SectionHeader number={3} title="SDG Mapping" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Primary SDG" value={data.section3.primary_sdg_explanation} fullWidth />
                {data.section3.secondary_sdgs.length > 0 && (
                    <div className="mt-4">
                        <h3 className="font-bold text-md mb-2">Secondary SDGs</h3>
                        <ul className="list-disc ml-5 text-sm">
                            {data.section3.secondary_sdgs.map((sdg: any, i: number) => (
                                <li key={i}>Goal {sdg.sdg_id}: {sdg.justification}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Section 4: Activities */}
            <SectionHeader number={4} title="Activities & Outputs" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <div className="flex flex-wrap">
                    <LabelValue label="Type" value={data.section4.activity_type} />
                    <LabelValue label="Total Beneficiaries" value={data.section4.total_beneficiaries} />
                    <LabelValue label="Total Sessions" value={data.section4.total_sessions} />
                    <LabelValue label="Duration" value={`${data.section4.duration_val} ${data.section4.duration_unit}`} />
                </div>
            </div>

            {/* Section 5: Outcomes */}
            <SectionHeader number={5} title="Outcomes" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Observed Change" value={data.section5.observed_change} fullWidth />
                <LabelValue label="Challenges" value={data.section5.challenges} fullWidth />
            </div>

            {/* Section 6: Resources */}
            <SectionHeader number={6} title="Resources" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Used External Resources" value={data.section6.use_resources} />
                {data.section6.resources.length > 0 && (
                    <table className="w-full text-sm border-collapse border border-slate-300 mt-2">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border p-2">Type</th>
                                <th className="border p-2">Amount</th>
                                <th className="border p-2">Source</th>
                                <th className="border p-2">Purpose</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.section6.resources.map((r: any, i: number) => (
                                <tr key={i}>
                                    <td className="border p-2">{r.type}</td>
                                    <td className="border p-2">{r.amount} {r.unit}</td>
                                    <td className="border p-2">{r.source}</td>
                                    <td className="border p-2">{r.purpose}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Section 7: Partnerships */}
            <SectionHeader number={7} title="Partnerships" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Has Partners" value={data.section7.has_partners} />
                {data.section7.partners.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {data.section7.partners.map((p: any, i: number) => (
                            <div key={i} className="text-sm border p-2 rounded">
                                <strong>{p.name}</strong> ({p.type}) - {p.contribution.join(", ")}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Section 8: Evidence */}
            <SectionHeader number={8} title="Evidence" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Description" value={data.section8.description} fullWidth />
                <LabelValue label="Evidence Types" value={data.section8.evidence_types.join(", ")} fullWidth />
                <LabelValue label="Partner Verification" value={data.section8.partner_verification ? "Yes" : "No"} />
            </div>

            {/* Section 9: Reflection */}
            <SectionHeader number={9} title="Reflection" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Academic Connection" value={data.section9.academic_application} fullWidth />
                <LabelValue label="Personal Growth" value={data.section9.personal_learning} fullWidth />
                <LabelValue label="Strongest Competency" value={data.section9.strongest_competency} />
            </div>

            {/* Section 10: Sustainability */}
            <SectionHeader number={10} title="Sustainability" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Continuation Status" value={data.section10.continuation_status} />
                <LabelValue label="Mechanisms" value={data.section10.mechanisms.join(", ")} fullWidth />
                <LabelValue label="Plan" value={data.section10.continuation_details} fullWidth />
            </div>

            <div className="text-center text-xs text-slate-400 mt-10">
                Generated via Ciel Student Portal
            </div>
        </div>
    );
}
