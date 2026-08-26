"use client"
import React, { Suspense } from 'react';
import { useReportForm, ReportProvider } from './context/ReportContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from './components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./components/ui/dialog";
import { canStudentAccessReportForProjectPayload } from '@/utils/studentJoinApplication';
import { mergeReportSection1TeamScope, mergeReportSection1TeamScopeForCertificate } from '@/utils/reportTeamScope';
import { getIncompleteSectionsSummary, validateSection4, validateSection5 } from './utils/validation';
import {
    dataSectionsToSummarize,
    FLASH_CARD_STEP,
    formatIncompleteSectionHeading,
    isFlashCardStep,
    isMergedActivitiesStep,
    REPORT_UI_SECTION_TOTAL,
    tabIsComplete,
    tabMatchesStep,
    uiSectionsCompleteCount,
    uiStepLabel,
} from './utils/reportWizardNav';
import { pickImpactVerifyUrlFromPayload } from '@/utils/reportVerificationUrl';
import { prepareReportEvidenceForSave } from './utils/evidenceUpload';
import { normalizeEngagementAttendanceLog } from '@/utils/engagementAttendanceMap';
import { readPersistedCiiSnapshot } from '@/utils/reportCiiSnapshot';
import { pickReportStatusFromCheckRow } from '@/utils/studentBrowseReportCta';
import { isReportReturnedForRevision } from '@/utils/reportRevisionState';

// Import New Sections
import Section1Participation from './components/Section1Participation';
import Section2ProjectContext from './components/Section2ProjectContext'; // Renamed
import Section3SDGMapping from './components/Section3SDGMapping';
import Section4Activities from './components/Section4Activities';
import Section5Outcomes from './components/Section5Outcomes';
import Section6Resources from './components/Section6Resources';
import Section7Partnerships from './components/Section7Partnerships';
import Section8Evidence from './components/Section8Evidence';
import Section9Reflection from './components/Section9Reflection'; // New
import Section10Sustainability from './components/Section10Sustainability'; // Renamed
import Section11Summary from './components/Section11Summary'; // New
import PreReportGuide from './components/PreReportGuide';
import { ReportSectionGuideFloat } from '@/components/report/ReportSectionGuideFloat';
import { REPORT_TAB_ITEMS, ReportSectionBridge, ReportLiveBanner, ReportFlashCard } from './ReportFormChrome';
import "./community-engagement-report.css";

type ProjectDetails = { title?: string } & Record<string, unknown>;

type SaveReportResult = { ok: true } | { ok: false; message: string };

function formatSaveCatchError(error: unknown, mode: "save" | "submit" = "save"): string {
    const fallback =
        mode === "submit"
            ? "Could not submit report. Please try again."
            : "Could not save progress. Please try again.";
    const timeoutMsg =
        mode === "submit"
            ? "Submit timed out. Check your connection and try again."
            : "Save timed out. Check your connection and try again.";
    if (error instanceof Error) {
        if (error.name === "AbortError") {
            return timeoutMsg;
        }
        const m = error.message || "";
        if (m.includes("Evidence upload failed")) {
            const hint = mode === "submit" ? "then try submitting again." : "then save again.";
            return `${m} Fix or remove the file, ${hint}`;
        }
        if (m.trim()) return m;
    }
    return fallback;
}

/** NestJS / common API envelopes: `message` string or validation array. */
function extractJsonApiMessage(j: Record<string, unknown>): string {
    const m = j.message;
    if (typeof m === "string" && m.trim()) return m.trim();
    if (Array.isArray(m)) {
        const parts = m
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim())
            .filter(Boolean);
        if (parts.length) return parts.join(" ");
    }
    for (const k of ["error", "detail"] as const) {
        const v = j[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

/** Parses JSON/text error bodies from backend `fetch` responses. */
async function httpFailureUserMessage(res: Response, actionLabel: string): Promise<string> {
    const prefix = `${actionLabel} (HTTP ${res.status}).`;
    if (res.status === 413) {
        return `${prefix} Payload too large. Remove or re-upload heavy attachments / evidence files, save again — or ask an admin to increase the API body-size limit on the server.`;
    }
    try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
            const j = (await res.json()) as Record<string, unknown>;
            const serverMsg = extractJsonApiMessage(j);
            if (serverMsg && (res.status === 403 || res.status === 401)) {
                return serverMsg;
            }
            if (serverMsg) {
                return `${prefix} ${serverMsg}`;
            }
            return prefix;
        }
        const text = (await res.text()).trim();
        return text ? `${prefix} ${text.slice(0, 240)}` : prefix;
    } catch {
        return prefix;
    }
}

