"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { 
    CheckCircle2, 
    XCircle, 
    Eye, 
    Search, 
    Loader2, 
    Filter, 
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
import { Badge } from '../../student/report/components/ui/badge';
import { Input } from '../../student/report/components/ui/input';
import { REPORTING_FEE_DISPLAY } from '@/config/reportingFee';

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
    /** When the admin last verified (approve/reject). */
    reviewedAt?: string;
    /** Display name or email of the admin who verified. */
    reviewedBy?: string;
    feedback?: string;
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
    return {
        id,
        studentName,
        studentEmail,
        projectTitle,
        projectId,
        amount,
        date,
        proofUrl,
        status,
        reviewedAt,
        reviewedBy,
        feedback,
    };
}

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

    const refreshPendingCount = useCallback(async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/admin/payments/pending`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    const list = data.data || [];
                    setPendingCount(Array.isArray(list) ? list.length : 0);
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
                        const rawList = data.data || [];
                        const list = Array.isArray(rawList)
                            ? rawList.map((row: Record<string, unknown>) => normalizePayment(row, 'pending'))
                            : [];
                        setPayments(list);
                        setPendingCount(list.length);
                    }
                } else {
                    // Mock data for demonstration if API fails (pending only — unchanged behavior)
                    const mock: Payment[] = [
                        {
                            id: "pay_1",
                            studentName: "Zain Ali",
                            studentEmail: "zain@example.com",
                            projectTitle: "Clean Water Initiative",
                            projectId: "proj_123",
                            amount: REPORTING_FEE_DISPLAY,
                            date: new Date().toISOString(),
                            proofUrl: "https://via.placeholder.com/600x800?text=Payment+Receipt+Proof",
                            status: 'pending'
                        },
                        {
                            id: "pay_2",
                            studentName: "Ahmed Khan",
                            studentEmail: "ahmed@example.com",
                            projectTitle: "Education for All",
                            projectId: "proj_456",
                            amount: REPORTING_FEE_DISPLAY,
                            date: new Date(Date.now() - 86400000).toISOString(),
                            proofUrl: "https://via.placeholder.com/600x800?text=Bank+Transfer+Slip",
                            status: 'pending'
                        }
                    ];
                    setPayments(mock);
                    setPendingCount(mock.length);
                }
            } else {
                const status = activeTab;
                const res = await authenticatedFetch(`/api/v1/admin/payments?status=${status}`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const rawList = data.data || [];
                        const list = Array.isArray(rawList)
                            ? rawList.map((row: Record<string, unknown>) => normalizePayment(row, status))
                            : [];
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
    }, [activeTab]);

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
    const filteredPayments = payments.filter(p => 
        p.studentName.toLowerCase().includes(q) ||
        p.studentEmail.toLowerCase().includes(q) ||
        p.projectTitle.toLowerCase().includes(q)
    );

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
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payment Verification</h1>
                    <p className="text-slate-500 font-medium">Review and approve manual bank transfer receipts from students.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-slate-700">{pendingCount} Pending</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm inline-flex gap-1 flex-wrap">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            'px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
                            activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'text-slate-600 hover:bg-slate-50'
                        )}
                    >
                        {tab.label}
                        {tab.id === 'pending' ? (
                            <span
                                className={clsx(
                                    'ml-2 px-2 py-0.5 rounded-lg text-xs font-black',
                                    activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                                )}
                            >
                                {pendingCount}
                            </span>
                        ) : null}
                    </button>
                ))}
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Search by student or project..." 
                                className="pl-10 bg-white border-slate-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2">
                                <Filter className="w-4 h-4" /> Filter
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="text-slate-500 font-medium">
                                {activeTab === 'pending' ? 'Loading pending payments...' : `Loading ${activeTab} payments...`}
                            </p>
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                <CreditCard className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{emptyMessage.title}</h3>
                                <p className="text-slate-500 text-sm max-w-md mx-auto px-4">{emptyMessage.body}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Student</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Project / Report</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Submitted</th>
                                        {activeTab !== 'pending' ? (
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Verified</th>
                                        ) : null}
                                        {activeTab === 'rejected' ? (
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest max-w-[200px]">Note</th>
                                        ) : null}
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                        {(payment.studentName || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 leading-tight">{payment.studentName}</p>
                                                        <p className="text-xs text-slate-500">{payment.studentEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800 leading-tight">{payment.projectTitle}</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Badge variant="outline" className="text-[10px] font-black uppercase text-slate-400 border-slate-200 h-5">Report Fee</Badge>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-slate-900">{payment.amount}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {payment.date ? new Date(payment.date).toLocaleDateString() : '—'}
                                                </div>
                                            </td>
                                            {activeTab !== 'pending' ? (
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-slate-800">
                                                            {payment.reviewedAt
                                                                ? new Date(payment.reviewedAt).toLocaleString()
                                                                : '—'}
                                                        </span>
                                                        {payment.reviewedBy ? (
                                                            <span className="text-xs text-slate-500">by {payment.reviewedBy}</span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            ) : null}
                                            {activeTab === 'rejected' ? (
                                                <td className="px-6 py-4 text-xs text-slate-500 max-w-[220px] align-top">
                                                    {payment.feedback || '—'}
                                                </td>
                                            ) : null}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold"
                                                        onClick={() => {
                                                            setSelectedPayment(payment);
                                                            setIsPreviewOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1.5" /> View Proof
                                                    </Button>
                                                    {activeTab === 'pending' ? (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                                onClick={() => {
                                                                    setSelectedPayment(payment);
                                                                    setActionType('approve');
                                                                    setIsActionOpen(true);
                                                                }}
                                                            >
                                                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold"
                                                                onClick={() => {
                                                                    setSelectedPayment(payment);
                                                                    setActionType('reject');
                                                                    setIsActionOpen(true);
                                                                }}
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    ) : null}
                                                    {activeTab === 'approved' ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="font-bold border-amber-200 text-amber-800 hover:bg-amber-50"
                                                            onClick={() => {
                                                                setSelectedPayment(payment);
                                                                setIsRevertOpen(true);
                                                            }}
                                                        >
                                                            <RotateCcw className="w-4 h-4 mr-1.5" /> Revert
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
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-slate-100">
                        <DialogTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
                            <FileText className="w-6 h-6 text-blue-600" />
                            Payment Receipt Preview
                        </DialogTitle>
                        <DialogDescription className="font-medium text-slate-500">
                            Review the transfer slip uploaded by <span className="text-slate-900 font-bold">{selectedPayment?.studentName}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-slate-900 p-8 flex items-center justify-center">
                        {selectedPayment?.proofUrl ? (
                            <img 
                                src={selectedPayment.proofUrl} 
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
                    <DialogFooter className="p-6 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" className="gap-2" onClick={() => window.open(selectedPayment?.proofUrl, '_blank')}>
                                <ExternalLink className="w-4 h-4" /> Open Full
                            </Button>
                            <Button variant="outline" className="gap-2">
                                <Download className="w-4 h-4" /> Download
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                            {selectedPayment?.status === 'pending' ? (
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8"
                                    onClick={() => {
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight">
                            {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
                        </DialogTitle>
                        <DialogDescription className="font-medium">
                            {actionType === 'approve' 
                                ? `Confirm that you've verified the transfer of ${selectedPayment?.amount} from ${selectedPayment?.studentName}.` 
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
                <DialogContent className="max-w-md">
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
