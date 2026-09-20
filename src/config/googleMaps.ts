// No hardcoded fallback key here on purpose: a fallback would ship a real, billable key inside
// the client bundle and let a missing env var fail silently (the picker would keep "working" on
// an exposed key instead of surfacing a config error). Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in the
// environment; GoogleLocationPicker shows a clear error if it's missing.
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export const GOOGLE_MAPS_SCRIPT_ID = "google-maps-js-api";

export const GOOGLE_MAPS_DEFAULT_CENTER = {
    lat: 31.5204,
    lng: 74.3587,
};

export const GOOGLE_MAPS_LIBRARIES = "places";
