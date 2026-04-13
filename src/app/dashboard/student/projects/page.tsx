"use client";

import { useEffect, useState } from "react";
import { Button } from "../report/components/ui/button";
import Link from "next/link";
import { Badge } from "../report/components/ui/badge";
import { authenticatedFetch } from "@/utils/api";
import {
    canEditReturnedOpportunity,
    extractOpportunityReturnRemarkSections,
    extractOpportunityReviewFeedback,
    isStudentOpportunityLiveForReporting,
    resolveStudentOpportunityWorkflow,
} from "@/utils/opportunityWorkflow";
import {
    canStudentAccessReportForProjectPayload,
    isJoinApplicationPendingStatus,
    joinApplicationPendingLabel,
    pickJoinApplicationStatus,
} from "@/utils/studentJoinApplication";
import { formatDisplayId } from "@/utils/displayIds";
import { Loader2, Plus, Users, Eye, Mail, Phone, GraduationCap, Pencil, CheckCircle, FileText, Building2, TrendingUp, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../report/components/ui/dialog";

interface TeamMember {
    name: string;
    role: string;
    cnic: string;
    email?: string;
    mobile?: string;
    university?: string;
    program?: string;
    is_verified?: boolean;
}

/** Raw approval fields from API — shown under journey copy for student–backend sync. */
function formatStudentProjectApprovalLine(project: Project): string | null {
    const bits: string[] = [];
    if (project.workflow_stage) bits.push(`Workflow: ${project.workflow_stage}`);
    if (project.faculty_approval_status) bits.push(`Faculty: ${project.faculty_approval_status}`);
    if (project.partner_approval_status) bits.push(`Partner: ${project.partner_approval_status}`);
    if (project.admin_approval_status) bits.push(`Admin: ${project.admin_approval_status}`);
    return bits.length ? bits.join(" · ") : null;
}

function pickDetailStr(o: Record<string, unknown> | null | undefined, ...keys: string[]): string {
    if (!o) return "";
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function pickDetailDate(o: Record<string, unknown> | null | undefined, ...keys: string[]): string {
    if (!o) return "";
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) return "N/A";
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function toStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof value === "string" && value.trim()) {
        return [value.trim()];
    }
    return [];
}

function normalizeApprovalState(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function approvalPillClass(status: string): string {
    if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "rejected" || status === "returned") return "border-rose-200 bg-rose-50 text-rose-700";
    if (status === "pending" || status === "awaiting") return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === "not_applicable") return "border-slate-200 bg-slate-50 text-slate-500";
    return "border-slate-200 bg-slate-50 text-slate-600";
}

function approvalLabel(status: string): string {
    if (status === "not_applicable") return "Not required";
    if (!status) return "Unknown";
    return status.replace(/_/g, " ");
}

