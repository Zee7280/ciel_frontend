"use client"

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';
import {
    ArrowLeft, CheckCircle2, XCircle, Download, ExternalLink,
    User, Building2, Calendar, Target, Users, Activity,
    TrendingUp, Package, Handshake, FileText, MessageSquare,
    Globe, MapPin, Clock as ClockIcon, AlertTriangle, List
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import ReportPrintView from '../../../student/report/components/ReportPrintView';
import { applyEngagementTeamScopeToReport } from '@/utils/reportTeamScope';
import AttendanceSummaryTable from '../../../student/engagement/components/AttendanceSummaryTable';
import { checkReportQuality, QualityAlert } from '@/utils/reportQuality';
import { readPersistedCiiSnapshot } from '@/utils/reportCiiSnapshot';
import type { ReportData } from '../../../student/report/context/ReportContext';
import { formatSdgGoalPadded, mergeReportSdgSnapshotRows } from '../../../student/report/utils/reportSdgMerge';
import { getReportProjectContextDisplay } from '@/utils/reportProjectContext';
import { VERIFY_DOSSIER_FIELD_GRID } from '@/utils/verifyDossierFieldGrid';

function normalizeKey(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

function isPartnerDecisionFinal(value: unknown): boolean {
    const key = normalizeKey(value);
    return ["approved", "verified", "rejected", "declined", "partner_verified"].includes(key);
}

function isReportDecisionFinal(value: unknown): boolean {
    const key = normalizeKey(value);
    return ["verified", "finalized", "rejected", "partner_verified"].includes(key);
}

/** When to show NGO verify / reject controls. Backend status names vary, so only final decisions should hide the CTA. */
function partnerCanSubmitDecision(report: ReportDetail): boolean {
    const st = normalizeKey(report.status);
    if (st === "draft") return false;
    if (isReportDecisionFinal(report.status)) return false;
    if (isPartnerDecisionFinal(report.admin_status)) return false;

    const ps = normalizeKey(report.partner_status);
    if (isPartnerDecisionFinal(report.partner_status)) return false;
    if (ps === "not_required" || ps === "not_applicable" || ps === "n_a") return false;

    return st !== "";
}

interface ReportDetail {
    id: string;
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
    section1: ReportData["section1"];
    section2: ReportData["section2"];
    section3: ReportData["section3"];
    section4: ReportData["section4"] & Record<string, unknown>;
    section5: ReportData["section5"];
    section6: ReportData["section6"];
    section7: ReportData["section7"];
    section8: ReportData["section8"];
    section9: ReportData["section9"];
    section10: ReportData["section10"];
    section11: ReportData["section11"];
    evidence_urls: string[];
}

type PartnerBlueprintRow = {
    label: string;
    value: unknown;
    fullWidth?: boolean;
};

function partnerValueIsEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") {
        const t = value.trim();
        return !t || ["N/A", "NA", "NONE", "NULL", "UNDEFINED"].includes(t.toUpperCase());
    }
    if (Array.isArray(value)) return value.length === 0 || value.every((v) => partnerValueIsEmpty(v));
    return false;
}

function partnerObjectRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickPartnerValue(records: Record<string, unknown>[], keys: string[]): unknown {
    for (const record of records) {
        for (const key of keys) {
            const value = record[key];
            if (!partnerValueIsEmpty(value)) return value;
        }
    }
    return undefined;
}

function joinPartnerParts(parts: unknown[]): string {
    return parts
        .map((part) => (part === null || part === undefined ? "" : String(part).trim()))
        .filter(Boolean)
        .join(" · ");
}

function formatPartnerFieldValue(value: unknown): string {
    if (partnerValueIsEmpty(value)) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
        const parts = value
            .map((item) => {
                if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return String(item).trim();
                if (item && typeof item === "object") {
                    return Object.entries(item as Record<string, unknown>)
                        .map(([key, entry]) => {
                            if (entry === null || entry === undefined) return "";
                            if (Array.isArray(entry)) {
                                const joined = entry
                                    .map((entryItem) =>
                                        typeof entryItem === "string" || typeof entryItem === "number" || typeof entryItem === "boolean"
                                            ? String(entryItem)
                                            : "",
                                    )
                                    .filter(Boolean)
                                    .join(", ");
                                return joined ? `${key}: ${joined}` : "";
                            }
                            if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") return `${key}: ${entry}`;
                            return "";
                        })
                        .filter(Boolean)
                        .join(" · ");
                }
                return "";
            })
            .filter(Boolean);
        return parts.length ? parts.join(", ") : "N/A";
    }
    if (typeof value === "object") return "N/A";
    return String(value);
}

function partnerRecordArray(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
        ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        : [];
}

