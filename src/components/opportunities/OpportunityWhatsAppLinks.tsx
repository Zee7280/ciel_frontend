import { MessageCircle } from "lucide-react";
import { whatsappDigits } from "@/utils/reminderLinks";

/** CIEL PK support / admin WhatsApp (same number as the floating support button and footer). */
export const CIEL_PK_ADMIN_WHATSAPP = "923712243575";

type Props = {
    title?: string;
    creatorName?: string;
    /** Only present in API responses for the owner, designated reviewers and CIEL PK admin. */
    creatorPhone?: string;
    showAdmin?: boolean;
    className?: string;
};

/**
 * WhatsApp links on an opportunity's detail: the person who created it (when the viewer may see
 * their number) and CIEL PK admin. Each opens a prefilled chat naming the opportunity.
 */
export function OpportunityWhatsAppLinks({ title, creatorName, creatorPhone, showAdmin = true, className = "" }: Props) {
    const about = title?.trim() ? `"${title.trim()}"` : "an opportunity";
    const name = creatorName?.trim() ?? "";
    const creator = whatsappDigits(creatorPhone);
    const links: { key: string; label: string; href: string }[] = [];
    if (creator) {
        links.push({
            key: "creator",
            label: name ? `WhatsApp ${name} (creator)` : "WhatsApp creator",
            href: `https://wa.me/${creator}?text=${encodeURIComponent(`Hi${name ? ` ${name.split(/\s+/)[0]}` : ""}, I am contacting you about ${about} on CIEL PK.`)}`,
        });
    }
    if (showAdmin) {
        links.push({
            key: "admin",
            label: "WhatsApp CIEL PK admin",
            href: `https://wa.me/${CIEL_PK_ADMIN_WHATSAPP}?text=${encodeURIComponent(`Hi CIEL PK, I have a question about ${about}.`)}`,
        });
    }
    if (!links.length) return null;
    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            {links.map((l) => (
                <a
                    key={l.key}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-1.5 text-xs font-semibold text-[#128C4A] hover:bg-[#25D366]/20"
                >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                    {l.label}
                </a>
            ))}
        </div>
    );
}
