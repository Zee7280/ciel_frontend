import { NextRequest, NextResponse } from "next/server";

type NominatimResult = {
    place_id?: number | string;
    lat?: string;
    lon?: string;
    display_name?: string;
    name?: string;
    address?: {
        road?: string;
        suburb?: string;
        neighbourhood?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        country?: string;
    };
};

type NormalizedResult = {
    id: string;
    lat: number;
    lng: number;
    title: string;
    subtitle: string;
    address: string;
};

type PhotonFeature = {
    geometry?: { coordinates?: [number, number] };
    properties?: {
        osm_id?: string | number;
        name?: string;
        street?: string;
        locality?: string;
        district?: string;
        city?: string;
        county?: string;
        state?: string;
        country?: string;
    };
};

function toNumber(value: string | null, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function buildViewbox(lat: number, lng: number) {
    const deltaLng = 1.25;
    const deltaLat = 1.0;
    const left = lng - deltaLng;
    const right = lng + deltaLng;
    const top = lat + deltaLat;
    const bottom = lat - deltaLat;
    return `${left},${top},${right},${bottom}`;
}

function normalizeText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function compactText(value: string): string {
    return normalizeText(value).replace(/\s+/g, "");
}

function normalizeResult(item: NominatimResult): NormalizedResult {
    const title =
        item.name ||
        item.address?.road ||
        item.address?.suburb ||
        item.address?.neighbourhood ||
        item.address?.city ||
        item.display_name ||
        "Unknown location";

    const locality =
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.county ||
        "";

    const subtitle = [locality, item.address?.state, item.address?.country]
        .filter(Boolean)
        .join(", ");

    return {
        id: String(item.place_id ?? item.display_name ?? title),
        lat: Number(item.lat),
        lng: Number(item.lon),
        title,
        subtitle,
        address: item.display_name || [title, subtitle].filter(Boolean).join(", "),
    };
}

function distanceScore(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dx = lat1 - lat2;
    const dy = lng1 - lng2;
    return Math.sqrt(dx * dx + dy * dy);
}

const LAHORE_CENTER = { lat: 31.5204, lng: 74.3587 };
const LAHORE_RADIUS = 0.65;

function isWithinLocalRadius(item: NormalizedResult, lat: number, lng: number): boolean {
    return distanceScore(lat, lng, item.lat, item.lng) <= LAHORE_RADIUS;
}

function isLahoreResult(item: NormalizedResult): boolean {
    const haystack = normalizeText(`${item.title} ${item.subtitle} ${item.address}`);
    return haystack.includes("lahore") || isWithinLocalRadius(item, LAHORE_CENTER.lat, LAHORE_CENTER.lng);
}

function shouldUseLahoreOnly(query: string, lat: number, lng: number): boolean {
    const normalizedQuery = normalizeText(query);
    return normalizedQuery.includes("lahore") || distanceScore(lat, lng, LAHORE_CENTER.lat, LAHORE_CENTER.lng) <= 0.45;
}

function scoreResult(item: NormalizedResult, query: string, lat: number, lng: number): number {
    const q = normalizeText(query);
    const haystack = normalizeText(`${item.title} ${item.subtitle} ${item.address}`);
    const compactQuery = compactText(query);
    const compactHaystack = compactText(`${item.title} ${item.subtitle} ${item.address}`);
    const queryTokens = q.split(" ").filter(Boolean);
    const matchedTokens = queryTokens.filter((token) => haystack.includes(token)).length;
    const includesWholeQuery = q.length > 0 && haystack.includes(q);
    const includesCompactQuery = compactQuery.length > 0 && compactHaystack.includes(compactQuery);
    const includesLahore = haystack.includes("lahore");
    const proximityPenalty = distanceScore(lat, lng, item.lat, item.lng);
    const title = normalizeText(item.title);
    const titleCompact = compactText(item.title);
    const titleMatches = queryTokens.filter((token) => title.includes(token)).length;
    const titleCompactMatches = compactQuery.length > 0 && titleCompact.includes(compactQuery);

    return (
        (includesWholeQuery ? 120 : 0) +
        (includesCompactQuery ? 90 : 0) +
        matchedTokens * 25 +
        titleMatches * 20 +
        (titleCompactMatches ? 60 : 0) +
        (includesLahore ? 35 : 0) -
        proximityPenalty * 10
    );
}

function buildQueries(query: string) {
    const q = query.trim();
    const lower = q.toLowerCase();
    const variants = [q];
    const compact = q.replace(/\s+/g, " ").trim();
    const squashed = compact.replace(/\s+/g, "");
    if (squashed && squashed !== compact.toLowerCase()) variants.push(squashed);

    const alKhidmatMerged = compact.replace(/\bal\s+khidmat\b/gi, "alkhidmat");
    if (alKhidmatMerged !== compact) variants.push(alKhidmatMerged);

    if (/\b(al\s*khidmat|alkhidmat)\b/i.test(compact) && !/\bfoundation\b/i.test(compact)) {
        variants.push(`${alKhidmatMerged} foundation`);
    }

    if (!lower.includes("lahore")) variants.push(`${q}, Lahore`);
    if (!lower.includes("pakistan")) variants.push(`${q}, Pakistan`);
    if (!lower.includes("lahore") && !lower.includes("pakistan")) {
        variants.push(`${q}, Lahore, Pakistan`);
    }

    if (/\b(al\s*khidmat|alkhidmat)\b/i.test(compact)) {
        variants.push("Alkhidmat Foundation Lahore");
        variants.push("Alkhidmat Foundation Pakistan Lahore");
    }

    return [...new Set(variants)];
}

async function fetchNominatimResults(query: string, lat: number, lng: number, bounded: boolean) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "pk");
    url.searchParams.set("accept-language", "en");
    url.searchParams.set("viewbox", buildViewbox(lat, lng));
    if (bounded) url.searchParams.set("bounded", "1");

    const response = await fetch(url.toString(), {
        headers: {
            "User-Agent": "CIEL Frontend Location Search/1.0",
        },
        next: { revalidate: 300 },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as NominatimResult[];
    return Array.isArray(data)
        ? data
            .map(normalizeResult)
            .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
        : [];
}

function normalizePhotonResult(feature: PhotonFeature): NormalizedResult | null {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;

    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const props = feature.properties ?? {};
    const title = props.name || props.street || props.locality || props.city || "Unknown location";
    const subtitle = [props.city || props.county || props.locality, props.state, props.country]
        .filter(Boolean)
        .join(", ");
    const address = [props.name, props.street, props.locality, props.city, props.state, props.country]
        .filter(Boolean)
        .join(", ");

    return {
        id: String(props.osm_id ?? address ?? title),
        lat,
        lng,
        title,
        subtitle,
        address: address || [title, subtitle].filter(Boolean).join(", "),
    };
}

async function fetchPhotonResults(query: string) {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "8");

    const response = await fetch(url.toString(), {
        next: { revalidate: 300 },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as { features?: PhotonFeature[] };
    return Array.isArray(data.features)
        ? data.features
            .map(normalizePhotonResult)
            .filter((item): item is NormalizedResult => Boolean(item))
        : [];
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (q.length < 3) {
        return NextResponse.json({ results: [] });
    }

    const lat = toNumber(searchParams.get("lat"), 31.5204);
    const lng = toNumber(searchParams.get("lng"), 74.3587);

    try {
        const queries = buildQueries(q);
        const settled = await Promise.allSettled([
            ...queries.map((query) => fetchNominatimResults(query, lat, lng, true)),
            ...queries.map((query) => fetchNominatimResults(query, lat, lng, false)),
        ]);

        const deduped = new Map<string, NormalizedResult>();
        settled.forEach((result) => {
            if (result.status !== "fulfilled") return;
            result.value.forEach((item) => {
                if (!deduped.has(item.id)) deduped.set(item.id, item);
            });
        });

        const photonSettled = await Promise.allSettled(queries.map((query) => fetchPhotonResults(query)));
        photonSettled.forEach((result) => {
            if (result.status !== "fulfilled") return;
            result.value.forEach((item) => {
                if (!deduped.has(item.id)) deduped.set(item.id, item);
            });
        });

        const allResults = [...deduped.values()]
            .sort((a, b) => scoreResult(b, q, lat, lng) - scoreResult(a, q, lat, lng))
        const localOnly = shouldUseLahoreOnly(q, lat, lng)
            ? allResults.filter((item) => isLahoreResult(item))
            : [];
        const results = (localOnly.length > 0 ? localOnly : allResults).slice(0, 5);

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Location search failed:", error);
        return NextResponse.json({ results: [] }, { status: 200 });
    }
}
