import type { ReactNode } from "react";
import { useReportForm } from "../context/ReportContext";
import type { ReportData } from "../context/ReportContext";
import { Award, CheckCircle, ShieldCheck } from "lucide-react";
import { calculateCII } from "../utils/calculateCII";
import { calculateEngagementMetrics } from "../utils/engagementMetrics";
import { deriveCertificateProjectDisplay } from "../utils/certificateDisplay";

interface Props {
    projectData: any;
    reportData?: any;
}

/** Section 6 stores `sources: string[]` (+ optional legacy `source`); print view must not render "undefined". */
function formatResourceSourcesLine(r: {
    sources?: string[];
    source_other?: string;
    source?: string;
}): string {
    const fromList = (r.sources || []).map((s) => String(s).trim()).filter(Boolean);
    const other = r.source_other?.trim();
    const merged =
        other && fromList.some((s) => s.toLowerCase().includes("other"))
            ? [...fromList.filter((s) => !s.toLowerCase().includes("other")), other]
            : fromList.length
              ? fromList
              : other
                ? [other]
                : [];
    if (merged.length) return merged.join(", ");
    const legacy = typeof r.source === "string" ? r.source.trim() : "";
    return legacy;
}

function normalizePrintAnswer(a: unknown): ReactNode {
    if (a === null || a === undefined) return null;
    if (typeof a === "number" && !Number.isNaN(a)) return a;
    if (typeof a === "string") {
        const t = a.trim();
        if (!t || t.toLowerCase() === "undefined") return null;
        return t;
    }
    return a as ReactNode;
}

