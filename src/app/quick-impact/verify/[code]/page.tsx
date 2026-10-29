"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { apiMessages, verifyQuickWorkCertificate, type QuickWorkCertificateCheck } from "@/utils/quickWorkApi";
import { formatHours, sdgLabel, shortDate } from "@/utils/quickWorkRules";

type PageProps = { params: Promise<{ code: string }> };

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 sm:flex-row sm:gap-4">
            <dt className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="min-w-0 break-words text-sm font-semibold text-slate-900">{value}</dd>
        </div>
    );
}

/**
 * Public check behind a Quick Community Impact certificate's QR code and ID. Shows only that certificate's
 * own facts (no emails, student IDs, teammates or evidence). Nothing is recorded.
 */
export default function QuickImpactVerifyPage({ params }: PageProps) {
    const { code: rawCode } = use(params);
    const code = decodeURIComponent(rawCode || "").trim();
    const [result, setResult] = useState<QuickWorkCertificateCheck | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!code) {
            setError("This link has no certificate ID. Scan the QR code again or type the ID from the certificate.");
            return;
        }
        let cancelled = false;
        verifyQuickWorkCertificate(code)
            .then((r) => !cancelled && setResult(r))
            .catch((e) => !cancelled && setError(apiMessages(e).join(" ")));
        return () => {
            cancelled = true;
        };
    }, [code]);

    const verifiedOn = result?.verifiedAt
        ? new Date(result.verifiedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" })
        : "—";

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans antialiased">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[1.4px] text-[#287db8]">CIEL PK · Quick Community Impact</p>
                <h1 className="mt-1 text-lg font-bold text-slate-900">Certificate verification</h1>
                <p className="mt-1 break-all font-mono text-xs text-slate-500">{result?.code ?? (code || "No certificate ID")}</p>

                {!result && !error ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : null}

                {error ? (
                    <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg bg-[#fff0ed] px-3 py-3 text-sm text-[#9b3832]">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <span>{error}</span>
                    </div>
                ) : null}

                {result ? (
                    <>
                        <p className="mt-5 flex items-start gap-2 rounded-lg bg-[#e6f6f4] px-3 py-3 text-sm font-semibold text-[#0e7d74]">
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            Valid certificate — verified by faculty and given final approval by CIEL PK.
                        </p>
                        <dl className="mt-4">
                            <Row label="Student" value={result.holderName || "—"} />
                            <Row label="Activity" value={result.title || "—"} />
                            <Row label="Activity type" value={result.activityType || "—"} />
                            <Row label="Activity date" value={shortDate(result.activityDate)} />
                            <Row label="Verified hours" value={`${formatHours(result.minutes)} h`} />
                            <Row label="University" value={result.university || "—"} />
                            <Row
                                label="Participation"
                                value={result.participation === "team" ? `Team of ${result.teamSize} students` : "Individual"}
                            />
                            {sdgLabel(result.sdg) ? <Row label="SDG" value={sdgLabel(result.sdg) as string} /> : null}
                            <Row label="Verified on" value={verifiedOn} />
                        </dl>
                        <p className="mt-4 text-xs leading-relaxed text-slate-500">
                            Quick Community Impact is recorded separately from Structured Community Service and does not count towards the 16-hour
                            requirement, CII or rankings.
                        </p>
                    </>
                ) : null}

                <Link href="/" className="mt-5 inline-block text-sm font-bold text-[#0e7d74] hover:underline">
                    Go to CIEL PK →
                </Link>
            </div>
        </div>
    );
}
