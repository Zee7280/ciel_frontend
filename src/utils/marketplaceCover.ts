/** Deterministic pastel marketplace covers — no uploaded image and no "AI-generated" caption. */

const PALETTES = [
    ["#d9f0c8", "#f7d9a8", "#f3c9c0", "#e8f4d8"],
    ["#f8d7b4", "#f3c4d4", "#d9c7f2", "#fde8c8"],
    ["#c8ebd8", "#f3e2a8", "#d5f0c4", "#f8f0c8"],
    ["#d7c8f4", "#c8e4d4", "#f4d8c0", "#e4d8f8"],
    ["#c8e8f4", "#d8f0d0", "#f4e0c0", "#c8d8f8"],
    ["#f4d0c0", "#e8f0b8", "#d0e0f4", "#f8e0d0"],
    ["#c8f0e4", "#f0d8c0", "#e0d0f4", "#d8f4c8"],
    ["#f0c8d8", "#c8e8c8", "#f4e8b8", "#d8d0f4"],
] as const;

function hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    }
    return hash >>> 0;
}

export function marketplaceCoverPaletteIndex(seed: string): number {
    return hashString(seed || "ciel") % PALETTES.length;
}

export function buildMarketplaceCoverSvg(seed: string): string {
    const hash = hashString(seed || "ciel");
    const palette = PALETTES[hash % PALETTES.length];
    const blobs = [0, 1, 2, 3].map((i) => {
        const slice = (hash >>> (i * 7)) & 1023;
        const cx = 18 + ((slice * 13) % 64);
        const cy = 12 + ((slice * 17) % 38);
        const r = 18 + (slice % 22);
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${palette[(i + 1) % palette.length]}" fill-opacity="0.88"/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 56" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="100%" stop-color="${palette[2]}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="56" fill="url(#g)"/>
  ${blobs.join("")}
</svg>`;
}

export function marketplaceCoverDataUri(seed: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildMarketplaceCoverSvg(seed))}`;
}

export function resolveMarketplaceCoverUrl(seed: string, uploadedUrl?: string | null): string {
    const uploaded = typeof uploadedUrl === "string" ? uploadedUrl.trim() : "";
    if (uploaded) return uploaded;
    return marketplaceCoverDataUri(seed);
}
