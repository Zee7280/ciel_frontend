import React from "react";
import { Users, User, Shield, AlertCircle, CheckCircle2, Check, Loader2, ChevronRight, ChevronLeft, Save, Lock } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import { authenticatedFetch } from "@/utils/api";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { toast } from "sonner";

import { FieldError } from "./ui/FieldError";
import IdentityVerification from "../../engagement/components/IdentityVerification";
import AttendanceForm from "../../engagement/components/AttendanceForm";
import AttendanceSummaryTable from "../../engagement/components/AttendanceSummaryTable";
import EngagementOverview from "../../engagement/components/EngagementOverview";
import TeamVerification from "./TeamVerification";
import { prepareReportEvidenceForSave } from "../utils/evidenceUpload";
import { formTeamFromLead } from "@/utils/participationGuide";
import { buildIndividualRosterFromSection1, calculateEngagementMetrics, effectiveHoursFromLog } from "../utils/engagementMetrics";
import { isAttendanceLogCountedForVerifiedMetrics } from "@/utils/attendanceApprovalEligibility";
import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";
import { calculateSection1CII } from "@/utils/reportQuality";
import { calculateCII } from "../utils/calculateCII";
import { resolveScopedTeamMembers } from "@/utils/reportTeamScope";
import { effectiveParticipationStatusForReportActions } from "@/utils/studentJoinApplication";
import { resolveAttendanceSubmitError } from "@/utils/attendanceSubmitError";
import { fetchSection1Analytics } from "@/utils/section1Analytics";
import {
    participationAttendanceVerificationRequested,
    resolveStudentAdminAttendanceUnlock,
} from "@/utils/adminEnrollmentAttendance";
import { formatPakistaniCnicDisplay } from "@/utils/section1ParticipantDossierFields";
import { formatInternationalPhoneDisplay } from "@/utils/countryCallingCodes";

/**
 * Legacy copy for reports that already went through the old mid-flow "request attendance
 * verification" mechanic before it was replaced by the declaration in Step 3 — kept only to
 * render a read-only status for those already-locked in-flight reports, not to start new ones.
 */
const ATTENDANCE_VERIFICATION_INFO = {
    afterSent:
        "Attendance is locked until a reviewer completes approval.",
    afterSentWho:
        "Your selected Faculty or Partner reviewer has been notified and will see a pending attendance item on their dashboard.",
} as const;

/** Align dropdown ids (`lead:uuid`, `member:0:…`) with API `participantId` (bare uuid/key). */
function engagementParticipantCompareKey(id: string | undefined | null): string {
    if (!id) return "";
    if (id.startsWith("lead:")) return id.slice("lead:".length);
    const m = /^member:\d+:(.+)$/.exec(id);
    if (m?.[1]) return m[1];
    return id;
}

function engagementParticipantIdsMatch(a: string | undefined | null, b: string | undefined | null): boolean {
    if (!a || !b) return false;
    if (a === b) return true;
    return engagementParticipantCompareKey(a) === engagementParticipantCompareKey(b);
}

/** Participation row ids for the signed-in student (team lead or member). */
function selfParticipantRealIds(
    currentUserEmail: string | null,
    teamLead: Record<string, unknown>,
    teamMembers: unknown[],
    leadParticipantId: string | null,
): string[] {
    if (!currentUserEmail) return [];
    const email = currentUserEmail.trim().toLowerCase();
    const ids: string[] = [];
    const leadEmail = typeof teamLead.email === "string" ? teamLead.email.trim().toLowerCase() : "";
    if (leadEmail && leadEmail === email) {
        const leadId = leadParticipantId || teamLead.id || teamLead.participantId;
        if (leadId != null && String(leadId)) ids.push(String(leadId));
    }
    if (Array.isArray(teamMembers)) {
        teamMembers.forEach((m) => {
            if (!m || typeof m !== "object") return;
            const row = m as Record<string, unknown>;
            const rowEmail = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
            if (rowEmail && rowEmail === email) {
                const mid = row.participantId ?? row.id;
                if (mid != null && String(mid)) ids.push(String(mid));
            }
        });
    }
    return ids;
}

function canDeleteAttendanceEntry(
    entry: { participantId?: string | null },
    selfIds: string[],
    currentUserEmail: string | null,
): boolean {
    if (currentUserEmail && selfIds.length === 0) return false;
    if (!entry?.participantId || selfIds.length === 0) return true;
    return selfIds.some((sid) => engagementParticipantIdsMatch(entry.participantId, sid));
}

function memberRowPrefixedId(m: any, idx: number): string {
    return `member:${idx}:${m?.id || m?.participantId || m?.cnic || m?.email || "anon"}`;
}

