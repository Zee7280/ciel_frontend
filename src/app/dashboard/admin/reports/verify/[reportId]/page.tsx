"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';
import {
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    ChevronDown,
    XCircle,
    ExternalLink,
    User,
    Building2,
    Calendar,
    Target,
    Users,
    Activity,
    TrendingUp,
    Package,
    Handshake,
    FileText,
    MessageSquare,
    MapPin,
    Clock as ClockIcon,
    AlertTriangle,
    List,
    PencilLine,
} from "lucide-react";
import { toast } from 'sonner';
import clsx from 'clsx';
import ReportPrintView from '../../../../student/report/components/ReportPrintView';
import AttendanceSummaryTable from '../../../../student/engagement/components/AttendanceSummaryTable';
import { checkReportQuality, QualityAlert } from '@/utils/reportQuality';
import { parseSection11AuditSummary, type ReportCIIauditMeta } from "@/lib/parseCIIauditSummary";
import type { ReportData } from "../../../../student/report/context/ReportContext";
import { calculateCII } from "../../../../student/report/utils/calculateCII";
import { mergeReportSdgSnapshotRows } from "../../../../student/report/utils/reportSdgMerge";
import { readPersistedCiiSnapshot } from "@/utils/reportCiiSnapshot";
import { applyEngagementTeamScopeToReport } from "@/utils/reportTeamScope";
import { getReportProjectContextDisplay } from "@/utils/reportProjectContext";

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

