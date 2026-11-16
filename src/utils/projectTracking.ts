import { authenticatedFetch } from "@/utils/api";
import { displayOrganizationName } from "@/utils/displayOrganizationName";
import type { FacultyCsReportRow } from "@/app/dashboard/faculty/community-service/useFacultyCommunityServiceData";

/** Tracking API paths per dashboard. The rows are identical; only the scope differs. */
export const PROJECT_TRACKING_API = {
    faculty: "/api/v1/faculty/community-service/tracking",
    partner: "/api/v1/partners/community-service/tracking",
    admin: "/api/v1/admin/community-service/tracking",
} as const;

export type ProjectTrackingRole = keyof typeof PROJECT_TRACKING_API;

export function projectTrackingRemindPath(role: ProjectTrackingRole, opportunityId: string): string {
    return `${PROJECT_TRACKING_API[role]}/${encodeURIComponent(opportunityId)}/remind`;
}

function pickStr(item: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "string" && value.trim()) return value;
    }
    return undefined;
}

function num(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return undefined;
}

/** One tracking API row → the dashboard row every monitor card renders. */
export function mapTrackingRow(item: Record<string, unknown>): FacultyCsReportRow | null {
    const id = String(item.id || "");
    if (!id) return null;
    const email = pickStr(item, "student_email", "studentEmail");
    const members = Array.isArray(item.member_hours)
        ? item.member_hours
              .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
              .map((row) => ({
                  name: pickStr(row, "name") || "Student",
                  hours: Number(row.hours || 0) || 0,
                  required: Number(row.required || 16) || 16,
              }))
        : [];
    return {
        id,
        student_name: pickStr(item, "student_name", "studentName") || "Student",
        student_email: email && email.includes("@") ? email : undefined,
        project_title: pickStr(item, "project_title", "projectTitle") || "Project",
        organization_name: displayOrganizationName(pickStr(item, "organization_name", "organizationName")),
        project_id: pickStr(item, "project_id", "projectId", "opportunity_id", "opportunityId"),
        faculty_status: pickStr(item, "faculty_status", "facultyStatus"),
        status: pickStr(item, "status") || "assigned",
        hours: num(item.hours) ?? 0,
        required_hours: num(item.required_hours) ?? 16,
        submission_date: pickStr(item, "submission_date", "submissionDate"),
        report_submitted_at: pickStr(item, "report_submitted_at", "reportSubmittedAt"),
        updated_at: pickStr(item, "updated_at", "updatedAt", "last_activity_at"),
        last_activity_at: pickStr(item, "last_activity_at"),
        report_id: pickStr(item, "report_id", "reportId") || null,
        hours_progress_pct: num(item.hours_progress_pct),
        progress_pct: num(item.progress_pct),
        sections_complete: num(item.sections_complete),
        sections_total: num(item.sections_total),
        draft_locked: item.draft_locked === true,
        team_id: pickStr(item, "team_id", "teamId") || null,
        is_team_lead: item.is_team_lead === true,
        participation_type: pickStr(item, "participation_type", "participationType") || undefined,
        member_hours: members,
        // Communication bar: deadline + last "Complete your report ASAP" reminder.
        project_end_date: pickStr(item, "project_end_date") || null,
        reporting_close_date: pickStr(item, "reporting_close_date") || null,
        days_left_to_report: num(item.days_left_to_report) ?? null,
        deadline_phase: pickStr(item, "deadline_phase") || null,
        last_reminder_at: pickStr(item, "last_reminder_at") || null,
        last_reminder_channel: pickStr(item, "last_reminder_channel") || null,
        reminders_sent: num(item.reminders_sent) ?? 0,
    };
}

export function mapTrackingRows(payload: unknown): FacultyCsReportRow[] {
    const data = payload && typeof payload === "object" ? (payload as { data?: unknown }).data : null;
    return (Array.isArray(data) ? data : [])
        .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map(mapTrackingRow)
        .filter((row): row is FacultyCsReportRow => row != null);
}

export async function fetchProjectTracking(role: ProjectTrackingRole): Promise<FacultyCsReportRow[]> {
    const res = await authenticatedFetch(PROJECT_TRACKING_API[role], {}, { redirectToLogin: false });
    if (!res?.ok) return [];
    return mapTrackingRows(await res.json().catch(() => null));
}

export type RemindNowResult = {
    sent: number;
    skipped: number;
    failed: number;
    recipients: Array<{ email: string; name: string; status: "sent" | "skipped" | "failed"; reason?: string }>;
};

/** Reviewer "Remind now": the server sends the standard "Complete your report ASAP" message. */
export async function postRemindNow(
    role: ProjectTrackingRole,
    opportunityId: string,
    studentEmail?: string | null,
): Promise<RemindNowResult> {
    const res = await authenticatedFetch(
        projectTrackingRemindPath(role, opportunityId),
        { method: "POST", body: JSON.stringify(studentEmail ? { student_email: studentEmail } : {}) },
        { redirectToLogin: false },
    );
    if (!res?.ok) {
        const body = await res?.json().catch(() => null);
        throw new Error(
            (body && typeof body.message === "string" && body.message) ||
                (body && typeof body.error === "string" && body.error) ||
                "Reminder could not be sent.",
        );
    }
    const json = await res.json();
    const data = (json?.data ?? json) as Partial<RemindNowResult>;
    return {
        sent: Number(data.sent || 0),
        skipped: Number(data.skipped || 0),
        failed: Number(data.failed || 0),
        recipients: Array.isArray(data.recipients) ? data.recipients : [],
    };
}

/** Toast text for a Remind now result. */
export function describeRemindNowResult(result: RemindNowResult): { ok: boolean; message: string } {
    if (result.sent > 0) {
        return {
            ok: true,
            message: `Reminder sent to ${result.sent} student${result.sent === 1 ? "" : "s"}${
                result.skipped ? ` (${result.skipped} already reminded today or submitted)` : ""
            }.`,
        };
    }
    if (result.skipped > 0) {
        const submitted = result.recipients.filter((r) => r.reason === "report_submitted").length;
        return {
            ok: true,
            message:
                submitted === result.recipients.length && submitted > 0
                    ? "Every report on this project is already submitted."
                    : "Already reminded today — one reminder per student per day.",
        };
    }
    if (result.failed > 0) return { ok: false, message: "The reminder could not be delivered. Try again later." };
    return { ok: false, message: "No student with an open report was found on this project." };
}
