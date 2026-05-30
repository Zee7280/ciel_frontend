import type { NextConfig } from "next";

const partnerLogosHost =
    process.env.NEXT_PUBLIC_PARTNER_LOGOS_BASE_URL?.replace(/^https?:\/\//, "").split("/")[0] ??
    "ciel-storage-2026.s3.eu-north-1.amazonaws.com";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: partnerLogosHost,
                pathname: "/**",
            },
        ],
    },
};

export default nextConfig;
