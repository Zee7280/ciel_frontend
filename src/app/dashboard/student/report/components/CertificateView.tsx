import React, { useMemo } from "react";
import { useReportForm } from "../context/ReportContext";
import type { ReportData } from "../context/ReportContext";
import { formatDisplayId } from "@/utils/displayIds";
import { Award, ShieldCheck, Globe } from "lucide-react";
import { calculateCII } from "../utils/calculateCII";
import { calculateEngagementMetrics, buildIndividualRosterFromSection1 } from "../utils/engagementMetrics";
import { deriveCertificateProjectDisplay } from "../utils/certificateDisplay";
import { mergedSdgTitlesLine, uniqueMergedSdgGoalNumbers } from "../utils/reportSdgMerge";
import ReportVerificationQr from "@/components/ReportVerificationQr";
import { isInstitutionallyVerifiedReport } from "@/utils/institutionalReportVerification";
import { pickImpactVerifyUrlFromPayload } from "@/utils/reportVerificationUrl";
import { readPersistedCiiSnapshot } from "@/utils/reportCiiSnapshot";

type TeamMember = ReportData["section1"]["team_members"][number];

type LeadShape = ReportData["section1"]["team_lead"];

type CertificateBadge = {
    src: string;
    alt: string;
    title: string;
    tagline: string;
    accentClass: string;
};

type RecipientBlock = {
    key: string;
    name: string;
    label: string;
    university: string;
    program: string;
};

function displayPersonName(p: { fullName?: string; name?: string }): string {
    return (p.fullName || p.name || "").trim();
}