function buildPartnerProjectBlueprintRows(report: ReportDetail | null): PartnerBlueprintRow[] {
    if (!report) return [];

    const root = partnerObjectRecord(report);
    const opportunity = partnerObjectRecord(report.opportunity);
    const objectives = partnerObjectRecord(pickPartnerValue([opportunity, root], ["objectives"]));
    const activityDetails = partnerObjectRecord(pickPartnerValue([opportunity, root], ["activity_details", "activityDetails", "activity"]));
    const supervision = partnerObjectRecord(pickPartnerValue([opportunity, root], ["supervision"]));
    const executingContext = partnerObjectRecord(pickPartnerValue([opportunity, root], ["executing_context", "executingContext"]));
    const partnerContext = partnerObjectRecord(pickPartnerValue([executingContext, root], ["partner", "partner_organization", "external_partner_collaboration"]));
    const independentContext = partnerObjectRecord(
        pickPartnerValue([executingContext, root], ["independent_community_activity", "independentCommunityActivity"]),
    );
    const safetyDeclaration = partnerObjectRecord(pickPartnerValue([opportunity, root], ["safety_declaration", "safetyDeclaration"]));
    const location = partnerObjectRecord(pickPartnerValue([opportunity, root], ["location"]));

    const supervisorSummary = joinPartnerParts([
        pickPartnerValue([supervision], ["supervisor_name", "supervisorName", "facultyName"]),
        pickPartnerValue([supervision], ["role", "facultyDesignation"]),
        pickPartnerValue([supervision], ["contact", "facultyOfficialEmail"]),
    ]);
    const partnerSummary = joinPartnerParts([
        pickPartnerValue([partnerContext, supervision], ["organization_name", "organizationName", "partner_org_name", "partnerOrgName"]),
        pickPartnerValue([partnerContext, supervision], ["contact_person", "contactPerson", "partner_contact_person", "partnerContactPerson"]),
        pickPartnerValue([partnerContext, supervision], ["official_email", "officialEmail", "partner_email", "partnerEmail"]),
    ]);
    const independentSummary = joinPartnerParts([
        pickPartnerValue([independentContext, supervision], ["activity_site_description", "activitySiteDescription", "independentSiteDescription"]),
        pickPartnerValue([independentContext, supervision], ["local_contact_person", "localContactPerson", "independentLocalContact"]),
        pickPartnerValue([independentContext, supervision], ["contact_number", "contactNumber", "independentContactPhone"]),
    ]);
    const locationSummary = joinPartnerParts([
        pickPartnerValue([location, opportunity, root], ["city", "district", "location_district", "locationDistrict"]),
        pickPartnerValue([location, opportunity, root], ["venue", "address"]),
    ]);

    return [
        { label: "Opportunity title", value: pickPartnerValue([opportunity, root], ["title", "project_title", "projectTitle"]), fullWidth: true },
        { label: "Project objectives", value: pickPartnerValue([objectives, opportunity, root], ["description", "objective", "objectives_description"]), fullWidth: true },
        { label: "Expected beneficiaries", value: pickPartnerValue([objectives, opportunity, root], ["beneficiaries_count", "beneficiariesCount", "beneficiary_count"]) },
        { label: "Beneficiary type", value: pickPartnerValue([objectives, opportunity, root], ["beneficiaries_type", "beneficiariesType", "beneficiary_type"]) },
        { label: "Student responsibilities", value: pickPartnerValue([activityDetails, opportunity, root], ["student_responsibilities", "studentResponsibilities", "responsibilities"]), fullWidth: true },
        { label: "Skills to be gained", value: pickPartnerValue([activityDetails, opportunity, root], ["skills_gained", "skillsGained", "skills"]) },
        { label: "Mode / location", value: joinPartnerParts([pickPartnerValue([opportunity, root], ["mode"]), locationSummary]) },
        { label: "Faculty supervision", value: supervisorSummary, fullWidth: true },
        { label: "Partner / executing organization", value: partnerSummary, fullWidth: true },
        { label: "Independent community activity", value: independentSummary, fullWidth: true },
        { label: "Safe environment declared", value: pickPartnerValue([safetyDeclaration, supervision], ["environment_safe_and_appropriate", "safe_environment"]) },
        { label: "Faculty oversight declared", value: pickPartnerValue([safetyDeclaration, supervision], ["students_guided_and_supervised", "supervised"]) },
    ].filter((row) => !partnerValueIsEmpty(row.value));
}

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [report, setReport] = useState<ReportDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [qualityAlerts, setQualityAlerts] = useState<QualityAlert[]>([]);
    const ciiSnapshot = useMemo(() => (report ? readPersistedCiiSnapshot(report) : null), [report]);
    const sdgMappingRows = useMemo(
        () => (report ? mergeReportSdgSnapshotRows(report, report.section3 as ReportData["section3"]) : []),
        [report],
    );
    const projectContextDisplay = useMemo(() => getReportProjectContextDisplay(report), [report]);
    const projectBlueprintRows = useMemo(() => buildPartnerProjectBlueprintRows(report), [report]);
    const section4Blocks = useMemo(() => partnerRecordArray(report?.section4?.activity_blocks), [report]);
    const section4Outputs = useMemo(
        () =>
            section4Blocks.flatMap((block, blockIndex) =>
                partnerRecordArray(block.outputs).map((output, outputIndex) => ({
                    blockTitle: pickPartnerValue([block], ["title", "primary_category", "primaryCategory"]) || `Activity ${blockIndex + 1}`,
                    output,
                    key: `${blockIndex}-${outputIndex}`,
                })),
            ),
        [section4Blocks],
    );
    const section4TotalSessions = useMemo(() => {
        const section4 = partnerObjectRecord(report?.section4);
        const explicit = pickPartnerValue([section4], ["total_sessions", "totalSessions"]);
        if (!partnerValueIsEmpty(explicit)) return explicit;
        const total = section4Blocks.reduce((sum, block) => sum + (parseInt(String(block.sessions_count ?? "0"), 10) || 0), 0);
        return total > 0 ? total : section4Blocks.length || undefined;
    }, [report, section4Blocks]);

    useEffect(() => {
        fetchReportDetail();
    }, [params.reportId]);

    const fetchReportDetail = async () => {
        console.log('📞 Fetching report detail for ID:', params.reportId);
        try {
            setLoading(true);
            // Ownership-safe partner detail; same payload shape as admin/student report detail.
            const apiUrl = `/api/v1/partner/reports/${params.reportId}`;
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
                setReport(scoped as unknown as ReportDetail);
                setQualityAlerts(checkReportQuality(scoped));
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

    const handleVerify = async (action: 'approve' | 'reject') => {
        if (action === 'reject' && !feedback.trim()) {
            toast.error('Please provide feedback for rejection');
            return;
        }

        try {
            setIsVerifying(true);
            const userData = JSON.parse(localStorage.getItem('ciel_user') || '{}');

            const notes = feedback.trim() || undefined;
            const response = await authenticatedFetch(`/api/v1/partner/reports/${params.reportId}/verify`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action,
                        feedback: notes,
                        // Some backends read `reason` for reject; both are accepted.
                        ...(notes ? { reason: notes } : {}),
                        verified_by: userData.id
                    })
                }
            );

            if (response?.ok) {
                toast.success(`Report ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
                setTimeout(() => router.push('/dashboard/partner/reports'), 1500);
            } else {
                toast.error('Failed to verify report');
            }
        } catch (error) {
            console.error('Verification error:', error);
            toast.error('An error occurred');
        } finally {
            setIsVerifying(false);
        }
    };

    const sections = [
        { id: 'section1', label: 'Participation Profile', icon: Users },
        { id: 'section2', label: 'Project Context', icon: FileText },
        { id: 'section3', label: 'SDG Mapping', icon: Target },
        { id: 'section4', label: 'Activities & Outputs', icon: Activity },
        { id: 'section5', label: 'Outcomes', icon: TrendingUp },
        { id: 'section6', label: 'Resources', icon: Package },
        { id: 'section7', label: 'Partnerships', icon: Handshake },
        { id: 'section8', label: 'Evidence', icon: FileText },
        { id: 'section9', label: 'Reflection', icon: MessageSquare },
        { id: 'section10', label: 'Sustainability', icon: Activity },
        { id: 'section11', label: 'Summary / Print View', icon: FileText },
    ];

    const LabelValue = ({ label, value, fullWidth = false }: { label: string, value: unknown, fullWidth?: boolean }) => (
        <div className={clsx("mb-4 flex min-w-0 flex-col", fullWidth && "md:col-span-2")}>
            <span className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-1">{label}</span>
            <div className="text-sm text-slate-900 leading-relaxed text-justify">{formatPartnerFieldValue(value)}</div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Report Not Found</h2>
                    <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const canSubmitDecision = partnerCanSubmitDecision(report);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-0 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-white rounded-lg font-medium transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to impact reports
                    </button>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black border border-indigo-200 uppercase tracking-widest">
                            Single-Page Dossier Mode
                        </span>
                        <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black border border-emerald-200 uppercase tracking-widest">
                            NGO / Partner
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
                                <p className="text-xs text-amber-700 font-bold mt-1 uppercase tracking-wider">AI-Driven Automated Checks</p>
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
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                    <div className="flex flex-col items-stretch justify-between gap-5 lg:flex-row lg:items-start">
                        <div className="flex min-w-0 items-start gap-4 sm:gap-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-2xl border-4 border-slate-100">
                                {report.student.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-black text-slate-900 mb-2">{report.student.name}</h1>
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <User className="w-4 h-4" />
                                        <span className="break-all font-medium">{report.student.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Building2 className="w-4 h-4" />
                                        <span className="font-medium">{report.student.university}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Calendar className="w-4 h-4" />
                                        <span className="font-medium">
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

                        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                            {ciiSnapshot ? (
                                <div className="mb-2 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/90 px-4 py-3 text-right">
                                    <TrendingUp className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">CII index</p>
                                        <p className="text-2xl font-black tabular-nums text-slate-900">
                                            {Math.round(ciiSnapshot.totalScore)}
                                            <span className="text-base font-semibold text-slate-500">/100</span>
                                        </p>
                                        <p className="max-w-[12rem] text-xs font-semibold leading-snug text-slate-600">
                                            {ciiSnapshot.level}
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                            <span className={clsx(
                                'px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide border',
                                report.status === 'verified' && 'bg-green-50 text-green-700 border-green-200',
                                report.status === 'partner_verified' && 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                report.status === 'submitted' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                report.status === 'rejected' && 'bg-red-50 text-red-700 border-red-200'
                            )}>
                                {report.status === 'partner_verified' ? 'Verified (Pending Admin)' : report.status}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 mt-1">ADMIN DECISION:</span>
                                <span className={clsx(
                                    'text-[10px] font-black mt-1 uppercase',
                                    report.admin_status === 'approved' ? 'text-green-600' : 'text-slate-400'
                                )}>
                                    {report.admin_status || 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Opportunity</p>
                        <p className="text-lg font-bold text-slate-900">{report.opportunity.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{report.opportunity.organization}</p>
                    </div>
                </div>

                {/* Report Content - Unified Scrollable Dossier */}
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
                    {/* Sticky Table of Contents */}
                    <div className="space-y-4 lg:sticky lg:top-8 lg:col-span-3">
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <List className="w-4 h-4 text-indigo-500" />
                                Dossier Contents
                            </h3>
                            <div className="space-y-1">
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => {
                                            const el = document.getElementById(section.id);
                                            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-slate-50 group text-left"
                                    >
                                        <section.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{section.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* NGO Action Box (Quick Decision) */}
                        {canSubmitDecision && (
                            <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3">Verification Hub</p>
                                <p className="text-sm font-bold text-white mb-4">Approve or reject this report from the NGO side.</p>
                                <textarea
                                    spellCheck={true}
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Notes / rejection reason..."
                                    className="mb-4 min-h-[110px] w-full rounded-2xl border border-indigo-400/40 bg-white/10 p-4 text-sm font-medium text-white placeholder:text-indigo-200 outline-none focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/20"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleVerify('approve')}
                                        disabled={isVerifying}
                                        className="rounded-xl bg-emerald-500 px-3 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-400 disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleVerify('reject')}
                                        disabled={isVerifying}
                                        className="rounded-xl bg-red-500 px-3 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-400 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const el = document.getElementById('actions');
                                        el?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="mt-3 w-full py-2 text-xs font-bold text-indigo-200 transition hover:text-white"
                                >
                                    Open full decision panel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* All Sections rendered vertically */}
                    <div className="lg:col-span-9 space-y-8">
                        {/* Section 1 */}
                        <div id="section1" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">01. Participation Profile</h2>
                                </div>

                                <LabelValue label="Participation Type" value={report.section1?.participation_type} />
                                <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                    <LabelValue label="Privacy Consent" value={report.section1?.privacy_consent} />
                                    <LabelValue label="Faculty Supervisor Email" value={report.section1?.faculty_supervisor_email} />
                                    <LabelValue label="Attendance Verification Status" value={report.section1?.attendance_verification_status} />
                                    <LabelValue label="Attendance Requested At" value={report.section1?.attendance_verification_requested_at} />
                                    <LabelValue label="Attendance Verification Locked" value={report.section1?.attendance_verification_locked} />
                                    <LabelValue label="Email Notified" value={report.section1?.attendance_verification_email_notified} />
                                    <LabelValue label="Review Checklist" value={report.section1?.review_checked} fullWidth />
                                    <LabelValue label="Verified Summary" value={report.section1?.verified_summary} fullWidth />
                                </div>
                                <div className="mt-4">
                                    <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">Team Lead</h3>
                                    <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                        <LabelValue label="Name" value={report.section1?.team_lead?.fullName || report.section1?.team_lead?.name} />
                                        <LabelValue label="CNIC" value={report.section1?.team_lead?.cnic} />
                                        <LabelValue label="Mobile" value={report.section1?.team_lead?.mobile} />
                                        <LabelValue label="University" value={report.section1?.team_lead?.university} />
                                        <LabelValue label="Degree" value={report.section1?.team_lead?.degree} />
                                        <LabelValue label="Year" value={report.section1?.team_lead?.year} />
                                        <LabelValue label="Email" value={report.section1?.team_lead?.email} />
                                        <LabelValue label="Role" value={report.section1?.team_lead?.role} />
                                        <LabelValue label="Hours" value={report.section1?.team_lead?.hours} />
                                        <LabelValue label="Consent" value={report.section1?.team_lead?.consent} />
                                        <LabelValue label="Verified" value={report.section1?.team_lead?.verified} />
                                    </div>
                                </div>
                                {report.section1?.team_members && report.section1.team_members.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">Team Members ({report.section1.team_members.length})</h3>
                                        <div className="space-y-3">
                                            {partnerRecordArray(report.section1.team_members).map((member, index) => (
                                                <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                                                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                                                        <span className="font-bold text-slate-900">{String(member.fullName || member.name || "")}</span>
                                                        <span className="text-sm font-semibold text-slate-600">{String(member.role || "")}</span>
                                                    </div>
                                                    <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                                        <LabelValue label="CNIC" value={member.cnic} />
                                                        <LabelValue label="Mobile" value={member.mobile} />
                                                        <LabelValue label="University" value={member.university} />
                                                        <LabelValue label="Program" value={member.program} />
                                                        <LabelValue label="Hours" value={member.hours} />
                                                        <LabelValue label="Verified" value={member.verified} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {report.section1?.metrics ? (
                                    <div className="mt-4">
                                        <h3 className="font-bold text-slate-800 text-sm mb-3 border-b pb-1 uppercase tracking-widest text-slate-400">Engagement Metrics</h3>
                                        <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                            <LabelValue label="Total Verified Hours" value={report.section1.metrics.total_verified_hours} />
                                            <LabelValue label="Verified Session Count" value={report.section1.metrics.verified_session_count} />
                                            <LabelValue label="Total Active Days" value={report.section1.metrics.total_active_days} />
                                            <LabelValue label="Engagement Span" value={report.section1.metrics.engagement_span} />
                                            <LabelValue label="Attendance Frequency" value={report.section1.metrics.attendance_frequency} />
                                            <LabelValue label="Weekly Continuity" value={report.section1.metrics.weekly_continuity} />
                                            <LabelValue label="EIS Score" value={report.section1.metrics.eis_score} />
                                            <LabelValue label="Engagement Category" value={report.section1.metrics.engagement_category} />
                                            <LabelValue label="HEC Compliance" value={report.section1.metrics.hec_compliance} />
                                            <LabelValue label="Red Flags" value={report.section1.metrics.redFlags} fullWidth />
                                            <LabelValue label="Individual Metrics" value={report.section1.metrics.individual_metrics} fullWidth />
                                            <LabelValue label="Non-Compliant" value={report.section1.metrics.isNonCompliant} />
                                        </div>
                                    </div>
                                ) : null}

                                {report.section1?.attendance_logs && report.section1.attendance_logs.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-1 uppercase tracking-widest text-slate-400">Attendance & Evidence Logs</h3>
                                        <AttendanceSummaryTable
                                            entries={report.section1.attendance_logs}
                                            isLocked={true}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div id="section2" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">02. Project Context</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Partner Organization</p>
                                            <p className="font-bold text-slate-900">{projectContextDisplay.partnerOrganization}</p>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Location</p>
                                            <p className="font-bold text-slate-900">{projectContextDisplay.projectLocation}</p>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timeline</p>
                                            <p className="font-bold text-slate-900">{projectContextDisplay.timelineLabel}</p>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                            <ClockIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Credit Hours</p>
                                            <p className="font-bold text-slate-900">{projectContextDisplay.creditHoursLabel}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 pt-6">
                                    {projectBlueprintRows.length > 0 ? (
                                        <div className="mb-6">
                                            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Opportunity Blueprint</h3>
                                            <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                                {projectBlueprintRows.map((row) => (
                                                    <LabelValue key={row.label} label={row.label} value={row.value} fullWidth={row.fullWidth} />
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                        <LabelValue label="Problem Category" value={report.section2?.problem_category} />
                                        <LabelValue label="Primary Beneficiary" value={report.section2?.primary_beneficiary} />
                                        <LabelValue label="Discipline" value={report.section2?.discipline} />
                                        <LabelValue label="Problem Statement" value={report.section2?.problem_statement} fullWidth />
                                        <LabelValue label="Disciplinary Contribution" value={report.section2?.discipline_contribution} fullWidth />
                                        <LabelValue label="Baseline Evidence" value={report.section2?.baseline_evidence} fullWidth />
                                        <LabelValue label="Baseline Evidence Other" value={report.section2?.baseline_evidence_other} fullWidth />
                                        <LabelValue label="Baseline Other Entries" value={report.section2?.baseline_other_entries} fullWidth />
                                        <LabelValue label="Section Summary" value={report.section2?.summary_text} fullWidth />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div id="section3" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                        <Target className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">03. SDG Mapping</h2>
                                </div>
                                <LabelValue
                                    label="Contribution Logic / Purpose"
                                    value={
                                        report.section3?.contribution_intent_statement ||
                                        partnerObjectRecord(report.section3).primary_sdg_explanation
                                    }
                                    fullWidth
                                />
                                <LabelValue label="Student Contribution Intent" value={report.section3?.student_contribution_intent_statement} fullWidth />
                                <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                    <LabelValue label="Validation Status" value={report.section3?.validation_status} />
                                    <LabelValue label="Summary Stage" value={report.section3?.summary_stage} />
                                    <LabelValue label="Section Summary" value={report.section3?.summary_text} fullWidth />
                                </div>
                                {sdgMappingRows.length > 0 ? (
                                    <div className="mt-4 rounded-[2rem] border-[3px] border-slate-900 bg-slate-50 p-5 sm:p-6">
                                        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">CIEL impact protocol</p>
                                                <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-900">Strategic SDGs</h3>
                                            </div>
                                            <Target className="h-12 w-12 shrink-0 text-slate-900 opacity-10" strokeWidth={1.5} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {sdgMappingRows.map((sdg) => (
                                                <span
                                                    key={`chip-${sdg.source}-${sdg.role}-${sdg.goalNumber}`}
                                                    className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-black leading-none text-white"
                                                >
                                                    SDG {formatSdgGoalPadded(sdg.goalNumber)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                                        No SDG mapping found in this report payload.
                                    </div>
                                )}
                                {sdgMappingRows.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-bold text-slate-800 text-sm mb-2 border-b pb-1">All aligned SDGs</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {sdgMappingRows.map((sdg) => (
                                                <div key={`${sdg.source}-${sdg.role}-${sdg.goalNumber}`} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="inline-block px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded uppercase">Goal {sdg.goalNumber}</span>
                                                        <span className="text-sm font-bold text-slate-800">{sdg.title}</span>
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
                                {Array.isArray(report.section3?.secondary_sdgs) && report.section3.secondary_sdgs.length > 0 ? (
                                    <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                        <LabelValue label="Raw Secondary SDG Entries" value={report.section3.secondary_sdgs} fullWidth />
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Section 4 */}
                        <div id="section4" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">04. Activities & Outputs</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-800 text-sm border-b pb-1 uppercase tracking-widest text-slate-400">Engagement Details</h3>
                                        <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                            <LabelValue label="Total Beneficiaries" value={report.section4?.project_summary?.distinct_total_beneficiaries} />
                                            <LabelValue label="Total Sessions" value={section4TotalSessions} />
                                            <LabelValue label="Counting Method" value={report.section4?.project_summary?.counting_method} />
                                            <LabelValue label="Overall Overlap" value={report.section4?.project_summary?.overall_overlap} />
                                            <LabelValue label="Overall Delivery Mode" value={report.section4?.project_summary?.overall_delivery_mode} />
                                            <LabelValue label="Overall Implementation Model" value={report.section4?.project_summary?.overall_implementation_model} />
                                            <LabelValue label="Overall Geographic Reach" value={report.section4?.project_summary?.overall_geographic_reach} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-800 text-sm border-b pb-1 uppercase tracking-widest text-slate-400">Core Activities</h3>
                                        {section4Blocks.length > 0 ? (
                                            <div className="space-y-3">
                                                {section4Blocks.map((act, i) => (
                                                    <div key={String(act.id ?? i)} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                                                        <p className="mb-3 text-sm font-black text-slate-900">{String(act.title || `Activity ${i + 1}`)}</p>
                                                        <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                                            <LabelValue label="Primary Category" value={act.primary_category} />
                                                            <LabelValue label="Sub-Category" value={act.sub_category} />
                                                            <LabelValue label="Other Category" value={act.other_category_text} />
                                                            <LabelValue label="Status" value={act.status} />
                                                            <LabelValue label="Delivery Mode" value={act.delivery_mode} />
                                                            <LabelValue label="Implementation Models" value={act.implementation_models} />
                                                            <LabelValue label="Sessions Count" value={act.sessions_count} />
                                                            <LabelValue label="Geographic Reach" value={act.geographic_reach} />
                                                            <LabelValue label="Geographic Sub-Category" value={act.geographic_sub_category} />
                                                            <LabelValue label="Description" value={act.description} fullWidth />
                                                            <LabelValue label="Delivery Explanation" value={act.delivery_explanation} fullWidth />
                                                            <LabelValue label="Serves Beneficiaries" value={act.serves_beneficiaries} />
                                                            <LabelValue label="Beneficiaries Reached" value={act.beneficiaries_reached} />
                                                            <LabelValue label="Beneficiary Categories" value={act.beneficiary_categories} fullWidth />
                                                            <LabelValue label="Relevance Types" value={act.relevance_types} fullWidth />
                                                            <LabelValue label="Overlap Status" value={act.overlap_status} />
                                                            <LabelValue label="Beneficiary Description" value={act.beneficiary_description} fullWidth />
                                                            <LabelValue label="Site Note" value={act.site_note} fullWidth />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <span className="text-sm text-slate-400 italic">No activities logged</span>}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 text-sm border-b pb-1 uppercase tracking-widest text-slate-400">Tangible Outputs</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {section4Outputs.length > 0 ? section4Outputs.map(({ blockTitle, output, key }) => (
                                            <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-sm font-black text-slate-900">{String(output.title || "Output")}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{String(blockTitle)}</p>
                                                <div className={clsx("mt-3", VERIFY_DOSSIER_FIELD_GRID)}>
                                                    <LabelValue label="Type" value={output.type} />
                                                    <LabelValue label="Quantity" value={output.quantity} />
                                                    <LabelValue label="Unit" value={output.unit} />
                                                    <LabelValue label="Shared" value={output.is_shared} />
                                                    <LabelValue label="Verification Note" value={output.verification_note} fullWidth />
                                                </div>
                                            </div>
                                        )) : <p className="text-sm text-slate-400 italic col-span-full">No outputs listed</p>}
                                    </div>
                                </div>
                                <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                    <LabelValue label="Project Implementation Explanation" value={report.section4?.project_summary?.project_implementation_explanation} fullWidth />
                                    <LabelValue label="Section Summary" value={report.section4?.summary_text} fullWidth />
                                </div>
                            </div>
                        </div>

                        {/* Section 5 */}
                        <div id="section5" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">05. Outcomes</h2>
                                </div>
                                <div className="space-y-6">
                                    {Array.isArray(report.section5?.measurable_outcomes) && report.section5.measurable_outcomes.length > 0 ? (
                                        <div className="space-y-4">
                                            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-widest text-slate-400">
                                                Measurable outcome details
                                            </h3>
                                            <div className="grid grid-cols-1 gap-4">
                                                {partnerRecordArray(report.section5.measurable_outcomes).map((outcome, index) => (
                                                    <div key={String(outcome?.id ?? index)} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-5">
                                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outcome {index + 1}</p>
                                                                <p className="mt-1 text-base font-bold text-slate-900">
                                                                    {String(outcome?.metric_other || outcome?.metric || outcome?.outcome_area_other || outcome?.outcome_area || "Measured outcome")}
                                                                </p>
                                                            </div>
                                                            <span className="rounded-full border border-indigo-100 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                                                {Array.isArray(outcome?.confidence_level) && outcome.confidence_level.length
                                                                    ? outcome.confidence_level.join(", ")
                                                                    : String(outcome?.confidence_level || "Confidence not provided")}
                                                            </span>
                                                        </div>
                                                        <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                                            <LabelValue label="Outcome area" value={outcome?.outcome_area_other || outcome?.outcome_area} />
                                                            <LabelValue label="Metric category" value={outcome?.metric_category} />
                                                            <LabelValue label="Outcome sub-category" value={outcome?.outcome_sub_category} />
                                                            <LabelValue label="Unit" value={outcome?.unit_other || outcome?.unit} />
                                                            <LabelValue label="Baseline" value={outcome?.baseline} />
                                                            <LabelValue label="Endline / achieved" value={outcome?.endline} />
                                                            <LabelValue label="Measurement explanation" value={outcome?.measurement_explanation} fullWidth />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                        <LabelValue label="Observed Change" value={report.section5?.observed_change} fullWidth />
                                        <LabelValue label="Challenges" value={report.section5?.challenges} fullWidth />
                                        <LabelValue label="Section Summary" value={report.section5?.summary_text} fullWidth />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 6 */}
                        <div id="section6" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">06. Resources</h2>
                                </div>
                                <LabelValue label="Used External Resources" value={report.section6?.use_resources} />
                                {report.section6?.resources && report.section6.resources.length > 0 && (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="min-w-[620px] w-full border-collapse border border-slate-200 text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 text-left">
                                                    <th className="border border-slate-200 p-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                                    <th className="border border-slate-200 p-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                                    <th className="border border-slate-200 p-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Source</th>
                                                    <th className="border border-slate-200 p-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Purpose</th>
                                                    <th className="border border-slate-200 p-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Verification</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {partnerRecordArray(report.section6.resources).map((r, i) => (
                                                    <tr key={i}>
                                                        <td className="border border-slate-200 p-2 font-bold">{String(r.type_other || r.type || "")}</td>
                                                        <td className="border border-slate-200 p-2">{String(r.amount || "")} {String(r.unit_other || r.unit || "")}</td>
                                                        <td className="border border-slate-200 p-2">
                                                            {[...(Array.isArray(r.sources) ? r.sources : []), r.source_other || r.source]
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                        </td>
                                                        <td className="border border-slate-200 p-2 text-justify">{String(r.purpose || "")}</td>
                                                        <td className="border border-slate-200 p-2">{Array.isArray(r.verification) ? r.verification.join(", ") : String(r.verification || "")}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                    <LabelValue label="Resource Evidence Files" value={report.section6?.evidence_files} fullWidth />
                                    <LabelValue label="Section Summary" value={report.section6?.summary_text} fullWidth />
                                </div>
                            </div>
                        </div>

                        {/* Section 7 */}
                        <div id="section7" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                        <Handshake className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">07. Partnerships</h2>
                                </div>
                                <LabelValue label="Has Partners" value={report.section7?.has_partners} />
                                {report.section7?.partners && report.section7.partners.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {partnerRecordArray(report.section7.partners).map((p, i) => (
                                            <div key={i} className="text-sm border border-slate-200 p-4 rounded-2xl bg-slate-50">
                                                <div className="flex items-center justify-between mb-1">
                                                    <strong className="text-slate-900">{String(p.name || "")}</strong>
                                                    <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded border border-slate-100 uppercase text-slate-400">{String(p.type_other || p.type || "")}</span>
                                                </div>
                                                {Boolean(p.role) && <div className="mt-1 text-slate-600 text-xs">Role: {Array.isArray(p.role) ? p.role.join(", ") : String(p.role)}</div>}
                                                {Boolean(p.contribution) && <div className="mt-1 text-slate-600 text-xs">Contributions: {Array.isArray(p.contribution) ? p.contribution.join(", ") : String(p.contribution)}</div>}
                                                {Boolean(p.verification) && <div className="mt-1 text-slate-600 text-xs">Verification: {String(p.verification)}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                    <LabelValue label="Formalization Status" value={report.section7?.formalization_status} fullWidth />
                                    <LabelValue label="Formalization Files" value={report.section7?.formalization_files} fullWidth />
                                    <LabelValue label="Section Summary" value={report.section7?.summary_text} fullWidth />
                                </div>
                            </div>
                        </div>

                        {/* Section 8 */}
                        <div id="section8" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">08. Evidence</h2>
                                </div>
                                <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                    <LabelValue label="Has Evidence" value={report.section8?.has_evidence} />
                                    <LabelValue label="Media Visibility" value={report.section8?.media_visible} />
                                    <LabelValue label="Partner Verification" value={report.section8?.partner_verification} />
                                    <LabelValue label="Partner Verification Type" value={report.section8?.partner_verification_type} />
                                </div>
                                <LabelValue label="Description" value={report.section8?.description} fullWidth />
                                {report.section8?.evidence_types && (
                                    <LabelValue label="Evidence Types" value={report.section8.evidence_types} fullWidth />
                                )}
                                <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                    <LabelValue label="Authentic Evidence" value={report.section8?.ethical_compliance?.authentic} />
                                    <LabelValue label="Informed Consent" value={report.section8?.ethical_compliance?.informed_consent} />
                                    <LabelValue label="No Harm" value={report.section8?.ethical_compliance?.no_harm} />
                                    <LabelValue label="Privacy Respected" value={report.section8?.ethical_compliance?.privacy_respected} />
                                    <LabelValue label="Partner Verification Files" value={report.section8?.partner_verification_files} fullWidth />
                                    <LabelValue label="Section Summary" value={report.section8?.summary_text} fullWidth />
                                </div>

                                <div className="mt-4">
                                    <h3 className="font-bold text-slate-800 text-sm mb-3">Evidence Files</h3>
                                    {report.evidence_urls && report.evidence_urls.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            {report.evidence_urls.map((url, index) => (
                                                <a
                                                    key={index}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-between group border border-slate-100"
                                                >
                                                    <span className="font-bold text-slate-900 group-hover:text-indigo-600">Evidence {index + 1}</span>
                                                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 italic text-sm">No evidence files uploaded</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 9 */}
                        <div id="section9" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">09. Reflection & Growth</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Impact Score (Average)</p>
                                        <p className="font-bold text-slate-900">
                                            {report.section9?.competency_scores
                                                ? (
                                                      Object.values(report.section9.competency_scores as Record<string, unknown>).reduce(
                                                          (a: number, b: unknown) => a + Number(b || 0),
                                                          0,
                                                      ) / 12
                                                  ).toFixed(1)
                                                : "0.0"}{" "}
                                            / 5.0
                                        </p>
                                    </div>
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Academic Level</p>
                                        <p className="font-bold text-slate-900">{report.section9?.academic_integration || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <LabelValue label="Academic Connection" value={report.section9?.academic_application} fullWidth />
                                    <LabelValue label="Personal Growth" value={report.section9?.personal_learning} fullWidth />
                                    <LabelValue label="Systems Reflection" value={report.section9?.sustainability_reflection} fullWidth />
                                </div>
                                {report.section9?.competency_scores ? (
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-widest text-slate-400">
                                            Individual Competency Scores
                                        </h3>
                                        <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                            {Object.entries(report.section9.competency_scores as Record<string, unknown>).map(([key, value]) => (
                                                <LabelValue key={key} label={key.replace(/_/g, " ")} value={value} />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                <LabelValue label="Section Summary" value={report.section9?.summary_text} fullWidth />
                            </div>
                        </div>

                        {/* Section 10 */}
                        <div id="section10" className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900">10. Sustainability</h2>
                                </div>
                                <div className={VERIFY_DOSSIER_FIELD_GRID}>
                                    <LabelValue label="Continuation Status" value={report.section10?.continuation_status} />
                                    {report.section10?.mechanisms && (
                                        <LabelValue label="Mechanisms" value={report.section10.mechanisms} fullWidth />
                                    )}
                                    <LabelValue label="Sustainability Details" value={report.section10?.continuation_details} fullWidth />
                                    <LabelValue label="Scaling Potential" value={report.section10?.scaling_potential} fullWidth />
                                    <LabelValue label="Policy Influence" value={report.section10?.policy_influence} fullWidth />
                                    <LabelValue label="Section Summary" value={report.section10?.summary_text} fullWidth />
                                </div>
                            </div>
                        </div>

                        {/* Summary View */}
                        <div id="section11" className="relative scroll-mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl sm:rounded-[3rem] sm:p-12">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <FileText className="w-64 h-64 text-slate-900" />
                            </div>
                            <div className="relative z-10 text-center">
                                <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-50 border border-indigo-100 rounded-full mb-6">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Premium Impact Dossier</span>
                                </div>
                                <h2 className="text-4xl font-black mb-12 text-slate-900 leading-tight text-center">Executive Impact Dossier</h2>
                                <div className="text-left">
                                    <ReportPrintView projectData={report.opportunity} reportData={{ ...report }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {canSubmitDecision && (
                    <div id="actions" className="relative mt-12 mb-20 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl sm:rounded-[3rem] sm:p-12">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <CheckCircle2 className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-black text-slate-900 mb-2">Impact Decision Hub</h3>
                            <p className="text-slate-500 font-medium mb-8">
                                Review the student&apos;s impact dossier above before providing your organization&apos;s verification.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Verification Feedback / Notes</label>
                                    <textarea spellCheck={true}
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Provide feedback for the student and CIEL admin..."
                                        className="w-full min-h-[160px] rounded-[2rem] border border-slate-200 p-6 focus:outline-none focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400 bg-slate-50/50 text-slate-900 font-medium transition-all"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wider italic">* Required for rejection, shared with the student and admin.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <button
                                        onClick={() => handleVerify('approve')}
                                        disabled={isVerifying}
                                        className="flex flex-col items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-bold p-8 transition-all shadow-xl shadow-indigo-900/20 disabled:opacity-50 group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg leading-tight">Verify Report</p>
                                            <p className="text-[10px] opacity-70 font-black uppercase tracking-widest mt-1">Confirm Impact</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleVerify('reject')}
                                        disabled={isVerifying}
                                        className="flex flex-col items-center gap-3 border-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 rounded-[2rem] font-bold p-8 transition-all disabled:opacity-50 group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-red-200/50 flex items-center justify-center group-hover:scale-110 transition-transform text-red-600">
                                            <XCircle className="w-6 h-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg leading-tight">Reject Report</p>
                                            <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mt-1">Needs Revision</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!canSubmitDecision && normalizeKey(report.partner_status) === "approved" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 mt-8 mb-16 text-emerald-900 text-sm font-medium">
                        Your organization has already verified this report. If you need changes, contact CIEL support so the report can be reopened for edits.
                    </div>
                )}
            </div>
        </div>
    );
}
