"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";

type Row = {
    id: string;
    kind: "view" | "save" | "interest" | "intro";
    status: string | null;
    note: string | null;
    admin_note: string | null;
    count: number;
    created_at: string;
    updated_at: string;
    investor: { id: string; name?: string; email?: string; organisation: string | null; account_status?: string } | null;
    venture: { id: string; name: string | null; university: string | null; founder: { id: string; name?: string; email?: string } | null } | null;
};
type Totals = { actions: number; investors: number; organisations: number; intros_pending: number; intros_with_founder: number };

const KIND_LABEL: Record<Row["kind"], string> = { view: "Viewed", save: "Saved", interest: "Marked interest", intro: "Requested introduction" };
const STATUS_LABEL: Record<string, string> = {
    pending: "Awaiting CIEL PK screening",
    screened: "Cleared — with founder",
    accepted: "Accepted by founder",
    declined: "Declined",
};

/** CIEL PK's Investor Activity Log: every signal from the Hub, and gate 1 (screening) on introductions. */
export default function InvestorActivityLog({ recordHref }: { recordHref: (ventureId: string) => string }) {
    const [rows, setRows] = useState<Row[]>([]);
    const [totals, setTotals] = useState<Totals | null>(null);
    const [loading, setLoading] = useState(true);
    const [kind, setKind] = useState<"" | Row["kind"]>("");
    const [busy, setBusy] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const q = kind ? `?kind=${kind}` : "";
            const res = await authenticatedFetch(`/api/v1/admin/paths/startup-business/investor-activity${q}`);
            const json = res?.ok ? await res.json() : null;
            setRows(Array.isArray(json?.items) ? (json.items as Row[]) : []);
            setTotals((json?.totals as Totals) || null);
        } catch {
            toast.error("Could not load investor activity");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind]);

    const screen = async (id: string, status: "screened" | "declined") => {
        const note = status === "declined" ? window.prompt("Reason for the investor (optional)") ?? "" : "";
        setBusy(id);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/paths/startup-business/investor-activity/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status, note: note || undefined }),
            });
            if (!res?.ok) {
                toast.error("Could not update the request");
                return;
            }
            toast.success(status === "screened" ? "Cleared — the founder has been asked to decide" : "Declined — the investor has been told");
            await load();
        } finally {
            setBusy(null);
        }
    };

    const tile = (n: number | string, label: string) => (
        <div className="rounded-[14px] bg-[#f6f8fa] px-4 py-3.5"><b className="block text-2xl">{loading ? "—" : n}</b><small className="text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">{label}</small></div>
    );

    return (
        <>
            <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-4">
                {tile(totals?.actions ?? 0, "Investor actions")}
                {tile(totals?.organisations ?? 0, "Investor organisations active")}
                {tile(totals?.intros_pending ?? 0, "Contact requests awaiting CIEL PK")}
                {tile(totals?.intros_with_founder ?? 0, "Cleared, with founder")}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
                {(["", "intro", "interest", "save", "view"] as const).map((k) => (
                    <button key={k || "all"} type="button" onClick={() => setKind(k)} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${kind === k ? "bg-[#14212b] text-white" : "bg-[#eef3f6] text-[#14212b]"}`}>
                        {k ? KIND_LABEL[k] : "All"}
                    </button>
                ))}
            </div>
            {!loading && rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">
                    No investor activity yet. When verified investors view, save, mark interest or request an introduction from the Investor Hub, it appears here for CIEL PK screening (gate 1 of 3).
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#e3e9ee]">
                    <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
                        <thead className="bg-[#f6f8fa] text-left text-[11px] uppercase tracking-wide text-[#5d6c78]">
                            <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Investor</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Venture</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"></th></tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t border-[#eef2f5] align-top">
                                    <td className="whitespace-nowrap px-3 py-2 text-[#5d6c78]">{new Date(r.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td>
                                    <td className="px-3 py-2"><b className="block">{r.investor?.name || "—"}</b><small className="text-[#5d6c78]">{r.investor?.organisation || r.investor?.email || ""}</small></td>
                                    <td className="px-3 py-2">{KIND_LABEL[r.kind]}{r.kind === "view" && r.count > 1 ? ` ×${r.count}` : ""}{r.note ? <small className="block text-[#5d6c78]">“{r.note}”</small> : null}</td>
                                    <td className="px-3 py-2">{r.venture ? <a href={recordHref(r.venture.id)} className="font-bold text-[#0b4b57] underline-offset-2 hover:underline">{r.venture.name || "Untitled"}</a> : "—"}<small className="block text-[#5d6c78]">{r.venture?.university || ""}{r.venture?.founder?.name ? ` · ${r.venture.founder.name}` : ""}</small></td>
                                    <td className="px-3 py-2">{r.kind === "intro" ? STATUS_LABEL[r.status || ""] || r.status : ""}{r.admin_note ? <small className="block text-[#5d6c78]">CIEL PK: {r.admin_note}</small> : null}</td>
                                    <td className="whitespace-nowrap px-3 py-2">
                                        {r.kind === "intro" && r.status === "pending" ? (
                                            <div className="flex gap-1.5">
                                                <button type="button" disabled={busy === r.id} onClick={() => void screen(r.id, "screened")} className="rounded-[9px] bg-[#2e9e5b] px-2.5 py-1 text-[11.5px] font-bold text-white disabled:opacity-50">Clear</button>
                                                <button type="button" disabled={busy === r.id} onClick={() => void screen(r.id, "declined")} className="rounded-[9px] border border-[#d9e1e6] bg-white px-2.5 py-1 text-[11.5px] font-bold text-[#5d6c78] disabled:opacity-50">Decline</button>
                                            </div>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
