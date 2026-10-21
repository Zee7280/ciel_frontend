"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import {
    AlertTriangle,
    Bell,
    Bug,
    Check,
    ClipboardList,
    Copy,
    ExternalLink,
    FileText,
    History,
    Info,
    Loader2,
    Mail,
    Minus,
    Search,
    Settings,
    Users,
    X,
} from "lucide-react";
import ConfirmModal from "@/app/dashboard/admin/_shared/ConfirmModal";
import {
    asRecord,
    buildJourney,
    computeRosterStats,
    extractApplicationsRoster,
    extractTrackerSnapshot,
    fmtDate,
    fmtHours,
    focusStepIndex,
    pickString,
    plural,
    reportStage,
    studentGuide,
    whatsappNumber,
    STUDENT_PATHS,
    type ApplicationRosterRow,
    type AttendanceSessionPreview,
    type JourneyStepModel,
    type StepOwner,
    type StepState,
    type TrackerOpportunitySnapshot,
} from "@/app/dashboard/admin/projects/projectJourney";

export type ProjectTrackerRow = {
    id: string;
    title: string;
    subtitle: string;
    displayStatus: string;
    locationLabel: string;
    volunteers: number;
    volunteersRequired: number | null;
    remainingSeats: number | null;
    /** Hours students have logged so far (verified or not). */
    hours: number;
    /** Hours confirmed on locked flash cards; backend `remaining_hours` is target minus this. */
    verifiedHours: number;
    remainingHours?: number | null;
    raw: Record<string, unknown>;
};

type Props = {
    row: ProjectTrackerRow;
    onClose: () => void;
    onOpenTeamsEnrollments: () => void;
    onOpenIncompleteReports: () => void;
    onOpenDebug: () => void;
};

/** Support actions — every one maps to an existing, audited admin endpoint. */
type SupportAction =
    | { kind: "remind"; reviewer: "faculty" | "partner" }
    | { kind: "joinApprove" | "joinReject"; app: ApplicationRosterRow }
    | { kind: "sessionApprove" | "sessionReject" | "sessionFlag"; app: ApplicationRosterRow; session: AttendanceSessionPreview }
    | { kind: "reportSendBack"; app: ApplicationRosterRow };

const STEP_STATE_LABEL: Record<StepState, string> = {
    done: "Done",
    current: "In progress",
    waiting: "Not started",
    blocked: "Stopped",
    skipped: "Not needed",
};

const OWNER_LABEL: Record<Exclude<StepOwner, null>, string> = {
    student: "Student",
    faculty: "Faculty",
    partner: "Partner",
    admin: "CIEL admin",
};

const STEP_DOT_CLASS: Record<StepState, string> = {
    done: "bg-[#0e756e] text-white border-[#0e756e]",
    current: "bg-amber-400 text-amber-950 border-amber-400 ring-4 ring-amber-200/70",
    waiting: "bg-white text-[#70808a] border-[#cbd6dc]",
    blocked: "bg-rose-600 text-white border-rose-600",
    skipped: "bg-slate-100 text-slate-400 border-slate-200",
};

const STEP_BADGE_CLASS: Record<StepState, string> = {
    done: "bg-emerald-50 text-emerald-800 border-emerald-100",
    current: "bg-amber-50 text-amber-900 border-amber-200",
    waiting: "bg-slate-50 text-slate-500 border-slate-200",
    blocked: "bg-rose-50 text-rose-800 border-rose-100",
    skipped: "bg-slate-50 text-slate-400 border-slate-200",
};

const STEP_CARD_CLASS: Record<StepState, string> = {
    done: "border-[#dde5ea] bg-white",
    current: "border-amber-300 bg-amber-50/40 shadow-[0_8px_22px_rgba(180,120,20,.10)]",
    waiting: "border-dashed border-[#dde5ea] bg-white/60",
    blocked: "border-rose-200 bg-rose-50/40",
    skipped: "border-dashed border-[#e6ecef] bg-white/40",
};

const SECONDARY_BTN =
    "inline-flex items-center gap-1.5 rounded-xl border border-[#dde5ea] bg-white px-3 py-2 text-xs font-bold text-[#0e756e] hover:border-[#0e756e] hover:bg-[#f3fbf9] disabled:opacity-50";

const SMALL_BTN = "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold disabled:opacity-50";

const INPUT_CLASS =
    "w-full rounded-xl border border-[#dde5ea] bg-[#f7fafb] px-3 py-2.5 text-sm font-semibold text-[#16313d] outline-none focus:border-[#15988b] focus:bg-white focus:ring-4 focus:ring-[#15988b]/15";

function approvalGateChipClass(kind: string | null | undefined): string {
    const s = String(kind ?? "")
        .trim()
        .toLowerCase();
    if (s === "approved" || s === "verified") return "bg-emerald-50 text-emerald-800 border-emerald-100";
    if (s === "pending") return "bg-amber-50 text-amber-900 border-amber-100";
    if (s === "rejected") return "bg-rose-50 text-rose-800 border-rose-100";
    if (s === "flagged") return "bg-orange-50 text-orange-900 border-orange-100";
    return "bg-slate-50 text-slate-600 border-slate-200";
}

function humanizeAttendanceEntryStatus(s: string): string {
    const k = s.trim().toLowerCase();
    if (k === "pending") return "Logged · awaiting check";
    if (k === "verified") return "Verified on entry";
    if (k === "flagged") return "Flagged for review";
    return s.replace(/_/g, " ") || "—";
}

function humanizeAttendanceApprovalStatus(s: string | null): string {
    if (s == null || !String(s).trim()) return "Review not finalized";
    const k = s.trim().toLowerCase();
    if (k === "pending") return "Awaiting reviewer";
    if (k === "approved") return "Reviewer approved";
    if (k === "rejected") return "Reviewer rejected";
    if (k === "flagged") return "Flagged";
    return s.trim();
}

async function copyText(text: string, what = "Message") {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(`${what} copied`);
    } catch {
        toast.error("Could not copy — select the text and copy it manually");
    }
}

