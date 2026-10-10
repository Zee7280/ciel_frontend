export default function ImpactWallCiiRing({ score }: { score: number | null }) {
    const value = score != null && Number.isFinite(score) ? Math.round(score * 10) / 10 : null;
    const pct = value == null ? 0 : Math.min(100, Math.max(0, value));
    const r = 30;
    const c = 2 * Math.PI * r;
    const dash = (pct / 100) * c;
    const label = value == null ? "—" : Number.isInteger(value) ? String(value) : value.toFixed(1);
    return (
        <div className="relative h-[76px] w-[76px] shrink-0">
            <svg viewBox="0 0 76 76" className="-rotate-90 h-full w-full" aria-hidden>
                <circle cx="38" cy="38" r={r} fill="none" stroke="#e4eeec" strokeWidth="7" />
                <circle
                    cx="38"
                    cy="38"
                    r={r}
                    fill="none"
                    stroke="#0e7d74"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c}`}
                />
            </svg>
            <div className="absolute inset-0 grid place-items-center leading-none">
                <span className="text-[17px] font-black tracking-tight text-[#16313d]">
                    {label}
                    <span className="text-[8px] font-bold text-[#7a8b92]">/100</span>
                </span>
            </div>
        </div>
    );
}
