/** Simplified Pakistan outline/province geometry for the public impact map. Public geographic
 * fact, not business data — kept in sync with ciel_backend/src/platform-stats/pakistan-geo.ts. */

export const PAKISTAN_MAP_OUTLINE: [number, number][] = [
    [61.6, 25.2], [62.4, 25.15], [63.5, 25.35], [64.6, 25.2], [65.6, 25.4], [66.5, 25.45], [66.8, 25.0],
    [67.2, 24.7], [67.5, 24.1], [68.2, 23.7], [68.8, 23.8], [69.6, 24.3], [70.6, 24.6], [71.1, 24.6],
    [70.7, 25.4], [70.1, 26.1], [69.5, 26.8], [69.9, 27.5], [70.4, 28.0], [70.8, 28.6], [71.9, 29.3],
    [72.5, 29.9], [73.3, 30.3], [74.1, 31.1], [74.6, 31.7], [74.6, 32.4], [75.1, 32.8], [74.4, 33.6],
    [73.9, 34.1], [74.3, 34.8], [75.3, 35.0], [76.2, 35.3], [77.0, 35.5], [77.8, 35.5], [76.9, 36.2],
    [75.9, 36.8], [75.4, 37.0], [74.6, 37.1], [73.8, 36.9], [72.6, 36.9], [71.8, 36.5], [71.2, 36.1],
    [71.6, 35.3], [71.0, 34.6], [71.1, 34.0], [70.3, 33.4], [69.9, 33.1], [69.5, 32.6], [69.3, 31.9],
    [68.5, 31.8], [67.6, 31.4], [66.9, 31.3], [66.3, 30.4], [66.4, 29.9], [65.0, 29.5], [63.5, 29.4],
    [62.4, 29.4], [61.0, 29.7], [60.9, 29.0], [61.6, 28.4], [62.5, 27.4], [63.2, 27.2], [63.2, 26.6],
    [62.0, 26.4], [61.8, 25.9],
];

export const PAKISTAN_PROVINCE_LINES: [number, number][][] = [
    [[67.4, 24.6], [68.0, 26.8], [69.6, 27.8]],
    [[69.6, 27.8], [70.2, 28.7], [69.8, 30.4], [70.5, 31.9], [71.3, 33.4], [72.6, 34.0], [73.9, 34.1]],
    [[70.5, 31.9], [69.6, 31.9]],
    [[71.3, 33.4], [70.3, 33.4]],
    [[72.6, 34.0], [72.8, 35.2], [74.3, 34.8]],
];

export const PAKISTAN_PROVINCE_LABELS: [string, number, number][] = [
    ["BALOCHISTAN", 64.8, 28.2],
    ["SINDH", 69.0, 25.8],
    ["PUNJAB", 72.4, 30.9],
    ["KHYBER PAKHTUNKHWA", 69.6, 34.9],
    ["GILGIT-BALTISTAN", 75.6, 36.1],
];

/** Same simplified equirectangular projection as the backend, tuned to a 560×500 viewBox. */
export function projectLonLat(lon: number, lat: number): [number, number] {
    return [(lon - 60.5) * 30 + 10, (37.5 - lat) * 35 + 10];
}

export function pakistanOutlinePath(): string {
    return `M${PAKISTAN_MAP_OUTLINE.map((p) => projectLonLat(...p).map((v) => v.toFixed(1)).join(",")).join("L")}Z`;
}

export function pakistanProvincePaths(): string[] {
    return PAKISTAN_PROVINCE_LINES.map((line) => `M${line.map((p) => projectLonLat(...p).map((v) => v.toFixed(1)).join(",")).join("L")}`);
}