function Chip({ tone, children }: { tone: string; children: ReactNode }) {
    return (
        <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-bold ${tone}`}>
            {children}
        </span>
    );
}

function StepIcon({ state, index }: { state: StepState; index: number }) {
    if (state === "done") return <Check className="h-4 w-4" strokeWidth={3} />;
    if (state === "blocked") return <X className="h-4 w-4" strokeWidth={3} />;
    if (state === "skipped") return <Minus className="h-4 w-4" strokeWidth={3} />;
    return <span className="text-xs font-black">{String.fromCharCode(65 + index)}</span>;
}

/** Ready-to-send guidance for the person who has to act — copy, or WhatsApp the creator. */
function GuideBox({ text, waPhone, waLabel }: { text: string; waPhone?: string; waLabel?: string }) {
    return (
        <div className="mt-2.5 rounded-xl border border-[#c9ebe6] bg-[#f3fbf9] px-3 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-[0.08em] text-[#0e756e]">Tell the user</div>
            <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-[#16313d]">{text}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => void copyText(text)} className={SECONDARY_BTN}>
                    <Copy className="h-3.5 w-3.5" /> Copy message
                </button>
                {waPhone ? (
                    <a
                        href={`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${SECONDARY_BTN} text-emerald-700`}
                    >
                        WhatsApp {waLabel ?? "creator"}
                    </a>
                ) : null}
            </div>
        </div>
    );
}

/** Expandable session list with review actions on sessions still waiting for a decision. */
function AttendanceSessionsBreakdown({
    sessions,
    onAction,
}: {
    sessions: AttendanceSessionPreview[];
    onAction: (session: AttendanceSessionPreview, kind: "sessionApprove" | "sessionReject" | "sessionFlag") => void;
}) {
    if (!sessions.length) return null;
    const pending = sessions.filter((s) => s.approvalStatus === "pending").length;
    return (
        <details className="mt-3 rounded-xl border border-[#dde5ea] bg-white px-3 py-2" open={pending > 0}>
            <summary className="cursor-pointer select-none text-[11px] font-bold text-[#0e756e] hover:underline">
                Attendance sessions ({sessions.length}){pending > 0 ? ` · ${pending} waiting for review` : ""}
            </summary>
            <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1" aria-label="Attendance sessions list">
                {sessions.map((s) => (
                    <li
                        key={s.id}
                        className={`rounded-lg border px-2.5 py-2 text-[11px] leading-snug ${
                            s.needsReview ? "border-amber-300 bg-amber-50/60" : "border-slate-100 bg-slate-50"
                        }`}
                    >
                        <div className="font-bold text-slate-900">
                            <time dateTime={s.dateOfEngagement}>{s.dateOfEngagement}</time>
                            <span className="mx-1 font-semibold text-slate-500">·</span>
                            {s.startTime}
                            <span className="text-slate-400">–</span>
                            {s.endTime}
                            <span className="mx-1 font-semibold text-slate-500">·</span>
                            {fmtHours(s.sessionHours)} h
                        </div>
                        <div className="mt-1 text-slate-700">
                            <span className="text-slate-500">Activity:</span> {s.activityType}
                            {s.organizationName && s.organizationName !== "—" ? (
                                <>
                                    {" "}
                                    <span className="text-slate-400">|</span> <span className="text-slate-500">Org:</span>{" "}
                                    {s.organizationName}
                                </>
                            ) : null}
                        </div>
                        {s.description ? <p className="mt-1 line-clamp-3 italic text-slate-600">{s.description}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-1">
                            <span
                                className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${approvalGateChipClass(s.entryStatus)}`}
                            >
                                Entry: {humanizeAttendanceEntryStatus(s.entryStatus)}
                            </span>
                            <span
                                className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${approvalGateChipClass(s.approvalStatus ?? "pending")}`}
                            >
                                Review: {humanizeAttendanceApprovalStatus(s.approvalStatus)}
                            </span>
                            {s.evidenceUploaded ? (
                                <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                                    Evidence attached
                                </span>
                            ) : (
                                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                                    No evidence
                                </span>
                            )}
                            {s.assignedApproverType ? (
                                <span className="text-[9px] capitalize text-slate-500">Reviewer: {s.assignedApproverType}</span>
                            ) : null}
                        </div>
                        {s.approvalStatus === "pending" ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => onAction(s, "sessionApprove")}
                                    className={`${SMALL_BTN} border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50`}
                                >
                                    <Check className="h-3 w-3" /> Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onAction(s, "sessionReject")}
                                    className={`${SMALL_BTN} border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}
                                    title="Wrong date / time / hours — student must log it again"
                                >
                                    <X className="h-3 w-3" /> Reject (wrong entry)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onAction(s, "sessionFlag")}
                                    className={`${SMALL_BTN} border-orange-200 bg-white text-orange-800 hover:bg-orange-50`}
                                >
                                    <AlertTriangle className="h-3 w-3" /> Flag
                                </button>
                            </div>
                        ) : null}
                    </li>
                ))}
            </ul>
        </details>
    );
}

