/**
 * Browse / opportunity detail: single CTA for report lifecycle, payment, and CII access.
 * Status values align with `/api/v1/students/reports/check` and My Projects (`report_status`).
 */

export function pickReportCheckOpportunityKey(raw: Record<string, unknown>): string {
    const k =
        raw.opportunityId ??
        raw.opportunity_id ??
        raw.projectId ??
        raw.project_id ??
        raw.project_title;
    return typeof k === "string" && k.trim() ? k.trim() : "";
}

export function buildStudentReportsCheckMap(rows: unknown): Map<string, Record<string, unknown>> {
    const m = new Map<string, Record<string, unknown>>();
    if (!Array.isArray(rows)) return m;
    for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const key = pickReportCheckOpportunityKey(r);
        if (key) m.set(key, r);
    }
    return m;
}

export function pickReportStatusFromCheckRow(row: Record<string, unknown> | undefined): string {
    if (!row) return "none";
    const s = row.status ?? row.report_status ?? row.reportStatus;
    return typeof s === "string" && s.trim() ? s.trim().toLowerCase() : "none";
}

export type StudentBrowseReportCta = {
    label: string;
    href: string;
};

/** Resolve label + route for the report/payment/CII button on student browse and opportunity detail. */
export function resolveStudentBrowseReportCta(projectId: string, reportStatus: string | undefined): StudentBrowseReportCta {
    const st = (reportStatus || "none").trim().toLowerCase();
    const reportHref = `/dashboard/student/report?projectId=${encodeURIComponent(projectId)}`;
    const paymentHref = `/dashboard/student/payment?projectId=${encodeURIComponent(projectId)}`;

    if (st === "verified" || st === "paid") {
        return {
            label: "CII index score",
            href: `${reportHref}&focus=summary`,
        };
    }
    if (st === "payment_under_review") {
        return { label: "Payment pending", href: paymentHref };
    }
    if (st === "pending_payment") {
        return { label: "Payment due", href: paymentHref };
    }
    if (st === "submitted") {
        return { label: "Submitted", href: reportHref };
    }
    if (st === "rejected") {
        return { label: "Revise report", href: reportHref };
    }
    if (st === "continue" || st === "draft") {
        return { label: "Continue report", href: reportHref };
    }
    return { label: "Start Report", href: reportHref };
}
