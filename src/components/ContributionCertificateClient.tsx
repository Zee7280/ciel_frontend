"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Loader2, Printer, ShieldAlert } from "lucide-react";

export const CONTRIBUTION_CERTIFICATE_API = "/api/v1/public/contributions";

export type ContributionCertificate = {
    verified?: boolean;
    contributor_name?: string;
    certificate_code?: string;
    certificate_url?: string;
    project_title?: string;
    project_code?: string | null;
    lead_name?: string;
    resource_type?: string;
    amount?: string;
    unit?: string;
    purpose?: string;
    sources?: string[];
    verification?: string[];
    sdg?: number | null;
    partner_name?: string | null;
    verified_at?: string;
    report_verify_url?: string | null;
    acknowledged_at?: string;
};

export function contributionLine(c: ContributionCertificate): string {
    const qty = [c.amount, c.unit].filter((v) => v && String(v).trim()).join(" ");
    return [qty, c.resource_type].filter((v) => v && String(v).trim()).join(" · ") || "Contribution";
}

function fmtDate(value?: string | null): string {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Public, print-friendly certificate for a Section 5 resource contributor named in a verified report. */
export default function ContributionCertificateClient({ token }: { token: string }) {
    const [status, setStatus] = useState<"loading" | "ok" | "missing" | "error">("loading");
    const [cert, setCert] = useState<ContributionCertificate | null>(null);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!token.trim()) {
                setStatus("missing");
                return;
            }
            try {
                const res = await fetch(`${CONTRIBUTION_CERTIFICATE_API}/${encodeURIComponent(token)}`, {
                    cache: "no-store",
                });
                if (cancelled) return;
                if (res.status === 404) {
                    setStatus("missing");
                    return;
                }
                if (!res.ok) {
                    setStatus("error");
                    return;
                }
                const body = (await res.json()) as ContributionCertificate;
                setCert(body);
                setStatus(body?.verified ? "ok" : "missing");
            } catch {
                if (!cancelled) setStatus("error");
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [token]);

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f7f8]">
                <Loader2 className="h-9 w-9 animate-spin text-[#0e7d74]" />
            </div>
        );
    }

    if (status !== "ok" || !cert) {
        return (
            <div className="min-h-screen bg-[#f4f7f8] px-4 py-10">
                <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
                    <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
                    <h1 className="mt-3 text-xl font-bold text-slate-900">
                        {status === "missing" ? "Certificate not found" : "Could not load this certificate"}
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        {status === "missing"
                            ? "This link does not match any verified contribution on CIEL PK. Check the link in your email, or contact the team lead."
                            : "Please try again in a moment."}
                    </p>
                    <Link href="/" className="mt-5 inline-block text-sm font-semibold text-[#0e7d74] hover:underline">
                        Go to cielpk.com
                    </Link>
                </div>
            </div>
        );
    }

    const verifiedOn = fmtDate(cert.verified_at);
    const sources = (cert.sources || []).filter(Boolean);

    return (
        <div className="min-h-screen bg-[#f4f7f8] px-4 py-8 print:bg-white print:p-0">
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-4 flex items-center justify-between print:hidden">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verified contribution</p>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <Printer className="h-3.5 w-3.5" /> Print / save as PDF
                    </button>
                </div>

                <article
                    data-ciel-contribution-certificate
                    className="overflow-hidden rounded-2xl border border-[#cfe3df] bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none"
                >
                    <div className="border-b border-[#cfe3df] bg-[#0b2a33] px-6 py-6 text-white sm:px-10">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/certificate-iel-pk-logo.png"
                                    alt="CIEL PK"
                                    width={48}
                                    height={48}
                                    className="h-12 w-12 rounded-full bg-white object-contain p-1"
                                />
                                <div>
                                    <p className="text-sm font-bold leading-tight">Community Impact Education Lab</p>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">CIEL PK · Pakistan</p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Verified by CIEL PK
                            </span>
                        </div>
                        <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">Certificate of Contribution</p>
                        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{cert.contributor_name || "Contributor"}</h1>
                    </div>

                    <div className="px-6 py-7 sm:px-10">
                        <p className="text-[15px] leading-relaxed text-slate-700">
                            This certifies that <strong className="text-slate-900">{cert.contributor_name || "the contributor"}</strong>{" "}
                            contributed <strong className="text-slate-900">{contributionLine(cert)}</strong> to the community service project{" "}
                            <strong className="text-slate-900">&ldquo;{cert.project_title || "Community Service project"}&rdquo;</strong>
                            {cert.project_code ? <span className="text-slate-500"> ({cert.project_code})</span> : null}, led by{" "}
                            <strong className="text-slate-900">{cert.lead_name || "a student team"}</strong>
                            {cert.partner_name ? (
                                <>
                                    {" "}
                                    with <strong className="text-slate-900">{cert.partner_name}</strong>
                                </>
                            ) : null}
                            . The project report was verified by CIEL PK{verifiedOn ? ` on ${verifiedOn}` : ""}.
                        </p>

                        {cert.purpose ? (
                            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">What it made possible</p>
                                <p className="mt-1 text-sm text-slate-800">{cert.purpose}</p>
                            </div>
                        ) : null}

                        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                            {sources.length ? (
                                <div>
                                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Contribution source</dt>
                                    <dd className="mt-0.5 text-slate-800">{sources.join(", ")}</dd>
                                </div>
                            ) : null}
                            {cert.sdg ? (
                                <div>
                                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Primary SDG</dt>
                                    <dd className="mt-0.5 text-slate-800">SDG {cert.sdg}</dd>
                                </div>
                            ) : null}
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Certificate ID</dt>
                                <dd className="mt-0.5 font-mono text-slate-800">{cert.certificate_code}</dd>
                            </div>
                            {verifiedOn ? (
                                <div>
                                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Report verified</dt>
                                    <dd className="mt-0.5 text-slate-800">{verifiedOn}</dd>
                                </div>
                            ) : null}
                        </dl>

                        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                            <p className="text-xs text-slate-500">
                                Anyone can confirm this certificate at cielpk.com using the link in the email or the certificate ID.
                            </p>
                            {cert.report_verify_url ? (
                                <a
                                    href={cert.report_verify_url}
                                    className="text-sm font-semibold text-[#0e7d74] hover:underline print:hidden"
                                >
                                    See the verified impact report →
                                </a>
                            ) : null}
                        </div>
                    </div>
                </article>

                <p className="mt-6 text-center text-xs text-slate-500 print:hidden">
                    Contributed to a project on CIEL PK?{" "}
                    <Link href="/signup" className="font-semibold text-[#0e7d74] hover:underline">
                        Register with the same email
                    </Link>{" "}
                    and every verified contribution appears on your impact wall.
                </p>
            </div>
        </div>
    );
}
