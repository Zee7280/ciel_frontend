"use client"

import { useCallback, useEffect, useMemo, useState } from 'react';
import { authenticatedFetch } from '@/utils/api';
import { CheckCircle2, XCircle, Clock, FileText, Search, Building2, Eye, ChevronDown, ArrowUpDown, RefreshCw, Loader2, Download, GitMerge, Copy, Filter, X } from 'lucide-react';
import { downloadAdminReportAiPayload, regenerateAdminReportAiScore } from '@/utils/adminRegenerateReportAiScore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import clsx from 'clsx';
import DataTable from 'react-data-table-component';
import type { TableColumn } from 'react-data-table-component';
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

/** Same student + same project — rows admins usually merge together. */
function reportDuplicateGroupKey(report: Report): string {
    const projectKey = reportProjectKey(report);
    if (!projectKey) return "";
    const studentKey = String(report.student_id ?? report.student_email ?? "").trim().toLowerCase();
    if (!studentKey) return projectKey;
    return `${studentKey}::${projectKey}`;
}

type ReportStatusFilter = 'all' | 'submitted' | 'pending' | 'verified' | 'rejected';
type PartnerStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type SortOption =
    | 'submitted_newest'
    | 'submitted_oldest'
    | 'student_az'
    | 'project_az'
    | 'duplicates_first';

type DuplicateGroup = {
    key: string;
    reports: Report[];
    studentName: string;
    projectTitle: string;
};

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

function reportOverallStatus(report: Report): string {
    return normalizeStatus(report.status);
}

function reportAdminStatus(report: Report): string {
    return normalizeStatus(report.admin_status);
}

function isReportAdminVerified(report: Report): boolean {
    const overall = reportOverallStatus(report);
    const admin = reportAdminStatus(report);
    return (
        admin === 'approved' ||
        overall === 'verified' ||
        overall === 'paid' ||
        overall === 'partner_verified'
    );
}

