import { whatsappDigits } from "@/utils/reminderLinks";

/** CIEL PK support / admin WhatsApp (same number as the floating support button and footer). */
export const CIEL_PK_ADMIN_WHATSAPP = "923712243575";

type Props = {
    title?: string;
    creatorName?: string;
    /** Present in API responses for signed-in viewers who may open the record. */
    creatorPhone?: string;
    showAdmin?: boolean;
    className?: string;
};

/** The WhatsApp glyph (brand mark), drawn inline so it renders without an icon font. */
function WhatsAppGlyph({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
    );
}

/**
 * WhatsApp buttons on an opportunity's detail: the person who created it (when the viewer may see
 * their number) and CIEL PK admin. Each opens a prefilled chat naming the opportunity.
 */
export function OpportunityWhatsAppLinks({ title, creatorName, creatorPhone, showAdmin = true, className = "" }: Props) {
    const about = title?.trim() ? `"${title.trim()}"` : "an opportunity";
    const name = creatorName?.trim() ?? "";
    const creator = whatsappDigits(creatorPhone);
    const links: { key: string; label: string; hint: string; href: string }[] = [];
    if (creator) {
        links.push({
            key: "creator",
            label: name ? `WhatsApp ${name}` : "WhatsApp creator",
            hint: "Project creator",
            href: `https://wa.me/${creator}?text=${encodeURIComponent(`Hi${name ? ` ${name.split(/\s+/)[0]}` : ""}, I am contacting you about ${about} on CIEL PK.`)}`,
        });
    }
    if (showAdmin) {
        links.push({
            key: "admin",
            label: "WhatsApp CIEL PK admin",
            hint: "Support & questions",
            href: `https://wa.me/${CIEL_PK_ADMIN_WHATSAPP}?text=${encodeURIComponent(`Hi CIEL PK, I have a question about ${about}.`)}`,
        });
    }
    if (!links.length) return null;
    return (
        <div className={`flex flex-wrap items-center gap-3 ${className}`}>
            {links.map((l) => (
                <a
                    key={l.key}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 rounded-full bg-[#25D366] py-1.5 pl-1.5 pr-4 text-white shadow-md shadow-[#25D366]/35 ring-2 ring-[#25D366]/25 ring-offset-1 transition hover:bg-[#1ebe5d] hover:shadow-lg hover:shadow-[#25D366]/40"
                >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#25D366] transition group-hover:scale-105">
                        <WhatsAppGlyph className="h-5 w-5" />
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="text-sm font-bold">{l.label}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/85">{l.hint}</span>
                    </span>
                </a>
            ))}
        </div>
    );
}
