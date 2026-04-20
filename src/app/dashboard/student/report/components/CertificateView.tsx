import React, { useMemo } from "react";
import { useReportForm } from "../context/ReportContext";
import type { ReportData } from "../context/ReportContext";
import { formatDisplayId } from "@/utils/displayIds";
import { Award, ShieldCheck, Globe } from "lucide-react";
import { calculateCII } from "../utils/calculateCII";
import { calculateEngagementMetrics } from "../utils/engagementMetrics";
import { deriveCertificateProjectDisplay } from "../utils/certificateDisplay";
import { findSdgById } from "@/utils/sdgData";

function parsePrimarySdgGoal(section3: ReportData["section3"]): string | number | null {
    const raw = section3?.primary_sdg as Record<string, unknown> | undefined;
    if (!raw) return null;
    const n =
        raw.goal_number ??
        raw.goalNumber ??
        raw.sdg_id ??
        raw.goal ??
        raw.sdgId;
    if (n === null || n === undefined || n === "") return null;
    return n as string | number;
}

type TeamMember = ReportData["section1"]["team_members"][number];

type LeadShape = ReportData["section1"]["team_lead"];

function displayPersonName(p: { fullName?: string; name?: string }): string {
    return (p.fullName || p.name || "").trim();
}

function normalizeNameKey(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function digitsOnly(s: string): string {
    return String(s || "").replace(/\D/g, "");
}

/** Treat as same participant if CNIC, mobile, or normalized full name matches (stops duplicate rows on CII). */
function isSameReportParticipant(a: LeadShape | TeamMember, b: LeadShape | TeamMember): boolean {
    const ac = digitsOnly("cnic" in a ? a.cnic : "");
    const bc = digitsOnly("cnic" in b ? b.cnic : "");
    if (ac.length >= 5 && bc.length >= 5 && ac === bc) return true;
    const am = digitsOnly("mobile" in a ? a.mobile : "");
    const bm = digitsOnly("mobile" in b ? b.mobile : "");
    if (am.length >= 7 && bm.length >= 7 && am === bm) return true;
    const an = normalizeNameKey(displayPersonName(a));
    const bn = normalizeNameKey(displayPersonName(b));
    if (an.length >= 2 && bn.length >= 2 && an === bn) return true;
    return false;
}

export default function CertificateView() {
    const { data } = useReportForm();
    const { section1, section2, section3 } = data;

    const { headline: certificateHeadline, contextLine: certificateContext } = useMemo(
        () => deriveCertificateProjectDisplay(data),
        [data],
    );

    const recipientBlocks = useMemo(() => {
        const lead = section1.team_lead;
        const leadName = displayPersonName(lead) || "Distinguished Participant";
        const leadLabel =
            section1.participation_type === "team" ? "Team lead" : "Participant";

        if (section1.participation_type !== "team" || !section1.team_members?.length) {
            return [{ key: "lead", name: leadName, label: leadLabel }];
        }

        const seen: (LeadShape | TeamMember)[] = [lead];
        const rows: { key: string; name: string; label: string }[] = [
            { key: "lead", name: leadName, label: leadLabel },
        ];

        section1.team_members.forEach((m: TeamMember, i: number) => {
            if (seen.some((s) => isSameReportParticipant(m, s))) return;
            seen.push(m);
            rows.push({
                key: m.id || `m-${i}`,
                name: displayPersonName(m) || "Team member",
                label: (m.role || "Team member").trim(),
            });
        });

        return rows;
    }, [section1.participation_type, section1.team_lead, section1.team_members]);

    const institutionLine = useMemo(() => {
        const uni = section1.team_lead.university?.trim();
        const degree = section1.team_lead.degree?.trim();
        const discipline = section2.discipline?.trim();
        const parts: string[] = [];
        if (uni) parts.push(uni);
        const program = [degree, discipline && degree !== discipline ? discipline : ""].filter(Boolean).join(" · ");
        return { primary: parts.join(" "), secondary: program };
    }, [section1.team_lead.university, section1.team_lead.degree, section2.discipline]);

    const sdgGoalDisplay = useMemo(() => {
        const n = parsePrimarySdgGoal(section3);
        if (n === null || n === undefined || String(n).trim() === "") return "—";
        return String(n).trim();
    }, [section3]);

    const sdgTitleLine = useMemo(() => {
        const custom = section3.primary_sdg?.goal_title?.trim();
        if (custom) return custom;
        const sdg = findSdgById(parsePrimarySdgGoal(section3));
        return sdg?.title || "";
    }, [section3]);

    const engagementRecalc = useMemo(() => {
        const teamSize = (section1.participation_type === "team" ? section1.team_members.length : 0) + 1;
        const req = data.required_hours || 16;
        return calculateEngagementMetrics(section1.attendance_logs || [], req, teamSize, section1.team_lead);
    }, [
        section1.attendance_logs,
        section1.participation_type,
        section1.team_members,
        section1.team_lead,
        data.required_hours,
    ]);

    const verifiedHours = useMemo(() => {
        const stored = Number(section1.metrics?.total_verified_hours);
        if (Number.isFinite(stored) && stored > 0) {
            return Math.round(stored);
        }
        const fromLogs = engagementRecalc.total_verified_hours;
        if (fromLogs > 0) {
            return Math.round(fromLogs);
        }
        const leadH = parseFloat(String(section1.team_lead?.hours ?? "")) || 0;
        const membersH =
            section1.team_members?.reduce(
                (sum: number, m: TeamMember) => sum + (parseFloat(String(m.hours ?? "")) || 0),
                0,
            ) || 0;
        return Math.round(leadH + membersH);
    }, [section1.metrics?.total_verified_hours, section1.team_lead?.hours, section1.team_members, engagementRecalc.total_verified_hours]);

    const engagementSpanDays = useMemo(() => {
        const stored = Number(section1.metrics?.engagement_span);
        if (Number.isFinite(stored) && stored > 0) return Math.round(stored);
        const r = engagementRecalc.engagement_span;
        return r > 0 ? Math.round(r) : 0;
    }, [section1.metrics?.engagement_span, engagementRecalc.engagement_span]);

    const reportForCii = useMemo((): ReportData => {
        const m = section1.metrics;
        return {
            ...data,
            section1: {
                ...section1,
                metrics: {
                    ...m,
                    total_verified_hours: verifiedHours,
                    total_active_days: m?.total_active_days || engagementRecalc.total_active_days,
                    engagement_span: engagementSpanDays || m?.engagement_span || engagementRecalc.engagement_span,
                    attendance_frequency: m?.attendance_frequency || engagementRecalc.attendance_frequency,
                    weekly_continuity: m?.weekly_continuity || engagementRecalc.weekly_continuity,
                    eis_score: m?.eis_score || engagementRecalc.eis_score,
                    engagement_category: m?.engagement_category || engagementRecalc.engagement_category,
                    hec_compliance: m?.hec_compliance || engagementRecalc.hec_compliance,
                },
            },
        };
    }, [data, section1, verifiedHours, engagementSpanDays, engagementRecalc]);

    const ciiScore = useMemo(() => {
        const stored = section1.metrics?.eis_score;
        if (typeof stored === "number" && !Number.isNaN(stored) && stored > 0) {
            return Math.min(100, Math.max(0, Math.round(stored)));
        }
        return Math.min(100, Math.max(0, Math.round(calculateCII(reportForCii).totalScore)));
    }, [reportForCii, section1.metrics?.eis_score]);

    const today = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="certificate-one-page bg-white min-h-[800px] w-full max-w-5xl mx-auto p-16 relative border-[12px] border-slate-900 shadow-2xl flex flex-col items-center text-center overflow-x-hidden overflow-y-visible break-inside-avoid print:min-h-0 print:h-auto print:max-h-none print:overflow-visible print:break-inside-avoid print:shadow-none print:m-0 print:max-w-none print:w-full print:px-5 print:py-3 print:border-[6px]">
            <div className="absolute top-0 left-0 w-64 h-64 bg-slate-900/5 -ml-32 -mt-32 rounded-full print:hidden" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-900/5 -mr-48 -mb-48 rounded-full print:hidden" />

            <div className="w-full flex justify-between items-start mb-12 pt-4 print:mb-4 print:pt-0">
                <img src="/iel-pk-logo.png" alt="IEL PK" className="h-14 w-14 shrink-0 object-contain print:h-9 print:w-9" width={256} height={256} />
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-slate-900" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Verified impact</span>
                    </div>
                    <div className="text-[9px] font-bold text-slate-400">
                        ID: {data.project_id ? formatDisplayId(data.project_id, "OPP") : "CIEL-REF-PENDING"}
                    </div>
                </div>
            </div>

            <div className="space-y-3 mb-8 print:mb-3 print:space-y-1">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-900 text-white rounded-full print:gap-2 print:px-3 print:py-1">
                    <Award className="w-5 h-5 print:w-3.5 print:h-3.5" />
                    <span className="text-xs font-black uppercase tracking-[0.35em] print:text-[8px] print:tracking-[0.2em]">
                        Honorary recognition
                    </span>
                </div>

                <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-tight print:text-3xl print:leading-tight">
                    Certificate of <br />
                    <span className="opacity-30">Institutional impact</span>
                </h1>
            </div>

            <div className="w-full max-w-3xl space-y-5 mb-10 print:mb-5 print:space-y-3">
                <p className="text-base font-medium text-slate-500 italic print:text-xs print:leading-snug">
                    This official recognition is presented to
                </p>

                <div className="border-b-2 border-slate-200 pb-5 print:pb-3">
                    <div className="flex flex-col gap-2.5 print:gap-1.5">
                        {recipientBlocks.map((row) => (
                            <div
                                key={row.key}
                                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-center sm:gap-3 gap-0.5"
                            >
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight print:text-xl break-words">
                                    {row.name}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 print:text-[8px]">
                                    {row.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {(institutionLine.primary || institutionLine.secondary) && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 print:px-3 print:py-2">
                        {institutionLine.primary ? (
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 print:text-[10px]">
                                {institutionLine.primary}
                            </p>
                        ) : null}
                        {institutionLine.secondary ? (
                            <p className="text-[11px] font-semibold text-slate-600 mt-1.5 leading-snug print:text-[9px] print:mt-1">
                                {institutionLine.secondary}
                            </p>
                        ) : null}
                    </div>
                )}

                <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-2xl mx-auto print:text-[11px] print:leading-snug">
                    for verified delivery of the institutional impact project
                </p>
                <div className="max-w-2xl mx-auto space-y-2">
                    <p
                        className="text-lg sm:text-xl font-black text-slate-900 leading-snug tracking-tight print:text-sm print:leading-tight"
                        title={certificateHeadline}
                    >
                        &ldquo;{certificateHeadline}&rdquo;
                    </p>
                    {certificateContext ? (
                        <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed text-center print:text-[9px]">
                            {certificateContext}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 w-full max-w-4xl mb-16 print:mb-6 print:gap-4 print:max-w-full">
                <div className="space-y-2 print:space-y-0.5 sm:border-r sm:border-slate-100 sm:pr-4">
                    <div className="flex justify-center mb-2 print:mb-1">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 print:h-8 print:w-8">
                            <Clock className="w-5 h-5 print:w-4 print:h-4" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 print:text-[8px]">
                        Verified hours
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 print:text-lg">
                        <span className="whitespace-nowrap">{verifiedHours}</span>
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight print:text-[8px]">
                        Engagement span
                    </p>
                    <p className="text-sm font-black text-slate-700 print:text-xs">
                        {engagementSpanDays > 0 ? (
                            <span>{engagementSpanDays} calendar days</span>
                        ) : (
                            <span className="text-slate-400 font-semibold">Log dates to show span</span>
                        )}
                    </p>
                </div>

                <div className="space-y-2 border-y border-slate-100 py-8 sm:py-0 sm:border-y-0 sm:border-x sm:px-4 print:space-y-0.5 print:border-y-0 print:py-0 print:px-2">
                    <div className="flex justify-center mb-2 print:mb-1">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 print:h-8 print:w-8">
                            <Globe className="w-5 h-5 print:w-4 print:h-4" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 print:text-[8px]">
                        Primary SDG
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 print:text-base">
                        Goal <span className="whitespace-nowrap">{sdgGoalDisplay}</span>
                    </p>
                    {sdgTitleLine ? (
                        <p className="text-[11px] font-semibold text-slate-600 leading-snug max-w-[14rem] mx-auto print:text-[9px] print:max-w-[11rem]">
                            {sdgTitleLine}
                        </p>
                    ) : null}
                </div>

                <div className="space-y-2 print:space-y-0.5 sm:pl-4">
                    <div className="flex justify-center mb-2 print:mb-1">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 print:h-8 print:w-8">
                            <Award className="w-5 h-5 print:w-4 print:h-4" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 print:text-[8px]">
                        CII index score
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 print:text-lg">
                        <span className="whitespace-nowrap">{ciiScore}/100</span>
                        <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1 print:text-[8px]">
                            Rating
                        </span>
                    </p>
                </div>
            </div>

            <div className="w-full flex justify-between items-end mt-auto pt-8 print:mt-2 print:flex-shrink-0 print:pt-3">
                <div className="text-left space-y-3 print:space-y-1">
                    <div className="w-48 h-[1px] bg-slate-900 print:w-32" />
                    <div>
                        <p className="font-black text-slate-900 text-sm uppercase print:text-[10px]">Registrar of impact</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-[7px]">
                            Community Impact Lab (CIEL)
                        </p>
                    </div>
                </div>

                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-slate-900 flex flex-col items-center justify-center rotate-12 bg-white shadow-xl shadow-slate-100 p-2 print:h-20 print:w-20 print:border-2 print:shadow-none print:p-1">
                    <div className="w-full h-full rounded-full border border-dashed border-slate-900 flex flex-col items-center justify-center text-center">
                        <Award className="w-7 h-7 text-slate-900 mb-1 print:w-5 print:h-5 print:mb-0" />
                        <span className="text-[6px] sm:text-[7px] font-black text-slate-900 uppercase leading-none print:text-[5px]">
                            OFFICIAL
                            <br />
                            SEAL OF
                            <br />
                            IMPACT
                        </span>
                    </div>
                </div>

                <div className="text-right space-y-3 print:space-y-1">
                    <div className="w-48 h-[1px] bg-slate-900 ml-auto print:w-32" />
                    <div>
                        <p className="font-black text-slate-900 text-sm uppercase print:text-[10px]">Dated</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-[7px]">{today}</p>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 text-center print:static print:mt-3 print:px-2">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.45em] print:text-[5px] print:tracking-[0.2em]">
                    Verification follows HEC-aligned community engagement documentation standards
                </p>
            </div>
        </div>
    );
}

const Clock = ({ className }: { className?: string }) => (
    <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);
