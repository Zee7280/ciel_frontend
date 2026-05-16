"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
    Bell,
    CheckCircle2,
    Clock3,
    FileText,
    FolderOpen,
    Grid2X2,
    Info,
    Megaphone,
    Send,
    ShieldCheck,
    UserCheck,
    Users,
    X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/app/dashboard/student/report/components/ui/dialog";
import { mergeHasAppliedFields } from "@/utils/studentJoinApplication";

export type OpportunityPromptProject = {
    id: string;
    title: string;
};

const LIVE_APPLY_PROMPT_DISMISSED_KEY = "ciel_live_apply_prompt_dismissed_v1";

function lower(value: unknown): string {
    return value == null ? "" : String(value).trim().toLowerCase();
}

function pickTitle(project: Record<string, unknown>): string {
    const title = project.title;
    return typeof title === "string" && title.trim() ? title.trim() : "your opportunity";
}

function isStudentCreatedProject(project: Record<string, unknown>): boolean {
    const raw = project.is_student_created ?? project.isStudentCreated;
    return raw === true || lower(raw) === "true" || lower(project.source) === "student_created";
}

function isApprovedAndLive(project: Record<string, unknown>): boolean {
    const status = lower(project.status);
    const workflow = lower(project.workflow_stage ?? project.workflowStage ?? project.approval_stage);
    return status === "live" || workflow === "live";
}

