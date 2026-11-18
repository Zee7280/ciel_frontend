"use client";

import { useEffect, useState } from "react";
import { Award, ExternalLink, HandHeart } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { contributionLine, type ContributionCertificate } from "@/components/ContributionCertificateClient";

export const MY_CONTRIBUTIONS_API = "/api/v1/contributions/me";

type Item = ContributionCertificate & { id: string; certificate_url: string };

function fmtDate(value?: string | null): string {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * "Their contributions will be reflected in their CIEL PK accounts": every resource contribution a
 * verified report credited to this account's email, with the public certificate. Renders nothing
 * until there is at least one, so dashboards stay unchanged for everyone else.
 */
export default function MyResourceContributions({ className = "" }: { className?: string }) {
    const [items, setItems] = useState<Item[]>([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await authenticatedFetch(MY_CONTRIBUTIONS_API, {}, { redirectToLogin: false });
                if (!res || !res.ok) return;
                const body = (await res.json()) as { items?: Item[] };
                if (!cancelled && Array.isArray(body.items)) setItems(body.items.filter((i) => i && i.id));
            } catch {
                /* dashboards never break on this card */
            }
        };
        void Promise.resolve().then(load);
        return () => {
            cancelled = true;
        };
    }, []);

    if (!items.length) return null;

    return (
        <section
            data-ciel-my-contributions
            className={`rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm ${className}`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <HandHeart className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Resource contributions</p>
                        <h3 className="text-base font-bold text-slate-900">
                            Credited to you in {items.length} verified {items.length === 1 ? "project" : "projects"}
                        </h3>
                    </div>
                </div>
                <p className="max-w-sm text-xs text-slate-600">
                    Student teams named you as a contributor and CIEL PK verified their reports. Each one carries a public certificate.
                </p>
            </div>

            <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {items.map((item) => (
                    <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-bold text-slate-900">{item.project_title || "Community Service project"}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Led by {item.lead_name || "a student team"}
                            {item.partner_name ? ` · ${item.partner_name}` : ""}
                            {item.verified_at ? ` · verified ${fmtDate(item.verified_at)}` : ""}
                        </p>
                        <p className="mt-2 text-sm text-emerald-800">
                            <strong>{contributionLine(item)}</strong>
                            {item.purpose ? <span className="text-slate-700"> — {item.purpose}</span> : null}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                            <a
                                href={item.certificate_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700"
                            >
                                <Award className="h-3.5 w-3.5" /> Certificate
                            </a>
                            {item.report_verify_url ? (
                                <a
                                    href={item.report_verify_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold text-[#0e7d74] hover:underline"
                                >
                                    Verified report <ExternalLink className="h-3 w-3" />
                                </a>
                            ) : null}
                            <span className="font-mono text-slate-400">{item.certificate_code}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
