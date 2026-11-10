"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import clsx from "clsx";
import { mailtoHref, whatsappOpenHref, whatsappShareHref } from "@/utils/reminderLinks";

async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const field = document.createElement("textarea");
            field.value = text;
            field.style.position = "fixed";
            field.style.opacity = "0";
            document.body.appendChild(field);
            field.select();
            const ok = document.execCommand("copy");
            field.remove();
            return ok;
        } catch {
            return false;
        }
    }
}

/**
 * The Email + WhatsApp (+ Copy) pair every coursework screen uses to reach a student. Email is a
 * plain `mailto:` (the global bridge offers Gmail/Outlook when no mail app answers). WhatsApp opens
 * the student's own chat when their number is on file, otherwise WhatsApp with the message ready so
 * the teacher picks the contact; the click goes through `whatsappOpenHref`, which is what works on
 * this device (WhatsApp Web on a desktop, the app on a phone). Nothing is sent by CIEL PK.
 */
export function CourseworkNudgeButtons({
    email,
    whatsappDigits,
    subject,
    body,
    label = "Nudge student:",
    variant = "pill",
    className,
}: {
    email?: string | null;
    /** wa.me digits for the student (see `contactWhatsappDigits`); "" or undefined → pick-contact mode. */
    whatsappDigits?: string;
    subject: string;
    body: string;
    label?: string | null;
    /** "pill": the compact Live Drafts chips; "card": the bordered buttons of a flashcard footer. */
    variant?: "pill" | "card";
    className?: string;
}) {
    const [copied, setCopied] = useState(false);
    const to = email && email.includes("@") ? email : "";
    const digits = (whatsappDigits || "").replace(/\D/g, "");
    const direct = digits.length >= 10;
    const text = `${subject}\n\n${body}`;
    const waHref = direct ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : whatsappShareHref(text);

    const base =
        variant === "pill"
            ? "inline-flex cursor-pointer items-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[10px] font-black transition hover:brightness-95"
            : "ciel-transition flex cursor-pointer items-center gap-1.5 rounded-ciel-xs border-2 border-ciel-border bg-white px-3 py-2 text-xs font-bold text-ciel-text-mid hover:border-ciel-gold/40";
    const emailCls = variant === "pill" ? "bg-[#edf4fb] text-[#376d9f]" : "";
    const waCls = variant === "pill" ? "bg-[#e8f8ee] text-[#1f7a46]" : "";
    const copyCls = variant === "pill" ? "bg-[#f1f4f6] text-[#516772]" : "";

    const openWhatsApp = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const href = whatsappOpenHref(text, digits);
        const opened = window.open(href, "_blank", "noopener,noreferrer");
        if (!opened) window.location.href = href;
    };

    return (
        <div className={clsx("flex flex-wrap items-center gap-2", className)}>
            {label ? <span className="text-[10px] font-bold text-[#70808a]">{label}</span> : null}
            {to ? (
                <a href={mailtoHref(to, subject, body)} title={`Email ${to}`} onClick={(e) => e.stopPropagation()} className={clsx(base, emailCls)}>
                    <Mail className="h-3.5 w-3.5" /> Email
                </a>
            ) : null}
            <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={openWhatsApp}
                title={direct ? `Opens a WhatsApp chat with +${digits}` : "No WhatsApp number on the student's profile: WhatsApp opens with the message so you can pick the contact"}
                className={clsx(base, waCls)}
            >
                <MessageCircle className="h-3.5 w-3.5" /> {direct ? "WhatsApp" : "WhatsApp (pick contact)"}
            </a>
            <button
                type="button"
                title="Copy the message to paste it anywhere (WhatsApp, SMS, email)"
                onClick={(e) => {
                    e.stopPropagation();
                    void copyText(text).then((ok) => {
                        setCopied(ok);
                        if (ok) window.setTimeout(() => setCopied(false), 2500);
                    });
                }}
                className={clsx(base, copyCls)}
            >
                {copied ? "Copied ✓" : "Copy message"}
            </button>
        </div>
    );
}
