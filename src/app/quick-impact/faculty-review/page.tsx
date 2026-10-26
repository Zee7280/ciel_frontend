"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import type { QuickWorkLog } from "@/utils/quickWorkRules";
import { STATUS_LABEL } from "@/utils/quickWorkRules";
import {
    EvidenceGallery,
    QuickWorkRecordDetails,
} from "@/components/ciel/community-service/quick-work/QuickWorkShared";

type Action = "approve" | "changes" | "reject";
type Preview = {
    log: QuickWorkLog;
    facultyEmail: string;
    open: boolean;
    registered: boolean;
    approveBlockedReason: string | null;
};

const API = "/api/v1/quick-work/faculty-review";
const ACTIONS: { key: Action; label: string }[] = [
    { key: "approve", label: "Approve" },
    { key: "changes", label: "Request Revision" },
    { key: "reject", label: "Reject" },
];

async function readJson(res: Response): Promise<{ data?: Preview; message?: string | string[] }> {
    return (await res.json().catch(() => ({}))) as { data?: Preview; message?: string | string[] };
}

function messageOf(body: { message?: string | string[] }, fallback: string) {
    const m = ([] as string[]).concat(body.message ?? []).filter(Boolean);
    return m.length ? m.join(" ") : fallback;
}

/**
 * Where the faculty "submitted for review" email's Approve / Request Revision / Reject buttons land:
 * the activity flashcard and the same decision as the faculty dashboard. Opening the page records
 * nothing; the named email needs a CIEL PK faculty account to act here.
 */
