import React, { useState } from "react";
import { sdgData } from "../utils/sdgData";
import {
  Users, Utensils, Activity, BookOpen, Scale,
  Droplets, Zap, Briefcase, Cpu, Diff,
  Building, Recycle, CloudRain, Fish, TreeDeciduous,
  Bird, Handshake
} from "lucide-react";
import clsx from "clsx";

const SDG_ICONS = [
  Users, Utensils, Activity, BookOpen, Scale,
  Droplets, Zap, Briefcase, Cpu, Diff,
  Building, Recycle, CloudRain, Fish, TreeDeciduous,
  Bird, Handshake
];

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: cx + (r * Math.cos(angleInRadians)),
    y: cy + (r * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, r1: number, r2: number, startAngle: number, endAngle: number) {
  const startInner = polarToCartesian(x, y, r1, endAngle);
  const endInner = polarToCartesian(x, y, r1, startAngle);
  const startOuter = polarToCartesian(x, y, r2, startAngle);
  const endOuter = polarToCartesian(x, y, r2, endAngle);

  const arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

  const d = [
    "M", startOuter.x, startOuter.y,
    "A", r2, r2, 0, arcSweep, 1, endOuter.x, endOuter.y,
    "L", startInner.x, startInner.y,
    "A", r1, r1, 0, arcSweep, 0, endInner.x, endInner.y,
    "L", startOuter.x, startOuter.y,
    "Z"
  ].join(" ");

  return d;
}

export default function SDGWheel() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const cx = 500, cy = 500;
  const numSegments = 17;
  const angle = 360 / numSegments;
  const gap = 1;

  return (
    <div className="relative w-full aspect-square max-w-[800px] flex items-center justify-center mx-auto overflow-visible group">
      {/* Background Radial Glow */}
      <div className="absolute inset-x-0 inset-y-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] rounded-full -z-10" />

      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full animate-spin-extra-slow group-hover:[animation-play-state:paused] transition-all duration-1000"
      >
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
            <feOffset dx="0" dy="5" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.2" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Center Grey Circle */}
        <circle
          cx={cx}
          cy={cy}
          r="160"
          fill="#F1F5F9"
          filter="url(#shadow)"
        />

        {/* Segments Mapping */}
        {sdgData.map((sdg, i) => {
          const startAngle = i * angle + gap;
          const endAngle = (i + 1) * angle - gap;
          const midAngle = i * angle + angle / 2;
          const isHovered = hoveredIndex === i;

          const arcPath = describeArc(cx, cy, 180, 320, startAngle, endAngle);

          const p1 = polarToCartesian(cx, cy, 180, midAngle - 3);
          const p2 = polarToCartesian(cx, cy, 180, midAngle + 3);
          const p3 = polarToCartesian(cx, cy, 140, midAngle);
          const pointerPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;

          const iconPos = polarToCartesian(cx, cy, 420, midAngle);
          const Icon = SDG_ICONS[i] || Users;

          const textPos = polarToCartesian(cx, cy, 350, midAngle);
          const rotation = midAngle;

          return (
            <g
              key={sdg.id}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              {/* Main Color Block */}
              <path
                d={arcPath}
                fill={sdg.color}
                className="transition-all duration-300 hover:opacity-90"
                style={{
                  filter: isHovered ? "drop-shadow(0 0 10px rgba(0,0,0,0.2))" : "none"
                }}
              />

              {/* Triangle Pointer */}
              <path
                d={pointerPath}
                fill={sdg.color}
              />

              {/* Number and Label */}
              <g transform={`rotate(${rotation}, ${textPos.x}, ${textPos.y})`}>
                <text
                  x={textPos.x}
                  y={textPos.y - 8}
                  fill="white"
                  fontSize="28"
                  fontWeight="900"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {sdg.number.toString().padStart(2, '0')}
                </text>
                <text
                  x={textPos.x}
                  y={textPos.y + 18}
                  fill="white"
                  fontSize="9"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="uppercase tracking-tighter"
                >
                  {sdg.title.split(' ')[0]}
                </text>
              </g>

              {/* Outer Icon Box */}
              <g transform={`translate(${iconPos.x - 30}, ${iconPos.y - 30})`}>
                <rect
                  width="60"
                  height="60"
                  rx="15"
                  fill={isHovered ? sdg.color : 'white'}
                  className="transition-colors duration-300 shadow-xl"
                  style={{ stroke: sdg.color, strokeWidth: 2 }}
                />
                <Icon
                  x="15"
                  y="15"
                  width="30"
                  height="30"
                  className={clsx(
                    "transition-colors duration-300",
                    isHovered ? "text-white" : "text-slate-600"
                  )}
                  style={{ color: isHovered ? 'white' : sdg.color }}
                />
              </g>

              {/* Connecting Line */}
              <line
                x1={polarToCartesian(cx, cy, 320, midAngle).x}
                y1={polarToCartesian(cx, cy, 320, midAngle).y}
                x2={polarToCartesian(cx, cy, 390, midAngle).x}
                y2={polarToCartesian(cx, cy, 390, midAngle).y}
                stroke={sdg.color}
                strokeWidth="2"
                strokeDasharray="4 2"
                opacity={isHovered ? 1 : 0.2}
              />
            </g>
          );
        })}
      </svg>

      {/* Center Branding Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-8xl font-black text-slate-900 tracking-tighter drop-shadow-md">IEL</h1>
          <div className="h-20 flex flex-col items-center justify-center">
            {hoveredIndex !== null && (
              <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                  Sustainable Development Goal {sdgData[hoveredIndex].number}
                </p>
                <p className="text-sm font-black text-slate-800 leading-tight max-w-[140px]">
                  {sdgData[hoveredIndex].title}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
