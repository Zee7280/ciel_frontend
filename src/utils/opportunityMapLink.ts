/**
 * Google Maps link for an opportunity's venue, shown on the flashcard.
 *
 * Order of preference:
 *  1. a Google Maps link the creator pasted (only Google Maps hosts are accepted — never an
 *     arbitrary URL typed into a free-text box),
 *  2. the pin they dropped on the map picker (`"lat,lng"`),
 *  3. a Google Maps search for "venue, city".
 * Remote opportunities with no explicit pin or link get no map.
 */

export type OpportunityMap = {
    url: string;
    /** "Venue, City" for display; may be empty when only a pin or link exists. */
    place: string;
    source: "link" | "pin" | "search";
};

function str(v: unknown): string {
    return typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "";
}

/** A pasted link, if it is a real https Google Maps URL; otherwise "". */
export function safeGoogleMapsUrl(value: unknown): string {
    const raw = str(value);
    if (!raw) return "";
    let u: URL;
    try {
        u = new URL(raw);
    } catch {
        return "";
    }
    if (u.protocol !== "https:") return "";
    const host = u.hostname.toLowerCase();
    const isShort = host === "maps.app.goo.gl" || (host === "goo.gl" && u.pathname.toLowerCase().startsWith("/maps"));
    const isGoogle = /^(?:[a-z0-9-]+\.)*google\.(?:com|com\.pk)$/.test(host) && (host.startsWith("maps.") || u.pathname.toLowerCase().startsWith("/maps"));
    return isShort || isGoogle ? u.toString() : "";
}

/** "lat,lng" (or {lat,lng}) → [lat,lng] when both are valid coordinates. */
export function parsePin(value: unknown): [number, number] | null {
    let lat: number;
    let lng: number;
    if (value && typeof value === "object") {
        const o = value as Record<string, unknown>;
        lat = Number(o.lat ?? o.latitude);
        lng = Number(o.lng ?? o.lon ?? o.longitude);
    } else {
        const m = str(value).match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (!m) return null;
        lat = Number(m[1]);
        lng = Number(m[2]);
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    // 0,0 is what an untouched picker yields; it is not a venue.
    if (lat === 0 && lng === 0) return null;
    return [lat, lng];
}

export function resolveOpportunityMap(location: unknown, mode?: unknown): OpportunityMap | null {
    const loc = location && typeof location === "object" ? (location as Record<string, unknown>) : {};
    const venue = str(loc.venue) || str(loc.address);
    const city = str(loc.city) || str(loc.district);
    const place = [venue, city].filter(Boolean).filter((p, i, a) => a.indexOf(p) === i).join(", ");

    const link = safeGoogleMapsUrl(loc.mapLink ?? loc.map_link);
    if (link) return { url: link, place, source: "link" };

    const pin = parsePin(loc.pin);
    if (pin) {
        return { url: `https://www.google.com/maps/search/?api=1&query=${pin[0]},${pin[1]}`, place, source: "pin" };
    }

    const remote = /remote|online|virtual/i.test(str(mode));
    if (remote || !place) return null;
    return { url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`, place, source: "search" };
}
