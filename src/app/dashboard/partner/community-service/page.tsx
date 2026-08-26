"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, CommunityHero, HubBackButton, HubTile } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import type { CommunityAwardCard } from "@/utils/communityAwardModel";
import { readStoredCurrentUser } from "@/utils/currentUser";

type View = "home" | "live" | "approved" | "run" | "analytics";

type OppRow = { id: string; title: string; city?: string; volunteersApplied?: number; volunteersNeeded?: number; organization_name?: string };

export default function PartnerCommunityServicePage() {
    const user = readStoredCurrentUser() as { name?: string; orgType?: string; organization_type?: string; type?: string; orgName?: string } | null;
    const [isUni, setIsUni] = useState(() =>
        String(user?.orgType || user?.organization_type || user?.type || "").toLowerCase().includes("university"),
    );
    const orgName = (typeof user?.orgName === "string" && user.orgName) || (typeof user?.name === "string" ? user.name : "Partner");
    const [view, setView] = useState<View>("home");
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [opps, setOpps] = useState<OppRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/partners/community-service/award-cards", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
            authenticatedFetch("/api/v1/opportunities?partner_id=me", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
        ]).then(([award, list]) => {
            if (cancelled) return;
            setCards(Array.isArray(award?.data) ? award.data : []);
            if (award?.scope === "university" || award?.scope === "partner") {
                setIsUni(award.scope === "university");
            }
            const rows = Array.isArray(list?.data) ? list.data : [];
            setOpps(
                rows.map((o: Record<string, unknown>) => ({
                    id: String(o.id || ""),
                    title: String(o.title || "Opportunity"),
                    city: typeof o.city === "string" ? o.city : undefined,
                    volunteersApplied: typeof o.volunteersApplied === "number" ? o.volunteersApplied : Number(o.applicants_count || 0),
                    volunteersNeeded: typeof o.volunteersNeeded === "number" ? o.volunteersNeeded : Number(o.volunteers_required || 0),
                    organization_name: typeof o.organization_name === "string" ? o.organization_name : undefined,
                })),
            );
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const hours = cards.reduce((s, c) => s + (c.hours || 0), 0);
    const kind = isUni ? "uni" : "par";
    const analyticsHref = isUni ? "/dashboard/partner/university-analytics" : "/dashboard/partner/analytics";

    return (
        <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6">
            <CommunityCrumb role={isUni ? "University" : "Partner"} view={view === "home" ? undefined : view} />
            <CommunityHero
                kicker={`${isUni ? "UNIVERSITY" : "PARTNER"} · COMMUNITY SERVICE`}
                title={isUni ? `${orgName} — Community Service Command 🏛️` : `Welcome, ${orgName} 🤝`}
                subtitle={
                    isUni
                        ? "Every faculty-approved card, live. Your award run turns top ranks into Community Honour badges on student walls."
                        : "The work done with you, by name. Your Best Project award lands straight on the student’s wall."
                }
                gradient={isUni ? "linear-gradient(115deg,#04252b,#0e5f63 55%,#12a5a0 130%)" : "linear-gradient(115deg,#3b1c00,#b45309 60%,#f59e0b 115%)"}
                stats={
                    isUni
                        ? [
                              { value: String(cards.length), label: "APPROVED & LIVE" },
                              { value: `${hours}h`, label: "VERIFIED HOURS" },
                              { value: String(new Set(cards.map((c) => c.department)).size), label: "DEPARTMENTS ACTIVE" },
                          ]
                        : [
                              { value: String(opps.length), label: "LIVE OPPORTUNITIES" },
                              { value: String(cards.length), label: "COMPLETED PROJECTS" },
                              { value: `${hours}h`, label: "HOURS WITH YOU" },
                          ]
                }
            />

            {view !== "home" && (
                <div className="mt-3">
                    <HubBackButton onClick={() => setView("home")} label={`← Back to ${isUni ? "University" : "Partner"} dashboard`} />
                </div>
            )}

            {view === "home" && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <HubTile href="/dashboard/partner/requests/new" badge={isUni ? "UNI-LED" : "START HERE"} emoji="🚀" title="Create an Opportunity" subtitle={isUni ? "University-led drives — publish once, all your students see it." : "Open the Sections A–G form — students see it the moment you publish."} background="linear-gradient(135deg,#0e7d74,#2dd4bf)" />
                    {!isUni && (
                        <HubTile onClick={() => setView("live")} badge={`${opps.length} OPEN`} emoji="📣" title="My Live Opportunities" subtitle="Enrolment and progress on everything you have open right now." background="linear-gradient(135deg,#0369a1,#38bdf8)" />
                    )}
                    <HubTile onClick={() => setView("approved")} badge={`${cards.length} ${isUni ? "LIVE" : "CARDS"}`} emoji={isUni ? "⭐" : "✅"} title={isUni ? "Live & Approved Opportunities" : "Completed Community Work"} subtitle={isUni ? "Every flash card your faculty approved — filterable by department and faculty." : "Faculty-approved flash cards from projects done with you."} background="linear-gradient(135deg,#04252b,#0e7d74)" />
                    <HubTile onClick={() => setView("run")} badge="BADGE ISSUER" emoji="🏆" title="Run the Award Model" subtitle={isUni ? "Rank this university’s cohort — top 3 get the Community Honour badge." : "Pick your Best Project — the badge goes to the student’s wall."} background="linear-gradient(135deg,#7c3aed,#c084fc)" />
                    <HubTile onClick={() => setView("analytics")} badge="LIVE" emoji="📊" title="Analytics" subtitle={isUni ? "Hours, dividend, departments, SDGs — your university’s footprint." : "What the partnership produced, in numbers."} background="linear-gradient(135deg,#0369a1,#38bdf8)" />
                </div>
            )}

            {view === "live" && (
                <div className="mt-4 rounded-[17px] border border-[#dcebee] bg-white px-4 py-4">
                    <p className="text-[9px] font-extrabold tracking-[0.12em] text-[#0e7d74]">📣 LIVE OPPORTUNITIES</p>
                    {loading ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : opps.length === 0 ? <p className="mt-3 text-sm text-slate-500">None open right now.</p> : opps.map((o) => (
                        <Link key={o.id} href="/dashboard/partner/requests" className="mt-2 flex flex-wrap items-center gap-2 rounded-[14px] border border-[#dcebee] px-3.5 py-3">
                            <b className="text-[11px]">{o.title}</b>
                            <span className="flex-1 text-[8.5px] text-[#7a919a]">{o.city || "—"}</span>
                            <span className="rounded-full bg-[#e3f4fa] px-2.5 py-1 text-[7.5px] font-extrabold text-[#0891b2]">📣 LIVE</span>
                        </Link>
                    ))}
                </div>
            )}

            {view === "approved" && (
                <div className="mt-4">
                    {cards.length === 0 ? <p className="text-sm text-slate-500">Faculty-approved cards from work with you will appear here.</p> : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {cards.map((c) => <CommunityFlashCard key={c.id} card={c} />)}
                        </div>
                    )}
                </div>
            )}

            {view === "run" && (
                <div className="mt-4">
                    <CommunityAwardPanel
                        cards={cards}
                        kind={kind}
                        scopeName={orgName}
                        notifyEndpoint="/api/v1/partners/community-service/award-notify"
                        filters={isUni ? { department: true, faculty: true } : { university: true }}
                    />
                </div>
            )}

            {view === "analytics" && (
                <div className="mt-4 space-y-3">
                    <CommunityAwardAnalytics cards={cards} groupBy={isUni ? "department" : "university"} />
                    <a href={analyticsHref} className="inline-block text-[11px] font-extrabold text-[#0e7d74] hover:underline">Open full analytics →</a>
                </div>
            )}
        </div>
    );
}
