"use client";

import { useEffect, useState } from "react";
import { REPORTING_FEE_PKR } from "@/config/reportingFee";
import { STUDENT_SUBSCRIPTION_DEFAULT_FEE_PKR } from "@/utils/studentSubscription";

/** Shape of `GET /api/v1/public/config` (unauthenticated; admin-set platform flags and fees). */
export type PublicPlatformConfig = {
    maintenance_mode: boolean;
    allow_registrations: boolean;
    site_name: string;
    contact_email: string;
    reporting_fee_pkr: number;
    student_subscription_required: boolean;
    student_subscription_fee_pkr: number;
};

const DEFAULTS: PublicPlatformConfig = {
    maintenance_mode: false,
    allow_registrations: true,
    site_name: "CIEL Pakistan",
    contact_email: "",
    reporting_fee_pkr: REPORTING_FEE_PKR,
    student_subscription_required: true,
    student_subscription_fee_pkr: STUDENT_SUBSCRIPTION_DEFAULT_FEE_PKR,
};

const CACHE_TTL_MS = 60_000;
let cached: { at: number; value: PublicPlatformConfig } | null = null;
let inflight: Promise<PublicPlatformConfig> | null = null;

function positiveInt(v: unknown, fallback: number): number {
    const n = typeof v === "number" ? v : parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Fetches the public config once per minute; always resolves (falls back to build-time defaults). */
export async function fetchPublicPlatformConfig(): Promise<PublicPlatformConfig> {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
    if (inflight) return inflight;
    inflight = (async () => {
        try {
            const res = await fetch("/api/v1/public/config", { cache: "no-store" });
            if (!res.ok) return cached?.value ?? DEFAULTS;
            const json = (await res.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
            const d = json?.data ?? {};
            const value: PublicPlatformConfig = {
                maintenance_mode: d.maintenance_mode === true,
                allow_registrations: d.allow_registrations !== false,
                site_name: typeof d.site_name === "string" && d.site_name.trim() ? d.site_name : DEFAULTS.site_name,
                contact_email: typeof d.contact_email === "string" ? d.contact_email : "",
                reporting_fee_pkr: positiveInt(d.reporting_fee_pkr, DEFAULTS.reporting_fee_pkr),
                student_subscription_required: d.student_subscription_required !== false,
                student_subscription_fee_pkr: positiveInt(
                    d.student_subscription_fee_pkr,
                    DEFAULTS.student_subscription_fee_pkr,
                ),
            };
            cached = { at: Date.now(), value };
            return value;
        } catch {
            return cached?.value ?? DEFAULTS;
        } finally {
            inflight = null;
        }
    })();
    return inflight;
}

/** Live public config for client components; starts with defaults, updates once loaded. */
export function usePublicPlatformConfig(): PublicPlatformConfig {
    const [cfg, setCfg] = useState<PublicPlatformConfig>(cached?.value ?? DEFAULTS);
    useEffect(() => {
        let cancelled = false;
        void fetchPublicPlatformConfig().then((v) => {
            if (!cancelled) setCfg(v);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return cfg;
}

/** The admin-set reporting fee per student (PKR), falling back to the build-time constant. */
export function useReportingFeePkr(): number {
    return usePublicPlatformConfig().reporting_fee_pkr;
}
