"use client"

import { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch } from '@/utils/api';
import { CheckCircle2, XCircle, Clock, FileText, Search, Building2, Eye, ChevronDown, ArrowUpDown, RefreshCw, Loader2, Download, GitMerge } from 'lucide-react';
import { downloadAdminReportAiPayload, regenerateAdminReportAiScore } from '@/utils/adminRegenerateReportAiScore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import clsx from 'clsx';
import { normalizeReportPartnerStatus } from '@/utils/reportPartnerApprovalDisplay';
import { isReportReturnedForRevision } from '@/utils/reportRevisionState';

function formatDisplayName(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .map((part) =>
            part.length ? part.charAt(0).toLocaleUpperCase() + part.slice(1).toLowerCase() : part
        )
        .join(' ');
}

interface Report {
    id: string;
    student_id?: string;
    opportunity_id?: string | null;
    project_id?: string | null;
    student_name: string;
    student_email: string;
    project_title: string;
    organization_id?: string | null;
    organization_name?: string;
    submission_date: string;
    submitted_at?: string;
    report_submitted_at?: string;
    created_at: string;
    status: string;
    partner_status: string;
    admin_status: string;
    cii_score?: number | null;
    participation_mode?: 'individual' | 'team';
    team_member_count?: number;
    team_lead?: { name: string; email: string; student_id?: string | null } | null;
    team_members?: Array<{ name: string; email: string; is_team_lead?: boolean }>;
}

function reportProjectKey(report: Report): string {
    const key = String(report.opportunity_id ?? report.project_id ?? "").trim().toLowerCase();
    return key;
}

type ReportStatusFilter = 'all' | 'submitted' | 'pending' | 'verified' | 'rejected';
type PartnerStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type SortOption = 'submitted_newest' | 'submitted_oldest' | 'student_az' | 'project_az';

