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

const PHASE_STYLES: Record<
    ParticipationPhase,
    { label: string; className: string }
> = {
    not_applied: {
        label: "Not applied",
        className: "bg-slate-50 text-slate-600 border-slate-200",
    },
    application_pending: {
        label: "Application pending",
        className: "bg-amber-50 text-amber-800 border-amber-100",
    },
    enrolled_individual: {
        label: "Individual",
        className: "bg-slate-50 text-slate-700 border-slate-200",
    },
    team_formed_lead: {
        label: "Team lead",
        className: "bg-violet-50 text-violet-700 border-violet-100",
    },
    team_member_pending_verification: {
        label: "Verify email",
        className: "bg-amber-50 text-amber-900 border-amber-100",
    },
    team_member_active: {
        label: "Team member",
        className: "bg-emerald-50 text-emerald-800 border-emerald-100",
    },
    attendance_pending_partner: {
        label: "Partner review",
        className: "bg-orange-50 text-orange-800 border-orange-100",
    },
    attendance_pending_faculty: {
        label: "Faculty review",
        className: "bg-orange-50 text-orange-800 border-orange-100",
    },
    report_in_progress: {
        label: "Report in progress",
        className: "bg-blue-50 text-blue-800 border-blue-100",
    },
    report_submitted: {
        label: "Report submitted",
        className: "bg-indigo-50 text-indigo-800 border-indigo-100",
    },
    verified: {
        label: "Verified",
        className: "bg-emerald-50 text-emerald-800 border-emerald-100",
    },
};

type Props = {
    phase?: ParticipationPhase | string | null;
    label?: string | null;
    className?: string;
};

export function ParticipationPhaseBadge({ phase, label, className = "" }: Props) {
    const key = (phase || "") as ParticipationPhase;
    const style = PHASE_STYLES[key] ?? PHASE_STYLES.not_applied;
    const text = (label || "").trim() || style.label;

    return (
        <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${style.className} ${className}`}
        >
            {text}
        </span>
    );
}

export function normalizeParticipationPhase(value: unknown): ParticipationPhase | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim() as ParticipationPhase;
    return normalized in PHASE_STYLES ? normalized : null;
}
