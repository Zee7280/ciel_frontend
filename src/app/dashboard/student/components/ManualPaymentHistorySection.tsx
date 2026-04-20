"use client";

import clsx from "clsx";
import { History, Loader2, ExternalLink } from "lucide-react";
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
    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <History className="w-5 h-5 text-blue-600" />
                    Your payment submissions
                </CardTitle>
                <CardDescription className="text-slate-500">
                    Newest first. Status updates when an admin reviews your slip.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-slate-500 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="font-medium text-sm">Loading history…</span>
                    </div>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-slate-500 font-medium py-2">No previous payment slips on file.</p>
                ) : (
                    <ul className="space-y-4">
                        {rows.map((row) => {
                            const { payment, opportunity } = row;
                            const oppId = opportunity?.id ?? row.opportunityId;
                            const isCurrent = !!currentProjectId && oppId === currentProjectId;
                            const statusClass =
                                payment.status === "approved"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : payment.status === "rejected"
                                      ? "bg-red-100 text-red-800 border-red-200"
                                      : "bg-amber-100 text-amber-900 border-amber-200";
                            const paidLine =
                                payment.paidAmountPkr != null
                                    ? `${payment.paidAmountPkr.toLocaleString("en-PK")} PKR transferred`
                                    : null;
                            return (
                                <li
                                    key={payment.id}
                                    className={clsx(
                                        "rounded-2xl border p-4 space-y-2",
                                        isCurrent ? "border-blue-300 bg-blue-50/40" : "border-slate-100 bg-white",
                                    )}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-900 truncate">
                                                {opportunity?.title || "Reporting fee"}
                                            </p>
                                            {opportunity?.organizationName ? (
                                                <p className="text-xs text-slate-500 font-medium truncate">
                                                    {opportunity.organizationName}
                                                </p>
                                            ) : null}
                                        </div>
                                        <span
                                            className={clsx(
                                                "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shrink-0",
                                                statusClass,
                                            )}
                                        >
                                            {payment.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 font-medium">
                                        <span>
                                            <span className="text-slate-400 font-black uppercase tracking-wider mr-1">Fee</span>
                                            {payment.amount}
                                        </span>
                                        {paidLine ? (
                                            <span>
                                                <span className="text-slate-400 font-black uppercase tracking-wider mr-1">Paid</span>
                                                {paidLine}
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Submitted {formatManualPaymentHistoryDate(payment.submittedAt)}
                                        {payment.updatedAt && payment.updatedAt !== payment.submittedAt
                                            ? ` · Updated ${formatManualPaymentHistoryDate(payment.updatedAt)}`
                                            : ""}
                                    </p>
                                    {payment.feedback ? (
                                        <p className="text-xs text-slate-700 bg-slate-100 rounded-lg px-3 py-2 border border-slate-200">
                                            <span className="font-black text-slate-500 uppercase tracking-wider text-[10px] mr-2">Note</span>
                                            {payment.feedback}
                                        </p>
                                    ) : null}
                                    {payment.proofUrl ? (
                                        <a
                                            href={payment.proofUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                                        >
                                            View proof
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
