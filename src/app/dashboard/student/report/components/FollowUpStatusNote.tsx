"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";

/**
 * Read-only status of the follow-up the student planned in 9.5, once CIEL PK published the report:
 * scheduled → email sent → partner responded → results (after CIEL PK review). Renders nothing
 * while no follow-up exists, so the form itself is unchanged.
 */

type StudentFollowUp = {
    status: string;
    dueDate: string;
    intervalLabel: string;
    recipientName: string;
    recipientRole: string;
    firstSentAt: string | null;
    emailsSent: number;
    respondedAt: string | null;
    declinedAt: string | null;
    reviewedAt: string | null;
    lastError: string;
    questions: Array<{ id: string; activityTitle: string; questionText: string; countLabel: string | null }>;
    answers: Array<{ questionId: string; choice: string; numericValue: string | null; note: string }>;
    generalComment: string;
    respondentName: string;
};

const CHOICE_LABEL: Record<string, string> = { yes: "Yes", partially: "Partially", no: "No", unable_to_verify: "Unable to verify" };

function pretty(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function FollowUpStatusNote({ reportId }: { reportId: string | undefined }) {
    const [fu, setFu] = useState<StudentFollowUp | null>(null);

    useEffect(() => {
        if (!reportId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await authenticatedFetch(`/api/v1/students/reports/${encodeURIComponent(reportId)}/followup`, undefined, { redirectToLogin: false });
                if (!res || !res.ok) return;
                const body = (await res.json()) as { followUp: StudentFollowUp | null };
                if (!cancelled) setFu(body.followUp);
            } catch {
                /* optional panel: stay silent */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [reportId]);

    if (!fu) return null;

    const who = `${fu.recipientName || "the responsible person"}${fu.recipientRole ? ` (${fu.recipientRole})` : ""}`;
    const line =
        fu.status === "scheduled"
            ? `Scheduled: CIEL PK will email ${who} on ${pretty(fu.dueDate)} (${fu.intervalLabel}).`
            : fu.status === "sent" || fu.status === "reminded"
              ? `Email sent to ${who} on ${pretty(fu.firstSentAt)}${fu.emailsSent > 1 ? ` (${fu.emailsSent} emails incl. reminders)` : ""}. Waiting for their answers.`
              : fu.status === "responded"
                ? fu.reviewedAt
                    ? `${fu.respondentName || who} answered on ${pretty(fu.respondedAt)}. CIEL PK reviewed the answers below.`
                    : `${who} answered on ${pretty(fu.respondedAt)}. CIEL PK is reviewing the answers and will share them here.`
                : fu.status === "declined"
                  ? `${who} declined the follow-up on ${pretty(fu.declinedAt)} (not the right contact). CIEL PK may ask you for another contact.`
                  : fu.status === "expired"
                    ? `No response was received from ${who} before the link expired. This is recorded as "no response", not as a negative result.`
                    : fu.status === "cancelled"
                      ? "The follow-up was cancelled (the report was sent back, reopened or closed). It restarts when the report is published again."
                      : fu.status === "needs_attention"
                        ? `CIEL PK could not schedule the follow-up: ${fu.lastError || "details missing"}. Check the contact email and date above.`
                        : "";

    return (
        <div className="rounded-xl border border-[#cbe7e3] bg-[#f5fbfa] px-4 py-3 text-xs leading-relaxed text-slate-700" data-testid="student-followup-status">
            <b className="text-[#0c746e]">Follow-up status</b> · {line}
            {fu.reviewedAt && fu.answers.length ? (
                <ul className="mt-2 space-y-1">
                    {fu.questions.map((q) => {
                        const a = fu.answers.find((x) => x.questionId === q.id);
                        return (
                            <li key={q.id}>
                                <b>{q.activityTitle}:</b> {a ? CHOICE_LABEL[a.choice] || a.choice : "—"}
                                {a?.numericValue != null && a.numericValue !== "" ? ` · ${a.numericValue}` : ""}
                                {a?.note ? ` · ${a.note}` : ""}
                            </li>
                        );
                    })}
                    {fu.generalComment ? <li className="italic">“{fu.generalComment}”</li> : null}
                </ul>
            ) : null}
        </div>
    );
}
