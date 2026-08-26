"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Info, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import {
    fetchStudentManualPaymentHistory,
    readStudentIdFromCielUser,
    type StudentManualPaymentHistoryRow,
} from "@/lib/student-manual-payment-history";
import {
    pickReportCheckOpportunityKey,
    pickReportStatusFromCheckRow,
} from "@/utils/studentBrowseReportCta";
import { REPORTING_FEE_DISPLAY, REPORTING_FEE_PKR } from "@/config/reportingFee";
import { CIEL_OFFICIAL_BANK } from "@/config/cielBankDetails";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../report/components/ui/dialog";

type DueItem = {
    projectId: string;
    title: string;
    organizationName: string | null;
    hoursVerifiedAt: string | null;
    amountLabel: string;
};

function rsLabel(amount: string | number | null | undefined): string {
    if (typeof amount === "number" && Number.isFinite(amount)) {
        return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
    }
    if (typeof amount === "string" && amount.trim()) {
        const n = Number(amount.replace(/[^\d.]/g, ""));
        if (Number.isFinite(n) && n > 0) return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
        if (/rs|pkr/i.test(amount)) return amount.replace(/PKR/i, "").trim();
        return amount;
    }
    return `Rs ${REPORTING_FEE_PKR.toLocaleString("en-PK")}`;
}

