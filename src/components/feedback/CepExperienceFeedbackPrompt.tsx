"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/dashboard/student/report/components/ui/dialog";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Label } from "@/app/dashboard/student/report/components/ui/label";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";

const STORAGE_SUBMITTED = "ciel_cep_feedback_v1_submitted";
const STORAGE_SNOOZE_UNTIL = "ciel_cep_feedback_v1_snooze_until";

const EASE_OPTIONS = [
    { value: "very_easy", label: "Very easy" },
    { value: "easy", label: "Easy" },
    { value: "neutral", label: "Neutral" },
    { value: "difficult", label: "Difficult" },
    { value: "very_difficult", label: "Very difficult" },
] as const;

const REFLECT_OPTIONS = [
    { value: "yes", label: "Yes" },
    { value: "partially", label: "Partially" },
    { value: "no", label: "No" },
] as const;

function readShouldOfferPrompt(): boolean {
    if (typeof window === "undefined") return false;
    if (window.localStorage.getItem(STORAGE_SUBMITTED) === "1") return false;
    const snooze = window.localStorage.getItem(STORAGE_SNOOZE_UNTIL);
    if (snooze) {
        const t = Number(snooze);
        if (!Number.isNaN(t) && Date.now() < t) return false;
    }
    return true;
}

type CepExperienceFeedbackPromptProps = {
    /**
     * When false, the prompt never mounts (until true). Used to gate survey until
     * report + payment proof are submitted; payment success page passes true explicitly.
     */
    eligibilityReady?: boolean;
};

/**
 * Non-blocking survey after student qualifies (typically dashboard load once report + fee proof are in).
 */
export function CepExperienceFeedbackPrompt({
    eligibilityReady = false,
}: CepExperienceFeedbackPromptProps) {
    const [eligible, setEligible] = useState(false);
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
    const [sectionsEase, setSectionsEase] = useState<string>("");
    const [reflectImpact, setReflectImpact] = useState<string>("");
    const [mostUseful, setMostUseful] = useState("");
    const [improvement, setImprovement] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!eligibilityReady) {
            setEligible(false);
            setOpen(false);
            return;
        }
        const ok = readShouldOfferPrompt();
        setEligible(ok);
        if (!ok) return;
        const t = window.setTimeout(() => setOpen(true), 2000);
        return () => window.clearTimeout(t);
    }, [eligibilityReady]);

    const snooze = useCallback(() => {
        const twoWeeks = 14 * 24 * 60 * 60 * 1000;
        window.localStorage.setItem(STORAGE_SNOOZE_UNTIL, String(Date.now() + twoWeeks));
        setOpen(false);
        toast.message("We’ll ask again in about two weeks.");
    }, []);

    const submit = useCallback(async () => {
        if (rating == null || rating < 1 || rating > 5) {
            toast.error("Please rate your overall experience (1–5).");
            return;
        }
        if (!sectionsEase) {
            toast.error("Please select how easy it was to fill the report sections.");
            return;
        }
        if (!reflectImpact) {
            toast.error("Please answer whether the platform helped you reflect on your impact.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/feedback/cep-experience`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    overallRating: rating,
                    sectionsEase,
                    reflectImpact,
                    mostUsefulText: mostUseful.trim() || undefined,
                    improvementText: improvement.trim() || undefined,
                }),
            });
            if (!res) {
                return;
            }
            const j = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
            if (res.ok && j.success !== false) {
                window.localStorage.setItem(STORAGE_SUBMITTED, "1");
                window.localStorage.removeItem(STORAGE_SNOOZE_UNTIL);
                toast.success("Thank you — your feedback helps us improve CIEL PK.");
                setOpen(false);
                setEligible(false);
            } else {
                toast.error(typeof j.message === "string" && j.message.trim() ? j.message : "Could not send feedback.");
            }
        } catch {
            toast.error("Could not send feedback. Try again later.");
        } finally {
            setSubmitting(false);
        }
    }, [rating, sectionsEase, reflectImpact, mostUseful, improvement]);

    if (!eligible) return null;

    return (
        <>
            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50 print:hidden"
                    aria-label="Open feedback survey"
                >
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    Feedback
                </button>
            ) : null}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="pr-8">Quick feedback — Community Engagement</DialogTitle>
                        <DialogDescription>
                            This takes about two minutes. Your answers help improve the report and dashboard on CIEL PK.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        <div>
                            <Label className="text-slate-800">
                                How would you rate your overall experience of completing the Community Engagement report?
                            </Label>
                            <p className="text-xs text-slate-500 mb-2">1 = lowest, 5 = highest</p>
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setRating(n)}
                                        className={`h-10 w-10 rounded-lg border text-sm font-bold transition ${
                                            rating === n
                                                ? "border-emerald-600 bg-emerald-600 text-white"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-slate-800">
                                How easy was it to understand and fill the report sections?
                            </Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {EASE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setSectionsEase(opt.value)}
                                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold sm:text-sm ${
                                            sectionsEase === opt.value
                                                ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-slate-800">
                                Did the platform help you reflect on the impact of your community service work?
                            </Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {REFLECT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setReflectImpact(opt.value)}
                                        className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                                            reflectImpact === opt.value
                                                ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="cep-useful">
                                What was the most useful part of the report or dashboard experience?
                            </Label>
                            <Textarea
                                id="cep-useful"
                                value={mostUseful}
                                onChange={(e) => setMostUseful(e.target.value)}
                                placeholder="Optional — a sentence or two is enough."
                                className="mt-1 min-h-[72px]"
                                maxLength={2000}
                            />
                        </div>

                        <div>
                            <Label htmlFor="cep-improve">What improvement would you suggest for CIEL PK / CEPK?</Label>
                            <Textarea
                                id="cep-improve"
                                value={improvement}
                                onChange={(e) => setImprovement(e.target.value)}
                                placeholder="Optional"
                                className="mt-1 min-h-[72px]"
                                maxLength={2000}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:gap-2">
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={snooze} disabled={submitting}>
                                Remind me in 2 weeks
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setOpen(false)}
                                disabled={submitting}
                            >
                                <X className="mr-1 h-4 w-4" />
                                Close
                            </Button>
                        </div>
                        <Button
                            type="button"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => void submit()}
                            disabled={submitting}
                        >
                            {submitting ? "Sending…" : "Submit feedback"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
