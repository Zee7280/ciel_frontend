"use client";

import { useEffect, useState } from "react";
import { impactScoreBand } from "@/utils/cielImpactBand";
import { usePrefersReducedMotion } from "./motion";

const SIZE = 128;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Animated 0–100 composite impact index donut. Band label is always rendered alongside the number. */
export default function ImpactDonut({ score }: { score: number }) {
    const target = Math.max(0, Math.min(100, score));
    const reducedMotion = usePrefersReducedMotion();
    const [animated, setAnimated] = useState(0);

    useEffect(() => {
        if (reducedMotion) return;
        let raf: number;
        const start = performance.now();
        const duration = 900;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setAnimated(eased * target);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, reducedMotion]);

    const display = reducedMotion ? target : animated;
    const offset = CIRCUMFERENCE * (1 - display / 100);

    return (
        <div className="flex items-center gap-4">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Composite impact index: ${Math.round(target)}, ${impactScoreBand(target)}`}>
                <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#E8E9EE" strokeWidth={STROKE} />
                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke="#4CC38A"
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-ciel-text text-3xl font-black">
                    {Math.round(display)}
                </text>
                <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" className="fill-ciel-text-soft text-[10px] font-bold uppercase tracking-widest">
                    / 100
                </text>
            </svg>
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ciel-text-soft">Composite Impact Index</p>
                <p className="mt-1 text-lg font-bold text-ciel-green-deep">{impactScoreBand(target)}</p>
            </div>
        </div>
    );
}
