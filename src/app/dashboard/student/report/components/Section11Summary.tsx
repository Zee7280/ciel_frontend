import { BarChart3, ShieldAlert, Quote, Award, Clock, Users, Target, ShieldCheck, Download, TrendingUp, X, Printer, CheckCircle, Eye, AlertTriangle, Lock, CreditCard, Flag } from "lucide-react";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import ReportPrintView from "./ReportPrintView";
import CertificateView from "./CertificateView";
import CIIDashboardMeter from "./CIIDashboardMeter";
import RedFlagsAuditModal from "./RedFlagsAuditModal";
import CIIauditInsightsPanel from "./CIIauditInsightsPanel";
import { calculateCII } from "../utils/calculateCII";
import { getRedFlagsModalSections } from "@/lib/redFlagsModalMerge";
import { parseSection11AuditSummary, type ReportCIIauditMeta } from "@/lib/parseCIIauditSummary";
import clsx from "clsx";
import ReportVerificationQr from "@/components/ReportVerificationQr";
import { pickImpactVerifyUrlFromPayload } from "@/utils/reportVerificationUrl";
import { formatMergedSdgGoalsShort, mergedSdgTitlesLine, uniqueMergedSdgGoalNumbers } from "../utils/reportSdgMerge";

type Section11SummaryProps = {
    /** When the footer submit control is hidden (summary-only workspace), opens the same confirm flow. */
    onRequestFinalSubmit?: () => void;
    /** Opportunity payload so print/certificate include partner-registered SDGs. */
    projectData?: unknown;
};

function normalizeAuditMeta(raw: unknown, summaryText: string): ReportCIIauditMeta | null {
    const fallback = summaryText ? parseSection11AuditSummary(summaryText) : null;
    if (!raw) return fallback;

    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) return fallback;
        try {
            const parsed = JSON.parse(trimmed) as unknown;
            return normalizeAuditMeta(parsed, summaryText);
        } catch {
            return parseSection11AuditSummary(trimmed) ?? fallback;
        }
    }

    if (typeof raw !== "object") return fallback;
    const meta = raw as Partial<ReportCIIauditMeta>;
    if (!Array.isArray(meta.top_fixes)) return fallback;

    return {
        critical_red_flags: meta.critical_red_flags ?? null,
        moderate_issues: meta.moderate_issues ?? null,
        minor_issues: meta.minor_issues ?? null,
        credibility: meta.credibility ?? null,
        risk_level: meta.risk_level ?? null,
        top_fixes: meta.top_fixes.filter((fix): fix is string => typeof fix === "string"),
        final_remark: meta.final_remark ?? null,
        student_feedback: meta.student_feedback ?? null,
        needs_revision: Boolean(meta.needs_revision),
    };
}

