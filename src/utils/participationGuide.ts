import { authenticatedFetch } from "@/utils/api";

export type ParticipationYourRole =
    | "none"
    | "pending_application"
    | "individual_owner"
    | "team_lead"
    | "team_member";

export type ParticipationGuide = {
    your_role: ParticipationYourRole;
    recommended_action: string;
    can_apply: boolean;
    can_apply_as_team_lead: boolean;
    team_lead_name: string | null;
    team_display_name: string | null;
    attendance_approver_type: "faculty" | "partner";
    attendance_approver_label: string;
    participation_phase?: ParticipationPhase;
    participation_phase_label?: string;
    messages: { en: string; ur: string };
};

export type ParticipationPhase =
    | "not_applied"
    | "application_pending"
    | "enrolled_individual"
    | "team_formed_lead"
    | "team_member_pending_verification"
    | "team_member_active"
    | "attendance_pending_partner"
    | "attendance_pending_faculty"
    | "report_in_progress"
    | "report_submitted"
    | "verified";

export type MyParticipationPayload = {
    project_id: string;
    project_title: string;
    your_role: ParticipationYourRole;
    is_team_lead: boolean;
    is_team_member: boolean;
    team_display_name: string | null;
    team_lead_name: string | null;
    attendance_approver_type: "faculty" | "partner";
    attendance_approver_label: string;
    participation_phase?: ParticipationPhase;
    participation_phase_label?: string;
    participation_state: "verify" | "log_attendance" | "pending_approval" | "complete";
    hours: { required: number; logged: number; approved: number };
    attendance_locked: boolean;
    team_report_status: string | null;
    recommended_action: string;
    messages: { en: string; ur: string };
    participation_id: string;
};

export async function fetchParticipationGuide(opportunityId: string): Promise<ParticipationGuide | null> {
    const res = await authenticatedFetch(
        `/api/v1/student/opportunities/${encodeURIComponent(opportunityId)}/participation-guide`,
    );
    if (!res?.ok) return null;
    const body = await res.json().catch(() => null);
    return body?.data ?? body ?? null;
}

export async function fetchMyParticipation(projectId: string): Promise<MyParticipationPayload | null> {
    const res = await authenticatedFetch(
        `/api/v1/student/projects/${encodeURIComponent(projectId)}/my-participation`,
    );
    if (!res?.ok) return null;
    const body = await res.json().catch(() => null);
    return body?.data ?? null;
}

export async function formTeamFromLead(projectId: string, memberParticipationIds: string[]) {
    return authenticatedFetch(`/api/v1/engagement/teams/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, memberParticipationIds }),
    });
}

export function resolveStudentProjectActionHref(project: {
    id: string;
    is_team_member?: boolean;
    isTeamMember?: boolean;
}): string {
    if (project.is_team_member || project.isTeamMember) {
        return `/dashboard/student/projects/${encodeURIComponent(project.id)}/participation`;
    }
    return `/dashboard/student/report?projectId=${encodeURIComponent(project.id)}`;
}
