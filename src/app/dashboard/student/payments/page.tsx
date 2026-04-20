"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
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

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
            <div>
                <Link
                    href="/dashboard/student/projects"
                    className="inline-flex items-center mb-2 -ml-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    My Projects
                </Link>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <CreditCard className="w-8 h-8 text-blue-600 shrink-0" />
                            Payments
                        </h1>
                        <p className="text-slate-500 font-medium mt-1 max-w-xl">
                            Reporting-fee slips you submitted. To pay for a project, open the project from{" "}
                            <Link href="/dashboard/student/projects" className="text-blue-600 font-semibold hover:underline">
                                My Projects
                            </Link>{" "}
                            and use Complete payment when it is due.
                        </p>
                    </div>
                </div>
            </div>

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
