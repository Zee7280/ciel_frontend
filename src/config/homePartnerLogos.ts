/** Public partner logos on S3 — not stored in `public/partners/` (repo size). */
export const PARTNER_LOGOS_S3_BASE =
    (process.env.NEXT_PUBLIC_PARTNER_LOGOS_BASE_URL ?? "").replace(/\/+$/, "") ||
    "https://ciel-storage-2026.s3.eu-north-1.amazonaws.com/marketing/partners";

export type HomePartnerLogo = {
    /** Filename under `marketing/partners/` on S3 */
    file: string;
    alt: string;
};

export const HOME_PARTNER_LOGOS: readonly HomePartnerLogo[] = [
    { file: "partner-aabroo.png", alt: "Aabroo" },
    { file: "partner-lahore-ka-ravi.png", alt: "Lahore ka Ravi" },
    { file: "partner-alkhidmat.png", alt: "Alkhidmat Foundation" },
    { file: "partner-sos-childrens-villages-pakistan.png", alt: "SOS Children's Villages Pakistan" },
    { file: "partner-door-of-awareness.png", alt: "Door of Awareness Educational Welfare Organization" },
    { file: "partner-ghauri-orphan-center.png", alt: "Ghauri Orphan Center" },
    { file: "partner-ciel.png", alt: "CIEL" },
    { file: "partner-rukh-foundation.png", alt: "Rukh Foundation" },
    { file: "partner-noor-al-amal.png", alt: "Noor-al-Amal Light of Hope" },
    { file: "partner-arooba-naeem-welfare.png", alt: "Arooba Naeem Welfare" },
    { file: "partner-nawab-cats.png", alt: "Nawab Cats" },
] as const;

export function partnerLogoPublicUrl(file: string): string {
    return `${PARTNER_LOGOS_S3_BASE}/${file}`;
}
