"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Loader2, Sparkles, Receipt, ShieldCheck } from "lucide-react";
import {
    fetchStudentManualPaymentHistory,
    type StudentManualPaymentHistoryRow,
} from "@/lib/student-manual-payment-history";
import { ManualPaymentHistorySection } from "../components/ManualPaymentHistorySection";

export default function StudentPaymentsHistoryPage() {
    const [rows, setRows] = useState<StudentManualPaymentHistoryRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const list = await fetchStudentManualPaymentHistory();
            if (!cancelled) {
                setRows(list);
                setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const approvedCount = rows.filter((row) => row.payment.status === "approved").length;
    const pendingCount = rows.filter((row) => row.payment.status === "pending").length;

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
            <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_-30px_rgba(15,23,42,0.25)]">
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-blue-50 via-white to-indigo-50" />
                <div className="relative p-6 sm:p-8">
                    <Link
                        href="/dashboard/student/projects"
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        My Projects
                    </Link>

                    <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-blue-700">
                                <Sparkles className="h-3.5 w-3.5" />
                                Payment center
                            </div>
                            <h1 className="mt-4 flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                                    <CreditCard className="h-6 w-6 shrink-0" />
                                </span>
                                Payments
                            </h1>
                            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
                                Reporting-fee slips you submitted. To pay for a project, open it from{" "}
                                <Link href="/dashboard/student/projects" className="font-semibold text-blue-600 hover:underline">
                                    My Projects
                                </Link>{" "}
                                and use Complete payment when it is due.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[430px]">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Receipt className="h-4 w-4 text-blue-600" />
                                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Submissions</span>
                                </div>
                                <p className="mt-3 text-2xl font-black text-slate-900">{rows.length}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">All slips you've uploaded</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                                <div className="flex items-center gap-2 text-emerald-700">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Approved</span>
                                </div>
                                <p className="mt-3 text-2xl font-black text-slate-900">{approvedCount}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">Verified by admin</p>
                            </div>
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <Loader2 className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Pending</span>
                                </div>
                                <p className="mt-3 text-2xl font-black text-slate-900">{pendingCount}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">Awaiting review</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="flex items-center justify-center min-h-[30vh] text-slate-500 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <ManualPaymentHistorySection rows={rows} loading={false} currentProjectId={null} />
            )}
        </div>
    );
}