function pickFacultyEmail(record: unknown, keys: string[]): string {
    if (!record || typeof record !== "object") return "";
    const source = record as Record<string, unknown>;
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function readFacultyEmails(...records: unknown[]): { primary: string; secondary: string } {
    for (const record of records) {
        const primary = pickFacultyEmail(record, [
            "primaryFacultyEmail",
            "primary_faculty_email",
            "facultyEmail",
            "faculty_email",
        ]);
        const secondary = pickFacultyEmail(record, [
            "secondaryFacultyEmail",
            "secondary_faculty_email",
        ]);

        if (primary || secondary) {
            return { primary, secondary };
        }
    }

    return { primary: "", secondary: "" };
}

function pickTeamId(record: unknown): string {
    if (!record || typeof record !== "object") return "";
    const source = record as Record<string, unknown>;
    const value = source.teamId ?? source.team_id;
    if (typeof value === "string") return value.trim();
    if (value != null && (typeof value === "number" || typeof value === "boolean")) return String(value).trim();
    return "";
}

/** Resolve API `participantId` to the same prefixed ids used in the participant dropdown. */
function resolveAttendanceLogParticipantPrefixedId(
    realId: string,
    rawParticipants: { id: string }[],
    resolvedLeadId: string | null,
    teamMembers: any[],
): string {
    if (!realId) return realId;
    const match = rawParticipants.find(
        (p) =>
            p.id === realId ||
            p.id.endsWith(realId) ||
            engagementParticipantIdsMatch(p.id, realId),
    );
    if (match) return match.id;
    if (resolvedLeadId && realId === resolvedLeadId) {
        return `lead:${resolvedLeadId}`;
    }
    for (let idx = 0; idx < teamMembers.length; idx++) {
        const m = teamMembers[idx];
        if (!m) continue;
        const keys = [m.id, m.participantId].filter(Boolean).map(String);
        if (keys.some((k) => k === realId) || keys.some((k) => engagementParticipantIdsMatch(k, realId))) {
            return memberRowPrefixedId(m, idx);
        }
    }
    return realId;
}

/** Circular hours-clock gauge — same 0-100% math as the linear bar next to it, just a richer visual. */
function ImpactClockGauge({
    hours,
    requiredHours,
    name,
}: {
    hours: number;
    requiredHours: number;
    name?: string;
}) {
    const r = 96;
    const circ = 2 * Math.PI * r;
    const pct = requiredHours > 0 ? Math.min(100, (hours / requiredHours) * 100) : 0;
    const offset = circ * (1 - pct / 100);
    const extra = Math.max(0, hours - requiredHours);
    const extraR = 101;
    const extraCirc = 2 * Math.PI * extraR;
    const extraPct = requiredHours > 0 ? Math.min(100, (extra / Math.max(requiredHours, 1)) * 100) : 0;
    const extraOffset = extraCirc * (1 - extraPct / 100);
    return (
        <div className="mx-auto flex max-w-[220px] flex-col items-center">
            <svg viewBox="0 0 230 230" className="h-40 w-40">
                <defs>
                    <linearGradient id="cerClockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0e6664" />
                        <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                </defs>
                <circle cx="115" cy="115" r={r} fill="none" stroke="#e8f2f0" strokeWidth="14" />
                {extra > 0 ? (
                    <circle
                        cx="115"
                        cy="115"
                        r={extraR}
                        fill="none"
                        stroke="#f3d9a0"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={extraCirc}
                        strokeDashoffset={extraOffset}
                        transform="rotate(-90 115 115)"
                    />
                ) : null}
                <circle
                    cx="115"
                    cy="115"
                    r={r}
                    fill="none"
                    stroke="url(#cerClockGrad)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    transform="rotate(-90 115 115)"
                />
                <text x="115" y="108" textAnchor="middle" fontSize="30" fontWeight={800} fill="#0d2b33">
                    {hours.toFixed(1)}h
                </text>
                <text x="115" y="130" textAnchor="middle" fontSize="10" fontWeight={800} fill="#7a919a">
                    OF {requiredHours} HOURS
                </text>
                <text x="115" y="146" textAnchor="middle" fontSize="10" fontWeight={800} fill="#0e7d74">
                    {Math.round(pct)}% COMPLETE
                </text>
            </svg>
            {name ? <p className="mt-1 text-xs font-bold text-[#0d2b33]">{name}</p> : null}
        </div>
    );
}

/**
 * "Participation Adventure" — same locked form, same mandatory evidence, just a five-mission
 * progress view layered on top of the existing 4-step wizard. Tapping a mission jumps to the
 * internal step it lives on; nothing about the underlying step content changes. Stars/badges
 * are UI progress only — they never feed CII or academic evaluation.
 */
const QUEST_MISSIONS = [
    { icon: "🪪", title: "Verify Me", small: "Personal + academic profile" },
    { icon: "👥", title: "Build My Crew", small: "Team configuration" },
    { icon: "📍", title: "Log Real Impact", small: "Session + evidence" },
    { icon: "⏱️", title: "Watch Progress", small: "Clock + activity ledger" },
    { icon: "🏁", title: "Finish Section 1", small: "Declaration" },
] as const;

function ParticipationQuest({
    internalStep,
    setInternalStep,
    isVerified,
    teamVerified,
    hasSession,
    hoursMet,
    declared,
}: {
    internalStep: number;
    setInternalStep: (n: number) => void;
    isVerified: boolean;
    teamVerified: boolean;
    hasSession: boolean;
    hoursMet: boolean;
    declared: boolean;
}) {
    const missionSteps = [1, 1, 2, 2, 3];
    const missionDone = [isVerified, teamVerified, hasSession, hoursMet, declared];
    const starsFilled = missionDone.filter(Boolean).length;
    const currentMission = (() => {
        const firstOpenAtStep = missionSteps.findIndex((step, i) => step === internalStep && !missionDone[i]);
        if (firstOpenAtStep >= 0) return firstOpenAtStep;
        const lastAtStep = missionSteps.reduce((found, step, i) => (step === internalStep ? i : found), -1);
        if (lastAtStep >= 0) return lastAtStep;
        // internalStep has no mission of its own (e.g. the post-declaration metrics dashboard) —
        // by that point every mission should already be complete, so show the final one.
        return missionSteps.length - 1;
    })();
    const mission = QUEST_MISSIONS[currentMission];

    return (
        <div className="cer-quest-shell">
            <div className="cer-quest-hero">
                <div>
                    <div className="k">SECTION 1 · PLAY IT AS FIVE SMALL MISSIONS</div>
                    <h2>Participation Adventure 🎮</h2>
                    <p>Same locked form. Same mandatory evidence. Complete one mission at a time and collect five progress stars.</p>
                </div>
                <div className="stars">
                    <b>
                        {"★".repeat(starsFilled)}
                        {"☆".repeat(missionDone.length - starsFilled)}
                    </b>
                    <small>UI PROGRESS · NOT CII POINTS</small>
                </div>
            </div>
            <div className="cer-quest-bar">
                <i style={{ width: `${(starsFilled / QUEST_MISSIONS.length) * 100}%` }} />
            </div>
            <div className="cer-quest-grid">
                {QUEST_MISSIONS.map((m, i) => {
                    const done = missionDone[i];
                    const isActive = i === currentMission;
                    return (
                        <button
                            key={m.title}
                            type="button"
                            onClick={() => setInternalStep(missionSteps[i])}
                            className={clsx("cer-quest-step", isActive && "active", done && "done")}
                        >
                            <span className="ico">{m.icon}</span>
                            <b>{i + 1}. {m.title}</b>
                            <small>{m.small}</small>
                            <span className="miniState">{done ? "★ COMPLETE" : isActive ? "IN PROGRESS" : "UP NEXT"}</span>
                        </button>
                    );
                })}
            </div>
            <div className="cer-quest-context">
                <div className="badge">{mission.icon}</div>
                <div className="copy">
                    <div className="ey">MISSION {currentMission + 1} OF {QUEST_MISSIONS.length}</div>
                    <b>{mission.title}</b>
                </div>
                <span className="state">{missionDone[currentMission] ? "★ MISSION COMPLETE" : "● IN PROGRESS"}</span>
            </div>
            <div className="cer-quest-controls">
                <button
                    type="button"
                    className="cer-quest-btn back"
                    disabled={currentMission === 0}
                    onClick={() => setInternalStep(missionSteps[Math.max(0, currentMission - 1)])}
                >
                    ← Previous mission
                </button>
                <div className="center">
                    <b>{starsFilled}/{QUEST_MISSIONS.length} progress stars</b>
                </div>
                <button
                    type="button"
                    className="cer-quest-btn next"
                    disabled={currentMission === QUEST_MISSIONS.length - 1}
                    onClick={() => setInternalStep(missionSteps[Math.min(QUEST_MISSIONS.length - 1, currentMission + 1)])}
                >
                    Next mission →
                </button>
            </div>
        </div>
    );
}

export default function Section1Participation({ projectData }: { projectData?: any } = {}) {
    const {
        data,
        updateSection,
        getFieldError,
        validationErrors,
        nextStep,
        saveReport,
        isReadOnly,
        isTeamMemberAttendanceOnly,
        isParticipationUnlocked,
        setParticipationUnlocked,
        setRequiredHours,
        myParticipationIsTeamLead,
    } = useReportForm();

    const searchParams = useSearchParams();
    // Use search params primarily for initialization to prevent context-update loops
    const queryProjectId = searchParams.get('project') || searchParams.get('projectId');
    const projectIdFromUrl = queryProjectId || data.project_id;

    const { participation_type, team_lead, team_members } = data.section1;
    // Extract available spots using all possible backend keys for the opportunity
    const maxTeamSize = projectData?.timeline?.volunteers_required || projectData?.volunteers_needed || projectData?.available_spots || 20;
    const requiredHoursPerStudent = projectData?.required_hours || projectData?.hours_requirement || projectData?.engagement_hours || 16;


    // Wizard State
    const [internalStep, setInternalStep] = React.useState(
        data.section1.verified_summary ? 4 : 1
    );
    const [isLoadingMetrics, setIsLoadingMetrics] = React.useState(false);
    const [verifiedMetrics, setVerifiedMetrics] = React.useState<any>(
        data.section1.metrics.total_verified_hours > 0 ? {
            totalHours: data.section1.metrics.total_verified_hours,
            sessionCount: data.section1.metrics.verified_session_count,
            eis: data.section1.metrics.eis_score,
            activeDays: data.section1.metrics.total_active_days,
            spanWeeks: Math.ceil(data.section1.metrics.engagement_span / 7),
            frequency: data.section1.metrics.attendance_frequency,
            weeklyContinuity: data.section1.metrics.weekly_continuity,
            category: data.section1.metrics.engagement_category,
            hecStatus: data.section1.metrics.hec_compliance,
            individual_metrics: data.section1.metrics.individual_metrics,
        } : null
    );
    const [verifiedSummary, setVerifiedSummary] = React.useState<string>(data.section1.verified_summary || "");
    const isSubmittedReport = data.status === 'submitted' || data.status === 'verified' || data.status === 'partner_verified' || data.status === 'finalized';
    const [isSubmitted, setIsSubmitted] = React.useState(isSubmittedReport);
    const reviewChecked = data.section1.review_checked || [false, false, false];
    const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
    const [selectedParticipantId, setSelectedParticipantId] = React.useState<string | null>(null);
    const [isEditingLead, setIsEditingLead] = React.useState(false);
    const [leadStatus, setLeadStatus] = React.useState<string>('pending_approval');
    const [isVerified, setIsVerified] = React.useState(!!data.section1.team_lead.verified);
    const [participantId, setParticipantId] = React.useState<string | null>(data.section1.team_lead.id || null);
    const [currentUserEmail, setCurrentUserEmail] = React.useState<string | null>(null);
    const [isLeavingTeam, setIsLeavingTeam] = React.useState(false);
    const [myParticipationVerificationRequested, setMyParticipationVerificationRequested] =
        React.useState(false);

    const applyAdminParticipationUnlock = React.useCallback(() => {
        setParticipationUnlocked(true);
        setMyParticipationVerificationRequested(false);
        const section1 = data.section1 as Record<string, unknown>;
        if (
            section1.attendance_verification_requested_at ||
            section1.attendanceVerificationRequestedAt ||
            section1.attendance_verification_locked === true
        ) {
            updateSection("section1", {
                attendance_verification_requested_at: null,
                attendance_verification_locked: false,
                attendance_verification_status: null,
            });
        }
    }, [data.section1, setParticipationUnlocked, updateSection]);

    const syncParticipationAttendanceFlags = React.useCallback(
        (myPart: Record<string, unknown>, teamRows?: unknown[] | null) => {
            const adminUnlocked = resolveStudentAdminAttendanceUnlock(myPart, teamRows);
            if (adminUnlocked) {
                applyAdminParticipationUnlock();
                return;
            }
            setMyParticipationVerificationRequested(
                participationAttendanceVerificationRequested(myPart),
            );
        },
        [applyAdminParticipationUnlock],
    );

    React.useEffect(() => {
        if (!isTeamMemberAttendanceOnly) return;
        // Teammates skip identity/submit wizard steps and land on attendance logging.
        if (internalStep === 1 || internalStep === 3) {
            setInternalStep(2);
            return;
        }
        // Metrics dashboard is lead-only until finalized; teammates stay on attendance.
        if (internalStep === 4 && !verifiedMetrics && !isSubmittedReport) {
            setInternalStep(2);
        }
    }, [isTeamMemberAttendanceOnly, internalStep, verifiedMetrics, isSubmittedReport]);

    /** When CIEL admin enabled attendance override, unlock Section 1 logging for this project. */
    React.useEffect(() => {
        if (!projectIdFromUrl || isReadOnly) return;
        let cancelled = false;

        const applyAdminUnlock = () => {
            applyAdminParticipationUnlock();
        };

        void (async () => {
            try {
                const payload = await fetchSection1Analytics(
                    `/api/v1/student/projects/${encodeURIComponent(projectIdFromUrl)}/section1-analytics`,
                );
                if (cancelled || !payload?.fields) return;
                const unlock = payload.fields.attendance_logging_unlock_status;
                if (
                    unlock &&
                    typeof unlock === "object" &&
                    (unlock as Record<string, unknown>).admin_override === true &&
                    (unlock as Record<string, unknown>).unlocked === true
                ) {
                    applyAdminUnlock();
                }
            } catch {
                /* non-fatal */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [projectIdFromUrl, isReadOnly, applyAdminParticipationUnlock]);

    // Identify current user for labeling
    React.useEffect(() => {
        const storedUser = localStorage.getItem("user") || localStorage.getItem("ciel_user");
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                const email = u?.email || u?.Email;
                if (email) setCurrentUserEmail(email);
            } catch (e) { }
        }
    }, []);

    const projectRecord =
        projectData && typeof projectData === "object"
            ? (projectData as Record<string, unknown>)
            : null;
    const effectiveLeadStatus = effectiveParticipationStatusForReportActions(leadStatus, projectRecord);

    const rawParticipants = React.useMemo(() => [
        ...(isVerified || data.section1.team_lead.verified || participantId ? [{
            id: `lead:${participantId || data.section1.team_lead.id}`,
            name: `${((data.section1.team_lead as any).fullName || (data.section1.team_lead as any).name || "Team Lead")}${((data.section1.team_lead as any).email === currentUserEmail) ? ' (Self)' : ''}`,
            status: effectiveLeadStatus,
            email: (data.section1.team_lead as any).email
        }] : []),
        ...data.section1.team_members
            .map((m: any, idx: number) => ({
                id: `member:${idx}:${m.id || m.participantId || m.cnic || m.email || 'anon'}`,
                name: `${(m.fullName || m.name || m.email || `Student ${idx + 1}`)}${(m.email === currentUserEmail) ? ' (Self)' : ''}`,
                verified: m.verified,
                status: effectiveParticipationStatusForReportActions(
                    m.status || (m.verified ? 'approved' : 'pending_approval'),
                    projectRecord,
                ),
                email: m.email
            }))
    ], [isVerified, participantId, data.section1.team_lead, data.section1.team_members, currentUserEmail, effectiveLeadStatus, projectRecord]);

    const [hasSelectedInitial, setHasSelectedInitial] = React.useState(false);

    // Auto-select "Self" record ONCE initially
    React.useEffect(() => {
        if (!hasSelectedInitial && currentUserEmail && rawParticipants.length > 0) {
            const selfRecord = rawParticipants.find(p => p.email === currentUserEmail);
            if (selfRecord) {
                console.log(`[Identity] Initial Sync: Defaulting to 'Self' (${selfRecord.id})`);
                setSelectedParticipantId(selfRecord.id);
                setHasSelectedInitial(true); // Mark as done to avoid overriding manual selection
            }
        }
    }, [currentUserEmail, rawParticipants, hasSelectedInitial, selectedParticipantId]);
    const [teamId, setTeamId] = React.useState<string>('');
    const [primaryFacultyEmail, setPrimaryFacultyEmail] = React.useState<string>('');
    const [secondaryFacultyEmail, setSecondaryFacultyEmail] = React.useState<string>('');

    // Scroll to Top on Step Change
    React.useEffect(() => {
        const workspace = document.querySelector('main');
        if (workspace) {
            workspace.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [internalStep]);

    // Hard Validation Gates
    const canMoveToStep2 = participation_type !== null && isVerified && (!!participantId || !!data.section1.team_lead.id);
    const canMoveToStep3 = isVerified && (!!participantId || !!data.section1.team_lead.id); // Self must be verified and have ID
    const canMoveToStep4 = participation_type === 'individual' ||
        (participation_type === 'team' && team_members.length > 0 && team_members.every(m => m.verified));
    const canMoveToStep5 = data.section1.attendance_logs.length > 0;

    const steps = [
        { id: 1, title: 'Identity & Team Setup' },
        { id: 2, title: 'Attendance Logging' },
        { id: 3, title: 'Review & Submit' },
        { id: 4, title: 'Metrics Dashboard' }
    ];

    const participantNamesMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        for (const u of rawParticipants) {
            const name = String((u as { name?: string }).name || "").trim() || "Participant";
            map[u.id] = name;
            const bare = engagementParticipantCompareKey(u.id);
            if (bare && bare !== u.id) map[bare] = name;
        }
        return map;
    }, [rawParticipants]);

    const isFetchingRef = React.useRef(false);

    // Data Fetching - Initialization ONLY when project ID in URL changes
    React.useEffect(() => {
        if (queryProjectId) {
            console.log("[Identity] Initializing data for project:", queryProjectId);
            fetchInitialData();
            setRequiredHours(requiredHoursPerStudent);
        }
    }, [queryProjectId]);
    
    // Sync context required hours if it changes from projectData
    React.useEffect(() => {
        if (requiredHoursPerStudent !== data.required_hours) {
            setRequiredHours(requiredHoursPerStudent);
        }
    }, [requiredHoursPerStudent]);


    // Sync selectedParticipantId when participantId is fetched
    React.useEffect(() => {
        if (participantId && !selectedParticipantId) {
            setSelectedParticipantId(`lead:${participantId || data.section1.team_lead.id}`);
        }
    }, [participantId, data.section1.team_lead.id]);


    // Sync local states with context if context is updated from elsewhere
    React.useEffect(() => {
        if (data.section1.team_lead.id && !participantId) {
            setParticipantId(data.section1.team_lead.id);
        }
        if (data.section1.team_lead.verified && !isVerified) {
            setIsVerified(true);
        }
    }, [data.section1.team_lead.id, data.section1.team_lead.verified]);

    const fetchInitialData = async () => {
        if (!queryProjectId || isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            // 1. Fetch Team Lead's Participant Record
            const partRes = await authenticatedFetch(`/api/v1/engagement/my`);
            if (partRes && partRes.ok) {
                const parts = await partRes.json();
                console.log("[Identity] Found my records:", parts.data.map((p: any) => `${p.projectId}: ${p.id} (${p.email})`));
                const myPart = parts.data.find(
                    (p: any) =>
                        p.projectId === projectIdFromUrl || p.project_id === projectIdFromUrl,
                );

                if (myPart) {
                    console.log(`[Identity] Syncing correct ID for this project: ${myPart.id}`);
                    const myPartIsTeamLead =
                        myPart.isTeamLead === true ||
                        myPart.is_team_lead === true ||
                        String(myPart.is_team_lead ?? "").toLowerCase() === "true";

                    setParticipantId(myPart.id);
                    setSelectedParticipantId(
                        myPartIsTeamLead ? `lead:${myPart.id}` : `member:0:${myPart.id}`,
                    );

                    setLeadStatus(
                        effectiveParticipationStatusForReportActions(
                            myPart.status || 'pending_approval',
                            projectRecord,
                        ),
                    );
                    setIsVerified(true);
                    syncParticipationAttendanceFlags(myPart);

                    // Update wizard step based on progress
                    if (['submitted', 'verified', 'finalized'].includes(myPart.status)) {
                        setInternalStep(4);
                        setIsSubmitted(true);
                    }

                    if (myPartIsTeamLead) {
                        const tlLead = data.section1.team_lead as Record<string, unknown>;
                        const partCnicDigits = String(myPart?.cnic ?? "")
                            .replace(/\D/g, "")
                            .slice(0, 13);
                        const leadCnicDigits = String(tlLead?.cnic ?? "")
                            .replace(/\D/g, "")
                            .slice(0, 13);
                        const resolvedLeadCnic =
                            partCnicDigits.length === 13
                                ? partCnicDigits
                                : leadCnicDigits.length === 13
                                  ? leadCnicDigits
                                  : partCnicDigits || leadCnicDigits || String(myPart.cnic ?? tlLead.cnic ?? "");

                        updateSection('section1', {
                            team_lead: {
                                ...data.section1.team_lead,
                                id: myPart.id,
                                verified: true,
                                name: myPart.fullName || myPart.name || myPart.studentName || data.section1.team_lead.name,
                                fullName: myPart.fullName || myPart.name || myPart.studentName || (data.section1.team_lead as any).fullName,
                                cnic: resolvedLeadCnic,
                                email: myPart.email || (data.section1.team_lead as any).email,
                                mobile: myPart.mobile || (data.section1.team_lead as any).mobile,
                                universityName: myPart.universityName || (data.section1.team_lead as any).universityName,
                                universityId: myPart.universityId || (data.section1.team_lead as any).universityId,
                                academicProgram: myPart.academicProgram || (data.section1.team_lead as any).academicProgram,
                                yearOfStudy: myPart.yearOfStudy || (data.section1.team_lead as any).yearOfStudy,
                                academicIntegrationType: myPart.academicIntegrationType || (data.section1.team_lead as any).academicIntegrationType
                            }
                        });
                    }

                    // Pull faculty + teamId from backend participation record
                    const myPartFaculty = readFacultyEmails(myPart);
                    if (myPartFaculty.primary) setPrimaryFacultyEmail(myPartFaculty.primary);
                    if (myPartFaculty.secondary) setSecondaryFacultyEmail(myPartFaculty.secondary);
                    const myPartTeamId = pickTeamId(myPart);
                    if (myPartTeamId) setTeamId(myPartTeamId);

                    // 2. Fetch all team members for this project (Unified Table)
                    let scopedTeamForAttendance: any[] | undefined;
                    const teamRes = await authenticatedFetch(`/api/v1/engagement/project/${projectIdFromUrl}/team`);
                    if (teamRes && teamRes.ok) {
                        const teamData = await teamRes.json();
                        if (teamData.success && teamData.data) {
                            const teamRows = Array.isArray(teamData.data) ? teamData.data : [];
                            const { team_members: scopedMembers, participation_type: scopedMode } =
                                resolveScopedTeamMembers(myPart, teamRows);
                            const leadTeamRow = teamRows.find((row: unknown) => {
                                const teamRow = row && typeof row === "object" ? row as Record<string, unknown> : {};
                                const rowId = String(teamRow.id || teamRow.participantId || "");
                                const rowEmail = String(teamRow.email || "").toLowerCase();
                                return rowId === String(myPart.id) || (!!rowEmail && rowEmail === String(myPart.email || "").toLowerCase());
                            });
                            const teamFaculty = readFacultyEmails(leadTeamRow, scopedMembers[0]);
                            if (teamFaculty.primary) setPrimaryFacultyEmail(teamFaculty.primary);
                            if (teamFaculty.secondary) setSecondaryFacultyEmail(teamFaculty.secondary);
                            const resolvedTeamId = pickTeamId(leadTeamRow) || pickTeamId(scopedMembers[0]);
                            if (resolvedTeamId) setTeamId(resolvedTeamId);

                            scopedTeamForAttendance = scopedMembers;
                            updateSection("section1", {
                                team_members: scopedMembers,
                                participation_type: scopedMode,
                            });
                            syncParticipationAttendanceFlags(myPart, teamRows);
                        }
                    }

                    // 3. Fetch all logs (pass lead + roster snapshot: context/rawParticipants are still pre-render here)
                    await loadAllEntries(myPart.id, scopedTeamForAttendance);
                }
            }
        } catch (err) {
            console.error("Error fetching initial dynamic data:", err);
        } finally {
            isFetchingRef.current = false;
        }
    };

    const teamVerifications = data.section1.team_members.map((m: any) => m.verified).join(',');
    const teamMemberParticipantKeys = data.section1.team_members
        .map((m: any) => String(m?.id || m?.participantId || ""))
        .join("|");
    
    // Re-fetch logs whenever the team composition or verification status changes
    React.useEffect(() => {
        if (projectIdFromUrl && isVerified) {
            loadAllEntries();
        }
    }, [
        projectIdFromUrl,
        isVerified, 
        data.section1.team_members.length,
        teamVerifications,
        teamMemberParticipantKeys,
        participantId,
    ]);

    const handleNext = () => {
        if (internalStep === 4) {
            updateSection('section1', {
                verified_summary: "Participation record finalized with HEC-compliant audit trail."
            });
            nextStep(); // Context next step
            return;
        }
        setInternalStep(prev => Math.min(prev + 1, 4));
    };
    const handleBack = () => setInternalStep(prev => Math.max(prev - 1, 1));

    const handleFinalSubmit = async () => {
        if (!participantId) return;
        setIsLoadingMetrics(true);
        try {
            // Trigger backend finalization and record locking
            const res = await authenticatedFetch(`/api/v1/engagement/${participantId}/finalize`, {
                method: 'POST'
            });

            if (res && res.ok) {
                // Calculate metrics locally since we have all the data
                const teamSize = 1 + team_members.length;
                const rosterIds = buildIndividualRosterFromSection1(data.section1, participantId ?? data.section1.team_lead?.id);
                const calc = calculateEngagementMetrics(
                    data.section1.attendance_logs,
                    requiredHoursPerStudent,
                    teamSize,
                    data.section1.team_lead,
                    rosterIds,
                );

                const finalMetrics = {
                    totalHours: calc.total_verified_hours,
                    sessionCount: calc.verified_session_count,
                    activeDays: calc.total_active_days,
                    spanWeeks: Math.ceil(calc.engagement_span / 7),
                    frequency: calc.attendance_frequency,
                    weeklyContinuity: calc.weekly_continuity,
                    eis: calc.eis_score,
                    category: calc.engagement_category,
                    hecStatus: calc.hec_compliance,
                    evidenceCount: data.section1.attendance_logs.filter(l => l.evidence_file).length,
                    evidenceRatio: Math.round((data.section1.attendance_logs.filter(l => l.evidence_file).length / data.section1.attendance_logs.length) * 100),
                    redFlags: calc.redFlags,
                    isNonCompliant: calc.isNonCompliant,
                    individual_metrics: calc.individual_metrics,
                };

                setVerifiedMetrics(finalMetrics);
                setParticipationUnlocked(false); // Relock after submission

                // Persist completion state to report context
                updateSection('section1', {
                    verified_summary: "Participation record finalized with HEC-compliant audit trail.",
                    metrics: calc
                });

                handleNext(); // Move to dashboard
            } else {
                throw new Error("Finalization failed");
            }
        } catch (err) {
            console.error("Final Submit Error:", err);
        } finally {
            setIsLoadingMetrics(false);
        }
    };

    const selfParticipantIds = React.useMemo(
        () =>
            selfParticipantRealIds(
                currentUserEmail,
                data.section1.team_lead as Record<string, unknown>,
                data.section1.team_members,
                participantId,
            ),
        [currentUserEmail, data.section1.team_lead, data.section1.team_members, participantId],
    );

    const handleDeleteEntry = async (entryId: string) => {
        const entry = data.section1.attendance_logs.find((l: any) => l.id === entryId);
        if (!entry) return;

        if (!canDeleteAttendanceEntry(entry as { participantId?: string }, selfParticipantIds, currentUserEmail)) {
            toast.error("You can only delete attendance entries that you logged for yourself.");
            return;
        }

        if (!confirm("Are you sure you want to remove this session?")) return;

        const entryParticipantId = (entry as any)?.participantId || participantId;
        if (!entryParticipantId) return;

        // Strip prefix for API call
        const segments = entryParticipantId.split(':');
        const realId = segments.length > 1 ? segments[segments.length - 1] : entryParticipantId;
        if (!realId) return;

        setIsDeleting(entryId);
        try {
            const res = await authenticatedFetch(`/api/v1/engagement/${realId}/attendance/${entryId}`, {
                method: 'DELETE'
            });

            if (res && res.ok) {
                const newLogs = data.section1.attendance_logs.filter((l: any) => l.id !== entryId);
                updateSection('section1', { attendance_logs: newLogs });
                toast.success("Attendance entry removed.");
            } else {
                const message = await resolveAttendanceSubmitError(res, "delete");
                toast.error(message, { duration: 8000 });
            }
        } catch (err) {
            console.error(err);
            toast.error("Could not delete this entry. Check your connection and try again.");
        } finally {
            setIsDeleting(null);
        }
    };


    const attendanceVerificationRequestedAt =
        (data.section1 as any).attendance_verification_requested_at ||
        (data.section1 as any).attendanceVerificationRequestedAt ||
        "";
    const isLeadReportVerificationRequested = !!attendanceVerificationRequestedAt;
    const isAttendanceVerificationRequested = isTeamMemberAttendanceOnly
        ? myParticipationVerificationRequested && !isParticipationUnlocked
        : isLeadReportVerificationRequested;
    const isAttendanceFormLocked = isTeamMemberAttendanceOnly
        ? !isParticipationUnlocked &&
          (isSubmittedReport || myParticipationVerificationRequested)
        : !isParticipationUnlocked && (isSubmittedReport || isLeadReportVerificationRequested);
    const lockTeamMemberAdd =
        !isParticipationUnlocked && (isSubmittedReport || isAttendanceVerificationRequested);

    const currentUserIsTeamLead = React.useMemo(() => {
        if (myParticipationIsTeamLead === true) return true;
        const leadEmail = String((team_lead as { email?: string })?.email ?? "")
            .trim()
            .toLowerCase();
        const selfEmail = currentUserEmail?.trim().toLowerCase();
        return Boolean(selfEmail && leadEmail && selfEmail === leadEmail);
    }, [myParticipationIsTeamLead, team_lead, currentUserEmail]);

    const canRemoveTeamMember = React.useCallback(
        (member: { email?: string }) => {
            if (isSubmittedReport && !isParticipationUnlocked) return false;
            const memberEmail = String(member?.email ?? "").trim().toLowerCase();
            const selfEmail = currentUserEmail?.trim().toLowerCase();
            if (selfEmail && memberEmail && selfEmail === memberEmail) return true;
            return currentUserIsTeamLead;
        },
        [isSubmittedReport, isParticipationUnlocked, currentUserEmail, currentUserIsTeamLead],
    );

    const handleSelfLeaveTeam = async () => {
        if (isSubmittedReport && !isParticipationUnlocked) return;
        const selfMember = team_members.find(
            (m: { email?: string }) =>
                String(m?.email ?? "").trim().toLowerCase() === currentUserEmail?.trim().toLowerCase(),
        );
        const selfParticipationId = String(
            participantId || selfMember?.id || selfMember?.participantId || "",
        ).trim();
        if (!selfParticipationId) {
            toast.error("Could not find your participation record. Refresh and try again.");
            return;
        }
        if (
            !window.confirm(
                "Leave this team project?\n\nYour seat will be released and your attendance on this project will no longer be linked to the team report.",
            )
        ) {
            return;
        }
        setIsLeavingTeam(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/engagement/${encodeURIComponent(selfParticipationId)}`,
                { method: "DELETE" },
            );
            if (!res?.ok) {
                const err = await res?.json().catch(() => ({}));
                toast.error(
                    typeof (err as { message?: string }).message === "string"
                        ? (err as { message: string }).message
                        : "Could not leave this team project",
                );
                return;
            }
            toast.success("You have left this team project.");
            window.location.href = "/dashboard/student";
        } catch {
            toast.error("Could not leave this team project.");
        } finally {
            setIsLeavingTeam(false);
        }
    };

    // Helpers
    async function loadEntries(pId: string) {
        // Individual loadEntries is now deprecated in favor of loadAllEntries bulk sync,
        // but we keep it for fallback or specific single-user refreshes if needed.
        try {
            const segments = pId.split(':');
            const realId = segments.length > 1 ? segments[segments.length - 1] : pId;
            const res = await authenticatedFetch(`/api/v1/engagement/${realId}/attendance`);
            if (res && res.ok) {
                const result = await res.json();
                return (result.data || []).map((e: any) =>
                    normalizeEngagementAttendanceLog(e, { participantPrefixedId: pId }),
                );
            }
        } catch (e) {}
        return [];
    }

    async function loadAllEntries(knownLeadParticipantId?: string | null, teamMembersSnapshot?: any[] | null) {
        if (!projectIdFromUrl) return;
        try {
            console.log(`[Attendance] Performing unified bulk sync for project: ${projectIdFromUrl}`);
            const res = await authenticatedFetch(`/api/v1/engagement/project/${projectIdFromUrl}/attendance-logs`);
            
            if (res && res.ok) {
                const result = await res.json();
                const rawLogs = result.data || [];

                const resolvedLeadId =
                    knownLeadParticipantId ?? participantId ?? data.section1.team_lead.id ?? null;
                const teamMembersForMapping =
                    teamMembersSnapshot !== undefined && teamMembersSnapshot !== null
                        ? teamMembersSnapshot
                        : data.section1.team_members;

                // Map raw logs to prefixed IDs for frontend isolation
                const unifiedLogs = rawLogs.map((e: any) => {
                    const realId = String(e.participantId ?? "");
                    const prefixedId = resolveAttendanceLogParticipantPrefixedId(
                        realId,
                        rawParticipants,
                        resolvedLeadId,
                        teamMembersForMapping,
                    );

                    return normalizeEngagementAttendanceLog(e, { participantPrefixedId: prefixedId });
                });
                
                // Deduplicate and update
                const uniqueLogs = Array.from(new Map(unifiedLogs.map((l: any) => [l.id, l])).values());
                console.log(`[Attendance] Bulk sync completed: ${uniqueLogs.length} entries found.`);
                
                updateSection('section1', { attendance_logs: uniqueLogs });

                // Recalculate metrics
                const teamSize = 1 + data.section1.team_members.length;
                const rosterIds = buildIndividualRosterFromSection1(data.section1, participantId ?? data.section1.team_lead?.id);
                const calc = calculateEngagementMetrics(uniqueLogs as any, requiredHoursPerStudent, teamSize, undefined, rosterIds);
                setVerifiedMetrics({
                    totalHours: calc.total_verified_hours,
                    sessionCount: calc.verified_session_count,
                    activeDays: calc.total_active_days,
                    spanWeeks: Math.ceil(calc.engagement_span / 7),
                    frequency: calc.attendance_frequency,
                    weeklyContinuity: calc.weekly_continuity,
                    eis: calc.eis_score,
                    category: calc.engagement_category,
                    hecStatus: calc.hec_compliance,
                    evidenceCount: uniqueLogs.filter((l: any) => l.evidence_file).length,
                    evidenceRatio: Math.round((uniqueLogs.filter((l: any) => l.evidence_file).length / (uniqueLogs.length || 1)) * 100),
                    individual_metrics: calc.individual_metrics,
                });
            }
        } catch (err) {
            console.error("Error in unified attendance sync:", err);
        }
    }



    const projectGoal = requiredHoursPerStudent * (1 + team_members.length);

    /** Sum hours only for roster members (matches per-student cards); excludes other project participants in bulk API. */
    const collectiveProjectHours = React.useMemo(() => {
        const logs = data.section1.attendance_logs || [];
        const total = rawParticipants.reduce((sum, u) => {
            const perMember = logs
                .filter((l: { participantId?: string }) =>
                    engagementParticipantIdsMatch(l.participantId, u.id),
                )
                .reduce((acc: number, log: (typeof logs)[number]) => acc + effectiveHoursFromLog(log), 0);
            return sum + perMember;
        }, 0);
        return Math.round(total * 100) / 100;
    }, [data.section1.attendance_logs, rawParticipants]);

    const isMinimumHoursMet = rawParticipants.every(u => {
        const hours = data.section1.attendance_logs
            .filter((l: any) => {
                if (!engagementParticipantIdsMatch(l.participantId, u.id)) return false;
                // Before one-time verification, count logged (non-rejected) hours — not only approved.
                const status = String(l.approval_status ?? l.approvalStatus ?? "")
                    .trim()
                    .toLowerCase();
                return status !== "rejected";
            })
            .reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0);
        return hours >= requiredHoursPerStudent;
    });

    return (
        <div className="flex min-h-0 w-full min-w-0 flex-col bg-slate-50/30">
            {isTeamMemberAttendanceOnly ? (
                <div className="mx-3 mt-3 rounded-xl border border-[#bfe6e2] bg-[#e3f4fa] px-4 py-3 text-sm text-[#0f5e57] sm:mx-5 lg:mx-6">
                    <p className="font-semibold">Team member — attendance only</p>
                    <p className="mt-1 text-xs text-[#0f5e57]/90">
                        Your team lead completes and submits this report. You may log and update your own attendance below.
                    </p>
                    {!isSubmittedReport || isParticipationUnlocked ? (
                        <button
                            type="button"
                            onClick={() => void handleSelfLeaveTeam()}
                            disabled={isLeavingTeam}
                            className="mt-3 inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                            {isLeavingTeam ? "Leaving..." : "Leave team project"}
                        </button>
                    ) : null}
                </div>
            ) : null}

            {/* Section 1 — compact 4-step progress */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <nav aria-label="Section 1 progress" className="mx-auto max-w-3xl">
                    <ol className="flex items-start">
                        {steps.map((s, idx) => {
                            const isComplete = internalStep > s.id;
                            const isCurrent = internalStep === s.id;
                            const isDisabled =
                                isTeamMemberAttendanceOnly && (s.id === 1 || s.id === 3);
                            const canNavigate = !isDisabled && isComplete;

                            return (
                                <li
                                    key={s.id}
                                    className={clsx(
                                        "relative flex flex-1 flex-col items-center",
                                        idx < steps.length - 1 && "pr-1 sm:pr-0",
                                    )}
                                >
                                    {idx < steps.length - 1 ? (
                                        <div
                                            className={clsx(
                                                "absolute left-[calc(50%+0.875rem)] right-0 top-3.5 hidden h-0.5 sm:block",
                                                isComplete ? "bg-[#0e7d74]" : "bg-[#dcebee]",
                                            )}
                                            aria-hidden
                                        />
                                    ) : null}

                                    <button
                                        type="button"
                                        disabled={isDisabled || (!canNavigate && !isCurrent)}
                                        onClick={() => {
                                            if (isDisabled) return;
                                            if (canNavigate) setInternalStep(s.id);
                                        }}
                                        className={clsx(
                                            "relative z-10 flex flex-col items-center gap-1 transition-opacity",
                                            isDisabled
                                                ? "cursor-not-allowed opacity-40"
                                                : canNavigate || isCurrent
                                                  ? "cursor-pointer"
                                                  : "cursor-default",
                                        )}
                                    >
                                        <span
                                            className={clsx(
                                                "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all",
                                                isCurrent && "bg-[#0e7d74] text-white shadow-sm",
                                                isComplete && !isCurrent && "bg-[#0d2b33] text-white",
                                                !isCurrent && !isComplete && "bg-[#dcebee] text-[#7a919a]",
                                            )}
                                        >
                                            {isComplete && !isCurrent ? (
                                                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                            ) : (
                                                s.id
                                            )}
                                        </span>
                                        <span
                                            className={clsx(
                                                "hidden max-w-[5.5rem] text-center text-[10px] font-medium leading-tight sm:block",
                                                isCurrent
                                                    ? "text-[#0e7d74]"
                                                    : isComplete
                                                      ? "text-[#0d2b33]"
                                                      : "text-[#7a919a]",
                                            )}
                                        >
                                            {s.title}
                                        </span>
                                        <span
                                            className={clsx(
                                                "max-w-[4rem] text-center text-[10px] font-medium leading-tight sm:hidden",
                                                isCurrent ? "text-[#0e7d74]" : "text-[#7a919a]",
                                            )}
                                        >
                                            {s.title.split(" ")[0]}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            </div>

            {/* Scrollable Content Workspace */}
            <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 sm:px-5 lg:px-6">
                <div className="mx-auto max-w-6xl min-w-0 space-y-4">
                    <ParticipationQuest
                        internalStep={internalStep}
                        setInternalStep={setInternalStep}
                        isVerified={isVerified}
                        teamVerified={canMoveToStep4}
                        hasSession={data.section1.attendance_logs.length > 0}
                        hoursMet={isMinimumHoursMet}
                        declared={reviewChecked.slice(0, 3).every(Boolean)}
                    />
                    {internalStep === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Identity & team setup</h3>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Verify your profile, then add teammates if this is a team project.
                                </p>
                            </div>

                            {/* 1. Identity Verification */}
                            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4 shadow-sm sm:p-5">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-[25px] min-w-[30px] items-center justify-center rounded-[9px] bg-[#0d2b33] px-1.5 text-[9.5px] font-extrabold text-white">
                                        1.1
                                    </span>
                                    <h4 className="text-[14.5px] font-bold text-[#0d2b33]">Identity verification</h4>
                                    <span className="ml-auto rounded-full bg-[#fbf0d7] px-2.5 py-1 text-[8px] font-extrabold tracking-wide text-[#b45309]">
                                        MANDATORY
                                    </span>
                                </div>

                                <div>
                                    {(isVerified && !isEditingLead) ? (
                                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                            {(() => {
                                                const leadCnicRaw = String((data.section1.team_lead as any).cnic || "").replace(/\D/g, "");
                                                const leadCnicOk = leadCnicRaw.length === 13;
                                                return !leadCnicOk ? (
                                                    <div className="border-b border-[#f3d9a0] bg-[#fbf0d7] px-4 py-2.5">
                                                        <p className="text-sm text-[#7a5200]">
                                                            CNIC incomplete — use <span className="font-semibold">Edit academic</span> to add your 13-digit CNIC.
                                                        </p>
                                                    </div>
                                                ) : null;
                                            })()}
                                            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0e7d74] text-white">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="text-sm font-semibold text-slate-900">
                                                                {(data.section1.team_lead as any).fullName || (data.section1.team_lead as any).name || "Team Lead"}
                                                            </h4>
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#0e7d74]">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Verified
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                                            {(data.section1.team_lead as any).university || (data.section1.team_lead as any).universityName || "Academic record linked"}
                                                        </p>
                                                        <p className="mt-0.5 font-mono text-[11px] text-slate-600">
                                                            CNIC:{" "}
                                                            {String((data.section1.team_lead as any).cnic || "")
                                                                .replace(/\D/g, "")
                                                                .length === 13
                                                                ? formatPakistaniCnicDisplay((data.section1.team_lead as any).cnic)
                                                                : "—"}
                                                        </p>
                                                        {(() => {
                                                            const mobile = formatInternationalPhoneDisplay(
                                                                String((data.section1.team_lead as any).mobile || ""),
                                                            );
                                                            if (!mobile) return null;
                                                            return (
                                                                <p className="mt-0.5 font-mono text-[11px] text-slate-600">
                                                                    Mobile: {mobile}
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingLead(true)}
                                                        className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Edit academic
                                                    </button>
                                                    {!participantId && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                setIsLoadingMetrics(true);
                                                                await fetchInitialData();
                                                                setIsLoadingMetrics(false);
                                                            }}
                                                            disabled={isLoadingMetrics}
                                                            className="inline-flex h-9 items-center rounded-lg bg-[#fbf0d7] px-3 text-xs font-semibold text-[#b45309] hover:bg-[#f3d9a0] disabled:opacity-50"
                                                        >
                                                            {isLoadingMetrics ? "Syncing…" : "Sync record"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <IdentityVerification
                                            projectId={data.project_id || projectIdFromUrl || ""}
                                            participationMode={participation_type as any}
                                            initialData={{
                                                ...team_lead,
                                                ...(teamId ? { teamId, team_id: teamId } : {}),
                                            }}
                                            isTeamLead={true}
                                            teamId={teamId}
                                            primaryFacultyEmail={primaryFacultyEmail}
                                            secondaryFacultyEmail={secondaryFacultyEmail}
                                            showSemester
                                            onSuccess={(p) => {
                                                setIsVerified(true);
                                                setIsEditingLead(false);
                                                setParticipantId(p.id);
                                                updateSection('section1', {
                                                    team_lead: {
                                                        ...team_lead,
                                                        ...p,
                                                        verified: true,
                                                        university: p.universityName,
                                                        degree: p.academicProgram,
                                                        year: p.yearOfStudy,
                                                        semester: p.semester,
                                                        name: p.fullName
                                                    }
                                                });
                                                toast.success('Identity updated successfully!');
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* 2. Team Members */}
                            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4 shadow-sm sm:p-5">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-[25px] min-w-[30px] items-center justify-center rounded-[9px] bg-[#0d2b33] px-1.5 text-[9.5px] font-extrabold text-white">
                                        1.2
                                    </span>
                                    <h4 className="text-[14.5px] font-bold text-[#0d2b33]">Team members</h4>
                                    <span className="ml-auto rounded-full bg-[#e3f4fa] px-2.5 py-1 text-[8px] font-extrabold tracking-wide text-[#0891b2]">
                                        EACH MEMBER: INDIVIDUAL + ACADEMIC
                                    </span>
                                </div>
                                <div>
                                    <TeamVerification
                                        projectId={data.project_id || projectIdFromUrl || ""}
                                        members={team_members}
                                        lockAddMembers={lockTeamMemberAdd}
                                        canRemoveMember={canRemoveTeamMember}
                                        teamId={teamId}
                                        primaryFacultyEmail={primaryFacultyEmail}
                                        secondaryFacultyEmail={secondaryFacultyEmail}
                                        onUpdateMembers={async (newMembers) => {
                                            const newType = newMembers.length > 0 ? 'team' : 'individual';
                                            updateSection('section1', {
                                                team_members: newMembers,
                                                participation_type: newType
                                            });

                                            const hasVerified = newMembers.some((m: any) => m.verified && (m.id || m.participantId));
                                            if (hasVerified) {
                                                const verifiedIds = newMembers
                                                    .filter((m: any) => m.verified && (m.id || m.participantId))
                                                    .map((m: any) => String(m.id || m.participantId));
                                                try {
                                                    const projectId = data.project_id || projectIdFromUrl || '';
                                                    if (projectId && verifiedIds.length) {
                                                        const formRes = await formTeamFromLead(projectId, verifiedIds);
                                                        if (formRes?.ok) {
                                                            const formJson = await formRes.json().catch(() => ({}));
                                                            if (formJson?.data?.formed) {
                                                                toast.success(
                                                                    formJson.data.team_display_name
                                                                        ? `Team formed: ${formJson.data.team_display_name}`
                                                                        : "Your project is now a team project.",
                                                                );
                                                                if (formJson.data.team_id) {
                                                                    setTeamId(formJson.data.team_id);
                                                                }
                                                            } else {
                                                                const msg =
                                                                    typeof formJson?.data?.message === "string"
                                                                        ? formJson.data.message
                                                                        : typeof formJson?.message === "string"
                                                                          ? formJson.message
                                                                          : "Team was not formed. Add verified members and try again.";
                                                                toast.error(msg);
                                                            }
                                                        } else {
                                                            const errJson = formRes
                                                                ? await formRes.json().catch(() => ({}))
                                                                : {};
                                                            toast.error(
                                                                typeof (errJson as { message?: string }).message === "string"
                                                                    ? (errJson as { message: string }).message
                                                                    : "Could not form team. Please try again.",
                                                            );
                                                        }
                                                        const payload = await prepareReportEvidenceForSave(
                                                            {
                                                                ...data,
                                                                project_id: projectId,
                                                                section1: {
                                                                    ...data.section1,
                                                                    team_members: newMembers,
                                                                    participation_type: newType,
                                                                },
                                                                status: "continue",
                                                            },
                                                            projectId,
                                                        );
                                                        await authenticatedFetch(
                                                            `/api/v1/student/reports/draft`,
                                                            { method: "POST", body: JSON.stringify(payload) },
                                                            { timeoutMs: 120000 },
                                                        );
                                                    }
                                                } catch (err) {
                                                    console.error('Auto-save after member verification failed:', err);
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    {internalStep === 2 && (() => {
                        const selectedStudentName =
                            rawParticipants.find((u: { id: string }) => u.id === selectedParticipantId)
                                ?.name || "Selected student";
                        const participantLogs = data.section1.attendance_logs.filter(
                            (l: { participantId?: string }) => {
                                if (!selectedParticipantId) return true;
                                return engagementParticipantIdsMatch(
                                    l.participantId,
                                    selectedParticipantId,
                                );
                            },
                        );
                        const loggedEff = participantLogs.reduce(
                            (acc: number, log: (typeof participantLogs)[number]) =>
                                acc + effectiveHoursFromLog(log),
                            0,
                        );
                        const loggedRounded = Math.round(loggedEff * 100) / 100;
                        const remainingHours = Math.max(
                            0,
                            Math.round((requiredHoursPerStudent - loggedEff) * 100) / 100,
                        );
                        const personalProgressPct =
                            requiredHoursPerStudent > 0
                                ? Math.min(100, Math.round((loggedEff / requiredHoursPerStudent) * 100))
                                : 0;
                        const filteredLogCount = participantLogs.length;

                        return (
                            <div className="space-y-4">
                                <div className="cer-inner-bridge overflow-hidden rounded-[22px] bg-gradient-to-br from-[#04252b] via-[#0e5f63] to-[#12a5a0] px-5 py-4 text-white sm:px-6">
                                    <p className="text-[9px] font-extrabold tracking-[0.22em] text-[#99f6e4]">
                                        SECTION 1 · PARTICIPATION
                                    </p>
                                    <h3 className="mt-1 text-lg font-extrabold tracking-tight sm:text-[19px]">
                                        Log sessions for your crew
                                    </h3>
                                    <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-[#cdf5f0]">
                                        Tap a member, log date · time · location · activity · photos. Hours compute
                                        automatically. Faculty reviews pending sessions from their flash-card queue.
                                    </p>
                                </div>

                                <div className="flex gap-2 rounded-[12px] border border-[#bfe6e2] bg-[#e3f4fa] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#0f5e57]">
                                    <span className="shrink-0 text-base" aria-hidden>
                                        🎉
                                    </span>
                                    <span>
                                        <b>Tip:</b> sessions save as you go. When everyone has met minimum hours,
                                        use Step 3 to send for Faculty or Partner approval — they review each
                                        session on a flash card.
                                    </span>
                                </div>

                                <div className="rounded-[18px] border border-[#dcebee] bg-white p-4 shadow-sm sm:p-5">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="flex h-[25px] min-w-[30px] items-center justify-center rounded-[9px] bg-[#0d2b33] px-1.5 text-[9.5px] font-extrabold text-white">
                                            1.1
                                        </span>
                                        <h4 className="text-[14.5px] font-bold text-[#0d2b33]">Your crew</h4>
                                        <span className="ml-auto rounded-full bg-[#e3f4fa] px-2.5 py-1 text-[8px] font-extrabold tracking-wide text-[#0891b2]">
                                            TAP TO LOG FOR
                                        </span>
                                    </div>
                                    <p className="mb-3 text-[11px] text-[#7a919a]">
                                        Tap the member you’re logging hours for.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                        {rawParticipants.map((u) => {
                                            const on = u.id === selectedParticipantId;
                                            const logsFor = data.section1.attendance_logs.filter(
                                                (l: { participantId?: string }) =>
                                                    engagementParticipantIdsMatch(l.participantId, u.id),
                                            );
                                            const hrs =
                                                Math.round(
                                                    logsFor.reduce(
                                                        (acc: number, log: (typeof logsFor)[number]) =>
                                                            acc + effectiveHoursFromLog(log),
                                                        0,
                                                    ) * 10,
                                                ) / 10;
                                            const pct =
                                                requiredHoursPerStudent > 0
                                                    ? Math.min(100, (hrs / requiredHoursPerStudent) * 100)
                                                    : 0;
                                            const initial = (u.name || "?").replace(/\s*\(Self\)\s*/i, "").trim().charAt(0).toUpperCase();
                                            return (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => setSelectedParticipantId(u.id)}
                                                    className={clsx(
                                                        "rounded-[14px] border p-3 text-center transition",
                                                        on
                                                            ? "border-[#0e7d74] bg-[#e6f6f4] ring-1 ring-[#0e7d74]/30"
                                                            : "border-[#dcebee] bg-white hover:border-[#0e7d74]/50",
                                                    )}
                                                >
                                                    <div
                                                        className={clsx(
                                                            "mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-extrabold text-white",
                                                            on
                                                                ? "bg-gradient-to-br from-[#0e7d74] to-[#2dd4bf]"
                                                                : "bg-gradient-to-br from-[#0f5e63] to-[#22d3ee]",
                                                        )}
                                                    >
                                                        {initial}
                                                    </div>
                                                    <p className="truncate text-xs font-bold text-[#0d2b33]">
                                                        {u.name}
                                                    </p>
                                                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e8f2f0]">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-[#0e5f63] to-[#2dd4bf] transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <p className="mt-1 text-[10px] font-extrabold text-[#0e7d74]">
                                                        {hrs}h / {requiredHoursPerStudent}h
                                                        {hrs >= requiredHoursPerStudent ? " 🏆" : ""}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <span className="flex h-[25px] min-w-[30px] items-center justify-center rounded-[9px] bg-[#0d2b33] px-1.5 text-[9.5px] font-extrabold text-white">
                                            1.2
                                        </span>
                                        <h3 className="text-[14.5px] font-bold text-[#0d2b33]">Log a session</h3>
                                        <span className="ml-auto rounded-full bg-[#fbf0d7] px-2.5 py-1 text-[8px] font-extrabold tracking-wide text-[#b45309]">
                                            MANDATORY
                                        </span>
                                    </div>
                                    <p className="mb-3 text-sm text-[#7a919a]">
                                        Date, time, location, activity type, short description, and photo evidence.
                                    </p>
                                </div>

                                <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start">
                                    {/* Left: form */}
                                    <div className="min-w-0 rounded-[18px] border border-[#dcebee] bg-white p-4 shadow-sm sm:p-5">
                                        <AttendanceForm
                                            verifiedUsers={rawParticipants}
                                            onSuccess={() => loadAllEntries()}
                                            selectedParticipantId={selectedParticipantId}
                                            onParticipantChange={setSelectedParticipantId}
                                            isLocked={isAttendanceFormLocked}
                                            isParticipationUnlocked={isParticipationUnlocked}
                                            setParticipationUnlocked={setParticipationUnlocked}
                                            allowManualUnlock={!isAttendanceVerificationRequested}
                                        />

                                        {!isSubmittedReport && !isParticipationUnlocked ? (
                                            <div className="mt-5 border-t border-[#dcebee] pt-4">
                                                {isAttendanceVerificationRequested ? (
                                                    <div className="space-y-1.5">
                                                        <p className="text-xs font-semibold text-[#0e7d74]">
                                                            Verification request sent
                                                        </p>
                                                        <p className="text-sm leading-relaxed text-slate-600">
                                                            {ATTENDANCE_VERIFICATION_INFO.afterSent}
                                                            <span className="mt-1.5 block text-slate-500">
                                                                {ATTENDANCE_VERIFICATION_INFO.afterSentWho}
                                                            </span>
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs leading-relaxed text-slate-500">
                                                        Sessions stay editable here until you submit the whole
                                                        report in Step 3 — no separate verification request needed.
                                                    </p>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Right: logged sessions + hours progress */}
                                    <div className="min-w-0 space-y-4">
                                        <div className="overflow-hidden rounded-[18px] border border-[#dcebee] bg-white shadow-sm">
                                            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#dcebee] px-4 py-4 sm:px-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-[25px] min-w-[30px] items-center justify-center rounded-[9px] bg-[#0d2b33] px-1.5 text-[9.5px] font-extrabold text-white">
                                                        1.3
                                                    </span>
                                                    <h4 className="text-[14.5px] font-bold text-[#0d2b33]">
                                                        Activities log
                                                    </h4>
                                                </div>
                                                <p className="shrink-0 text-xs text-[#7a919a]">
                                                    {filteredLogCount}{" "}
                                                    {filteredLogCount === 1 ? "record" : "records"}
                                                    {selectedParticipantId
                                                        ? ` · ${selectedStudentName}`
                                                        : ""}
                                                </p>
                                            </div>
                                            <AttendanceSummaryTable
                                                embedded
                                                entries={participantLogs}
                                                participantNames={participantNamesMap}
                                                onDelete={handleDeleteEntry}
                                                canDeleteEntry={(entry) =>
                                                    canDeleteAttendanceEntry(
                                                        entry,
                                                        selfParticipantIds,
                                                        currentUserEmail,
                                                    )
                                                }
                                                isLocked={isAttendanceFormLocked}
                                            />
                                        </div>

                                        {selectedParticipantId ? (
                                            <div className="rounded-[18px] border border-[#dcebee] bg-white px-5 py-4 shadow-sm">
                                                <ImpactClockGauge
                                                    hours={loggedRounded}
                                                    requiredHours={requiredHoursPerStudent}
                                                    name={selectedStudentName}
                                                />
                                                <div className="mt-4 mb-2.5 flex items-center justify-between gap-3">
                                                    <p className="text-xs text-[#7a919a]">
                                                        Hours logged toward {requiredHoursPerStudent}-hour minimum
                                                    </p>
                                                    <p className="shrink-0 text-sm font-extrabold text-[#0e7d74]">
                                                        {loggedRounded} / {requiredHoursPerStudent} hrs
                                                    </p>
                                                </div>
                                                <div className="h-2.5 overflow-hidden rounded-full bg-[#e8f2f0]">
                                                    <div
                                                        className={clsx(
                                                            "h-full rounded-full transition-all",
                                                            personalProgressPct >= 100
                                                                ? "bg-[#0e7d74]"
                                                                : "bg-gradient-to-r from-[#0e5f63] to-[#2dd4bf]",
                                                        )}
                                                        style={{ width: `${personalProgressPct}%` }}
                                                    />
                                                </div>
                                                {remainingHours > 0 ? (
                                                    <p className="mt-2 text-[11px] text-[#7a919a]">
                                                        {remainingHours} hrs remaining
                                                    </p>
                                                ) : (
                                                    <p className="mt-2 text-[11px] font-medium text-[#0e7d74]">
                                                        Minimum hours met
                                                    </p>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}


                    {internalStep === 3 && (
                        <div className="mx-auto max-w-2xl space-y-6 py-4">

                            <div className="text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0e7d74] text-white shadow-md shadow-[#0e7d74]/20">
                                    <Shield className="h-7 w-7" />
                                </div>
                                <p className="text-xs font-medium text-[#0e7d74]">Step 3</p>
                                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                                    Review & submit
                                </h2>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                                    Confirm your attendance records are accurate before finalizing.
                                </p>
                            </div>

                            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4 shadow-sm">
                                <p className="text-xs font-medium text-[#7a919a]">Hours summary</p>
                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 text-center">
                                    <div className="rounded-lg bg-[#f5fbfa] px-2 py-2.5 ring-1 ring-[#dcebee]">
                                        <p className="text-lg font-bold text-[#0d2b33]">{projectGoal}</p>
                                        <p className="text-[11px] text-[#7a919a]">Project goal</p>
                                    </div>
                                    <div className="rounded-lg bg-[#f5fbfa] px-2 py-2.5 ring-1 ring-[#dcebee]">
                                        <p className="text-lg font-bold text-[#0e7d74]">
                                            {collectiveProjectHours}
                                        </p>
                                        <p className="text-[11px] text-[#7a919a]">Team logged</p>
                                    </div>
                                    <div className="rounded-lg bg-[#f5fbfa] px-2 py-2.5 ring-1 ring-[#dcebee]">
                                        <p
                                            className={clsx(
                                                "text-lg font-bold",
                                                isMinimumHoursMet ? "text-[#0e7d74]" : "text-[#b45309]",
                                            )}
                                        >
                                            {requiredHoursPerStudent}
                                        </p>
                                        <p className="text-[11px] text-[#7a919a]">Per student</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 rounded-lg px-1 py-1">
                                    {isMinimumHoursMet ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0e7d74]" />
                                            <p className="text-xs text-[#0f5e57]">
                                                All students have met the minimum hour requirement.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-4 w-4 shrink-0 text-[#b45309]" />
                                            <p className="text-xs text-[#7a5200]">
                                                Some students still need more hours. Return to Step 2 to
                                                add sessions.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 rounded-xl border border-[#f3d9a0] bg-[#fbf0d7] p-4">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#b45309]" />
                                <div>
                                    <h4 className="text-sm font-semibold text-[#7a5200]">
                                        Permanent record lock
                                    </h4>
                                    <p className="mt-1 text-sm leading-relaxed text-[#7a5200]">
                                        After submission, all participation records become{" "}
                                        <strong>permanently locked</strong> and cannot be edited. Any
                                        inaccuracies will appear on your official HEC verification record.
                                    </p>
                                </div>
                            </div>

                            {!isMinimumHoursMet ? (
                                <div className="flex gap-3 rounded-xl border border-[#f3c6cf] bg-[#fdedf0] p-4">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#e11d48]" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-[#9f1239]">
                                            Minimum hours not met
                                        </h4>
                                        <p className="mt-1 text-sm leading-relaxed text-[#9f1239]">
                                            Every student must reach{" "}
                                            <strong>{requiredHoursPerStudent} hours</strong> before you can
                                            finalize. Go back to attendance logging to complete remaining
                                            sessions.
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4 shadow-sm sm:p-5">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-[25px] min-w-[30px] items-center justify-center rounded-[9px] bg-[#0d2b33] px-1.5 text-[9.5px] font-extrabold text-white">
                                        1.6
                                    </span>
                                    <h4 className="text-[14.5px] font-bold text-[#0d2b33]">
                                        Declaration
                                    </h4>
                                    <span className="ml-auto rounded-full bg-[#fbf0d7] px-2.5 py-1 text-[8px] font-extrabold tracking-wide text-[#b45309]">
                                        REQUIRED
                                    </span>
                                </div>
                                <p className="mb-3 -mt-1 text-xs text-[#7a919a]">
                                    No separate attendance sign-off — this declaration replaces it. Your
                                    whole report is verified once, by faculty, at the end.
                                </p>
                                <div className="space-y-2">
                                    {[
                                        "I verify that all session entries are authentic.",
                                        "I understand that no further edits are possible after submission.",
                                        "I understand my whole report — not each session — is verified once by faculty at the end, and I consent to institutional report sharing.",
                                    ].map((check, i) => (
                                        <label
                                            key={i}
                                            className={clsx(
                                                "flex cursor-pointer items-start gap-3 rounded-[13px] border px-3 py-3 transition-colors",
                                                reviewChecked[i]
                                                    ? "border-[#0e7d74] bg-[#e6f6f4]"
                                                    : "border-dashed border-[#cbe7e3] bg-white hover:border-[#0e7d74]/50",
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={reviewChecked[i]}
                                                onChange={() => {
                                                    const newChecked = [...reviewChecked];
                                                    newChecked[i] = !newChecked[i];
                                                    updateSection("section1", {
                                                        review_checked: newChecked,
                                                        ...(i === 2
                                                            ? { privacy_consent: newChecked[i] }
                                                            : {}),
                                                    });
                                                }}
                                                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#dcebee] accent-[#0e7d74] focus:ring-2 focus:ring-[#0e7d74] focus:ring-offset-1"
                                            />
                                            <span className="text-sm leading-relaxed text-[#0d2b33]">
                                                {check}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Legacy status only — reports that already requested attendance verification
                                before this was replaced by the declaration above stay visibly locked; no
                                new requests can be created any more. */}
                            {!isSubmittedReport && !isTeamMemberAttendanceOnly && isAttendanceVerificationRequested ? (
                                <div className="rounded-lg border border-[#bfe6e2] bg-[#e6f6f4] px-4 py-3 text-sm text-[#0f5e57]">
                                    <p className="font-semibold">Verification request sent</p>
                                    <p className="mt-1 text-xs text-[#0f5e57]">
                                        {ATTENDANCE_VERIFICATION_INFO.afterSent}{" "}
                                        {ATTENDANCE_VERIFICATION_INFO.afterSentWho}
                                    </p>
                                </div>
                            ) : null}

                        </div>
                    )}

                    {/* Metrics Dashboard (step 4) */}
                    {internalStep === 4 && (
                        <div className="space-y-6">
                            <div className="mx-auto max-w-2xl text-center">
                                <p className="text-xs font-medium text-[#0e7d74]">Step 4</p>
                                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                                    Metrics dashboard
                                </h2>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                                    Engagement hours, sessions, and evidence for this record.
                                </p>
                                {isSubmitted ? (
                                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e6f6f4] px-3 py-1 text-xs font-medium text-[#0f5e57] ring-1 ring-[#bfe6e2]">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Record finalized
                                    </span>
                                ) : null}
                            </div>

                            {verifiedMetrics ? (
                                <div className="animate-in slide-in-from-bottom-4 duration-500">
                                    <EngagementOverview
                                        metrics={{
                                            ...verifiedMetrics,
                                            projectGoal,
                                            requiredHours: requiredHoursPerStudent,
                                            individual_metrics:
                                                verifiedMetrics.individual_metrics ??
                                                data.section1.metrics.individual_metrics,
                                        }}
                                        isTeam={participation_type === "team"}
                                        hideIntensityHero
                                        report={data}
                                    />
                                </div>
                            ) : (
                                <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                                    <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#0e7d74]" />
                                    <p className="mt-4 text-base font-semibold text-slate-800">
                                        Generating analytics
                                    </p>
                                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                                        Calculating engagement scores and verifying HEC compliance.
                                    </p>
                                    {!isSubmitted ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => setInternalStep(3)}
                                            className="mt-6 h-10 rounded-lg border-[#cbe7e3] text-sm font-medium text-[#0e7d74] hover:bg-[#e6f6f4]"
                                        >
                                            Return to review
                                        </Button>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Sticky bottom actions */}
            <div className="mt-auto border-t border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={internalStep === 1}
                        className="order-2 h-10 rounded-lg border-slate-200 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:order-1 disabled:opacity-40"
                    >
                        <ChevronLeft className="mr-1.5 h-4 w-4" />
                        Previous step
                    </Button>

                    <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row sm:items-center sm:gap-2">
                        {!isTeamMemberAttendanceOnly ? (
                            <Button
                                variant="outline"
                                onClick={() => saveReport(false)}
                                className="h-10 rounded-lg border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <Save className="mr-1.5 h-4 w-4 text-slate-400" />
                                Save section progress
                            </Button>
                        ) : null}

                        {internalStep < 4 ? (
                            <>
                                {internalStep === 3 ? (
                                    <Button
                                        onClick={handleFinalSubmit}
                                        disabled={
                                            !reviewChecked.every(Boolean) ||
                                            isLoadingMetrics ||
                                            !isMinimumHoursMet
                                        }
                                        className="h-10 rounded-lg bg-[#0e7d74] px-5 text-sm font-semibold text-white hover:bg-[#0c6a62] disabled:opacity-50"
                                    >
                                        {isLoadingMetrics ? (
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Lock className="mr-1.5 h-4 w-4" />
                                        )}
                                        Finalize & generate record
                                    </Button>
                                ) : null}
                                <Button
                                    onClick={handleNext}
                                    disabled={
                                        (internalStep === 1 && !isVerified) ||
                                        (internalStep === 3 && !isMinimumHoursMet) ||
                                        (isTeamMemberAttendanceOnly && internalStep >= 2)
                                    }
                                    className={clsx(
                                        "h-10 rounded-lg px-5 text-sm font-semibold disabled:opacity-50",
                                        internalStep === 3
                                            ? "bg-[#e6f6f4] text-[#0e7d74] hover:bg-[#d9f2ee] shadow-none"
                                            : "bg-[#0e7d74] text-white hover:bg-[#0c6a62] shadow-sm",
                                    )}
                                >
                                    {internalStep === 3 ? "Skip & continue" : "Next step"}
                                    <ChevronRight className="ml-1.5 h-4 w-4" />
                                </Button>
                            </>
                        ) : !isTeamMemberAttendanceOnly ? (
                            <Button
                                onClick={handleNext}
                                className="h-10 rounded-lg bg-[#0e7d74] px-5 text-sm font-semibold text-white hover:bg-[#0c6a62]"
                            >
                                Save & continue to next section
                                <ChevronRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
