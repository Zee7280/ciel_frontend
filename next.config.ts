import type { NextConfig } from "next";
import path from "node:path";

const projectRoot = path.join(__dirname);

const partnerLogosHost =
    process.env.NEXT_PUBLIC_PARTNER_LOGOS_BASE_URL?.replace(/^https?:\/\//, "").split("/")[0] ??
    "ciel-storage-2026.s3.eu-north-1.amazonaws.com";

const tailwindcssPath = path.join(projectRoot, "node_modules/tailwindcss");

const nextConfig: NextConfig = {
    outputFileTracingRoot: projectRoot,
    // Parent folder has its own package.json; pin bundlers to this app so CSS
    // `@import "tailwindcss"` resolves from ciel_frontend/node_modules.
    turbopack: {
        root: projectRoot,
        resolveAlias: {
            tailwindcss: tailwindcssPath,
        },
    },
    webpack: (config) => {
        config.resolve ??= {};
        config.resolve.alias = {
            ...config.resolve.alias,
            tailwindcss: tailwindcssPath,
        };
        return config;
    },
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