function FacultyReview() {
    const params = useSearchParams();
    const token = params.get("token") ?? "";
    const asked = params.get("action");
    const [preview, setPreview] = useState<Preview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [action, setAction] = useState<Action>(asked === "changes" || asked === "reject" ? asked : "approve");
    const [verified, setVerified] = useState(false);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

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

    const submit = async () => {
        if (action !== "approve" && !note.trim()) return setFormError("Add a brief reason or correction for the student.");
        if (action === "approve" && !verified) return setFormError("Confirm you reviewed the attendance and evidence.");
        setBusy(true);
        setFormError(null);
        try {
            const res = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, action, note: note.trim() || undefined, verified: action === "approve" ? verified : undefined }),
            });
            const body = await readJson(res);
            if (!res.ok || !body.data) {
                if (res.status === 404) setError(messageOf(body, "This link is no longer valid."));
                else setFormError(messageOf(body, "Your decision could not be saved. Try again."));
                return;
            }
            setPreview(body.data);
            setDone(true);
        } catch {
            setFormError("Could not reach CIEL PK. Check your connection and try again.");
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
                <Link href="/login" className="mt-4 inline-block text-sm font-bold text-[#0e7d74] hover:underline">
                    Sign in to CIEL PK →
                </Link>
            </Card>
        );
    }
    if (!preview) return <Loader2 className="h-6 w-6 animate-spin text-slate-400" />;

    const { log } = preview;
    const blocked = preview.approveBlockedReason;

    return (
        <Card wide>
            <div>
                <p className="text-xs font-bold uppercase tracking-[1.4px] text-[#0e7d74]">Complete Quick Community Log record</p>
                <h1 className="mt-1 text-lg font-bold text-slate-900">Review Quick Community Log</h1>
                <p className="mt-0.5 text-xs text-slate-500">Read the flashcard, attendance and evidence, then choose Approve, Request Revision or Reject.</p>
            </div>

            <QuickWorkRecordDetails
                log={log}
                evidence={
                    preview.registered && preview.open ? (
                        <EvidenceGallery evidence={log.evidence} />
                    ) : (
                        <p className="mt-1 text-xs text-slate-500">Evidence and participants’ contact details are shown to the reviewing faculty account.</p>
                    )
                }
            />

            {done ? (
                <p className="mt-2 flex items-start gap-2 rounded-lg bg-[#e6f6f4] px-3 py-2 text-sm font-semibold text-[#0e7d74]">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Saved: {STATUS_LABEL[log.status] ?? log.status}. The student has been told, and it shows the same on your CIEL PK dashboard.
                </p>
            ) : !preview.open ? (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    This activity is no longer awaiting review ({STATUS_LABEL[log.status] ?? log.status}).
                </p>
            ) : !preview.registered ? (
                <div className="mt-2 rounded-lg border border-[#e8d9b7] bg-[#fff6e5] px-4 py-3 text-sm text-[#79571c]">
                    <p>
                        To review, sign up or log in at CIEL PK with <b>{preview.facultyEmail}</b> as a faculty member. The activity then appears under
                        Quick Community Work on your dashboard, and this link works too.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                        <Link href="/signup" className="rounded-lg bg-[#0e7d74] px-4 py-2 text-sm font-semibold text-white">
                            Sign up
                        </Link>
                        <Link href="/login" className="rounded-lg border border-[#cbe3e0] bg-white px-4 py-2 text-sm font-semibold text-[#0e7d74]">
                            Log in
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="mt-2 border-t border-slate-100 pt-4">
                    <div role="radiogroup" aria-label="Decision" className="flex flex-wrap gap-2">
                        {ACTIONS.map((a) => (
                            <button
                                key={a.key}
                                type="button"
                                role="radio"
                                aria-checked={action === a.key}
                                onClick={() => {
                                    setAction(a.key);
                                    setFormError(null);
                                }}
                                className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                                    action === a.key ? "border-[#0e7d74] bg-[#0e7d74] text-white" : "border-slate-200 bg-white text-slate-700"
                                }`}
                            >
                                {a.label}
                            </button>
                        ))}
                    </div>

                    {action === "approve" ? (
                        blocked ? (
                            <p role="note" className="mt-3 rounded-lg border border-[#e8d9b7] bg-[#fff6e5] px-3 py-2 text-xs leading-relaxed text-[#79571c]">
                                <b>You cannot approve this log.</b> {blocked}
                            </p>
                        ) : (
                            <label className="mt-3 flex items-start gap-2.5 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-[17px] w-[17px] flex-none accent-[#0e7d74]"
                                    checked={verified}
                                    onChange={(e) => setVerified(e.target.checked)}
                                />
                                <span>I have reviewed the evidence and confirm the individual participation times shown above.</span>
                            </label>
                        )
                    ) : null}

                    <label htmlFor="reviewNote" className="mb-1.5 mt-3 block text-xs font-semibold text-slate-700">
                        Note for the student {action === "approve" ? <span className="font-normal text-slate-500">(optional)</span> : <span className="text-[#ac3c3c]">*</span>}
                    </label>
                    <textarea
                        id="reviewNote"
                        maxLength={300}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={action === "changes" ? "What should the student correct?" : action === "reject" ? "Why is this record not approved?" : "Feedback for the activity lead"}
                        className="min-h-[72px] w-full rounded-lg border border-[#d3e3e6] px-3 py-2.5 text-sm outline-none focus:border-[#0e7d74] focus:ring-2 focus:ring-[#0e7d74]/30"
                    />

                    {formError ? (
                        <p role="alert" className="mt-3 rounded-lg bg-[#fff0ed] px-3 py-2 text-sm text-[#9b3832]">
                            {formError}
                        </p>
                    ) : null}

                    <button
                        type="button"
                        disabled={busy || (action === "approve" && Boolean(blocked))}
                        onClick={() => void submit()}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0e7d74] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b6760] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {action === "approve" ? "Approve work & hours" : action === "changes" ? "Send back for revision" : "Reject record"}
                    </button>
                </div>
            )}

            <Link href="/dashboard/faculty/quick-work" className="mt-5 inline-block text-sm font-bold text-[#0e7d74] hover:underline">
                Open your CIEL PK dashboard →
            </Link>
        </Card>
    );
}

function Card({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
    return (
        <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-slate-200 bg-white p-5 text-[#16313d] shadow-sm sm:p-6`}>
            {children}
        </div>
    );
}

export default function QuickImpactFacultyReviewPage() {
    return (
        <div className="flex min-h-screen items-start justify-center bg-slate-100 p-4 font-sans antialiased sm:items-center sm:py-10">
            <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-slate-400" />}>
                <FacultyReview />
            </Suspense>
        </div>
    );
}