export default function Section11Summary({ onRequestFinalSubmit, projectData }: Section11SummaryProps = {}) {
    const router = useRouter();
    const {
        data,
        isEligibleForSubmission,
        areAllSectionsComplete,
        showVerifiedImpactScores,
        incompleteSectionsSummary,
    } = useReportForm();
    const { section1, section2, section3, section4, section5, section8, section9, section10 } = data;

    const reportSt = String(data.status || "").toLowerCase();
    const reportRs = String(data.report_status || "").toLowerCase();
    const inPostSubmitLifecycle =
        reportSt === "submitted" ||
        reportSt === "under_review" ||
        reportSt === "pending_payment" ||
        reportSt === "payment_under_review" ||
        reportRs === "pending_payment";
    const feeOrSlipRecorded =
        reportSt === "paid" ||
        reportSt === "payment_under_review" ||
        reportSt === "verified" ||
        reportSt === "approved" ||
        reportRs === "paid" ||
        reportRs === "payment_under_review" ||
        data.payment_verified === true;
    const paymentSlipInReview =
        reportSt === "payment_under_review" || reportRs === "payment_under_review";
    const paymentHref =
        data.project_id ? `/dashboard/student/payment?projectId=${encodeURIComponent(data.project_id)}` : "";

    const [showPreview, setShowPreview] = useState(false);
    const [showCertificate, setShowCertificate] = useState(false);
    const [showRedFlagsModal, setShowRedFlagsModal] = useState(false);

    useEffect(() => {
        if (!showCertificate) return;
        document.body.classList.add("cii-certificate-printing");
        return () => document.body.classList.remove("cii-certificate-printing");
    }, [showCertificate]);

    const beneficiariesRaw = section4.project_summary?.distinct_total_beneficiaries;
    const beneficiaries =
        beneficiariesRaw !== undefined &&
        beneficiariesRaw !== null &&
        String(beneficiariesRaw).trim() !== ""
            ? String(beneficiariesRaw)
            : "0";
    const engagementScore = section1.metrics?.eis_score ?? 0;
    const verifiedHours = section1.metrics?.total_verified_hours || 0;

    const mergedSdgNums = useMemo(
        () => uniqueMergedSdgGoalNumbers(projectData, section3),
        [projectData, section3],
    );
    const mergedSdgNarrative = useMemo(
        () => mergedSdgTitlesLine(projectData, section3),
        [projectData, section3],
    );

    const executiveSummary = useMemo(() => {
        if (data.section11?.summary_text && !data.section11.summary_text.includes("Project successfully synthesized")) {
            return data.section11.summary_text;
        }

        const sdgPhrase =
            mergedSdgNarrative ||
            (mergedSdgNums.length ? mergedSdgNums.map((n) => `SDG ${n}`).join(", ") : "Sustainable Development");
        return `Audit summary pending detailed review. Based on the submitted inputs, the project references ${verifiedHours} verified hours, ${beneficiaries} reported beneficiaries, alignment with ${sdgPhrase}, and ${section10.mechanisms?.length || 0} sustainability mechanisms. Final credibility still depends on consistency across attendance, activities, outcomes, resources, evidence, and continuity claims.`;
    }, [
        section10.mechanisms?.length,
        beneficiaries,
        verifiedHours,
        data.section11?.summary_text,
        mergedSdgNarrative,
        mergedSdgNums,
    ]);

    /** Always pass the same narrative shown in “Comprehensive audit review” (do not require SECTION 1). */
    const auditTextForModal = useMemo(() => {
        const st = data.section11?.summary_text?.trim();
        const legacy = "project successfully synthesized";
        if (st && !st.toLowerCase().includes(legacy)) {
            return st;
        }
        return executiveSummary;
    }, [data.section11?.summary_text, executiveSummary]);

    const ciiResult = useMemo(() => calculateCII(data), [data]);

    const section11AuditMeta = useMemo(() => {
        const text = String(data.section11?.summary_text || "").trim();
        return normalizeAuditMeta(data.section11?.audit_meta, text);
    }, [data.section11?.audit_meta, data.section11?.summary_text]);

    const resolvedImpactVerifyUrl = useMemo(() => pickImpactVerifyUrlFromPayload(data), [data]);

    const { sections: redFlagsModalSections, usedSystemFallback: redFlagsUsedSystemFallback } = useMemo(
        () => getRedFlagsModalSections(auditTextForModal, incompleteSectionsSummary, ciiResult),
        [auditTextForModal, incompleteSectionsSummary, ciiResult],
    );

    const openRedFlagsModal = () => {
        setShowRedFlagsModal(true);
    };

    const handlePrint = () => {
        window.print();
    };

    const hasMergedSdgs = mergedSdgNums.length > 0;

    const stats = [
        {
            label: "CII Index Score",
            icon: Award,
            display: `${engagementScore} / 100`,
            suffix: "" as string,
        },
        {
            label: "Verified Hours",
            icon: Clock,
            display: `${verifiedHours}`,
            suffix: "HRS",
        },
        {
            label: "Beneficiaries",
            icon: Users,
            display: `${beneficiaries}`,
            suffix: "PAX",
        },
        {
            label: "SDG alignment",
            icon: Target,
            display: hasMergedSdgs ? formatMergedSdgGoalsShort(mergedSdgNums) : "—",
            suffix: "",
        },
    ];

    const complianceItems = [
        {
            label: "Partner Validation",
            status: section8.partner_verification ? "PASS" : "PENDING",
            desc: "Formal recognition from external entities.",
            icon: ShieldCheck,
            check: section8.partner_verification,
        },
        {
            label: "Ethical Safeguards",
            status: Object.values(section8.ethical_compliance || {}).every(Boolean) ? "CERTIFIED" : "PENDING",
            desc: "Adherence to CIEL ethical declaration protocol.",
            icon: ShieldAlert,
            check: Object.values(section8.ethical_compliance || {}).every(Boolean),
        },
        {
            label: "Sustainability Proof",
            status: section10.mechanisms?.length > 0 ? "SECURED" : "VOLUNTARY",
            desc: "Documented project legacy and roadmap.",
            icon: TrendingUp,
            check: section10.mechanisms?.length > 0,
        },
    ];

    const surfaceCard =
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm";
    const surfaceHeaderRow = "border-b border-slate-100 bg-slate-50/70";

    return (
        <div className="space-y-5 md:space-y-6 pb-10">
            {/* ── Section Header — Intelligence strip ── */}
            <div className="space-y-3 md:space-y-4">
                <div
                    className={clsx(
                        "flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-4 md:gap-5 p-4 md:p-5 bg-gradient-to-br from-white via-slate-50/50 to-white",
                        surfaceCard,
                    )}
                >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-2xl bg-report-primary text-white flex items-center justify-center shadow-md shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                            <BarChart3 className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        <div className="min-w-0 space-y-1.5 pt-0.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-report-primary">
                                Section 11 — Intelligence
                            </p>
                            <h2 className="report-h2 text-slate-900 !text-xl md:!text-2xl lg:!text-3xl">
                                Institutional impact dashboard
                            </h2>
                            <p className="report-label text-slate-500 normal-case tracking-wide font-semibold">
                                Final preview, compliance signals, and submission readiness
                            </p>
                        </div>
                    </div>
                    {!showVerifiedImpactScores && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-left w-full lg:max-w-md lg:self-center shrink-0">
                            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-semibold text-amber-900 leading-snug">
                                Quantified scores (CII index, hours, beneficiaries, SDG priority) unlock after your reporting fee is confirmed and an administrator verifies your submission.
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {stats.map((stat, i) => (
                        <div
                            key={i}
                            className={clsx(
                                "group relative overflow-hidden rounded-2xl border bg-white p-5 md:p-6 flex flex-col gap-3 shadow-sm transition-all duration-300",
                                showVerifiedImpactScores
                                    ? "border-slate-200/80 hover:border-report-primary-border hover:shadow-md hover:shadow-report-primary-shadow"
                                    : "border-slate-200/60 bg-slate-50/40",
                            )}
                        >
                            <div
                                className={clsx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-transform",
                                    showVerifiedImpactScores
                                        ? "bg-report-primary-soft text-report-primary group-hover:scale-105"
                                        : "bg-slate-100 text-slate-400",
                                )}
                            >
                                <stat.icon className="w-[18px] h-[18px]" />
                            </div>
                            <div className="space-y-1.5">
                                {showVerifiedImpactScores ? (
                                    <p className="report-h3 !text-xl md:!text-2xl font-black tracking-tight text-slate-900">
                                        {stat.display}
                                        {stat.suffix ? (
                                            <span className="text-[10px] md:text-xs font-bold text-slate-400 ml-1.5 uppercase tracking-widest align-middle">
                                                {stat.suffix}
                                            </span>
                                        ) : null}
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-400">
                                            <Lock className="w-3.5 h-3.5" />
                                            Locked
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-400 leading-snug">
                                            Available after payment + admin verification
                                        </span>
                                    </div>
                                )}
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {stat.label}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showVerifiedImpactScores && (
                <div className="w-full flex justify-center pt-1">
                    <CIIDashboardMeter />
                </div>
            )}

            <div id="report-section11-audit-review" className={clsx("scroll-mt-24 md:scroll-mt-28 overflow-hidden relative group", surfaceCard)}>
                <div className="absolute -bottom-8 -right-8 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-1000 rotate-12 pointer-events-none">
                    <BarChart3 className="w-64 h-64 md:w-80 md:h-80 text-slate-900" />
                </div>
                <div
                    className={clsx(
                        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 md:px-8 md:py-5",
                        surfaceHeaderRow,
                    )}
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 w-full min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-sm shadow-report-primary-shadow">
                                <Quote className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {data.section11?.is_ai_generated ? "AI-Generated" : "System-Generated"}
                                </p>
                                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                                    Comprehensive audit review
                                </h3>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={openRedFlagsModal}
                            className="inline-flex items-center justify-center gap-2 self-stretch sm:self-center rounded-xl border-2 border-amber-200 bg-amber-50/70 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-950 transition-colors hover:bg-amber-50 shrink-0"
                        >
                            <Flag className="w-3.5 h-3.5 shrink-0" />
                            Section-wise red flags
                        </button>
                    </div>
                </div>
                <div className="px-6 py-8 md:px-8 md:py-10 space-y-6 relative z-10">
                    <span className="absolute top-4 left-3 md:left-5 text-6xl md:text-7xl font-serif text-slate-100 select-none leading-none pointer-events-none">
                        “
                    </span>
                    <div className="space-y-4 md:space-y-5 relative">
                        {executiveSummary.split('\n\n').map((paragraph: string, idx: number) => (
                            <p key={idx} className="report-ai-text !text-base md:!text-lg">
                                {paragraph.trim()}
                            </p>
                        ))}
                    </div>
                    <span className="absolute bottom-2 right-3 md:right-6 text-6xl md:text-7xl font-serif text-slate-100 select-none rotate-180 leading-none pointer-events-none">
                        “
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5 pt-5 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-report-primary bg-report-primary-soft px-3 py-1.5 rounded-lg border border-report-primary-border uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3 shrink-0" /> Integrity Verified
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-report-primary bg-report-primary-soft px-3 py-1.5 rounded-lg border border-report-primary-border uppercase tracking-widest">
                            <TrendingUp className="w-3 h-3 shrink-0" /> Growth Documented
                        </span>
                    </div>
                </div>
            </div>

            {section11AuditMeta ? (
                <CIIauditInsightsPanel
                    audit={section11AuditMeta}
                    ciiTotalScore={ciiResult.totalScore}
                />
            ) : null}

            <div className="space-y-4 md:space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-5 rounded-full bg-report-primary shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-report-primary">Compliance</p>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                            Institutional compliance matrix
                        </h3>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    {complianceItems.map((item, idx) => (
                        <div
                            key={idx}
                            className={clsx(
                                "group flex flex-col gap-5 p-6 md:p-7 rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md",
                                item.check ? "ring-1 ring-report-primary-border" : "",
                            )}
                        >
                            <div
                                className={clsx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    item.check ? "bg-report-primary-soft text-report-primary" : "bg-slate-50 text-slate-300 group-hover:bg-slate-100",
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <p className="text-sm font-black text-slate-900 leading-tight">{item.label}</p>
                                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{item.desc}</p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span
                                    className={clsx(
                                        "text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest",
                                        item.check
                                            ? "bg-report-primary-soft text-report-primary border-report-primary-border"
                                            : "bg-slate-50 text-slate-500 border-slate-100",
                                    )}
                                >
                                    {item.status}
                                </span>
                                {item.check && <CheckCircle className="w-4 h-4 text-report-primary shrink-0" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Final Action Hub ── */}
            <div
                className={clsx(
                    "flex flex-col items-center gap-6 text-center p-8 md:p-10 relative overflow-hidden group",
                    surfaceCard,
                )}
            >
                <div className="absolute right-0 top-0 w-40 h-40 bg-report-primary/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                
                {(data?.admin_status === 'verified' || data?.admin_status === 'approved' || data?.status === 'approved' || data?.status === 'verified') ? (
                    <>
                        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shadow-sm">
                            <CheckCircle className="w-7 h-7 text-green-600" />
                        </div>
                        <div className="w-full max-w-3xl space-y-5 px-0 sm:px-1">
                            <h3 className="text-lg font-black text-slate-900">Report Approved & Impact Verified</h3>
                            <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                Congratulations! Your social impact has been verified. You can now download your official CII.
                            </p>
                            {resolvedImpactVerifyUrl ? (
                                <div className="flex justify-center pt-1">
                                    <ReportVerificationQr
                                        impactVerifyUrl={resolvedImpactVerifyUrl}
                                        size={104}
                                        caption="Share — scan to verify authenticity"
                                    />
                                </div>
                            ) : null}
                            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
                                <Button
                                    onClick={() => setShowPreview(true)}
                                    className="bg-report-primary hover:opacity-90 text-white rounded-xl text-[11px] font-black uppercase tracking-wide transition-all shadow-md shadow-report-primary-shadow w-full min-h-12 px-3 py-3 whitespace-normal leading-snug sm:text-xs sm:tracking-widest"
                                >
                                    <span className="inline-flex items-center justify-center gap-2">
                                        <Eye className="h-4 w-4 shrink-0" aria-hidden />
                                        <span>Preview report & CII score</span>
                                    </span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCertificate(true)}
                                    className="border-2 border-slate-200 text-slate-900 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all hover:bg-slate-50 w-full min-h-12 px-3 py-3 whitespace-normal leading-snug sm:text-xs sm:tracking-widest"
                                >
                                    <span className="inline-flex items-center justify-center gap-2">
                                        <Download className="h-4 w-4 shrink-0" aria-hidden />
                                        <span>Download CIEL certificate</span>
                                    </span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={openRedFlagsModal}
                                    className="border-2 border-amber-200 bg-amber-50/60 text-amber-950 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all hover:bg-amber-50 w-full min-h-12 px-3 py-3 whitespace-normal leading-snug sm:text-xs sm:tracking-widest"
                                >
                                    <span className="inline-flex items-center justify-center gap-2">
                                        <Flag className="h-4 w-4 shrink-0" aria-hidden />
                                        <span>Red flags & audit</span>
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </>
                ) : inPostSubmitLifecycle ? (
                    !feeOrSlipRecorded && paymentHref ? (
                        <>
                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                                <CreditCard className="w-7 h-7 text-amber-600" />
                            </div>
                            <div className="max-w-md space-y-4">
                                <h3 className="text-lg font-black text-slate-900">Reporting fee required</h3>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    Your report is submitted. Complete the reporting fee and upload proof on the payment
                                    screen so your submission can move forward to verification.
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => router.push(paymentHref)}
                                    className="bg-report-primary hover:opacity-90 text-white px-8 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-report-primary-shadow w-full sm:w-auto"
                                >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Go to payment
                                </Button>
                            </div>
                        </>
                    ) : paymentSlipInReview && paymentHref ? (
                        <>
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                                <Clock className="w-7 h-7 text-slate-400" />
                            </div>
                            <div className="max-w-md space-y-4">
                                <h3 className="text-lg font-black text-slate-900">Payment proof under review</h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                    Your fee proof was received and is being verified. You will be notified when it is
                                    cleared.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push(paymentHref)}
                                    className="border-2 border-slate-200 text-slate-900 px-8 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-50 w-full sm:w-auto"
                                >
                                    View payment details
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                                <ShieldAlert className="w-7 h-7 text-slate-400" />
                            </div>
                            <div className="max-w-md space-y-3">
                                <h3 className="text-lg font-black text-slate-900">Report Locked Pending Approval</h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                    {data.status === "under_review"
                                        ? "Your report is currently being reviewed by the administration."
                                        : "Your report has been submitted and is currently being reviewed."}
                                </p>
                            </div>
                        </>
                    )
                ) : !isEligibleForSubmission ? (
                    <>
                        <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center shadow-inner">
                            <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
                        </div>
                        <div className="flex-1 space-y-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Report In Progress</h3>
                                <p className="text-sm font-bold text-slate-400">
                                    You are currently in <span className="text-amber-600">Progress Mode</span>. Complete the following criteria:
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={clsx("p-5 rounded-2xl border-2 flex items-center gap-4 transition-all", verifiedHours >= (data.required_hours || 16) ? "bg-slate-50 border-slate-100 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-400")}>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", verifiedHours >= (data.required_hours || 16) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400")}>
                                        {verifiedHours >= (data.required_hours || 16) ? <CheckCircle className="w-5 h-5" /> : "1"}
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Min. Hours Met</p>
                                        <p className="text-xs font-bold">{verifiedHours} / {data.required_hours || 16} Hours</p>
                                    </div>
                                </div>
                                <div className={clsx("p-5 rounded-2xl border-2 flex items-center gap-4 transition-all", areAllSectionsComplete ? "bg-slate-50 border-slate-100 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-400")}>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", areAllSectionsComplete ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400")}>
                                        {areAllSectionsComplete ? <CheckCircle className="w-5 h-5" /> : "2"}
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Mandatory Sections</p>
                                        <p className="text-xs font-bold">{areAllSectionsComplete ? "Complete" : "In Progress"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-4">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-amber-700 leading-relaxed text-left">
                                    Final submission and <strong>Section 10 (Sustainability)</strong> will remain locked until all{" "}
                                    {data.required_hours || 16} hours are verified.
                                </p>
                            </div>
                        </div>
                    </>
                ) : isEligibleForSubmission && !areAllSectionsComplete ? (
                    <>
                        <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center shadow-inner">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                        </div>
                        <div className="flex-1 space-y-6 max-w-lg">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Hours met — finish all sections</h3>
                                <p className="text-sm font-bold text-slate-400">
                                    Use the steps above to complete and validate sections 1–10. Submit appears only when every section is complete.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl border-2 flex items-center gap-4 bg-slate-50 border-slate-100 text-slate-700">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Min. Hours Met</p>
                                        <p className="text-xs font-bold">{verifiedHours} / {data.required_hours || 16} Hours</p>
                                    </div>
                                </div>
                                <div className="p-5 rounded-2xl border-2 border-amber-100 bg-amber-50/50 flex flex-col gap-3 text-left">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center shrink-0 font-bold text-sm">
                                            !
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none text-amber-900">
                                                Sections 1–10
                                            </p>
                                            <p className="text-xs font-bold text-amber-800">
                                                Fix the items below, then return to this step to submit.
                                            </p>
                                        </div>
                                    </div>
                                    {incompleteSectionsSummary.length > 0 && (
                                        <ul className="max-h-48 overflow-y-auto space-y-2.5 pl-1 border-t border-amber-100/80 pt-3 text-[11px] text-amber-950">
                                            {incompleteSectionsSummary.map((block) => (
                                                <li key={block.section} className="rounded-lg bg-white/70 px-2.5 py-2 border border-amber-100/90">
                                                    <span className="font-black text-amber-900">
                                                        Step {block.section} — {block.label}
                                                    </span>
                                                    <ul className="mt-1 ml-3 list-disc text-amber-900/85 font-medium space-y-0.5">
                                                        {block.errors.map((err, j) => (
                                                            <li key={`${block.section}-${err.field}-${j}`}>{err.message}</li>
                                                        ))}
                                                    </ul>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center animate-bounce shadow-lg shadow-blue-100">
                            <ShieldCheck className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="max-w-md space-y-4">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Ready for Final Submission</h3>
                            <p className="text-sm font-bold text-slate-400 leading-relaxed">
                                All sections are complete and hour requirements are met. Review and submit when ready.
                            </p>
                            <Button
                                onClick={() => {
                                    if (onRequestFinalSubmit) {
                                        onRequestFinalSubmit();
                                        return;
                                    }
                                    const footerSubmitBtn = Array.from(document.querySelectorAll("button")).find((btn) =>
                                        btn.textContent?.includes("Submit Report"),
                                    );
                                    if (footerSubmitBtn) footerSubmitBtn.click();
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-10 h-12 rounded-xl w-full text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-report-primary-shadow flex items-center justify-center gap-3"
                            >
                                <Lock className="w-4 h-4" /> Submit Final Report
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* ── Modals (Print Handled via Visibility/Display) ── */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Step 1: COMPLETELY REMOVE the dashboard UI from the print flow */
                    #dashboard-root, nav, aside, header, .sonner, [role="status"] { 
                        display: none !important; 
                    }

                    /* Step 2: Force the body to allow multi-page flow without extra space */
                    body { 
                        visibility: visible !important; 
                        background: white !important; 
                        height: auto !important; 
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Step 3: Position the modal at the absolute top (0,0) of the print document */
                    .print-active-modal { 
                        display: block !important; 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important; 
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        overflow: visible !important;
                        visibility: visible !important;
                    }

                    /* Step 4: Reset the modal wrapper (portal) to not use flex/fixed in print */
                    .fixed.inset-0 { 
                        display: block !important; 
                        position: absolute !important; 
                        inset: 0 !important;
                        overflow: visible !important; 
                    }
                    
                    .relative.w-full.max-w-5xl, .relative.w-full.max-w-4xl { 
                        display: block !important; 
                        position: relative !important; 
                        max-width: none !important; 
                        width: 100% !important; 
                        transform: none !important; 
                        margin: 0 !important;
                        top: 0 !important;
                    }

                    @page { margin: 1cm; size: auto; }

                    .print-no-ui { display: none !important; }
                    
                    .print-scroll-auto, #print-area, #print-area-certificate { 
                        overflow: visible !important; 
                        max-height: none !important; 
                        height: auto !important;
                        display: block !important;
                        padding: 0 !important;
                    }
                }
            `}} />

            {showPreview && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300 print:p-0 print:bg-white print:backdrop-blur-none transition-all print-active-modal">
                    <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 print:shadow-none print:rounded-none print:max-w-none print:w-full print:p-0 print:m-0 print-scroll-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xl rounded-t-[2rem] z-[110] print-no-ui">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg"><Download className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Official Project Dossier</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institutional Impact Verification</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"><Printer className="w-3.5 h-3.5" /> Print / Save PDF</Button>
                                <button onClick={() => setShowPreview(false)} className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div id="print-area" className="px-6 py-10 md:px-12 md:py-16 overflow-y-auto max-h-[85vh] print:max-h-none print:px-0 print:py-0 print-scroll-auto">
                            <ReportPrintView reportData={data} projectData={projectData} />
                        </div>
                    </div>
                </div>
            )}

            {showCertificate &&
                typeof document !== "undefined" &&
                createPortal(
                    <div className="cii-certificate-print-root fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300 print:p-0 print:bg-white print:backdrop-blur-none print-active-modal">
                        <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 print:shadow-none print:rounded-none print:max-w-none print:w-full print:p-0 print:m-0 print-scroll-auto">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xl rounded-t-[2rem] z-[110] print-no-ui">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-lg">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">CII Certificate</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Certificate of Institutional Impact</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={handlePrint}
                                        className="bg-report-primary hover:opacity-90 text-white h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-report-primary-shadow"
                                    >
                                        <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCertificate(false)}
                                        className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div
                                id="print-area-certificate"
                                className="p-4 md:p-10 overflow-y-auto max-h-[85vh] print:max-h-none print:p-0 print-scroll-auto"
                            >
                                <CertificateView projectData={projectData} />
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}

            <RedFlagsAuditModal
                open={showRedFlagsModal}
                onOpenChange={setShowRedFlagsModal}
                sections={redFlagsModalSections}
                usedSystemFallback={redFlagsUsedSystemFallback}
            />
        </div>
    );
}
