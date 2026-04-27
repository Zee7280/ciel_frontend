"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Loader2 } from 'lucide-react';

// Fix for default marker icon issues in Leaflet with React
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface LocationPickerProps {
    onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void;
    initialLocation?: { lat: number; lng: number };
}

type LocationSuggestion = {
    id: string;
    lat: number;
    lng: number;
    title: string;
    subtitle: string;
    address: string;
};

function LocationMarker({ position, setPosition, onLocationSelect }: {
    position: L.LatLng | null,
    setPosition: (pos: L.LatLng) => void,
    onLocationSelect: (location: { lat: number; lng: number }) => void
}) {
    const map = useMapEvents({
        click(e: L.LeafletMouseEvent) {
            setPosition(e.latlng);
            onLocationSelect(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    // Update map center when position changes externally (e.g. via search)
    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position} icon={icon} />
    );
}

export default function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
    // Default to Lahore if no location provided
    const defaultCenter = { lat: 31.5204, lng: 74.3587 };

    // Ensure we only render map on client
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [position, setPosition] = useState<L.LatLng | null>(
        initialLocation ? new L.LatLng(initialLocation.lat, initialLocation.lng) : new L.LatLng(defaultCenter.lat, defaultCenter.lng)
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const getSearchUrl = (query: string) => {
        const params = new URLSearchParams({
            q: query,
            lat: String(position?.lat ?? defaultCenter.lat),
            lng: String(position?.lng ?? defaultCenter.lng),
        });
        return `/api/location/search?${params.toString()}`;
    };

    // Debounced search for suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!searchQuery || searchQuery.length < 3) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            try {
                const response = await fetch(getSearchUrl(searchQuery));
                if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
                const data = await response.json();
                if (Array.isArray(data.results)) {
                    setSuggestions(data.results);
                    setShowSuggestions(true);
                }
            } catch (error) {
                console.error("Location suggestions failed", error);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, position]);

    const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
        const newPos = new L.LatLng(suggestion.lat, suggestion.lng);

        setSearchQuery(suggestion.address);
        setPosition(newPos);
        onLocationSelect({
            lat: suggestion.lat,
            lng: suggestion.lng,
            address: suggestion.address
        });
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleSearch = async () => {
        const q = searchQuery.trim();
        if (!q) return;

        setIsSearching(true);
        try {
            const response = await fetch(getSearchUrl(q));
            if (!response.ok) throw new Error(`Geocode HTTP ${response.status}`);
            const data = await response.json();
            const suggestion = Array.isArray(data.results) ? data.results[0] : null;
            if (suggestion) {
                const newPos = new L.LatLng(suggestion.lat, suggestion.lng);

                setPosition(newPos);
                onLocationSelect({
                    lat: suggestion.lat,
                    lng: suggestion.lng,
                    address: suggestion.address || q
                });
                setSearchQuery(suggestion.address || q);
                setSuggestions([]);
                setShowSuggestions(false);
            }
        } catch (error) {
            console.error("Geocoding failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    if (!isMounted) {
        return (
            <div className="flex h-[280px] w-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
                Loading map…
            </div>
        );
    }

    return (
        // `isolate` keeps search/dropdown z-index above the map without competing with
        // app chrome (e.g. report sticky header at z-30).
        <div className="relative isolate space-y-4">
            <div className="relative z-20 flex gap-3">
                <div className="relative flex-1 group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <MapPin className="w-full h-full" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search location (e.g. Khidmat, Lahore)"
                        className="w-full pl-12 pr-4 h-14 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-[1.25rem] text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400/50 transition-all placeholder:text-slate-300"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-[1.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            {suggestions.map((s, idx) => (
                                <button
                                    key={`${s.id}-${idx}`}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(s)}
                                    className="w-full text-left px-5 py-4 hover:bg-blue-50 transition-colors flex items-start gap-4 border-b border-slate-50 last:border-none group/item"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 group-hover/item:bg-blue-100 transition-colors">
                                        <MapPin className="w-4 h-4 text-slate-400 group-hover/item:text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-900 group-hover/item:text-blue-700 transition-colors truncate">
                                            {s.title || "Unknown Location"}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                                            {s.subtitle}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-14 h-14 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-70 shadow-lg shadow-slate-200"
                >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed -mt-1">
                <span className="font-semibold text-slate-600">Google map:</span> If you do not find your location in
                search, copy from Google Maps and paste here.
            </p>

            <div className="relative z-0 h-[280px] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-inner">
                <MapContainer
                    center={position || defaultCenter}
                    zoom={14}
                    scrollWheelZoom
                    style={{ height: "280px", width: "100%" }}
                >
                    {/* Light road-map style (Carto + OSM). Same Leaflet API; cleaner than default OSM tiles. */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        subdomains="abcd"
                        maxZoom={20}
                    />
                    <LocationMarker
                        position={position}
                        setPosition={setPosition}
                        onLocationSelect={(pos) => onLocationSelect({ lat: pos.lat, lng: pos.lng })}
                    />
                </MapContainer>
            </div>

            <div className="px-5 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-tight">
                        {position
                            ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
                            : "Click on the map to pin exact coordinate"}
                    </p>
                </div>
                {position && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[9px] font-black uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Pinned
                    </div>
                )}
            </div>
        </div>
    );
}