function pickProjectOwnerId(project: Record<string, unknown>): string {
    for (const key of ["creatorId", "creator_id", "created_by", "owner_id"]) {
        const value = project[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number") return String(value);
    }

    const creator = project.creator && typeof project.creator === "object" ? (project.creator as Record<string, unknown>) : null;
    if (!creator) return "";
    for (const key of ["id", "user_id"]) {
        const value = creator[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number") return String(value);
    }
    return "";
}

function isOwnedByCurrentStudent(project: Record<string, unknown>, currentStudentId: string): boolean {
    const ownerId = pickProjectOwnerId(project);
    return Boolean(ownerId && currentStudentId && ownerId.toLowerCase() === currentStudentId.toLowerCase());
}

export function findLiveApplyPromptProject(
    projects: Array<Record<string, unknown>>,
    currentStudentId: string,
): OpportunityPromptProject | null {
    const match = projects.find((project) => {
        const id = project.id;
        return (
            (typeof id === "string" || typeof id === "number") &&
            isStudentCreatedProject(project) &&
            isOwnedByCurrentStudent(project, currentStudentId) &&
            isApprovedAndLive(project) &&
            !mergeHasAppliedFields(project)
        );
    });

    if (!match) return null;
    return {
        id: String(match.id),
        title: pickTitle(match),
    };
}

function readDismissedPromptIds(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(LIVE_APPLY_PROMPT_DISMISSED_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
}

export function isLiveApplyPromptDismissed(projectId: string): boolean {
    return readDismissedPromptIds().includes(projectId);
}

export function dismissLiveApplyPrompt(projectId: string): void {
    if (typeof window === "undefined") return;
    const ids = new Set(readDismissedPromptIds());
    ids.add(projectId);
    window.localStorage.setItem(LIVE_APPLY_PROMPT_DISMISSED_KEY, JSON.stringify(Array.from(ids)));
}

export function readStoredStudentId(): string {
    if (typeof window === "undefined") return "";
    try {
        const raw = window.localStorage.getItem("ciel_user") || window.localStorage.getItem("user");
        if (!raw) return "";
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        for (const key of ["id", "studentId", "userId"]) {
            const value = parsed[key];
            if (typeof value === "string" && value.trim()) return value.trim();
        }
    } catch {
        return "";
    }
    return "";
}

function PromptRow({
    icon,
    iconClass,
    children,
}: {
    icon: ReactNode;
    iconClass: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                {icon}
            </div>
            <p className="text-sm font-medium leading-relaxed text-slate-700">{children}</p>
        </div>
    );
}

function ActionLink({
    href,
    variant,
    onClick,
    children,
}: {
    href: string;
    variant: "primary" | "outline" | "success";
    onClick?: () => void;
    children: ReactNode;
}) {
    const classes =
        variant === "primary"
            ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700"
            : variant === "success"
              ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-100 hover:bg-emerald-700"
              : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50";

    return (
        <Link
            href={href}
            onClick={onClick}
            className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition ${classes}`}
        >
            {children}
        </Link>
    );
}

export function OpportunitySubmittedReviewModal({
    open,
    opportunityTitle,
    onClose,
}: {
    open: boolean;
    opportunityTitle?: string;
    onClose: () => void;
}) {
    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onClose();
            }}
        >
            <DialogContent className="max-w-xl rounded-2xl border-slate-200 p-0 shadow-2xl">
                <div className="p-6 sm:p-8">
                    <div className="flex items-start gap-5">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <FileText className="h-12 w-12" />
                        </div>
                        <div className="min-w-0 pt-2">
                            <p className="text-xs font-black uppercase tracking-widest text-blue-600">Opportunity Submitted</p>
                            <h2 className="mt-1 text-2xl font-black leading-tight text-slate-900">Under Review</h2>
                            {opportunityTitle ? (
                                <p className="mt-2 text-sm font-semibold text-slate-500">{opportunityTitle}</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="my-5 h-px bg-slate-200" />

                    <div className="space-y-4">
                        <PromptRow icon={<Info className="h-4 w-4" />} iconClass="bg-blue-50 text-blue-600">
                            Your opportunity has been submitted successfully and is now <strong className="text-blue-700">under review</strong>.
                        </PromptRow>
                        <PromptRow icon={<Clock3 className="h-4 w-4" />} iconClass="bg-amber-50 text-amber-600">
                            Once it is approved and live, you will receive a dashboard reminder. Approval only makes the opportunity available; it does{" "}
                            <strong className="text-rose-700">not automatically confirm your participation</strong>.
                        </PromptRow>
                        <PromptRow icon={<Users className="h-4 w-4" />} iconClass="bg-emerald-50 text-emerald-600">
                            After it goes live, go to <strong className="text-emerald-700">My Projects</strong>, click <strong>Apply Now</strong>, and add yourself or your team members.
                        </PromptRow>
                        <PromptRow icon={<FileText className="h-4 w-4" />} iconClass="bg-violet-50 text-violet-600">
                            You will only be able to start the report after this application step is completed.
                        </PromptRow>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row">
                        <ActionLink href="/dashboard/student" variant="outline">
                            <Grid2X2 className="h-4 w-4" /> Go to Dashboard
                        </ActionLink>
                        <ActionLink href="/dashboard/student/projects" variant="primary">
                            <FolderOpen className="h-4 w-4" /> View My Projects
                        </ActionLink>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function OpportunityLiveApplyModal({
    project,
    open,
    onClose,
}: {
    project: OpportunityPromptProject | null;
    open: boolean;
    onClose: () => void;
}) {
    if (!project) return null;
    const applyHref = `/dashboard/student/browse/${encodeURIComponent(project.id)}`;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onClose();
            }}
        >
            <DialogContent className="max-w-xl rounded-2xl border-slate-200 p-0 shadow-2xl">
                <div className="p-6 sm:p-8">
                    <div className="flex items-start gap-5">
                        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="h-14 w-14" />
                            <span className="absolute -right-1 top-2 h-2 w-2 rounded-full bg-amber-400" />
                            <span className="absolute left-2 top-4 h-1.5 w-1.5 rounded-full bg-blue-400" />
                        </div>
                        <div className="min-w-0 pt-2">
                            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Opportunity Approved</p>
                            <h2 className="mt-1 text-2xl font-black leading-tight text-emerald-800">Your Opportunity Is Live - Apply Now to Begin</h2>
                            <p className="mt-2 text-sm font-semibold text-slate-500">{project.title}</p>
                        </div>
                    </div>

                    <div className="my-5 h-px bg-slate-200" />

                    <div className="space-y-4">
                        <PromptRow icon={<Megaphone className="h-4 w-4" />} iconClass="bg-emerald-50 text-emerald-600">
                            Your opportunity has been <strong className="text-emerald-700">approved and is now live</strong> on the dashboard.
                        </PromptRow>
                        <PromptRow icon={<UserCheck className="h-4 w-4" />} iconClass="bg-blue-50 text-blue-600">
                            To officially participate and start working on the report, go to My Projects, click <strong>Apply Now</strong>, complete your information, and add yourself or your team members.
                        </PromptRow>
                        <PromptRow icon={<Users className="h-4 w-4" />} iconClass="bg-orange-50 text-orange-600">
                            Your report will <strong className="text-orange-700">only be accessible</strong> after you apply and register your team.
                        </PromptRow>
                        <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                            <p className="text-sm font-semibold leading-relaxed text-emerald-900">
                                Approval does not mean you are registered. Please apply now to confirm your participation and secure your team&apos;s seats.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row">
                        <ActionLink href="/dashboard/student/projects" variant="outline" onClick={onClose}>
                            <FolderOpen className="h-4 w-4" /> Go to My Projects
                        </ActionLink>
                        <ActionLink href={applyHref} variant="success" onClick={onClose}>
                            <Send className="h-4 w-4" /> Apply Now
                        </ActionLink>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function OpportunityLiveApplyBanner({
    project,
    onDismiss,
}: {
    project: OpportunityPromptProject;
    onDismiss: () => void;
}) {
    const applyHref = `/dashboard/student/browse/${encodeURIComponent(project.id)}`;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-violet-50/80 p-4 shadow-sm sm:p-5">
            <button
                type="button"
                onClick={onDismiss}
                className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                aria-label="Dismiss live opportunity reminder"
            >
                <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col gap-4 pr-8 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                        <Bell className="h-7 w-7" />
                        <span className="absolute right-1 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">1</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-black text-violet-900">Your Opportunity is Now Live!</h3>
                        <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-700">
                            <span className="font-bold text-slate-900">{project.title}</span> has been approved and is live on the dashboard. Go to My Projects and click <strong>Apply Now</strong> to book your seat and register your team members. You won&apos;t be able to start your report until you complete this step.
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
                    <Link href={applyHref} className="inline-flex h-10 items-center justify-center rounded-xl bg-violet-700 px-8 text-sm font-black text-white shadow-sm transition hover:bg-violet-800">
                        Apply Now
                    </Link>
                    <Link href="/dashboard/student/projects" className="inline-flex h-10 items-center justify-center rounded-xl border border-violet-300 bg-white px-6 text-sm font-bold text-violet-800 transition hover:bg-violet-50">
                        Go to My Projects
                    </Link>
                </div>
            </div>
        </div>
    );
}