/** One applicant's mini journey with the support actions that apply to their current step. */
function StudentJourney({
    a,
    opportunityId,
    origin,
    onAction,
}: {
    a: ApplicationRosterRow;
    opportunityId: string;
    origin: string;
    onAction: (action: SupportAction) => void;
}) {
    const status = a.internalStatus;
    const enrolled = status === "approved";
    const joinRejected = status.endsWith("_rejected");
    const joinAwaitingAdmin = status === "pending_admin" || status === "pending_partner";
    const total = a.attendanceSessionsTotal ?? 0;
    const pending = a.attendanceSessionsPendingReview ?? 0;
    const report = reportStage(a);
    const guide = studentGuide(a, opportunityId, origin);

    const steps: Array<{ label: string; state: StepState; text: string }> = [
        { label: "Applied", state: "done", text: fmtDate(a.createdAt) ?? "Application received" },
        { label: "Join approval", state: enrolled ? "done" : joinRejected ? "blocked" : "current", text: a.joinStageDisplay },
        {
            label: "Attendance",
            state: !enrolled ? (joinRejected ? "skipped" : "waiting") : pending > 0 ? "current" : total > 0 ? "done" : "current",
            text: !enrolled
                ? "After seat is issued"
                : pending > 0
                  ? `${plural(pending, "session")} waiting review · ${total} logged`
                  : total > 0
                    ? `${plural(total, "session")} logged · none pending`
                    : "No sessions logged yet",
        },
        {
            label: "Impact report",
            state: !enrolled
                ? joinRejected
                    ? "skipped"
                    : "waiting"
                : report === "verified"
                  ? "done"
                  : report === "rejected"
                    ? "blocked"
                    : report === "none"
                      ? "waiting"
                      : "current",
            text: !enrolled ? "After seat is issued" : (a.impactReportSummary ?? "No impact report yet"),
        },
    ];

    return (
        <li className="rounded-[18px] border border-[#dde5ea] bg-white p-3.5 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="truncate font-bold text-[#16313d]" title={a.studentName}>
                        {a.studentName}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-[#70808a]">
                        {a.studentEmail ? (
                            <button
                                type="button"
                                onClick={() => void copyText(a.studentEmail, "Email")}
                                className="inline-flex items-center gap-1 truncate hover:text-[#0e756e]"
                                title="Copy email"
                            >
                                <Mail className="h-3 w-3" /> {a.studentEmail}
                            </button>
                        ) : (
                            "—"
                        )}
                        <span>·</span>
                        <span className="capitalize">{a.participationType}</span>
                        {a.teamMembers.length > 0 ? <span>· +{plural(a.teamMembers.length, "teammate")}</span> : null}
                    </div>
                </div>
                {enrolled && a.impactReportRawStatus ? (
                    <div className="flex flex-wrap gap-1">
                        {(
                            [
                                ["Partner", a.impactReportPartnerStatus],
                                ["Admin", a.impactReportAdminStatus],
                                ["Faculty", a.impactReportFacultyStatus],
                            ] as const
                        ).map(([who, st]) =>
                            st ? (
                                <span
                                    key={who}
                                    title={`${who} gate on impact report`}
                                    className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${approvalGateChipClass(st)}`}
                                >
                                    {who}: {st}
                                </span>
                            ) : null,
                        )}
                    </div>
                ) : null}
            </div>

            {a.enrollmentWarning ? (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {a.enrollmentWarning} Use Teams &amp;
                    enrollments → Reconcile to fix the seat.
                </p>
            ) : null}

            {a.teamMembers.length > 0 ? (
                <p className="mt-2 text-[11px] text-[#5b6b75]">
                    Team: {a.teamMembers.map((m) => m.name || m.email).filter(Boolean).join(", ")}
                </p>
            ) : null}

            <ol className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
                {steps.map((s, i) => (
                    <li key={s.label} className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${STEP_DOT_CLASS[s.state]} ${s.state === "current" ? "ring-2" : ""}`}
                            >
                                {s.state === "done" ? (
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                ) : s.state === "blocked" ? (
                                    <X className="h-3 w-3" strokeWidth={3} />
                                ) : (
                                    <span className="font-black">{i + 1}</span>
                                )}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-[#16313d]">{s.label}</span>
                        </div>
                        <p className="mt-1 pl-7 text-[11px] leading-snug text-[#5b6b75]">{s.text}</p>
                    </li>
                ))}
            </ol>

            {joinAwaitingAdmin || (enrolled && a.impactReportId) ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {joinAwaitingAdmin ? (
                        <>
                            <button
                                type="button"
                                onClick={() => onAction({ kind: "joinApprove", app: a })}
                                className={`${SMALL_BTN} border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50`}
                            >
                                <Check className="h-3 w-3" /> Approve join
                            </button>
                            <button
                                type="button"
                                onClick={() => onAction({ kind: "joinReject", app: a })}
                                className={`${SMALL_BTN} border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}
                            >
                                <X className="h-3 w-3" /> Reject join
                            </button>
                        </>
                    ) : null}
                    {enrolled && a.impactReportId ? (
                        <>
                            <Link
                                href={`/dashboard/admin/reports/verify/${encodeURIComponent(a.impactReportId)}`}
                                className={`${SMALL_BTN} border-[#dde5ea] bg-white text-[#0e756e] hover:bg-[#f3fbf9]`}
                            >
                                <FileText className="h-3 w-3" /> Open full report
                            </Link>
                            {report === "review" ? (
                                <button
                                    type="button"
                                    onClick={() => onAction({ kind: "reportSendBack", app: a })}
                                    className={`${SMALL_BTN} border-amber-200 bg-white text-amber-900 hover:bg-amber-50`}
                                    title="Wrong values in the report — send it back so the student can correct it"
                                >
                                    Send report back for correction
                                </button>
                            ) : null}
                        </>
                    ) : null}
                </div>
            ) : null}

            {guide.text ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#f7fafb] px-2.5 py-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0e756e]" />
                    <p className="min-w-0 flex-1 break-words text-[11px] leading-snug text-[#16313d]">
                        {guide.owner ? (
                            <span className="mr-1 font-black uppercase tracking-wide text-[#70808a]">
                                {OWNER_LABEL[guide.owner]}:
                            </span>
                        ) : null}
                        {guide.text}
                    </p>
                    <button
                        type="button"
                        onClick={() => void copyText(guide.text)}
                        className="shrink-0 rounded-md p-1 text-[#70808a] hover:bg-white hover:text-[#0e756e]"
                        aria-label="Copy guidance"
                        title="Copy message"
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : null}

            {enrolled ? (
                <AttendanceSessionsBreakdown
                    sessions={a.attendanceSessionsPreview}
                    onAction={(session, kind) => onAction({ kind, app: a, session })}
                />
            ) : null}
            {enrolled && total > a.attendanceSessionsPreview.length ? (
                <p className="mt-1 text-[10px] text-[#70808a]">
                    Showing the latest {a.attendanceSessionsPreview.length} of {total} sessions.
                </p>
            ) : null}
        </li>
    );
}

export function ProjectTrackerModal({ row, onClose, onOpenTeamsEnrollments, onOpenIncompleteReports, onOpenDebug }: Props) {
    const [loading, setLoading] = useState(true);
    const [roster, setRoster] = useState<ApplicationRosterRow[]>([]);
    const [snapshot, setSnapshot] = useState<TrackerOpportunitySnapshot | null>(null);
    const [studentQuery, setStudentQuery] = useState("");
    const [pendingAction, setPendingAction] = useState<SupportAction | null>(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [attendanceRoutingOverride, setAttendanceRoutingOverride] = useState<"auto" | "partner" | "faculty">("auto");
    const [attendanceRoutingSaving, setAttendanceRoutingSaving] = useState(false);
    const [facultySupervisorName, setFacultySupervisorName] = useState("");
    const [facultySupervisorEmail, setFacultySupervisorEmail] = useState("");
    const [partnerOrganizationName, setPartnerOrganizationName] = useState("");
    const [partnerContactPerson, setPartnerContactPerson] = useState("");
    const [partnerContactEmail, setPartnerContactEmail] = useState("");
    const [contactsSaving, setContactsSaving] = useState(false);
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const syncContactFormFromSnapshot = useCallback((nextSnapshot: TrackerOpportunitySnapshot | null) => {
        setFacultySupervisorName(nextSnapshot?.facultySupervisorName ?? "");
        setFacultySupervisorEmail(nextSnapshot?.facultySupervisorEmail ?? "");
        setPartnerOrganizationName(nextSnapshot?.executingOrganizationName ?? nextSnapshot?.partnerOrganizationName ?? "");
        setPartnerContactPerson(nextSnapshot?.partnerContactPerson ?? "");
        setPartnerContactEmail(nextSnapshot?.executingOrganizationEmail ?? nextSnapshot?.partnerOrganizationEmail ?? "");
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${encodeURIComponent(row.id)}/teams`);
            if (!res) {
                toast.error("Could not load project tracker");
                setRoster([]);
                setSnapshot(null);
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not load project tracker",
                );
                setRoster([]);
                setSnapshot(null);
                return;
            }
            const summaryRaw = asRecord(asRecord(data)?.summary);
            setRoster(extractApplicationsRoster(summaryRaw));
            const nextSnapshot = extractTrackerSnapshot(summaryRaw);
            setSnapshot(nextSnapshot);
            setAttendanceRoutingOverride(nextSnapshot.attendanceRoutingOverride);
            syncContactFormFromSnapshot(nextSnapshot);
        } catch {
            toast.error("Could not load project tracker");
            setRoster([]);
            setSnapshot(null);
        } finally {
            setLoading(false);
        }
    }, [row.id, syncContactFormFromSnapshot]);

    const contactsDirty = useMemo(() => {
        if (!snapshot) return false;
        const savedPartnerName = snapshot.executingOrganizationName ?? snapshot.partnerOrganizationName ?? "";
        const savedPartnerEmail = snapshot.executingOrganizationEmail ?? snapshot.partnerOrganizationEmail ?? "";
        return (
            facultySupervisorName.trim() !== (snapshot.facultySupervisorName ?? "").trim() ||
            facultySupervisorEmail.trim() !== (snapshot.facultySupervisorEmail ?? "").trim() ||
            partnerOrganizationName.trim() !== savedPartnerName.trim() ||
            partnerContactPerson.trim() !== (snapshot.partnerContactPerson ?? "").trim() ||
            partnerContactEmail.trim() !== savedPartnerEmail.trim()
        );
    }, [facultySupervisorEmail, facultySupervisorName, partnerContactEmail, partnerContactPerson, partnerOrganizationName, snapshot]);

    const saveContacts = useCallback(async () => {
        setContactsSaving(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${encodeURIComponent(row.id)}/contacts`, {
                method: "PATCH",
                body: JSON.stringify({
                    faculty_supervisor_name: facultySupervisorName.trim(),
                    faculty_supervisor_email: facultySupervisorEmail.trim(),
                    partner_organization_name: partnerOrganizationName.trim(),
                    partner_contact_person: partnerContactPerson.trim(),
                    partner_contact_email: partnerContactEmail.trim(),
                }),
            });
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
                const payload =
                    data && typeof data === "object"
                        ? (data as { data?: { propagation?: Record<string, number>; faculty_account_linked?: boolean } }).data
                        : undefined;
                const propagation = payload?.propagation;
                const facultyLinked = payload?.faculty_account_linked === true;
                const parts = [
                    propagation?.participations_updated ? `${propagation.participations_updated} enrollment(s)` : null,
                    propagation?.applications_updated ? `${propagation.applications_updated} application(s)` : null,
                    propagation?.reports_updated ? `${propagation.reports_updated} report(s)` : null,
                ].filter(Boolean);
                toast.success(
                    parts.length ? `Contacts updated — rebound ${parts.join(", ")}` : "Faculty and partner contacts updated",
                );
                if (facultySupervisorEmail.trim() && !facultyLinked) {
                    toast.message(
                        "Faculty email saved. Hub access will activate when that person registers a CIEL faculty account with this email.",
                    );
                }
                await load();
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not update contacts",
                );
            }
        } catch {
            toast.error("Could not update contacts");
        } finally {
            setContactsSaving(false);
        }
    }, [facultySupervisorEmail, facultySupervisorName, load, partnerContactEmail, partnerContactPerson, partnerOrganizationName, row.id]);

    const saveAttendanceRouting = useCallback(async () => {
        setAttendanceRoutingSaving(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(row.id)}/attendance-routing`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ override: attendanceRoutingOverride }),
                },
            );
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
                toast.success("Attendance routing updated");
                setSnapshot((prev) => (prev ? { ...prev, attendanceRoutingOverride } : prev));
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not update attendance routing",
                );
            }
        } catch {
            toast.error("Could not update attendance routing");
        } finally {
            setAttendanceRoutingSaving(false);
        }
    }, [attendanceRoutingOverride, row.id]);

    useEffect(() => {
        void load();
    }, [load]);

    const raw = row.raw;
    const creator = asRecord(raw.creator) ?? {};
    const creatorName = pickString(creator, ["name"]);
    const creatorEmail = pickString(creator, ["email"]);
    const creatorPhone = pickString(creator, ["phone"]);
    const creatorWa = whatsappNumber(creatorPhone);
    const publicCode = pickString(raw, ["public_code"]);
    const currentlyWith = pickString(raw, ["currently_with"]);
    const nextStep = pickString(raw, ["next_step"]);

    const stats = useMemo(() => computeRosterStats(roster), [roster]);

    const steps = useMemo(
        () =>
            buildJourney(
                {
                    opportunityId: row.id,
                    raw,
                    volunteers: row.volunteers,
                    volunteersRequired: row.volunteersRequired,
                    remainingSeats: row.remainingSeats,
                    hours: row.hours,
                    verifiedHours: row.verifiedHours,
                    remainingHours: row.remainingHours ?? null,
                    snapshot,
                    stats,
                },
                origin,
            ),
        [row, raw, snapshot, stats, origin],
    );

    const finished = steps.filter((s) => s.state === "done" || s.state === "skipped").length;
    const progressPct = Math.round((finished / steps.length) * 100);
    const focusIndex = focusStepIndex(steps);
    const focusStep = focusIndex >= 0 ? steps[focusIndex] : null;

    const filteredRoster = useMemo(() => {
        const q = studentQuery.trim().toLowerCase();
        if (!q) return roster;
        return roster.filter(
            (a) =>
                a.studentName.toLowerCase().includes(q) ||
                a.studentEmail.toLowerCase().includes(q) ||
                a.teamMembers.some((m) => `${m.name ?? ""} ${m.email ?? ""}`.toLowerCase().includes(q)),
        );
    }, [roster, studentQuery]);

    const facts = useMemo(() => {
        const timeline = snapshot?.timeline ?? asRecord(raw.timeline) ?? {};
        const scope = asRecord(raw.participation_scope);
        const departments = Array.isArray(scope?.departments) ? scope.departments.map(String).filter(Boolean) : [];
        const dateOf = (keys: string[]) => fmtDate(pickString(timeline, keys)) ?? (pickString(timeline, keys) || "—");
        const expected = Number(timeline.expected_hours);
        const committed = row.remainingHours != null ? row.verifiedHours + row.remainingHours : null;
        const partnerName =
            snapshot?.executingOrganizationName || snapshot?.partnerOrganizationName || snapshot?.organizationName || "—";
        const partnerEmail = snapshot?.executingOrganizationEmail || snapshot?.partnerOrganizationEmail || "";
        const routing =
            snapshot?.attendanceRoutingOverride === "partner"
                ? "Partner (admin override)"
                : snapshot?.attendanceRoutingOverride === "faculty"
                  ? "Faculty (admin override)"
                  : partnerEmail
                    ? "Partner (auto)"
                    : "Faculty (auto)";
        return [
            { label: "Project code / ID", value: `${publicCode || "—"} · ${row.id}`, copy: row.id },
            { label: "Start → end date", value: `${dateOf(["start_date", "startDate"])} → ${dateOf(["end_date", "endDate"])}` },
            {
                label: "Reporting window reopened until",
                value: fmtDate(pickString(timeline, ["reporting_window_reopened_until"])) ?? "—",
            },
            { label: "Hours per volunteer", value: Number.isFinite(expected) && expected > 0 ? `${fmtHours(expected)} h` : "—" },
            {
                label: "Volunteers (filled / needed)",
                value: row.volunteersRequired != null ? `${row.volunteers} / ${row.volunteersRequired}` : String(row.volunteers),
            },
            {
                label: "Hours (logged · verified · target)",
                value: `${fmtHours(row.hours)} · ${fmtHours(row.verifiedHours)} · ${committed != null ? fmtHours(committed) : "—"}`,
            },
            { label: "Mode · location", value: `${snapshot?.mode || pickString(raw, ["mode"]) || "—"} · ${row.locationLabel}` },
            { label: "Eligible departments", value: departments.length ? departments.join(", ") : "All" },
            { label: "Creator", value: [creatorName, creatorEmail, creatorPhone].filter(Boolean).join(" · ") || "—", copy: creatorEmail },
            {
                label: "Faculty supervisor",
                value: [snapshot?.facultySupervisorName, snapshot?.facultySupervisorEmail].filter(Boolean).join(" · ") || "—",
                copy: snapshot?.facultySupervisorEmail ?? "",
            },
            {
                label: "Partner organisation",
                value: [partnerName, snapshot?.partnerContactPerson, partnerEmail].filter(Boolean).join(" · "),
                copy: partnerEmail,
            },
            { label: "Attendance reviewed by", value: routing },
        ];
    }, [row, raw, snapshot, publicCode, creatorName, creatorEmail, creatorPhone]);

    const actionConfig = useMemo(() => {
        const a = pendingAction;
        if (!a) return null;
        type Cfg = {
            title: string;
            confirmLabel: string;
            danger: boolean;
            requireReason: boolean;
            reasonLabel?: string;
            body: ReactNode;
            request: (reason: string) => { path: string; method: "POST" | "PATCH"; body?: Record<string, unknown> };
            success: string;
        };
        const who = "app" in a ? a.app.studentName : "";
        const cfg: Cfg = (() => {
            switch (a.kind) {
                case "remind":
                    return {
                        title: `Remind ${a.reviewer}`,
                        confirmLabel: "Send reminder email",
                        danger: false,
                        requireReason: false,
                        body: `Resends the official ${a.reviewer} approval email for this opportunity. The approval stage does not change.`,
                        request: () => ({ path: `/api/v1/student/opportunity/${encodeURIComponent(row.id)}/remind-reviewer`, method: "POST" }),
                        success: "Reminder email sent",
                    };
                case "joinApprove":
                    return {
                        title: "Approve join request",
                        confirmLabel: "Approve",
                        danger: false,
                        requireReason: false,
                        body: `${who} (${a.app.studentEmail}) gets a seat on this project and is emailed.`,
                        request: () => ({ path: `/api/v1/admin/applications/${encodeURIComponent(a.app.id)}/approve`, method: "POST" }),
                        success: "Join request approved",
                    };
                case "joinReject":
                    return {
                        title: "Reject join request",
                        confirmLabel: "Reject",
                        danger: true,
                        requireReason: true,
                        body: `${who} (${a.app.studentEmail}) is told their request was not approved. The reason is shared with them.`,
                        request: (reason) => ({
                            path: `/api/v1/admin/applications/${encodeURIComponent(a.app.id)}/reject`,
                            method: "POST",
                            body: { reason },
                        }),
                        success: "Join request rejected",
                    };
                case "sessionApprove":
                case "sessionReject":
                case "sessionFlag": {
                    const action = a.kind === "sessionApprove" ? "approve" : a.kind === "sessionReject" ? "reject" : "flag";
                    const s = a.session;
                    return {
                        title:
                            action === "approve"
                                ? "Approve attendance session"
                                : action === "reject"
                                  ? "Reject attendance session"
                                  : "Flag attendance session",
                        confirmLabel: action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Flag",
                        danger: action === "reject",
                        requireReason: action !== "approve",
                        reasonLabel: action === "reject" ? "What is wrong (sent to the student)" : "Reason",
                        body: (
                            <>
                                <span className="font-semibold">
                                    {who} · {s.dateOfEngagement} {s.startTime}–{s.endTime} · {fmtHours(s.sessionHours)} h
                                </span>
                                <br />
                                {action === "approve"
                                    ? "These hours count towards the student's verified total. The student is emailed."
                                    : action === "reject"
                                      ? "Use this when the date, time or hours were entered wrong. The student is emailed the reason and must log the session again with the correct values."
                                      : "Marks the session for a closer look. It stays out of verified hours until resolved."}
                            </>
                        ),
                        request: (reason) => ({
                            path: `/api/v1/engagement/attendance/${encodeURIComponent(s.id)}`,
                            method: "PATCH",
                            body: reason ? { action, reason } : { action },
                        }),
                        success: action === "approve" ? "Session approved" : action === "reject" ? "Session rejected" : "Session flagged",
                    };
                }
                case "reportSendBack":
                    return {
                        title: "Send report back for correction",
                        confirmLabel: "Send back",
                        danger: false,
                        requireReason: true,
                        reasonLabel: "What needs correcting (sent to the student)",
                        body: `${who}'s impact report goes back to "revision" so they can fix the wrong values and resubmit. Any CII score lock is cleared and must be redone after resubmission.`,
                        request: (reason) => ({
                            path: `/api/v1/admin/reports/${encodeURIComponent(a.app.impactReportId ?? "")}/verify`,
                            method: "PATCH",
                            body: { action: "reject", reason },
                        }),
                        success: "Report sent back to the student",
                    };
            }
        })();
        return cfg;
    }, [pendingAction, row.id]);

    const runAction = useCallback(
        async (reason: string) => {
            if (!actionConfig) return;
            setActionBusy(true);
            try {
                const req = actionConfig.request(reason.trim());
                const res = await authenticatedFetch(req.path, {
                    method: req.method,
                    ...(req.body ? { body: JSON.stringify(req.body) } : {}),
                });
                const data = res ? await res.json().catch(() => ({})) : {};
                if (res?.ok) {
                    toast.success(actionConfig.success);
                    setPendingAction(null);
                    await load();
                } else {
                    const msg = (data as { message?: unknown }).message;
                    toast.error(
                        typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(", ") : "Action failed — nothing was changed",
                    );
                }
            } catch {
                toast.error("Action failed — nothing was changed");
            } finally {
                setActionBusy(false);
            }
        },
        [actionConfig, load],
    );

    const scrollToStep = (key: string) => {
        document.getElementById(`tracker-step-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    /** Step-specific detail chips and fix buttons, layered on the tested step model. */
    const stepExtras = (s: JourneyStepModel): { detail?: ReactNode; action?: ReactNode } => {
        const p = snapshot?.pipeline ?? {};
        const r = stats.reports;
        switch (s.key) {
            case "submitted":
                return {
                    action:
                        s.state === "current" ? (
                            <Link href={STUDENT_PATHS.listing(row.id)} className={SECONDARY_BTN}>
                                <ExternalLink className="h-3.5 w-3.5" /> View listing
                            </Link>
                        ) : undefined,
                };
            case "faculty":
            case "partner":
                return {
                    detail: (
                        <span>
                            {s.key === "faculty"
                                ? [snapshot?.facultySupervisorName, snapshot?.facultySupervisorEmail].filter(Boolean).join(" · ") ||
                                  "No faculty supervisor on record"
                                : [
                                      snapshot?.executingOrganizationName ||
                                          snapshot?.partnerOrganizationName ||
                                          snapshot?.organizationName,
                                      snapshot?.executingOrganizationEmail || snapshot?.partnerOrganizationEmail,
                                  ]
                                      .filter(Boolean)
                                      .join(" · ") || "No partner organisation linked"}
                        </span>
                    ),
                    action:
                        s.state === "current" && s.owner === s.key ? (
                            <button
                                type="button"
                                onClick={() => setPendingAction({ kind: "remind", reviewer: s.key as "faculty" | "partner" })}
                                className={SECONDARY_BTN}
                            >
                                <Bell className="h-3.5 w-3.5" /> Resend {s.key} approval email
                            </button>
                        ) : undefined,
                };
            case "ciel":
                return {
                    detail: s.state === "done" ? (
                        <div className="flex flex-wrap gap-1.5">
                            <Chip
                                tone={
                                    raw.admin_hidden === true
                                        ? "bg-slate-100 text-slate-700 border-slate-200"
                                        : "bg-emerald-50 text-emerald-800 border-emerald-100"
                                }
                            >
                                {raw.admin_hidden === true ? "Hidden from directory" : "Listed in directory"}
                            </Chip>
                            <Chip
                                tone={
                                    raw.applications_open === false
                                        ? "bg-amber-50 text-amber-900 border-amber-100"
                                        : "bg-emerald-50 text-emerald-800 border-emerald-100"
                                }
                            >
                                {raw.applications_open === false
                                    ? `Applications closed${typeof raw.apply_blocked_reason === "string" ? ` · ${raw.apply_blocked_reason.replace(/_/g, " ")}` : ""}`
                                    : "Applications open"}
                            </Chip>
                            {raw.admin_expired === true ? (
                                <Chip tone="bg-amber-50 text-amber-900 border-amber-100">Expired by admin</Chip>
                            ) : null}
                        </div>
                    ) : undefined,
                    action:
                        s.owner === "admin" ? (
                            <p className="text-[11px] text-[#5b6b75]">Approve, revise or reject from the row&apos;s ⋮ menu.</p>
                        ) : undefined,
                };
            case "applications":
                return {
                    detail:
                        (snapshot?.pipelineTotal ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                <Chip tone="bg-emerald-50 text-emerald-800 border-emerald-100">Approved {p.approved ?? 0}</Chip>
                                {p.pending_faculty ? (
                                    <Chip tone="bg-amber-50 text-amber-900 border-amber-100">With faculty {p.pending_faculty}</Chip>
                                ) : null}
                                {p.pending_partner ? (
                                    <Chip tone="bg-amber-50 text-amber-900 border-amber-100">With partner {p.pending_partner}</Chip>
                                ) : null}
                                {p.pending_admin ? (
                                    <Chip tone="bg-amber-50 text-amber-900 border-amber-100">With admin {p.pending_admin}</Chip>
                                ) : null}
                                {(p.faculty_rejected ?? 0) + (p.partner_rejected ?? 0) + (p.admin_rejected ?? 0) > 0 ? (
                                    <Chip tone="bg-rose-50 text-rose-800 border-rose-100">
                                        Rejected {(p.faculty_rejected ?? 0) + (p.partner_rejected ?? 0) + (p.admin_rejected ?? 0)}
                                    </Chip>
                                ) : null}
                            </div>
                        ) : undefined,
                    action:
                        s.owner === "admin" ? (
                            <button type="button" onClick={() => scrollToStep("students")} className={SECONDARY_BTN}>
                                <Users className="h-3.5 w-3.5" /> Review join requests below
                            </button>
                        ) : undefined,
                };
            case "enrollment":
                return {
                    detail:
                        stats.enrolledSeats > 0 ? (
                            <span>{plural(stats.enrolledSeats, "enrolled group")} (individuals or teams with an active seat)</span>
                        ) : undefined,
                    action: (
                        <button type="button" onClick={onOpenTeamsEnrollments} className={SECONDARY_BTN}>
                            <Users className="h-3.5 w-3.5" /> Teams &amp; enrollments (edit member details)
                        </button>
                    ),
                };
            case "attendance": {
                const committed = row.remainingHours != null ? row.verifiedHours + row.remainingHours : null;
                const loggedPct = committed ? Math.min(100, Math.round((row.hours / committed) * 100)) : 0;
                const verifiedPct = committed ? Math.min(100, Math.round((row.verifiedHours / committed) * 100)) : 0;
                return {
                    detail:
                        stats.enrolledSeats > 0 ? (
                            <div className="space-y-2">
                                {committed ? (
                                    <div>
                                        <div className="relative h-2 overflow-hidden rounded-full bg-[#e6eef1]">
                                            <div className="absolute inset-y-0 left-0 rounded-full bg-[#11978f]/35" style={{ width: `${loggedPct}%` }} />
                                            <div className="absolute inset-y-0 left-0 rounded-full bg-[#0e756e]" style={{ width: `${verifiedPct}%` }} />
                                        </div>
                                        <p className="mt-1 text-[11px] text-[#70808a]">
                                            {fmtHours(row.hours)} logged · {fmtHours(row.verifiedHours)} verified · target {fmtHours(committed)} h
                                        </p>
                                    </div>
                                ) : null}
                                <div className="flex flex-wrap gap-1.5">
                                    <Chip tone="bg-slate-50 text-slate-700 border-slate-200">{plural(stats.sessions, "session")} logged</Chip>
                                    {stats.pendingSessions > 0 ? (
                                        <Chip tone="bg-amber-50 text-amber-900 border-amber-100">{stats.pendingSessions} pending review</Chip>
                                    ) : null}
                                </div>
                            </div>
                        ) : undefined,
                    action:
                        stats.pendingSessions > 0 ? (
                            <button type="button" onClick={() => scrollToStep("students")} className={SECONDARY_BTN}>
                                Review sessions below
                            </button>
                        ) : undefined,
                };
            }
            case "reports":
                return {
                    detail:
                        stats.enrolledSeats > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                <Chip tone="bg-emerald-50 text-emerald-800 border-emerald-100">Verified {r.verified}</Chip>
                                {r.review ? <Chip tone="bg-amber-50 text-amber-900 border-amber-100">In review {r.review}</Chip> : null}
                                {r.draft ? <Chip tone="bg-slate-50 text-slate-700 border-slate-200">Draft / revision {r.draft}</Chip> : null}
                                {r.none ? <Chip tone="bg-slate-50 text-slate-500 border-slate-200">Not started {r.none}</Chip> : null}
                                {r.rejected ? <Chip tone="bg-rose-50 text-rose-800 border-rose-100">Rejected {r.rejected}</Chip> : null}
                            </div>
                        ) : undefined,
                    action:
                        stats.enrolledSeats > 0 && r.verified < stats.enrolledSeats ? (
                            <button type="button" onClick={onOpenIncompleteReports} className={SECONDARY_BTN}>
                                <FileText className="h-3.5 w-3.5" /> Students with incomplete reports
                            </button>
                        ) : undefined,
                };
            case "closed":
                return {
                    action:
                        s.owner === "admin" ? (
                            <p className="text-[11px] text-[#5b6b75]">Close the project from the row&apos;s ⋮ menu.</p>
                        ) : undefined,
                };
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[85] bg-[#073b42]/45" aria-hidden onClick={onClose} />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="project-tracker-title"
                className="fixed left-1/2 top-1/2 z-[95] flex max-h-[min(92dvh,60rem)] w-[calc(100vw-1rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[22px] border border-[#dde5ea] bg-[#f7fafb] shadow-[0_18px_40px_rgba(7,59,66,.22)] sm:w-[calc(100vw-1.5rem)]"
            >
                <header
                    className="shrink-0 px-4 pb-4 pt-4 text-white sm:px-6 sm:pt-5"
                    style={{ background: "linear-gradient(120deg,#073b42,#11978f)" }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9df2df]">
                                <ClipboardList className="h-4 w-4" /> Project journey
                                {publicCode ? (
                                    <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-mono normal-case tracking-normal text-white">
                                        {publicCode}
                                    </span>
                                ) : null}
                                <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-white">{row.displayStatus}</span>
                            </div>
                            <h2
                                id="project-tracker-title"
                                className="mt-1 line-clamp-2 text-lg font-[950] leading-tight tracking-tight sm:text-[22px]"
                            >
                                {row.title}
                            </h2>
                            <p className="mt-0.5 truncate text-[13px] text-[#d9f0ef]">
                                {row.subtitle} · {row.locationLabel}
                                {creatorName ? ` · by ${creatorName}` : ""}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="shrink-0 rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {!loading ? (
                        <>
                            <div className="mt-4 flex items-center gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                                    <div className="h-full rounded-full bg-[#9df2df]" style={{ width: `${progressPct}%` }} />
                                </div>
                                <span className="text-xs font-bold tabular-nums">
                                    {finished}/{steps.length} steps
                                </span>
                            </div>
                            <ol className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Journey steps">
                                {steps.map((s, i) => (
                                    <li key={s.key} className="flex shrink-0 items-center">
                                        <button
                                            type="button"
                                            onClick={() => scrollToStep(s.key)}
                                            className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold hover:bg-white/15 ${
                                                s.state === "current" || s.state === "blocked" ? "bg-white/15" : ""
                                            } ${s.state === "skipped" || s.state === "waiting" ? "text-white/60" : "text-white"}`}
                                        >
                                            <span
                                                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${STEP_DOT_CLASS[s.state]} ${
                                                    s.state === "current" ? "ring-2" : ""
                                                }`}
                                            >
                                                {s.state === "done" ? (
                                                    <Check className="h-3 w-3" strokeWidth={3} />
                                                ) : s.state === "blocked" ? (
                                                    <X className="h-3 w-3" strokeWidth={3} />
                                                ) : (
                                                    <span className="font-black">{String.fromCharCode(65 + i)}</span>
                                                )}
                                            </span>
                                            {s.title}
                                        </button>
                                        {i < steps.length - 1 ? <span className="mx-0.5 h-px w-3 bg-white/30" aria-hidden /> : null}
                                    </li>
                                ))}
                            </ol>
                        </>
                    ) : null}
                </header>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                            <Loader2 className="h-8 w-8 animate-spin text-[#0e756e]" />
                            <p className="text-sm font-medium">Loading journey…</p>
                        </div>
                    ) : (
                        <>
                            {focusStep ? (
                                <div
                                    className={`rounded-[18px] border px-4 py-3 ${
                                        focusStep.state === "blocked"
                                            ? "border-rose-200 bg-rose-50 text-rose-900"
                                            : "border-amber-200 bg-amber-50 text-amber-950"
                                    }`}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-[0.08em] opacity-70">
                                        {focusStep.state === "blocked" ? "Stopped at" : "Right now"} · Step{" "}
                                        {String.fromCharCode(65 + focusIndex)} — {focusStep.title}
                                        {focusStep.owner ? ` · waiting on ${OWNER_LABEL[focusStep.owner]}` : ""}
                                    </div>
                                    <p className="mt-0.5 text-sm font-bold">{focusStep.headline}</p>
                                    {currentlyWith && focusIndex <= 3 ? (
                                        <p className="mt-1 text-xs">
                                            With: <strong>{currentlyWith}</strong>
                                            {nextStep ? <> · Next: {nextStep}</> : null}
                                        </p>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
                                    Journey complete — nothing is waiting on anyone.
                                </div>
                            )}

                            <details className="rounded-[22px] border border-[#dde5ea] bg-white" open>
                                <summary className="cursor-pointer select-none px-4 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#16313d]">
                                    Project details
                                </summary>
                                <dl className="grid grid-cols-1 gap-2 border-t border-[#eef2f4] px-4 pb-4 pt-3 sm:grid-cols-2">
                                    {facts.map((f) => (
                                        <div key={f.label} className="min-w-0 rounded-[14px] border border-[#e6ecef] bg-[#f7fafb] px-3 py-2">
                                            <dt className="text-[9px] font-black uppercase tracking-[0.05em] text-[#70808a]">{f.label}</dt>
                                            <dd className="mt-0.5 flex items-start gap-1.5 break-words text-[13px] font-semibold text-[#16313d]">
                                                <span className="min-w-0 flex-1 break-words">{f.value}</span>
                                                {f.copy ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => void copyText(f.copy as string, f.label)}
                                                        className="shrink-0 rounded p-0.5 text-[#70808a] hover:text-[#0e756e]"
                                                        aria-label={`Copy ${f.label}`}
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </button>
                                                ) : null}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </details>

                            <section aria-label="Project journey">
                                <ol>
                                    {steps.map((s, i) => {
                                        const extras = stepExtras(s);
                                        const creatorFacing = i <= 2;
                                        return (
                                            <li key={s.key} id={`tracker-step-${s.key}`} className="relative flex gap-3 pb-3 last:pb-0 sm:gap-4">
                                                {i < steps.length - 1 ? (
                                                    <span
                                                        aria-hidden
                                                        className={`absolute bottom-0 left-[15px] top-8 w-0.5 ${
                                                            s.state === "done" || s.state === "skipped" ? "bg-[#0e756e]/40" : "bg-[#dde5ea]"
                                                        }`}
                                                    />
                                                ) : null}
                                                <span
                                                    className={`relative z-[1] mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${STEP_DOT_CLASS[s.state]}`}
                                                >
                                                    <StepIcon state={s.state} index={i} />
                                                </span>
                                                <div className={`min-w-0 flex-1 rounded-[18px] border px-3.5 py-3 sm:px-4 ${STEP_CARD_CLASS[s.state]}`}>
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <h3 className={`text-sm font-black ${s.state === "skipped" ? "text-slate-400" : "text-[#16313d]"}`}>
                                                            <span className="mr-1.5 text-[#70808a]">{String.fromCharCode(65 + i)}.</span>
                                                            {s.title}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {s.owner && s.state !== "done" ? (
                                                                <span className="rounded-md border border-[#dde5ea] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#16313d]">
                                                                    Waiting on {OWNER_LABEL[s.owner]}
                                                                </span>
                                                            ) : null}
                                                            <span
                                                                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${STEP_BADGE_CLASS[s.state]}`}
                                                            >
                                                                {STEP_STATE_LABEL[s.state]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p
                                                        className={`mt-0.5 text-sm ${
                                                            s.state === "skipped" || s.state === "waiting"
                                                                ? "text-[#70808a]"
                                                                : "font-semibold text-[#16313d]"
                                                        }`}
                                                    >
                                                        {s.headline}
                                                    </p>
                                                    {extras.detail ? <div className="mt-2 text-xs text-[#5b6b75]">{extras.detail}</div> : null}
                                                    {extras.action ? <div className="mt-2.5 flex flex-wrap gap-1.5">{extras.action}</div> : null}
                                                    {s.guide && (s.state === "current" || s.state === "blocked") ? (
                                                        <GuideBox text={s.guide} waPhone={creatorFacing ? creatorWa : undefined} />
                                                    ) : null}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </section>

                            <section id="tracker-step-students" className="rounded-[22px] border border-[#dde5ea] bg-[#eef4f6] p-3 sm:p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-[#16313d]">Student journeys</h3>
                                        <p className="text-xs text-[#70808a]">
                                            Each applicant (team lead for teams): applied → join approval → attendance → report, with the
                                            next action to tell them.
                                        </p>
                                    </div>
                                    <span className="text-[11px] font-bold text-[#70808a]">{roster.length} total</span>
                                </div>
                                {roster.length === 0 ? (
                                    <p className="rounded-xl border border-[#dde5ea] bg-white px-4 py-6 text-center text-sm text-slate-600">
                                        No applications on record (or all withdrawn).
                                    </p>
                                ) : (
                                    <>
                                        {roster.length > 3 ? (
                                            <label className="relative mb-3 block">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70808a]" />
                                                <span className="sr-only">Find a student</span>
                                                <input
                                                    type="search"
                                                    value={studentQuery}
                                                    onChange={(e) => setStudentQuery(e.target.value)}
                                                    placeholder="Find a student by name or email…"
                                                    className={`${INPUT_CLASS} bg-white pl-9`}
                                                />
                                            </label>
                                        ) : null}
                                        {filteredRoster.length === 0 ? (
                                            <p className="rounded-xl border border-[#dde5ea] bg-white px-4 py-6 text-center text-sm text-slate-600">
                                                No student matches &ldquo;{studentQuery}&rdquo;.
                                            </p>
                                        ) : (
                                            <ul className="space-y-2.5">
                                                {filteredRoster.map((a) => (
                                                    <StudentJourney
                                                        key={a.id}
                                                        a={a}
                                                        opportunityId={row.id}
                                                        origin={origin}
                                                        onAction={setPendingAction}
                                                    />
                                                ))}
                                            </ul>
                                        )}
                                    </>
                                )}
                            </section>

                            <details className="group rounded-[22px] border border-[#dde5ea] bg-white">
                                <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#16313d]">
                                    <Settings className="h-4 w-4 text-[#70808a]" /> Fix wrong details
                                    <span className="ml-auto text-[10px] font-bold normal-case tracking-normal text-[#70808a] group-open:hidden">
                                        Contacts, attendance routing
                                    </span>
                                </summary>
                                <div className="space-y-5 border-t border-[#eef2f4] px-4 pb-4 pt-3">
                                    <div>
                                        <p className="mb-3 text-xs text-slate-500">
                                            Wrong faculty or partner contact? Correct it here. Pending attendance reviews and approval
                                            routing rebind to the new contacts; live listings stay published.
                                        </p>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <label className="text-sm">
                                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                    Faculty supervisor name
                                                </span>
                                                <input
                                                    type="text"
                                                    value={facultySupervisorName}
                                                    onChange={(e) => setFacultySupervisorName(e.target.value)}
                                                    className={INPUT_CLASS}
                                                    placeholder="e.g. Nighat Akbar"
                                                />
                                            </label>
                                            <label className="text-sm">
                                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                    Faculty supervisor email
                                                </span>
                                                <input
                                                    type="email"
                                                    value={facultySupervisorEmail}
                                                    onChange={(e) => setFacultySupervisorEmail(e.target.value)}
                                                    className={INPUT_CLASS}
                                                    placeholder="faculty@university.edu"
                                                />
                                            </label>
                                            <label className="text-sm sm:col-span-2">
                                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                    Partner / execution org
                                                </span>
                                                <input
                                                    type="text"
                                                    value={partnerOrganizationName}
                                                    onChange={(e) => setPartnerOrganizationName(e.target.value)}
                                                    className={INPUT_CLASS}
                                                    placeholder="Organization name"
                                                />
                                            </label>
                                            <label className="text-sm">
                                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                    Partner contact person
                                                </span>
                                                <input
                                                    type="text"
                                                    value={partnerContactPerson}
                                                    onChange={(e) => setPartnerContactPerson(e.target.value)}
                                                    className={INPUT_CLASS}
                                                    placeholder="Optional"
                                                />
                                            </label>
                                            <label className="text-sm">
                                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                    Partner contact email
                                                </span>
                                                <input
                                                    type="email"
                                                    value={partnerContactEmail}
                                                    onChange={(e) => setPartnerContactEmail(e.target.value)}
                                                    className={INPUT_CLASS}
                                                    placeholder="partner@org.org"
                                                />
                                            </label>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => void saveContacts()}
                                                disabled={contactsSaving || !contactsDirty}
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e756e] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:w-auto"
                                            >
                                                {contactsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                Save contacts
                                            </button>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#eef2f4] pt-4">
                                        <p className="mb-2 text-xs text-slate-500">
                                            Who reviews attendance. Auto follows the partner contact when present, otherwise faculty.
                                            Override only when you need to force a queue.
                                        </p>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                            <label className="flex-1 text-sm">
                                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                    Queue
                                                </span>
                                                <select
                                                    value={attendanceRoutingOverride}
                                                    onChange={(e) =>
                                                        setAttendanceRoutingOverride(e.target.value as "auto" | "partner" | "faculty")
                                                    }
                                                    className={INPUT_CLASS}
                                                >
                                                    <option value="auto">Auto (partner if contact exists)</option>
                                                    <option value="partner">Force partner queue</option>
                                                    <option value="faculty">Force faculty queue</option>
                                                </select>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => void saveAttendanceRouting()}
                                                disabled={
                                                    attendanceRoutingSaving ||
                                                    attendanceRoutingOverride === snapshot?.attendanceRoutingOverride
                                                }
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e756e] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:w-auto"
                                            >
                                                {attendanceRoutingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                Save routing
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#e6ecef] bg-[#f7fafb] px-3 py-2.5 text-[11px] leading-relaxed text-[#5b6b75]">
                                        <p className="font-bold text-[#16313d]">Other fixes</p>
                                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                            <li>Student name, phone, CNIC, university, department → Teams &amp; enrollments → edit member.</li>
                                            <li>Wrong session date / time / hours → reject that session above; the student logs it again.</li>
                                            <li>Wrong values in an impact report → Send report back for correction on the student card.</li>
                                            <li>
                                                Listing title, dates, hours per volunteer or location → only the creator can edit these. Send
                                                them this link:{" "}
                                                <button
                                                    type="button"
                                                    onClick={() => void copyText(`${origin}${STUDENT_PATHS.fixOpportunity(row.id)}`, "Link")}
                                                    className="font-bold text-[#0e756e] underline"
                                                >
                                                    copy edit link
                                                </button>
                                                .
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </details>

                            <div className="flex flex-wrap gap-2 border-t border-[#dde5ea] pt-4">
                                <Link href={STUDENT_PATHS.listing(row.id)} className={SECONDARY_BTN}>
                                    <ExternalLink className="h-3.5 w-3.5" /> Public listing
                                </Link>
                                <button type="button" onClick={onOpenTeamsEnrollments} className={SECONDARY_BTN}>
                                    <Users className="h-3.5 w-3.5" /> Teams &amp; enrollments
                                </button>
                                <Link href={`/dashboard/admin/audit-logs?path=${encodeURIComponent(row.id)}`} className={SECONDARY_BTN}>
                                    <History className="h-3.5 w-3.5" /> Audit log
                                </Link>
                                <button type="button" onClick={onOpenDebug} className={SECONDARY_BTN}>
                                    <Bug className="h-3.5 w-3.5" /> Debug inspect
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {actionConfig ? (
                <ConfirmModal
                    open
                    title={actionConfig.title}
                    confirmLabel={actionConfig.confirmLabel}
                    tone={actionConfig.danger ? "danger" : "default"}
                    busy={actionBusy}
                    requireReason={actionConfig.requireReason}
                    reasonLabel={actionConfig.reasonLabel}
                    onConfirm={runAction}
                    onCancel={() => !actionBusy && setPendingAction(null)}
                >
                    {actionConfig.body}
                </ConfirmModal>
            ) : null}
        </>
    );
}
