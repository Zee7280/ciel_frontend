"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Loader2, Shield, Users } from "lucide-react";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { fetchMyParticipation, type MyParticipationPayload } from "@/utils/participationGuide";
import { ParticipationPhaseBadge } from "@/components/participation/ParticipationPhaseBadge";

function stateLabel(state: MyParticipationPayload["participation_state"]): string {
    switch (state) {
        case "verify":
            return "Verify your identity";
        case "log_attendance":
            return "Log your attendance hours";
        case "pending_approval":
            return "Awaiting attendance approval";
        case "complete":
            return "Your participation is complete";
        default:
            return "Participation";
    }
}

export default function TeamMemberParticipationPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = String(params?.projectId ?? "").trim();
    const [data, setData] = useState<MyParticipationPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            router.replace("/dashboard/student/projects");
            return;
        }
        void (async () => {
            setLoading(true);
            setError(null);
            try {
                const payload = await fetchMyParticipation(projectId);
                if (!payload) {
                    setError("Could not load your participation for this project.");
                    return;
                }
                if (!payload.is_team_member && payload.is_team_lead) {
                    router.replace(`/dashboard/student/report?projectId=${encodeURIComponent(projectId)}`);
                    return;
                }
                if (!payload.is_team_member) {
                    router.replace(`/dashboard/student/report?projectId=${encodeURIComponent(projectId)}`);
                    return;
                }
                setData(payload);
            } finally {
                setLoading(false);
            }
        })();
    }, [projectId, router]);

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-slate-600">{error || "Participation not found."}</p>
                <Link href="/dashboard/student/projects" className="mt-4 inline-block text-sm font-semibold text-blue-600">
                    Back to My Projects
                </Link>
            </div>
        );
    }

    const complete = data.participation_state === "complete";

    return (
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
            <Link
                href="/dashboard/student/projects"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
            >
                <ArrowLeft className="h-4 w-4" /> My Projects
            </Link>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                        <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Team member</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">{data.project_title}</h1>
                            {data.participation_phase ? (
                                <ParticipationPhaseBadge
                                    phase={data.participation_phase}
                                    label={data.participation_phase_label}
                                />
                            ) : null}
                        </div>
                        {data.team_display_name ? (
                            <p className="mt-1 text-sm text-slate-500">{data.team_display_name}</p>
                        ) : null}
                        {data.team_lead_name ? (
                            <p className="mt-2 text-sm text-slate-600">
                                Team lead: <span className="font-semibold">{data.team_lead_name}</span>
                            </p>
                        ) : null}
                    </div>
                </div>

                <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                    {data.messages.en}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-slate-700">
                        {complete ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                            <Clock className="h-5 w-5 text-amber-500" />
                        )}
                        <span className="font-semibold">{stateLabel(data.participation_state)}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Approved hours:{" "}
                        <strong>
                            {data.hours.approved}/{data.hours.required}
                        </strong>
                        {data.hours.logged !== data.hours.approved ? (
                            <span className="text-slate-400"> · logged {data.hours.logged}</span>
                        ) : null}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{data.attendance_approver_label}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <Shield className="h-5 w-5 text-indigo-600" />
                        Team report
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Your team lead files the impact report. You only maintain your attendance record.
                    </p>
                    {data.team_report_status ? (
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                            Report status: {data.team_report_status.replace(/_/g, " ")}
                        </p>
                    ) : null}
                </div>
            </div>

            {complete ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
                    <p className="font-semibold">Your part is complete</p>
                    <p className="mt-1 text-sm">
                        Attendance requirements are met. Your team lead will submit the final report when ready.
                    </p>
                </div>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {data.participation_state === "verify" ? (
                        <Link href={`/dashboard/student/engagement/verify?projectId=${encodeURIComponent(projectId)}`}>
                            <Button>Verify identity</Button>
                        </Link>
                    ) : (
                        <Link
                            href={`/dashboard/student/report?projectId=${encodeURIComponent(projectId)}&mode=member-attendance`}
                        >
                            <Button>{data.attendance_locked ? "View attendance" : "Log attendance"}</Button>
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