/** Same lifecycle tokens as browse / My Projects (`pickReportStatusFromCheckRow`) — never infer from payload size. */
function shouldSkipPreReportGuide(reportForState: Record<string, unknown>): boolean {
    const w = pickReportStatusFromCheckRow(reportForState);
    return w === "continue" || w === "rejected" || w === "revision" || w === "draft";
}

function ReportFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('project') || searchParams.get('projectId');
    const memberAttendanceMode = searchParams.get('mode') === 'member-attendance';
    const {
        activeStep,
        nextStep,
        prevStep,
        validateCurrentSection,
        validationErrors,
        data,
        setFullData,
        setStep,
        setProjectId,
        updateSection,
        setReadOnly,
        isReadOnly,
        isEligibleForSubmission,
        areAllSectionsComplete,
        canSubmitReport,
        canFinalizeSubmit,
        isTeamLeadForSubmit,
        isTeamMemberAttendanceOnly,
        setMyParticipationIsTeamLead,
        incompleteSectionsSummary
    } = useReportForm();

    const [isSaving, setIsSaving] = React.useState(false);
    const [aiStatus, setAiStatus] = React.useState<string | null>(null);
    const [projectDetails, setProjectDetails] = React.useState<ProjectDetails | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showGuide, setShowGuide] = React.useState(true);
    const [helpSignal, setHelpSignal] = React.useState(0);

    React.useEffect(() => {
        if (memberAttendanceMode) {
            setMyParticipationIsTeamLead(false);
        }
    }, [memberAttendanceMode, setMyParticipationIsTeamLead]);

    const resolveEngagementSeatForProject = React.useCallback(async () => {
        const myRes = await authenticatedFetch(`/api/v1/engagement/my`);
        if (!myRes?.ok) return null;
        const myJson = await myRes.json().catch(() => ({}));
        const rows = Array.isArray(myJson.data) ? myJson.data : [];
        return (
            rows.find(
                (p: { projectId?: string; project_id?: string }) =>
                    p && (p.projectId === projectId || p.project_id === projectId),
            ) ?? null
        );
    }, [projectId]);

    // Initial Load
    React.useEffect(() => {
        if (!projectId) {
            router.push('/dashboard/student');
            return;
        }
        setProjectId(projectId);
        fetchProjectAndReport();
    }, [projectId]);

    const fetchProjectAndReport = async () => {
        if (!projectId) return;
        try {
            setIsLoading(true);
            const [projectRes, reportRes] = await Promise.all([
                authenticatedFetch(`/api/v1/student/projects/${projectId}`),
                authenticatedFetch(`/api/v1/student/reports/${projectId}`)
            ]);

            let projectPayload: Record<string, unknown> | null = null;

            if (projectRes && projectRes.ok) {
                const projectData = await projectRes.json();
                const pInfo = projectData.data || projectData;
                projectPayload = pInfo as Record<string, unknown>;
                setProjectDetails(pInfo);

                const isStudentOwner = Boolean(
                    pInfo.is_student_owner === true ||
                        pInfo.isStudentOwner === true,
                );
                // 🚨 SECURITY CHECK: project status + join application (when API sends application_status)
                if (!canStudentAccessReportForProjectPayload(pInfo as Record<string, unknown>, { isStudentOwner })) {
                    toast.error('Approval is required to start/edit a report for this project.');
                    router.push('/dashboard/student');
                    return;
                }
            }

            const myPart = await resolveEngagementSeatForProject();
            if (myPart) {
                const isLeadFlag =
                    myPart.isTeamLead === true ||
                    myPart.is_team_lead === true ||
                    String(myPart.is_team_lead ?? "").toLowerCase() === "true";
                const isTeamMemberSeat =
                    (myPart.participationMode === "team" || myPart.participation_mode === "team") &&
                    !isLeadFlag;
                if (isTeamMemberSeat && !memberAttendanceMode) {
                    router.replace(
                        `/dashboard/student/projects/${encodeURIComponent(projectId)}/participation`,
                    );
                    return;
                }
                setMyParticipationIsTeamLead(isLeadFlag);
            } else if (memberAttendanceMode) {
                setMyParticipationIsTeamLead(false);
            } else {
                setMyParticipationIsTeamLead(null);
            }

            const pickOpportunityTitle = (p: Record<string, unknown> | null): string => {
                if (!p) return "";
                const keys = ["title", "name", "opportunity_title", "project_title", "opportunity_name"] as const;
                for (const k of keys) {
                    const v = p[k];
                    if (typeof v === "string" && v.trim()) return v.trim();
                }
                return "";
            };

            if (reportRes && reportRes.ok) {
                const reportData = await reportRes.json();
                const actualReportData = reportData.data || reportData; // Handle potential wrapper
                if (actualReportData && Object.keys(actualReportData).length > 0) {
                    const existingTitle = String(
                        (actualReportData as { project_title?: string }).project_title || "",
                    ).trim();
                    const titleFromProject = pickOpportunityTitle(projectPayload);
                    const impactVerifyNormalized = pickImpactVerifyUrlFromPayload(actualReportData);
                    const mergedReport = {
                        ...actualReportData,
                        project_id:
                            String(
                                (actualReportData as { project_id?: string }).project_id ||
                                    (actualReportData as { projectId?: string }).projectId ||
                                    (actualReportData as { opportunityId?: string }).opportunityId ||
                                    projectId ||
                                    "",
                            ).trim() || projectId,
                        ...(!existingTitle && titleFromProject ? { project_title: titleFromProject } : {}),
                        ...(impactVerifyNormalized ? { impact_verify_url: impactVerifyNormalized } : {}),
                    };

                    let reportForState: Record<string, unknown> = mergedReport as Record<string, unknown>;
                    let reportIsSubmitted = false;
                    try {
                        const myRes = await authenticatedFetch(`/api/v1/engagement/my`);
                        if (myRes && myRes.ok) {
                            const myJson = await myRes.json();
                            const rows = Array.isArray(myJson.data) ? myJson.data : [];
                            const myPart = rows.find(
                                (p: { projectId?: string; project_id?: string }) =>
                                    p && (p.projectId === projectId || p.project_id === projectId),
                            );
                            if (myPart) {
                                const isLeadFlag =
                                    myPart.isTeamLead === true ||
                                    myPart.is_team_lead === true ||
                                    String(myPart.is_team_lead ?? "").toLowerCase() === "true";
                                const isTeamMemberSeat =
                                    (myPart.participationMode === "team" || myPart.participation_mode === "team") &&
                                    !isLeadFlag;
                                if (isTeamMemberSeat && !memberAttendanceMode) {
                                    router.replace(
                                        `/dashboard/student/projects/${encodeURIComponent(projectId)}/participation`,
                                    );
                                    return;
                                }
                                setMyParticipationIsTeamLead(isLeadFlag);
                                const teamRes = await authenticatedFetch(
                                    `/api/v1/engagement/project/${encodeURIComponent(projectId)}/team`,
                                );
                                if (teamRes && teamRes.ok) {
                                    const teamJson = await teamRes.json();
                                    const teamRows =
                                        teamJson.success && Array.isArray(teamJson.data) ? teamJson.data : [];
                                    const stPreview = String(
                                        (reportForState.status as string | undefined) || "",
                                    ).toLowerCase();
                                    const adminStPreview = String(
                                        (reportForState.admin_status as string | undefined) ||
                                            (reportForState.admin_approval_status as string | undefined) ||
                                            "",
                                    ).toLowerCase();
                                    const needsRevisionPreview =
                                        adminStPreview === "rejected" ||
                                        String((reportForState.partner_status as string | undefined) || "").toLowerCase() ===
                                            "rejected" ||
                                        stPreview === "rejected" ||
                                        stPreview === "revision" ||
                                        reportForState.is_editable === true;
                                    reportIsSubmitted =
                                        !needsRevisionPreview &&
                                        ([
                                            "submitted",
                                            "approved",
                                            "under_review",
                                            "payment_pending",
                                            "pending_payment",
                                            "payment_under_review",
                                            "paid",
                                            "verified",
                                            "finalized",
                                            "partner_verified",
                                        ].includes(stPreview) ||
                                            ["verified", "approved"].includes(adminStPreview));
                                    reportForState = reportIsSubmitted
                                        ? mergeReportSection1TeamScopeForCertificate(
                                              reportForState,
                                              myPart,
                                              teamRows,
                                          )
                                        : mergeReportSection1TeamScope(reportForState, myPart, teamRows);
                                }
                            } else {
                                setMyParticipationIsTeamLead(null);
                            }
                        }
                    } catch (scopeErr) {
                        console.warn("[Report] Section 1 team scope normalization skipped:", scopeErr);
                    }

                    try {
                        const attendanceRes = await authenticatedFetch(
                            `/api/v1/engagement/project/${encodeURIComponent(projectId)}/attendance-logs`,
                        );
                        if (attendanceRes && attendanceRes.ok) {
                            const attendanceJson = await attendanceRes.json();
                            const rawLogs = Array.isArray(attendanceJson.data) ? attendanceJson.data : [];
                            if (rawLogs.length > 0) {
                                const section1 = ((reportForState.section1 as Record<string, unknown> | undefined) || {});
                                reportForState = {
                                    ...reportForState,
                                    section1: {
                                        ...section1,
                                        attendance_logs: rawLogs.map((log: Record<string, unknown>) =>
                                            normalizeEngagementAttendanceLog(log),
                                        ),
                                    },
                                };
                            }
                        }
                    } catch (attendanceErr) {
                        console.warn("[Report] Attendance log refresh skipped:", attendanceErr);
                    }

                    const reportAccess = reportForState.report_access as
                        | { is_team_lead?: boolean }
                        | undefined;
                    if (reportAccess && typeof reportAccess.is_team_lead === "boolean") {
                        setMyParticipationIsTeamLead(reportAccess.is_team_lead);
                    }

                    setFullData(reportForState as typeof mergedReport);
                    const st = String((reportForState.status as string | undefined) || "").toLowerCase();
                    const adminSt = String(
                        (reportForState.admin_status as string | undefined) ||
                            (reportForState.admin_approval_status as string | undefined) ||
                            "",
                    ).toLowerCase();
                    const partnerSt = String((reportForState.partner_status as string | undefined) || "").toLowerCase();
                    const needsRevision =
                        adminSt === "rejected" ||
                        partnerSt === "rejected" ||
                        st === "rejected" ||
                        st === "revision" ||
                        reportForState.is_editable === true;
                    const isSubmitted =
                        reportIsSubmitted ||
                        (!needsRevision &&
                            ([
                                "submitted",
                                "approved",
                                "under_review",
                                "payment_pending",
                                "pending_payment",
                                "payment_under_review",
                                "paid",
                                "verified",
                                "finalized",
                                "partner_verified",
                            ].includes(st) ||
                                ["verified", "approved"].includes(adminSt)));
                    if (needsRevision) {
                        setShowGuide(false);
                        setReadOnly(false);
                    } else if (isSubmitted) {
                        // Report already submitted — skip guide, go straight to summary
                        setShowGuide(false);
                        setStep(FLASH_CARD_STEP);
                        setReadOnly(true);
                    } else if (shouldSkipPreReportGuide(reportForState)) {
                        setShowGuide(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load project details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // --- FLEXIBLE NAVIGATION (Progress Mode) ---
        // If not at the final step, allow navigation even if validation fails
        if (isTeamMemberAttendanceOnly && activeStep !== 1) {
            setStep(1);
            toast.info("Only your team lead advances report sections. Update your attendance in Section 1.");
            return;
        }

        const isValid = validateCurrentSection();
        
        if (activeStep < FLASH_CARD_STEP) {
            if (isTeamMemberAttendanceOnly) {
                toast.info("Only your team lead advances report sections. Update your attendance in Section 1.");
                return;
            }
            setIsSaving(true);
            let updatedData = { ...data };

            // Auto-generate AI Summary for specific sections (non-blocking for navigation if save succeeds)
            const dataNums = dataSectionsToSummarize(activeStep);
            let aiSummaryIssue: string | null = null;
            const stepsForAi = dataNums.filter((n) => {
                if (n === 4) return validateSection4(data.section4).isValid;
                if (n === 5) return validateSection5(data.section5).isValid;
                return isValid;
            });
            if (stepsForAi.length) {
                setAiStatus('Analyzing Data & Writing Summary...');
                try {
                    const { generateAISummary } = await import('./utils/aiSummarizer');
                    for (const stepNum of stepsForAi) {
                        const sectionKey = `section${stepNum}` as Exclude<keyof typeof data, 'project_id'>;
                        try {
                            const summaryRes = await generateAISummary(sectionKey, data[sectionKey]);
                            if (summaryRes.summary) {
                                updatedData = {
                                    ...updatedData,
                                    [sectionKey]: {
                                        ...(updatedData[sectionKey] as Record<string, unknown>),
                                        summary_text: summaryRes.summary
                                    }
                                };
                                updateSection(sectionKey, { summary_text: summaryRes.summary });
                            } else if (summaryRes.error) {
                                aiSummaryIssue = summaryRes.error;
                            }
                        } catch (error) {
                            console.error('Failed to auto-generate summary', error);
                            aiSummaryIssue =
                                error instanceof Error ? error.message : 'Auto-summary request failed.';
                        }
                    }
                } catch (error) {
                    console.error('Failed to auto-generate summary', error);
                    aiSummaryIssue =
                        error instanceof Error ? error.message : 'Auto-summary request failed.';
                }
            }

            if (!isTeamMemberAttendanceOnly) {
                setAiStatus('Saving Progress...');
                const saveResult = await handleSave(true, updatedData);
                if (!saveResult.ok) {
                    toast.error(saveResult.message);
                    return;
                }
            }

            if (aiSummaryIssue) {
                toast.warning(
                    `Step saved, but the auto-summary did not complete: ${aiSummaryIssue} You can edit the summary field on this step or try Next again.`,
                );
            }
            
            if (!isValid) {
                toast.info("Draft saved. Some fields need attention before submission.");
            }
            
            nextStep();
            window.scrollTo(0, 0);
        } else {
            if (!canFinalizeSubmit) {
                if (canSubmitReport && !isTeamLeadForSubmit) {
                    toast.error('Only your team lead can submit this team report.');
                } else if (!isEligibleForSubmission) {
                    toast.error(
                        `Minimum verified hours not met (${data.section1.metrics?.total_verified_hours || 0}/${data.required_hours || 16}). Complete Section 1 first.`,
                    );
                } else {
                    toast.error('Complete all required fields in every section before submitting.');
                }
                setBlockedSubmitOpen(true);
                return;
            }
            handleSubmit();
        }
    };

    const handleSave = async (silent = false, customData = data): Promise<SaveReportResult> => {
        if (!isSaving) setIsSaving(true);
        try {
            if (isReadOnly) {
                const message = 'This report is locked and cannot be edited.';
                if (!silent) toast.error(message);
                return { ok: false, message };
            }
            if (isTeamMemberAttendanceOnly) {
                if (!silent) {
                    toast.info('Only your team lead can save report sections. Update your attendance in Section 1.');
                }
                return { ok: true };
            }

            setAiStatus('Uploading Evidence...');
            const projectIdForSave = customData.project_id || projectId || '';
            const dataForSave = projectIdForSave
                ? await prepareReportEvidenceForSave(customData, projectIdForSave)
                : customData;

            const res = await authenticatedFetch(`/api/v1/student/reports/draft`, {
                method: 'POST',
                body: JSON.stringify({
                    ...dataForSave,
                    status: 'continue'
                })
            }, {
                timeoutMs: 120000
            });

            if (!res) {
                const message =
                    'Save failed: no response from server (session may have expired). Sign in again and retry.';
                if (!silent) toast.error(message);
                return { ok: false, message };
            }

            if (!res.ok) {
                const message = await httpFailureUserMessage(res, "Could not save draft");
                if (!silent) toast.error(message);
                return { ok: false, message };
            }

            if (projectIdForSave) setFullData(dataForSave);
            if (!silent) toast.success('Progress saved');
            return { ok: true };
        } catch (error) {
            console.error(error);
            const message = formatSaveCatchError(error, "save");
            if (!silent) toast.error(message);
            return { ok: false, message };
        } finally {
            setIsSaving(false);
            setAiStatus(null);
        }
    };

    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
    const [blockedSubmitOpen, setBlockedSubmitOpen] = React.useState(false);

    const handleSubmit = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (isReadOnly) return;
        if (isTeamMemberAttendanceOnly) {
            toast.error('Only your team lead can submit this team report.');
            return;
        }

        setIsConfirmOpen(true);
    };

    const confirmSubmit = async () => {
        const hoursOk =
            (data.section1.metrics?.total_verified_hours || 0) >= (data.required_hours || 16);
        const stillIncomplete = getIncompleteSectionsSummary(data);
        if (!hoursOk || stillIncomplete.length > 0) {
            toast.error('Report is not ready to submit. Fix the items below and try again.');
            setIsConfirmOpen(false);
            setBlockedSubmitOpen(true);
            return;
        }

        setIsConfirmOpen(false);
        setIsSaving(true);
        try {
            let submitData = data;

            try {
                setAiStatus('Generating ChatGPT CII audit...');
                const [{ generateAISummary }, { calculateCII }] = await Promise.all([
                    import('./utils/aiSummarizer'),
                    import('./utils/calculateCII'),
                ]);
                const ciiResult = calculateCII(data);
                submitData = {
                    ...data,
                    cii_index: ciiResult,
                };
                const section11Res = await generateAISummary('section11', {
                    ...data,
                    cii_index: ciiResult,
                });

                if (section11Res.summary) {
                    submitData = {
                        ...submitData,
                        section11: {
                            ...data.section11,
                            summary_text: section11Res.summary,
                            is_ai_generated: true,
                            audit_meta: section11Res.auditMeta ?? null,
                        },
                    };
                    submitData = {
                        ...submitData,
                        cii_index: readPersistedCiiSnapshot(submitData) ?? ciiResult,
                    };
                    updateSection('section11', submitData.section11);
                }
            } catch (aiError) {
                console.error('Failed to generate ChatGPT CII audit', aiError);
                toast.info('Report will submit with the current CII summary.');
            }

            setAiStatus('Uploading Evidence...');
            submitData = await prepareReportEvidenceForSave(submitData, projectId || submitData.project_id);
            setFullData(submitData);

            const res = await authenticatedFetch(`/api/v1/student/reports/${projectId}/submit`, {
                method: 'POST',
                body: JSON.stringify(submitData)
            }, {
                timeoutMs: 45000
            });

            if (!res) {
                toast.error(
                    'Submit failed: no response from server (session may have expired). Sign in again and retry.',
                );
                return;
            }
            if (!res.ok) {
                const message = await httpFailureUserMessage(res, "Could not submit report");
                toast.error(message);
                return;
            }

            toast.success('Report submitted! Redirecting to payment...');
            setTimeout(() => {
                window.location.href = `/dashboard/student/payment?projectId=${projectId}`;
            }, 2000);
        } catch (error) {
            console.error(error);
            toast.error(formatSaveCatchError(error, "submit"));
        } finally {
            setIsSaving(false);
            setAiStatus(null);
        }
    };

    const reportStatusLower = String(data?.status || "").toLowerCase();
    const adminStatusLower = String(data?.admin_status || "").toLowerCase();
    const needsRevision = React.useMemo(
        () =>
            isReportReturnedForRevision({
                status: data?.status,
                report_status: data?.report_status,
                admin_status: data?.admin_status,
                admin_approval_status: data?.admin_approval_status,
                partner_status: data?.partner_status,
            }),
        [data?.status, data?.report_status, data?.admin_status, data?.admin_approval_status, data?.partner_status],
    );
    const postSubmitAwaitingReview = React.useMemo(() => {
        if (needsRevision) return false;
        return (
            [
                "submitted",
                "approved",
                "under_review",
                "pending_payment",
                "payment_under_review",
                "paid",
                "verified",
                "finalized",
                "partner_verified",
            ].includes(reportStatusLower) ||
            ["verified", "approved"].includes(adminStatusLower)
        );
    }, [needsRevision, reportStatusLower, adminStatusLower]);
    /** Same gate as Section 11 “Report Approved & Impact Verified” — CII index must stay on summary only. */
    const ciiVerifiedSummaryLock = React.useMemo(
        () =>
            reportStatusLower === "verified" ||
            reportStatusLower === "approved" ||
            adminStatusLower === "verified" ||
            adminStatusLower === "approved",
        [reportStatusLower, adminStatusLower],
    );
    const summaryOnlyWorkspace = React.useMemo(
        () =>
            canSubmitReport &&
            !isReadOnly &&
            !needsRevision &&
            reportStatusLower !== "rejected" &&
            reportStatusLower !== "revision",
        [canSubmitReport, isReadOnly, needsRevision, reportStatusLower],
    );
    const stepperLockedToSummaryOnly = summaryOnlyWorkspace || ciiVerifiedSummaryLock;
    const stepperLockedToSection1Only = isTeamMemberAttendanceOnly;

    React.useEffect(() => {
        if (isLoading || showGuide) return;
        if (!summaryOnlyWorkspace && !ciiVerifiedSummaryLock) return;
        if (activeStep !== FLASH_CARD_STEP) setStep(FLASH_CARD_STEP);
    }, [isLoading, showGuide, summaryOnlyWorkspace, ciiVerifiedSummaryLock, activeStep, setStep]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const incompleteStepNums = new Set(incompleteSectionsSummary.map((block) => block.section));
    const sectionsCompleteCount = uiSectionsCompleteCount(incompleteStepNums);
    const progressPct = Math.round((sectionsCompleteCount / REPORT_UI_SECTION_TOTAL) * 100);
    const projectSubtitle = [
        projectDetails?.title,
        (projectDetails as { organization_name?: string } | null)?.organization_name,
        (projectDetails as { partner_name?: string } | null)?.partner_name,
    ]
        .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
        .join(" · ");

    if (showGuide) {
        return (
            <div className="max-w-none mx-auto px-4 md:px-8 py-5">
                <PreReportGuide
                    projectTitle={projectDetails?.title}
                    onStart={() => {
                        setStep(1);
                        setShowGuide(false);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="cer">
            <div className="cer-wrap">
                <div className="cer-apph">
                    <div>
                        <button type="button" className="cer-ghost" onClick={() => router.back()} style={{ marginBottom: 8 }}>
                            ← Back
                        </button>
                        <div className="cer-logo">
                            CIEL <span>PK</span> · Community Engagement Report
                        </div>
                        <div className="cer-proj">{projectSubtitle || "Loading project…"}</div>
                    </div>
                    {!isReadOnly && !isTeamMemberAttendanceOnly ? (
                        <button
                            type="button"
                            className="cer-ghost"
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving…" : "Save draft"}
                        </button>
                    ) : null}
                    <div className="cer-prog">
                        <span className="cer-pt">{sectionsCompleteCount}/{REPORT_UI_SECTION_TOTAL}</span>
                        <span className="cer-pb">
                            <i style={{ width: `${progressPct}%` }} />
                        </span>
                    </div>
                </div>

                {isTeamMemberAttendanceOnly ? (
                    <div className="cer-note">
                        Team member — attendance only. Your team lead files this report. You may update Section 1 only.
                    </div>
                ) : null}

                <div className="cer-tabs">
                    {REPORT_TAB_ITEMS.map((tab) => {
                        const isActive = tabMatchesStep(tab.step, activeStep);
                        const isCompleted = activeStep > tab.step;
                        const isDone = tabIsComplete(tab.step, incompleteStepNums);
                        const lockedSummary = stepperLockedToSummaryOnly && tab.step !== FLASH_CARD_STEP;
                        const lockedSection1 = stepperLockedToSection1Only && tab.step !== 1;
                        return (
                            <button
                                key={tab.step}
                                type="button"
                                disabled={lockedSummary || lockedSection1}
                                className={[
                                    "cer-tb",
                                    isActive ? "on" : "",
                                    tab.flash ? "fc" : "",
                                    isDone && !tab.flash ? "done" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                onClick={() => {
                                    if (lockedSummary || lockedSection1) return;
                                    if (isCompleted || isReadOnly || activeStep < FLASH_CARD_STEP) {
                                        setStep(tab.step);
                                    } else if (!isActive && validateCurrentSection()) {
                                        setStep(tab.step);
                                    } else if (!isActive) {
                                        toast.info("Navigating to step. Please complete mandatory fields later.");
                                        setStep(tab.step);
                                    }
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <ReportSectionBridge
                    step={activeStep}
                    data={data}
                    projectData={projectDetails}
                    onOpenHelp={() => setHelpSignal((n) => n + 1)}
                />

                <div>
                    {activeStep === 1 && <Section1Participation projectData={projectDetails} />}
                    {activeStep === 2 && <Section2ProjectContext projectData={projectDetails} />}
                    {activeStep === 3 && <Section3SDGMapping projectData={projectDetails} />}
                    {isMergedActivitiesStep(activeStep) && (
                        <>
                            <div className="cer-partk">PART A · WHAT WE DID — ACTIVITY BY ACTIVITY</div>
                            <Section4Activities />
                            <div className="cer-partk">PART B · WHAT CHANGED BECAUSE OF IT</div>
                            <Section5Outcomes />
                        </>
                    )}
                    {activeStep === 5 && <Section6Resources projectData={projectDetails} />}
                    {activeStep === 6 && <Section7Partnerships projectData={projectDetails} />}
                    {activeStep === 7 && <Section8Evidence />}
                    {activeStep === 8 && <Section9Reflection />}
                    {activeStep === 9 && <Section10Sustainability />}
                    {isFlashCardStep(activeStep) && (
                        <>
                            <ReportFlashCard
                                data={data}
                                projectData={projectDetails}
                                sectionsComplete={sectionsCompleteCount}
                                missingLabels={incompleteSectionsSummary.map((block) =>
                                    formatIncompleteSectionHeading(block.section, block.label),
                                )}
                                canSend={(canFinalizeSubmit || needsRevision) && !isReadOnly && !isTeamMemberAttendanceOnly}
                                onSend={!isReadOnly && !isTeamMemberAttendanceOnly ? handleSubmit : undefined}
                                sending={isSaving}
                            />
                            <Section11Summary
                                onRequestFinalSubmit={
                                    summaryOnlyWorkspace || (needsRevision && !isReadOnly) ? handleSubmit : undefined
                                }
                                projectData={projectDetails}
                            />
                        </>
                    )}
                </div>
                {activeStep >= 1 && activeStep < FLASH_CARD_STEP ? (
                    <ReportLiveBanner step={activeStep} data={data} projectData={projectDetails} />
                ) : null}

            {!(summaryOnlyWorkspace || ciiVerifiedSummaryLock) && activeStep !== 1 && (
                <div className="cer-foot">
                    <div>
                        {!isReadOnly && (
                            <button
                                type="button"
                                className="cer-prev"
                                onClick={prevStep}
                                disabled={activeStep === 1}
                            >
                                Previous step
                            </button>
                        )}
                    </div>

                    {!isReadOnly && activeStep < FLASH_CARD_STEP && !isTeamMemberAttendanceOnly && (
                        <button
                            type="button"
                            className="cer-save"
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving…" : `Save section ${uiStepLabel(activeStep)}`}
                        </button>
                    )}

                    <div>
                        {!(isFlashCardStep(activeStep) && postSubmitAwaitingReview) && (
                            <button
                                type="button"
                                className="cer-next"
                                onClick={handleNext}
                                disabled={
                                    isSaving ||
                                    (isFlashCardStep(activeStep) && !canFinalizeSubmit && !needsRevision) ||
                                    (isTeamMemberAttendanceOnly && activeStep === 1)
                                }
                            >
                                {isSaving ? (
                                    "Working…"
                                ) : isFlashCardStep(activeStep) ? (
                                    needsRevision ? "Resubmit report" : "Submit report"
                                ) : (
                                    aiStatus || "Next step"
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}
            </div>

            {/* Submit Confirmation Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Report?</DialogTitle>
                        <DialogDescription>
                            {needsRevision
                                ? "Resubmit your revised report for admin review? You can edit again if more changes are requested."
                                : "Are you sure you want to submit this report? You will not be able to edit it after submission."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-[#0e7d74] hover:bg-[#0f5e57] text-white" onClick={confirmSubmit} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Yes, Submit Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={blockedSubmitOpen} onOpenChange={setBlockedSubmitOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Cannot submit yet</DialogTitle>
                        <DialogDescription className="sr-only">
                            The report cannot be submitted until minimum verified hours and all required steps are complete.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-left text-sm text-slate-600">
                        {!isEligibleForSubmission && (
                            <p>
                                Verified hours:{" "}
                                <span className="font-semibold text-slate-900">
                                    {data.section1.metrics?.total_verified_hours || 0} / {data.required_hours || 16}
                                </span>
                                . Complete and verify attendance in Section 1 until the minimum is met.
                            </p>
                        )}
                        {incompleteSectionsSummary.length > 0 && (
                            <div className="space-y-3">
                                <p className="font-medium text-slate-800">Steps that still need attention:</p>
                                <ul className="space-y-3 border border-slate-200 rounded-xl p-3 bg-slate-50/80">
                                    {incompleteSectionsSummary.map((block) => (
                                        <li key={block.section} className="text-sm">
                                            <span className="font-bold text-slate-900">
                                                {formatIncompleteSectionHeading(block.section, block.label)}
                                            </span>
                                            <ul className="mt-1.5 ml-3 list-disc text-slate-600 space-y-1">
                                                {block.errors.map((err, i) => (
                                                    <li key={`${err.field}-${i}`}>{err.message}</li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button className="w-full sm:w-auto" onClick={() => setBlockedSubmitOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReportSectionGuideFloat
                sectionStep={activeStep}
                enabled={!summaryOnlyWorkspace && !ciiVerifiedSummaryLock}
                openSignal={helpSignal}
            />
        </div>
    );
}

export default function ReportPage() {
    return (
        <ReportProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
                <ReportFormContent />
            </Suspense>
        </ReportProvider>
    );
}
