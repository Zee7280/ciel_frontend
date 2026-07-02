"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { 
    CheckCircle2, 
    XCircle, 
    Eye, 
    Search, 
    Loader2, 
    Download, 
    ExternalLink,
    CreditCard,
    Calendar,
    FileText,
    AlertCircle,
    RotateCcw
} from 'lucide-react';
import clsx from 'clsx';
import { authenticatedFetch } from '@/utils/api';
import { toast } from 'sonner';
import { Button } from '../../student/report/components/ui/button';
import { Card, CardContent, CardHeader } from '../../student/report/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../student/report/components/ui/dialog';
import { Input } from '../../student/report/components/ui/input';
import { formatPkrAmount, REPORTING_FEE_DISPLAY } from '@/config/reportingFee';

type PaymentStatusTab = 'pending' | 'approved' | 'rejected';

/** Uses submitted paid amount fields when set; otherwise falls back to the configured reporting fee. */
function resolvePaidAmountDisplay(raw: Record<string, unknown>): string {
    const keys = [
        'paid_amount',
        'paidAmount',
        'amount_paid',
        'amountPaid',
        'transferred_amount',
        'transferredAmount',
        'submitted_amount',
        'submittedAmount',
        'actual_amount',
        'actualAmount',
        'transfer_amount',
        'transferAmount',
    ];
    let val: unknown;
    for (const k of keys) {
        const v = raw[k];
        if (v != null && String(v).trim() !== '') {
            val = v;
            break;
        }
    }
    if (val == null) return REPORTING_FEE_DISPLAY;
    const str = String(val).trim();
    if (!str) return '—';
    if (/pkr/i.test(str) || /(^|\s)rs\.?\s*/i.test(str)) return str;
    const normalized = str.replace(/,/g, '');
    const num = Number(normalized);
    if (!Number.isFinite(num) || Number.isNaN(num)) return str;
    return `${Math.round(num).toLocaleString('en-PK')} PKR`;
}

type PaymentTeamMember = {
    name: string;
    email: string;
    isTeamLead: boolean;
};

interface Payment {
    id: string;
    studentName: string;
    studentEmail: string;
    projectTitle: string;
    projectId: string;
    amount: string;
    date: string;
    proofUrl: string;
    status: 'pending' | 'approved' | 'rejected';
    participationMode: 'individual' | 'team';
    teamMemberCount: number;
    teamMembers: PaymentTeamMember[];
    reportingFeePerMemberPkr: number | null;
    expectedPaidAmountPkr: number | null;
    submittedByIsTeamLead: boolean;
    submissionNumber?: number;
    submissionTotal?: number;
    /** When the admin last verified (approve/reject). */
    reviewedAt?: string;
    /** Display name or email of the admin who verified. */
    reviewedBy?: string;
    feedback?: string;
}

function extractPaymentRows(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
        return payload.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
    }
    if (payload && typeof payload === "object") {
        const obj = payload as Record<string, unknown>;
        if (Array.isArray(obj.payments)) {
            return obj.payments.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
        }
        if (Array.isArray(obj.data)) {
            return obj.data.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
        }
    }
    return [];
}

function readTeamMembers(raw: Record<string, unknown>): PaymentTeamMember[] {
    const list = raw.team_members ?? raw.teamMembers;
    if (!Array.isArray(list)) return [];
    return list
        .map((row) => {
            if (!row || typeof row !== 'object') return null;
            const m = row as Record<string, unknown>;
            const name = String(m.name ?? '').trim();
            const email = String(m.email ?? '').trim();
            if (!name && !email) return null;
            return {
                name: name || '—',
                email: email || '—',
                isTeamLead: m.is_team_lead === true || m.isTeamLead === true,
            };
        })
        .filter((m): m is PaymentTeamMember => m != null);
}

function readPositiveInt(raw: unknown): number | null {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        const n = Math.floor(raw);
        return n > 0 ? n : null;
    }
    if (typeof raw === 'string' && raw.trim()) {
        const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
}