function compactAlertText(value: string, max = 180): string {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max).trimEnd()}...`;
}

function buildQualityAlerts(reportData: any, section11Audit: ReportCIIauditMeta | null): QualityAlert[] {
    const baseAlerts = checkReportQuality(reportData);
    if (!section11Audit) return baseAlerts;

    const aiAlerts: QualityAlert[] = [];
    if (section11Audit.critical_red_flags) {
        aiAlerts.push({
            sectionId: "section11",
            severity: "error",
            message: `Critical red flags: ${compactAlertText(section11Audit.critical_red_flags)}`,
        });
    }
    if (section11Audit.moderate_issues) {
        aiAlerts.push({
            sectionId: "section11",
            severity: "warning",
            message: `Moderate issues: ${compactAlertText(section11Audit.moderate_issues)}`,
        });
    }
    if (section11Audit.minor_issues) {
        aiAlerts.push({
            sectionId: "section11",
            severity: "warning",
            message: `Minor issues: ${compactAlertText(section11Audit.minor_issues)}`,
        });
    }
    if (section11Audit.top_fixes.length > 0) {
        aiAlerts.push({
            sectionId: "section11",
            severity: "warning",
            message: `Top fix needed: ${compactAlertText(section11Audit.top_fixes[0], 160)}`,
        });
    }

    return [...aiAlerts, ...baseAlerts];
}

interface ReportDetail {
    id: string;
    project_id?: string;
    student: {
        name: string;
        email: string;
        university: string;
    };
    opportunity: {
        title: string;
        organization: string;
        organization_name?: string;
        city?: string;
        location_district?: string;
        start_date?: string;
        end_date?: string;
        hours?: number;
    };
    submission_date: string;
    status: string;
    partner_status: string;
    admin_status: string;
    section1: any;
    section2: any;
    section3: any;
    section4: any;
    section5: any;
    section6: any;
    section7: any;
    section8: any;
    section9: any;
    section10: any;
    section11: any;
    evidence_urls: string[];
    /** Hours target for CII / engagement; falls back to opportunity hours or 16. */
    required_hours?: number;
}

type AdminEvidenceFile = {
    url: string;
    name: string;
};

const DOSSIER_NAV_SECTIONS = [
    { id: "section1", label: "Participation Profile", icon: Users },
    { id: "section2", label: "Project Context", icon: FileText },
    { id: "section3", label: "SDG Mapping", icon: Target },
    { id: "section4", label: "Activities & Outputs", icon: Activity },
    { id: "section5", label: "Outcomes", icon: TrendingUp },
    { id: "section6", label: "Resources", icon: Package },
    { id: "section7", label: "Partnerships", icon: Handshake },
    { id: "section8", label: "Evidence", icon: FileText },
    { id: "section9", label: "Reflection", icon: MessageSquare },
    { id: "section10", label: "Sustainability", icon: Activity },
    { id: "section11", label: "Summary / Print View", icon: FileText },
] as const;

/** Admin verify dossier: indigo accent + slate neutrals (matches `--color-report-*` in globals). */
const adminDossier = {
    shell: "min-h-screen bg-slate-50 font-sans text-slate-800 antialiased",
    card: "rounded-2xl border border-slate-200/90 bg-white shadow-sm",
    cardLg: "rounded-3xl border border-slate-200/90 bg-white shadow-sm",
    sectionIcon: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    sectionTitle: "text-xl font-bold tracking-tight text-slate-900 sm:text-2xl",
    microLabel: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500",
    inset: "rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5",
    tocBtn: "group flex w-full flex-row items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50",
    navIcon: "h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-indigo-600",
    navText: "min-w-0 flex-1 text-left text-sm font-medium leading-snug text-slate-700 transition-colors group-hover:text-slate-900",
    hub: "rounded-3xl bg-slate-900 p-6 text-white shadow-lg shadow-slate-300/40",
} as const;

function adminValueIsEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") {
        const t = value.trim();
        if (!t) return true;
        const u = t.toUpperCase();
        if (u === "N/A" || u === "NA" || u === "NONE" || u === "NULL" || u === "UNDEFINED") return true;
    }
    if (Array.isArray(value)) return value.length === 0 || value.every((v) => adminValueIsEmpty(v));
    return false;
}

function pickEvidenceUrl(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (!value || typeof value !== "object") return "";

    const record = value as Record<string, unknown>;
    const url =
        record.url ||
        record.evidence_url ||
        record.file_url ||
        record.location ||
        record.path;

    return typeof url === "string" ? url.trim() : "";
}

function pickEvidenceName(value: unknown, fallback: string): string {
    if (typeof value === "string") {
        return value.split("?")[0].split("/").filter(Boolean).pop() || fallback;
    }
    if (!value || typeof value !== "object") return fallback;

    const record = value as Record<string, unknown>;
    const name =
        record.name ||
        record.fileName ||
        record.filename ||
        record.originalName;

    return typeof name === "string" && name.trim() ? name.trim() : fallback;
}

function collectAdminEvidenceFiles(report: ReportDetail | null): AdminEvidenceFile[] {
    if (!report) return [];

    const candidates: unknown[] = [
        ...(Array.isArray(report.evidence_urls) ? report.evidence_urls : []),
        ...(Array.isArray(report.section8?.evidence_files) ? report.section8.evidence_files : []),
    ];

    const seen = new Set<string>();
    return candidates.reduce<AdminEvidenceFile[]>((files, item) => {
        const url = pickEvidenceUrl(item);
        if (!url || seen.has(url)) return files;
        seen.add(url);
        files.push({
            url,
            name: pickEvidenceName(item, `Evidence ${files.length + 1}`),
        });
        return files;
    }, []);
}

function AdminFieldBody({ value }: { value: unknown }): ReactNode {
    if (adminValueIsEmpty(value)) {
        return (
            <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                Not provided
            </span>
        );
    }
    if (typeof value === "boolean") {
        return value ? (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Yes
            </span>
        ) : (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                No
            </span>
        );
    }
    if (typeof value === "string") {
        const t = value.trim();
        const lower = t.toLowerCase();
        if (lower === "yes" || lower === "true") {
            return (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Yes
                </span>
            );
        }
        if (lower === "no" || lower === "false") {
            return (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    No
                </span>
            );
        }
        return <span className="text-sm font-medium leading-relaxed text-slate-800">{t}</span>;
    }
    if (typeof value === "number" && !Number.isNaN(value)) {
        return <span className="text-sm font-medium tabular-nums text-slate-800">{value}</span>;
    }
    if (Array.isArray(value)) {
        const parts = value
            .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
            .map((s) => s.trim())
            .filter(Boolean);
        if (!parts.length) {
            return (
                <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    Not provided
                </span>
            );
        }
        return <span className="text-sm font-medium leading-relaxed text-slate-800">{parts.join(", ")}</span>;
    }
    return <span className="text-sm font-medium leading-relaxed text-slate-800">{String(value)}</span>;
}

function SectionCollapseTrigger({
    sectionId,
    isOpen,
    onToggle,
}: {
    sectionId: string;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-expanded={isOpen}
            aria-controls={`${sectionId}-panel`}
            title={isOpen ? "Collapse section" : "Expand section"}
        >
            <ChevronDown className={clsx("h-5 w-5 transition-transform duration-200", isOpen && "-rotate-180")} />
        </button>
    );
}

export default function AdminReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [report, setReport] = useState<ReportDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [showStickyActions, setShowStickyActions] = useState(false);
    const [qualityAlerts, setQualityAlerts] = useState<QualityAlert[]>([]);
    const [section11Audit, setSection11Audit] = useState<ReportCIIauditMeta | null>(null);
    const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(DOSSIER_NAV_SECTIONS.map((s) => [s.id, true])) as Record<string, boolean>,
    );

    const toggleSection = (id: string) => setSectionOpen((prev) => ({ ...prev, [id]: !prev[id] }));
    const expandAllSections = () =>
        setSectionOpen(Object.fromEntries(DOSSIER_NAV_SECTIONS.map((s) => [s.id, true])) as Record<string, boolean>);
    const collapseAllSections = () =>
        setSectionOpen(Object.fromEntries(DOSSIER_NAV_SECTIONS.map((s) => [s.id, false])) as Record<string, boolean>);

    const ciiSnapshot = useMemo(() => {
        if (!report) return null;
        try {
            const persisted = readPersistedCiiSnapshot(report);
            const reqH =
                typeof report.required_hours === "number" && report.required_hours > 0
                    ? report.required_hours
                    : typeof report.opportunity?.hours === "number" && report.opportunity.hours > 0
                      ? report.opportunity.hours
                      : 16;
            const payload = {
                ...report,
                required_hours: reqH,
                project_id:
                    typeof report.project_id === "string" && report.project_id.trim()
                        ? report.project_id
                        : String(report.id),
            } as ReportData;
            const calculated = calculateCII(payload);
            return persisted
                ? {
                      ...calculated,
                      ...persisted,
                      totalScore: Math.round(persisted.totalScore),
                      breakdown: persisted.breakdown ?? calculated.breakdown,
                      suggestions: persisted.suggestions ?? calculated.suggestions,
                  }
                : calculated;
        } catch {
            return null;
        }
    }, [report]);
    const evidenceFiles = useMemo(() => collectAdminEvidenceFiles(report), [report]);
    const sdgMappingRows = useMemo(
        () => (report ? mergeReportSdgSnapshotRows(report, report.section3 as ReportData["section3"]) : []),
        [report],
    );
    const projectContextDisplay = useMemo(() => getReportProjectContextDisplay(report), [report]);

    useEffect(() => {
        fetchReportDetail();
        
        const handleScroll = () => {
            setShowStickyActions(window.scrollY > 600);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [params.reportId]);

    const fetchReportDetail = async () => {
        console.log('📞 ADMIN: Fetching report detail for ID:', params.reportId);
        try {
            setLoading(true);
            const apiUrl = `/api/v1/admin/reports/${params.reportId}`;
            console.log('🌐 API URL:', apiUrl);

            const response = await authenticatedFetch(apiUrl);
            console.log('📡 Response:', response);
            console.log('✅ Response OK?:', response?.ok);

            if (response?.ok) {
                const data = await response.json();
                console.log('📊 Full API Response:', data);
                console.log('📋 Report data:', data.report);
                console.log('📋 Data field:', data.data);

                // Backend might return { success, data } or { report }
                const raw = data.data || data.report || data;
                const scoped = await applyEngagementTeamScopeToReport(raw as Record<string, unknown>);
                const reportData = scoped as unknown as ReportDetail;
                const section11Text = String(reportData?.section11?.summary_text || "").trim();
                const parsedAudit = normalizeAuditMeta(reportData?.section11?.audit_meta, section11Text);
                setReport(reportData);
                setSection11Audit(parsedAudit);
                setQualityAlerts(buildQualityAlerts(reportData, parsedAudit));
            } else {
                const errorText = await response?.text().catch(() => 'No error text');
                console.error('❌ API Error:', response?.status, errorText);
                toast.error('Failed to load report');
            }
        } catch (error) {
            console.error('💥 Error fetching report:', error);
            toast.error('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (action: 'approve' | 'reject', intent: 'decision' | 'editable' = 'decision') => {
        if (action === 'reject' && !feedback.trim()) {
            toast.error(
                intent === 'editable'
                    ? 'Please provide notes so the student knows what to edit'
                    : 'Please provide notes/feedback for rejection',
            );
            return;
        }

        try {
            setIsVerifying(true);
            const userData = JSON.parse(localStorage.getItem('ciel_user') || '{}');

            const response = await authenticatedFetch(`/api/v1/admin/reports/${params.reportId}/verify`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action,
                        feedback: feedback.trim() || undefined,
                        verified_by: userData.id
                    })
                }
            );

            if (response?.ok) {
                toast.success(
                    intent === 'editable'
                        ? 'Report returned to student for edits.'
                        : `Report ${action === 'approve' ? 'approved' : 'rejected'} successfully!`,
                );
                setTimeout(() => router.push('/dashboard/admin/reports/verify'), 1500);
            } else {
                toast.error(intent === 'editable' ? 'Failed to make report editable' : 'Failed to verify report');
            }
        } catch (error) {
            console.error('Verification error:', error);
            toast.error('An error occurred');
        } finally {
            setIsVerifying(false);
        }
    };

    const LabelValue = ({ label, value, fullWidth = false }: { label: string; value: unknown; fullWidth?: boolean }) => (
        <div className={`mb-4 flex flex-col ${fullWidth ? "w-full" : "w-1/2 pr-4"}`}>
            <span className={clsx(adminDossier.microLabel, "mb-1.5 block tracking-wide")}>{label}</span>
            <div className={clsx(adminDossier.inset, "text-justify")}>
                <AdminFieldBody value={value} />
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className={clsx(adminDossier.shell, "flex items-center justify-center p-8")}>
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className={clsx(adminDossier.shell, "flex items-center justify-center p-8")}>
                <div className="text-center">
                    <h2 className="mb-2 text-2xl font-bold text-slate-900">Report Not Found</h2>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={clsx(adminDossier.shell, "p-6 sm:p-8")}>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-white rounded-lg font-medium transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Reports
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-indigo-800">
                            Single-page dossier
                        </span>
                        <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-600">
                            Super admin
                        </span>
                    </div>
                </div>

                {/* Quality Insight Banner */}
                {qualityAlerts.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900 leading-none">Impact Quality Insights</h2>
                                <p className="text-xs text-amber-700 font-bold mt-1 uppercase tracking-wider">
                                    {section11Audit ? "AI-Driven Audit + Automated Checks" : "AI-Driven Automated Checks"}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {qualityAlerts.map((alert, idx) => (
                                <div key={idx} className={clsx(
                                    "p-3 rounded-2xl border flex items-start gap-3 transition-all",
                                    alert.severity === 'error' ? "bg-red-50 border-red-100 text-red-700" : "bg-white border-amber-100 text-amber-700"
                                )}>
                                    <div className={clsx(
                                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                        alert.severity === 'error' ? "bg-red-500" : "bg-amber-500"
                                    )} />
                                    <p className="text-xs font-bold leading-relaxed">{alert.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Student & Opportunity Info */}
                <div className={clsx(adminDossier.cardLg, "p-6 sm:p-8")}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-6">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-slate-100 bg-gradient-to-br from-indigo-600 to-indigo-800 text-2xl font-bold text-white">
                                {report.student.name.charAt(0)}
                            </div>
                            <div>
                                <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">{report.student.name}</h1>
                                <div className="space-y-1 text-sm font-medium text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 shrink-0 text-slate-400" />
                                        <span>{report.student.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                                        <span>{report.student.university}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                                        <span>
                                            Submitted: {new Date(report.submission_date).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
                            {ciiSnapshot ? (
                                <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/90 px-4 py-3 sm:max-w-xs sm:flex-col sm:items-end sm:py-4">
                                    <div className="flex items-center gap-2 text-indigo-800">
                                        <BarChart3 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                                        <span className={clsx(adminDossier.microLabel, "text-indigo-700")}>CII index</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                                            {ciiSnapshot.totalScore}
                                            <span className="text-base font-semibold text-slate-500 sm:text-lg">/100</span>
                                        </p>
                                        <p className="mt-0.5 max-w-[16rem] text-right text-xs font-medium leading-snug text-slate-600 sm:max-w-[14rem]">
                                            {ciiSnapshot.level}
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                            <span
                                className={clsx(
                                    "rounded-xl border px-4 py-2 text-sm font-bold uppercase tracking-wide",
                                    report.status === "verified" && "border-green-200 bg-green-50 text-green-700",
                                    report.status === "submitted" && "border-yellow-200 bg-yellow-50 text-yellow-700",
                                    report.status === "partner_verified" && "border-indigo-200 bg-indigo-50 text-indigo-700",
                                    report.status === "rejected" && "border-red-200 bg-red-50 text-red-700",
                                )}
                            >
                                {report.status === "partner_verified" ? "NGO Verified" : report.status}
                            </span>
                            <div className="flex items-center justify-end gap-2">
                                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    NGO decision
                                </span>
                                <span
                                    className={clsx(
                                        "mt-1 text-[10px] font-semibold uppercase",
                                        report.partner_status === "approved" ? "text-green-600" : "text-slate-400",
                                    )}
                                >
                                    {report.partner_status || "Pending"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Opportunity</p>
                        <p className="text-lg font-bold text-slate-900">{report.opportunity.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{report.opportunity.organization}</p>
                    </div>
                </div>

                {/* Report Content - Unified Scrollable Dossier */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Sticky Table of Contents */}
                    <div className="sticky top-8 space-y-4 lg:col-span-3">
                        <div className={clsx(adminDossier.card, "p-5 sm:p-6")}>
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <h3 className={clsx(adminDossier.microLabel, "flex items-center gap-2 tracking-widest text-slate-400")}>
                                    <List className="h-4 w-4 text-indigo-600" strokeWidth={2} />
                                    Dossier contents
                                </h3>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={expandAllSections}
                                        className="rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 hover:bg-indigo-50"
                                    >
                                        Expand
                                    </button>
                                    <button
                                        type="button"
                                        onClick={collapseAllSections}
                                        className="rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100"
                                    >
                                        Collapse
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                {DOSSIER_NAV_SECTIONS.map((section) => (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => {
                                            const el = document.getElementById(section.id);
                                            el?.scrollIntoView({ behavior: "smooth", block: "start" });
                                        }}
                                        className={adminDossier.tocBtn}
                                    >
                                        <section.icon className={adminDossier.navIcon} strokeWidth={2} />
                                        <span className={adminDossier.navText}>{section.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Status Summary */}
                        <div className={adminDossier.hub}>
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Decision hub</p>
                            <div className="space-y-4">
                                <div className="border-b border-white/10 pb-4">
                                    <p className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-400">
                                        <BarChart3 className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden />
                                        CII index (institutional)
                                    </p>
                                    {ciiSnapshot ? (
                                        <>
                                            <p className="text-2xl font-bold tabular-nums tracking-tight text-white">
                                                {ciiSnapshot.totalScore}
                                                <span className="text-lg font-semibold text-slate-400">/100</span>
                                            </p>
                                            <p className="mt-1 line-clamp-3 text-[11px] font-medium leading-snug text-slate-400">
                                                {ciiSnapshot.level}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm font-medium text-slate-500">—</p>
                                    )}
                                </div>
                                <div>
                                    <p className="mb-1 text-xs font-medium text-slate-400">Reflection competency avg.</p>
                                    <p className="text-2xl font-bold tabular-nums tracking-tight">
                                        {report.section9?.competency_scores
                                            ? (
                                                  Object.values(report.section9.competency_scores as Record<string, unknown>).reduce(
                                                      (a: number, b: unknown) => a + Number(b || 0),
                                                      0,
                                                  ) / 12
                                              ).toFixed(1)
                                            : "0.0"}
                                        <span className="text-lg font-semibold text-slate-500">/5.0</span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const el = document.getElementById("actions");
                                        el?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-black/25 transition-colors hover:bg-indigo-400"
                                >
                                    Jump to action
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* All Sections rendered vertically */}
                    <div className="space-y-6 lg:col-span-9 sm:space-y-7">
                        {/* Section 1 */}
                        <div id="section1" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <Users className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>01. Participation profile</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section1"
                                    isOpen={Boolean(sectionOpen.section1)}
                                    onToggle={() => toggleSection("section1")}
                                />
                            </div>

                            {sectionOpen.section1 ? (
                            <div id="section1-panel" className="space-y-5">
                                <LabelValue label="Participation Type" value={report.section1?.participation_type} />
                                <div className="mt-4">
                                    <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">Team Lead</h3>
                                    <div className="flex flex-wrap">
                                        <LabelValue label="Name" value={report.section1?.team_lead?.name} />
                                        <LabelValue label="University" value={report.section1?.team_lead?.university} />
                                        <LabelValue label="Email" value={report.section1?.team_lead?.email} />
                                        <LabelValue label="Role" value={report.section1?.team_lead?.role} />
                                    </div>
                                </div>
                                {report.section1?.team_members && report.section1.team_members.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">Team Members ({report.section1.team_members.length})</h3>
                                        <div className="space-y-2">
                                            {report.section1.team_members.map((member: any, index: number) => (
                                                <div key={index} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                                    <span className="font-bold text-slate-900">{member.name}</span>
                                                    <span className="text-sm text-slate-600">{member.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {report.section1?.attendance_logs && report.section1.attendance_logs.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className={clsx(adminDossier.microLabel, "mb-3 border-b border-slate-100 pb-2 text-slate-400")}>
                                            Attendance & evidence logs
                                        </h3>
                                        <AttendanceSummaryTable
                                            entries={report.section1.attendance_logs}
                                            isLocked={true}
                                        />
                                    </div>
                                )}
                            </div>
                            ) : null}
                        </div>

                        {/* Section 2 */}
                        <div id="section2" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <FileText className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>02. Project context</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section2"
                                    isOpen={Boolean(sectionOpen.section2)}
                                    onToggle={() => toggleSection("section2")}
                                />
                            </div>

                            {sectionOpen.section2 ? (
                            <div id="section2-panel" className="space-y-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/90 p-5">
                                        <div className={clsx(adminDossier.sectionIcon, "h-10 w-10")}>
                                            <Building2 className="h-5 w-5" strokeWidth={1.75} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={clsx(adminDossier.microLabel, "mb-1 text-slate-400")}>Partner organization</p>
                                            <AdminFieldBody
                                                value={projectContextDisplay.partnerOrganization}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/90 p-5">
                                        <div className={clsx(adminDossier.sectionIcon, "h-10 w-10")}>
                                            <MapPin className="h-5 w-5" strokeWidth={1.75} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={clsx(adminDossier.microLabel, "mb-1 text-slate-400")}>Project location</p>
                                            <AdminFieldBody value={projectContextDisplay.projectLocation} />
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/90 p-5">
                                        <div className={clsx(adminDossier.sectionIcon, "h-10 w-10")}>
                                            <Calendar className="h-5 w-5" strokeWidth={1.75} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={clsx(adminDossier.microLabel, "mb-1 text-slate-400")}>Timeline</p>
                                            <p className="text-sm font-medium text-slate-800">{projectContextDisplay.timelineLabel}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/90 p-5">
                                        <div className={clsx(adminDossier.sectionIcon, "h-10 w-10")}>
                                            <ClockIcon className="h-5 w-5" strokeWidth={1.75} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={clsx(adminDossier.microLabel, "mb-1 text-slate-400")}>Credit hours</p>
                                            <p className="text-sm font-medium text-slate-800">{projectContextDisplay.creditHoursLabel}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-5">
                                    <div className="flex flex-wrap">
                                        <LabelValue label="Discipline" value={report.section2?.discipline} />
                                        <LabelValue label="Problem Statement" value={report.section2?.problem_statement} fullWidth />
                                    </div>
                                </div>
                            </div>
                            ) : null}
                        </div>

                        {/* Section 3 */}
                        <div id="section3" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <Target className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>03. SDG mapping</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section3"
                                    isOpen={Boolean(sectionOpen.section3)}
                                    onToggle={() => toggleSection("section3")}
                                />
                            </div>
                            {sectionOpen.section3 ? (
                            <div id="section3-panel" className="space-y-5">
                                <LabelValue label="Contribution logic / purpose" value={report.section3?.contribution_intent_statement} fullWidth />
                                {sdgMappingRows.length > 0 && (
                                    <div>
                                        <h3 className={clsx(adminDossier.microLabel, "mb-2 border-b border-slate-100 pb-2 text-slate-400")}>
                                            All aligned SDGs
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {sdgMappingRows.map((sdg) => (
                                                <div key={`${sdg.source}-${sdg.role}-${sdg.goalNumber}`} className="rounded-xl border border-slate-100 bg-slate-50/90 p-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="inline-block rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                                            Goal {sdg.goalNumber}
                                                        </span>
                                                        <span className="text-sm font-semibold text-slate-800">{sdg.title}</span>
                                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                            {sdg.source} {sdg.role}
                                                        </span>
                                                    </div>
                                                    {(sdg.targetId || sdg.indicatorId || sdg.justification) && (
                                                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                                            {[sdg.targetId ? `Target ${sdg.targetId}` : "", sdg.indicatorId ? `Indicator ${sdg.indicatorId}` : "", sdg.justification]
                                                                .filter(Boolean)
                                                                .join(" · ")}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            ) : null}
                        </div>

                        {/* Section 4 */}
                        <div id="section4" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <Activity className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>04. Activities & outputs</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section4"
                                    isOpen={Boolean(sectionOpen.section4)}
                                    onToggle={() => toggleSection("section4")}
                                />
                            </div>
                            {sectionOpen.section4 ? (
                            <div id="section4-panel" className="space-y-6">
                                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <h3 className={clsx(adminDossier.microLabel, "border-b border-slate-100 pb-2 text-slate-400")}>
                                            Engagement details
                                        </h3>
                                        <div className="flex flex-wrap">
                                            <LabelValue label="Total Beneficiaries" value={report.section4?.project_summary?.distinct_total_beneficiaries} />
                                            <LabelValue label="Total Sessions" value={report.section4?.total_sessions} />
                                            <LabelValue label="Delivery Mode" value={report.section4?.delivery_mode} />
                                            <LabelValue label="Primary Change Area" value={report.section4?.primary_change_area} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className={clsx(adminDossier.microLabel, "border-b border-slate-100 pb-2 text-slate-400")}>
                                            Core activities
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(report.section4?.activity_blocks ?? []).map((act: any, i: number) => (
                                                <span
                                                    key={i}
                                                    className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900"
                                                >
                                                    {act.type === "Other" ? act.other_text : act.type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className={clsx(adminDossier.microLabel, "border-b border-slate-100 pb-2 text-slate-400")}>
                                        Tangible outputs
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        {report.section4?.outputs?.map((out: any, i: number) => (
                                            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                                                <p className="text-2xl font-bold tabular-nums text-slate-900">{out.count}</p>
                                                <p className={clsx(adminDossier.microLabel, "mt-1 text-slate-400")}>
                                                    {out.type === "Other" ? out.other_text : out.type}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            ) : null}
                        </div>

                        {/* Section 5 */}
                        <div id="section5" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <TrendingUp className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>05. Outcomes</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section5"
                                    isOpen={Boolean(sectionOpen.section5)}
                                    onToggle={() => toggleSection("section5")}
                                />
                            </div>
                            {sectionOpen.section5 ? (
                            <div id="section5-panel" className="flex flex-wrap">
                                <LabelValue label="Observed Change" value={report.section5?.observed_change} fullWidth />
                                <LabelValue label="Challenges" value={report.section5?.challenges} fullWidth />
                            </div>
                            ) : null}
                        </div>

                        {/* Section 6 */}
                        <div id="section6" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <Package className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>06. Resources</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section6"
                                    isOpen={Boolean(sectionOpen.section6)}
                                    onToggle={() => toggleSection("section6")}
                                />
                            </div>
                            {sectionOpen.section6 ? (
                            <div id="section6-panel" className="space-y-5">
                                <LabelValue label="Used external resources" value={report.section6?.use_resources} />
                                {report.section6?.resources && report.section6.resources.length > 0 && (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full text-sm border-collapse border border-slate-200">
                                            <thead>
                                                <tr className="bg-slate-50 text-left">
                                                    <th className="border border-slate-200 p-2">Type</th>
                                                    <th className="border border-slate-200 p-2">Amount</th>
                                                    <th className="border border-slate-200 p-2">Source</th>
                                                    <th className="border border-slate-200 p-2">Purpose</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.section6.resources.map((r: any, i: number) => (
                                                    <tr key={i}>
                                                        <td className="border border-slate-200 p-2">{r.type}</td>
                                                        <td className="border border-slate-200 p-2">{r.amount} {r.unit}</td>
                                                        <td className="border border-slate-200 p-2">{r.sources?.join(', ') || r.source}</td>
                                                        <td className="border border-slate-200 p-2">{r.purpose}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            ) : null}
                        </div>

                        {/* Section 7 */}
                        <div id="section7" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <Handshake className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>07. Partnerships</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section7"
                                    isOpen={Boolean(sectionOpen.section7)}
                                    onToggle={() => toggleSection("section7")}
                                />
                            </div>
                            {sectionOpen.section7 ? (
                            <div id="section7-panel" className="space-y-5">
                                <LabelValue label="Has partners" value={report.section7?.has_partners} />
                                {report.section7?.partners && report.section7.partners.length > 0 && (
                                    <div className="space-y-2">
                                        {report.section7.partners.map((p: any, i: number) => (
                                            <div
                                                key={i}
                                                className="rounded-xl border border-slate-100 bg-slate-50/90 p-3 text-sm text-slate-800"
                                            >
                                                <span className="font-semibold text-slate-900">{p.name}</span>{" "}
                                                <span className="text-slate-500">({p.type})</span>
                                                {p.contribution && (
                                                    <div className="mt-1.5 text-slate-600">Contributions: {p.contribution.join(", ")}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            ) : null}
                        </div>

                        {/* Section 8 */}
                        <div id="section8" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <FileText className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>08. Evidence</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section8"
                                    isOpen={Boolean(sectionOpen.section8)}
                                    onToggle={() => toggleSection("section8")}
                                />
                            </div>
                            {sectionOpen.section8 ? (
                            <div id="section8-panel" className="space-y-5">
                                <LabelValue label="Description" value={report.section8?.description} fullWidth />
                                <LabelValue label="Evidence types" value={report.section8?.evidence_types} fullWidth />

                                <div>
                                    <h3 className={clsx(adminDossier.microLabel, "mb-3 text-slate-400")}>Evidence files</h3>
                                    {evidenceFiles.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                            {evidenceFiles.map((file, index) => (
                                                <a
                                                    key={file.url}
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/90 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/60"
                                                >
                                                    <span className="min-w-0 pr-3 font-semibold text-slate-900 group-hover:text-indigo-800">
                                                        <span className="block truncate">{file.name || `Evidence ${index + 1}`}</span>
                                                        <span className="mt-1 block text-xs font-medium text-slate-500">
                                                            Evidence {index + 1}
                                                        </span>
                                                    </span>
                                                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" />
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={adminDossier.inset}>
                                            <AdminFieldBody value={null} />
                                            <p className="mt-2 text-xs text-slate-500">No files attached to this submission.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            ) : null}
                        </div>

                        {/* Section 9 */}
                        <div id="section9" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <MessageSquare className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>09. Reflection & growth</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section9"
                                    isOpen={Boolean(sectionOpen.section9)}
                                    onToggle={() => toggleSection("section9")}
                                />
                            </div>
                            {sectionOpen.section9 ? (
                            <div id="section9-panel" className="space-y-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                                        <p className={clsx(adminDossier.microLabel, "mb-2 text-indigo-700")}>Academic integration</p>
                                        <AdminFieldBody value={report.section9?.academic_integration} />
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5">
                                        <p className={clsx(adminDossier.microLabel, "mb-2 text-slate-500")}>Competency average (12 items)</p>
                                        <p className="text-lg font-semibold tabular-nums text-slate-900">
                                            {report.section9?.competency_scores
                                                ? (
                                                      Object.values(report.section9.competency_scores as Record<string, unknown>).reduce(
                                                          (a: number, b: unknown) => a + Number(b || 0),
                                                          0,
                                                      ) / 12
                                                  ).toFixed(1)
                                                : "0.0"}{" "}
                                            <span className="text-sm font-medium text-slate-500">/ 5.0</span>
                                        </p>
                                    </div>
                                </div>

                                <LabelValue label="Disciplinary / academic application" value={report.section9?.academic_application} fullWidth />
                                <LabelValue label="Personal learning & insights" value={report.section9?.personal_learning} fullWidth />
                                <LabelValue label="Sustainability & systems reflection" value={report.section9?.sustainability_reflection} fullWidth />
                            </div>
                            ) : null}
                        </div>

                        {/* Section 10 */}
                        <div id="section10" className={clsx(adminDossier.cardLg, "scroll-mt-8 p-6 sm:p-8")}>
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <Activity className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <h2 className={adminDossier.sectionTitle}>10. Sustainability</h2>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section10"
                                    isOpen={Boolean(sectionOpen.section10)}
                                    onToggle={() => toggleSection("section10")}
                                />
                            </div>
                            {sectionOpen.section10 ? (
                            <div id="section10-panel" className="space-y-5">
                                <LabelValue label="Continuation status" value={report.section10?.continuation_status} />
                                <LabelValue label="Mechanisms" value={report.section10?.mechanisms} fullWidth />
                                <LabelValue label="Sustainability details" value={report.section10?.continuation_details} fullWidth />
                            </div>
                            ) : null}
                        </div>

                        {/* Summary View */}
                        <div
                            id="section11"
                            className={clsx(adminDossier.cardLg, "relative scroll-mt-8 overflow-hidden p-8 shadow-md sm:p-10 md:p-12")}
                        >
                            <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className={adminDossier.sectionIcon}>
                                        <FileText className="h-6 w-6" strokeWidth={1.75} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={clsx(adminDossier.microLabel, "mb-1 text-indigo-600")}>Print-ready dossier</p>
                                        <h2 className={adminDossier.sectionTitle}>11. Executive impact dossier</h2>
                                    </div>
                                </div>
                                <SectionCollapseTrigger
                                    sectionId="section11"
                                    isOpen={Boolean(sectionOpen.section11)}
                                    onToggle={() => toggleSection("section11")}
                                />
                            </div>
                            {sectionOpen.section11 ? (
                            <div id="section11-panel" className="relative z-10">
                                <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-[0.04] sm:p-8">
                                    <FileText className="h-48 w-48 text-slate-900 sm:h-64 sm:w-64" />
                                </div>
                                <div className="text-left">
                                    <ReportPrintView projectData={report.opportunity} reportData={{ ...report }} />
                                </div>
                            </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div
                    id="actions"
                    className={clsx(adminDossier.cardLg, "relative mb-20 mt-10 overflow-hidden p-8 shadow-md sm:p-10 md:p-12")}
                >
                    <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-[0.06]">
                        <CheckCircle2 className="h-32 w-32 text-slate-900" />
                    </div>
                    <div className="relative z-10">
                        <p className={clsx(adminDossier.microLabel, "mb-2 text-slate-400")}>Final decision</p>
                        <h3 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Student report approval</h3>
                        <p className="mb-5 text-sm font-medium text-slate-600">
                            Review all sections above before making a final determination on this impact report.
                        </p>
                        {ciiSnapshot ? (
                            <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
                                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-800">
                                    <BarChart3 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                                    CII index
                                </span>
                                <span className="text-xl font-bold tabular-nums text-slate-900">
                                    {ciiSnapshot.totalScore}
                                    <span className="text-sm font-semibold text-slate-500">/100</span>
                                </span>
                                <span className="hidden text-slate-300 sm:inline" aria-hidden>
                                    ·
                                </span>
                                <span className="w-full text-sm font-medium leading-snug text-slate-700 sm:w-auto sm:max-w-xl">
                                    {ciiSnapshot.level}
                                </span>
                            </div>
                        ) : null}

                        <div className="space-y-6">
                            <div>
                                <label className={clsx(adminDossier.microLabel, "mb-3 block text-slate-400")}>
                                    Decision feedback / notes
                                </label>
                                <textarea spellCheck={true}
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Provide detailed feedback for the student..."
                                    className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-sm font-medium text-slate-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 sm:rounded-3xl sm:p-6"
                                />
                                <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                    Required for rejection or edit return; shared with the student upon decision.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => handleVerify("reject", "editable")}
                                    disabled={isVerifying || report.status === "rejected"}
                                    className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 sm:w-auto"
                                    title="Return this report so the student can revise and resubmit it."
                                >
                                    <PencilLine className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                                    {report.status === "rejected" ? "Editable" : "Make editable"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleVerify("approve")}
                                    disabled={isVerifying || report.admin_status === "approved"}
                                    className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 sm:w-auto"
                                >
                                    <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                                    {report.admin_status === "approved" ? "Approved" : "Approve"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleVerify("reject")}
                                    disabled={isVerifying || report.status === "rejected"}
                                    className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 sm:w-auto"
                                >
                                    <XCircle className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                                    {report.status === "rejected" ? "Rejected" : "Reject"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Action Bar for quick access while scrolling */}
            {showStickyActions && !isVerifying && report.admin_status !== "approved" && (
                <div className="animate-in fade-in slide-in-from-bottom-10 fixed bottom-8 left-1/2 z-50 w-full max-w-3xl -translate-x-1/2 px-6 duration-500">
                    <div className="flex items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-slate-900/90 p-4 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl sm:gap-6">
                        <div className="ml-1 flex items-center gap-3 sm:ml-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-indigo-600 text-sm font-bold text-white">
                                {report.student.name.charAt(0)}
                            </div>
                            <div className="hidden min-w-0 md:block">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-300">Approval context</p>
                                <p className="max-w-[200px] truncate text-sm font-semibold text-white">{report.student.name}</p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={() => handleVerify("approve")}
                                className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/25 transition-transform hover:bg-emerald-500 active:scale-95 sm:px-6"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Approve
                            </button>
                            <button
                                type="button"
                                onClick={() => handleVerify("reject")}
                                className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-white/20 active:scale-95 sm:px-6"
                            >
                                <XCircle className="h-3.5 w-3.5 text-red-400" strokeWidth={2} /> Reject
                            </button>
                            <button
                                type="button"
                                onClick={() => handleVerify("reject", "editable")}
                                disabled={report.status === "rejected"}
                                className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-950 shadow-lg shadow-amber-950/20 transition-transform hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 sm:px-6"
                                title="Return this report so the student can revise and resubmit it."
                            >
                                <PencilLine className="h-3.5 w-3.5" strokeWidth={2} /> Editable
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const el = document.getElementById("actions");
                                    el?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="rounded-full p-2.5 text-white transition-colors hover:bg-white/10"
                                title="Notes & full actions"
                            >
                                <MessageSquare className="h-4 w-4" strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
