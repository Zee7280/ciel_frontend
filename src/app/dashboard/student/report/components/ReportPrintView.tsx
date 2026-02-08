import { useReportForm } from "../context/ReportContext";

interface Props {
    projectData: any;
}

export default function ReportPrintView({ projectData }: Props) {
    const { data } = useReportForm();

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
            {/* Section 1: Context */}
            <SectionHeader number={1} title="Project Context" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <div className="flex flex-wrap mb-4">
                    <LabelValue label="Project Title" value={projectData?.title} fullWidth />
                    <LabelValue label="Partner Organization" value={projectData?.organization?.name} />
                    <LabelValue label="Location" value={projectData?.location || "Remote"} />
                </div>
                <LabelValue label="Problem / Need Statement" value={data.section1.problem_statement} fullWidth />
            </div>

            {/* Section 2: Team */}
            <SectionHeader number={2} title="Team Information" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <div className="mb-4">
                    <span className="font-bold text-sm">Participation Type:</span> <span className="text-sm capitalize">{data.section2.participation_type}</span>
                </div>

                <h3 className="font-bold text-md mb-3 bg-slate-100 p-2">Team Lead</h3>
                <div className="flex flex-wrap mb-4">
                    <LabelValue label="Name" value={data.section2.team_lead.name} />
                    <LabelValue label="University" value={data.section2.team_lead.university} />
                    <LabelValue label="Degree" value={data.section2.team_lead.degree} />
                    <LabelValue label="Email" value={data.section2.team_lead.email} />
                </div>

                {data.section2.team_members.length > 0 && (
                    <>
                        <h3 className="font-bold text-md mb-3 bg-slate-100 p-2">Team Members</h3>
                        <table className="w-full text-sm border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="border p-2 text-left">Name</th>
                                    <th className="border p-2 text-left">CNIC</th>
                                    <th className="border p-2 text-left">Role</th>
                                    <th className="border p-2 text-left">Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.section2.team_members.map((m, i) => (
                                    <tr key={i}>
                                        <td className="border p-2">{m.name}</td>
                                        <td className="border p-2">{m.cnic}</td>
                                        <td className="border p-2">{m.role}</td>
                                        <td className="border p-2">{m.hours}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            {/* Section 3: SDG Mapping */}
            <SectionHeader number={3} title="SDG Mapping" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Primary SDG Explanation" value={data.section3.primary_sdg_explanation} fullWidth />

                {data.section3.secondary_sdgs.length > 0 && (
                    <div className="mt-4">
                        <h3 className="font-bold text-md mb-2">Secondary SDGs</h3>
                        <table className="w-full text-sm border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="border p-2 text-left w-20">SDG #</th>
                                    <th className="border p-2 text-left">Justification</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.section3.secondary_sdgs.map((sdg, i) => (
                                    <tr key={i}>
                                        <td className="border p-2 text-center">{sdg.sdg_id}</td>
                                        <td className="border p-2">{sdg.justification}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Section 4: Activities */}
            <SectionHeader number={4} title="Activities & Outputs" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Activity Description" value={data.section4.activity_description} fullWidth />

                <div className="flex flex-wrap mt-4">
                    <LabelValue label="Personal Funds Used" value={data.section4.personal_funds || "0"} />
                    <LabelValue label="Raised Funds" value={data.section4.raised_funds || "0"} />
                </div>
            </div>

            {/* Section 5: Outcomes */}
            <SectionHeader number={5} title="Outcomes" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Observed Change" value={data.section5.observed_change} fullWidth />

                <h3 className="font-bold text-md mb-2 mt-4">Metrics</h3>
                <table className="w-full text-sm border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="border p-2 text-left">Metric</th>
                            <th className="border p-2 text-left">Baseline</th>
                            <th className="border p-2 text-left">Endline</th>
                            <th className="border p-2 text-left">Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.section5.metrics.map((m, i) => (
                            <tr key={i}>
                                <td className="border p-2">{m.metric}</td>
                                <td className="border p-2">{m.baseline}</td>
                                <td className="border p-2">{m.endline}</td>
                                <td className="border p-2">{m.unit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Section 6: Resources */}
            <SectionHeader number={6} title="Resources" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Used External Resources" value={data.section6.used_resources} />
                {data.section6.resources.length > 0 && (
                    <table className="w-full text-sm border-collapse border border-slate-300 mt-2">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border p-2 text-left">Type</th>
                                <th className="border p-2 text-left">Amount</th>
                                <th className="border p-2 text-left">Source</th>
                                <th className="border p-2 text-left">Purpose</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.section6.resources.map((r, i) => (
                                <tr key={i}>
                                    <td className="border p-2">{r.type}</td>
                                    <td className="border p-2">{r.amount}</td>
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
                <LabelValue label="Has Partnerships" value={data.section7.has_partners} />
                {data.section7.partners.length > 0 && (
                    <table className="w-full text-sm border-collapse border border-slate-300 mt-2">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border p-2 text-left">Partner Name</th>
                                <th className="border p-2 text-left">Type</th>
                                <th className="border p-2 text-left">Role</th>
                                <th className="border p-2 text-left">Contribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.section7.partners.map((p, i) => (
                                <tr key={i}>
                                    <td className="border p-2">{p.name}</td>
                                    <td className="border p-2">{p.type}</td>
                                    <td className="border p-2">{p.role}</td>
                                    <td className="border p-2">{p.contribution}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Section 8: Evidence */}
            <SectionHeader number={8} title="Evidence" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Evidence Description" value={data.section8.description} fullWidth />
                <LabelValue label="Media Usage Consent" value={data.section8.media_usage} />
                <div className="mt-2 text-sm italic text-slate-500">
                    Files uploaded: {data.section8.evidence_files.length > 0 ? data.section8.evidence_files.length : "None"}
                </div>
            </div>

            {/* Section 10: Reflection */}
            <SectionHeader number={9} title="Reflection" />
            <div className="mb-6 border-b border-slate-200 pb-6">
                <LabelValue label="Personal Learning" value={data.section10.personal_learning} fullWidth />
                <LabelValue label="Sustainability Status" value={data.section10.sustainability_status} />
                <LabelValue label="Sustainability Plan" value={data.section10.sustainability_plan} fullWidth />
            </div>

            {/* Section 12: Declaration */}
            <SectionHeader number={10} title="Declaration" />
            <div className="mb-6 pb-6 text-sm">
                <p>
                    <span className="font-bold">Student Decleration:</span> {data.section12.student_declaration ? "Agreed" : "Pending"}
                </p>
                <p>
                    <span className="font-bold">Partner Verification:</span> {data.section12.partner_verification ? "Verified" : "Pending"}
                </p>
            </div>
        </div>
    );
}
