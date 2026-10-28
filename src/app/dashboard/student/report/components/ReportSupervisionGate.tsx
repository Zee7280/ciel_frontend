"use client";

import { useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { mailtoHref } from "@/utils/reminderLinks";
import { CIEL_PK_ADMIN_WHATSAPP } from "@/components/opportunities/OpportunityWhatsAppLinks";
import { remindReportSupervision, type ReportSupervisionState } from "@/utils/reportSupervisionApi";

function fmt(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Shown instead of the report form while the named faculty supervisor has not confirmed the
 * student: a new report can start only after that confirmation.
 */
export default function ReportSupervisionGate({
    state,
    projectId,
    projectTitle,
    onBack,
    onRecheck,
}: {
    state: ReportSupervisionState;
    projectId: string;
    projectTitle: string;
    onBack: () => void;
    onRecheck: () => Promise<void>;
}) {
    const [busy, setBusy] = useState<"remind" | "recheck" | null>(null);
    const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
    const email = state.faculty_email || "";
    const who = state.faculty_name ? `${state.faculty_name} (${email})` : email;
    const asked = fmt(state.requested_at);
    const subject = `Please confirm supervision: ${projectTitle}`;
    const body =
        `Dear ${state.faculty_name || "Faculty Member"},\n\n` +
        `I named you as my primary faculty supervisor for "${projectTitle}" on CIEL PK. ` +
        `Please confirm my supervision so I can start my impact report. Sign in here: ` +
        `${typeof window !== "undefined" ? window.location.origin : "https://cielpk.com"}/login?next=${encodeURIComponent("/dashboard/faculty/report-supervision")}\n\nThank you.`;

    const remind = async () => {
        setBusy("remind");
        const r = await remindReportSupervision(projectId);
        setNote({ ok: r.ok, text: r.message });
        setBusy(null);
    };
    const recheck = async () => {
        setBusy("recheck");
        await onRecheck();
        setBusy(null);
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-10">
            <div className="rounded-2xl border border-[#e8d9b7] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-[#79571c]">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                    <span className="text-xs font-bold uppercase tracking-[1.4px]">Waiting for faculty confirmation</span>
                </div>
                <h1 className="mt-2 text-lg font-bold text-slate-900">Your faculty supervisor needs to confirm you first</h1>
                <p className="mt-1 text-sm text-slate-600">{projectTitle}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                    You named <b>{who}</b> as your primary faculty supervisor. They must confirm that they supervise you before you can start this
                    impact report. Your hours and attendance keep counting in the meantime.
                </p>
                {asked ? <p className="mt-2 text-xs text-slate-500">CIEL PK emailed them on {asked}.</p> : null}
                {state.faculty_registered ? null : (
                    <p className="mt-3 rounded-lg border border-[#e8d9b7] bg-[#fff6e5] px-3 py-2 text-xs leading-relaxed text-[#79571c]">
                        This email has no CIEL PK faculty account yet. Ask them to sign up as faculty with <b>{email}</b>, or contact CIEL PK if the
                        email is wrong.
                    </p>
                )}
                {note ? (
                    <p
                        role="status"
                        className={`mt-3 rounded-lg px-3 py-2 text-sm ${note.ok ? "bg-[#e6f6f4] text-[#0e7d74]" : "bg-[#fff0ed] text-[#9b3832]"}`}
                    >
                        {note.text}
                    </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void remind()}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e7d74] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b6760] disabled:opacity-60"
                    >
                        {busy === "remind" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Send reminder email
                    </button>
                    {email ? (
                        <a
                            href={mailtoHref(email, subject, body)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbe3e0] bg-white px-4 py-2 text-sm font-semibold text-[#0e7d74]"
                        >
                            <Mail className="h-4 w-4" aria-hidden /> Email from my account
                        </a>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => void recheck()}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                    >
                        {busy === "recheck" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Check again
                    </button>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
                    <button type="button" onClick={onBack} className="font-semibold text-[#0e7d74] hover:underline">
                        ← Back to my reports
                    </button>
                    <a
                        href={`https://wa.me/${CIEL_PK_ADMIN_WHATSAPP}?text=${encodeURIComponent(`Hi CIEL PK, my faculty has not confirmed my supervision yet for "${projectTitle}".`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#128C4A] hover:underline"
                    >
                        WhatsApp CIEL PK for help
                    </a>
                </div>
            </div>
        </div>
    );
}
