import React from "react";
import { Users, User, UserPlus, Trash2, Shield, Info, AlertCircle, Clock, CheckCircle2, Loader2, Award, Zap, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Save, Lock, Unlock, PlusCircle, Activity } from "lucide-react";
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
import { buildIndividualRosterFromSection1, calculateEngagementMetrics, effectiveHoursFromLog } from "../utils/engagementMetrics";
import { isAttendanceLogCountedForVerifiedMetrics } from "@/utils/attendanceApprovalEligibility";
import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";
import { calculateSection1CII } from "@/utils/reportQuality";
import { calculateCII } from "../utils/calculateCII";
import { resolveScopedTeamMembers } from "@/utils/reportTeamScope";
import { effectiveParticipationStatusForReportActions } from "@/utils/studentJoinApplication";
import { resolveAttendanceSubmitError } from "@/utils/attendanceSubmitError";
import Section1AnalyticsPanel from "@/components/analytics/Section1AnalyticsPanel";
import { fetchSection1Analytics } from "@/utils/section1Analytics";
import {
    participationAttendanceVerificationRequested,
    resolveStudentAdminAttendanceUnlock,
} from "@/utils/adminEnrollmentAttendance";

/** Copy for verify-attendance UX: no reviewer emails shown; NGO/partner first, faculty fallback. */
const ATTENDANCE_VERIFICATION_INFO = {
    lockNote:
        "One-time step: after you confirm, attendance stays locked until approval is complete.",
    routing:
        "Your attendance approval goes to the NGO or partner organisation linked to this project when one exists. If there is no NGO or partner on record, your faculty supervisor handles approval instead.",
    confirmBody:
        "Your attendance entries will lock for editing. The request goes to your NGO or partner when this project has one linked; otherwise your faculty supervisor receives it.",
    afterSent:
        "Attendance is locked until a reviewer completes approval.",
    afterSentWho:
        "NGO or partner is notified when linked; if not, your faculty supervisor receives the request.",
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
    const [isRequestingAttendanceVerification, setIsRequestingAttendanceVerification] = React.useState(false);
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
                const myPart = parts.data.find((p: any) => p.projectId === projectIdFromUrl);

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

    const handleRequestAttendanceVerification = async () => {
        if (isAttendanceVerificationRequested || isSubmittedReport) return;
        if (!projectIdFromUrl) {
            toast.error("Project context missing. Please refresh and try again.");
            return;
        }
        if (!data.section1.attendance_logs.length) {
            toast.error("Please add at least one attendance entry before verification.");
            return;
        }
        const confirmed = window.confirm(
            "Request attendance verification?\n\n" +
                ATTENDANCE_VERIFICATION_INFO.confirmBody +
                " " +
                ATTENDANCE_VERIFICATION_INFO.lockNote,
        );
        if (!confirmed) return;

        const requestedAt = new Date().toISOString();
        setIsRequestingAttendanceVerification(true);

        updateSection("section1", {
            attendance_verification_requested_at: requestedAt,
            attendance_verification_status: "pending_approval",
            attendance_verification_locked: true,
            attendance_verification_email_notified: false,
        });
        setParticipationUnlocked(false);

        let serverNotified = false;
        let requestType = "created";
        try {
            const res = await authenticatedFetch(
                `/api/v1/engagement/project/${encodeURIComponent(projectIdFromUrl)}/attendance/verify-request`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectId: projectIdFromUrl,
                        participantId: participantId || undefined,
                        requestedAt,
                    }),
                },
            );

            if (res?.ok) {
                const json = await res.json().catch(() => ({}));
                serverNotified = Boolean(json?.emailNotified);
                requestType = typeof json?.type === "string" ? json.type : "created";
            } else {
                toast.warning("Verification locked. Email notify endpoint not available yet.");
            }
        } catch {
            toast.warning("Verification locked. Email notify endpoint not available yet.");
        } finally {
            updateSection("section1", {
                attendance_verification_requested_at: requestedAt,
                attendance_verification_status: "pending_approval",
                attendance_verification_locked: true,
                attendance_verification_email_notified: serverNotified,
            });
            await saveReport(true);
            setIsRequestingAttendanceVerification(false);
        }

        if (requestType === "already_requested") {
            toast.success("Attendance verification was already requested earlier and remains locked.");
            return;
        }

        toast.success(
            serverNotified
                ? "Attendance submitted for verification. The assigned reviewer has been notified."
                : "Attendance locked for verification.",
        );
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
            .filter(
                (l: any) =>
                    engagementParticipantIdsMatch(l.participantId, u.id) &&
                    isAttendanceLogCountedForVerifiedMetrics(l),
            )
            .reduce((acc: number, log: any) => acc + (Number(log.hours) || 0), 0);
        return hours >= requiredHoursPerStudent;
    });


    return (
        <div className="flex min-h-0 w-full min-w-0 flex-col bg-slate-50/30">
            {isTeamMemberAttendanceOnly ? (
                <div className="mx-3 mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 sm:mx-5 lg:mx-6">
                    <p className="font-semibold">Team member — attendance only</p>
                    <p className="mt-1 text-xs text-sky-800/90">
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

            {/* Sticky Nav Progress */}
            <div className="shrink-0 border-b border-slate-100 bg-white px-3 py-2.5 sm:px-5 lg:px-6">
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                    {steps.map((s, idx) => (
                        <React.Fragment key={s.id}>
                            <button
                                type="button"
                                disabled={
                                    isTeamMemberAttendanceOnly
                                        ? s.id === 1 || s.id === 3
                                        : false
                                }
                                onClick={() => {
                                    if (isTeamMemberAttendanceOnly && (s.id === 1 || s.id === 3)) return;
                                    if (internalStep > s.id) setInternalStep(s.id);
                                }}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                                    isTeamMemberAttendanceOnly && (s.id === 1 || s.id === 3)
                                        ? "cursor-not-allowed opacity-40 text-slate-400"
                                        : internalStep === s.id
                                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                                          : internalStep > s.id
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                            : "text-slate-400 hover:text-slate-600",
                                )}
                            >
                                <span className={clsx(
                                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                                    internalStep === s.id ? "bg-white/20" : "bg-slate-100"
                                )}>{s.id}</span>
                                {s.title}
                            </button>
                            {idx < steps.length - 1 && (
                                <div className="hidden h-px w-6 shrink-0 bg-slate-100 sm:block md:w-8" aria-hidden />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Scrollable Content Workspace */}
            <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
                <div className="mx-auto max-w-6xl min-w-0 space-y-5">
                    {internalStep === 1 && (
                        <div className="space-y-6">
                            {/* ── Institutional purpose (orientation) ── */}
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="h-1 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-400" aria-hidden />
                                <div className="p-6 md:p-8">
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                    Institutional purpose
                                                </p>
                                                <h3 className="mt-2 text-lg md:text-xl font-semibold text-slate-900 tracking-tight">
                                                    Establish accountability
                                                </h3>
                                                <p className="mt-3 text-[13px] text-slate-600 leading-relaxed max-w-3xl">
                                                    This section documents verified participation and academic alignment so your community engagement record meets institutional audit expectations.
                                                </p>
                                            </div>
                                            <ul className="grid gap-4 sm:grid-cols-2">
                                                {[
                                                    "Verified participation via audit-ready logs",
                                                    "Academic linkage to official student records",
                                                    "Attendance integrity through HEC-compliant tracking",
                                                    "Individual accountability for community hours"
                                                ].map((p, i) => (
                                                    <li
                                                        key={i}
                                                        className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-[13px] text-slate-700 leading-relaxed shadow-sm"
                                                    >
                                                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                                            {i + 1}
                                                        </span>
                                                        <span>{p}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1 mt-4">
                                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Step 1 — Identity & Context</h3>
                                <p className="text-sm text-slate-500 font-medium">Verify your profile and team configuration to unlock attendance logging.</p>
                            </div>

                            {/* 1. Identity Verification Accordion */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-800">Identity Verification</h4>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </div>

                                <div className="px-6 pb-6">
                                    {(isVerified && !isEditingLead) ? (
                                        <div className="rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                                            {(() => {
                                                const leadCnicRaw = String((data.section1.team_lead as any).cnic || "").replace(/\D/g, "");
                                                const leadCnicOk = leadCnicRaw.length === 13;
                                                return !leadCnicOk ? (
                                                    <div className="px-5 pt-4 pb-0">
                                                        <p className="text-[13px] font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 leading-relaxed">
                                                            CNIC is missing or incomplete for this project record. Use <span className="font-bold">Edit Academic</span> to add your 13-digit CNIC so your report meets traceability requirements.
                                                        </p>
                                                    </div>
                                                ) : null;
                                            })()}
                                            <div className="p-6 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                                        <div className="relative">
                                                            <User className="w-6 h-6" />
                                                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
                                                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-bold text-slate-800">
                                                                {(data.section1.team_lead as any).fullName || (data.section1.team_lead as any).name || "Team Lead"}
                                                            </h4>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="bg-emerald-500 rounded-full p-0.5">
                                                                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Verified</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            {(data.section1.team_lead as any).university || (data.section1.team_lead as any).universityName || "Academic Record Linked"}
                                                        </p>
                                                        <p className="text-[11px] text-slate-600 font-mono font-medium pt-1">
                                                            CNIC:{" "}
                                                            {String((data.section1.team_lead as any).cnic || "")
                                                                .replace(/\D/g, "")
                                                                .length === 13
                                                                ? String((data.section1.team_lead as any).cnic || "").replace(/\D/g, "")
                                                                : "—"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setIsEditingLead(true)}
                                                        className="inline-flex items-center gap-2 h-9 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                                                    >
                                                        Edit Academic
                                                    </button>
                                                    {!participantId && (
                                                        <button
                                                            onClick={async () => {
                                                                setIsLoadingMetrics(true);
                                                                await fetchInitialData();
                                                                setIsLoadingMetrics(false);
                                                            }}
                                                            disabled={isLoadingMetrics}
                                                            className="inline-flex items-center gap-2 h-9 px-4 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 hover:shadow-md transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                                                        >
                                                            {isLoadingMetrics ? "Syncing..." : "Sync record"}
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
                                                        name: p.fullName
                                                    }
                                                });
                                                toast.success('Identity updated successfully!');
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* 2. Team Members Accordion */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                                            <Users className="w-5 h-5 text-report-primary" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-800">Team Members</h4>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </div>                            <div className="px-6 pb-6 pt-2">
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

                                            const hasVerified = newMembers.some((m: any) => m.verified && m.id);
                                            if (hasVerified) {
                                                try {
                                                    const projectId = data.project_id || projectIdFromUrl || '';
                                                    if (projectId) {
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
                    )}                    {internalStep === 2 && (() => {
                        return (
                            <div className="space-y-8">

                                <div className="mb-4 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 space-y-2">
                                        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Step 2: Attendance Logging</h3>
                                        <p className="text-[13px] text-slate-500 leading-relaxed">Record and verify your engagement hours for HEC audit trails</p>
                                    </div>
                                    <div className="flex shrink-0 items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-5 py-3 lg:max-w-md shadow-sm">
                                        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                        <span className="text-[10px] font-black uppercase leading-snug tracking-[0.18em] text-amber-700">
                                            Gateway active: each student must meet the required hour goal for community engagement.
                                        </span>
                                    </div>
                                </div>

                                {/* Engagement Hours Summary Dashboard */}
                                <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                                    {/* Level 1: Overall Project Context */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            {
                                                label: "Project Goal",
                                                value: projectGoal,
                                                sub: "Required Institutional Hours",
                                                color: "bg-slate-50 border-slate-100 text-slate-900",
                                                icon: Shield
                                            },
                                            {
                                                label: "Collective Hours",
                                                value: collectiveProjectHours,
                                                sub: "Total Project Engagement",
                                                color: "bg-slate-50 border-slate-100 text-slate-600",
                                                icon: Users
                                            },
                                            {
                                                label: "Team Compliance",
                                                value: `${
                                                    projectGoal > 0
                                                        ? Math.round((collectiveProjectHours / projectGoal) * 100)
                                                        : 0
                                                }%`,
                                                sub: "Aggregated Progress",
                                                color: "bg-slate-50 border-slate-100 text-slate-600",
                                                icon: Activity
                                            }
                                        ].map((stat, i) => (
                                            <div key={i} className={clsx("p-6 rounded-xl border shadow-sm flex items-center gap-5 transition-all duration-200 hover:bg-white hover:shadow-md", stat.color)}>
                                                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                                    <stat.icon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">{stat.label}</span>
                                                    <div className="flex items-baseline gap-1.5 mt-1">
                                                        <span className="text-2xl font-black">{stat.value}</span>
                                                        {stat.label !== "Team Compliance" && <span className="text-[10px] font-bold opacity-50">HRS</span>}
                                                    </div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mt-1">{stat.sub}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Level 2: Student Specific Tracking */}
                                    {selectedParticipantId && (
                                        <div className="p-10 bg-report-primary-soft/30 rounded-xl border-2 border-report-primary-border/30 relative overflow-hidden group/userbase shadow-sm">
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover/userbase:opacity-[0.07] transition-opacity duration-300">
                                                <Award className="w-32 h-32 rotate-12" />
                                            </div>

                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-md shadow-report-primary-shadow">
                                                            <User className="w-5 h-5" />
                                                        </div>
                                                        <h4 className="text-lg font-black text-slate-900 tracking-tight">
                                                            Personal Tracking: 
                                                            <span className="text-report-primary ml-2">
                                                                {(() => {
                                                                    const lookupUsers = rawParticipants;
                                                                    return lookupUsers.find((u: any) => u.id === selectedParticipantId)?.name || "Selected Student";
                                                                })()}
                                                            </span>
                                                        </h4>
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] pl-15">Individual Contribution Metrics</p>
                                                </div>

                                                <div className="flex gap-8">
                                                    {(() => {
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
                                                        const participantStats = [
                                                            {
                                                                label: "Logged",
                                                                val: loggedRounded,
                                                                color: "text-report-primary",
                                                            },
                                                            {
                                                                label: "Remaining",
                                                                val: Math.max(
                                                                    0,
                                                                    Math.round(
                                                                        (requiredHoursPerStudent - loggedEff) *
                                                                            100,
                                                                    ) / 100,
                                                                ),
                                                                color: "text-amber-600",
                                                            },
                                                        ];
                                                        return participantStats.map((m, i) => (
                                                            <div key={i} className="text-center">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                    {m.label}
                                                                </p>
                                                                <div className="flex items-baseline justify-center gap-1">
                                                                    <span className={clsx("report-h3 !text-3xl font-black", m.color)}>
                                                                        {m.val}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-slate-300">HRS</span>
                                                                </div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid min-w-0 grid-cols-1 gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:items-start">
                                    <div className="min-w-0 space-y-8">
                                        <div className="p-1 bg-slate-100 rounded-xl flex gap-1">
                                            <button className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] bg-white text-report-primary rounded-xl shadow-sm transition-all duration-200 hover:shadow-md">New Entry</button>
                                            <button className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 transition-colors duration-200 hover:text-slate-600">Bulk Import</button>
                                        </div>

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

                                        {!isSubmittedReport && !isParticipationUnlocked && (
                                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                                {isAttendanceVerificationRequested ? (
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                                            Verification request sent
                                                        </p>
                                                        <p className="text-[13px] text-slate-500 leading-relaxed">
                                                            {ATTENDANCE_VERIFICATION_INFO.afterSent}
                                                            <span className="mt-2 block text-slate-600">
                                                                {ATTENDANCE_VERIFICATION_INFO.afterSentWho}
                                                            </span>
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <Button
                                                            type="button"
                                                            onClick={handleRequestAttendanceVerification}
                                                            disabled={isRequestingAttendanceVerification || !data.section1.attendance_logs.length}
                                                            className="w-full h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md disabled:opacity-60 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                                                        >
                                                            {isRequestingAttendanceVerification ? (
                                                                <span className="inline-flex items-center gap-2">
                                                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                                                    Sending for verification...
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-2">
                                                                    <Lock className="h-4 w-4 shrink-0" />
                                                                    Verify Attendance (One Time)
                                                                </span>
                                                            )}
                                                        </Button>
                                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
                                                            <p className="text-slate-700 font-medium">{ATTENDANCE_VERIFICATION_INFO.lockNote}</p>
                                                            <p className="mt-2 text-slate-600">{ATTENDANCE_VERIFICATION_INFO.routing}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 space-y-6">
                                        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                                            <div className="flex flex-col gap-4 border-b border-slate-50 bg-slate-50/30 p-6 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0 flex flex-col gap-2">
                                                    <h4 className="flex flex-wrap items-center gap-2 font-black text-lg text-slate-900">
                                                        <Clock className="h-5 w-5 shrink-0 text-report-primary" /> Logged Sessions
                                                    </h4>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 sm:pl-7">
                                                        {selectedParticipantId ? `Filtered by: ${rawParticipants.find(u => u.id === selectedParticipantId)?.name || 'Self'}` : 'Showing records for all verified team members'}
                                                    </p>
                                                </div>
                                                <span className="w-fit shrink-0 rounded-xl border border-slate-100 bg-white px-5 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-report-primary shadow-sm">
                                                    {data.section1.attendance_logs.filter((log: any) => {
                                                        if (!selectedParticipantId) return true;
                                                        return engagementParticipantIdsMatch(
                                                            log.participantId,
                                                            selectedParticipantId,
                                                        );
                                                    }).length}{" "}
                                                    Records
                                                </span>
                                            </div>
                                            <div className="min-w-0 overflow-x-auto">
                                                <AttendanceSummaryTable
                                                    embedded
                                                    entries={data.section1.attendance_logs.filter((log: any) => {
                                                        if (!selectedParticipantId) return true;
                                                        return engagementParticipantIdsMatch(
                                                            log.participantId,
                                                            selectedParticipantId,
                                                        );
                                                    })}
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
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}


                    {internalStep === 3 && (
                        <div className="max-w-2xl mx-auto space-y-10 py-10">

                            {/* HEADER */}
                            <div className="text-center space-y-4">

                                <div className="w-16 h-16 bg-report-primary text-white rounded-xl flex items-center justify-center mx-auto shadow-md shadow-report-primary-shadow">
                                    <Shield className="w-8 h-8" />
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    Final Verification & Submission
                                </h2>

                                <p className="text-[13px] text-slate-500 leading-relaxed">
                                    Please review all information carefully before submitting the final report.
                                </p>

                            </div>



                            <div className="space-y-6">

                                {/* WARNING CARD */}
                                <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 shadow-sm space-y-3">

                                    <div className="flex items-center gap-4 text-amber-800">

                                        <AlertCircle className="w-5 h-5 shrink-0" />

                                        <h4 className="text-base font-bold text-amber-800">
                                            Permanent Record Lock
                                        </h4>

                                    </div>

                                    <p className="text-[13px] text-amber-700 leading-relaxed">

                                        By submitting this report, all participation records will become
                                        <strong className="font-bold"> permanently locked </strong>
                                        and no further edits will be allowed. Any inaccuracies will be reflected
                                        in your official HEC verification record.

                                    </p>

                                </div>

                                {/* HOURS COMPLIANCE WARNING */}
                                {!isMinimumHoursMet && (
                                    <div className="p-6 bg-red-50 rounded-xl border border-red-100 shadow-sm flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-100/50 flex items-center justify-center shrink-0">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-bold text-red-900">Minimum Hours Not Met</h4>
                                            <p className="text-[13px] text-red-700 leading-relaxed">
                                                To finalize this report and generate compliance results, every student must reach the minimum goal of 
                                                <strong className="mx-1 font-bold">{requiredHoursPerStudent} hours</strong>. 
                                                Please return to Step 2 to add the remaining sessions.
                                            </p>
                                        </div>
                                    </div>
                                )}



                                {/* CHECKLIST CARD */}
                                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">

                                    <div className="space-y-2">

                                        {[
                                            'I verify that all session entries are authentic.',
                                            'I understand that no further edits are possible after submission.',
                                            'I consent to institutional report sharing.'
                                        ].map((check, i) => (

                                            <label
                                                key={i}
                                                className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                                            >

                                                <input
                                                    type="checkbox"
                                                    checked={reviewChecked[i]}
                                                    onChange={() => {
                                                        const newChecked = [...reviewChecked];
                                                        newChecked[i] = !newChecked[i];

                                                        updateSection('section1', {
                                                            review_checked: newChecked,
                                                            ...(i === 2 ? { privacy_consent: newChecked[i] } : {})
                                                        });
                                                    }}
                                                    className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 text-report-primary focus:ring-2 focus:ring-report-primary focus:ring-offset-2 cursor-pointer transition-colors duration-200"
                                                />

                                                <span className="text-[13px] text-slate-600 leading-relaxed">
                                                    {check}
                                                </span>

                                            </label>

                                        ))}

                                    </div>

                                </div>

                            </div>

                        </div>

                    )}

                    {/* Metrics Dashboard (now step 4) */}
                    {internalStep === 4 && (
                        <div className="space-y-10 animate-in fade-in duration-500">

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
                                        isTeam={participation_type === 'team'}
                                        hideIntensityHero
                                        report={data}
                                    />

                                    {projectIdFromUrl ? (
                                        <Section1AnalyticsPanel
                                            apiPath={`/api/v1/student/projects/${encodeURIComponent(projectIdFromUrl)}/section1-analytics`}
                                            title="Participation & attendance"
                                            description="Read-only analytics from CIEL (your engagement metrics above are unchanged)."
                                            className="mt-8"
                                        />
                                    ) : null}


                                </div>

                            ) : (

                                <div className="py-28 text-center space-y-8 bg-white rounded-xl border border-slate-200 shadow-sm">

                                    {/* Loader */}
                                    <div className="relative flex justify-center">

                                        <div className="absolute w-16 h-16 bg-indigo-50 rounded-full blur-lg opacity-50"></div>

                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin relative z-10" />

                                    </div>


                                    {/* Text */}
                                    <div className="space-y-3">

                                        <p className="text-lg font-bold text-slate-800">
                                            Generating Intensity Analytics
                                        </p>

                                        <p className="text-[13px] text-slate-500 max-w-[320px] mx-auto leading-relaxed">
                                            Calculating engagement intensity scores and verifying HEC compliance status for your submission record.
                                        </p>

                                    </div>


                                    {/* Return Button */}
                                    {!isSubmitted && (

                                        <Button
                                            variant="outline"
                                            onClick={() => setInternalStep(3)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 text-indigo-600 font-semibold px-6 h-11 hover:bg-indigo-50 hover:shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
                                        >

                                            Return to Review & Submit

                                        </Button>

                                    )}

                                </div>

                            )}

                        </div>

                    )}
                </div>
            </main>

            {/* Sticky Bottom Footer */}
            <div className="mt-auto border-t border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)]">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={internalStep === 1}
                        className="order-2 h-11 rounded-xl border-slate-200 px-6 font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-sm sm:order-1 disabled:opacity-40 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4 shrink-0" /> Back
                    </Button>

                    <div className="order-1 flex flex-col gap-3 sm:order-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                        {!isTeamMemberAttendanceOnly ? (
                            <Button
                                variant="outline"
                                onClick={() => saveReport(false)}
                                className="inline-flex items-center justify-center gap-2 h-11 rounded-xl border-slate-200 bg-slate-50/80 px-6 font-semibold text-slate-800 hover:bg-slate-100 hover:shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                            >
                                <Save className="h-4 w-4 text-slate-500 shrink-0" /> Save Draft
                            </Button>
                        ) : null}

                        {internalStep < 4 ? (
                            <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
                                {internalStep === 3 && (
                                    <Button
                                        onClick={handleFinalSubmit}
                                        disabled={!reviewChecked.every(Boolean) || isLoadingMetrics || !isMinimumHoursMet}
                                        className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-report-primary px-6 font-semibold text-white shadow-md shadow-indigo-500/25 hover:bg-[#0049A3] hover:shadow-lg transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-report-primary focus-visible:ring-offset-2"
                                    >
                                        {isLoadingMetrics ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
                                        Finalize & Generate Record <Lock className="h-4 w-4 shrink-0" />
                                    </Button>
                                )}
                                <Button
                                    onClick={handleNext}
                                    disabled={
                                        (internalStep === 1 && !isVerified) ||
                                        (internalStep === 3 && !isMinimumHoursMet) ||
                                        (isTeamMemberAttendanceOnly && internalStep >= 2)
                                    }
                                    className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-report-primary px-6 font-semibold text-white shadow-md shadow-indigo-500/25 hover:bg-[#0049A3] hover:shadow-lg transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-report-primary focus-visible:ring-offset-2"
                                >
                                    {internalStep === 3 ? "Skip Submission & Continue" : "Continue"} <ChevronRight className="h-4 w-4 shrink-0" />
                                </Button>
                            </div>
                        ) : (
                            !isTeamMemberAttendanceOnly ? (
                            <Button
                                onClick={handleNext}
                                className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-900 px-6 font-semibold text-white shadow-md hover:bg-black hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                            >
                                Save & Continue to Next Section <ChevronRight className="h-4 w-4 shrink-0" />
                            </Button>
                            ) : null
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
