import Image from "next/image";

/* SDG-style segments */
const SEGMENTS = [
  { label: "Education", color: "#60A5FA" },
  { label: "Climate", color: "#F59E0B" },
  { label: "Innovation", color: "#EF4444" },
  { label: "Community", color: "#22C55E" },
  { label: "", color: "#8B5CF6" },
  { label: "", color: "#EC4899" },
  { label: "", color: "#06B6D4" },
  { label: "", color: "#84CC16" },
];

function polar(cx: number, cy: number, r: number, a: number) {
  const rad = (a - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r1: number, r2: number, s: number, e: number) {
  const p1 = polar(cx, cy, r1, e);
  const p2 = polar(cx, cy, r1, s);
  const p3 = polar(cx, cy, r2, s);
  const p4 = polar(cx, cy, r2, e);
  return `
    M ${p1.x} ${p1.y}
    A ${r1} ${r1} 0 0 0 ${p2.x} ${p2.y}
    L ${p3.x} ${p3.y}
    A ${r2} ${r2} 0 0 1 ${p4.x} ${p4.y}
    Z
  `;
}

export default function SDGWheel() {
  const cx = 250, cy = 250;
  const angle = 360 / SEGMENTS.length;

  return (
    <div className="relative w-[520px] h-[520px] flex items-center justify-center">

      {/* BLUE RADIAL GLOW (TARGET-LIKE) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.25),transparent_70%)] blur-3xl" />

      <svg viewBox="0 0 500 500" className="w-full h-full">
        {/* OUTER SOFT RING (VISIBLE) */}
        {SEGMENTS.map((s, i) => (
          <path
            key={`outer-${i}`}
            d={arc(cx, cy, 245, 200, i * angle + 4, (i + 1) * angle - 4)}
            fill={s.color}
            opacity={0.22}
          />
        ))}

        {/* INNER STRONG RING */}
        {SEGMENTS.map((s, i) => (
          <path
            key={`inner-${i}`}
            d={arc(cx, cy, 185, 135, i * angle + 4, (i + 1) * angle - 4)}
            fill={s.color}
          />
        ))}

        {/* LABELS (CLEAR & CENTERED) */}
        {SEGMENTS.map((s, i) => {
          if (!s.label) return null;
          const mid = i * angle + angle / 2;
          const p = polar(cx, cy, 160, mid);
          return (
            <text
              key={`label-${i}`}
              x={p.x}
              y={p.y}
              fill="#ffffff"
              fontSize="16"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {s.label}
            </text>
          );
        })}
      </svg>

      {/* CENTER LOGO */}
      <div className="absolute w-32 h-32 bg-white rounded-full shadow-2xl flex items-center justify-center">
        <Image
          src="/ciel-logo-v2.png"
          alt="CIEL Pakistan"
          width={90}
          height={90}
        />
      </div>
    </div>
  );
}
