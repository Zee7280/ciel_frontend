"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { ArrowLeft, Building2, Calendar, FileText, TrendingUp, User } from "lucide-react";
import { toast } from "sonner";
import ReportPrintView from "@/app/dashboard/student/report/components/ReportPrintView";
import { prepareReportForVerifyDossier } from "@/utils/reportTeamScope";
import { readPersistedCiiSnapshot } from "@/utils/reportCiiSnapshot";
import type { ReportData } from "@/app/dashboard/student/report/context/ReportContext";

interface ReportDetail {
    id: string;
    student: {
        id?: string;
        name: string;
        email: string;
        university?: string;
    };
    opportunity: {
        title?: string;
        organization?: string;
        hours?: number;
        [key: string]: unknown;
    };
    submission_date: string;
    status: string;
    admin_status: string;
    section1?: ReportData["section1"];
    section2?: ReportData["section2"];
    section3?: ReportData["section3"];
    section4?: ReportData["section4"];
    section5?: ReportData["section5"];
    section6?: ReportData["section6"];
    section7?: ReportData["section7"];
    section8?: ReportData["section8"];
    section9?: ReportData["section9"];
    section10?: ReportData["section10"];
    section11?: ReportData["section11"];
}

export default function FacultyReportDossierPage() {
    const params = useParams();
    const router = useRouter();
    const [report, setReport] = useState<ReportDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const ciiSnapshot = useMemo(() => (report ? readPersistedCiiSnapshot(report) : null), [report]);

    useEffect(() => {
        void fetchReportDetail();
    }, [params.reportId]);

    const fetchReportDetail = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`/api/v1/faculty/reports/${params.reportId}`);
            if (response?.ok) {
                const data = await response.json();
                const raw = data.data || data.report || data;
                setReport(prepareReportForVerifyDossier(raw as Record<string, unknown>) as unknown as ReportDetail);
            } else {
                toast.error("Report not available yet (admin approval may be pending)");
            }
        } catch {
            toast.error("Failed to load executive dossier");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md text-center">
                    <h2 className="text-2xl font-bold text-slate-900">Executive dossier unavailable</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        This report may not be assigned to you or CIEL Admin has not approved it yet.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/faculty/reports")}
                        className="mt-6 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                        Back to reports
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50 p-0 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/faculty/reports")}
                        className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-slate-700 transition hover:bg-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to student reports
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-900">
                            Read-only view
                        </span>
                        <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-800">
                            Admin verified
                        </span>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-slate-100 bg-gradient-to-br from-amber-500 to-amber-600 text-2xl font-black text-white">
                                {report.student.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-black text-slate-900">{report.student.name}</h1>
                                <div className="mt-2 space-y-1 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 shrink-0" />
                                        <span className="break-all font-medium">{report.student.email}</span>
                                    </div>
                                    {report.student.university ? (
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 shrink-0" />
                                            <span>{report.student.university}</span>
                                        </div>
                                    ) : null}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 shrink-0" />
                                        <span>
                                            Submitted:{" "}
                                            {new Date(report.submission_date).toLocaleDateString("en-US", {
                                                month: "long",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-stretch gap-2 sm:items-end">
                            {ciiSnapshot ? (
                                <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/90 px-4 py-3">
                                    <TrendingUp className="h-4 w-4 text-indigo-700" aria-hidden />
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                                            CII index
                                        </p>
                                        <p className="text-2xl font-black tabular-nums text-slate-900">
                                            {Math.round(ciiSnapshot.totalScore)}
                                            <span className="text-base font-semibold text-slate-500">/100</span>
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                            <span className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-green-700">
                                {report.status === "verified" ? "Verified" : report.status}
                            </span>
                        </div>
                    </div>
                    <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Project</p>
                        <p className="text-lg font-bold text-slate-900">{report.opportunity?.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{report.opportunity?.organization}</p>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                        View-only: admin-verified executive impact dossier for your supervised students. Approval
                        actions are handled by CIEL Admin.
                    </p>
                </div>

                <div
                    id="executive-impact-dossier"
                    className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg sm:rounded-[2.5rem] sm:p-10"
                >
                    <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-[0.04]">
                        <FileText className="h-64 w-64 text-slate-900" />
                    </div>
                    <div className="relative z-10 mb-8 text-center">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-5 py-2">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                                CIEL verified dossier
                            </span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                            Executive Impact Dossier
                        </h2>
                    </div>
                    <div className="relative z-10 text-left">
                        <ReportPrintView
                            projectData={report.opportunity}
                            reportData={{ ...(report as unknown as ReportData) }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
