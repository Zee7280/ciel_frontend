"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Lock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import {
    CepFeedbackQuestions,
    EMPTY_CEP_ANSWERS,
    cepAnswersProblem,
    submitCepFeedback,
    type CepFeedbackAnswers,
} from "./CepExperienceFeedbackPrompt";

export const RESULT_FEEDBACK_STATUS_API = "/api/v1/feedback/cep-experience/status";

function doneKey(reportId: string): string {
    return `ciel_result_feedback_done:${reportId}`;
}

/**
 * Student feedback form in front of a verified report's result package: the package renders only
 * after the student has given feedback for this report (once per report). If the status check
 * itself fails, the package is shown rather than locking the student out.
 */
export default function ResultPackageFeedbackGate({ reportId, children }: { reportId: string; children: ReactNode }) {
    const [state, setState] = useState<"checking" | "form" | "open">("checking");
    const [answers, setAnswers] = useState<CepFeedbackAnswers>(EMPTY_CEP_ANSWERS);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let cached = false;
        try {
            cached = localStorage.getItem(doneKey(reportId)) === "1";
        } catch {
            /* ignore */
        }
        if (cached) {
            setState("open");
            return;
        }
        (async () => {
            try {
                const res = await authenticatedFetch(`${RESULT_FEEDBACK_STATUS_API}?reportId=${encodeURIComponent(reportId)}`, {}, { redirectToLogin: false });
                if (cancelled) return;
                if (!res?.ok) {
                    setState("open");
                    return;
                }
                const json = (await res.json().catch(() => null)) as { submitted?: boolean } | null;
                if (cancelled) return;
                if (json?.submitted) {
                    try {
                        localStorage.setItem(doneKey(reportId), "1");
                    } catch {
                        /* ignore */
                    }
                    setState("open");
                } else {
                    setState("form");
                }
            } catch {
                if (!cancelled) setState("open");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [reportId]);

    const submit = async () => {
        const problem = cepAnswersProblem(answers);
        if (problem) {
            toast.error(problem);
            return;
        }
        setSubmitting(true);
        try {
            if (await submitCepFeedback(answers, reportId)) {
                try {
                    localStorage.setItem(doneKey(reportId), "1");
                } catch {
                    /* ignore */
                }
                toast.success("Thank you — opening your result package.");
                setState("open");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (state === "open") return <>{children}</>;
    if (state === "checking") {
        return <p className="py-10 text-center text-sm text-slate-500">Preparing your result package…</p>;
    }
    return (
        <section data-testid="result-feedback-gate" className="mx-auto max-w-2xl rounded-2xl border border-[#dce6ea] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e6f6f4] text-[#0e7d74]">
                    <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#0e7d74]">Before you open your result package</p>
                    <h3 className="mt-1 text-xl font-bold text-[#16313d]">Two minutes of feedback, please</h3>
                    <p className="mt-1 text-sm text-slate-600">
                        Your report is verified. Tell us how the Community Engagement report and dashboard worked for you — your
                        answers go straight to the CIEL PK team. Your result package opens as soon as you submit.
                    </p>
                </div>
            </div>
            <CepFeedbackQuestions answers={answers} onChange={setAnswers} idPrefix="result-cep" />
            <div className="mt-2 flex flex-col-reverse items-stretch gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Lock className="h-3.5 w-3.5" /> Asked once per verified report.
                </p>
                <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void submit()} disabled={submitting}>
                    {submitting ? "Sending…" : "Submit feedback & open my result package"}
                </Button>
            </div>
        </section>
    );
}