function stakeholderRows(d: Record<string, unknown>): {
    student: { name: string; email: string; id: string; university: string; department: string; phone: string };
    facultyEmail: string;
    facultyName: string;
    partnerOrg: string;
    partnerPerson: string;
    partnerEmail: string;
} {
    const user = d.user && typeof d.user === "object" ? (d.user as Record<string, unknown>) : null;
    const student = d.student && typeof d.student === "object" ? (d.student as Record<string, unknown>) : null;
    const creator = d.creator && typeof d.creator === "object" ? (d.creator as Record<string, unknown>) : null;
    const profile =
        d.student_profile && typeof d.student_profile === "object"
            ? (d.student_profile as Record<string, unknown>)
            : d.creator_profile && typeof d.creator_profile === "object"
              ? (d.creator_profile as Record<string, unknown>)
              : null;

    const studentName =
        pickDetailStr(creator, "name", "full_name", "fullName") ||
        pickDetailStr(d, "creator_name", "student_name", "submitted_by_name", "owner_name") ||
        pickDetailStr(student, "name", "full_name", "fullName") ||
        pickDetailStr(user, "name", "fullName") ||
        pickDetailStr(profile, "name", "full_name");
    const studentEmail =
        pickDetailStr(creator, "email") ||
        pickDetailStr(d, "creator_email", "student_email", "submitted_by_email", "owner_email") ||
        pickDetailStr(student, "email") ||
        pickDetailStr(user, "email") ||
        pickDetailStr(profile, "email");
    const studentId =
        pickDetailStr(creator, "id", "user_id") ||
        pickDetailStr(d, "creator_id", "student_id", "student_user_id", "created_by", "owner_id") ||
        pickDetailStr(student, "id", "user_id") ||
        pickDetailStr(user, "id") ||
        pickDetailStr(profile, "id", "user_id");
    const university =
        pickDetailStr(creator, "university", "institution") ||
        pickDetailStr(d, "creator_university", "student_university") ||
        pickDetailStr(student, "university", "institution") ||
        pickDetailStr(profile, "university", "institution");
    const department =
        pickDetailStr(creator, "department") ||
        pickDetailStr(d, "creator_department", "student_department") ||
        pickDetailStr(student, "department") ||
        pickDetailStr(profile, "department");
    const phone =
        (typeof d.student_contact === "string" && d.student_contact.trim()) ||
        pickDetailStr(creator, "phone", "contact", "mobile") ||
        pickDetailStr(student, "phone", "contact", "mobile") ||
        pickDetailStr(user, "phone", "contact", "mobile") ||
        pickDetailStr(profile, "phone", "contact", "mobile");

    const sup = d.supervision && typeof d.supervision === "object" ? (d.supervision as Record<string, unknown>) : null;
    const ext =
        d.external_partner_collaboration && typeof d.external_partner_collaboration === "object"
            ? (d.external_partner_collaboration as Record<string, unknown>)
            : null;
    const ex =
        d.executing_context && typeof d.executing_context === "object"
            ? (d.executing_context as Record<string, unknown>)
            : d.executingContext && typeof d.executingContext === "object"
              ? (d.executingContext as Record<string, unknown>)
              : null;
    const exP = ex?.partner && typeof ex.partner === "object" ? (ex.partner as Record<string, unknown>) : null;
    const po =
        d.partner_organization && typeof d.partner_organization === "object"
            ? (d.partner_organization as Record<string, unknown>)
            : null;

    return {
        student: {
            name: studentName,
            email: studentEmail,
            id: studentId,
            university,
            department,
            phone,
        },
        facultyEmail: pickDetailStr(sup, "contact", "official_email", "faculty_email"),
        facultyName: pickDetailStr(sup, "supervisor_name", "supervisorName"),
        partnerOrg:
            pickDetailStr(sup, "partner_org_name", "external_partner_org_name") ||
            pickDetailStr(ext, "organization_name") ||
            pickDetailStr(exP, "organization_name") ||
            pickDetailStr(po, "organization_name", "name"),
        partnerPerson:
            pickDetailStr(sup, "partner_contact_person", "external_partner_contact_person") ||
            pickDetailStr(ext, "contact_person") ||
            pickDetailStr(exP, "contact_person") ||
            pickDetailStr(po, "contact_person"),
        partnerEmail:
            pickDetailStr(sup, "partner_email", "external_partner_email") ||
            pickDetailStr(ext, "official_email") ||
            pickDetailStr(exP, "official_email") ||
            pickDetailStr(po, "official_email", "email"),
    };
}

interface Project {
    id: string;
    title: string;
    category: string;
    status: string;
    submitted_at: string;
    description: string;
    teamMembers?: TeamMember[];
    report_status?: 'none' | 'draft' | 'continue' | 'submitted' | 'verified' | 'rejected' | 'pending_payment' | 'payment_under_review' | 'paid';
    report_id?: string;
    report_feedback?: string;
    /** When API sends these, the UI shows the correct approval stage. */
    workflow_stage?: string;
    approval_stage?: string;
    faculty_approval_status?: string;
    partner_approval_status?: string;
    admin_approval_status?: string;
    application_status?: string;
    application_stage?: string | null;
    application_id?: string;
    has_applied?: boolean;
    hasApplied?: boolean;
    is_student_created?: boolean;
    created_by_role?: string;
    source?: string;
    review_feedback?: string;
}

