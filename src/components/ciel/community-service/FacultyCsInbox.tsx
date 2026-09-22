"use client";

import { useState } from "react";
import Link from "next/link";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";

export type FacultyInboxItem = {
    key: string;
    kind: "opp" | "report";
    title: string;
    meta: string;
    href: string;
    cta: string;
    studentEmail?: string | null;
};

export function FacultyCsInbox({
    items,
    loading,
    hideEmpty = false,
}: {
    items: FacultyInboxItem[];
    loading?: boolean;
    hideEmpty?: boolean;
}) {
    const [secure, setSecure] = useState<FacultyInboxItem | null>(null);

    if (hideEmpty && !loading && items.length === 0) return null;

    return (
        <>
            <div className="rounded-[18px] border border-[#cfe3de] bg-[linear-gradient(135deg,#f2fbf7,#fff)] p-4 shadow-[0_8px_24px_rgba(23,75,67,.06)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-[#16313d]">
                            Approvals waiting for you
                            <span className="rounded-full bg-[#174b43] px-2 py-0.5 text-[11px] font-bold text-white">{items.length}</span>
                        </h3>
                        <p className="mt-1 text-[11.5px] text-[#4f6068]">
                            Open the Flashcard and approve in one click. Revision and rejection ask for a short comment.
                        </p>
                    </div>
                </div>
                {loading ? (
                    <p className="mt-3 text-sm text-slate-500">Loading approvals…</p>
                ) : items.length === 0 ? (
                    <div className="mt-3 rounded-[14px] border border-[#dde8e6] bg-white px-3 py-6 text-center text-sm text-slate-600">
                        <b>Nothing waiting</b>
                        <p className="mt-1 text-[12px] text-slate-500">
                            New Flashcards appear here the moment a student submits an opportunity or a report.
                        </p>
                    </div>
                ) : (
                    <div className="mt-2 space-y-2.5">
                        {items.map((item) => (
                            <div
                                key={item.key}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#dde8e6] bg-white px-3 py-2.5"
                            >
                                <div className="min-w-0 flex-1">
                                    <b className="block text-[13.5px] text-[#16313d]">{item.title}</b>
                                    <small className="mt-0.5 block text-[11px] text-[#4f6068]">{item.meta}</small>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link href={item.href} className="rounded-full bg-[#0e7d74] px-3.5 py-1.5 text-[11px] font-extrabold text-white">
                                        {item.cta}
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setSecure(item)}
                                        className="rounded-full bg-[#edf4fb] px-3 py-1.5 text-[11px] font-extrabold text-[#376d9f]"
                                    >
                                        ✉ Secure Review Link
                                    </button>
                                    <Link href={item.href} className="rounded-full bg-[#f4e3b8] px-3 py-1.5 text-[11px] font-extrabold text-[#7a4b00]">
                                        ✏ Revision
                                    </Link>
                                    <Link href={item.href} className="rounded-full bg-[#f8d4d4] px-3 py-1.5 text-[11px] font-extrabold text-[#9a2b2b]">
                                        ✕ Reject
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {secure ? <SecureReviewModal item={secure} onClose={() => setSecure(null)} /> : null}
        </>
    );
}

function SecureReviewModal({ item, onClose }: { item: FacultyInboxItem; onClose: () => void }) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}${item.href}`;
    const kindLabel = item.kind === "opp" ? "Opportunity Flashcard" : "Community Service Report";
    const subject = `Community Service ${item.kind === "opp" ? "Opportunity" : "Report"} Review Required — ${item.title}`;
    const mail = `Your attention is required for the Community Service ${kindLabel.toLowerCase()} “${item.title}”.\n\nPlease review and select Approve, Request Revision or Reject using this signed-in dashboard link:\n${link}\n\nThe link writes back to the same master record; it never creates a duplicate project.\n\nRegards,\nCIEL PK`;
    const wa = `Your attention is required for “${item.title}”. Please review the ${kindLabel} and complete the pending action here: ${link}`;

    return (
        <div
            className="fixed inset-0 z-[110] overflow-auto bg-[rgba(4,37,43,0.55)] p-5"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="mx-auto mt-8 w-full max-w-[560px] overflow-hidden rounded-[22px] bg-white">
                <div className="flex items-center gap-2.5 bg-[linear-gradient(115deg,#04252b,#0e5f63_60%,#12a5a0_120%)] px-5 py-4 text-white">
                    <b className="text-[13.5px]">Secure review link</b>
                    <button type="button" onClick={onClose} className="ml-auto h-7 w-7 rounded-full bg-white/20 text-[13px] text-white" aria-label="Close">
                        ✕
                    </button>
                </div>
                <div className="space-y-3 px-5 py-4 text-[12.5px] text-[#3f5661]">
                    <p>
                        Share the same dashboard record — version-specific, signed-in. This does not create a duplicate project.
                    </p>
                    <input readOnly value={link} className="w-full rounded-xl border border-[#dde5ea] bg-[#f7fafb] px-3 py-2 text-[11px]" />
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="rounded-full bg-[#eef2f3] px-3 py-1.5 text-[11px] font-extrabold text-[#29454f]"
                            onClick={() => void navigator.clipboard.writeText(link)}
                        >
                            Copy link
                        </button>
                        <a href={mailtoHref(item.studentEmail || "", subject, mail)} className="rounded-full bg-[#0e7d74] px-3 py-1.5 text-[11px] font-extrabold text-white">
                            Email template
                        </a>
                        <a href={whatsappShareHref(wa)} className="rounded-full bg-[#25d366] px-3 py-1.5 text-[11px] font-extrabold text-white">
                            WhatsApp template
                        </a>
                        <Link href={item.href} className="rounded-full bg-[#174b43] px-3 py-1.5 text-[11px] font-extrabold text-white">
                            Open review
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
