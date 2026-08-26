"use client";

import type { CommunityAwardCard } from "@/utils/communityAwardModel";

export default function CommunityFlashCard({ card, rank }: { card: CommunityAwardCard; rank?: number }) {
    return (
        <div className="overflow-hidden rounded-[17px] border border-[#dcebee] bg-white">
            <div className="relative bg-[linear-gradient(130deg,#04252b,#0e5f63_55%,#12a5a0_120%)] px-4 py-3 text-white">
                <span className="absolute right-2.5 top-2.5 rounded-full bg-[linear-gradient(90deg,#6d28d9,#a78bfa)] px-2 py-0.5 text-[8px] font-extrabold">
                    {rank ? `#${rank} · ` : ""}
                    {card.total}/100
                </span>
                <div className="pr-16 text-[7px] font-extrabold tracking-[0.13em] text-[#99f6e4]">
                    {card.university} · {(card.organization_name || "Partner").toUpperCase()} · {card.semester} {card.year}
                </div>
                <b className="mt-1 block text-[11.5px] leading-snug">{card.project_title}</b>
                <div className="mt-0.5 text-[9px] text-[#cdf5f0]">
                    {card.student_name} {card.teamSize > 1 ? `+${card.teamSize - 1}` : ""} · {card.hours} verified hrs · {card.sdg} · supervised by {card.faculty_name}
                </div>
            </div>
            {card.story ? (
                <p className="border-b border-[#dcebee] bg-[#f6fcfb] px-3 py-2 text-[9.5px] italic leading-relaxed text-[#1d3a3d]">
                    “{card.story}”
                </p>
            ) : null}
            <div className="flex flex-wrap gap-1 px-3 py-2">
                <span className="rounded-full bg-[#e6f6f4] px-2 py-0.5 text-[7px] font-extrabold text-[#0e7d74]">✅ FACULTY-APPROVED</span>
                <span className="rounded-full bg-[#f1ebfd] px-2 py-0.5 text-[7px] font-extrabold text-[#6d28d9]">🧠 CII EVALUATED</span>
                <span className="rounded-full bg-[#e3f4fa] px-2 py-0.5 text-[7px] font-extrabold text-[#0891b2]">📸 {card.evidenceCount} EVIDENCE</span>
            </div>
        </div>
    );
}
