/** Approximate coordinates for Pakistan cities used on the public opportunities map. */
const PAKISTAN_CITY_COORDS: Record<string, [number, number]> = {
    abbottabad: [34.1688, 73.2215],
    attock: [33.7667, 72.3598],
    bahawalnagar: [29.9983, 73.2527],
    bahawalpur: [29.3956, 71.6836],
    charsadda: [34.1453, 71.7309],
    chiniot: [31.72, 72.9789],
    "dera ghazi khan": [30.0561, 70.6348],
    "dera ismail khan": [31.8314, 70.9017],
    faisalabad: [31.4504, 73.135],
    gilgit: [35.9208, 74.3144],
    gujranwala: [32.1877, 74.1945],
    gujrat: [32.5739, 74.0789],
    haripur: [33.9971, 72.9339],
    hyderabad: [25.396, 68.3578],
    islamabad: [33.6844, 73.0479],
    jhang: [31.2681, 72.3181],
    kamoke: [31.9753, 74.223],
    karachi: [24.8607, 67.0011],
    kasur: [31.1156, 74.4465],
    kohat: [33.5869, 71.4412],
    lahore: [31.5204, 74.3587],
    larkana: [27.559, 68.212],
    "mandi bahauddin": [32.587, 73.4917],
    mansehra: [34.3339, 73.2014],
    mardan: [34.1989, 72.0447],
    mingora: [34.7717, 72.3601],
    "mirpur khas": [25.5276, 69.0126],
    multan: [30.1575, 71.5249],
    murree: [33.907, 73.3943],
    nawabshah: [26.2442, 68.41],
    okara: [30.8081, 73.4458],
    peshawar: [34.0151, 71.5249],
    quetta: [30.1798, 66.975],
    "rahim yar khan": [28.4202, 70.2989],
    rawalpindi: [33.5651, 73.0169],
    sahiwal: [30.6682, 73.1114],
    sargodha: [32.0836, 72.6711],
    sheikhupura: [31.7167, 73.985],
    sialkot: [32.4945, 74.5229],
    skardu: [35.297, 75.6333],
    sukkur: [27.7052, 68.8574],
    swabi: [34.1202, 72.4698],
    taxila: [33.7461, 72.8397],
    "wah cantonment": [33.7733, 72.7458],
};

const PAKISTAN_CENTER: [number, number] = [30.3753, 69.3451];

function normalizeCityKey(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parsePinCoordinates(pin: unknown): [number, number] | null {
    if (typeof pin !== "string") return null;
    const parts = pin.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length < 2) return null;
    const [lat, lng] = parts;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return [lat, lng];
}

function lookupCityCoordinates(cityLabel: string): [number, number] | null {
    const key = normalizeCityKey(cityLabel);
    if (PAKISTAN_CITY_COORDS[key]) return PAKISTAN_CITY_COORDS[key];

    for (const [name, coords] of Object.entries(PAKISTAN_CITY_COORDS)) {
        if (key.includes(name) || name.includes(key)) return coords;
    }
    return null;
}

function spreadCoordinates(base: [number, number], seed: string | number, index: number): [number, number] {
    const n = String(seed)
        .split("")
        .reduce((acc, ch) => acc + ch.charCodeAt(0), index * 17);
    const angle = ((n % 360) * Math.PI) / 180;
    const radius = 0.035 + (index % 4) * 0.012;
    return [base[0] + Math.sin(angle) * radius, base[1] + Math.cos(angle) * radius];
}

export type OpportunityMapInput = {
    id: string | number;
    title: string;
    org?: string;
    location?: string;
    modeBucket?: string;
    status: string;
    locationPin?: string | null;
};

export type OpportunityMapPoint = OpportunityMapInput & {
    lat: number;
    lng: number;
    cityLabel: string;
    statusLabel: string;
};

export function extractCityLabelFromLocation(location?: string): string {
    if (!location) return "Pakistan";
    const first = location.split(",")[0]?.trim();
    return first || location;
}

export function resolveOpportunityMapPoint(
    project: OpportunityMapInput,
    indexInCity: number,
    statusLabel: string,
): OpportunityMapPoint {
    const cityLabel = extractCityLabelFromLocation(project.location);
    const fromPin = parsePinCoordinates(project.locationPin);
    if (fromPin) {
        const [lat, lng] = spreadCoordinates(fromPin, project.id, indexInCity);
        return { ...project, lat, lng, cityLabel, statusLabel };
    }

    const mode = String(project.modeBucket || "").toLowerCase();
    const locLower = String(project.location || "").toLowerCase();
    const isRemote =
        mode.includes("remote") ||
        locLower.includes("remote") ||
        cityLabel.toLowerCase().includes("remote");

    if (isRemote) {
        const [lat, lng] = spreadCoordinates(PAKISTAN_CENTER, project.id, indexInCity + 3);
        return { ...project, lat, lng, cityLabel: "Remote", statusLabel };
    }

    const cityCoords = lookupCityCoordinates(cityLabel) ?? PAKISTAN_CENTER;
    const [lat, lng] = spreadCoordinates(cityCoords, project.id, indexInCity);
    return { ...project, lat, lng, cityLabel, statusLabel };
}

export function buildOpportunityMapPoints(
    projects: OpportunityMapInput[],
    statusLabelFor: (status: string) => string,
): OpportunityMapPoint[] {
    const cityCounts = new Map<string, number>();
    return projects.map((project) => {
        const cityKey = extractCityLabelFromLocation(project.location).toLowerCase();
        const indexInCity = cityCounts.get(cityKey) ?? 0;
        cityCounts.set(cityKey, indexInCity + 1);
        return resolveOpportunityMapPoint(project, indexInCity, statusLabelFor(project.status));
    });
}
