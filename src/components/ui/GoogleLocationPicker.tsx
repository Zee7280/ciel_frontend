"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import {
    GOOGLE_MAPS_API_KEY,
    GOOGLE_MAPS_DEFAULT_CENTER,
    GOOGLE_MAPS_LIBRARIES,
    GOOGLE_MAPS_SCRIPT_ID,
} from "@/config/googleMaps";

export type LocationValue = {
    lat: number;
    lng: number;
    address?: string;
};

export type LocationPickerProps = {
    onLocationSelect: (location: LocationValue) => void;
    initialLocation?: { lat: number; lng: number };
};

type PlaceSuggestion = {
    id: string;
    placeId?: string;
    title: string;
    subtitle: string;
    address: string;
    lat?: number;
    lng?: number;
};

type LocalSearchResult = {
    id?: string;
    lat?: number;
    lng?: number;
    title?: string;
    subtitle?: string;
    address?: string;
};

type LatLngLiteral = {
    lat: number;
    lng: number;
};

type LatLngLike = LatLngLiteral | {
    lat: () => number;
    lng: () => number;
};

type MapLike = {
    panTo: (position: LatLngLiteral) => void;
    addListener: (eventName: string, handler: (event: { latLng?: LatLngLike }) => void) => void;
};

type MarkerLike = {
    setPosition: (position: LatLngLiteral) => void;
};

type GeocoderLike = {
    geocode: (
        request: Record<string, unknown>,
        callback: (results: GeocoderResultLike[] | null, status: string) => void,
    ) => void;
};

type GeocoderResultLike = {
    formatted_address?: string;
    geometry?: {
        location?: LatLngLike;
    };
};

type AutocompleteServiceLike = {
    getPlacePredictions: (
        request: Record<string, unknown>,
        callback: (predictions: PlacePredictionLike[] | null, status?: string) => void,
    ) => void;
};

type PlacePredictionLike = {
    place_id: string;
    description: string;
    structured_formatting?: {
        main_text?: string;
        secondary_text?: string;
    };
};

type PlacesServiceLike = {
    getDetails: (
        request: Record<string, unknown>,
        callback: (place: PlaceDetailsLike | null, status: string) => void,
    ) => void;
};

type NativeAutocompleteLike = {
    addListener: (eventName: string, handler: () => void) => void;
    getPlace: () => PlaceDetailsLike;
};

type PlaceDetailsLike = {
    formatted_address?: string;
    name?: string;
    geometry?: {
        location?: LatLngLike;
    };
};

type GoogleMapsApi = {
    maps: {
        Map: new (node: HTMLElement, options: Record<string, unknown>) => MapLike;
        Marker: new (options: Record<string, unknown>) => MarkerLike;
        Geocoder: new () => GeocoderLike;
        places: {
            Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => NativeAutocompleteLike;
            AutocompleteService: new () => AutocompleteServiceLike;
            PlacesService: new (map: MapLike) => PlacesServiceLike;
        };
    };
};

type GoogleMapsWindow = Window & {
    google?: GoogleMapsApi;
    __googleMapsPromise?: Promise<GoogleMapsApi>;
};

function getGoogleWindow() {
    return window as GoogleMapsWindow;
}

function loadGoogleMaps() {
    const googleWindow = getGoogleWindow();

    if (googleWindow.google?.maps?.places) {
        return Promise.resolve(googleWindow.google);
    }

    if (googleWindow.__googleMapsPromise) {
        return googleWindow.__googleMapsPromise;
    }

    googleWindow.__googleMapsPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
        const resolveGoogle = () => {
            if (googleWindow.google?.maps?.places) {
                resolve(googleWindow.google);
                return;
            }
            reject(new Error("Google Maps did not initialize correctly"));
        };

        if (existingScript) {
            existingScript.addEventListener("load", resolveGoogle);
            existingScript.addEventListener("error", reject);
            return;
        }

        const script = document.createElement("script");
        const params = new URLSearchParams({
            key: GOOGLE_MAPS_API_KEY,
            libraries: GOOGLE_MAPS_LIBRARIES,
            v: "weekly",
        });

        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
        script.async = true;
        script.defer = true;
        script.onload = resolveGoogle;
        script.onerror = () => reject(new Error("Google Maps script failed to load"));
        document.head.appendChild(script);
    });

    return googleWindow.__googleMapsPromise;
}

