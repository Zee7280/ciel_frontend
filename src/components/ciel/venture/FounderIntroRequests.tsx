"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { INTRO_STATUS_LABEL, type FounderSignal } from "@/utils/investorActivity";

/**
 * Founder side of the Investor Hub: interest marks and introduction requests on the caller's own
 * venture. Gate 2 lives here — a CIEL PK-screened request waits for the founder's accept / decline,
 * and nothing is shared with the investor until "accept".
 */
export default function FounderIntroRequests({ compact = false }: { compact?: boolean }) {
    const [rows, setRows] = useState<FounderSignal[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = async () => {
        try {
            const res = await authenticatedFetch("/api/v1/paths/startup-business/investor-signals");
            const json = res?.ok ? await res.json() : null;
            setRows(Array.isArray(json?.data) ? (json.data as FounderSignal[]) : []);
        } catch {
            setRows([]);
        }
    };
    useEffect(() => {
        void load();
    }, []);

    const decide = async (id: string, decision: "accept" | "decline") => {
        setBusy(id);
        try {
            const res = await authenticatedFetch(`/api/v1/paths/startup-business/investor-signals/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ decision }),
            });
            if (!res?.ok) {
                const body = (await res?.json().catch(() => null)) as { message?: string } | null;
                toast.error(body?.message || "Could not record your decision");
                return;
            }
            toast.success(decision === "accept" ? "Introduction accepted — your contact details are now visible to this investor." : "Introduction declined.");
            await load();
        } finally {
            setBusy(null);
        }
    };

    if (!rows || rows.length === 0) return null;
    const intros = rows.filter((r) => r.kind === "intro");
    const interests = rows.filter((r) => r.kind === "interest");
    const waiting = intros.filter((r) => r.status === "screened");

    return (
        <div className={`mt-3 rounded-[14px] border border-[#cfe6df] bg-white px-4 py-3 text-[13px] ${compact ? "" : "sm:px-5"}`}>
            <b className="block">Introduction requests {waiting.length ? <span className="ml-1 rounded-full bg-[#ffe7b3] px-2 py-0.5 text-[10.5px] font-black text-[#7a4b00]">{waiting.length} waiting for you</span> : null}</b>
            <p className="mt-1 mb-2 text-[12px] text-[#5d6c78]">
                Three gates before any contact is shared: CIEL PK screens the request, you decide, then the investor sees your contact details. {interests.length ? `${interests.length} investor${interests.length === 1 ? "" : "s"} marked interest.` : ""}
            </p>
            <ul className="m-0 list-none space-y-2 p-0">
                {intros.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f8fa] px-3 py-2">
                        <div className="min-w-0">
                            <b className="block text-[12.5px] text-[#14212b]">{r.investor.name ? `${r.investor.name} · ` : ""}{r.investor.organisation}{r.investor.type ? ` · ${r.investor.type}` : ""}</b>
                            <small className="block text-[11px] text-[#5d6c78]">
                                {INTRO_STATUS_LABEL[r.status || ""] || r.status} · {new Date(r.created_at).toLocaleDateString()}
                                {r.note ? ` · “${r.note}”` : ""}
                            </small>
                        </div>
                        {r.status === "screened" ? (
                            <div className="flex gap-2">
                                <button type="button" disabled={busy === r.id} onClick={() => void decide(r.id, "accept")} className="rounded-[10px] bg-[#2e9e5b] px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">Accept</button>
                                <button type="button" disabled={busy === r.id} onClick={() => void decide(r.id, "decline")} className="rounded-[10px] border border-[#d9e1e6] bg-white px-3 py-1.5 text-[12px] font-bold text-[#5d6c78] disabled:opacity-50">Decline</button>
                            </div>
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}