/** Overall status tab — uses lifecycle fields only (NGO has its own filter). */
function reportMatchesTab(report: Report, tab: ReportStatusFilter): boolean {
    if (tab === 'all') return true;

    if (isReportReturnedForRevision(report)) {
        return tab === 'rejected';
    }

    const overall = reportOverallStatus(report);

    if (tab === 'verified') {
        return isReportAdminVerified(report);
    }

    if (tab === 'rejected') {
        return false;
    }

    if (tab === 'submitted') {
        return overall === 'submitted' || overall.includes('under_review');
    }

    if (tab === 'pending') {
        if (isReportAdminVerified(report)) return false;
        return (
            overall === 'draft' ||
            overall === 'submitted' ||
            overall === 'pending' ||
            overall.includes('under_review') ||
            overall.includes('awaiting') ||
            reportAdminStatus(report) === 'pending' ||
            !reportAdminStatus(report)
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

function formatOrganizationLabel(name: string | undefined | null): { short: string; full: string } {
    const full = (name || 'N/A').trim();
    let short = full
        .replace(/^Student opportunity\s*[—-]\s*/i, '')
        .replace(/\s*[—-]\s*[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i, '')
        .replace(/\s*[—-]\s*[0-9a-f]{8}$/i, '')
        .trim();
    if (!short) short = full;
    if (short.length > 48) short = `${short.slice(0, 46)}…`;
    return { short, full };
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

const REPORTS_TABLE_STYLES = {
    table: {
        style: {
            minWidth: '1180px',
        },
    },
    tableWrapper: {
        style: {
            display: 'block',
            overflowX: 'auto' as const,
            WebkitOverflowScrolling: 'touch' as const,
        },
    },
    headRow: {
        style: {
            backgroundColor: '#f8fafc',
            borderBottomWidth: '1px',
            borderBottomColor: '#e2e8f0',
            minHeight: '44px',
        },
    },
    headCells: {
        style: {
            paddingLeft: '14px',
            paddingRight: '14px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            color: '#64748b',
        },
    },
    rows: {
        style: {
            minHeight: '58px',
            fontSize: '13px',
            color: '#334155',
            borderBottomWidth: '1px',
            borderBottomColor: '#f1f5f9',
        },
    },
    cells: {
        style: {
            paddingLeft: '14px',
            paddingRight: '14px',
            paddingTop: '10px',
            paddingBottom: '10px',
        },
    },
    pagination: {
        style: {
            borderTopWidth: '1px',
            borderTopColor: '#e2e8f0',
            minHeight: '52px',
            fontSize: '13px',
            color: '#64748b',
        },
    },
};

export default function AdminReportsVerificationPage() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [totalLoadedReports, setTotalLoadedReports] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ReportStatusFilter>('pending');
    const [partnerFilter, setPartnerFilter] = useState<PartnerStatusFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('submitted_newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [tablePage, setTablePage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
    const [refreshingReportIds, setRefreshingReportIds] = useState<Record<string, boolean>>({});
    const [downloadingAiPayloadIds, setDownloadingAiPayloadIds] = useState<Record<string, boolean>>({});
    const [ciiScores, setCiiScores] = useState<Record<string, number>>({});
    const [mergePanelOpen, setMergePanelOpen] = useState(false);
    const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);
    const [mergeKeepId, setMergeKeepId] = useState("");
    const [mergeSubmitting, setMergeSubmitting] = useState(false);
    const [duplicatesOnly, setDuplicatesOnly] = useState(false);

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

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);

            const allRows: Report[] = [];
            let page = 1;
            let totalPages = 1;
            const pageSize = 200;

            while (page <= totalPages) {
                const params = new URLSearchParams();
                params.set('page', String(page));
                params.set('limit', String(pageSize));
                if (selectedOrg && selectedOrg !== 'all') {
                    params.set('organizationId', selectedOrg);
                }

                const apiUrl = `/api/v1/admin/reports?${params.toString()}`;
                const response = await authenticatedFetch(apiUrl, {}, { redirectToLogin: false });

                if (!response?.ok) {
                    toast.error('Failed to load reports');
                    setReports([]);
                    setTotalLoadedReports(0);
                    return;
                }

                const data = await response.json();
                const rows = Array.isArray(data?.data) ? (data.data as Report[]) : Array.isArray(data) ? (data as Report[]) : [];
                allRows.push(...rows);

                const pagination = data?.pagination as
                    | { total?: number; total_pages?: number }
                    | undefined;
                totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
                if (typeof pagination?.total === 'number') {
                    setTotalLoadedReports(pagination.total);
                } else {
                    setTotalLoadedReports(allRows.length);
                }

                if (rows.length === 0) break;
                page += 1;
            }

            setReports(allRows);
            setCiiScores((prev) => {
                const next = { ...prev };
                for (const row of allRows) {
                    if (typeof row.cii_score === 'number' && Number.isFinite(row.cii_score)) {
                        next[row.id] = Math.round(row.cii_score);
                    }
                }
                return next;
            });
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Failed to load reports');
            setReports([]);
            setTotalLoadedReports(0);
        } finally {
            setLoading(false);
        }
    }, [selectedOrg]);

    useEffect(() => {
        void fetchOrganizations();
    }, []);

    useEffect(() => {
        void fetchReports();
    }, [fetchReports]);

    useEffect(() => {
        setTablePage(1);
    }, [searchQuery, activeTab, partnerFilter, sortBy, dateFrom, dateTo, selectedOrg, duplicatesOnly]);

    const getStatusBadge = (status: string, compact = false) => {
        const config = {
            submitted: { color: 'bg-amber-50 text-amber-800 ring-amber-200/60', icon: Clock, label: 'Submitted' },
            partner_verified: { color: 'bg-indigo-50 text-indigo-800 ring-indigo-200/60', icon: CheckCircle2, label: 'NGO Verified' },
            verified: { color: 'bg-emerald-50 text-emerald-800 ring-emerald-200/60', icon: CheckCircle2, label: 'Verified' },
            rejected: { color: 'bg-red-50 text-red-700 ring-red-200/60', icon: XCircle, label: 'Rejected' },
            draft: { color: 'bg-slate-100 text-slate-600 ring-slate-200/80', icon: FileText, label: 'Draft' },
            pending: { color: 'bg-amber-50 text-amber-800 ring-amber-200/60', icon: Clock, label: 'Pending' },
            approved: { color: 'bg-emerald-50 text-emerald-800 ring-emerald-200/60', icon: CheckCircle2, label: 'Approved' },
            not_applicable: { color: 'bg-slate-50 text-slate-500 ring-slate-200/80', icon: CheckCircle2, label: 'N/A' },
            not_required: { color: 'bg-slate-50 text-slate-500 ring-slate-200/80', icon: CheckCircle2, label: 'N/A' },
        };

        const key = normalizeStatus(status) || normalizeReportPartnerStatus(status);
        const { color, icon: Icon, label } =
            config[key as keyof typeof config] || config.draft;

        return (
            <span
                className={clsx(
                    'inline-flex items-center gap-1 rounded-md font-semibold ring-1 ring-inset whitespace-nowrap',
                    compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
                    color,
                )}
            >
                <Icon className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />
                {label}
            </span>
        );
    };

    const duplicateAnalysis = useMemo(() => {
        const byGroup = new Map<string, Report[]>();
        for (const report of reports) {
            const key = reportDuplicateGroupKey(report);
            if (!key) continue;
            const bucket = byGroup.get(key) ?? [];
            bucket.push(report);
            byGroup.set(key, bucket);
        }

        const duplicateGroups: DuplicateGroup[] = [];
        const countByReportId = new Map<string, number>();

        for (const [key, groupReports] of byGroup) {
            if (groupReports.length < 2) continue;
            for (const report of groupReports) {
                countByReportId.set(report.id, groupReports.length);
            }
            const sample = groupReports[0];
            duplicateGroups.push({
                key,
                reports: [...groupReports].sort((a, b) => reportSubmittedMs(b) - reportSubmittedMs(a)),
                studentName: sample.student_name,
                projectTitle: sample.project_title,
            });
        }

        duplicateGroups.sort((a, b) => {
            const byCount = b.reports.length - a.reports.length;
            if (byCount !== 0) return byCount;
            return a.studentName.localeCompare(b.studentName);
        });

        return {
            duplicateGroups,
            duplicateReportCount: countByReportId.size,
            countByReportId,
        };
    }, [reports]);

    const filteredReports = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
        const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

        let list = reports.filter((report) => {
            const matchesSearch =
                !q ||
                report.student_name.toLowerCase().includes(q) ||
                report.student_email.toLowerCase().includes(q) ||
                report.project_title.toLowerCase().includes(q) ||
                (report.organization_name && report.organization_name.toLowerCase().includes(q)) ||
                (report.organization_id && report.organization_id.toLowerCase().includes(q)) ||
                (report.opportunity_id && report.opportunity_id.toLowerCase().includes(q)) ||
                (report.project_id && report.project_id.toLowerCase().includes(q));

            const matchesTab = reportMatchesTab(report, activeTab);
            const matchesPartner = reportMatchesPartnerFilter(report, partnerFilter);

            const submittedMs = reportSubmittedMs(report);
            const hasSubmittedDate = submittedMs > 0;
            const matchesFrom = !dateFrom || (hasSubmittedDate && submittedMs >= (fromMs ?? 0));
            const matchesTo = !dateTo || (hasSubmittedDate && submittedMs <= (toMs ?? Number.MAX_SAFE_INTEGER));

            const duplicateCount = duplicateAnalysis.countByReportId.get(report.id) ?? 0;
            const matchesDuplicatesOnly = !duplicatesOnly || duplicateCount >= 2;

            return matchesSearch && matchesTab && matchesPartner && matchesFrom && matchesTo && matchesDuplicatesOnly;
        });

        list = [...list].sort((a, b) => {
            if (sortBy === 'duplicates_first') {
                const countA = duplicateAnalysis.countByReportId.get(a.id) ?? 0;
                const countB = duplicateAnalysis.countByReportId.get(b.id) ?? 0;
                if (countA !== countB) return countB - countA;
                const groupCmp = reportDuplicateGroupKey(a).localeCompare(reportDuplicateGroupKey(b));
                if (groupCmp !== 0) return groupCmp;
                return reportSubmittedMs(b) - reportSubmittedMs(a);
            }
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
        duplicatesOnly,
        duplicateAnalysis,
    ]);

    const statusOptions = [
        { id: 'pending', label: 'Needs review' },
        { id: 'submitted', label: 'Submitted only' },
        { id: 'all', label: 'All reports' },
        { id: 'verified', label: 'Verified' },
        { id: 'rejected', label: 'Revision / rejected' },
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
        setDuplicatesOnly(false);
        setTablePage(1);
    };

    const showDuplicatesWorkflow = () => {
        setDuplicatesOnly(true);
        setSortBy('duplicates_first');
        setActiveTab('all');
        setMergePanelOpen(true);
    };

    const selectDuplicateGroup = (group: DuplicateGroup) => {
        const ids = group.reports.map((r) => r.id);
        setMergeSelectedIds(ids);
        const keeper =
            group.reports.find((r) => {
                const st = normalizeStatus(r.status);
                const adm = normalizeStatus(r.admin_status);
                return st === 'verified' || st === 'paid' || adm === 'approved';
            }) ?? group.reports[0];
        setMergeKeepId(keeper.id);
        setMergePanelOpen(true);
    };

    const hasActiveFilters =
        searchQuery.trim() !== '' ||
        selectedOrg !== 'all' ||
        activeTab !== 'pending' ||
        partnerFilter !== 'all' ||
        sortBy !== 'submitted_newest' ||
        dateFrom !== '' ||
        dateTo !== '' ||
        duplicatesOnly;

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

    const tableColumns = useMemo((): TableColumn<Report>[] => {
        const cols: TableColumn<Report>[] = [];

        if (mergePanelOpen) {
            cols.push({
                name: 'Merge',
                width: '64px',
                center: true,
                cell: (report) => {
                    const mergeChecked = mergeSelectedIds.includes(report.id);
                    const mergeKeep = mergeKeepId === report.id;
                    return (
                        <div className="flex flex-col items-center gap-1.5">
                            <input
                                type="checkbox"
                                checked={mergeChecked}
                                onChange={(e) => toggleMergeReport(report.id, e.target.checked)}
                                aria-label={`Select report ${report.id}`}
                                className="h-4 w-4 rounded border-slate-300 text-violet-600"
                            />
                            {mergeChecked ? (
                                <label className="inline-flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700">
                                    <input
                                        type="radio"
                                        name="merge-keep-report"
                                        checked={mergeKeep}
                                        onChange={() => setMergeKeepId(report.id)}
                                        className="h-3 w-3"
                                    />
                                    Keep
                                </label>
                            ) : null}
                        </div>
                    );
                },
            });
        }

        cols.push(
            {
                name: 'Student',
                width: '200px',
                sortable: true,
                sortFunction: (a, b) => a.student_name.localeCompare(b.student_name),
                cell: (report) => {
                    const duplicateCount = duplicateAnalysis.countByReportId.get(report.id) ?? 0;
                    const isDuplicateRow = duplicateCount >= 2;
                    return (
                        <div className="min-w-[180px] max-w-[220px]">
                            <div className="truncate text-sm font-semibold text-slate-900" title={formatDisplayName(report.student_name)}>
                                {formatDisplayName(report.student_name)}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-slate-500" title={report.student_email}>
                                {report.student_email}
                            </div>
                            {isDuplicateRow ? (
                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
                                    <Copy className="h-2.5 w-2.5" />
                                    {duplicateCount}× duplicate
                                </span>
                            ) : null}
                        </div>
                    );
                },
            },
            {
                name: 'Team',
                width: '130px',
                cell: (report) =>
                    report.participation_mode === 'team' ? (
                        <div className="min-w-[120px] max-w-[150px] space-y-1">
                            <span className="inline-flex rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-800 ring-1 ring-inset ring-violet-200">
                                Team · {report.team_member_count ?? report.team_members?.length ?? '—'}
                            </span>
                            {report.team_lead?.name ? (
                                <div className="truncate text-[11px] text-slate-600" title={formatDisplayName(report.team_lead.name)}>
                                    Lead: <span className="font-medium text-slate-800">{formatDisplayName(report.team_lead.name)}</span>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <span className="text-[11px] font-medium text-slate-400">Individual</span>
                    ),
            },
            {
                name: 'Project',
                width: '220px',
                sortable: true,
                sortFunction: (a, b) => a.project_title.localeCompare(b.project_title),
                cell: (report) => (
                    <div
                        className="line-clamp-2 min-w-[200px] max-w-[240px] text-sm font-medium leading-snug text-slate-800"
                        title={report.project_title}
                    >
                        {report.project_title}
                    </div>
                ),
            },
            {
                name: 'Organization',
                width: '170px',
                cell: (report) => {
                    const org = formatOrganizationLabel(report.organization_name);
                    return (
                        <div
                            className="line-clamp-2 min-w-[150px] max-w-[180px] text-xs leading-snug text-slate-600"
                            title={org.full}
                        >
                            {org.short}
                        </div>
                    );
                },
            },
            {
                name: 'Submitted',
                width: '108px',
                sortable: true,
                sortFunction: (a, b) => reportSubmittedMs(a) - reportSubmittedMs(b),
                cell: (report) => (
                    <span className="whitespace-nowrap text-xs font-medium tabular-nums text-slate-700">
                        {reportSubmittedMs(report) > 0
                            ? new Date(reportSubmittedMs(report)).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                              })
                            : '—'}
                    </span>
                ),
            },
            {
                name: 'NGO',
                width: '100px',
                cell: (report) => getStatusBadge(report.partner_status, true),
            },
            {
                name: 'CII',
                width: '140px',
                minWidth: '140px',
                cell: (report) => (
                    <div className="flex items-center gap-1">
                        <span className="w-10 text-xs font-bold tabular-nums text-indigo-700">
                            {typeof ciiScores[report.id] === 'number'
                                ? `${ciiScores[report.id]}`
                                : typeof report.cii_score === 'number'
                                  ? `${Math.round(report.cii_score)}`
                                  : '—'}
                        </span>
                        <button
                            type="button"
                            onClick={() => void handleRefreshAiScore(report.id)}
                            disabled={Boolean(refreshingReportIds[report.id])}
                            title="Refresh AI CII score"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-violet-200/80 bg-violet-50 text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {refreshingReportIds[report.id] ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleDownloadAiPayload(report.id)}
                            disabled={Boolean(downloadingAiPayloadIds[report.id])}
                            title="Download AI payload JSON"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {downloadingAiPayloadIds[report.id] ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                                <Download className="h-3.5 w-3.5" aria-hidden />
                            )}
                        </button>
                    </div>
                ),
            },
            {
                name: 'Overall',
                width: '108px',
                minWidth: '108px',
                cell: (report) => getStatusBadge(report.status, true),
            },
            {
                name: '',
                width: '96px',
                minWidth: '96px',
                right: true,
                cell: (report) => (
                    <button
                        type="button"
                        onClick={() => router.push(`/dashboard/admin/reports/verify/${report.id}`)}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        Review
                    </button>
                ),
            },
        );

        return cols;
    }, [
        mergePanelOpen,
        mergeSelectedIds,
        mergeKeepId,
        duplicateAnalysis.countByReportId,
        ciiScores,
        refreshingReportIds,
        downloadingAiPayloadIds,
        router,
    ]);

    return (
        <div className="min-w-0 w-full max-w-full">
            <div className="mx-auto max-w-[1600px] space-y-5">
                <div className="border-b border-slate-200/80 pb-5">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Student Reports Verification
                    </h1>
                    <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
                        Review submissions, verify impact reports, and merge duplicate rows when needed.
                    </p>
                </div>

                {duplicateAnalysis.duplicateGroups.length > 0 ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                                <Copy className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-amber-950">
                                    {duplicateAnalysis.duplicateGroups.length} duplicate group
                                    {duplicateAnalysis.duplicateGroups.length === 1 ? '' : 's'} found
                                </p>
                                <p className="mt-0.5 text-xs text-amber-900/80">
                                    {duplicateAnalysis.duplicateReportCount} report rows share the same student + project
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={showDuplicatesWorkflow}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
                        >
                            <Filter className="h-4 w-4" />
                            Show duplicates only
                        </button>
                    </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm space-y-3 sm:p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12 xl:items-center xl:gap-3">
                        <div className="relative min-w-0 md:col-span-2 xl:col-span-5">
                            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, project, organization..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div className="relative min-w-0 xl:col-span-2">
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value as ReportStatusFilter)}
                                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        <div className="relative min-w-0 xl:col-span-2">
                            <select
                                value={partnerFilter}
                                onChange={(e) => setPartnerFilter(e.target.value as PartnerStatusFilter)}
                                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="all">NGO: All</option>
                                <option value="pending">NGO: Pending</option>
                                <option value="approved">NGO: Approved</option>
                                <option value="rejected">NGO: Rejected</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                        <div className="relative min-w-0 md:col-span-2 xl:col-span-3">
                            <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={selectedOrg}
                                onChange={(e) => setSelectedOrg(e.target.value)}
                                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="all">All Organizations</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="relative w-full min-w-0 sm:w-auto sm:min-w-[13rem] sm:flex-1 sm:max-w-xs">
                            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="h-9 w-full sm:w-52 appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="submitted_newest">Newest submitted first</option>
                                <option value="submitted_oldest">Oldest submitted first</option>
                                <option value="duplicates_first">Duplicates first (grouped)</option>
                                <option value="student_az">Student A → Z</option>
                                <option value="project_az">Project A → Z</option>
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDuplicatesOnly((v) => !v)}
                            className={clsx(
                                'inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition shadow-sm sm:w-auto',
                                duplicatesOnly
                                    ? 'border-violet-300 bg-violet-50 text-violet-900'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                            )}
                        >
                            <Copy className="h-4 w-4" />
                            Duplicates only
                            {duplicateAnalysis.duplicateReportCount > 0 ? (
                                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                    {duplicateAnalysis.duplicateReportCount}
                                </span>
                            ) : null}
                        </button>
                        <label className="flex w-full min-w-0 items-center gap-2 text-xs text-slate-600 sm:w-auto">
                            <span className="font-medium whitespace-nowrap">From</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:flex-none sm:w-auto"
                            />
                        </label>
                        <label className="flex w-full min-w-0 items-center gap-2 text-xs text-slate-600 sm:w-auto">
                            <span className="font-medium whitespace-nowrap">To</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:flex-none sm:w-auto"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
                        >
                            Reset
                        </button>
                        <p className="w-full text-xs text-slate-500 sm:ml-auto sm:w-auto sm:text-right">
                            <span className="font-semibold text-slate-800">{filteredReports.length}</span>
                            {reports.length !== filteredReports.length ? ` of ${reports.length}` : ''} shown
                            {totalLoadedReports > reports.length ? ` · ${totalLoadedReports} total` : ''}
                        </p>
                    </div>
                    {hasActiveFilters ? (
                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active</span>
                            {duplicatesOnly ? (
                                <button
                                    type="button"
                                    onClick={() => setDuplicatesOnly(false)}
                                    className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800"
                                >
                                    Duplicates only
                                    <X className="h-3 w-3" />
                                </button>
                            ) : null}
                            {activeTab !== 'pending' ? (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('pending')}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                                >
                                    Status: {statusOptions.find((o) => o.id === activeTab)?.label}
                                    <X className="h-3 w-3" />
                                </button>
                            ) : null}
                            {partnerFilter !== 'all' ? (
                                <button
                                    type="button"
                                    onClick={() => setPartnerFilter('all')}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                                >
                                    NGO: {partnerFilter}
                                    <X className="h-3 w-3" />
                                </button>
                            ) : null}
                            {selectedOrg !== 'all' ? (
                                <button
                                    type="button"
                                    onClick={() => setSelectedOrg('all')}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                                >
                                    Org filter
                                    <X className="h-3 w-3" />
                                </button>
                            ) : null}
                            {searchQuery.trim() ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                                >
                                    Search
                                    <X className="h-3 w-3" />
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    <div className="rounded-xl border border-violet-200/60 bg-violet-50/30 p-3">
                        <button
                            type="button"
                            onClick={() => setMergePanelOpen((v) => !v)}
                            className="flex w-full items-center justify-between gap-2 text-left"
                        >
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-violet-900">
                                <GitMerge className="h-4 w-4" />
                                Merge duplicate reports
                                {duplicateAnalysis.duplicateGroups.length > 0 ? (
                                    <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                        {duplicateAnalysis.duplicateGroups.length}
                                    </span>
                                ) : null}
                            </span>
                            <span className="text-xs font-semibold text-violet-700">{mergePanelOpen ? "Hide" : "Show"}</span>
                        </button>
                        {mergePanelOpen ? (
                            <div className="mt-3 space-y-3">
                                <p className="text-xs leading-relaxed text-slate-600">
                                    Select rows for the <strong>same project</strong>, mark which report to keep, then merge.
                                    Duplicate drafts are removed; empty sections on the keeper are filled from removed rows when possible.
                                </p>
                                {duplicateAnalysis.duplicateGroups.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-wide text-violet-800">
                                            Quick select duplicate groups
                                        </p>
                                        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                                            {duplicateAnalysis.duplicateGroups.map((group) => (
                                                <div
                                                    key={group.key}
                                                    className="flex flex-col gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-900">
                                                            {formatDisplayName(group.studentName)}
                                                        </p>
                                                        <p className="truncate text-xs text-slate-500">{group.projectTitle}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => selectDuplicateGroup(group)}
                                                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800 transition hover:bg-violet-200"
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                        Select {group.reports.length} rows
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                                        No duplicate groups detected in the loaded reports. Try status &quot;All Reports&quot; or clear filters.
                                    </p>
                                )}
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

                {loading && reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white py-20 shadow-sm">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="text-sm font-medium text-slate-500">Loading reports…</p>
                    </div>
                ) : (
                    <div className="relative min-h-[320px] min-w-0 overflow-x-auto overflow-y-visible rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                        <DataTable<Report>
                            key={mergePanelOpen ? 'reports-merge' : 'reports-default'}
                            columns={tableColumns}
                            data={filteredReports}
                            progressPending={loading}
                            progressComponent={
                                <div className="flex flex-col items-center justify-center gap-3 py-16">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    <p className="text-sm text-slate-500">Refreshing…</p>
                                </div>
                            }
                            pagination
                            paginationDefaultPage={tablePage}
                            onChangePage={setTablePage}
                            paginationPerPage={rowsPerPage}
                            onChangeRowsPerPage={(newPerPage, page) => {
                                setRowsPerPage(newPerPage);
                                setTablePage(page);
                            }}
                            paginationRowsPerPageOptions={[10, 25, 50, 100]}
                            paginationComponentOptions={{
                                rowsPerPageText: 'Rows:',
                                rangeSeparatorText: 'of',
                                selectAllRowsItem: false,
                            }}
                            highlightOnHover
                            responsive
                            dense
                            fixedHeader
                            fixedHeaderScrollHeight="min(720px, calc(100dvh - 20rem))"
                            noDataComponent={
                                <div className="py-16 text-center">
                                    <FileText className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                                    <h3 className="text-sm font-semibold text-slate-800">No reports match these filters</h3>
                                    <p className="mt-1 text-xs text-slate-500">Adjust status, NGO filter, or reset to see more rows.</p>
                                </div>
                            }
                            conditionalRowStyles={[
                                {
                                    when: (row) => (duplicateAnalysis.countByReportId.get(row.id) ?? 0) >= 2,
                                    style: {
                                        backgroundColor: 'rgba(139, 92, 246, 0.04)',
                                    },
                                },
                            ]}
                            customStyles={REPORTS_TABLE_STYLES}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