function getLatLngLiteral(value: LatLngLike): LatLngLiteral {
    return {
        lat: typeof value.lat === "function" ? value.lat() : value.lat,
        lng: typeof value.lng === "function" ? value.lng() : value.lng,
    };
}

function mergeSuggestions(...groups: PlaceSuggestion[][]) {
    const deduped = new Map<string, PlaceSuggestion>();

    groups.flat().forEach((suggestion) => {
        const key = suggestion.placeId || suggestion.address || suggestion.id;
        if (!deduped.has(key)) deduped.set(key, suggestion);
    });

    return [...deduped.values()].slice(0, 6);
}

async function fetchLocalSuggestions(query: string, position: LatLngLiteral, signal: AbortSignal): Promise<PlaceSuggestion[]> {
    const params = new URLSearchParams({
        q: query,
        lat: String(position.lat),
        lng: String(position.lng),
    });

    const response = await fetch(`/api/location/search?${params.toString()}`, { signal });
    if (!response.ok) return [];

    const data = (await response.json()) as { results?: LocalSearchResult[] };
    return Array.isArray(data.results)
        ? data.results.flatMap((result, index) => {
            if (
                typeof result.lat !== "number" ||
                typeof result.lng !== "number" ||
                !(result.address || result.title)
            ) {
                return [];
            }

            return [{
                id: `local-${result.id || index}`,
                title: result.title || result.address || query,
                subtitle: result.subtitle || result.address || "",
                address: result.address || result.title || query,
                lat: result.lat,
                lng: result.lng,
            }];
        })
        : [];
}

