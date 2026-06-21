"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { OpportunityMapPoint } from "@/utils/opportunityMapCoordinates";
import "leaflet/dist/leaflet.css";

function FitMapBounds({ points }: { points: OpportunityMapPoint[] }) {
    const map = useMap();

    useEffect(() => {
        if (points.length === 0) {
            map.setView([30.3753, 69.3451], 5);
            return;
        }
        if (points.length === 1) {
            map.setView([points[0].lat, points[0].lng], 11);
            return;
        }
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
    }, [map, points]);

    return null;
}

export default function OpportunitiesMapView({ points }: { points: OpportunityMapPoint[] }) {
    const center = useMemo<[number, number]>(() => {
        if (points.length === 0) return [30.3753, 69.3451];
        const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
        const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
        return [lat, lng];
    }, [points]);

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">
                    {points.length} {points.length === 1 ? "opportunity" : "opportunities"} on map
                </p>
                <p className="text-xs text-slate-500">Click a pin for details</p>
            </div>
            <MapContainer
                center={center}
                zoom={6}
                className="z-0 h-[min(70vh,560px)] w-full"
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitMapBounds points={points} />
                {points.map((point) => (
                    <CircleMarker
                        key={point.id}
                        center={[point.lat, point.lng]}
                        radius={10}
                        pathOptions={{
                            color: "#065f46",
                            fillColor: "#0F8F83",
                            fillOpacity: 0.9,
                            weight: 2,
                        }}
                    >
                        <Popup minWidth={220}>
                            <div className="space-y-2 p-1">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#0F8F83]">
                                    {point.org || "Verified Partner"}
                                </p>
                                <p className="text-sm font-black leading-snug text-slate-900">{point.title}</p>
                                <p className="text-xs font-semibold text-slate-600">
                                    {point.cityLabel} · {point.statusLabel}
                                </p>
                                <Link
                                    href={`/projects/${point.id}`}
                                    className="inline-flex text-xs font-bold text-[#0F8F83] hover:underline"
                                >
                                    View details →
                                </Link>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}
