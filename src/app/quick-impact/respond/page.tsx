"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { FACULTY_QUICK_WORK_HREF, QUICK_WORK_HREF, dashboardLink, hasStoredSession } from "@/utils/quickWorkApi";

type Preview = {
    kind: "faculty" | "member";
    title: string;
    activityDate: string | null;
    location: string;
    university: string;
    leadName: string;
    facultyName: string;
    name: string;
    participants: number;
    answer: "pending" | "accepted" | "declined" | null;
    open: boolean;
};

const API = "/api/v1/quick-work/email-response";

async function readJson(res: Response): Promise<{ data?: Preview; message?: string | string[] }> {
    return (await res.json().catch(() => ({}))) as { data?: Preview; message?: string | string[] };
}

function messageOf(body: { message?: string | string[] }, fallback: string) {
    const m = ([] as string[]).concat(body.message ?? []).filter(Boolean);
    return m.length ? m.join(" ") : fallback;
}

/**
 * The accept / decline links in Quick Community Work emails land here. Opening the page only shows the
 * request (mail scanners open links too); the answer is recorded when the person presses a button, and
 * it is the same answer the dashboard shows.
 */
function Respond() {
    const params = useSearchParams();
    const token = params.get("token") ?? "";
    const suggested = params.get("answer") === "decline" ? "decline" : "accept";
    const [preview, setPreview] = useState<Preview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    /** A failed answer keeps the card so the person can simply try again. */
    const [answerError, setAnswerError] = useState<string | null>(null);
    const [signedIn, setSignedIn] = useState(false);
    useEffect(() => setSignedIn(hasStoredSession()), []);

    useEffect(() => {
        if (!token) {
            setError("This link is incomplete. Open it again from the email, or sign in to CIEL PK.");
            return;
        }
        let cancelled = false;
        fetch(`${API}?token=${encodeURIComponent(token)}`)
            .then(async (res) => {
                const body = await readJson(res);
                if (cancelled) return;
                if (!res.ok || !body.data) setError(messageOf(body, "This link is no longer valid."));
                else setPreview(body.data);
            })
            .catch(() => !cancelled && setError("Could not reach CIEL PK. Check your connection and try again."));
        return () => {
            cancelled = true;
        };
    }, [token]);

    const answer = async (accept: boolean) => {
        setBusy(true);
        setAnswerError(null);
        try {
            const res = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, accept }),
            });
            const body = await readJson(res);
            if (!res.ok || !body.data) {
                // An expired or changed link cannot recover; anything else can be retried.
                if (res.status === 404) setError(messageOf(body, "This link is no longer valid."));
                else setAnswerError(messageOf(body, "Your answer could not be saved. Try again."));
                return;
            }
            setPreview(body.data);
            setDone(true);
        } catch {
            setAnswerError("Could not reach CIEL PK. Check your connection and try again.");
        } finally {
            setBusy(false);
        }
    };

    if (error) {
        return (
            <Card>
                <AlertCircle className="h-8 w-8 text-amber-600" aria-hidden />
                <h1 className="mt-3 text-lg font-bold text-slate-900">This link cannot be used</h1>
                <p className="mt-2 text-sm text-slate-600">{error}</p>
                <Link href={dashboardLink(QUICK_WORK_HREF, signedIn)} className="mt-4 inline-block text-sm font-bold text-[#0e7d74] hover:underline">
                    {signedIn ? "Open your CIEL PK dashboard →" : "Sign in to CIEL PK →"}
                </Link>
            </Card>
        );
    }
    if (!preview) {
        return <Loader2 className="h-6 w-6 animate-spin text-slate-400" />;
    }

    const faculty = preview.kind === "faculty";
    const acceptLabel = faculty ? "Accept" : "I took part";
    const title = preview.title || "Activity details not added yet";
    const dashboard = dashboardLink(faculty ? FACULTY_QUICK_WORK_HREF : QUICK_WORK_HREF, signedIn);
    const answered = preview.answer === "accepted" || preview.answer === "declined";

    return (
        <Card>
            <p className="text-xs font-bold uppercase tracking-[1.4px] text-[#0e7d74]">
                {faculty ? "Coordinating faculty request" : "Confirm your participation"}
            </p>
            <h1 className="mt-2 break-words text-lg font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {faculty ? (
                    <>
                        <b>{preview.leadName || "A student"}</b>
                        {preview.university ? ` of ${preview.university}` : ""} named you
                        {preview.name ? ` (${preview.name})` : ""} as the coordinating faculty member. The students can submit their hours to you only
                        after you accept; you then review the attendance and evidence.
                    </>
                ) : (
                    <>
                        <b>{preview.leadName || "A student"}</b> added you{preview.name ? ` (${preview.name})` : ""} as a team member. Confirm only if you
                        actually took part.
                    </>
                )}
            </p>
            <p className="mt-2 text-xs text-slate-500">
                {[preview.activityDate, preview.location, `${preview.participants} ${preview.participants === 1 ? "participant" : "participants"}`]
                    .filter(Boolean)
                    .join(" · ")}
            </p>

            {answered ? (
                <p
                    className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                        preview.answer === "accepted" ? "bg-[#e6f6f4] text-[#0e7d74]" : "bg-[#fae9e7] text-[#ac3c3c]"
                    }`}
                >
                    {preview.answer === "accepted" ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : null}
                    {done ? "Saved: " : "Your answer: "}
                    {preview.answer === "accepted" ? (faculty ? "accepted" : "you took part") : "declined"}. It shows the same on your CIEL PK dashboard.
                </p>
            ) : null}

            {answerError ? (
                <p role="alert" className="mt-4 rounded-lg bg-[#fff0ed] px-3 py-2 text-sm text-[#9b3832]">
                    {answerError}
                </p>
            ) : null}

            {preview.open ? (
                <div className="mt-5 flex flex-wrap gap-2.5">
                    <button
                        type="button"
                        disabled={busy || preview.answer === "accepted"}
                        onClick={() => void answer(true)}
                        className={`inline-flex items-center gap-1.5 rounded-lg bg-[#0e7d74] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b6760] disabled:cursor-not-allowed disabled:opacity-50 ${
                            suggested === "accept" && !answered ? "ring-2 ring-[#0e7d74]/30 ring-offset-2" : ""
                        }`}
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {answered && preview.answer !== "accepted" ? `Change to: ${acceptLabel}` : acceptLabel}
                    </button>
                    <button
                        type="button"
                        disabled={busy || preview.answer === "declined"}
                        onClick={() => void answer(false)}
                        className={`rounded-lg border border-[#e6c7c5] bg-white px-4 py-2.5 text-sm font-semibold text-[#ac3c3c] disabled:cursor-not-allowed disabled:opacity-50 ${
                            suggested === "decline" && !answered ? "ring-2 ring-[#ac3c3c]/25 ring-offset-2" : ""
                        }`}
                    >
                        {answered && preview.answer !== "declined" ? "Change to: Decline" : "Decline"}
                    </button>
                </div>
            ) : (
                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    This request is closed (the activity was submitted or its details changed), so answers can no longer change here.
                </p>
            )}

            <Link href={dashboard} className="mt-5 inline-block text-sm font-bold text-[#0e7d74] hover:underline">
                Open your CIEL PK dashboard →
            </Link>
        </Card>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>;
}

export default function QuickImpactRespondPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans antialiased">
            <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-slate-400" />}>
                <Respond />
            </Suspense>
        </div>
    );
}