function normalizePayment(raw: Record<string, unknown>, fallbackStatus: PaymentStatusTab): Payment {
    const id = String(raw.id ?? raw.payment_id ?? '');
    const studentName = String(raw.studentName ?? raw.student_name ?? '');
    const studentEmail = String(raw.studentEmail ?? raw.student_email ?? '');
    const projectTitle = String(raw.projectTitle ?? raw.project_title ?? '');
    const projectId = String(raw.projectId ?? raw.project_id ?? '');
    const amount = resolvePaidAmountDisplay(raw);
    const date = String(raw.date ?? raw.submitted_at ?? raw.created_at ?? raw.submittedAt ?? '');
    const proofUrl = String(raw.proofUrl ?? raw.proof_url ?? '');
    const statusRaw = String(raw.status ?? fallbackStatus).toLowerCase();
    const status: Payment['status'] =
        statusRaw === 'approved' ? 'approved' : statusRaw === 'rejected' ? 'rejected' : 'pending';
    const reviewedAt = raw.reviewedAt != null
        ? String(raw.reviewedAt)
        : raw.reviewed_at != null
          ? String(raw.reviewed_at)
          : undefined;
    const reviewedBy = raw.reviewedBy != null
        ? String(raw.reviewedBy)
        : raw.reviewed_by_name != null
          ? String(raw.reviewed_by_name)
          : raw.reviewed_by != null
            ? String(raw.reviewed_by)
            : undefined;
    const feedback = raw.feedback != null
        ? String(raw.feedback)
        : raw.admin_feedback != null
          ? String(raw.admin_feedback)
          : undefined;
    const submittedBy =
        raw.submitted_by && typeof raw.submitted_by === 'object'
            ? (raw.submitted_by as Record<string, unknown>)
            : raw.submittedBy && typeof raw.submittedBy === 'object'
              ? (raw.submittedBy as Record<string, unknown>)
              : null;
    const participationRaw = String(
        raw.participation_mode ?? raw.participationMode ?? '',
    ).toLowerCase();
    const teamMembers = readTeamMembers(raw);
    const teamMemberCount =
        readPositiveInt(raw.team_member_count ?? raw.teamMemberCount) ??
        (teamMembers.length > 0 ? teamMembers.length : 1);
    const participationMode: Payment['participationMode'] =
        participationRaw === 'team' || teamMemberCount > 1 ? 'team' : 'individual';
    const reportingFeePerMemberPkr = readPositiveInt(
        raw.reporting_fee_per_member_pkr ?? raw.reportingFeePerMemberPkr,
    );
    const expectedPaidAmountPkr = readPositiveInt(
        raw.expected_paid_amount_pkr ?? raw.expectedPaidAmountPkr,
    );
    const submittedByIsTeamLead =
        submittedBy?.is_team_lead === true || submittedBy?.isTeamLead === true;
    const submissionNumber = readPositiveInt(raw.submission_number ?? raw.submissionNumber) ?? undefined;
    const submissionTotal = readPositiveInt(raw.submission_total ?? raw.submissionTotal) ?? undefined;
    return {
        id,
        studentName: submittedBy?.name != null ? String(submittedBy.name) : studentName,
        studentEmail: submittedBy?.email != null ? String(submittedBy.email) : studentEmail,
        projectTitle,
        projectId,
        amount,
        date,
        proofUrl,
        status,
        participationMode,
        teamMemberCount: participationMode === 'team' ? teamMemberCount : 1,
        teamMembers,
        reportingFeePerMemberPkr,
        expectedPaidAmountPkr,
        submittedByIsTeamLead,
        submissionNumber,
        submissionTotal,
        reviewedAt,
        reviewedBy,
        feedback,
    };
}

function formatTeamMembersSummary(members: PaymentTeamMember[], max = 3): string {
    if (!members.length) return '';
    const shown = members.slice(0, max).map((m) => {
        const label = m.name !== '—' ? m.name : m.email;
        return m.isTeamLead ? `${label} (lead)` : label;
    });
    const rest = members.length - shown.length;
    return rest > 0 ? `${shown.join(', ')} +${rest} more` : shown.join(', ');
}

function formatPaymentDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPaymentDateTime(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const TH =
    'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap';
const TD = 'px-4 py-3 align-middle text-sm text-slate-700';

export default function AdminPaymentsPage() {
    const [activeTab, setActiveTab] = useState<PaymentStatusTab>('pending');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal States
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isActionOpen, setIsActionOpen] = useState(false);
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isRevertOpen, setIsRevertOpen] = useState(false);
    const [revertReason, setRevertReason] = useState("");
    const [isRevertSubmitting, setIsRevertSubmitting] = useState(false);

    const [submissionHistory, setSubmissionHistory] = useState<Payment[]>([]);
    const [submissionHistoryLoading, setSubmissionHistoryLoading] = useState(false);
    const [previewSubmissionId, setPreviewSubmissionId] = useState<string | null>(null);

    const mapPaymentRows = useCallback(
        (rawList: unknown, fallbackStatus: PaymentStatusTab): Payment[] =>
            extractPaymentRows(rawList)
                .map((row) => normalizePayment(row, fallbackStatus))
                .filter((row) => row.id.trim() !== ""),
        [],
    );

    const loadSubmissionHistory = useCallback(
        async (payment: Payment) => {
            setSubmissionHistoryLoading(true);
            setPreviewSubmissionId(payment.id);
            try {
                const res = await authenticatedFetch(
                    `/api/v1/admin/payments/${encodeURIComponent(payment.id)}/submissions`,
                );
                if (res?.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const list = mapPaymentRows(data.data, payment.status);
                        setSubmissionHistory(list.length > 0 ? list : [payment]);
                        const active =
                            list.find((row) => row.id === payment.id) ??
                            list[list.length - 1] ??
                            payment;
                        setPreviewSubmissionId(active.id);
                        return;
                    }
                }
                setSubmissionHistory([payment]);
                setPreviewSubmissionId(payment.id);
            } catch {
                setSubmissionHistory([payment]);
                setPreviewSubmissionId(payment.id);
            } finally {
                setSubmissionHistoryLoading(false);
            }
        },
        [mapPaymentRows],
    );

    const openPaymentPreview = useCallback(
        (payment: Payment) => {
            setSelectedPayment(payment);
            setIsPreviewOpen(true);
            void loadSubmissionHistory(payment);
        },
        [loadSubmissionHistory],
    );

    const previewPayment =
        submissionHistory.find((row) => row.id === previewSubmissionId) ?? selectedPayment;

    const refreshPendingCount = useCallback(async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/admin/payments/pending`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    const list = extractPaymentRows(data.data);
                    setPendingCount(list.length);
                }
            }
        } catch {
            /* keep previous count */
        }
    }, []);

    const fetchPayments = useCallback(async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'pending') {
                const res = await authenticatedFetch(`/api/v1/admin/payments/pending`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const list = mapPaymentRows(data.data, 'pending');
                        setPayments(list);
                        setPendingCount(list.length);
                    }
                } else {
                    setPayments([]);
                    setPendingCount(0);
                    toast.error("Could not load pending payments. Please try again or contact support.");
                }
            } else {
                const status = activeTab;
                const res = await authenticatedFetch(`/api/v1/admin/payments?status=${status}`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const list = mapPaymentRows(data.data, status);
                        setPayments(list);
                    } else {
                        setPayments([]);
                    }
                } else {
                    setPayments([]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch payments", error);
            toast.error("Failed to load payments");
            if (activeTab === 'pending') {
                setPayments([]);
                setPendingCount(0);
            }
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, mapPaymentRows]);

    useEffect(() => {
        void (async () => {
            await fetchPayments();
            if (activeTab !== 'pending') {
                await refreshPendingCount();
            }
        })();
    }, [activeTab, fetchPayments, refreshPendingCount]);

    const handleAction = async () => {
        if (!selectedPayment) return;
        
        setIsSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/payments/${selectedPayment.id}/verify`, {
                method: 'POST',
                body: JSON.stringify({
                    status: actionType === 'approve' ? 'approved' : 'rejected',
                    feedback
                })
            });

            if (res && res.ok) {
                toast.success(`Payment ${actionType}d successfully`);
                setPayments(prev => prev.filter(p => p.id !== selectedPayment.id));
                setIsActionOpen(false);
                setSelectedPayment(null);
                setFeedback("");
                await refreshPendingCount();
            } else {
                // Mock success for now
                toast.success(`Payment ${actionType}d (Simulated)`);
                setPayments(prev => prev.filter(p => p.id !== selectedPayment.id));
                setIsActionOpen(false);
                setSelectedPayment(null);
                setFeedback("");
                await refreshPendingCount();
            }
        } catch (error) {
            console.error("Action failed", error);
            toast.error("Failed to process action");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevert = async () => {
        if (!selectedPayment) return;
        setIsRevertSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/payments/${selectedPayment.id}/revert`, {
                method: 'POST',
                body: JSON.stringify({ reason: revertReason.trim() || undefined }),
            });
            if (res && res.ok) {
                toast.success("Approval reverted; payment is pending review again.");
                setPayments(prev => prev.filter(p => p.id !== selectedPayment.id));
                setIsRevertOpen(false);
                setSelectedPayment(null);
                setRevertReason("");
                await refreshPendingCount();
            } else {
                const errText = res ? await res.text().catch(() => '') : '';
                toast.error(errText || "Could not revert. Is the revert API enabled on the server?");
            }
        } catch (error) {
            console.error("Revert failed", error);
            toast.error("Failed to revert approval");
        } finally {
            setIsRevertSubmitting(false);
        }
    };

    const q = searchQuery.toLowerCase();
    const filteredPayments = payments.filter((p) => {
        if (
            p.studentName.toLowerCase().includes(q) ||
            p.studentEmail.toLowerCase().includes(q) ||
            p.projectTitle.toLowerCase().includes(q)
        ) {
            return true;
        }
        return p.teamMembers.some(
            (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
        );
    });

    const tabs: { id: PaymentStatusTab; label: string }[] = [
        { id: 'pending', label: 'Pending' },
        { id: 'approved', label: 'Approved' },
        { id: 'rejected', label: 'Rejected' },
    ];

    const emptyMessage = {
        pending: {
            title: "No pending payments",
            body: "All recent payments have been processed or none are currently awaiting review.",
        },
        approved: {
            title: "No approved payments in history",
            body: "Once you approve transfers, they will appear here with the option to revert if needed.",
        },
        rejected: {
            title: "No rejected payments",
            body: "Rejected proofs will show here for your records.",
        },
    }[activeTab];

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">Admin</p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem]">
                        Payment Verification
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                        Review manual bank transfer receipts, approve reporting fees, and track submission history.
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Awaiting review</p>
                        <p className="text-lg font-bold tabular-nums text-slate-900">{pendingCount}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex w-full max-w-md rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none',
                                activeTab === tab.id
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50',
                            )}
                        >
                            {tab.label}
                            {tab.id === 'pending' ? (
                                <span
                                    className={clsx(
                                        'rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                        activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                                    )}
                                >
                                    {pendingCount}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{filteredPayments.length}</span>
                    {searchQuery.trim() ? ' matching' : ''} {activeTab} payment{filteredPayments.length === 1 ? '' : 's'}
                </p>
            </div>

            <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
                <CardHeader className="space-y-0 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-5">
                    <div className="relative max-w-lg">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search student, email, project, or team member…"
                            className="h-10 border-slate-200 bg-white pl-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-24">
                            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                            <p className="text-sm font-medium text-slate-500">Loading {activeTab} payments…</p>
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-3 px-6 py-24 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold text-slate-900">{emptyMessage.title}</h3>
                                <p className="mx-auto max-w-md text-sm text-slate-500">{emptyMessage.body}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] border-collapse text-left">
                                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm">
                                    <tr>
                                        <th className={TH}>Submitted by</th>
                                        <th className={TH}>Team</th>
                                        <th className={TH}>Project</th>
                                        <th className={TH}>Amount</th>
                                        <th className={TH}>Submitted</th>
                                        <th className={TH}>Attempt</th>
                                        {activeTab !== 'pending' ? <th className={TH}>Verified</th> : null}
                                        {activeTab === 'rejected' ? <th className={TH}>Note</th> : null}
                                        <th className={clsx(TH, 'text-right')}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredPayments.map((payment) => (
                                        <tr
                                            key={payment.id}
                                            className="transition-colors hover:bg-slate-50/80"
                                        >
                                            <td className={TD}>
                                                <div className="flex min-w-[180px] max-w-[220px] items-center gap-2.5">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                                        {(payment.studentName || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p
                                                            className="truncate text-sm font-semibold text-slate-900"
                                                            title={payment.studentName}
                                                        >
                                                            {payment.studentName || '—'}
                                                        </p>
                                                        <p
                                                            className="truncate text-xs text-slate-500"
                                                            title={payment.studentEmail}
                                                        >
                                                            {payment.studentEmail}
                                                        </p>
                                                        {payment.submittedByIsTeamLead ? (
                                                            <span className="mt-1 inline-flex rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                                                                Team lead
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={TD}>
                                                {payment.participationMode === 'team' ? (
                                                    <div className="min-w-[120px] max-w-[160px] space-y-1">
                                                        <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-200">
                                                            {payment.teamMemberCount} members
                                                        </span>
                                                        {payment.teamMembers.length > 0 ? (
                                                            <p
                                                                className="line-clamp-2 text-[11px] leading-snug text-slate-500"
                                                                title={formatTeamMembersSummary(payment.teamMembers, 20)}
                                                            >
                                                                {formatTeamMembersSummary(payment.teamMembers, 2)}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-400">Individual</span>
                                                )}
                                            </td>
                                            <td className={TD}>
                                                <div className="min-w-[200px] max-w-[280px]">
                                                    <p
                                                        className="line-clamp-2 text-sm font-medium leading-snug text-slate-800"
                                                        title={payment.projectTitle}
                                                    >
                                                        {payment.projectTitle || '—'}
                                                    </p>
                                                    <span className="mt-1 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                                        Report fee
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={TD}>
                                                <div className="min-w-[100px] whitespace-nowrap">
                                                    <p className="text-sm font-semibold tabular-nums text-slate-900">
                                                        {payment.amount}
                                                    </p>
                                                    {payment.participationMode === 'team' &&
                                                    payment.reportingFeePerMemberPkr != null ? (
                                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                                            {payment.teamMemberCount} ×{' '}
                                                            {formatPkrAmount(payment.reportingFeePerMemberPkr)}
                                                        </p>
                                                    ) : null}
                                                    {payment.expectedPaidAmountPkr != null &&
                                                    payment.amount !== '—' &&
                                                    payment.amount.replace(/[^\d]/g, '') !==
                                                        String(payment.expectedPaidAmountPkr) ? (
                                                        <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                                                            Expected {formatPkrAmount(payment.expectedPaidAmountPkr)}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className={TD}>
                                                <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                                                    <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                    {formatPaymentDate(payment.date)}
                                                </div>
                                            </td>
                                            <td className={TD}>
                                                {payment.submissionNumber && payment.submissionTotal ? (
                                                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700">
                                                        {payment.submissionNumber} / {payment.submissionTotal}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                            {activeTab !== 'pending' ? (
                                                <td className={TD}>
                                                    <div className="min-w-[120px] space-y-0.5">
                                                        <p className="text-xs font-medium text-slate-800">
                                                            {formatPaymentDateTime(payment.reviewedAt || '')}
                                                        </p>
                                                        {payment.reviewedBy ? (
                                                            <p className="truncate text-[11px] text-slate-500" title={payment.reviewedBy}>
                                                                by {payment.reviewedBy}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            ) : null}
                                            {activeTab === 'rejected' ? (
                                                <td className={TD}>
                                                    <p
                                                        className="line-clamp-3 max-w-[200px] text-xs leading-relaxed text-slate-600"
                                                        title={payment.feedback || undefined}
                                                    >
                                                        {payment.feedback || '—'}
                                                    </p>
                                                </td>
                                            ) : null}
                                            <td className={clsx(TD, 'text-right')}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1.5 border-slate-200 px-2.5 text-xs font-semibold text-slate-700"
                                                        onClick={() => openPaymentPreview(payment)}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Proof</span>
                                                    </Button>
                                                    {activeTab === 'pending' ? (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="h-8 gap-1 bg-emerald-600 px-2.5 text-xs font-semibold hover:bg-emerald-700"
                                                                onClick={() => {
                                                                    setSelectedPayment(payment);
                                                                    setActionType('approve');
                                                                    setIsActionOpen(true);
                                                                }}
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                <span className="hidden md:inline">Approve</span>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 w-8 border-red-200 p-0 text-red-600 hover:bg-red-50"
                                                                title="Reject"
                                                                onClick={() => {
                                                                    setSelectedPayment(payment);
                                                                    setActionType('reject');
                                                                    setIsActionOpen(true);
                                                                }}
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : null}
                                                    {activeTab === 'approved' ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-1 border-amber-200 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                                                            onClick={() => {
                                                                setSelectedPayment(payment);
                                                                setIsRevertOpen(true);
                                                            }}
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                            <span className="hidden md:inline">Revert</span>
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Proof Preview Dialog */}
            <Dialog
                open={isPreviewOpen}
                onOpenChange={(open) => {
                    setIsPreviewOpen(open);
                    if (!open) {
                        setSubmissionHistory([]);
                        setPreviewSubmissionId(null);
                    }
                }}
            >
                <DialogContent className="flex h-[85vh] w-[calc(100vw-2rem)] max-w-3xl flex-col overflow-hidden p-0">
                    <DialogHeader className="border-b border-slate-100 p-4 sm:p-6">
                        <DialogTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
                            <FileText className="w-6 h-6 text-blue-600" />
                            Payment Receipt Preview
                        </DialogTitle>
                        <DialogDescription className="space-y-2 font-medium text-slate-500">
                            <span>
                                Review the transfer slip uploaded by{' '}
                                <span className="font-bold text-slate-900">{previewPayment?.studentName}</span>
                                {previewPayment?.submittedByIsTeamLead ? ' (team lead)' : ''}.
                            </span>
                            {previewPayment?.participationMode === 'team' ? (
                                <span className="block text-sm">
                                    Team size:{' '}
                                    <span className="font-bold text-slate-800">
                                        {previewPayment.teamMemberCount} members
                                    </span>
                                    {previewPayment.teamMembers.length > 0
                                        ? ` — ${formatTeamMembersSummary(previewPayment.teamMembers, 8)}`
                                        : ''}
                                </span>
                            ) : null}
                        </DialogDescription>
                        {submissionHistory.length > 1 ? (
                            <div className="pt-3">
                                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    All submissions ({submissionHistory.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {submissionHistory.map((row) => (
                                        <button
                                            key={row.id}
                                            type="button"
                                            onClick={() => setPreviewSubmissionId(row.id)}
                                            className={clsx(
                                                "rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors",
                                                previewSubmissionId === row.id
                                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                                            )}
                                        >
                                            #{row.submissionNumber ?? "?"}{" "}
                                            {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                                            <span className="ml-1 uppercase opacity-70">{row.status}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </DialogHeader>
                    <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-900 p-4 sm:p-8">
                        {submissionHistoryLoading ? (
                            <div className="flex flex-col items-center gap-3 text-white">
                                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                                <p className="text-sm font-medium text-slate-300">Loading submission history...</p>
                            </div>
                        ) : previewPayment?.proofUrl ? (
                            <img 
                                src={previewPayment.proofUrl} 
                                alt="Payment Proof" 
                                className="max-w-full h-auto shadow-2xl rounded-lg"
                            />
                        ) : (
                            <div className="text-white flex flex-col items-center gap-4">
                                <AlertCircle className="w-12 h-12 text-slate-600" />
                                <p>No proof URL available</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                            <Button
                                variant="outline"
                                className="gap-2"
                                disabled={!previewPayment?.proofUrl}
                                onClick={() => window.open(previewPayment?.proofUrl, '_blank')}
                            >
                                <ExternalLink className="w-4 h-4" /> Open Full
                            </Button>
                            <Button variant="outline" className="gap-2">
                                <Download className="w-4 h-4" /> Download
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                            {previewPayment?.status === 'pending' ? (
                                <Button 
                                    className="bg-emerald-600 px-8 font-bold text-white hover:bg-emerald-700"
                                    onClick={() => {
                                        if (previewPayment) {
                                            setSelectedPayment(previewPayment);
                                        }
                                        setIsPreviewOpen(false);
                                        setActionType('approve');
                                        setIsActionOpen(true);
                                    }}
                                >
                                    Continue to Approval
                                </Button>
                            ) : null}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Action Dialog (Approve/Reject) */}
            <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight">
                            {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
                        </DialogTitle>
                        <DialogDescription className="font-medium">
                            {actionType === 'approve'
                                ? `Confirm that you've verified the transfer of ${selectedPayment?.amount} from ${selectedPayment?.studentName}${
                                      selectedPayment?.participationMode === 'team'
                                          ? ` (team of ${selectedPayment.teamMemberCount})`
                                          : ''
                                  }.`
                                : `Select the reason for rejecting this payment proof.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 tracking-widest uppercase">Internal Feedback / Note</label>
                            <textarea spellCheck={true}
                                className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder={actionType === 'approve' ? 'Optional note for the logs...' : 'Reason for rejection (will be shown to student)...'}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            />
                        </div>
                        {actionType === 'approve' && (
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3 italic">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                                    Approval will unlock the Certificate (cii) and Final Report for this student immediately.
                                </p>
                            </div>
                        )}
                        {actionType === 'reject' && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 italic">
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                <p className="text-xs text-red-800 leading-relaxed font-medium">
                                    Rejection will notify the student and allow them to upload a corrected proof of payment.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setIsActionOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button 
                            className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                            onClick={handleAction}
                            disabled={isSubmitting || (actionType === 'reject' && !feedback.trim())}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                            ) : (
                                actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRevertOpen} onOpenChange={(open) => { setIsRevertOpen(open); if (!open) setRevertReason(""); }}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight">Revert approval?</DialogTitle>
                        <DialogDescription className="font-medium">
                            This moves the payment back to <span className="font-bold text-slate-800">pending review</span>.
                            The student flow should return to awaiting verification (same as before approval).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-xs font-black text-slate-400 tracking-widest uppercase">Reason (optional, for audit)</label>
                        <textarea spellCheck={true}
                            className="w-full min-h-[88px] p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="e.g. Approved wrong slip / duplicate entry..."
                            value={revertReason}
                            onChange={(e) => setRevertReason(e.target.value)}
                        />
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                        <p className="text-xs text-amber-900 leading-relaxed font-medium">
                            Only use revert for genuine mistakes. Your backend should log this action and roll back any unlocks tied to payment approval.
                        </p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setIsRevertOpen(false)} disabled={isRevertSubmitting}>Cancel</Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            onClick={handleRevert}
                            disabled={isRevertSubmitting}
                        >
                            {isRevertSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Reverting...</>
                            ) : (
                                <><RotateCcw className="w-4 h-4 mr-2" /> Confirm revert</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
