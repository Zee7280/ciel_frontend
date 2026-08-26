import type { ReactNode } from "react";

export const ACTIVITY_TYPE_EMOJI: Record<string, string> = {
    "Community Service": "🤲",
    "Volunteer Activity": "💪",
    "Awareness Campaign": "📣",
    "Training / Teaching": "🧑‍🏫",
    Research: "🔍",
    "Technical Support": "🔧",
    "Environmental Action": "🌳",
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
