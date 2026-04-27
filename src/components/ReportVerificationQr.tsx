"use client";

import QRCode from "react-qr-code";
import { useEffect, useMemo, useState } from "react";
import { resolveImpactVerifyQrHref } from "@/utils/reportVerificationUrl";

type Props = {
    /** From report API (`impact_verify_url`) — absolute URL or path starting with `/`. */
    impactVerifyUrl: string | null | undefined;
    /** Pixel size of the QR module grid (default 112). */
    size?: number;
    className?: string;
    /** Shown under the QR (screen); keep short for print. */
    caption?: string;
};

export default function ReportVerificationQr({
    impactVerifyUrl,
    size = 112,
    className = "",
    caption = "Scan to verify on CIEL",
}: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const absolute = useMemo(() => {
        if (!mounted) return "";
        return resolveImpactVerifyQrHref(impactVerifyUrl) || "";
    }, [mounted, impactVerifyUrl]);

    if (!mounted) {
        return (
            <div
                className={(`flex flex-col items-center gap-2 ${className}`).trim()}
                style={{ width: size + 16, minHeight: size + 24 }}
                aria-hidden
            />
        );
    }

    if (!absolute.startsWith("http")) {
        return null;
    }

    return (
        <div className={(`flex flex-col items-center gap-2 ${className}`).trim()}>
            <div className="rounded-xl border border-slate-200 bg-white p-2 print:border-slate-300 print:p-1.5">
                <QRCode value={absolute} size={size} level="M" />
            </div>
            {caption ? (
                <p className="max-w-[14rem] text-center text-[9px] font-bold uppercase leading-snug tracking-widest text-slate-500 print:max-w-[12rem] print:text-[7px]">
                    {caption}
                </p>
            ) : null}
        </div>
    );
}
