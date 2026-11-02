"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

type Kind = "fyp" | "venture";

type VerifyJson = {
    success?: boolean;
    verified?: boolean;
    kind?: Kind;
    project_title?: string;
    venture_name?: string;
    university?: string | null;
    school?: string | null;
    degree?: string | null;
    route?: string | null;
    stage?: string | null;
    faculty?: string | null;
    program?: string | null;
    supervisor_name?: string | null;
    sdgs?: number[];
    badge_level?: string | null;
    rank?: number | null;
    of?: number | null;
    scope?: string | null;
    verification_code?: string | null;
    verified_at?: string;
    status?: string;
    message?: string;
};

const LABEL: Record<Kind, { noun: string; heading: string; lead: string }> = {
    fyp: { noun: "FYP / thesis", heading: "Verified FYP record", lead: "This Final Year Project is on file as supervisor-approved on CIEL PK." },
    venture: { noun: "venture", heading: "Verified venture record", lead: "This student venture is on file as faculty-approved on CIEL PK." },
};

const STATUS_LABEL: Record<string, string> = {
    pending: "still under faculty review",
    revisions_requested: "sent back for a revision",
    revision_requested: "sent back for a revision",
    rejected: "not approved",
    not_started: "not yet submitted for review",
};

export default function PathVerificationClient({ kind, id }: { kind: Kind; id: string }) {
    const [state, setState] = useState<"loading" | "ok" | "not_verified" | "not_found" | "error">("loading");
    const [body, setBody] = useState<VerifyJson | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/v1/public/paths/${kind}/${encodeURIComponent(id)}/verification`, {
                    headers: { Accept: "application/json" },
                    cache: "no-store",
                });
                const json = (await res.json().catch(() => ({}))) as VerifyJson;
                if (cancelled) return;
                setBody(json);
                if (res.ok) setState(json.verified === true ? "ok" : "not_verified");
                else if (res.status === 404) setState("not_found");
                else setState("error");
            } catch {
                if (!cancelled) {
                    setState("error");
                    setBody({ message: "Network error." });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [kind, id]);

    const copy = LABEL[kind];
    const title = kind === "fyp" ? body?.project_title : body?.venture_name;
    const facts = [
        body?.university,
        kind === "fyp" ? body?.school : body?.faculty,
        kind === "fyp" ? body?.degree : body?.program,
        kind === "fyp" ? body?.route : body?.stage,
    ].filter((v): v is string => Boolean(v));

    return (
        <div className="min-h-[100dvh] bg-slate-50 px-4 py-16 font-sans text-slate-900">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex justify-center">
                    <img src="/iel-pk-logo-192.webp" alt="CIEL" className="h-14 w-14 object-contain" width={56} height={56} />
                </div>

                {state === "loading" ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-slate-600">
                        <Loader2 className="h-10 w-10 animate-spin text-slate-400" aria-hidden />
                        <p className="text-center text-sm font-medium">Checking verification…</p>
                    </div>
                ) : state === "ok" ? (
                    <div className="space-y-4 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                            <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">{copy.heading}</h1>
                        <p className="text-sm font-medium text-slate-500">{copy.lead}</p>
                        {title ? (
                            <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">{title}</p>
                        ) : null}
                        {facts.length ? <p className="text-xs font-medium text-slate-500">{facts.join(" · ")}</p> : null}
                        {body?.supervisor_name ? (
                            <p className="text-xs font-medium text-slate-500">Supervised by {body.supervisor_name}</p>
                        ) : null}
                        {body?.sdgs?.length ? (
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {body.sdgs.map((n) => (
                                    <span key={n} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">SDG {n}</span>
                                ))}
                            </div>
                        ) : null}
                        {body?.rank != null && body?.of != null ? (
                            <p className="text-sm font-semibold text-slate-700">
                                Ranked #{body.rank} of {body.of}
                                {body.scope ? ` · ${body.scope}` : ""}
                                {body.badge_level ? ` · ${body.badge_level}` : ""}
                            </p>
                        ) : null}
                        {body?.verification_code ? <p className="text-xs font-mono font-medium text-slate-400">{body.verification_code}</p> : null}
                        {body?.verified_at ? (
                            <p className="text-xs font-medium text-slate-400">
                                Approved {new Date(body.verified_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                        ) : null}
                        <div className="flex items-center justify-center gap-2 pt-2 text-xs font-semibold text-emerald-800">
                            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                            Authenticity confirmed by CIEL
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                            <ShieldAlert className="h-9 w-9 text-amber-700" aria-hidden />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                            {state === "not_found" ? "Link not found" : state === "not_verified" ? "Not verified" : "Could not verify"}
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            {state === "not_found"
                                ? `This verification link does not match any ${copy.noun} record on file.`
                                : state === "not_verified"
                                  ? `This ${copy.noun} record is on file, but is ${STATUS_LABEL[(body?.status || "").trim()] || "not yet approved"}.`
                                  : body?.message || "Verification is temporarily unavailable or this link is invalid."}
                        </p>
                    </div>
                )}

                <p className="mt-8 border-t border-slate-100 pt-6 text-center text-[11px] font-medium text-slate-400">
                    Personal data is not shown on this page. For questions, contact your institution or CIEL support.
                </p>
                <div className="mt-4 text-center">
                    <Link href="/" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Back to home</Link>
                </div>
            </div>
        </div>
    );
}
