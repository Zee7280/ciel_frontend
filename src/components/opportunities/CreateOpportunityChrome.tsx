import type { ReactNode } from "react";
import Link from "next/link";

export const ACTIVITY_TYPE_EMOJI: Record<string, string> = {
    "Community Service": "🤲",
    "Volunteer Activity": "💪",
    "Awareness Campaign": "📣",
    "Training / Teaching": "🧑‍🏫",
    Research: "🔍",
    "Research / Survey Support": "🔍",
    "Technical Support": "🔧",
    "Technical / Professional Support": "🔧",
    "Environmental Action": "🌳",
    "Corporate CSR Activity": "🏢",
    Other: "✏️",
};

export const MODE_EMOJI: Record<string, string> = {
    "On site": "🏕️",
    Remote: "💻",
    Hybrid: "🔀",
};

export const TIMELINE_EMOJI: Record<string, string> = {
    "Fixed dates": "📅",
    Flexible: "🌊",
    Ongoing: "♾️",
};

export const BENEFICIARY_EMOJI: Record<string, string> = {
    Children: "🧒",
    Youth: "🧑",
    Women: "👩",
    Elderly: "👴",
    "Persons with disabilities": "♿",
    Students: "🎓",
    "Community members": "🏘️",
};

export const SKILL_EMOJI: Record<string, string> = {
    Leadership: "⭐",
    Communication: "💬",
    Teaching: "🧑‍🏫",
    Teamwork: "🤝",
    "Digital Skills": "💻",
    "Community Engagement": "🌍",
    "Critical Thinking": "🧠",
    "Problem Solving": "🧩",
    "Time Management": "⏱️",
    "Project Management": "📋",
    Research: "🔬",
    Documentation: "📝",
    "Financial Literacy": "💰",
    "Public Speaking": "🎤",
    "Event Planning": "🎪",
    "Media/Content Creation": "🎬",
};

export const VERIFICATION_EMOJI: Record<string, string> = {
    "Attendance sheets": "📋",
    "Supervisor sign-off": "✅",
    "Photos of activities": "📸",
    "Assessment sheets": "📊",
    "Digital logs": "💻",
};

export function CoChip({
    selected,
    onClick,
    children,
}: {
    selected: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button type="button" className={`co-chip${selected ? " on" : ""}`} onClick={onClick}>
            {children}
        </button>
    );
}

export function CoSectionHead({
    letter,
    title,
    tag,
    tagAuto,
    color,
    expanded,
    onToggle,
}: {
    letter: string;
    title: string;
    tag?: string;
    tagAuto?: boolean;
    color: string;
    expanded?: boolean;
    onToggle?: () => void;
}) {
    return (
        <div
            className={`mb-1 flex items-center gap-2.5 ${onToggle ? "cursor-pointer" : ""}`}
            onClick={onToggle}
            role={onToggle ? "button" : undefined}
        >
            <span
                className="flex h-[26px] min-w-[28px] items-center justify-center rounded-[9px] px-2 text-[11px] font-extrabold text-white"
                style={{ background: color }}
            >
                {letter}
            </span>
            <h2 className="text-[14.5px] font-extrabold text-[#0d2b33]">{title}</h2>
            {tag ? (
                <span
                    className={`ml-auto whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-extrabold tracking-[0.08em] ${
                        tagAuto ? "bg-[#e3f4fa] text-[#0891b2]" : "bg-[#fbf0d7] text-[#b45309]"
                    }`}
                >
                    {tag}
                </span>
            ) : null}
            {onToggle ? (
                <span className="text-[10px] font-extrabold text-[#0e7d74]">{expanded ? "▾" : "▸"}</span>
            ) : null}
        </div>
    );
}

export function CoFormHero({
    crumb,
    backHref,
    kicker,
    title,
    subtitle,
    notice,
    pill,
    loading,
}: {
    crumb: ReactNode;
    backHref: string;
    kicker?: string;
    title: string;
    subtitle: string;
    notice?: string;
    pill?: string;
    loading?: boolean;
}) {
    return (
        <>
            <div className="mb-3.5 flex items-center gap-3">
                <div>
                    <p className="text-[13px] text-[#70808a]">{crumb}</p>
                </div>
                <Link
                    href={backHref}
                    className="ml-auto rounded-[9px] bg-[#eef2f3] px-3 py-2 text-[10px] font-black text-[#29454f]"
                >
                    ← Back
                </Link>
            </div>
            <div className="mb-4 overflow-hidden rounded-[22px] border border-[#dde5ea] bg-white p-5 shadow-[0_8px_22px_rgba(24,52,64,.05)]">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        {kicker ? (
                            <p className="text-[11px] font-black tracking-[0.13em] text-[#08756b]">{kicker}</p>
                        ) : null}
                        <h1 className="m-0 text-[21px] font-[950] text-[#16313d]">{title}</h1>
                        <p className="mt-1 text-[12.5px] text-[#70808a]">{subtitle}</p>
                    </div>
                    {pill ? (
                        <span className="rounded-[18px] bg-[#e8f5ef] px-2 py-1 text-[9.5px] font-black text-[#1d765d]">
                            {pill}
                        </span>
                    ) : null}
                </div>
                {notice ? (
                    <div className="mt-3.5 rounded-xl border border-[#ead8b8] bg-[#fff8ec] p-3 text-[11.5px] leading-relaxed text-[#715a2d]">
                        {notice}
                    </div>
                ) : null}
                {loading ? <p className="mt-3 text-sm text-[#70808a]">Loading opportunity…</p> : null}
            </div>
        </>
    );
}

export function CoLivePreview({
    emoji,
    title,
    bits,
    sdgs,
    children,
}: {
    emoji: string;
    title: string;
    bits: string[];
    sdgs?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className="sticky bottom-3.5 z-40 mt-4 overflow-hidden rounded-[20px] border border-[#dcebee] bg-white shadow-[0_-8px_30px_rgba(4,37,43,.10)]">
            <div className="flex flex-wrap items-center gap-3 bg-[linear-gradient(130deg,#04252b,#0e5f63_55%,#12a5a0_120%)] px-4 py-3 text-white">
                <span className="text-[22px]">{emoji}</span>
                <div className="min-w-0 flex-1">
                    <b className="block text-[13px]">{title.trim() || "Your listing builds itself here…"}</b>
                    <span className="text-[9.5px] text-[#cdf5f0]">
                        {bits.length ? bits.join(" · ") : "fill the form above and watch this card come alive"}
                    </span>
                </div>
                <div className="flex gap-1">{sdgs}</div>
            </div>
            {children}
        </div>
    );
}