function normalizeNameKey(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function digitsOnly(s: string): string {
    return String(s || "").replace(/\D/g, "");
}

/**
 * Collapse obvious duplicate roster rows only (lead also listed under team_members, etc.).
 * Do not treat mobile-only or name-only as identity — teammates often share household numbers or placeholder text.
 */
function isSameReportParticipant(a: LeadShape | TeamMember, b: LeadShape | TeamMember): boolean {
    const idA = String((a as { id?: string }).id ?? "").trim();
    const idB = String((b as { id?: string }).id ?? "").trim();
    if (idA.length > 0 && idA === idB) return true;

    const ac = digitsOnly("cnic" in a ? a.cnic : "");
    const bc = digitsOnly("cnic" in b ? b.cnic : "");
    if (ac.length >= 5 && bc.length >= 5 && ac === bc) return true;

    const am = digitsOnly("mobile" in a ? a.mobile : "");
    const bm = digitsOnly("mobile" in b ? b.mobile : "");
    const an = normalizeNameKey(displayPersonName(a));
    const bn = normalizeNameKey(displayPersonName(b));
    const mobilesMatch = am.length >= 7 && bm.length >= 7 && am === bm;
    const namesMatch = an.length >= 2 && bn.length >= 2 && an === bn;
    if (mobilesMatch && namesMatch) return true;

    return false;
}

function getCiiCertificateBadge(score: number): CertificateBadge {
    if (score >= 85) {
        return {
            src: "/certificate-badges/transformative-impact.png",
            alt: "Transformative Impact badge",
            title: "Transformative Impact",
            tagline: "Verified Excellence in Community Impact.",
            accentClass: "text-amber-700",
        };
    }
    if (score >= 70) {
        return {
            src: "/certificate-badges/strong-impact-contributor.png",
            alt: "Strong Impact Contributor badge",
            title: "Strong Impact Contributor",
            tagline: "Driving Progress Through Purposeful Service",
            accentClass: "text-orange-700",
        };
    }
    if (score >= 55) {
        return {
            src: "/certificate-badges/developing-impact-contributor.png",
            alt: "Developing Impact Contributor badge",
            title: "Developing Impact Contributor",
            tagline: "Growing Through Service and Impact",
            accentClass: "text-emerald-700",
        };
    }
    if (score >= 40) {
        return {
            src: "/certificate-badges/emerging-community-contributor.png",
            alt: "Emerging Community Contributor badge",
            title: "Emerging Community Contributor",
            tagline: "Starting the Journey of Community Change",
            accentClass: "text-sky-700",
        };
    }
    return {
        src: "/certificate-badges/foundation-stage-contributor.png",
        alt: "Foundation Stage Contributor badge",
        title: "Foundation Stage Contributor",
        tagline: "Planting the Seeds of Responsible Service",
        accentClass: "text-[#9a4b25]",
    };
}

export default function CertificateView({ projectData }: { projectData?: unknown } = {}) {
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
        const leadDegree = lead.degree?.trim() || "";
        const leadProgram = [leadDegree, section2.discipline?.trim() && leadDegree !== section2.discipline.trim() ? section2.discipline.trim() : ""]
            .filter(Boolean)
            .join(" · ");

        if (section1.participation_type !== "team" || !section1.team_members?.length) {
            return [{
                key: "lead",
                name: leadName,
                label: leadLabel,
                university: lead.university?.trim() || "",
                program: leadProgram,
            }];
        }

        const seen: (LeadShape | TeamMember)[] = [lead];
        const rows: RecipientBlock[] = [
            {
                key: "lead",
                name: leadName,
                label: leadLabel,
                university: lead.university?.trim() || "",
                program: leadProgram,
            },
        ];

        section1.team_members.forEach((m: TeamMember, i: number) => {
            if (seen.some((s) => isSameReportParticipant(m, s))) return;
            seen.push(m);
            rows.push({
                key: m.id || `m-${i}`,
                name: displayPersonName(m) || "Team member",
                label: (m.role || "Team member").trim(),
                university: m.university?.trim() || "",
                program: m.program?.trim() || "",
            });
        });

        return rows;
    }, [section1.participation_type, section1.team_lead, section1.team_members, section2.discipline]);

    const showRecipientCards = section1.participation_type === "team" && recipientBlocks.length > 1;
    const showTeamRoster = showRecipientCards && recipientBlocks.length > 2;
    const rosterBlocks = useMemo(() => recipientBlocks.slice(0, 20), [recipientBlocks]);
    const hiddenRosterCount = Math.max(0, recipientBlocks.length - rosterBlocks.length);

    const institutionLine = useMemo(() => {
        const uni = section1.team_lead.university?.trim();
        const degree = section1.team_lead.degree?.trim();
        const discipline = section2.discipline?.trim();
        const parts: string[] = [];
        if (uni) parts.push(uni);
        const program = [degree, discipline && degree !== discipline ? discipline : ""].filter(Boolean).join(" · ");
        return { primary: parts.join(" "), secondary: program };
    }, [section1.team_lead.university, section1.team_lead.degree, section2.discipline]);

    const mergedSdgNums = useMemo(
        () => uniqueMergedSdgGoalNumbers(projectData, section3),
        [projectData, section3],
    );

    const sdgGoalDisplay = useMemo(() => {
        if (!mergedSdgNums.length) return "—";
        return mergedSdgNums.join(", ");
    }, [mergedSdgNums]);

    const sdgTitleLine = useMemo(() => mergedSdgTitlesLine(projectData, section3), [projectData, section3]);

    const resolvedVerifyUrl = useMemo(() => pickImpactVerifyUrlFromPayload(data), [data]);
    const showVerificationQr = Boolean(resolvedVerifyUrl) && isInstitutionallyVerifiedReport(data);

    const engagementRecalc = useMemo(() => {
        const teamSize = (section1.participation_type === "team" ? section1.team_members.length : 0) + 1;
        const req = data.required_hours || 16;
        const rosterIds = buildIndividualRosterFromSection1(section1, section1.team_lead?.id);
        return calculateEngagementMetrics(section1.attendance_logs || [], req, teamSize, section1.team_lead, rosterIds);
    }, [section1, data.required_hours]);

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
    }, [section1.metrics?.total_verified_hours, section1.team_lead.hours, section1.team_members, engagementRecalc.total_verified_hours]);

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
        const persisted = readPersistedCiiSnapshot(data);
        if (persisted) {
            return Math.min(100, Math.max(0, Math.round(persisted.totalScore)));
        }
        const totalScore = calculateCII(reportForCii).totalScore;
        return Math.min(100, Math.max(0, Math.round(totalScore)));
    }, [data, reportForCii]);

    const ciiBadge = useMemo(() => getCiiCertificateBadge(ciiScore), [ciiScore]);

    const today = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="certificate-print-shell">
        <div className="certificate-one-page bg-[#fffdfa] min-h-[690px] w-full max-w-6xl mx-auto p-12 relative border-[12px] border-[#071b3a] shadow-2xl flex flex-col items-center text-center overflow-x-hidden overflow-y-visible break-inside-avoid">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0;
                    }
                    @page cii-certificate-page {
                        size: A4 landscape;
                        margin: 0;
                    }
                }
                `,
            }} />
            <div className="pointer-events-none absolute inset-3 border border-[#b67835]/80" />
            <div className="pointer-events-none absolute inset-6 border border-[#071b3a]/10" />
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#b67835]/5 -ml-32 -mt-32 rounded-full" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#071b3a]/5 -mr-48 -mb-48 rounded-full" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035]">
                <img src="/certificate-iel-pk-logo.png" alt="" className="h-[34rem] w-[34rem] object-contain" />
            </div>

            <div className="relative z-10 w-full flex justify-between items-start gap-6 mb-10 pt-4">
                <div className="flex items-center gap-4 text-left">
                    <img src="/certificate-iel-pk-logo.png" alt="CIEL PK" className="h-[5.5rem] w-[5.5rem] shrink-0 object-contain object-left" width={1024} height={1024} />
                    <div className="border-l border-[#b67835]/60 pl-4">
                        <p className="font-serif text-3xl font-black leading-none tracking-wide text-[#071b3a]">
                            CIEL PK
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#071b3a]/80">
                            Community Impact Education Lab
                        </p>
                    </div>
                </div>
                <div className="flex items-start justify-end gap-4 text-right">
                    <div>
                        <div className="flex items-center justify-end gap-2 mb-1">
                            <ShieldCheck className="w-4 h-4 text-[#071b3a]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#071b3a]">Verified impact</span>
                        </div>
                        <div className="text-[9px] font-bold text-[#071b3a]/55">
                            ID: {data.project_id ? formatDisplayId(data.project_id, "OPP") : "CIEL-REF-PENDING"}
                        </div>
                    </div>
                    {showVerificationQr ? (
                        <ReportVerificationQr
                            impactVerifyUrl={resolvedVerifyUrl ?? undefined}
                            size={64}
                            caption="Authenticate certificate"
                            className="shrink-0 items-end gap-1"
                        />
                    ) : null}
                </div>
            </div>

            <div className={`relative z-10 space-y-3 ${showTeamRoster ? "mb-4" : "mb-8"}`}>
                <div className="inline-flex items-center gap-3 px-6 py-2 text-[#9a4b25]">
                    <span className="h-px w-9 bg-[#b67835]/70" />
                    <span className="text-xs font-black uppercase tracking-[0.45em]">
                        Honorary recognition
                    </span>
                    <span className="h-px w-9 bg-[#b67835]/70" />
                </div>

                <h1 className="font-serif text-5xl font-black text-[#071b3a] uppercase tracking-tight leading-tight">
                    Certificate of <br />
                    <span className="text-[#9a4b25]">Institutional impact</span>
                </h1>
            </div>

            <div className={`relative z-10 w-full space-y-5 ${showTeamRoster ? "max-w-4xl mb-5" : "max-w-3xl mb-10"}`}>
                <p className="text-base font-medium text-[#071b3a]/65 italic">
                    This official recognition is presented to{showTeamRoster ? " the Verified Project Team" : ""}
                </p>

                {showTeamRoster ? (
                    <div className="rounded-2xl border border-[#b67835]/75 bg-white/75 p-3 shadow-sm">
                        <div className="relative -mt-6 mb-2 flex justify-center">
                            <span className="bg-[#071b3a] px-6 py-1 font-serif text-sm font-black uppercase tracking-widest text-white">
                                Verified Team Roster
                            </span>
                        </div>
                        <p className="mb-2 text-[11px] font-semibold italic text-[#9a4b25]">
                            Capacity: Up to 20 Students | Multi-University Team Recognition
                            {hiddenRosterCount > 0 ? ` | +${hiddenRosterCount} listed in official report` : ""}
                        </p>
                        <div className="certificate-team-roster grid grid-cols-1 sm:grid-cols-4 rounded-xl border border-[#b67835]/25 text-left">
                            {rosterBlocks.map((row, index) => (
                                <div
                                    key={row.key}
                                    className="min-h-[3.35rem] border-b border-r border-[#b67835]/20 px-3 py-2 last:border-b-0"
                                >
                                    <div className="flex gap-2">
                                        <span className="w-5 shrink-0 text-right text-[11px] font-black text-[#9a4b25]">
                                            {index + 1}.
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black leading-none text-[#071b3a]">
                                                {row.name}
                                            </p>
                                            <p className="mt-1 line-clamp-2 text-[9px] font-semibold leading-tight text-[#071b3a]/70">
                                                {row.university || row.program || row.label}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : showRecipientCards ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {recipientBlocks.map((row) => (
                            <div
                                key={row.key}
                                className="relative rounded-2xl border border-[#b67835]/70 bg-white/75 px-5 pb-4 pt-5 shadow-sm"
                            >
                                <div className="absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-[#071b3a] text-white ring-2 ring-[#fffdfa]">
                                    <span className="text-[11px] font-black leading-none">●</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-center sm:gap-3 gap-0.5">
                                    <span className="text-2xl sm:text-3xl font-black text-[#071b3a] uppercase tracking-[0.12em] break-words">
                                        {row.name}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9a4b25]">
                                        {row.label}
                                    </span>
                                </div>
                                <div className="my-3 h-px bg-[#b67835]/35" />
                                {row.university ? (
                                    <p className="text-sm font-black leading-tight text-[#071b3a]">
                                        {row.university}
                                    </p>
                                ) : null}
                                {row.program ? (
                                    <p className="mt-2 text-xs font-semibold leading-tight text-[#071b3a]/75">
                                        {row.program}
                                    </p>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="pb-3">
                        <div className="flex flex-col gap-2.5">
                            {recipientBlocks.map((row) => (
                                <div
                                    key={row.key}
                                    className="flex flex-col sm:flex-row sm:items-baseline sm:justify-center sm:gap-3 gap-0.5"
                                >
                                    <span className="text-2xl sm:text-3xl font-black text-[#071b3a] uppercase tracking-[0.18em] break-words">
                                        {row.name}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9a4b25]">
                                        {row.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!showRecipientCards && (institutionLine.primary || institutionLine.secondary) && (
                    <div className="rounded-2xl border border-[#b67835]/70 bg-white/70 px-5 py-4 shadow-sm">
                        {institutionLine.primary ? (
                            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#071b3a]">
                                {institutionLine.primary}
                            </p>
                        ) : null}
                        {institutionLine.secondary ? (
                            <p className="text-[11px] font-semibold text-[#9a4b25] mt-1.5 leading-snug">
                                {institutionLine.secondary}
                            </p>
                        ) : null}
                    </div>
                )}

                <p className="text-sm font-medium text-[#071b3a]/65 italic leading-relaxed max-w-2xl mx-auto">
                    for verified delivery of the institutional impact project
                </p>
                <div className="max-w-2xl mx-auto space-y-2">
                    <p
                        className="text-lg sm:text-xl font-black text-[#071b3a] leading-snug tracking-tight"
                        title={certificateHeadline}
                    >
                        &ldquo;{certificateHeadline}&rdquo;
                    </p>
                    {!showTeamRoster && certificateContext ? (
                        <p className="text-[11px] sm:text-xs text-[#071b3a]/60 font-medium leading-relaxed text-center">
                            {certificateContext}
                        </p>
                    ) : null}
                </div>
            </div>

            <div
                className={`certificate-metrics-grid relative z-10 w-full max-w-4xl ${showTeamRoster ? "gap-4" : "gap-8"}`}
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: showTeamRoster ? "1rem" : "2rem",
                }}
            >
                <div className="space-y-2 sm:border-r sm:border-[#b67835]/30 sm:pr-4">
                    <div className="flex justify-center mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center text-[#9a4b25] ring-1 ring-[#b67835]/40">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#071b3a]/65">
                        Verified hours
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-[#071b3a]">
                        <span className="whitespace-nowrap">{verifiedHours}</span>
                    </p>
                    <p className="text-[10px] font-bold text-[#9a4b25] uppercase tracking-tight">
                        Engagement span
                    </p>
                    <p className="text-sm font-black text-[#071b3a]">
                        {engagementSpanDays > 0 ? (
                            <span>{engagementSpanDays} calendar days</span>
                        ) : (
                            <span className="text-slate-400 font-semibold">Log dates to show span</span>
                        )}
                    </p>
                </div>

                <div className="space-y-2 border-y border-[#b67835]/30 py-8 sm:py-0 sm:border-y-0 sm:border-x sm:px-4">
                    <div className="flex justify-center mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center text-[#9a4b25] ring-1 ring-[#b67835]/40">
                            <Globe className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#071b3a]/65">
                        SDG alignment
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-[#071b3a]">
                        {mergedSdgNums.length === 0 ? (
                            <span className="whitespace-nowrap">—</span>
                        ) : mergedSdgNums.length === 1 ? (
                            <>
                                Goal <span className="whitespace-nowrap">{sdgGoalDisplay}</span>
                            </>
                        ) : (
                            <>
                                Goals <span className="whitespace-nowrap">{sdgGoalDisplay}</span>
                            </>
                        )}
                    </p>
                    {sdgTitleLine ? (
                        <p className="text-[11px] font-semibold text-[#071b3a]/70 leading-snug max-w-[14rem] mx-auto">
                            {sdgTitleLine}
                        </p>
                    ) : null}
                </div>

                <div className="space-y-2 sm:pl-4">
                    <div className="flex justify-center mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center text-[#9a4b25] ring-1 ring-[#b67835]/40">
                            <Award className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#071b3a]/65">
                        CII index score
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-[#071b3a]">
                        <span className="whitespace-nowrap">{ciiScore}/100</span>
                        <span className={`block text-[11px] font-black uppercase tracking-widest mt-1 ${ciiBadge.accentClass}`}>
                            {ciiBadge.title}
                        </span>
                        <span className="block font-serif text-[11px] font-semibold italic normal-case tracking-normal text-[#071b3a]/70 mt-0.5">
                            {ciiBadge.tagline}
                        </span>
                    </p>
                </div>
            </div>

            <div className="relative z-10 mt-auto w-full max-w-5xl pt-8">
                <div
                    className="items-end"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: "1.5rem",
                    }}
                >
                    <div className="text-left space-y-3">
                        <div className="pl-1">
                            <img
                                src="/ciel-e-signature.png"
                                alt="E-signature"
                                className="h-10 w-40 object-contain object-left"
                                width={640}
                                height={160}
                            />
                        </div>
                        <div className="w-48 h-[1px] bg-[#b67835]" />
                        <div>
                            <p className="mb-1 text-[7px] font-black uppercase tracking-[0.35em] text-[#071b3a]/45">
                                E-signature
                            </p>
                            <p className="font-black text-[#071b3a] text-sm uppercase">Registrar of impact</p>
                            <p className="text-[10px] font-bold text-[#071b3a]/55 uppercase tracking-widest">
                                Community Impact Lab (CIEL)
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-end">
                        <img
                            src={ciiBadge.src}
                            alt={ciiBadge.alt}
                            className="h-24 w-36 object-contain drop-shadow-sm"
                            width={1024}
                            height={1024}
                        />
                    </div>

                    <div className="text-right space-y-3">
                        <div className="w-48 h-[1px] bg-[#b67835] ml-auto" />
                        <div>
                            <p className="font-black text-[#071b3a] text-sm uppercase">Dated</p>
                            <p className="text-[10px] font-bold text-[#071b3a]/55 uppercase tracking-widest">{today}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 text-center">
                    <p className="text-[8px] font-black text-[#071b3a]/35 uppercase tracking-[0.45em]">
                        Verification follows HEC-aligned community engagement documentation standards
                    </p>
                </div>
            </div>
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
