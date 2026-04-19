
"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../report/components/ui/button";
import { authenticatedFetch } from "@/utils/api";
import {
    canEditReturnedOpportunity,
    extractOpportunityReturnRemarkSections,
    extractOpportunityReviewFeedback,
    formatOpportunityDetailStatusBadge,
} from "@/utils/opportunityWorkflow";
import { readDashboardNavRoleFromStorage, type DashboardNavRole } from "@/utils/dashboardNavRole";
import { formatDisplayId } from "@/utils/displayIds";
import { Loader2, MapPin, Calendar, Clock, Globe, ArrowLeft, Building2, Share2, CheckCircle2, User, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ReportSummaryPopup from "../../report/components/ReportSummaryPopup";
import {
    readStudentInstitutionFromBrowserStorage,
    resolveStudentUniversityApplyEligibility,
} from "@/utils/studentOpportunityApplyEligibility";
import {
    canStudentShowStartReportCta,
    isJoinApplicationRejectedStatus,
    joinApplicationLocksApplyButton,
    joinApplicationPendingLabel,
    pickJoinApplicationId,
    pickJoinApplicationStage,
} from "@/utils/studentJoinApplication";
import {
    buildStudentReportsCheckMap,
    pickReportStatusFromCheckRow,
    resolveStudentBrowseReportCta,
} from "@/utils/studentBrowseReportCta";

export default function OpportunityDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [opportunity, setOpportunity] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [viewerNavRole, setViewerNavRole] = useState<DashboardNavRole | null>(null);

    useLayoutEffect(() => {
        setViewerNavRole(readDashboardNavRoleFromStorage() ?? "student");
    }, []);

    useEffect(() => {
        if (id) {
            fetchOpportunityDetails();
        }
    }, [id]);

    const applyEligibility = useMemo(() => {
        if (!opportunity) {
            return {
                canApply: true,
                isUniversityRestricted: false,
                blockedReason: null,
                listingRestrictionLabel: null,
                allowedUniversities: [] as string[],
            };
        }
        return resolveStudentUniversityApplyEligibility(
            opportunity as Record<string, unknown>,
            readStudentInstitutionFromBrowserStorage(),
        );
    }, [opportunity]);

    const fetchOpportunityDetails = async () => {
        try {
            let opData: Record<string, unknown> | null = null;

            const resBrowse = await authenticatedFetch(`/api/v1/students/opportunities/${id}`);
            if (resBrowse?.ok) {
                const dataBrowse = await resBrowse.json();
                if (dataBrowse.success && dataBrowse.data) {
                    opData = dataBrowse.data as Record<string, unknown>;
                }
            }

            // Student-created opportunities (pending approval) are not on the public browse API; use detail.
            if (!opData) {
                const resDetail = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                    method: "POST",
                    body: JSON.stringify({ id }),
                });
                if (resDetail?.ok) {
                    const dataDetail = await resDetail.json();
                    if (dataDetail.success && dataDetail.data) {
                        opData = dataDetail.data as Record<string, unknown>;
                    }
                }
            }

            if (!opData) {
                toast.error("Failed to fetch opportunity");
                setOpportunity(null);
                return;
            }

            let myId: string | null = null;
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                if (raw) {
                    const u = JSON.parse(raw) as { id?: string | number; userId?: string | number };
                    const v = u.id ?? u.userId;
                    myId = v != null ? String(v) : null;
                }
            } catch {
                /* ignore */
            }

            const creatorRaw = opData.creatorId ?? opData.creator_id;
            const creatorStr = creatorRaw != null ? String(creatorRaw) : "";
            const isStudentOwner =
                Boolean(myId && creatorStr && creatorStr === myId) ||
                opData.is_student_created === true ||
                String(opData.created_by_role || "").toLowerCase() === "student";

            const appRaw = opData.application_status ?? opData.applicationStatus;
            const application_status =
                typeof appRaw === "string" && appRaw.trim() ? String(appRaw).trim().toLowerCase() : "";
            const application_id = pickJoinApplicationId(opData);
            const application_stage = pickJoinApplicationStage(opData);

            const rawForApplyLock: Record<string, unknown> = {
                ...opData,
                application_status: application_status || opData.application_status,
                applicationStatus: opData.applicationStatus ?? application_status,
                has_applied: opData.has_applied,
                hasApplied: opData.hasApplied,
                status: opData.status,
            };
            const applyLocked = !isStudentOwner && joinApplicationLocksApplyButton(rawForApplyLock);

            let report_status: string | undefined;
            if (myId) {
                try {
                    const reportsRes = await authenticatedFetch(
                        `/api/v1/students/reports/check?studentId=${encodeURIComponent(myId)}`,
                    );
                    if (reportsRes?.ok) {
                        const reportsJson = (await reportsRes.json()) as { success?: boolean; data?: unknown };
                        if (reportsJson.success && Array.isArray(reportsJson.data)) {
                            const map = buildStudentReportsCheckMap(reportsJson.data);
                            report_status = pickReportStatusFromCheckRow(map.get(id));
                        }
                    }
                } catch {
                    /* ignore */
                }
            }

            setOpportunity({
                ...opData,
                application_status: application_status || undefined,
                application_id: application_id || undefined,
                application_stage: application_stage ?? undefined,
                hasApplied:
                    isStudentOwner ||
                    Boolean(application_status) ||
                    String(opData.status || "").toLowerCase() === "applied" ||
                    opData.has_applied === true ||
                    opData.hasApplied === true,
                applyLocked,
                isStudentOwner,
                report_status,
            });
        } catch (error) {
            console.error("Error fetching opportunity", error);
            toast.error("An error occurred while loading details");
            setOpportunity(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyClick = () => {
        if (!applyEligibility.canApply) {
            toast.error(applyEligibility.blockedReason || "You cannot apply to this opportunity.");
            return;
        }
        setIsPopupOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!opportunity) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] space-y-4">
                <p className="text-slate-500 text-lg">Opportunity not found.</p>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    const opportunitiesListHref =
        viewerNavRole === "admin" ? "/dashboard/admin/projects" : "/dashboard/student/browse";
    const opportunitiesBackLabel = viewerNavRole === "admin" ? "Back to all projects" : "Back to Opportunities";
    const hideStudentApplyActions = viewerNavRole === "admin" && !opportunity.isStudentOwner;
    const oppRecord = opportunity as Record<string, unknown>;
    const detailStatusBadgeLabel = formatOpportunityDetailStatusBadge(oppRecord);
    const detailWorkflowStageRaw =
        typeof (oppRecord.workflow_stage ?? oppRecord.workflowStage) === "string"
            ? String(oppRecord.workflow_stage ?? oppRecord.workflowStage).trim()
            : "";
    const remarkSections = extractOpportunityReturnRemarkSections(oppRecord);
    const reviewFeedback =
        remarkSections.length === 0 ? extractOpportunityReviewFeedback(oppRecord) : null;
    const canEditReturned =
        viewerNavRole !== "admin" &&
        opportunity.isStudentOwner &&
        canEditReturnedOpportunity(opportunity as Record<string, unknown>);

    const startReportCta =
        opportunity &&
        canStudentShowStartReportCta(oppRecord, {
            isStudentOwner: Boolean(opportunity.isStudentOwner),
        })
            ? resolveStudentBrowseReportCta(id, opportunity.report_status as string | undefined)
            : null;

    const applyBlockedByUniversity =
        !hideStudentApplyActions &&
        !opportunity.isStudentOwner &&
        !opportunity.applyLocked &&
        !applyEligibility.canApply;

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500 pb-24">
            {applyBlockedByUniversity ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 flex gap-3 items-start print:hidden">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Applications are not open for your university on this listing</p>
                        <p className="text-rose-900/90 mt-1">{applyEligibility.blockedReason}</p>
                    </div>
                </div>
            ) : null}
            {/* Header Actions */}
            <div className="flex justify-between items-center print:hidden">
                <Link href={opportunitiesListHref} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
                    <ArrowLeft className="w-4 h-4" /> {opportunitiesBackLabel}
                </Link>
                <div className="flex gap-3 flex-wrap justify-end">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                        <Share2 className="w-4 h-4" /> Print / Save PDF
                    </button>

                    {!hideStudentApplyActions && opportunity.isStudentOwner ? (
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap gap-2 justify-end">
                                <Link href="/dashboard/student/projects">
                                    <Button
                                        variant="outline"
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-none font-medium"
                                    >
                                        My Projects
                                    </Button>
                                </Link>
                                {canEditReturned ? (
                                    <Link href={`/dashboard/student/create-opportunity?edit=${encodeURIComponent(id)}`}>
                                        <Button className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium shadow-sm">
                                            <Pencil className="w-4 h-4" /> Edit & Resubmit
                                        </Button>
                                    </Link>
                                ) : null}
                            </div>
                            <p className="text-[10px] text-slate-500 max-w-xs text-right">
                                You created this listing. It becomes visible to others after approvals.
                            </p>
                        </div>
                    ) : !hideStudentApplyActions && opportunity.applyLocked ? (
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                                {startReportCta ? (
                                    <Button
                                        onClick={() => router.push(startReportCta.href)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                                    >
                                        {startReportCta.label}
                                    </Button>
                                ) : null}
                                <Button className="flex items-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg shadow-none cursor-default font-medium hover:bg-emerald-50">
                                    <CheckCircle2 className="w-4 h-4" /> Applied
                                </Button>
                            </div>
                            {opportunity.application_status &&
                                ["pending", "pending_approval", "applied"].includes(opportunity.application_status) && (
                                    <p className="text-[10px] text-amber-600 font-bold italic bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                        {joinApplicationPendingLabel(oppRecord)}
                                    </p>
                                )}
                        </div>
                    ) : !hideStudentApplyActions && opportunity.hasApplied && !opportunity.applyLocked ? (
                        <div className="flex flex-col items-end gap-2">
                            {opportunity.application_status &&
                                isJoinApplicationRejectedStatus(opportunity.application_status) && (
                                    <p className="text-[10px] text-rose-700 font-bold italic bg-rose-50 px-2 py-1 rounded border border-rose-100">
                                        Application not approved. You can submit a new request.
                                    </p>
                                )}
                            <Button
                                onClick={handleApplyClick}
                                disabled={!applyEligibility.canApply}
                                title={applyEligibility.blockedReason || undefined}
                                className={
                                    applyEligibility.canApply
                                        ? "flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium shadow-sm"
                                        : "flex items-center gap-2 px-6 py-2 bg-slate-300 text-slate-600 rounded-lg font-medium shadow-sm cursor-not-allowed"
                                }
                            >
                                {applyEligibility.canApply ? "Apply again" : "Not eligible"}
                            </Button>
                        </div>
                    ) : !hideStudentApplyActions ? (
                        <Button
                            onClick={handleApplyClick}
                            disabled={!applyEligibility.canApply}
                            title={applyEligibility.blockedReason || undefined}
                            className={
                                applyEligibility.canApply
                                    ? "flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium shadow-sm"
                                    : "flex items-center gap-2 px-6 py-2 bg-slate-300 text-slate-600 rounded-lg font-medium shadow-sm cursor-not-allowed"
                            }
                        >
                            {applyEligibility.canApply ? "Apply Now" : "Not eligible"}
                        </Button>
                    ) : null}
                </div>
            </div>

            {/* Document View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                {/* Title Section */}
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 print:bg-white print:border-none">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">{opportunity.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {opportunity.location?.city || opportunity.city || "Remote"}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Start: {opportunity.timeline?.start_date ? new Date(opportunity.timeline.start_date).toLocaleDateString() : (opportunity.start_date ? new Date(opportunity.start_date).toLocaleDateString() : "Flexible")}</span>
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">{opportunity.mode || "On Site"}</span>
                                {applyEligibility.listingRestrictionLabel ? (
                                    <span className="bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-200">
                                        {applyEligibility.listingRestrictionLabel}
                                    </span>
                                ) : null}
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                                        detailStatusBadgeLabel === "Live"
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : detailStatusBadgeLabel === "Completed"
                                              ? "bg-slate-100 text-slate-800 border-slate-200"
                                              : detailStatusBadgeLabel === "Rejected"
                                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                                : "bg-amber-50 text-amber-900 border border-amber-200"
                                    }`}
                                >
                                    {detailStatusBadgeLabel}
                                </span>
                            </div>
                            {detailWorkflowStageRaw ? (
                                <p className="text-[11px] text-slate-500 mt-2">
                                    <span className="font-semibold text-slate-600">Pipeline step:</span>{" "}
                                    {detailWorkflowStageRaw.replace(/_/g, " ")}
                                </p>
                            ) : null}
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-400">Opportunity ID</div>
                            <div className="font-mono font-bold text-slate-600" title={id}>
                                {formatDisplayId(id, "OPP")}
                            </div>
                        </div>
                    </div>
                    {(remarkSections.length > 0 || reviewFeedback) && opportunity.isStudentOwner ? (
                        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                                        Return remarks
                                    </p>
                                    {remarkSections.length > 0 ? (
                                        <div className="mt-2 space-y-3">
                                            {remarkSections.map((s) => (
                                                <div key={s.label}>
                                                    <p className="text-[10px] font-semibold text-rose-700">{s.label}</p>
                                                    <p className="mt-0.5 text-sm text-rose-900 whitespace-pre-wrap">
                                                        {s.text}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : reviewFeedback ? (
                                        <p className="mt-1 text-sm text-rose-900 whitespace-pre-wrap">{reviewFeedback}</p>
                                    ) : null}
                                </div>
                                {canEditReturned ? (
                                    <Link href={`/dashboard/student/create-opportunity?edit=${encodeURIComponent(id)}`}>
                                        <Button variant="outline" className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-100">
                                            <Pencil className="w-4 h-4" /> Edit now
                                        </Button>
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* Left Column: Organization & key details */}
                    <div className="p-8 space-y-8 md:col-span-4 lg:col-span-3 bg-slate-50/30">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Organization</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm font-bold text-slate-900">{opportunity.organization?.name || opportunity.organization_name || "Partner Organization"}</div>
                                    <div className="text-xs text-slate-500">Verified Partner</div>
                                </div>
                                {opportunity.organization && (
                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">Contact</div>
                                        <div className="text-sm font-medium text-slate-900">{opportunity.organization.city || "Lahore"}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="h-px bg-slate-200"></div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">SDG Alignment</h3>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 text-center space-y-3">
                                <div>
                                    <div className="text-4xl font-bold text-slate-900 mb-1">{opportunity.sdg ? opportunity.sdg : "?"}</div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">Goal {opportunity.sdg || "N/A"}</div>
                                </div>
                            </div>
                        </div>
                        {opportunity.verification_method && opportunity.verification_method.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Verification</h3>
                                <ul className="space-y-2">
                                    {opportunity.verification_method.map((v: string) => (
                                        <li key={v} className="text-sm text-slate-600 flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {v}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Middle/Right Column: Main Details */}
                    <div className="p-8 space-y-8 md:col-span-8 lg:col-span-9">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                                <div className="text-xs font-bold text-orange-600 uppercase mb-1">Volunteers Needed</div>
                                <div className="text-2xl font-bold text-orange-900">{opportunity.timeline?.volunteers_required || opportunity.volunteers_needed || "Open"}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="text-xs font-bold text-blue-600 uppercase mb-1">Hours/Student</div>
                                <div className="text-2xl font-bold text-blue-900">{opportunity.timeline?.expected_hours || opportunity.hours || 0}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                                <div className="text-xs font-bold text-purple-600 uppercase mb-1">Duration</div>
                                <div className="text-2xl font-bold text-purple-900">{opportunity.timeline?.type || opportunity.timeline_type || "Flexible"}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Beneficiaries</div>
                                <div className="text-2xl font-bold text-emerald-900">{opportunity.objectives?.beneficiaries_count || "N/A"}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <section>
                                <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Objectives</h3>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm border-l-4 border-slate-200 pl-4">
                                    {opportunity.objectives?.description || opportunity.description || "No description provided."}
                                </p>
                                {opportunity.objectives?.beneficiaries_type && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {Array.isArray(opportunity.objectives.beneficiaries_type)
                                            ? opportunity.objectives.beneficiaries_type.map((b: string) => (
                                                <span key={b} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{b}</span>
                                            ))
                                            : <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{opportunity.objectives.beneficiaries_type}</span>
                                        }
                                    </div>
                                )}
                            </section>
                            <section>
                                <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Student Activities</h3>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm mb-4 border-l-4 border-slate-200 pl-4">
                                    {opportunity.activity_details?.student_responsibilities || "No specific responsibilities listed."}
                                </p>
                                {Array.isArray(opportunity.activity_details?.skills_gained) && (
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Skills to be Gained</span>
                                        <div className="flex flex-wrap gap-2">
                                            {opportunity.activity_details.skills_gained.map((s: string) => (
                                                <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-full">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        <div className="h-px bg-slate-100"></div>

                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <h3 className="text-sm font-bold text-slate-900 mb-3">Timeline & Location</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs text-slate-500 mb-1">Start Date</div>
                                        <div className="text-sm font-medium text-slate-900">{opportunity.timeline?.start_date ? new Date(opportunity.timeline.start_date).toLocaleDateString() : (opportunity.start_date ? new Date(opportunity.start_date).toLocaleDateString() : "Flexible")}</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs text-slate-500 mb-1">End Date</div>
                                        <div className="text-sm font-medium text-slate-900">{opportunity.timeline?.end_date ? new Date(opportunity.timeline.end_date).toLocaleDateString() : (opportunity.end_date ? new Date(opportunity.end_date).toLocaleDateString() : "Flexible")}</div>
                                    </div>
                                    <div className="col-span-2 bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs text-slate-500 mb-1">Venue</div>
                                        <div className="text-sm font-medium text-slate-900">{opportunity.location?.venue || "N/A"}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{opportunity.location?.city}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <h3 className="text-sm font-bold text-slate-900 mb-3">Supervision</h3>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 h-full">
                                    {opportunity.supervision ? (
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-slate-500 text-xs">Supervisor</div>
                                                <div className="font-medium text-slate-900">{opportunity.supervision.supervisor_name || "N/A"}</div>
                                                <div className="text-xs text-slate-500">{opportunity.supervision.role}</div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200">
                                                <div className="space-y-2">
                                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${opportunity.supervision.safe_environment ? 'text-green-600' : 'text-red-500'}`}>
                                                        {opportunity.supervision.safe_environment ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full bg-red-500" />} Safe Env.
                                                    </span>
                                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${opportunity.supervision.supervised ? 'text-green-600' : 'text-amber-500'}`}>
                                                        {opportunity.supervision.supervised ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full bg-amber-500" />} Supervised
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-sm">No supervision details provided.</div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <ReportSummaryPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} />
        </div>
    );

}