function formatShortDate(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function pickTitle(row: Record<string, unknown>): string {
    const keys = ["project_title", "projectTitle", "title", "opportunity_title"];
    for (const k of keys) {
        const v = row[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    const opp = row.opportunity;
    if (opp && typeof opp === "object") {
        const t = (opp as { title?: unknown }).title;
        if (typeof t === "string" && t.trim()) return t.trim();
    }
    return "Project";
}

function pickOrg(row: Record<string, unknown>): string | null {
    const keys = ["organization_name", "organizationName", "org_name"];
    for (const k of keys) {
        const v = row[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    const org = row.organization;
    if (org && typeof org === "object") {
        const n = (org as { name?: unknown }).name;
        if (typeof n === "string" && n.trim()) return n.trim();
    }
    return null;
}

function pickWhen(row: Record<string, unknown>): string | null {
    const keys = ["updatedAt", "updated_at", "partner_verified_at", "partnerVerifiedAt", "verified_at", "createdAt", "created_at"];
    for (const k of keys) {
        const v = row[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
}

function isReportingFeeDueStatus(row: Record<string, unknown>): boolean {
    const status = pickReportStatusFromCheckRow(row);
    const reportStatus = String(row.report_status ?? row.reportStatus ?? "").toLowerCase();
    const due = new Set(["pending_payment", "payment_pending"]);
    if (status === "payment_under_review" || reportStatus === "payment_under_review") return false;
    return due.has(status) || due.has(reportStatus);
}

function paymentHref(projectId: string): string {
    return `/dashboard/student/payment?projectId=${encodeURIComponent(projectId)}`;
}

function latestSlipForProject(
    rows: StudentManualPaymentHistoryRow[],
    projectId: string,
): StudentManualPaymentHistoryRow | undefined {
    return rows.find((r) => (r.opportunity?.id ?? r.opportunityId) === projectId);
}

export default function StudentPaymentsHistoryPage() {
    const [rows, setRows] = useState<StudentManualPaymentHistoryRow[]>([]);
    const [dueItems, setDueItems] = useState<DueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [policyOpen, setPolicyOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const studentId = readStudentIdFromCielUser();
            const [history, dashboard, reportsRes] = await Promise.all([
                fetchStudentManualPaymentHistory({ redirectToLogin: false }),
                fetchStudentDashboardData({ redirectToLogin: false }),
                studentId
                    ? authenticatedFetch(
                          `/api/v1/students/reports/check?studentId=${encodeURIComponent(studentId)}`,
                          {},
                          { redirectToLogin: false },
                      )
                    : Promise.resolve(null),
            ]);
            if (cancelled) return;

            setRows(history);

            const reportRows: Record<string, unknown>[] = [];
            if (reportsRes?.ok) {
                const json = (await reportsRes.json().catch(() => null)) as { success?: boolean; data?: unknown } | null;
                if (json?.success && Array.isArray(json.data)) {
                    for (const item of json.data) {
                        if (item && typeof item === "object") reportRows.push(item as Record<string, unknown>);
                    }
                }
            }

            const sampleById = new Map(
                (dashboard?.overview?.pendingPaymentsSample ?? []).map((s) => [s.id, s]),
            );
            const outstanding: DueItem[] = [];
            const seen = new Set<string>();

            for (const row of reportRows) {
                if (!isReportingFeeDueStatus(row)) continue;
                const projectId = pickReportCheckOpportunityKey(row);
                if (!projectId || seen.has(projectId)) continue;
                const latest = latestSlipForProject(history, projectId);
                if (latest && (latest.payment.status === "pending" || latest.payment.status === "approved")) continue;
                seen.add(projectId);
                const sample = sampleById.get(projectId);
                outstanding.push({
                    projectId,
                    title: pickTitle(row) || sample?.title || "Project",
                    organizationName: pickOrg(row),
                    hoursVerifiedAt: pickWhen(row),
                    amountLabel: rsLabel(REPORTING_FEE_PKR),
                });
            }

            if (outstanding.length === 0) {
                for (const sample of dashboard?.overview?.pendingPaymentsSample ?? []) {
                    if (seen.has(sample.id)) continue;
                    const latest = latestSlipForProject(history, sample.id);
                    if (latest && (latest.payment.status === "pending" || latest.payment.status === "approved")) continue;
                    outstanding.push({
                        projectId: sample.id,
                        title: sample.title,
                        organizationName: null,
                        hoursVerifiedAt: null,
                        amountLabel: rsLabel(REPORTING_FEE_PKR),
                    });
                }
                const qp = dashboard?.quickActions?.viewPayment;
                if (qp?.projectId && !outstanding.some((d) => d.projectId === qp.projectId)) {
                    const latest = latestSlipForProject(history, qp.projectId);
                    if (!latest || latest.payment.status === "rejected") {
                        outstanding.unshift({
                            projectId: qp.projectId,
                            title: qp.title,
                            organizationName: null,
                            hoursVerifiedAt: null,
                            amountLabel: rsLabel(REPORTING_FEE_PKR),
                        });
                    }
                }
            }

            setDueItems(outstanding);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const approvedCount = rows.filter((row) => row.payment.status === "approved").length;
    const dueNow = dueItems[0] ?? null;
    const defaultFee = rsLabel(REPORTING_FEE_PKR);

    const statusDot = (status: StudentManualPaymentHistoryRow["payment"]["status"]) => {
        if (status === "approved") return { color: "text-emerald-700", label: "Approved" };
        if (status === "rejected") return { color: "text-red-600", label: "Rejected" };
        return { color: "text-amber-700", label: "Under review" };
    };

    const dueCopy = useMemo(() => {
        if (!dueNow) return null;
        const when = formatShortDate(dueNow.hoursVerifiedAt);
        return (
            <>
                One reporting fee is outstanding for <span className="font-semibold text-ciel-text">{dueNow.title}</span>
                {when ? (
                    <>
                        . Hours were verified {when} — pay and upload your slip, or those hours won&apos;t count toward your
                        requirement.
                    </>
                ) : (
                    <>
                        . Pay it and upload your slip, or the verified hours won&apos;t count toward your requirement.
                    </>
                )}
            </>
        );
    }, [dueNow]);

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 text-ciel-text-mid">
                <Loader2 className="h-8 w-8 animate-spin text-[#0e7d74]" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-16">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-tight text-ciel-text">Payments</h1>
                    <p className="mt-1 text-sm text-ciel-text-mid">
                        Reporting fees for your projects, and the slips you&apos;ve uploaded.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setPolicyOpen(true)}
                    className="h-9 shrink-0 rounded-full border border-ciel-border bg-white px-3.5 text-sm font-medium text-ciel-text hover:bg-slate-50"
                >
                    Fee policy
                </button>
            </header>

            {dueNow ? (
                <section className="flex flex-col gap-4 rounded-xl border border-ciel-border border-l-4 border-l-[#c2410c] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 sm:flex sm:items-start sm:gap-8">
                        <div className="shrink-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c2410c]">Due now</p>
                            <p className="mt-1 text-3xl font-bold tracking-tight text-ciel-text">{dueNow.amountLabel}</p>
                        </div>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ciel-text-mid sm:mt-1">{dueCopy}</p>
                    </div>
                    <Link
                        href={paymentHref(dueNow.projectId)}
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-[#0e7d74] px-4 text-sm font-semibold text-white hover:bg-[#0c6b64]"
                    >
                        Pay and upload slip
                    </Link>
                </section>
            ) : null}

            <section>
                <h2 className="text-lg font-bold text-ciel-text">Waiting for payment</h2>
                <p className="mt-0.5 text-sm text-ciel-text-mid">
                    Hours are verified. The reporting fee still needs a slip before they count.
                </p>
                {dueItems.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-ciel-border bg-white px-4 py-8 text-center text-sm text-ciel-text-mid">
                        Nothing waiting — you&apos;re up to date.
                    </p>
                ) : (
                    <ul className="mt-4 space-y-2">
                        {dueItems.map((item) => {
                            const verified = formatShortDate(item.hoursVerifiedAt);
                            return (
                                <li
                                    key={item.projectId}
                                    className="flex flex-col gap-3 rounded-xl border border-ciel-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="font-bold text-ciel-text">{item.title}</p>
                                        <p className="mt-0.5 text-sm text-ciel-text-mid">
                                            {[item.organizationName, verified ? `Hours verified ${verified}` : null]
                                                .filter(Boolean)
                                                .join(" · ") || "Reporting fee due"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                                        <div className="text-left sm:text-right">
                                            <p className="font-bold text-ciel-text">{item.amountLabel}</p>
                                            <p className="text-sm text-[#c2410c]">Fee due</p>
                                        </div>
                                        <Link
                                            href={paymentHref(item.projectId)}
                                            className="inline-flex h-9 items-center rounded-md bg-[#0e7d74] px-3.5 text-sm font-semibold text-white hover:bg-[#0c6b64]"
                                        >
                                            Upload slip
                                        </Link>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-ciel-text">Slips you&apos;ve uploaded</h2>
                        <p className="mt-0.5 text-sm text-ciel-text-mid">Newest first. Status updates when an admin reviews your slip.</p>
                    </div>
                    <p className="text-sm text-ciel-text-mid">
                        {rows.length} uploaded · {approvedCount} approved
                    </p>
                </div>

                {rows.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-ciel-border bg-white px-4 py-8 text-center text-sm text-ciel-text-mid">
                        When you upload a reporting-fee receipt, it will appear here.
                    </p>
                ) : (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-ciel-border bg-white">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-ciel-border text-[11px] font-semibold uppercase tracking-wider text-ciel-text-soft">
                                    <th className="px-4 py-3 font-semibold">Project</th>
                                    <th className="px-4 py-3 font-semibold">Amount</th>
                                    <th className="px-4 py-3 font-semibold">Reference</th>
                                    <th className="px-4 py-3 font-semibold">Uploaded</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const projectId = row.opportunity?.id ?? row.opportunityId;
                                    const visual = statusDot(row.payment.status);
                                    return (
                                        <tr key={row.payment.id} className="border-b border-ciel-border last:border-0">
                                            <td className="px-4 py-3.5">
                                                <p className="font-semibold text-ciel-text">
                                                    {row.opportunity?.title || "Reporting fee"}
                                                </p>
                                                {row.opportunity?.organizationName ? (
                                                    <p className="text-xs text-ciel-text-mid">{row.opportunity.organizationName}</p>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3.5 text-ciel-text">{rsLabel(row.payment.amount)}</td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-ciel-text-mid">
                                                {row.payment.id ? row.payment.id.slice(0, 8).toUpperCase() : "—"}
                                            </td>
                                            <td className="px-4 py-3.5 text-ciel-text-mid">
                                                {formatShortDate(row.payment.submittedAt) || "—"}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <p className={`inline-flex items-center gap-1.5 font-medium ${visual.color}`}>
                                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                    {visual.label}
                                                </p>
                                                {row.payment.status === "rejected" ? (
                                                    <div className="mt-1">
                                                        {row.payment.feedback ? (
                                                            <p className="text-xs text-red-600">{row.payment.feedback}</p>
                                                        ) : null}
                                                        {projectId ? (
                                                            <Link
                                                                href={paymentHref(projectId)}
                                                                className="mt-0.5 inline-block text-xs font-semibold text-[#0e7d74] hover:underline"
                                                            >
                                                                Upload a new slip
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                ) : row.payment.proofUrl ? (
                                                    <a
                                                        href={row.payment.proofUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-0.5 inline-block text-xs font-medium text-[#0e7d74] hover:underline"
                                                    >
                                                        View proof
                                                    </a>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div className="flex gap-3 rounded-xl border border-ciel-border bg-white px-4 py-3.5 text-sm text-ciel-text-mid">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-ciel-text-soft" />
                <p>
                    Keep the original receipt until the slip shows Approved. A rejected slip usually just needs a clearer
                    photo — the amount and reference have to be readable.
                </p>
            </div>

            <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Fee policy</DialogTitle>
                        <DialogDescription>
                            One reporting fee per verified project. Transfer the amount below, then upload the bank slip.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 px-1 pb-2 text-sm">
                        <p>
                            <span className="text-ciel-text-mid">Amount: </span>
                            <span className="font-bold text-ciel-text">{defaultFee}</span>
                            <span className="text-ciel-text-mid"> ({REPORTING_FEE_DISPLAY})</span>
                        </p>
                        <div className="space-y-1 rounded-lg border border-ciel-border bg-slate-50 px-3 py-2.5 text-ciel-text">
                            <p>
                                <span className="text-ciel-text-mid">Bank: </span>
                                {CIEL_OFFICIAL_BANK.bankName}
                            </p>
                            <p>
                                <span className="text-ciel-text-mid">Title: </span>
                                {CIEL_OFFICIAL_BANK.accountTitle}
                            </p>
                            <p>
                                <span className="text-ciel-text-mid">Account: </span>
                                {CIEL_OFFICIAL_BANK.accountNumber}
                            </p>
                            <p className="break-all">
                                <span className="text-ciel-text-mid">IBAN: </span>
                                {CIEL_OFFICIAL_BANK.iban}
                            </p>
                        </div>
                        <p className="text-ciel-text-mid">
                            Verified hours count toward your requirement only after the slip is approved.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