function normalizeStatus(value: string | null | undefined): string {
    if (!value) return '';
    return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function reportSubmittedMs(report: Report): number {
    const raw =
        report.report_submitted_at ||
        report.submitted_at ||
        report.submission_date ||
        report.created_at;
    const ms = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(ms) ? ms : 0;
}

function reportMatchesTab(report: Report, tab: ReportStatusFilter): boolean {
    if (tab === 'all') return true;
    const statuses = [
        normalizeStatus(report.status),
        normalizeStatus(report.admin_status),
        normalizeStatus(report.partner_status),
    ].filter(Boolean);

    if (tab === 'pending') {
        return statuses.some((status) =>
            status.includes('pending') ||
            status.includes('submitted') ||
            status.includes('under_review') ||
            status.includes('awaiting') ||
            status === 'draft',
        );
    }
    if (tab === 'submitted') {
        return statuses.some((status) => status === 'submitted' || status.includes('under_review'));
    }
    if (tab === 'verified') {
        return statuses.some((status) =>
            status === 'verified' || status === 'approved' || status === 'partner_verified',
        );
    }
    if (tab === 'rejected') {
        return (
            isReportReturnedForRevision(report) ||
            statuses.some((status) => status === 'rejected' || status === 'revision')
        );
    }
    return true;
}

function reportMatchesPartnerFilter(report: Report, filter: PartnerStatusFilter): boolean {
    if (filter === 'all') return true;
    const ps = normalizeReportPartnerStatus(report.partner_status);
    if (ps === 'not_applicable' || ps === 'not_required' || ps === 'n_a') {
        return filter === 'approved';
    }
    if (filter === 'pending') {
        return ps.includes('pending') || ps === 'submitted' || ps === 'draft' || !ps;
    }
    if (filter === 'approved') {
        return ps === 'approved' || ps.includes('verified');
    }
    if (filter === 'rejected') return ps === 'rejected';
    return true;
}

function extractOrganizationsList(payload: unknown): { id: string; name: string }[] {
    if (!payload || typeof payload !== 'object') return [];
    const o = payload as Record<string, unknown>;
    const raw =
        (Array.isArray(o.data) && o.data) ||
        (Array.isArray(o.organizations) && o.organizations) ||
        (Array.isArray(payload) && payload) ||
        [];
    return (raw as unknown[])
        .map((row) => {
            if (!row || typeof row !== 'object') return null;
            const r = row as Record<string, unknown>;
            const id = String(r.id ?? '').trim();
            const name = String(r.name ?? r.organization_name ?? '').trim();
            if (!id || !name) return null;
            return { id, name };
        })
        .filter((x): x is { id: string; name: string } => x !== null);
}

export default function AdminReportsVerificationPage() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ReportStatusFilter>('pending');
    const [partnerFilter, setPartnerFilter] = useState<PartnerStatusFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('submitted_newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
    const [refreshingReportIds, setRefreshingReportIds] = useState<Record<string, boolean>>({});
    const [downloadingAiPayloadIds, setDownloadingAiPayloadIds] = useState<Record<string, boolean>>({});
    const [ciiScores, setCiiScores] = useState<Record<string, number>>({});
    const [mergePanelOpen, setMergePanelOpen] = useState(false);
    const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);
    const [mergeKeepId, setMergeKeepId] = useState("");
    const [mergeSubmitting, setMergeSubmitting] = useState(false);

    useEffect(() => {
        void fetchOrganizations();
    }, []);

    useEffect(() => {
        void fetchReports();
    }, [selectedOrg]);

    const fetchOrganizations = async () => {
        try {
            const response = await authenticatedFetch(`/api/v1/admin/organizations`, {}, { redirectToLogin: false });
            if (response?.ok) {
                const data = await response.json();
                setOrganizations(extractOrganizationsList(data));
            }
        } catch (error) {
            console.error('Error fetching organizations:', error);
        }
    };

    const fetchReports = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();
            params.set('page', '1');
            params.set('limit', '500');
            if (selectedOrg && selectedOrg !== 'all') {
                params.set('organizationId', selectedOrg);
            }

            const apiUrl = `/api/v1/admin/reports?${params.toString()}`;
            const response = await authenticatedFetch(apiUrl, {}, { redirectToLogin: false });

            if (response?.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.data)) {
                    const rows = data.data as Report[];
                    setReports(rows);
                    setCiiScores((prev) => {
                        const next = { ...prev };
                        for (const row of rows) {
                            if (typeof row.cii_score === 'number' && Number.isFinite(row.cii_score)) {
                                next[row.id] = Math.round(row.cii_score);
                            }
                        }
                        return next;
                    });
                } else if (Array.isArray(data)) {
                    setReports(data as Report[]);
                } else {
                    setReports([]);
                }
            } else {
                toast.error('Failed to load reports');
                setReports([]);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Failed to load reports');
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const config = {
            submitted: { color: 'bg-yellow-50 text-yellow-700', icon: Clock, label: 'Submitted' },
            partner_verified: { color: 'bg-indigo-50 text-indigo-700', icon: CheckCircle2, label: 'NGO Verified' },
            verified: { color: 'bg-green-50 text-green-700', icon: CheckCircle2, label: 'Verified' },
            rejected: { color: 'bg-red-50 text-red-700', icon: XCircle, label: 'Rejected' },
            draft: { color: 'bg-slate-100 text-slate-600', icon: FileText, label: 'Draft' },
            pending: { color: 'bg-amber-50 text-amber-700', icon: Clock, label: 'Pending' },
            approved: { color: 'bg-green-50 text-green-600', icon: CheckCircle2, label: 'Approved' },
            not_applicable: { color: 'bg-slate-50 text-slate-500', icon: CheckCircle2, label: 'Not required' },
            not_required: { color: 'bg-slate-50 text-slate-500', icon: CheckCircle2, label: 'Not required' },
        };

        const key = normalizeStatus(status) || normalizeReportPartnerStatus(status);
        const { color, icon: Icon, label } =
            config[key as keyof typeof config] || config.draft;

        return (
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', color)}>
                <Icon className="h-3.5 w-3.5" />
                {label}
            </span>
        );
    };

    const filteredReports = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
        const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

        const selectedOrgName =
            selectedOrg !== 'all'
                ? organizations.find((o) => o.id === selectedOrg)?.name?.trim().toLowerCase()
                : null;

        let list = reports.filter((report) => {
            const matchesSearch =
                !q ||
                report.student_name.toLowerCase().includes(q) ||
                report.student_email.toLowerCase().includes(q) ||
                report.project_title.toLowerCase().includes(q) ||
                (report.organization_name && report.organization_name.toLowerCase().includes(q));

            const matchesTab = reportMatchesTab(report, activeTab);
            const matchesPartner = reportMatchesPartnerFilter(report, partnerFilter);

            const submittedMs = reportSubmittedMs(report);
            const matchesFrom = fromMs == null || submittedMs >= fromMs;
            const matchesTo = toMs == null || submittedMs <= toMs;

            let matchesOrg = true;
            if (selectedOrg !== 'all') {
                const byId = report.organization_id && report.organization_id === selectedOrg;
                const byName =
                    selectedOrgName &&
                    report.organization_name?.trim().toLowerCase() === selectedOrgName;
                matchesOrg = Boolean(byId || byName);
            }

            return matchesSearch && matchesTab && matchesPartner && matchesFrom && matchesTo && matchesOrg;
        });

        list = [...list].sort((a, b) => {
            if (sortBy === 'submitted_newest') {
                return reportSubmittedMs(b) - reportSubmittedMs(a);
            }
            if (sortBy === 'submitted_oldest') {
                return reportSubmittedMs(a) - reportSubmittedMs(b);
            }
            if (sortBy === 'student_az') {
                return a.student_name.localeCompare(b.student_name);
            }
            if (sortBy === 'project_az') {
                return a.project_title.localeCompare(b.project_title);
            }
            return 0;
        });

        return list;
    }, [
        reports,
        searchQuery,
        activeTab,
        partnerFilter,
        sortBy,
        dateFrom,
        dateTo,
        selectedOrg,
        organizations,
    ]);

    const statusOptions = [
        { id: 'pending', label: 'Pending' },
        { id: 'submitted', label: 'Submitted' },
        { id: 'all', label: 'All Reports' },
        { id: 'verified', label: 'Verified' },
        { id: 'rejected', label: 'Rejected' },
    ] as const;

    const handleDownloadAiPayload = async (reportId: string) => {
        if (downloadingAiPayloadIds[reportId]) return;

        setDownloadingAiPayloadIds((prev) => ({ ...prev, [reportId]: true }));
        try {
            const result = await downloadAdminReportAiPayload(reportId);
            if (!result.success) {
                toast.error(result.error || 'Failed to download AI payload');
                return;
            }
            toast.success('AI payload JSON downloaded');
        } catch (error) {
            console.error('AI payload download failed:', error);
            toast.error('Failed to download AI payload');
        } finally {
            setDownloadingAiPayloadIds((prev) => {
                const next = { ...prev };
                delete next[reportId];
                return next;
            });
        }
    };

    const handleRefreshAiScore = async (reportId: string) => {
        if (refreshingReportIds[reportId]) return;

        setRefreshingReportIds((prev) => ({ ...prev, [reportId]: true }));
        try {
            toast.info('Running AI audit — may take up to 3 minutes.');
            const result = await regenerateAdminReportAiScore(reportId);
            if (!result.success) {
                toast.error(result.error || 'Failed to refresh AI score');
                return;
            }
            if (typeof result.score === 'number') {
                setCiiScores((prev) => ({ ...prev, [reportId]: result.score as number }));
                setReports((prev) =>
                    prev.map((row) =>
                        row.id === reportId ? { ...row, cii_score: result.score ?? row.cii_score } : row,
                    ),
                );
            }
            toast.success(
                typeof result.score === 'number'
                    ? `CII score updated (${result.score}/100)`
                    : 'CII score updated',
            );
        } catch (error) {
            console.error('List AI score refresh failed:', error);
            toast.error('AI scoring failed');
        } finally {
            setRefreshingReportIds((prev) => {
                const next = { ...prev };
                delete next[reportId];
                return next;
            });
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setSelectedOrg('all');
        setActiveTab('pending');
        setPartnerFilter('all');
        setSortBy('submitted_newest');
        setDateFrom('');
        setDateTo('');
    };

    const toggleMergeReport = (reportId: string, checked: boolean) => {
        setMergeSelectedIds((prev) => {
            const next = checked ? [...new Set([...prev, reportId])] : prev.filter((id) => id !== reportId);
            setMergeKeepId((keep) => (keep && next.includes(keep) ? keep : ""));
            return next;
        });
    };

    const mergeProjectKey =
        mergeSelectedIds.length > 0
            ? reportProjectKey(reports.find((r) => r.id === mergeSelectedIds[0]) ?? { id: "", student_name: "", student_email: "", project_title: "", submission_date: "", created_at: "", status: "", partner_status: "", admin_status: "" })
            : "";

    const mergeSelectionSameProject =
        mergeSelectedIds.length >= 2 &&
        mergeSelectedIds.every((id) => {
            const row = reports.find((r) => r.id === id);
            return row && reportProjectKey(row) === mergeProjectKey && mergeProjectKey !== "";
        });

    const handleMergeReports = async () => {
        if (mergeSelectedIds.length < 2) {
            toast.error("Select at least two reports to merge.");
            return;
        }
        if (!mergeKeepId || !mergeSelectedIds.includes(mergeKeepId)) {
            toast.error("Choose which report to keep.");
            return;
        }
        if (!mergeSelectionSameProject) {
            toast.error("Selected reports must belong to the same project.");
            return;
        }
        const keeper = reports.find((r) => r.id === mergeKeepId);
        if (
            !window.confirm(
                `Merge ${mergeSelectedIds.length - 1} duplicate report(s) into the keeper for ${keeper?.student_name ?? "student"} / ${keeper?.project_title ?? "project"}?\n\nOther rows will be deleted. Verified or admin-approved duplicates are blocked.`,
            )
        ) {
            return;
        }
        setMergeSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/reports/merge`, {
                method: "POST",
                body: JSON.stringify({
                    report_ids: mergeSelectedIds,
                    keep_report_id: mergeKeepId,
                }),
            });
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res && res.ok) {
                toast.success(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Reports merged",
                );
                setMergeSelectedIds([]);
                setMergeKeepId("");
                setMergePanelOpen(false);
                await fetchReports();
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not merge reports",
                );
            }
        } catch {
            toast.error("Could not merge reports");
        } finally {
            setMergeSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Student Reports Verification
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 sm:text-base">
                        Review and verify student activity reports — newest submissions appear first
                    </p>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, project, organization..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            />
                        </div>
                        <div className="relative w-full xl:w-44 shrink-0">
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value as ReportStatusFilter)}
                                className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        <div className="relative w-full xl:w-44 shrink-0">
                            <select
                                value={partnerFilter}
                                onChange={(e) => setPartnerFilter(e.target.value as PartnerStatusFilter)}
                                className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            >
                                <option value="all">NGO: All</option>
                                <option value="pending">NGO: Pending</option>
                                <option value="approved">NGO: Approved</option>
                                <option value="rejected">NGO: Rejected</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        <div className="relative w-full xl:w-52 shrink-0">
                            <Building2 className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <select
                                value={selectedOrg}
                                onChange={(e) => setSelectedOrg(e.target.value)}
                                className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-12 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            >
                                <option value="all">All Organizations</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
                        <div className="relative w-full sm:w-auto">
                            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="h-11 w-full sm:w-56 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                            >
                                <option value="submitted_newest">Newest submitted first</option>
                                <option value="submitted_oldest">Oldest submitted first</option>
                                <option value="student_az">Student A → Z</option>
                                <option value="project_az">Project A → Z</option>
                            </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="font-medium whitespace-nowrap">Submitted from</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
                            />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="font-medium whitespace-nowrap">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                            Reset Filters
                        </button>
                        <p className="text-sm text-slate-500 lg:ml-auto">
                            Showing <span className="font-semibold text-slate-800">{filteredReports.length}</span>
                            {reports.length !== filteredReports.length ? ` of ${reports.length}` : ''} reports
                        </p>
                    </div>
                    <div className="rounded-2xl border border-violet-200/80 bg-violet-50/40 p-4">
                        <button
                            type="button"
                            onClick={() => setMergePanelOpen((v) => !v)}
                            className="flex w-full items-center justify-between gap-2 text-left"
                        >
                            <span className="inline-flex items-center gap-2 text-sm font-bold text-violet-900">
                                <GitMerge className="h-4 w-4" />
                                Merge duplicate reports
                            </span>
                            <span className="text-xs font-semibold text-violet-700">{mergePanelOpen ? "Hide" : "Show"}</span>
                        </button>
                        {mergePanelOpen ? (
                            <div className="mt-3 space-y-3">
                                <p className="text-xs leading-relaxed text-slate-600">
                                    Select rows for the <strong>same project</strong>, mark which report to keep, then merge.
                                    Duplicate drafts are removed; empty sections on the keeper are filled from removed rows when possible.
                                </p>
                                {mergeSelectedIds.length >= 2 && !mergeSelectionSameProject ? (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                                        Selected reports must share the same project id — uncheck rows from a different opportunity.
                                    </p>
                                ) : null}
                                <button
                                    type="button"
                                    disabled={mergeSubmitting || !mergeSelectionSameProject || !mergeKeepId}
                                    onClick={() => void handleMergeReports()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {mergeSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Merging…
                                        </>
                                    ) : (
                                        <>
                                            <GitMerge className="h-4 w-4" />
                                            Merge {mergeSelectedIds.length || 0} reports
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="rounded-[28px] border border-slate-200 bg-white p-16 text-center shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Reports Found</h3>
                        <p className="text-slate-500 font-medium">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-[980px] w-full">
                            <thead className="border-b border-slate-200 bg-slate-100/80">
                                <tr className="text-left">
                                    {mergePanelOpen ? (
                                        <th className="w-12 px-3 py-4 text-sm font-semibold text-slate-600">Merge</th>
                                    ) : null}
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Team</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Project</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Organization</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Submitted</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">NGO Status</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">CII Score</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Overall</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReports.map((report) => {
                                    const mergeChecked = mergeSelectedIds.includes(report.id);
                                    const mergeKeep = mergeKeepId === report.id;
                                    return (
                                    <tr key={report.id} className="align-top transition-colors hover:bg-slate-50/60">
                                        {mergePanelOpen ? (
                                            <td className="px-3 py-5 align-middle">
                                                <div className="flex flex-col items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={mergeChecked}
                                                        onChange={(e) => toggleMergeReport(report.id, e.target.checked)}
                                                        aria-label={`Select report ${report.id}`}
                                                        className="h-4 w-4 rounded border-slate-300"
                                                    />
                                                    {mergeChecked ? (
                                                        <label className="inline-flex flex-col items-center gap-1 text-[10px] font-bold text-violet-800">
                                                            <input
                                                                type="radio"
                                                                name="merge-keep-report"
                                                                checked={mergeKeep}
                                                                onChange={() => setMergeKeepId(report.id)}
                                                                className="h-3.5 w-3.5"
                                                            />
                                                            Keep
                                                        </label>
                                                    ) : null}
                                                </div>
                                            </td>
                                        ) : null}
                                        <td className="px-6 py-5">
                                            <div className="font-semibold text-slate-900">{formatDisplayName(report.student_name)}</div>
                                            <div className="mt-1 text-sm text-slate-500 break-all">{report.student_email}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {report.participation_mode === 'team' ? (
                                                <div className="space-y-1 text-sm">
                                                    <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800">
                                                        Team · {report.team_member_count ?? report.team_members?.length ?? '—'} members
                                                    </span>
                                                    {report.team_lead?.name ? (
                                                        <div className="text-xs text-slate-600">
                                                            Lead:{' '}
                                                            <span className="font-semibold text-slate-800">
                                                                {formatDisplayName(report.team_lead.name)}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <span className="text-xs font-medium text-slate-400">Individual</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="max-w-[240px] break-words text-base font-medium text-slate-700">
                                                {report.project_title}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex max-w-[180px] break-words rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                                                {report.organization_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-sm text-slate-700">
                                                {reportSubmittedMs(report) > 0
                                                    ? new Date(reportSubmittedMs(report)).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })
                                                    : '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1">{getStatusBadge(report.partner_status)}</div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="min-w-[2.5rem] text-sm font-bold tabular-nums text-indigo-700">
                                                    {typeof ciiScores[report.id] === 'number'
                                                        ? `${ciiScores[report.id]}/100`
                                                        : typeof report.cii_score === 'number'
                                                          ? `${Math.round(report.cii_score)}/100`
                                                          : '—'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleRefreshAiScore(report.id)}
                                                    disabled={Boolean(refreshingReportIds[report.id])}
                                                    title="Refresh AI CII score"
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {refreshingReportIds[report.id] ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                                    ) : (
                                                        <RefreshCw className="h-4 w-4" aria-hidden />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDownloadAiPayload(report.id)}
                                                    disabled={Boolean(downloadingAiPayloadIds[report.id])}
                                                    title="Download JSON sent to AI (section11)"
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {downloadingAiPayloadIds[report.id] ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                                    ) : (
                                                        <Download className="h-4 w-4" aria-hidden />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1">{getStatusBadge(report.status)}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/dashboard/admin/reports/verify/${report.id}`)}
                                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Review
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                                })}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
