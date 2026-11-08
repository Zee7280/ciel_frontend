import type { MetadataRoute } from "next";

/** Web app manifest: the CIEL PK mark for home-screen / installed-app icons (tab icons come from app/icon.png + favicon.ico). */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "CIEL PK - Community Impact Education Lab",
        short_name: "CIEL PK",
        description: "Where Youth, Universities & Communities Create Measurable Impact",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0e4d4e",
        icons: [
            { src: "/icons/ciel-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/ciel-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/ciel-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
