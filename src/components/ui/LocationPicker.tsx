"use client";

import { useEffect, useState, useMemo } from 'react';
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
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            // Use Nominatim for free geocoding (OpenStreetMap)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const newLat = parseFloat(result.lat);
                const newLng = parseFloat(result.lon);
                const newPos = new L.LatLng(newLat, newLng);

                setPosition(newPos);
                onLocationSelect({
                    lat: newLat,
                    lng: newLng,
                    address: result.display_name
                });
            }
        } catch (error) {
            console.error("Geocoding failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    if (!isMounted) {
        return <div className="h-[300px] w-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center text-slate-400">Loading Map components...</div>;
    }

    return (
        <div className="space-y-3">
            {/* Debug info */}
            <div className="text-xs text-blue-500">Map Component Mounted</div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search location (e.g. Liberty Market, Lahore)"
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-70"
                >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
            </div>

            <div className="h-[300px] w-full rounded-xl overflow-hidden border border-slate-200 z-0 relative">
                <MapContainer
                    center={position || defaultCenter}
                    zoom={13}
                    style={{ height: '300px', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                        position={position}
                        setPosition={setPosition}
                        onLocationSelect={(pos) => onLocationSelect({ lat: pos.lat, lng: pos.lng })}
                    />
                </MapContainer>
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {position ? `Selected: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}` : "Click on the map to pin exact location"}
            </p>
        </div>
    );
}
