"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { CommunityCrumb, CommunityHero, HubBackButton, HubTile } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import CommunityAwardPanel from "@/components/ciel/community-service/CommunityAwardPanel";
import CommunityAwardAnalytics from "@/components/ciel/community-service/CommunityAwardAnalytics";
import CommunityFlashCard from "@/components/ciel/community-service/CommunityFlashCard";
import CommunityQueueCard from "@/components/ciel/community-service/CommunityQueueCard";
import {
    mapCommunityPipelineRow,
    mergeCommunityLiveDeck,
    type CommunityAwardCard,
    type CommunityPipelineRow,
} from "@/utils/communityAwardModel";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { isFacultyCommunityLiveCard, isFacultyCommunityWaiting } from "@/utils/reviewQueue";

type View = "home" | "live" | "pending" | "approved" | "run" | "analytics";

type OppRow = {
    id: string;
    title: string;
    city?: string;
    volunteersApplied?: number;
    volunteersNeeded?: number;
};

export default function PartnerCommunityServicePage() {
    const user = readStoredCurrentUser() as {
        name?: string;
        orgType?: string;
        organization_type?: string;
        type?: string;
        orgName?: string;
    } | null;
    const [isUni, setIsUni] = useState(() =>
        String(user?.orgType || user?.organization_type || user?.type || "")
            .toLowerCase()
            .includes("university"),
    );
    const orgName =
        (typeof user?.orgName === "string" && user.orgName) ||
        (typeof user?.name === "string" ? user.name : "Partner");
    const [view, setView] = useState<View>("home");
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [opps, setOpps] = useState<OppRow[]>([]);
    const [pipeline, setPipeline] = useState<CommunityPipelineRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/partners/community-service/award-cards", {}, { redirectToLogin: false }).then(
                (r) => (r?.ok ? r.json() : null),
            ),
            authenticatedFetch("/api/v1/opportunities?partner_id=me", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/partner/reports?limit=200", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ])
            .then(([award, list, reports]) => {
                if (cancelled) return;
                setCards(Array.isArray(award?.data) ? award.data : []);
                setPipeline(
                    (Array.isArray(reports?.data) ? reports.data : [])
                        .filter((item: unknown) => item && typeof item === "object")
                        .map((item: Record<string, unknown>) => mapCommunityPipelineRow(item))
                        .filter((r: CommunityPipelineRow | null): r is CommunityPipelineRow => Boolean(r?.id)),
                );
                if (award?.scope === "university" || award?.scope === "partner") {
                    setIsUni(award.scope === "university");
                }
                const rows = Array.isArray(list?.data) ? list.data : [];
                setOpps(
                    rows.map((o: Record<string, unknown>) => ({
                        id: String(o.id || ""),
                        title: String(o.title || "Opportunity"),
                        city: typeof o.city === "string" ? o.city : undefined,
                        volunteersApplied:
                            typeof o.volunteersApplied === "number" ? o.volunteersApplied : Number(o.applicants_count || 0),
                        volunteersNeeded:
                            typeof o.volunteersNeeded === "number" ? o.volunteersNeeded : Number(o.volunteers_required || 0),
                    })),
                );
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setCards([]);
                setPipeline([]);
                setOpps([]);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const liveRows = useMemo(() => pipeline.filter((r) => isFacultyCommunityLiveCard(r)), [pipeline]);
    const waiting = useMemo(() => pipeline.filter((r) => isFacultyCommunityWaiting(r)), [pipeline]);
    const deckCards = useMemo(
        () => mergeCommunityLiveDeck(cards, liveRows, isFacultyCommunityLiveCard),
        [cards, liveRows],
    );
    const hours = deckCards.reduce((s, c) => s + (c.hours || 0), 0);
    const kind = isUni ? "uni" : "par";
    const analyticsHref = isUni ? "/dashboard/partner/university-analytics" : "/dashboard/partner/analytics";
    const reviewHref = (id: string) => `/dashboard/partner/verify/${id}`;

    return (
        <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6">
            <CommunityCrumb role={isUni ? "University" : "Partner"} view={view === "home" ? undefined : view} />
            {view === "home" ? (
                <CommunityHero
                    kicker={`${isUni ? "UNIVERSITY" : "PARTNER"} · COMMUNITY SERVICE`}
                    title={isUni ? `${orgName} — Community Service Command 🏛️` : namedTimeGreeting(orgName, "🤝")}
                    subtitle={
                        isUni
                            ? "Live flash cards for this university. Your award run turns top ranks into Community Honour badges."
                            : "Work done with you, by name. Your Best Project award lands on the student’s wall."
                    }
                    gradient="linear-gradient(115deg,#04252b,#0e5f63 55%,#12a5a0 130%)"
                    stats={
                        isUni
                            ? [
                                  { value: String(waiting.length), label: "WAITING" },
                                  { value: String(deckCards.length), label: "APPROVED & LIVE" },
                                  { value: `${hours}h`, label: "VERIFIED HOURS" },
                              ]
                            : [
                                  { value: String(waiting.length), label: "WAITING" },
                                  { value: String(deckCards.length), label: "APPROVED" },
                                  { value: `${hours}h`, label: "HOURS WITH YOU" },
                              ]
                    }
                />
            ) : (
                <div className="mt-4">
                    <HubBackButton
                        onClick={() => setView("home")}
                        label={`← Back to ${isUni ? "University" : "Partner"} community service`}
                    />
                </div>
            )}

            {view === "home" && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <HubTile
                        href="/dashboard/partner/requests/new"
                        badge={isUni ? "UNI-LED" : "START HERE"}
                        badgeClass="text-[#0e7d74]"
                        emoji="🚀"
                        title="Create an Opportunity"
                        subtitle={
                            isUni
                                ? "University-led drives — publish once, all your students see it."
                                : "Open the Sections A–G form — students see it the moment you publish."
                        }
                        background="linear-gradient(135deg,#0e7d74,#2dd4bf)"
                    />
                    {!isUni && (
                        <HubTile
                            onClick={() => setView("live")}
                            badge={`${opps.length} OPEN`}
                            badgeClass="text-[#0369a1]"
                            emoji="📣"
                            title="My Live Opportunities"
                            subtitle="Enrolment and progress on everything you have open right now."
                            background="linear-gradient(135deg,#0369a1,#38bdf8)"
                        />
                    )}
                    <HubTile
                        onClick={() => setView("pending")}
                        badge={`${waiting.length} IN QUEUE`}
                        badgeClass="text-[#b45309]"
                        emoji="⏳"
                        title="Waiting for Approval"
                        subtitle="Submitted reports still in the review pipeline — not live cards yet."
                        background="linear-gradient(135deg,#b45309,#fbbf24)"
                    />
                    <HubTile
                        onClick={() => setView("approved")}
                        badge={`${deckCards.length} ${isUni ? "LIVE" : "CARDS"}`}
                        badgeClass="text-[#04252b]"
                        emoji={isUni ? "⭐" : "✅"}
                        title={isUni ? "Live & Approved Opportunities" : "Completed Community Work"}
                        subtitle={
                            isUni
                                ? "Every live flash card for this university."
                                : "Live flash cards from projects done with you."
                        }
                        background="linear-gradient(135deg,#04252b,#0e7d74)"
                    />
                    <HubTile
                        onClick={() => setView("run")}
                        badge="BADGE ISSUER"
                        badgeClass="text-[#6d28d9]"
                        emoji="🏆"
                        title="Run the Award Model"
                        subtitle={
                            isUni
                                ? "Rank this university’s cohort — top 3 get the Community Honour badge."
                                : "Pick your Best Project — the badge goes to the student’s wall."
                        }
                        background="linear-gradient(135deg,#6d28d9,#a78bfa)"
                    />
                    <HubTile
                        onClick={() => setView("analytics")}
                        badge="LIVE"
                        badgeClass="text-[#0369a1]"
                        emoji="📊"
                        title="Analytics"
                        subtitle={
                            isUni
                                ? "Hours, dividend, departments, SDGs — your university’s footprint."
                                : "What the partnership produced, in numbers."
                        }
                        background="linear-gradient(135deg,#0369a1,#38bdf8)"
                    />
                </div>
            )}

            {view === "live" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Live opportunities</h2>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : opps.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">None open right now.</p>
                    ) : (
                        opps.map((o) => (
                            <Link
                                key={o.id}
                                href="/dashboard/partner/requests"
                                className="mt-2 flex flex-wrap items-center gap-2 rounded-[14px] border border-[#dcebee] bg-white px-3.5 py-3"
                            >
                                <b className="text-[11px]">{o.title}</b>
                                <span className="flex-1 text-[8.5px] text-[#7a919a]">{o.city || "—"}</span>
                                <span className="rounded-full bg-[#e3f4fa] px-2.5 py-1 text-[7.5px] font-extrabold text-[#0891b2]">
                                    LIVE
                                </span>
                            </Link>
                        ))
                    )}
                </div>
            )}

            {view === "pending" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Waiting for approval</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Reports still in the pipeline. Live cards are under{" "}
                        {isUni ? "Live & Approved Opportunities" : "Completed Community Work"}.
                    </p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : waiting.length === 0 ? (
                        <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-6 text-sm text-emerald-800">
                            Nothing waiting.
                        </p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {waiting.map((r) => (
                                <CommunityQueueCard
                                    key={r.id}
                                    href={reviewHref(r.id)}
                                    title={r.project_title || "Report"}
                                    student={r.student_name || "Student"}
                                    org={r.organization_name}
                                    hours={r.hours}
                                    cta="Open review →"
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "approved" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isUni ? "Live & approved opportunities" : "Completed community work"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Same flash cards that appear on student walls.</p>
                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">Live cards appear here after they clear the pipeline.</p>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {deckCards.map((c) => (
                                <CommunityFlashCard key={c.id} card={c} href={reviewHref(c.id)} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "run" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Run the Award Model</h2>
                    <p className="mt-1 mb-4 text-sm text-slate-500">
                        Rank the live deck. Notifications still use the existing award endpoint.
                    </p>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : deckCards.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                            No live cards to rank yet.
                        </p>
                    ) : (
                        <CommunityAwardPanel
                            cards={deckCards}
                            kind={kind}
                            scopeName={orgName}
                            notifyEndpoint="/api/v1/partners/community-service/award-notify"
                            filters={isUni ? { department: true, faculty: true } : { university: true }}
                        />
                    )}
                </div>
            )}

            {view === "analytics" && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : (
                        <CommunityAwardAnalytics cards={deckCards} groupBy={isUni ? "department" : "university"} />
                    )}
                    <a href={analyticsHref} className="inline-block text-[11px] font-semibold text-[#0e7d74] hover:underline">
                        Open full analytics →
                    </a>
                </div>
            )}
        </div>
    );
}
