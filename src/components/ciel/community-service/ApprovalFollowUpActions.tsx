"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { whatsappShareHref } from "@/utils/reminderLinks";

export type FollowUpRole = "student" | "faculty" | "partner" | "admin" | "none" | string | null | undefined;

function roleLabel(role: FollowUpRole, fallback: string) {
    if (role === "faculty") return fallback || "Faculty";
    if (role === "partner") return fallback || "Partner / NGO";
    if (role === "admin") return "CIEL PK";
    if (role === "student") return fallback || "Student";
    return fallback || "Reviewer";
}

export function buildFollowUpCopy(input: {
    title: string;
    publicCode?: string | null;
    currentlyWith?: string | null;
    nextStep?: string | null;
    openPath?: string | null;
}) {
    const publicCode = input.publicCode || "";
    const subject = publicCode
        ? `CIEL PK Community Service Approval · ${publicCode}`
        : `CIEL PK reminder — ${input.title}`;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const openUrl = input.openPath ? `${origin}${input.openPath}` : origin;
    const emailBody = [
        "CIEL PK · Approval Reminder",
        `Opportunity: ${input.title}`,
        publicCode ? `ID: ${publicCode}` : "",
        `Current Status: ${input.currentlyWith || "In review"}`,
        input.nextStep ? `Next: ${input.nextStep}` : "",
        "",
        "Please review the opportunity when convenient.",
        openUrl ? `Open Approval: ${openUrl}` : "",
    ]
        .filter((line) => line !== "")
        .join("\n");
    const whatsappText = publicCode
        ? `Hi, ${publicCode} — ${input.title} is awaiting your approval on CIEL PK.\nPlease review here: ${openUrl}`
        : `Hi, ${input.title} is awaiting review on CIEL PK.`;
    return { subject, emailBody, whatsappText };
}

export async function postRemindReviewer(opportunityId: string): Promise<string> {
    const res = await authenticatedFetch(`/api/v1/student/opportunity/${encodeURIComponent(opportunityId)}/remind-reviewer`, {
        method: "POST",
    });
    const body = await res?.json().catch(() => null);
    const raw = body?.message;
    const message = Array.isArray(raw) ? raw.filter(Boolean).join(" ") : raw;
    if (!res?.ok || body?.success === false) {
        throw new Error(typeof message === "string" && message ? message : "Could not send the reminder.");
    }
    return typeof message === "string" && message ? message : "Reminder sent.";
}

/** Email (platform) + WhatsApp (share sheet) for the current pending reviewer. No gate change. */
export function ApprovalFollowUpActions({
    opportunityId,
    currentlyWithRole,
    currentlyWith,
    title,
    publicCode,
    nextStep,
    openPath,
    className,
}: {
    opportunityId: string;
    currentlyWithRole?: FollowUpRole;
    currentlyWith?: string | null;
    title: string;
    publicCode?: string | null;
    nextStep?: string | null;
    openPath?: string | null;
    className?: string;
}) {
    const [sending, setSending] = useState(false);
    const role = String(currentlyWithRole || "").toLowerCase();
    if (!opportunityId || !["faculty", "partner", "admin"].includes(role)) return null;
    const who = roleLabel(role, currentlyWith || "");
    const copy = buildFollowUpCopy({ title, publicCode, currentlyWith, nextStep, openPath });

    const sendEmail = async () => {
        if (sending) return;
        setSending(true);
        try {
            const message = await postRemindReviewer(opportunityId);
            toast.success(message);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not send the reminder.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className={className || "grid w-full gap-2"}>
            <button
                type="button"
                disabled={sending}
                onClick={() => void sendEmail()}
                className="w-full rounded-[9px] bg-[#edf4fb] px-2.5 py-2 text-[10px] font-black text-[#376d9f] disabled:opacity-60"
            >
                {sending ? "Sending…" : `Email ${who}`}
            </button>
            <a
                href={whatsappShareHref(copy.whatsappText)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-[9px] bg-[#e8f8ee] px-2.5 py-2 text-center text-[10px] font-black text-[#1f7a46]"
            >
                WhatsApp {who}
            </a>
        </div>
    );
}

export function ContactStudentActions({
    studentEmail,
    title,
    publicCode,
}: {
    studentEmail?: string | null;
    title: string;
    publicCode?: string | null;
}) {
    const code = publicCode || "";
    const subject = code ? `CIEL PK · ${code} — draft still in progress` : `CIEL PK reminder — ${title}`;
    const body = [
        "CIEL PK · Linked draft",
        `Opportunity: ${title}`,
        code ? `ID: ${code}` : "",
        "This is still a student draft. Approval is not requested yet.",
        "Please submit the opportunity when it is ready.",
    ]
        .filter(Boolean)
        .join("\n");
    const mailto = studentEmail
        ? `mailto:${encodeURIComponent(studentEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        : "";
    return (
        <div className="grid w-full gap-2">
            {mailto ? (
                <a href={mailto} className="block w-full rounded-[9px] bg-[#edf4fb] px-2.5 py-2 text-center text-[10px] font-black text-[#376d9f]">
                    Email Student
                </a>
            ) : null}
            <a
                href={whatsappShareHref(body)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-[9px] bg-[#e8f8ee] px-2.5 py-2 text-center text-[10px] font-black text-[#1f7a46]"
            >
                WhatsApp Student
            </a>
        </div>
    );
}
