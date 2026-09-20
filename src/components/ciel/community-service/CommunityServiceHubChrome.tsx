"use client";

import type { ReactNode } from "react";
import { CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import { useRegisterDashboardPageChrome } from "@/components/ciel/dashboard/DashboardChromeContext";

export { CourseworkHero as CommunityHero, HubBackButton, HubTile };

export function CommunityCrumb({ role, view }: { role: string; view?: string }) {
    useRegisterDashboardPageChrome();
    return (
        <p className="mb-3 text-[13px] leading-[19.5px] text-[#71828e]">
            {role} Dashboard / <b className="font-semibold text-[#183140]">Community Service</b>
            {view ? (
                <>
                    {" / "}
                    <b className="font-semibold text-[#183140]">{view}</b>
                </>
            ) : null}
        </p>
    );
}

export function HubTabs({
    tabs,
    active,
    onChange,
}: {
    tabs: { id: string; label: string; count?: number }[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="mb-3.5 flex flex-wrap gap-2">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={
                        "rounded-[10px] border px-3 py-2 text-[11px] font-extrabold " +
                        (active === tab.id
                            ? "border-[#cbece4] bg-[#e8f7f3] text-[#08756b]"
                            : "border-[#dce6ea] bg-white text-[#52636e]")
                    }
                >
                    {tab.label}
                    {typeof tab.count === "number" ? <span className="ml-1.5 text-[10px] opacity-70">{tab.count}</span> : null}
                </button>
            ))}
        </div>
    );
}

export function EmptyPanel({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
            <p className="text-sm font-extrabold text-slate-800">{title}</p>
            <p className="mt-1 text-[12.5px] text-slate-500">{text}</p>
        </div>
    );
}

export function ZoneRule({
    title,
    children,
    tone = "info",
}: {
    title: string;
    children: ReactNode;
    tone?: "info" | "warn";
}) {
    return (
        <div
            className={
                "rounded-[13px] border px-3 py-2.5 text-[10.5px] leading-relaxed " +
                (tone === "warn"
                    ? "border-[#ecdcb3] bg-[#fff9eb] text-[#705f30]"
                    : "border-[#d7e5e8] bg-[#f8fbfc] text-[#50676f]")
            }
        >
            <b className={tone === "warn" ? "text-[#705f30]" : "text-[#153f47]"}>{title}</b> {children}
        </div>
    );
}

export function UserGuideBanner({
    desc,
    items,
    rule,
}: {
    desc: string;
    items?: [string, string][];
    rule?: string;
}) {
    return (
        <div className="mb-3.5 overflow-hidden rounded-[18px] border border-[#ead9ad] bg-[linear-gradient(135deg,#fffdf6,#fff8e8)] shadow-[0_8px_22px_rgba(24,52,64,.045)]">
            <div className="flex items-start gap-2.5 px-4 py-3.5">
                <span
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-[#f3e4b8] text-[17px]"
                    aria-hidden
                >
                    🧭
                </span>
                <div>
                    <b className="block text-[12.5px] font-extrabold text-[#16313d]">What is inside this button?</b>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#6b5a2a]">{desc}</p>
                </div>
            </div>
            {items?.length ? (
                <div className="grid grid-cols-1 gap-1.5 border-t border-[#ead9ad]/70 px-3.5 py-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map(([title, text]) => (
                        <div key={title} className="rounded-xl border border-[#e0e8ea] bg-white px-2.5 py-2">
                            <b className="block text-[10px] text-[#173e47]">{title}</b>
                            <span className="mt-1 block text-[10px] leading-relaxed text-[#6d7e85]">{text}</span>
                        </div>
                    ))}
                </div>
            ) : null}
            {rule ? (
                <div className="mx-3.5 mb-3 rounded-[11px] border border-[#ead9ad] bg-[#fff8e8] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#725e2a]">
                    <b>Simple rule:</b> {rule}
                </div>
            ) : null}
        </div>
    );
}
