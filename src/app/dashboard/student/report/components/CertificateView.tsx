import React, { useMemo } from "react";
import { useReportForm } from "../context/ReportContext";
import type { ReportData } from "../context/ReportContext";
import { BarChart3, Calendar, Clock, Globe, Lock, Target, Users } from "lucide-react";
import "./certificate-print.css";
import { calculateCII } from "../utils/calculateCII";
import { calculateEngagementMetrics, buildIndividualRosterFromSection1 } from "../utils/engagementMetrics";
import {
    deriveCertificateProjectDisplay,
    formatCertificateDate,
    pickCertificateVerificationCode,
} from "../utils/certificateDisplay";
import { resolveImpactVerifyQrHref } from "@/utils/reportVerificationUrl";
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

function CertFlourish() {
    return (
        <svg className="cert-flourish" viewBox="0 0 88 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path
                d="M44 2c-8 0-12 4-16 6-4 2-8 2-12 0M44 2c8 0 12 4 16 6 4 2 8 2 12 0M44 16c-3-2-6-3-10-3s-7 1-10 3M44 16c3-2 6-3 10-3s7 1 10 3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
            <circle cx="44" cy="9" r="2.5" fill="currentColor" />
        </svg>
    );
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

    const { headline: certificateHeadline } = useMemo(
        () => deriveCertificateProjectDisplay(data),
        [data],
    );

    const recipientBlocks = useMemo(() => {
        const lead = section1.team_lead;
        const leadName = displayPersonName(lead) || "Distinguished Participant";
        const leadLabel = section1.participation_type === "team" ? "Team Lead" : "Participant";
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

    const rosterBlocks = useMemo(() => recipientBlocks.slice(0, 20), [recipientBlocks]);
    const hiddenRosterCount = Math.max(0, recipientBlocks.length - rosterBlocks.length);

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

    const certificateDate = useMemo(() => formatCertificateDate(), []);
    const verificationCode = useMemo(() => pickCertificateVerificationCode(data), [data]);

    const verifyHintHost = useMemo(() => {
        const href = resolveImpactVerifyQrHref(resolvedVerifyUrl);
        if (href) {
            try {
                return new URL(href).host;
            } catch {
                /* fall through */
            }
        }
        return "www.cielpk.com";
    }, [resolvedVerifyUrl]);

    const engagementSpanLabel =
        engagementSpanDays > 0
            ? `${engagementSpanDays} Calendar ${engagementSpanDays === 1 ? "Day" : "Days"}`
            : "—";

    const sdgPrimaryLabel =
        mergedSdgNums.length === 0
            ? "—"
            : mergedSdgNums.length === 1
              ? `Goal ${sdgGoalDisplay}`
              : `Goals ${sdgGoalDisplay}`;

    return (
        <div className="certificate-print-shell flex justify-center p-4 print:p-0">
            <div className="certificate-one-page w-[210mm] min-h-[297mm] max-w-[210mm] mx-auto shadow-2xl print:shadow-none break-inside-avoid">
                <div className="cert-frame">
                    <div className="cert-corner cert-corner--tl" aria-hidden />
                    <div className="cert-corner cert-corner--tl-gold" aria-hidden />
                    <div className="cert-corner cert-corner--bl" aria-hidden />
                    <div className="cert-corner cert-corner--bl-gold" aria-hidden />

                    <div className="cert-inner">
                        <div className="cert-logo-row">
                            <img
                                src="/certificate-iel-pk-logo.png"
                                alt="IEL"
                                className="cert-logo-mark"
                                width={1024}
                                height={1024}
                            />
                            <span className="cert-logo-pk">PK</span>
                        </div>

                        <h1 className="cert-title-main">Certificate</h1>
                        <p className="cert-title-sub">Of Verified Community Impact</p>
                        <CertFlourish />

                        <p className="cert-intro">
                            This is to certify that the following participant(s) have successfully contributed to
                            the institutional impact project
                        </p>
                        <p className="cert-project-title" title={certificateHeadline}>
                            &ldquo;{certificateHeadline}&rdquo;
                        </p>
                        <CertFlourish />

                        <div className="cert-table-wrap">
                            <div className="cert-table-tab">Certified Participants</div>
                            <table className="cert-participant-table certificate-participant-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Participant Name</th>
                                        <th>Role</th>
                                        <th>Degree / Program</th>
                                        <th>Institution</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rosterBlocks.map((row, index) => (
                                        <tr key={row.key}>
                                            <td>{index + 1}</td>
                                            <td>{row.name}</td>
                                            <td>{row.label}</td>
                                            <td>{row.program || "—"}</td>
                                            <td>{row.university || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {hiddenRosterCount > 0 ? (
                                <p className="cert-roster-note">
                                    +{hiddenRosterCount} additional participant(s) listed in the official impact report
                                </p>
                            ) : null}
                        </div>

                        <div className="cert-metrics certificate-metrics-grid">
                            <div className="cert-metric certificate-metric-cell">
                                <Clock className="cert-metric-icon" aria-hidden />
                                <p className="cert-metric-label">Verified Hours</p>
                                <p className="cert-metric-value">{verifiedHours || "—"}</p>
                            </div>
                            <div className="cert-metric certificate-metric-cell">
                                <Users className="cert-metric-icon" aria-hidden />
                                <p className="cert-metric-label">Engagement Span</p>
                                <p className="cert-metric-value cert-metric-value--sm">{engagementSpanLabel}</p>
                            </div>
                            <div className="cert-metric certificate-metric-cell">
                                <Target className="cert-metric-icon" aria-hidden />
                                <p className="cert-metric-label">SDG Alignment</p>
                                <p className="cert-metric-value">{sdgPrimaryLabel}</p>
                                {sdgTitleLine ? <p className="cert-metric-sdg-sub">{sdgTitleLine}</p> : null}
                            </div>
                            <div className="cert-metric certificate-metric-cell">
                                <BarChart3 className="cert-metric-icon" aria-hidden />
                                <p className="cert-metric-label">CII Index Score</p>
                                <p className="cert-metric-value">
                                    {ciiScore}/100
                                </p>
                            </div>
                            <div className="cert-metric cert-metric-badge certificate-metric-cell">
                                <img
                                    src={ciiBadge.src}
                                    alt={ciiBadge.alt}
                                    className="cert-metric-badge-img"
                                    width={1024}
                                    height={1024}
                                />
                            </div>
                        </div>

                        <div className="cert-footer-row">
                            <div className="cert-signature-block">
                                <img
                                    src="/ciel-e-signature.png"
                                    alt="Registrar signature"
                                    className="cert-signature-img"
                                    width={640}
                                    height={160}
                                />
                                <div className="cert-signature-line" />
                                <p className="cert-registrar-label">Registrar of Impact</p>
                                <p className="cert-registrar-sub">Community Impact Lab (CIL)</p>
                            </div>
                            <div className="cert-date-block">
                                <Calendar className="cert-date-icon" aria-hidden />
                                <div className="cert-date-line" />
                                <p className="cert-dated-label">Dated</p>
                                <p className="cert-dated-value">{certificateDate}</p>
                            </div>
                        </div>

                        <div className="cert-verify-box">
                            <div className="cert-verify-shield" aria-hidden>
                                <Lock className="cert-verify-shield-lock" strokeWidth={2.25} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="cert-verify-code-label">Certificate Verification Code</p>
                                <p className="cert-verify-code-value">
                                    {verificationCode ?? "—"}
                                </p>
                                <p className="cert-verify-hint">
                                    Scan the QR code or visit {verifyHintHost} to verify authenticity.
                                </p>
                            </div>
                            {showVerificationQr ? (
                                <ReportVerificationQr
                                    impactVerifyUrl={resolvedVerifyUrl ?? undefined}
                                    size={76}
                                    caption=""
                                    className="shrink-0 [&_div]:rounded-none [&_div]:border-0 [&_div]:p-0"
                                />
                            ) : (
                                <div
                                    className="h-[76px] w-[76px] shrink-0 border border-dashed border-[#b67835]/50 bg-white/80"
                                    aria-hidden
                                />
                            )}
                        </div>

                        <p className="cert-disclaimer">
                            This certificate is issued by Community Impact Lab (CIL) and follows CIL-aligned
                            community engagement documentation standards.
                        </p>
                        <p className="cert-website">
                            <Globe className="cert-website-icon" aria-hidden />
                            www.cielpk.com
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
