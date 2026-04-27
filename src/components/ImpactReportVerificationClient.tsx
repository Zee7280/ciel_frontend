"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { buildPublicImpactVerificationFetchUrl } from "@/utils/reportVerificationUrl";

type Props = {
    verificationKey: string;
};

type VerifyJson = {
    success?: boolean;
    verified?: boolean;
    project_title?: string;
    verified_at?: string;
    message?: string;
    error?: string;
};

export default function ImpactReportVerificationClient({ verificationKey }: Props) {
    const [state, setState] = useState<"loading" | "ok" | "not_verified" | "not_found" | "error">("loading");
    const [body, setBody] = useState<VerifyJson | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const targetUrl = buildPublicImpactVerificationFetchUrl(verificationKey);
            if (!targetUrl) {
                if (!cancelled) {
                    setState("error");
                    setBody({ message: "Verification service is not configured (NEXT_PUBLIC_BACKEND_BASE_URL)." });
                }
                return;
            }
            try {
                const res = await fetch(targetUrl, {
                    method: "GET",
                    headers: { Accept: "application/json" },
                    cache: "no-store",
                });
                const json = (await res.json().catch(() => ({}))) as VerifyJson;
                if (cancelled) return;
                setBody(json);
                if (res.ok) {
                    if (json.verified === true) setState("ok");
                    else setState("not_verified");
                } else if (res.status === 404) {
                    setState("not_found");
                } else {
                    setState("error");
                }
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
    }, [verificationKey]);

    return (
        <div className="min-h-[100dvh] bg-slate-50 px-4 py-16 font-sans text-slate-900">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex justify-center">
                    <img src="/iel-pk-logo.png" alt="CIEL" className="h-14 w-14 object-contain" width={256} height={256} />
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
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">Verified impact record</h1>
                        <p className="text-sm font-medium text-slate-500">
                            This CIEL institutional impact report is on file as verified.
                        </p>
                        {body?.project_title ? (
                            <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                                {body.project_title}
                            </p>
                        ) : null}
                        {body?.verified_at ? (
                            <p className="text-xs font-medium text-slate-400">
                                Verified{" "}
                                {new Date(body.verified_at).toLocaleString(undefined, {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                })}
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
                            {state === "not_found"
                                ? "Link not found"
                                : state === "not_verified"
                                  ? "Not verified"
                                  : "Could not verify"}
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            {body?.message ||
                                (state === "not_found"
                                    ? "This verification link does not match any report on file."
                                    : state === "not_verified"
                                      ? "This report is on file but is not yet eligible for public verification (for example, awaiting payment or final approval)."
                                      : "Verification is temporarily unavailable or this link is invalid.")}
                        </p>
                    </div>
                )}

                <p className="mt-8 border-t border-slate-100 pt-6 text-center text-[11px] font-medium text-slate-400">
                    Personal data is not shown on this page. For questions, contact your institution or CIEL support.
                </p>
                <div className="mt-4 text-center">
                    <Link href="/" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
