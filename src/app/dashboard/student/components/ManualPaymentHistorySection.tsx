"use client";

import clsx from "clsx";
import {
    BadgeCheck,
    Building2,
    CalendarDays,
    Clock3,
    ExternalLink,
    History,
    Loader2,
    MessageSquareText,
    Receipt,
    XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../report/components/ui/card";
import type { StudentManualPaymentHistoryRow } from "@/lib/student-manual-payment-history";

export function formatManualPaymentHistoryDate(iso: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ManualPaymentHistorySection({
    rows,
    loading,
    currentProjectId,
}: {
    rows: StudentManualPaymentHistoryRow[];
    loading: boolean;
    currentProjectId: string | null;
}) {
    const approvedCount = rows.filter((row) => row.payment.status === "approved").length;

    return (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/60">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                                <History className="h-5 w-5" />
                            </span>
                            Your payment submissions
                        </CardTitle>
                        <CardDescription className="mt-2 text-slate-500">
                            Newest first. Status updates when an admin reviews your slip.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-slate-600">
                        <Receipt className="h-3.5 w-3.5 text-blue-600" />
                        {rows.length} total
                        {!loading ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 tracking-normal text-emerald-700">
                                {approvedCount} approved
                            </span>
                        ) : null}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <span className="text-sm font-medium">Loading history...</span>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                            <Receipt className="h-6 w-6" />
                        </div>
                        <p className="mt-4 text-sm font-bold text-slate-900">No payment slips yet</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            When you upload a reporting-fee receipt, it will appear here.
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {rows.map((row) => {
                            const { payment, opportunity } = row;
                            const oppId = opportunity?.id ?? row.opportunityId;
                            const isCurrent = !!currentProjectId && oppId === currentProjectId;
                            const statusConfig =
                                payment.status === "approved"
                                    ? {
                                          badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
                                          accent: "bg-emerald-500",
                                          icon: BadgeCheck,
                                      }
                                    : payment.status === "rejected"
                                      ? {
                                            badge: "border-red-200 bg-red-50 text-red-700",
                                            accent: "bg-red-500",
                                            icon: XCircle,
                                        }
                                      : {
                                            badge: "border-amber-200 bg-amber-50 text-amber-700",
                                            accent: "bg-amber-500",
                                            icon: Clock3,
                                        };
                            const StatusIcon = statusConfig.icon;
                            const paidLine =
                                payment.paidAmountPkr != null
                                    ? `${payment.paidAmountPkr.toLocaleString("en-PK")} PKR transferred`
                                    : null;
                            const statusLabel = payment.status.replace(/_/g, " ");

                            return (
                                <li
                                    key={payment.id}
                                    className={clsx(
                                        "relative overflow-hidden rounded-[26px] border bg-white p-5 shadow-sm transition-all",
                                        isCurrent
                                            ? "border-blue-200 bg-blue-50/40 shadow-blue-100"
                                            : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md",
                                    )}
                                >
                                    <div className={clsx("absolute inset-y-5 left-0 w-1 rounded-r-full", statusConfig.accent)} />

                                    <div className="space-y-4 pl-2">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-lg font-black text-slate-900">
                                                    {opportunity?.title || "Reporting fee"}
                                                </p>
                                                {opportunity?.organizationName ? (
                                                    <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                                                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                                                        <p className="truncate">{opportunity.organizationName}</p>
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                {isCurrent ? (
                                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">
                                                        Current project
                                                    </span>
                                                ) : null}
                                                <span
                                                    className={clsx(
                                                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]",
                                                        statusConfig.badge,
                                                    )}
                                                >
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {statusLabel}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fee</p>
                                                <p className="mt-1 text-sm font-bold text-slate-900">{payment.amount}</p>
                                            </div>

                                            {paidLine ? (
                                                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Paid</p>
                                                    <p className="mt-1 text-sm font-bold text-slate-900">{paidLine}</p>
                                                </div>
                                            ) : null}

                                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                    Submitted
                                                </div>
                                                <p className="mt-1 text-sm font-bold text-slate-900">
                                                    {formatManualPaymentHistoryDate(payment.submittedAt)}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    <Clock3 className="h-3.5 w-3.5" />
                                                    Updated
                                                </div>
                                                <p className="mt-1 text-sm font-bold text-slate-900">
                                                    {payment.updatedAt
                                                        ? formatManualPaymentHistoryDate(payment.updatedAt)
                                                        : "Not updated yet"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-end justify-between gap-3">
                                            {payment.feedback ? (
                                                <div className="flex min-w-0 flex-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                                    <div className="mt-0.5 rounded-xl bg-white p-2 text-slate-500 shadow-sm">
                                                        <MessageSquareText className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                            Admin note
                                                        </p>
                                                        <p className="mt-1 text-sm font-medium text-slate-700">
                                                            {payment.feedback}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-medium text-slate-400">No admin note yet.</p>
                                            )}

                                            {payment.proofUrl ? (
                                                <a
                                                    href={payment.proofUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
                                                >
                                                    View proof
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