export default function ReportPrintView({ projectData, reportData }: Props) {
    let data = reportData;
    try {
        const contextData = useReportForm().data;
        if (!data) data = contextData;
    } catch (e) {}

    if (!data) return <div className="p-8 text-center text-slate-500 italic">No report data available for preview.</div>;

    const teamSize =
        (data.section1?.participation_type === "team" ? data.section1?.team_members?.length || 0 : 0) + 1;
    const reqH = data.required_hours ?? 16;
    const engagementRecalc = calculateEngagementMetrics(
        data.section1?.attendance_logs || [],
        reqH,
        teamSize,
        data.section1?.team_lead,
    );

    const storedVerified = Number(data.section1?.metrics?.total_verified_hours);
    const verifiedHours =
        Number.isFinite(storedVerified) && storedVerified > 0
            ? Math.round(storedVerified)
            : engagementRecalc.total_verified_hours > 0
              ? Math.round(engagementRecalc.total_verified_hours)
              : Math.round(
                    (parseFloat(String(data.section1?.team_lead?.hours ?? "")) || 0) +
                        (data.section1?.team_members?.reduce(
                            (sum: number, m: ReportData["section1"]["team_members"][number]) =>
                                sum + (parseFloat(String(m.hours ?? "")) || 0),
                            0,
                        ) || 0),
                );

    const mBase = data.section1?.metrics;
    const engagementSpanForPrint =
        mBase?.engagement_span && mBase.engagement_span > 0
            ? mBase.engagement_span
            : engagementRecalc.engagement_span > 0
              ? engagementRecalc.engagement_span
              : 0;

    const reportForCii: ReportData = {
        ...data,
        section1: {
            ...data.section1,
            metrics: {
                ...(mBase || {
                    total_verified_hours: 0,
                    total_active_days: 0,
                    engagement_span: 0,
                    attendance_frequency: 0,
                    weekly_continuity: 0,
                    eis_score: 0,
                    engagement_category: "",
                    hec_compliance: "below",
                }),
                total_verified_hours: verifiedHours,
                total_active_days: mBase?.total_active_days || engagementRecalc.total_active_days,
                engagement_span: engagementSpanForPrint,
                attendance_frequency: mBase?.attendance_frequency || engagementRecalc.attendance_frequency,
                weekly_continuity: mBase?.weekly_continuity || engagementRecalc.weekly_continuity,
                eis_score: mBase?.eis_score || engagementRecalc.eis_score,
                engagement_category: mBase?.engagement_category || engagementRecalc.engagement_category,
                hec_compliance: mBase?.hec_compliance || engagementRecalc.hec_compliance,
            },
        },
    };

    const ciiResult = calculateCII({ ...reportForCii, required_hours: reqH });
    const { totalScore, level, breakdown } = ciiResult;

    const blocks = data.section4?.activity_blocks || [];
    const sessionsFromBlocks = blocks.reduce(
        (acc: number, b: { sessions_count?: string }) => acc + (parseInt(String(b.sessions_count), 10) || 0),
        0,
    );
    const explicitTotal = (data.section4 as { total_sessions?: number | string })?.total_sessions;
    const parsedExplicit =
        explicitTotal !== undefined && explicitTotal !== null && String(explicitTotal).trim() !== ""
            ? parseInt(String(explicitTotal), 10)
            : NaN;
    const totalSessionsDisplay = Number.isFinite(parsedExplicit) && parsedExplicit > 0
        ? parsedExplicit
        : sessionsFromBlocks > 0
          ? sessionsFromBlocks
          : blocks.length;

    const s4 = data.section4 as ReportData["section4"] & { activity_description?: string };
    const activityDescriptionCombined =
        (s4.activity_description && String(s4.activity_description).trim()) ||
        (s4.project_summary?.project_implementation_explanation &&
            String(s4.project_summary.project_implementation_explanation).trim()) ||
        blocks
            .map((b: { description?: string }) => (b.description || "").trim())
            .filter(Boolean)
            .join("\n\n") ||
        "";

    const calculateMetrics = () => {
        const metrics = {
            total_verified_hours: verifiedHours,
            eis_score: totalScore,
            attendance_frequency: reportForCii.section1?.metrics?.attendance_frequency || 0,
            total_beneficiaries: data.section4?.project_summary?.distinct_total_beneficiaries || 0,
            engagement_span: engagementSpanForPrint,
        };
        return metrics;
    };

    const metrics = calculateMetrics();

    const dossierProjectHeadline = deriveCertificateProjectDisplay({
        ...(data as ReportData),
        project_title:
            (data as ReportData).project_title ||
            (typeof projectData?.title === "string" ? projectData.title : "") ||
            "",
    }).headline;
    const teamMembers = data.section1.team_members || [];

    const SectionHeader = ({ title, number, question }: { title: string; number: number; question?: string }) => (
        <div className="dossier-section-header mt-14 mb-8 first:mt-0 border-b-2 border-slate-900 pb-4 break-inside-avoid">
            <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white shadow-md">
                    {number}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                    <h2 className="report-h3 text-xl font-black tracking-tight text-slate-900 sm:!text-2xl">{title}</h2>
                    {question ? (
                        <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-slate-500">
                            {question}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );

    const QandA = ({ q, a, fullWidth = false }: { q: string; a: any; fullWidth?: boolean }) => {
        const normalized = normalizePrintAnswer(a);
        const showPending =
            normalized === null ||
            normalized === undefined ||
            (typeof normalized === "string" && normalized.trim() === "");
        return (
            <div
                className={`dossier-qa flex min-h-0 flex-col ${fullWidth ? "md:col-span-2" : ""} break-inside-avoid`}
            >
                <span className="mb-2 text-[9px] font-black uppercase leading-relaxed tracking-[0.2em] text-slate-400">
                    {q}
                </span>
                <div className="flex min-h-[4.5rem] flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 shadow-sm">
                    <div
                        className={`text-[13px] font-semibold leading-relaxed text-slate-900 ${fullWidth ? "text-left sm:text-justify" : ""}`}
                    >
                        {showPending ? (
                            <span className="font-medium italic text-slate-400">Pending verification / not provided</span>
                        ) : (
                            normalized
                        )}
                    </div>
                </div>
            </div>
        );
    };

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
        <div className="dossier-root group relative mx-auto max-w-4xl bg-white px-4 py-6 font-sans text-slate-900 sm:px-8 sm:py-10 print:max-w-none print:p-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 1cm; size: A4; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-container { width: 100% !important; margin: 0 !important; padding: 0 0.5cm !important; box-sizing: border-box; }
                    .break-inside-avoid { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .bg-slate-900 { background-color: #0f172a !important; }
                    .bg-slate-50 { background-color: #f8fafc !important; }
                    .text-slate-900 { color: #0f172a !important; }
                    .text-slate-400 { color: #94a3b8 !important; }
                    .text-slate-500 { color: #64748b !important; }
                    .border-slate-900 { border-color: #0f172a !important; }
                    .border-slate-200 { border-color: #e2e8f0 !important; }
                }
            `}} />

            <div className="print-container bg-white">
                {/* Header — aligned with certificate tone */}
                <header className="mb-12 flex flex-col gap-10 border-b-8 border-slate-900 pb-10 sm:flex-row sm:items-start sm:justify-between sm:gap-8 print:mb-8 print:pb-8">
                    <div className="flex min-w-0 flex-1 flex-col gap-6 sm:max-w-[55%]">
                        <img
                            src="/iel-pk-logo.png"
                            alt="IEL PK"
                            className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14 print:h-12 print:w-12"
                            width={256}
                            height={256}
                        />
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <span className="h-[3px] w-10 shrink-0 bg-slate-900 print:w-8" />
                                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-900 sm:text-[11px] sm:tracking-[0.45em]">
                                    Verified impact record
                                </span>
                            </div>
                            <h1 className="mb-1 text-4xl font-black uppercase leading-[0.9] tracking-tighter text-slate-900 sm:text-5xl print:text-4xl">
                                Student dossier
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                Institutional documentation
                            </p>
                        </div>
                    </div>
                    <div className="flex w-full shrink-0 flex-col items-stretch gap-4 border-t border-slate-200 pt-8 text-left sm:w-[min(100%,20rem)] sm:border-t-0 sm:pt-10 sm:text-right print:w-64 print:items-end print:border-t-0 print:pt-4">
                        <p
                            className="text-lg font-black uppercase leading-snug tracking-tight text-slate-900 sm:text-xl print:text-base"
                            title={dossierProjectHeadline}
                        >
                            {dossierProjectHeadline}
                        </p>
                        <div className="inline-flex items-center justify-center gap-2 self-stretch rounded-xl bg-slate-900 px-4 py-2.5 text-white sm:self-end print:self-end">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Dossier ID</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {data.project_id?.split("-")[0] || "CIEL"}—{new Date().getFullYear()}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Section 1: Participation Profile */}
                <SectionHeader
                    number={1}
                    title="Participation profile"
                    question="Who participated in the project and what are their institutional credentials?"
                />
                <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                    <QandA q="Participation structure" a={data.section1.participation_type === "team" ? "Team-based initiative" : "Individual project"} />
                    <QandA q="Lead author / coordinator" a={data.section1.team_lead.name} />
                    <QandA q="Host institution / university" a={data.section1.team_lead.university} />
                    <QandA q="Verified total engagement" a={`${metrics.total_verified_hours} hours verified`} />
                </div>

                {teamMembers.length > 0 && (
                    <div className="mb-12 mt-4 break-inside-avoid">
                        <span className="mb-3 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Team composition
                        </span>
                        <table className="w-full border-collapse overflow-hidden rounded-xl border border-slate-200 text-xs">
                            <thead>
                                <tr className="bg-slate-900 text-[9px] font-black uppercase tracking-widest text-white">
                                    <th className="w-[45%] px-4 py-3 text-left align-middle">Full name</th>
                                    <th className="px-4 py-3 text-left align-middle">Capacity / role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {teamMembers.map((m: ReportData["section1"]["team_members"][number], i: number) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3 align-top font-bold text-slate-900">{m.fullName?.trim() || m.name}</td>
                                        <td className="px-4 py-3 align-top text-[10px] font-bold uppercase tracking-tight text-slate-600">
                                            {m.role}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Section 2: Project Context */}
                <SectionHeader
                    number={2}
                    title="Project context"
                    question="What specific problem was addressed and how did it relate to your academic discipline?"
                />
                <div className="grid grid-cols-1 gap-6">
                    <QandA q="Core problem statement" a={data.section2.problem_statement} fullWidth />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
                        <QandA q="Academic discipline" a={data.section2.discipline} />
                        <QandA q="Disciplinary contribution" a={data.section2.discipline_contribution} />
                    </div>
                </div>

                {/* Section 3: SDG Impact */}
                <SectionHeader
                    number={3}
                    title="SDG impact mapping"
                    question="Which United Nations Sustainable Development Goals (SDGs) were prioritized by this project?"
                />
                <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 md:gap-x-10">
                    <div className="flex min-h-[8rem] items-center gap-6 rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
                        <div className="text-5xl font-black tabular-nums opacity-40">
                            {(() => {
                                const gn = data.section3.primary_sdg?.goal_number;
                                if (gn === null || gn === undefined || String(gn).trim() === "") return "—";
                                const num = Number(gn);
                                if (Number.isFinite(num) && num >= 1 && num <= 9) return `0${num}`;
                                if (Number.isFinite(num) && num >= 10) return String(num);
                                return String(gn);
                            })()}
                        </div>
                        <div className="min-w-0 space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/60">Primary goal</p>
                            <p className="text-sm font-black uppercase leading-snug">
                                {data.section3.primary_sdg?.goal_title || "—"}
                            </p>
                        </div>
                    </div>
                    <QandA
                        q="Target & indicator mapping"
                        a={`${data.section3.primary_sdg?.target_id || "T/A"} — ${data.section3.primary_sdg?.indicator_id || "I/A"}`}
                    />
                </div>

                {/* Section 4: Operational Metrics */}
                <SectionHeader
                    number={4}
                    title="Operational metrics"
                    question="What were the measurable outputs and beneficiary reach of the project?"
                />
                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                    {[
                        { label: "Verified hours", value: metrics.total_verified_hours, suffix: "hrs" },
                        { label: "Total reach", value: metrics.total_beneficiaries, suffix: "pax" },
                        { label: "Sessions", value: totalSessionsDisplay, suffix: "" },
                        { label: "Impact span", value: metrics.engagement_span, suffix: "days" },
                    ].map((cell) => (
                        <div
                            key={cell.label}
                            className="flex min-h-[6.5rem] flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-4 text-center shadow-sm"
                        >
                            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">{cell.label}</p>
                            <p className="report-h3 text-2xl font-black tabular-nums text-slate-900">
                                {cell.value}
                                {cell.suffix ? (
                                    <span className="ml-1 text-[10px] font-bold uppercase tracking-tight text-slate-500">{cell.suffix}</span>
                                ) : null}
                            </p>
                        </div>
                    ))}
                </div>
                <QandA q="Comprehensive activity description" a={activityDescriptionCombined} fullWidth />

                {/* Section 5: Measurable Outcomes */}
                <SectionHeader
                    number={5}
                    title="Systemic outcomes"
                    question="What specific measurable changes were observed at the end of the project?"
                />
                <div className="space-y-6">
                    {data.section5.measurable_outcomes?.map((outcome: any, i: number) => (
                        <div
                            key={i}
                            className="grid grid-cols-1 gap-8 rounded-2xl border border-slate-200 bg-slate-50/90 p-6 shadow-sm md:grid-cols-2 md:gap-10 md:p-8 break-inside-avoid"
                        >
                            <div className="min-w-0">
                                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Outcome {i + 1}
                                </p>
                                <p className="mb-6 text-lg font-black leading-snug text-slate-900 underline decoration-slate-200 decoration-2 underline-offset-4 sm:text-xl">
                                    {outcome.metric}
                                </p>
                                <div className="flex flex-wrap items-center justify-start gap-6 sm:gap-10">
                                    <div className="flex flex-col items-center">
                                        <span className="mb-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
                                            Baseline
                                        </span>
                                        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center font-black tabular-nums text-slate-600">
                                            {outcome.baseline} {outcome.unit}
                                        </div>
                                    </div>
                                    <div className="mt-6 hidden h-0.5 w-8 shrink-0 bg-slate-200 sm:block" aria-hidden />
                                    <div className="flex flex-col items-center">
                                        <span className="mb-2 text-[8px] font-black uppercase tracking-widest text-slate-900">
                                            Achieved
                                        </span>
                                        <div className="rounded-2xl bg-slate-900 px-5 py-3 text-center font-black tabular-nums text-white shadow-md">
                                            {outcome.endline} {outcome.unit}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <QandA q="Impact dimension" a={outcome.outcome_area} />
                        </div>
                    ))}
                    <QandA q="Core implementation challenges" a={data.section5.challenges} fullWidth />
                </div>

                {/* Section 6: Resources */}
                <SectionHeader
                    number={6}
                    title="Resource utilization"
                    question="What resources were deployed and how were they sourced?"
                />
                {data.section6.resources?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
                        {data.section6.resources.map((r: any, i: number) => (
                            <QandA
                                key={i}
                                q={`Resource ${i + 1}: ${r.type}?`}
                                a={(() => {
                                    const src = formatResourceSourcesLine(r);
                                    const countPart = `Count: ${r.amount ?? "—"} ${r.unit || ""}`.trim();
                                    return src ? `${countPart} | Source: ${src}` : countPart;
                                })()}
                            />
                        ))}
                    </div>
                ) : (
                    <QandA
                        q="External resources used"
                        a="No external financial or physical resources were reported for this project."
                        fullWidth
                    />
                )}

                {/* Section 7: Strategic Partnerships */}
                <SectionHeader
                    number={7}
                    title="Strategic partnerships"
                    question="Which organizations or partners collaborated in the project?"
                />
                {data.section7.partners?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
                        {data.section7.partners.map((p: any, i: number) => (
                            <QandA key={i} q={`Partner ${i + 1}`} a={`${p.name} (${p.type} organization)`} />
                        ))}
                    </div>
                ) : (
                    <QandA
                        q="Formal partnerships established"
                        a="Sustainable impact was achieved through student-led initiative without formal external organizational partnering."
                        fullWidth
                    />
                )}

                {/* Section 8: Evidence & Ethics */}
                <SectionHeader
                    number={8}
                    title="Evidence & ethics"
                    question="What evidence was captured and how were ethical standards maintained?"
                />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
                    <QandA q="Primary evidence types" a={data.section8.evidence_types?.join(", ")} />
                    <QandA
                        q="Ethical declaration compliance"
                        a={
                            Object.entries(data.section8.ethical_compliance || {})
                                .filter(([_, v]) => v)
                                .map(([k]) => k.replace(/_/g, " "))
                                .join(", ") || "Global ethical compliance adhered"
                        }
                    />
                </div>

                {/* Section 9: Reflection */}
                <SectionHeader
                    number={9}
                    title="Reflection & synthesis"
                    question="How has this project influenced your professional growth and academic understanding?"
                />
                <div className="space-y-6">
                    <QandA q="Academic–professional synthesis" a={data.section9.academic_application} fullWidth />
                    <QandA q="Personal narrative & identity growth" a={data.section9.personal_learning} fullWidth />
                </div>

                {/* Section 10: Sustainability */}
                <SectionHeader
                    number={10}
                    title="Sustainability & roadmap"
                    question="How will the impact of this project be sustained after your involvement concludes?"
                />
                <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
                    <QandA q="Continuation strategy status" a={data.section10.continuation_status} />
                    <QandA q="Scaling potential" a={data.section10.scaling_potential} />
                </div>
                <QandA q="Detailed roadmap for future continuity" a={data.section10.continuation_details} fullWidth />

                {/* Section 11: Impact Intelligence breakdown */}
                <SectionHeader
                    number={11}
                    title="Impact intelligence analysis"
                    question="What is the detailed breakdown of the CII index score performance?"
                />
                <div className="mb-12 break-inside-avoid">
                    <table className="w-full border-collapse overflow-hidden rounded-xl border border-slate-200 text-xs">
                        <thead>
                            <tr className="bg-slate-900 text-[9px] font-black uppercase tracking-widest text-white">
                                <th className="w-[44%] px-4 py-3 text-left align-middle">Score category</th>
                                <th className="px-3 py-3 text-center align-middle">Weight</th>
                                <th className="px-3 py-3 text-center align-middle">Max</th>
                                <th className="w-[5.5rem] px-4 py-3 text-right align-middle">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {scoreTableItems.map((item, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3 align-middle font-bold text-slate-900">{item.label}</td>
                                    <td className="px-3 py-3 text-center align-middle text-[10px] font-bold uppercase tracking-tight text-slate-500">
                                        {item.weight}
                                    </td>
                                    <td className="px-3 py-3 text-center align-middle font-bold tabular-nums text-slate-500">{item.max}</td>
                                    <td className="px-4 py-3 text-right align-middle">
                                        <span className="inline-flex min-w-[2.75rem] justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black tabular-nums text-slate-900">
                                            {item.score}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                                <td
                                    colSpan={3}
                                    className="px-4 py-3 text-right align-middle text-[10px] font-black uppercase tracking-widest text-slate-900"
                                >
                                    Aggregated CII index score
                                </td>
                                <td className="px-4 py-3 text-right align-middle">
                                    <span className="inline-flex min-w-[2.75rem] justify-center rounded-lg bg-slate-900 px-2 py-2 text-xs font-black tabular-nums text-white shadow-md">
                                        {totalScore}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="mt-6 flex flex-col gap-6 rounded-2xl bg-slate-900 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 sm:h-16 sm:w-16">
                                <ShieldCheck className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">Engagement status</p>
                                <p className="text-lg font-black uppercase tracking-tight sm:text-xl">{level}</p>
                            </div>
                        </div>
                        <div className="text-left sm:max-w-xs sm:text-right">
                            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/50">CII calculation matrix</p>
                            <p className="text-[10px] font-semibold leading-relaxed text-white/65">
                                CIEL institutional protocol — verified impact scoring
                            </p>
                        </div>
                    </div>
                </div>

                {/* Institutional Impact Summary */}
                <div className="relative mt-16 overflow-hidden break-inside-avoid rounded-3xl border-4 border-slate-900 bg-slate-50 p-8 sm:mt-20 sm:rounded-[2.5rem] sm:p-12 md:p-14">
                    <div className="relative z-10">
                        <div className="mb-10 flex flex-col gap-6 border-b-2 border-slate-200 pb-8 sm:flex-row sm:items-center sm:justify-between sm:pb-10">
                            <div>
                                <p className="mb-2 block text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                                    CIEL impact protocol
                                </p>
                                <h2 className="report-h2 text-2xl sm:text-3xl">Intelligence dashboard</h2>
                            </div>
                            <Award className="mx-auto h-16 w-16 shrink-0 text-slate-900 opacity-10 sm:mx-0 sm:h-20 sm:w-20" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
                            <div className="flex min-h-[7rem] flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Impact score</p>
                                <p className="text-4xl font-black tabular-nums text-slate-900 lg:text-5xl">
                                    {totalScore}
                                    <span className="ml-1 text-xs font-bold text-slate-400">/100</span>
                                </p>
                            </div>
                            <div className="flex min-h-[7rem] flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Hours logged</p>
                                <p className="text-4xl font-black tabular-nums text-slate-900 lg:text-5xl">{metrics.total_verified_hours}</p>
                            </div>
                            <div className="flex min-h-[7rem] flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Strategic SDG</p>
                                <p className="text-4xl font-black tabular-nums text-slate-900 lg:text-5xl">
                                    {(() => {
                                        const gn = data.section3.primary_sdg?.goal_number;
                                        if (gn === null || gn === undefined || String(gn).trim() === "") return "—";
                                        const num = Number(gn);
                                        if (Number.isFinite(num) && num >= 1 && num <= 9) return `0${num}`;
                                        if (Number.isFinite(num) && num >= 10) return String(num);
                                        return String(gn);
                                    })()}
                                </p>
                            </div>
                            <div className="flex min-h-[7rem] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                                <CheckCircle className="mb-2 h-10 w-10 text-slate-900 opacity-20 sm:h-12 sm:w-12" />
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-900">Verified</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Signing Area */}
                <footer className="mb-10 mt-16 flex flex-col items-stretch justify-between gap-10 border-t-4 border-slate-100 pt-10 sm:flex-row sm:items-end sm:gap-6 print:mb-6 print:mt-10 print:pt-6">
                    <div className="space-y-4">
                        <div className="h-0.5 w-48 max-w-full bg-slate-900 print:w-40" />
                        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">
                            Student signature / attestation
                        </p>
                    </div>
                    <div className="text-left sm:text-right">
                        <img
                            src="/iel-pk-logo.png"
                            alt=""
                            className="mb-3 h-7 w-7 shrink-0 object-contain opacity-25 grayscale sm:ml-auto print:h-6 print:w-6"
                            width={256}
                            height={256}
                            aria-hidden
                        />
                        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-300">
                            CIEL digital protocol — © {new Date().getFullYear()}
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}