export default function GoogleLocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
    const mapNodeRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const mapRef = useRef<MapLike | null>(null);
    const markerRef = useRef<MarkerLike | null>(null);
    const geocoderRef = useRef<GeocoderLike | null>(null);
    const autocompleteRef = useRef<AutocompleteServiceLike | null>(null);
    const nativeAutocompleteRef = useRef<NativeAutocompleteLike | null>(null);
    const placesRef = useRef<PlacesServiceLike | null>(null);
    const googleRef = useRef<GoogleMapsApi | null>(null);
    const suggestionsRequestRef = useRef(0);

    const [isReady, setIsReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [position, setPosition] = useState(initialLocation || GOOGLE_MAPS_DEFAULT_CENTER);

    useEffect(() => {
        let cancelled = false;

        loadGoogleMaps()
            .then((google) => {
                if (cancelled || !mapNodeRef.current) return;

                googleRef.current = google;
                geocoderRef.current = new google.maps.Geocoder();
                autocompleteRef.current = new google.maps.places.AutocompleteService();

                mapRef.current = new google.maps.Map(mapNodeRef.current, {
                    center: position,
                    zoom: 14,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    clickableIcons: true,
                });

                placesRef.current = new google.maps.places.PlacesService(mapRef.current);
                markerRef.current = new google.maps.Marker({
                    map: mapRef.current,
                    position,
                });

                if (inputRef.current) {
                    const nativeAutocomplete = new google.maps.places.Autocomplete(inputRef.current, {
                        fields: ["formatted_address", "geometry", "name"],
                    });
                    nativeAutocomplete.addListener("place_changed", () => {
                        const place = nativeAutocomplete.getPlace();
                        const location = place.geometry?.location;
                        if (!location) return;

                        const nextPosition = getLatLngLiteral(location);
                        const address = place.formatted_address || place.name || inputRef.current?.value || "";

                        setPinnedLocation(nextPosition);
                        setSearchQuery(address);
                        setSuggestions([]);
                        setShowSuggestions(false);
                        onLocationSelect({ ...nextPosition, address });
                    });
                    nativeAutocompleteRef.current = nativeAutocomplete;
                }

                mapRef.current.addListener("click", (event) => {
                    if (!event.latLng) return;

                    const nextPosition = getLatLngLiteral(event.latLng);
                    setPinnedLocation(nextPosition);
                    reverseGeocode(nextPosition);
                });

                setIsReady(true);
            })
            .catch((error) => {
                console.error(error);
                if (!cancelled) setLoadError("Google Maps could not load. Please check API key restrictions.");
            });

        return () => {
            cancelled = true;
        };
        // Map initialization should happen once per mount. Position sync is handled below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isReady || !initialLocation) return;
        setPinnedLocation(initialLocation);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialLocation?.lat, initialLocation?.lng, isReady]);

    useEffect(() => {
        const autocompleteService = autocompleteRef.current;
        const geocoderService = geocoderRef.current;
        const query = searchQuery.trim();

        if (nativeAutocompleteRef.current || !isReady || query.length < 3 || (!autocompleteService && !geocoderService)) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const requestId = suggestionsRequestRef.current + 1;
        suggestionsRequestRef.current = requestId;
        const controller = new AbortController();
        let googleSuggestions: PlaceSuggestion[] = [];
        let localSuggestions: PlaceSuggestion[] = [];

        const publishSuggestions = () => {
            if (suggestionsRequestRef.current !== requestId) return;

            const nextSuggestions = mergeSuggestions(googleSuggestions, localSuggestions);
            setSuggestions(nextSuggestions);
            setShowSuggestions(nextSuggestions.length > 0);
        };

        const setGeocoderSuggestions = () => {
            geocoderService?.geocode(
                {
                    address: query,
                },
                (results, status) => {
                    if (suggestionsRequestRef.current !== requestId) return;

                    const nextSuggestions = status === "OK"
                        ? (results || []).slice(0, 5).flatMap((result, index) => {
                            const location = result.geometry?.location;
                            if (!location || !result.formatted_address) return [];

                            const nextPosition = getLatLngLiteral(location);
                            const [title, ...rest] = result.formatted_address.split(",").map((part) => part.trim());

                            return [{
                                id: `geocode-${index}-${result.formatted_address}`,
                                title: title || result.formatted_address,
                                subtitle: rest.join(", "),
                                address: result.formatted_address,
                                lat: nextPosition.lat,
                                lng: nextPosition.lng,
                            }];
                        })
                        : [];

                    googleSuggestions = nextSuggestions;
                    publishSuggestions();
                },
            );
        };

        const timeoutId = window.setTimeout(() => {
            fetchLocalSuggestions(query, position, controller.signal)
                .then((nextSuggestions) => {
                    localSuggestions = nextSuggestions;
                    publishSuggestions();
                })
                .catch((error) => {
                    if (error instanceof DOMException && error.name === "AbortError") return;
                    console.error("Local location suggestions failed", error);
                });

            if (!autocompleteService) {
                setGeocoderSuggestions();
                return;
            }

            autocompleteService.getPlacePredictions(
                {
                    input: query,
                    location: position,
                    radius: 50000,
                },
                (predictions) => {
                    if (suggestionsRequestRef.current !== requestId) return;

                    const nextSuggestions = (predictions || []).map((prediction) => ({
                        id: prediction.place_id,
                        placeId: prediction.place_id,
                        title: prediction.structured_formatting?.main_text || prediction.description,
                        subtitle: prediction.structured_formatting?.secondary_text || "",
                        address: prediction.description,
                    }));

                    if (nextSuggestions.length === 0) {
                        setGeocoderSuggestions();
                        return;
                    }

                    googleSuggestions = nextSuggestions;
                    publishSuggestions();
                },
            );
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [isReady, position, searchQuery]);

    const setPinnedLocation = (nextPosition: LatLngLiteral) => {
        setPosition(nextPosition);
        mapRef.current?.panTo(nextPosition);
        markerRef.current?.setPosition(nextPosition);
    };

    const reverseGeocode = (nextPosition: LatLngLiteral) => {
        geocoderRef.current?.geocode({ location: nextPosition }, (results, status) => {
            const address = status === "OK" ? results?.[0]?.formatted_address : undefined;
            if (address) setSearchQuery(address);
            onLocationSelect({ ...nextPosition, address });
        });
    };

    const selectSuggestion = (suggestion: PlaceSuggestion) => {
        if (typeof suggestion.lat === "number" && typeof suggestion.lng === "number") {
            const nextPosition = { lat: suggestion.lat, lng: suggestion.lng };

            setPinnedLocation(nextPosition);
            setSearchQuery(suggestion.address);
            setSuggestions([]);
            setShowSuggestions(false);
            onLocationSelect({ ...nextPosition, address: suggestion.address });
            return;
        }

        if (!suggestion.placeId || !placesRef.current) return;

        placesRef.current.getDetails(
            { placeId: suggestion.placeId, fields: ["formatted_address", "geometry", "name"] },
            (place, status) => {
                const location = place?.geometry?.location;
                if (status !== "OK" || !location) return;

                const nextPosition = getLatLngLiteral(location);
                const address = place.formatted_address || place.name || suggestion.address;

                setPinnedLocation(nextPosition);
                setSearchQuery(address);
                setSuggestions([]);
                setShowSuggestions(false);
                onLocationSelect({ ...nextPosition, address });
            },
        );
    };

    const handleSearch = () => {
        const q = searchQuery.trim();
        if (!q || !geocoderRef.current) return;

        setIsSearching(true);
        geocoderRef.current.geocode(
            {
                address: q,
            },
            (results, status) => {
                setIsSearching(false);

                const result = status === "OK" ? results?.[0] : null;
                const location = result?.geometry?.location;
                if (!location) return;

                const nextPosition = getLatLngLiteral(location);
                const address = result.formatted_address || q;

                setPinnedLocation(nextPosition);
                setSearchQuery(address);
                setSuggestions([]);
                setShowSuggestions(false);
                onLocationSelect({ ...nextPosition, address });
            },
        );
    };

    return (
        <div className="relative isolate space-y-4">
            <div className="relative z-20 flex gap-3">
                <div className="group relative flex-1">
                    <div className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500">
                        <MapPin className="h-full w-full" />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search location on Google Maps"
                        className="h-14 w-full rounded-[1.25rem] border border-slate-200/60 bg-white/80 pl-12 pr-4 text-sm font-bold shadow-sm outline-none backdrop-blur-md transition-all placeholder:text-slate-300 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => window.setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleSearch();
                            }
                        }}
                        disabled={!isReady}
                    />

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-[1.5rem] border border-slate-200/60 bg-white/95 shadow-2xl shadow-slate-200/60 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion.id}
                                    type="button"
                                    onClick={() => selectSuggestion(suggestion)}
                                    className="group/item flex w-full items-start gap-4 border-b border-slate-50 px-5 py-4 text-left transition-colors last:border-none hover:bg-blue-50"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 transition-colors group-hover/item:bg-blue-100">
                                        <MapPin className="h-4 w-4 text-slate-400 group-hover/item:text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-black text-slate-900 transition-colors group-hover/item:text-blue-700">
                                            {suggestion.title}
                                        </p>
                                        <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400">
                                            {suggestion.subtitle}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={!isReady || isSearching}
                    className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-slate-900 text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-70"
                >
                    {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-500 -mt-1">
                <span className="font-semibold text-slate-600">Google Maps:</span> Search or click the map to pin
                the exact location.
            </p>

            <div className="relative z-0 h-[280px] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-inner">
                {!isReady && !loadError && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-50 text-sm font-bold text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading Google Maps...
                    </div>
                )}
                {loadError && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm font-bold text-red-500">
                        {loadError}
                    </div>
                )}
                <div ref={mapNodeRef} className="h-[280px] w-full" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-white shadow-sm">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <p className="text-[10px] font-bold tracking-tight text-slate-500">
                        {`${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Pinned
                </div>
            </div>

            <style jsx global>{`
                .pac-container {
                    z-index: 2147483647 !important;
                    margin-top: 8px;
                    width: min(92vw, 30rem) !important;
                    min-width: 18rem !important;
                    overflow: hidden;
                    border: 1px solid rgba(226, 232, 240, 0.9);
                    border-radius: 1.25rem;
                    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
                    font-family: inherit;
                }

                .pac-item {
                    padding: 14px 16px;
                    border-top: 1px solid rgba(241, 245, 249, 0.95);
                    cursor: pointer;
                    font-size: 13px;
                    line-height: 1.35;
                }

                .pac-item span {
                    white-space: normal;
                }

                .pac-item:first-child {
                    border-top: 0;
                }

                .pac-item:hover,
                .pac-item-selected {
                    background-color: #eff6ff;
                }

                .pac-item-query {
                    color: #0f172a;
                    font-size: 14px;
                    font-weight: 800;
                }

                .pac-matched {
                    color: #2563eb;
                    font-weight: 900;
                }
            `}</style>
        </div>
    );
}
