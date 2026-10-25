"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

/** Our own wording per backend error code; the `message` query param is never shown, so a crafted
 * link cannot put arbitrary text on this domain. */
const ERROR_TEXT: Record<string, string> = {
    invalid_state: "The sign-in link expired or was already used. Start again.",
    idp_error: "Your university's sign-in service returned an error.",
    not_enabled: "University sign-in is not switched on for this university.",
    no_email: "Your university account did not share an email address.",
    domain_not_allowed: "This email domain is not approved for your university's sign-in.",
    email_not_verified: "Your university email address is not verified with your university.",
    not_workspace: "Sign in with your university account, not a personal Google account.",
    wrong_tenant: "That account belongs to a different organisation.",
    not_student: "University sign-in is for student accounts. Sign in with your password instead.",
    not_affiliated: "Your CIEL account is not linked to this university.",
    identity_conflict: "This university account is already linked to another CIEL account.",
    signup_closed: "New sign-ups are closed at the moment.",
    server_error: "Something went wrong on our side. Try again later.",
};

/**
 * Where the university sign-in provider sends the browser back. For now it reports the result of an
 * admin's test sign-in and any sign-in error; student sign-in through a university is not offered yet.
 */
function SsoResult() {
    const params = useSearchParams();
    const test = params.get("test");
    const error = params.get("error");
    // Shown only in a plain sentence, and only when they look like what the backend sends.
    const university = (params.get("university") ?? "").slice(0, 120);
    const rawEmail = params.get("email") ?? "";
    const email = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(rawEmail) ? rawEmail : "";

    if (test === "ok") {
        return (
            <Card tone="ok" title="Test sign-in worked">
                <p>
                    {university ? <b>{university}</b> : "The university"}&apos;s sign-in is set up correctly
                    {email ? (
                        <>
                            {" "}
                            (signed in as <b>{email}</b>)
                        </>
                    ) : null}
                    . No CIEL session was created.
                </p>
                <p className="mt-2">You can close this window. The CIEL PK admin can now activate single sign-on for students.</p>
            </Card>
        );
    }

    if (error) {
        return (
            <Card tone="error" title="University sign-in did not complete">
                <p>{ERROR_TEXT[error] ?? "Something went wrong while signing in with your university."}</p>
                {ERROR_TEXT[error] ? <p className="mt-2 text-xs text-slate-500">Reference: {error}</p> : null}
                <Link href="/login" className="mt-4 inline-block font-bold text-[#0e7d74] hover:underline">
                    Sign in with email and password →
                </Link>
            </Card>
        );
    }

    return (
        <Card tone="error" title="University sign-in is not available yet">
            <p>Please sign in with your email and password.</p>
            <Link href="/login" className="mt-4 inline-block font-bold text-[#0e7d74] hover:underline">
                Go to sign in →
            </Link>
        </Card>
    );
}

function Card({ tone, title, children }: { tone: "ok" | "error"; title: string; children: React.ReactNode }) {
    const Icon = tone === "ok" ? CheckCircle : AlertCircle;
    return (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Icon className={`h-8 w-8 ${tone === "ok" ? "text-emerald-600" : "text-amber-600"}`} aria-hidden />
            <h1 className="mt-3 text-lg font-bold text-slate-900">{title}</h1>
            <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
        </div>
    );
}

export default function SsoLandingPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans antialiased">
            <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-slate-400" />}>
                <SsoResult />
            </Suspense>
        </div>
    );
}
