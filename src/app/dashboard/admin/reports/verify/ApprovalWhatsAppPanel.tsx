"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { openWhatsApp, whatsappDigits, whatsappShareHref } from "@/utils/reminderLinks";
import {
    APPROVAL_SHOWCASE_WHATSAPP_TEXT,
    approvalWhatsappRecipients,
} from "@/utils/approvalShowcaseMessage";

/** Opens the participant's WhatsApp chat (or the contact picker) with the approval message prefilled. */
export function openApprovalWhatsApp(phone: string): void {
    openWhatsApp(APPROVAL_SHOWCASE_WHATSAPP_TEXT, whatsappDigits(phone));
}

/**
 * Admin verify page, approved reports: one WhatsApp button per participant with the
 * "showcase your project" message prefilled, plus Copy message. Package palette.
 */
export default function ApprovalWhatsAppPanel({ section1, studentName }: { section1: unknown; studentName?: string }) {
    const [copied, setCopied] = useState(false);
    const recipients = approvalWhatsappRecipients(section1, studentName);

    return (
        <div className="mb-6 rounded-2xl border border-[#c9deb9] bg-[#eaf2df] p-4 sm:p-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <p className="text-sm font-bold text-[#0c312d]">Send congratulations on WhatsApp</p>
                <p className="text-xs font-medium text-[#61716c]">Asks permission to feature the project on CIEL PK social media.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                {recipients.map((person) => {
                    const digits = whatsappDigits(person.phone);
                    return (
                        <a
                            key={person.key}
                            href={digits ? `https://wa.me/${digits}?text=${encodeURIComponent(APPROVAL_SHOWCASE_WHATSAPP_TEXT)}` : whatsappShareHref(APPROVAL_SHOWCASE_WHATSAPP_TEXT)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                                event.preventDefault();
                                openApprovalWhatsApp(person.phone);
                            }}
                            title={digits ? `Opens a WhatsApp chat with +${digits}` : "No mobile number on file: WhatsApp opens with the message so you can pick the contact"}
                            className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl border border-[#9fcfae] bg-[#fffef9] px-3.5 py-2 text-sm font-semibold text-[#1f7a46] shadow-sm transition-colors hover:bg-[#e8f8ee]"
                        >
                            <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                            <span>
                                {person.name}
                                <span className="ml-1 text-xs font-medium text-[#61716c]">
                                    · {person.role}
                                    {digits ? "" : " · pick contact"}
                                </span>
                            </span>
                        </a>
                    );
                })}
                <button
                    type="button"
                    onClick={() => {
                        void navigator.clipboard
                            ?.writeText(APPROVAL_SHOWCASE_WHATSAPP_TEXT)
                            .then(() => {
                                setCopied(true);
                                window.setTimeout(() => setCopied(false), 2500);
                            })
                            .catch(() => setCopied(false));
                    }}
                    className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl border border-[#d9dfd4] bg-[#fffef9] px-3.5 py-2 text-sm font-semibold text-[#143f3b] shadow-sm transition-colors hover:bg-[#f6f7ee]"
                >
                    <Copy className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    {copied ? "Copied ✓" : "Copy message"}
                </button>
            </div>
        </div>
    );
}