export default function MyProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTeamProject, setSelectedTeamProject] = useState<Project | null>(null);
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectDetail, setProjectDetail] = useState<Record<string, unknown> | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [projectDetailLoading, setProjectDetailLoading] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // Get student ID from local storage
                const storedUser = localStorage.getItem("ciel_user");
                let studentId = "";
                if (storedUser) {
                    const userObj = JSON.parse(storedUser);
                    studentId = userObj.id || userObj.studentId || userObj.userId;
                }

                const res = await authenticatedFetch(`/api/v1/student/projects`, {
                    method: 'POST',
                    body: JSON.stringify({ studentId })
                });

                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const projectsData = data.data || [];

                        // 🚀 OPTIMIZATION: Fetch all report statuses at once
                        let reportsMap = new Map<string, any>();

                        try {
                            const reportsRes = await authenticatedFetch(`/api/v1/students/reports/check?studentId=${studentId}`
                            );

                            if (reportsRes && reportsRes.ok) {
                                const reportsData = await reportsRes.json();
                                console.log('📊 Bulk report statuses:', reportsData);

                                if (reportsData.success && Array.isArray(reportsData.data)) {
                                    reportsData.data.forEach((report: any) => {
                                        // The backend returns opportunityId or project_title (which is ID)
                                        const key = report.opportunityId || report.opportunity_id || report.projectId || report.project_id || report.project_title;
                                        if (key) {
                                            reportsMap.set(key, report);
                                        }
                                    });
                                }
                            }
                        } catch (error) {
                            console.error("Failed to fetch bulk reports", error);
                        }

                        // Map statuses to projects
                        const projectsWithReportStatus = projectsData.map((project: Project) => {
                            const report = reportsMap.get(project.id);
                            return {
                                ...project,
                                report_status: report ? (report.status || 'none') : 'none',
                                report_id: report ? (report.report_id || report.id) : undefined,
                                report_feedback: report ? report.feedback : undefined
                            };
                        });

                        const projectsWithRemarks = await Promise.all(
                            projectsWithReportStatus.map(async (project: Project) => {
                                if (
                                    !canEditReturnedOpportunity(project as unknown as Record<string, unknown>) ||
                                    extractOpportunityReviewFeedback(project as unknown as Record<string, unknown>)
                                ) {
                                    return project;
                                }
                                try {
                                    const detailRes = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id: project.id }),
                                    });
                                    if (!detailRes?.ok) return project;
                                    const detailJson = await detailRes.json();
                                    const detail = detailJson?.data as Record<string, unknown> | undefined;
                                    if (!detail) return project;
                                    return { ...project, ...detail };
                                } catch {
                                    return project;
                                }
                            }),
                        );

                        setProjects(projectsWithRemarks);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch projects", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const openTeamDialog = (project: Project) => {
        setSelectedTeamProject(project);
        setIsTeamDialogOpen(true);
    };

    const openProjectDetailDialog = (project: Project) => {
        setSelectedProject(project);
        setProjectDetail(null);
        setIsDetailModalOpen(true);
    };

    useEffect(() => {
        if (!isDetailModalOpen || !selectedProject?.id) {
            setProjectDetail(null);
            return;
        }
        let cancelled = false;
        (async () => {
            setProjectDetailLoading(true);
            try {
                const res = await authenticatedFetch(`/api/v1/opportunities/detail`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: selectedProject.id }),
                });
                if (!res?.ok || cancelled) return;
                const json = await res.json();
                const d = json?.data as Record<string, unknown> | undefined;
                if (!cancelled && d) setProjectDetail(d);
            } catch {
                if (!cancelled) setProjectDetail(null);
            } finally {
                if (!cancelled) setProjectDetailLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isDetailModalOpen, selectedProject?.id]);

    const detailView = selectedProject
        ? ((projectDetail ? { ...selectedProject, ...projectDetail } : selectedProject) as unknown as Record<
              string,
              unknown
          >)
        : null;

    return (
        <div className="space-y-8 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
                    <p className="text-slate-500">Manage your active and completed social impact projects.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <p className="text-slate-500 mb-4">You haven't joined or created any projects yet.</p>
                    <Link href="/dashboard/student/create-opportunity">
                        <Button>Get Started</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6">
                    {projects.map((project) => {
                        const pRecord = project as unknown as Record<string, unknown>;
                        const isStudentOwnedOpportunity =
                            project.is_student_created === true ||
                            String(project.created_by_role || "").toLowerCase() === "student" ||
                            String(project.source || "").toLowerCase() === "student_created";
                        const live = isStudentOpportunityLiveForReporting(pRecord);
                        const joinAppStatus = pickJoinApplicationStatus(pRecord);
                        const joinPending =
                            !isStudentOwnedOpportunity &&
                            Boolean(joinAppStatus && isJoinApplicationPendingStatus(joinAppStatus));
                        const reportUnlocked = canStudentAccessReportForProjectPayload(pRecord);
                        const workflow = resolveStudentOpportunityWorkflow(pRecord);
                        const approvalLine = formatStudentProjectApprovalLine(project);
                        const remarkSections = extractOpportunityReturnRemarkSections(pRecord);
                        const reviewFeedback =
                            remarkSections.length === 0 ? extractOpportunityReviewFeedback(pRecord) : null;
                        const canReviseOpportunity =
                            isStudentOwnedOpportunity && !live && canEditReturnedOpportunity(pRecord);
                        const statusBadgeClass = joinPending
                            ? "bg-amber-100 text-amber-800"
                            : live
                              ? project.status === "completed"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-green-100 text-green-700"
                              : workflow.stage === "rejected"
                                ? "bg-red-100 text-red-700"
                                : workflow.stage === "revision"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-amber-100 text-amber-700";

                        return (
                        <div key={project.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl shrink-0">
                                    {(project.title || "P").substring(0, 2).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-lg text-slate-800">{project.title}</h3>
                                        <Badge className={statusBadgeClass}>
                                            {joinPending ? joinApplicationPendingLabel(pRecord) : workflow.badgeLabel}
                                        </Badge>

                                        {/* Report Status Badge */}
                                        {project.report_status && project.report_status !== 'none' && (
                                            <Badge className={`
                                                ${project.report_status === 'continue' || project.report_status === 'draft' ? 'bg-slate-100 text-slate-700' :
                                                    project.report_status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                                                        project.report_status === 'pending_payment' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                                            project.report_status === 'payment_under_review' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                project.report_status === 'verified' || project.report_status === 'paid' ? 'bg-green-100 text-green-700' :
                                                                    'bg-red-100 text-red-700'}
                                            `}>
                                                {project.report_status === 'pending_payment' ? 'Payment Due' : 
                                                 project.report_status === 'payment_under_review' ? 'Payment Verifying' :
                                                 project.report_status.charAt(0).toUpperCase() + project.report_status.slice(1).replace('_', ' ')}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500">{project.category || "Social Impact"} • {project.submitted_at ? new Date(project.submitted_at).toLocaleDateString() : "Just now"}</p>
                                    <p className="text-sm text-slate-600 max-w-2xl">
                                        {project.description || "No description provided."}
                                    </p>

                                    {/* Payment Required Alert */}
                                    {project.report_status === 'pending_payment' && (
                                        <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                                            <p className="text-sm font-bold text-indigo-800">💳 Payment Proof Required</p>
                                            <Link href={`/dashboard/student/payment?projectId=${project.id}`}>
                                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-4">Pay Now</Button>
                                            </Link>
                                        </div>
                                    )}

                                    {/* Verification Feedback */}
                                    {(project.report_status === 'verified' || project.report_status === 'paid') && (
                                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold text-green-800">✅ Fully Verified & Paid!</p>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" variant="outline" className="text-xs h-7 border-green-200 text-green-700 hover:bg-green-100">
                                                        Download cii (Certificate)
                                                    </Button>
                                                    <Link href={`/dashboard/student/report?projectId=${project.id}`}>
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-7">
                                                            View Final Report
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                            {project.report_feedback && (
                                                <p className="text-sm text-green-700 border-t border-green-100 pt-2">{project.report_feedback}</p>
                                            )}
                                        </div>
                                    )}
                                    {project.report_status === 'rejected' && (
                                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-sm font-bold text-red-800">❌ Report Needs Revision</p>
                                            {project.report_feedback && (
                                                <p className="text-sm text-red-700 mt-1">{project.report_feedback}</p>
                                            )}
                                        </div>
                                    )}
                                    {(project.report_status === 'submitted' || project.report_status === 'payment_under_review') && (
                                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm font-bold text-yellow-800">
                                                {project.report_status === 'payment_under_review' ? '⏳ Payment Under Review' : '⏳ Report Under Review'}
                                            </p>
                                            <p className="text-sm text-yellow-700">
                                                {project.report_status === 'payment_under_review' ? 'Your payment slip is being verified by the admin team.' : 'Your report is being reviewed by the organization.'}
                                            </p>
                                        </div>
                                    )}
                                    {joinPending && (
                                        <div className="mt-2 max-w-2xl">
                                            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">
                                                {joinApplicationPendingLabel(pRecord)} — you will be notified when your
                                                application moves forward.
                                            </p>
                                        </div>
                                    )}
                                    {!live && (
                                        <div className="mt-2 max-w-2xl space-y-1">
                                            <p className="text-xs text-amber-800 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2">
                                                {workflow.queueMessage}
                                            </p>
                                            {remarkSections.length > 0 || reviewFeedback ? (
                                                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                                                    <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700">
                                                        Return remarks
                                                    </p>
                                                    {remarkSections.length > 0 ? (
                                                        <div className="mt-2 space-y-2">
                                                            {remarkSections.map((s) => (
                                                                <div key={s.label}>
                                                                    <p className="text-[10px] font-semibold text-rose-700">
                                                                        {s.label}
                                                                    </p>
                                                                    <p className="text-sm text-rose-800 whitespace-pre-wrap">
                                                                        {s.text}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : reviewFeedback ? (
                                                        <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
                                                            {reviewFeedback}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                            {approvalLine ? (
                                                <p className="text-[10px] text-slate-600 font-mono bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                                                    {approvalLine}
                                                </p>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {project.teamMembers && project.teamMembers.length > 0 && (
                                    <Button variant="outline" onClick={() => openTeamDialog(project)} className="w-full md:w-auto flex items-center gap-2">
                                        <Users className="w-4 h-4" /> View Team
                                    </Button>
                                )}

                                {reportUnlocked && (
                                    <>
                                        {project.report_status === 'none' || project.report_status === 'continue' || project.report_status === 'draft' ? (
                                            <Link href={`/dashboard/student/report?projectId=${project.id}`} className="w-full md:w-auto">
                                                <Button className="w-full md:w-auto">
                                                    {project.report_status === 'continue' || project.report_status === 'draft' ? 'Continue Report' : 'Submit Report'}
                                                </Button>
                                            </Link>
                                        ) : project.report_status === 'rejected' ? (
                                            <Link href={`/dashboard/student/report?projectId=${project.id}`} className="w-full md:w-auto">
                                                <Button variant="destructive" className="w-full md:w-auto">
                                                    Revise Report
                                                </Button>
                                            </Link>
                                        ) : project.report_status === 'submitted' ? (
                                            <Link href={`/dashboard/student/payment?projectId=${project.id}`} className="w-full md:w-auto">
                                                <Button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700">
                                                    Complete Payment
                                                </Button>
                                            </Link>
                                        ) : null}
                                    </>
                                )}
                                {canReviseOpportunity ? (
                                    <Link
                                        href={`/dashboard/student/create-opportunity?edit=${encodeURIComponent(project.id)}`}
                                        className="w-full md:w-auto"
                                    >
                                        <Button variant="outline" className="w-full md:w-auto gap-1.5">
                                            <Pencil className="w-4 h-4" /> Edit & Resubmit
                                        </Button>
                                    </Link>
                                ) : null}
                                <Button
                                    variant="outline"
                                    className="w-full md:w-auto gap-1.5"
                                    onClick={() => openProjectDetailDialog(project)}
                                >
                                    <Eye className="w-4 h-4" /> View Details
                                </Button>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {/* Team Details Dialog */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-6 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl text-slate-900">
                                    Project Team
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 mt-1">
                                    Collaborators for <span className="font-medium text-slate-700">{selectedTeamProject?.title}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6">
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Team Member</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Contact Info</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {selectedTeamProject?.teamMembers?.map((member, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm ring-2 ring-white border border-slate-200">
                                                        {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{member.name}</div>
                                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{member.cnic}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${member.role === 'Leader'
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                    : 'bg-slate-50 text-slate-600 border-slate-100'
                                                    }`}>
                                                    {member.role === 'Leader' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse" />}
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {member.email && (
                                                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <Mail className="w-3 h-3 text-slate-400" />
                                                            {member.email}
                                                        </div>
                                                    )}
                                                    {member.mobile && (
                                                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            {member.mobile}
                                                        </div>
                                                    )}
                                                    {member.university && (
                                                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                            <GraduationCap className="w-3 h-3 text-slate-400" />
                                                            {member.university}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase ${member.is_verified
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {member.is_verified ? 'Verified' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!selectedTeamProject?.teamMembers || selectedTeamProject.teamMembers.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                                                No team members added to this project.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-0">
                        <Button onClick={() => setIsTeamDialogOpen(false)} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isDetailModalOpen}
                onOpenChange={(open) => {
                    setIsDetailModalOpen(open);
                    if (!open) {
                        setProjectDetail(null);
                        setSelectedProject(null);
                    }
                }}
            >
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                    <DialogHeader className="p-6 bg-slate-50/60 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <DialogTitle className="text-2xl text-slate-900">
                                    {String(detailView?.title ?? selectedProject?.title ?? "Opportunity")}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 mt-1">
                                    {detailView
                                        ? formatDateTime(
                                              pickDetailDate(
                                                  detailView,
                                                  "submitted_at",
                                                  "submittedAt",
                                                  "created_at",
                                                  "createdAt",
                                                  "date_submitted",
                                              ),
                                          )
                                        : ""}
                                </DialogDescription>
                            </div>
                            {selectedProject ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    {canEditReturnedOpportunity(detailView ?? (selectedProject as unknown as Record<string, unknown>)) ? (
                                        <Link href={`/dashboard/student/create-opportunity?edit=${encodeURIComponent(selectedProject.id)}`}>
                                            <Button variant="outline" className="gap-2">
                                                <Pencil className="w-4 h-4" /> Edit & Resubmit
                                            </Button>
                                        </Link>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {projectDetailLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                            </div>
                        ) : detailView ? (
                            (() => {
                                const v = detailView as Record<string, unknown>;
                                const sh = stakeholderRows(v);
                                const hasStudent =
                                    sh.student.name ||
                                    sh.student.email ||
                                    sh.student.id ||
                                    sh.student.university ||
                                    sh.student.department ||
                                    sh.student.phone;
                                const hasFaculty = sh.facultyName || sh.facultyEmail;
                                const hasPartner = sh.partnerOrg || sh.partnerPerson || sh.partnerEmail;
                                const facultyStatus = normalizeApprovalState(v.faculty_approval_status);
                                const partnerStatus = normalizeApprovalState(v.partner_approval_status);
                                const adminStatus =
                                    normalizeApprovalState(v.admin_approval_status) ||
                                    (normalizeApprovalState(v.workflow_stage) === "pending_admin" ||
                                    normalizeApprovalState(v.workflow_stage) === "pending_approval"
                                        ? "pending"
                                        : "");
                                const submittedAt = pickDetailDate(
                                    v,
                                    "submitted_at",
                                    "submittedAt",
                                    "created_at",
                                    "createdAt",
                                    "date_submitted",
                                );
                                const remarkSections = extractOpportunityReturnRemarkSections(v);
                                const reviewFeedback =
                                    remarkSections.length === 0 ? extractOpportunityReviewFeedback(v) : null;
                                const objectives = (v.objectives as Record<string, unknown> | undefined) ?? {};
                                const timeline = (v.timeline as Record<string, unknown> | undefined) ?? {};
                                const location = (v.location as Record<string, unknown> | undefined) ?? {};
                                const activityDetails = (v.activity_details as Record<string, unknown> | undefined) ?? {};
                                const supervision = (v.supervision as Record<string, unknown> | undefined) ?? {};
                                const skillsGained = toStringList(activityDetails.skills_gained);
                                const beneficiaryTypes = toStringList(objectives.beneficiaries_type);
                                const verificationMethods = toStringList(v.verification_method);
                                const wfBits = [
                                    v.workflow_stage ? `Workflow: ${String(v.workflow_stage)}` : "",
                                    v.faculty_approval_status ? `Faculty: ${String(v.faculty_approval_status)}` : "",
                                    v.partner_approval_status ? `Partner: ${String(v.partner_approval_status)}` : "",
                                    v.admin_approval_status ? `Admin: ${String(v.admin_approval_status)}` : "",
                                ].filter(Boolean);
                                const approvalStages = [
                                    {
                                        label: "Student",
                                        helper: submittedAt ? `Submitted ${formatDateTime(submittedAt)}` : "Submission received",
                                        status: "approved",
                                    },
                                    {
                                        label: "Faculty",
                                        helper: sh.facultyName || sh.facultyEmail || "Waiting for faculty review",
                                        status: facultyStatus || "pending",
                                    },
                                    {
                                        label: "Partner",
                                        helper:
                                            sh.partnerOrg || sh.partnerPerson || sh.partnerEmail
                                                ? sh.partnerOrg || sh.partnerPerson || sh.partnerEmail
                                                : "No partner step on this record",
                                        status: hasPartner || partnerStatus ? partnerStatus || "pending" : "not_applicable",
                                    },
                                    {
                                        label: "Admin",
                                        helper: "CIEL final approval",
                                        status: adminStatus || "pending",
                                    },
                                ];

                                return (
                                    <>
                                        {remarkSections.length > 0 || reviewFeedback ? (
                                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                                                    Return remarks
                                                </p>
                                                {remarkSections.length > 0 ? (
                                                    <div className="mt-2 space-y-3">
                                                        {remarkSections.map((s) => (
                                                            <div key={s.label}>
                                                                <p className="text-[10px] font-semibold text-rose-700">
                                                                    {s.label}
                                                                </p>
                                                                <p className="mt-0.5 text-sm text-rose-900 whitespace-pre-wrap">
                                                                    {s.text}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : reviewFeedback ? (
                                                    <p className="mt-2 text-sm text-rose-900 whitespace-pre-wrap">
                                                        {reviewFeedback}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                            <div className="flex items-center justify-between gap-3 mb-4">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                        Approval Workflow
                                                    </p>
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        Track who has approved this opportunity so far.
                                                    </p>
                                                </div>
                                                {v.workflow_stage ? (
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                        {String(v.workflow_stage).replace(/_/g, " ")}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {approvalStages.map((stage) => (
                                                    <div key={stage.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                    {stage.label}
                                                                </p>
                                                                <p className="mt-2 text-sm font-semibold text-slate-900 capitalize">
                                                                    {approvalLabel(stage.status)}
                                                                </p>
                                                            </div>
                                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${approvalPillClass(stage.status)}`}>
                                                                {approvalLabel(stage.status)}
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-xs text-slate-500">{stage.helper}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {wfBits.length > 0 ? (
                                                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                        Approval pipeline (backend fields)
                                                    </p>
                                                    <p className="text-xs font-mono leading-relaxed">{wfBits.join(" · ")}</p>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {hasStudent ? (
                                                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Student</h3>
                                                    <ul className="text-sm text-slate-800 space-y-1">
                                                        {sh.student.name ? <li><span className="text-slate-500">Name:</span> {sh.student.name}</li> : null}
                                                        {sh.student.email ? <li><span className="text-slate-500">Email:</span> {sh.student.email}</li> : null}
                                                        {sh.student.id ? <li><span className="text-slate-500">Id:</span> {formatDisplayId(sh.student.id, "STU")}</li> : null}
                                                        {sh.student.university ? <li><span className="text-slate-500">University:</span> {sh.student.university}</li> : null}
                                                        {sh.student.department ? <li><span className="text-slate-500">Department:</span> {sh.student.department}</li> : null}
                                                        {sh.student.phone ? <li><span className="text-slate-500">Contact:</span> {sh.student.phone}</li> : null}
                                                    </ul>
                                                </div>
                                            ) : null}
                                            {hasFaculty ? (
                                                <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                                                    <h3 className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-2">Faculty</h3>
                                                    <ul className="text-sm text-slate-800 space-y-1">
                                                        {sh.facultyName ? <li><span className="text-slate-500">Supervisor:</span> {sh.facultyName}</li> : null}
                                                        {sh.facultyEmail ? <li><span className="text-slate-500">Official email:</span> {sh.facultyEmail}</li> : null}
                                                    </ul>
                                                </div>
                                            ) : null}
                                            {hasPartner ? (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                                                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">Partner</h3>
                                                    <ul className="text-sm text-slate-800 space-y-1">
                                                        {sh.partnerOrg ? <li><span className="text-slate-500">Organization:</span> {sh.partnerOrg}</li> : null}
                                                        {sh.partnerPerson ? <li><span className="text-slate-500">Contact:</span> {sh.partnerPerson}</li> : null}
                                                        {sh.partnerEmail ? <li><span className="text-slate-500">Email:</span> {sh.partnerEmail}</li> : null}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center">
                                                    <p className="text-xs text-slate-500">No external partner on this record.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                                Overview & Logistics
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Mode</span>
                                                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-sm">{String(v.mode ?? "N/A")}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Location</span>
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {v.location
                                                            ? `${(location.venue as string | undefined) || ""}, ${(location.city as string | undefined) || ""}`
                                                            : "Remote"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Timeline Type</span>
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {String((timeline.type as string | undefined) || "N/A")}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Visibility</span>
                                                    <span className="font-bold text-slate-900 text-sm capitalize">{String(v.visibility || "Restricted")}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Start Date</span>
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {timeline.start_date ? new Date(String(timeline.start_date)).toLocaleDateString() : "TBD"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">End Date</span>
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {timeline.end_date ? new Date(String(timeline.end_date)).toLocaleDateString() : "TBD"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Expected Hours</span>
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {Number(timeline.expected_hours) || 0} hrs/student
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Volunteers Needed</span>
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {Number(timeline.volunteers_required) || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-4 border-b border-teal-100 pb-2 flex items-center gap-2">
                                                <Building2 className="w-4 h-4" /> Objectives & Impact
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Project Objective</span>
                                                    <p className="text-sm text-slate-700 bg-teal-50/50 p-3 rounded-lg border border-teal-100 whitespace-pre-wrap">
                                                        {String(
                                                            (objectives.description as string | undefined) ||
                                                                v.description ||
                                                                "No objective provided.",
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <span className="text-xs text-slate-500 block mb-1">Beneficiaries Count</span>
                                                        <span className="font-bold text-slate-900 text-sm">
                                                            {Number(objectives.beneficiaries_count) || 0}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-slate-500 block mb-1">Beneficiary Types</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {beneficiaryTypes.length > 0 ? beneficiaryTypes.map((type) => (
                                                                <span key={type} className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                                    {type}
                                                                </span>
                                                            )) : <span className="text-xs text-slate-500">N/A</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-4 border-b border-purple-100 pb-2 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" /> SDG Alignment
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                                    <span className="text-xs text-purple-600 block mb-1 font-bold">Primary SDG</span>
                                                    <span className="font-bold text-slate-900 text-sm block">
                                                        SDG {(v.sdg_info as { sdg_id?: string | number } | undefined)?.sdg_id ?? "N/A"}
                                                    </span>
                                                </div>
                                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                                    <span className="text-xs text-purple-600 block mb-1 font-bold">Target</span>
                                                    <span className="font-bold text-slate-900 text-sm block">
                                                        {(v.sdg_info as { target_id?: string | number } | undefined)?.target_id ?? "N/A"}
                                                    </span>
                                                </div>
                                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                                    <span className="text-xs text-purple-600 block mb-1 font-bold">Indicator</span>
                                                    <span className="font-bold text-slate-900 text-sm block">
                                                        {(v.sdg_info as { indicator_id?: string | number } | undefined)?.indicator_id ?? "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">
                                                <FileText className="w-4 h-4" /> Activities & Skills
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-1">Student Responsibilities</span>
                                                    <p className="text-sm text-slate-700 whitespace-pre-wrap pl-4 border-l-2 border-indigo-200">
                                                        {String(
                                                            (activityDetails.student_responsibilities as string | undefined) ||
                                                                "No details provided.",
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-500 block mb-2">Skills Gained</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {skillsGained.length > 0 ? skillsGained.map((skill) => (
                                                            <span
                                                                key={skill}
                                                                className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100"
                                                            >
                                                                {skill}
                                                            </span>
                                                        )) : <span className="text-xs text-slate-500">None specified</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-4 border-b border-orange-100 pb-2 flex items-center gap-2">
                                                    <Users className="w-4 h-4" /> Supervision
                                                </h3>
                                                <div className="space-y-3 bg-orange-50/50 p-4 rounded-xl">
                                                    <div>
                                                        <span className="text-xs text-slate-500 block">Supervisor</span>
                                                        <span className="font-bold text-slate-900 text-sm">
                                                            {String(supervision.supervisor_name || "N/A")}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-slate-500 block">Role</span>
                                                        <span className="text-slate-900 text-sm">{String(supervision.role || "N/A")}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-slate-500 block">Contact</span>
                                                        <span className="text-slate-900 text-sm">{String(supervision.contact || "N/A")}</span>
                                                    </div>
                                                    <div className="flex gap-4 mt-2 flex-wrap">
                                                        {supervision.safe_environment === true ? (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 font-bold">
                                                                <CheckCircle className="w-3 h-3" /> Safe Env
                                                            </span>
                                                        ) : null}
                                                        {supervision.supervised === true ? (
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1 font-bold">
                                                                <CheckCircle className="w-3 h-3" /> Supervised
                                                            </span>
                                                        ) : null}
                                                        {supervision.safe_environment !== true && supervision.supervised !== true ? (
                                                            <span className="text-xs text-slate-500">No supervision flags available.</span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-4 border-b border-cyan-100 pb-2 flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4" /> Verification
                                                </h3>
                                                <div className="bg-cyan-50/50 p-4 rounded-xl">
                                                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                                                        {verificationMethods.length > 0 ? verificationMethods.map((method) => (
                                                            <li key={method}>{method}</li>
                                                        )) : (
                                                            <li>No verification method specified</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()
                        ) : null}
                    </div>

                    <DialogFooter className="p-6 pt-0">
                        <Button
                            onClick={() => {
                                setIsDetailModalOpen(false);
                                setProjectDetail(null);
                                setSelectedProject(null);
                            }}
                            className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
