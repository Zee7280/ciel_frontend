"use client";

import { useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import {
    COMMUNITY_AWARD_CRITERIA,
    whyThisCommunityRank,
    type CommunityAwardBadge,
    type CommunityAwardCard,
} from "@/utils/communityAwardModel";

const BANDS = [
    "National Showcase Ready",
    "Strong National Showcase Candidate",
    "Credible Community Impact",
    "Developing Evidence Base",
    "Strengthen Before External Showcase",
] as const;

const CII_BANDS = ["90+", "80-89", "70-79", "60-69", "<60"] as const;

type Filters = {
    from: string;
    to: string;
    year: string;
    semester: string;
    university: string;
    department: string;
    faculty: string;
    partner: string;
    sdg: string;
    cii: string;
    band: string;
    search: string;
};

const EMPTY_FILTERS: Filters = {
    from: "",
    to: "",
    year: "",
    semester: "",
    university: "",
    department: "",
    faculty: "",
    partner: "",
    sdg: "",
    cii: "",
    band: "",
    search: "",
};

function nationalBand(total: number): (typeof BANDS)[number] {
    if (total >= 90) return "National Showcase Ready";
    if (total >= 80) return "Strong National Showcase Candidate";
    if (total >= 70) return "Credible Community Impact";
    if (total >= 60) return "Developing Evidence Base";
    return "Strengthen Before External Showcase";
}

function ciiBand(score: number | null): string {
    if (score == null || Number.isNaN(score)) return "";
    if (score >= 90) return "90+";
    if (score >= 80) return "80-89";
    if (score >= 70) return "70-79";
    if (score >= 60) return "60-69";
    return "<60";
}

function cielHistory(card: CommunityAwardCard): CommunityAwardBadge[] {
    const rows = card.awardBadgeHistory?.length ? card.awardBadgeHistory : card.awardBadges || [];
    return rows
        .filter((badge) => badge.kind === "ciel")
        .slice()
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function unique(cards: CommunityAwardCard[], pick: (card: CommunityAwardCard) => string) {
    return Array.from(new Set(cards.map(pick).map((value) => value.trim()).filter((value) => value && value !== "—"))).sort();
}

export default function AdminNationalRankingStudio({
    cards,
    notifyEndpoint,
    onPublished,
}: {
    cards: CommunityAwardCard[];
    notifyEndpoint: string;
    onPublished: () => void;
}) {
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [draft, setDraft] = useState<CommunityAwardCard[] | null>(null);
    const [batchName, setBatchName] = useState("");
    const [published, setPublished] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rubricOpen, setRubricOpen] = useState(false);
    const [openBatchKey, setOpenBatchKey] = useState<string | null>(null);

    const years = unique(cards, (card) => card.year);
    const semesters = unique(cards, (card) => card.semester);
    const universities = unique(cards, (card) => card.university);
    const departments = unique(cards, (card) => card.department);
    const faculties = unique(cards, (card) => card.faculty_name);
    const partners = unique(cards, (card) => card.organization_name);
    const sdgs = unique(cards, (card) => card.sdg);

    const filtered = useMemo(() => {
        const q = filters.search.trim().toLowerCase();
        return cards.filter((card) => {
            if ((filters.from || filters.to) && !card.month) return false;
            if (filters.from && card.month < filters.from) return false;
            if (filters.to && card.month > filters.to) return false;
            if (filters.year && card.year !== filters.year) return false;
            if (filters.semester && card.semester !== filters.semester) return false;
            if (filters.university && card.university !== filters.university) return false;
            if (filters.department && card.department !== filters.department) return false;
            if (filters.faculty && card.faculty_name !== filters.faculty) return false;
            if (filters.partner && card.organization_name !== filters.partner) return false;
            if (filters.sdg && card.sdg !== filters.sdg) return false;
            if (filters.cii && ciiBand(card.cii) !== filters.cii) return false;
            if (filters.band && nationalBand(card.total) !== filters.band) return false;
            if (q) {
                const hay = `${card.project_title} ${card.student_name} ${card.id}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [cards, filters]);

    const ranked = useMemo(() => {
        const source = draft ?? [];
        return [...source].sort(
            (a, b) => b.total - a.total || (b.cii || 0) - (a.cii || 0) || b.hours - a.hours,
        );
    }, [draft]);

    const avg = ranked.length ? Math.round(ranked.reduce((sum, card) => sum + card.total, 0) / ranked.length) : 0;

    const batches = useMemo(() => {
        const groups = new Map<
            string,
            { key: string; label: string; at: string; by?: string; rows: { card: CommunityAwardCard; badge: CommunityAwardBadge }[] }
        >();
        for (const card of cards) {
            for (const badge of cielHistory(card)) {
                const key = `${badge.scope}|${String(badge.at || "").slice(0, 16)}`;
                const group = groups.get(key) || {
                    key,
                    label: badge.scope || badge.label,
                    at: badge.at,
                    by: badge.by,
                    rows: [],
                };
                group.rows.push({ card, badge });
                groups.set(key, group);
            }
        }
        return Array.from(groups.values())
            .map((group) => ({
                ...group,
                rows: group.rows.slice().sort((a, b) => a.badge.rank - b.badge.rank),
            }))
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .slice(0, 12);
    }, [cards]);

    const openBatch = batches.find((batch) => batch.key === openBatchKey) || null;

    const setFilter = (key: keyof Filters, value: string) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setDraft(null);
        setPublished(false);
        setError(null);
    };

    const review = () => {
        const next = [...filtered].sort(
            (a, b) => b.total - a.total || (b.cii || 0) - (a.cii || 0) || b.hours - a.hours,
        );
        setDraft(next);
        setPublished(false);
        setError(null);
        const bits = ["CIEL PK Ranking", filters.semester || filters.year || "All dates", filters.department || filters.university || filters.partner || "", filters.sdg || ""]
            .filter(Boolean);
        setBatchName(`${bits.join(" · ")} · ${next.length} project${next.length === 1 ? "" : "s"}`);
    };

    const publish = async () => {
        if (!ranked.length || publishing) return;
        setPublishing(true);
        setError(null);
        const scopeLabel = batchName.trim() || `CIEL PK Ranking · ${ranked.length} projects`;
        const picks = ranked.map((card, index) => ({
            reportId: card.id,
            rank: index + 1,
            of: ranked.length,
            total: card.total,
        }));
        try {
            const res = await authenticatedFetch(notifyEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: "ciel", scopeLabel, picks, reportIds: picks.map((pick) => pick.reportId) }),
            });
            const body = await res?.json().catch(() => null);
            if (!res?.ok || body?.success === false) {
                setError(typeof body?.message === "string" ? body.message : "Could not publish this ranking.");
                return;
            }
            setPublished(true);
            onPublished();
        } catch {
            setError("Could not publish this ranking.");
        } finally {
            setPublishing(false);
        }
    };

    const field = "grid gap-1 text-[10px] font-black uppercase tracking-wide text-[#5d7178]";
    const control = "w-full rounded-[9px] border border-[#dbe7e9] bg-white px-2.5 py-2 text-[12px] font-semibold normal-case tracking-normal text-[#173540]";

    return (
        <div className="space-y-3">
            <section className="overflow-hidden rounded-[26px] bg-[linear-gradient(125deg,#072e39,#0a625c_58%,#14a99c)] text-white shadow-[0_18px_48px_rgba(11,56,66,.13)]">
                <div className="grid items-center gap-4 px-6 py-5 md:grid-cols-[1fr_auto]">
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#a9f2e8]">
                            CIEL PK · National Ranking AI Analyzer · Review → Publish
                        </div>
                        <h2 className="mt-1 text-[24px] font-black leading-tight">
                            Run comparative rankings across verified Community Service
                        </h2>
                        <p className="mt-1 max-w-[830px] text-[12px] leading-relaxed text-[#d5efec]">
                            Filters define the cohort. Review ranks every verified card and writes a reason for each place.
                            Publish saves that batch on the student flash card. Faculty CII stays locked.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {["Award total /100", "CII stays locked", "Full cohort published", "Earlier batches kept"].map((tag) => (
                                <span key={tag} className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-black">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-right">
                        <div className="text-2xl">⚙️</div>
                        <b className="block text-sm">CIEL PK / Super Admin</b>
                        <small className="text-[#c7e8e4]">Can review and publish rankings</small>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-[#dbe7e9] bg-[#fbfcfd] p-3">
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h3 className="text-[15px] font-black text-[#173540]">1 · Define the ranking cohort</h3>
                        <p className="text-[12px] text-[#6b7f87]">The published badge stores this filter title, the rank, and the reason.</p>
                    </div>
                    <span className="rounded-full bg-[#123f49] px-2.5 py-1 text-[10px] font-black text-white">
                        {cards.length} verified records
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
                    <label className={field}>From<input type="month" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} className={control} /></label>
                    <label className={field}>To<input type="month" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} className={control} /></label>
                    <Select label="Academic year" value={filters.year} onChange={(value) => setFilter("year", value)} options={years} all="All years" />
                    <Select label="Semester" value={filters.semester} onChange={(value) => setFilter("semester", value)} options={semesters} all="All semesters" />
                    <Select label="University" value={filters.university} onChange={(value) => setFilter("university", value)} options={universities} all="All universities" />
                    <Select label="Department" value={filters.department} onChange={(value) => setFilter("department", value)} options={departments} all="All departments" />
                    <Select label="Faculty" value={filters.faculty} onChange={(value) => setFilter("faculty", value)} options={faculties} all="All faculty" />
                    <Select label="NGO / Partner" value={filters.partner} onChange={(value) => setFilter("partner", value)} options={partners} all="All partners" />
                    <Select label="SDG" value={filters.sdg} onChange={(value) => setFilter("sdg", value)} options={sdgs} all="All SDGs" />
                    <Select label="Verified CII" value={filters.cii} onChange={(value) => setFilter("cii", value)} options={[...CII_BANDS]} all="All CII scores" />
                    <Select label="National band" value={filters.band} onChange={(value) => setFilter("band", value)} options={[...BANDS]} all="All grade bands" />
                    <label className={`${field} col-span-2`}>
                        Search
                        <input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Project, student, or id" className={control} />
                    </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={review} className="rounded-[10px] bg-[#123f49] px-3.5 py-2 text-[12px] font-black text-white">
                        A · Review rankings
                    </button>
                    <button
                        type="button"
                        onClick={() => void publish()}
                        disabled={!draft?.length || publishing || published}
                        className="rounded-[10px] bg-[#0e7d74] px-3.5 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {publishing ? "Publishing…" : published ? "Published" : "B · Publish rankings"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setFilters(EMPTY_FILTERS);
                            setDraft(null);
                            setPublished(false);
                            setBatchName("");
                            setError(null);
                        }}
                        className="rounded-[10px] bg-[#edf2f3] px-3.5 py-2 text-[12px] font-black text-[#294a54]"
                    >
                        Reset filters
                    </button>
                    <button type="button" onClick={() => setRubricOpen(true)} className="rounded-[10px] bg-[#edf2f3] px-3.5 py-2 text-[12px] font-black text-[#294a54]">
                        View scoring rubric
                    </button>
                    <span className="text-[12px] text-[#52676f]">
                        {draft
                            ? published
                                ? `Published · ${ranked.length} ranked project${ranked.length === 1 ? "" : "s"}.`
                                : `Draft ready · ${ranked.length} ranked project${ranked.length === 1 ? "" : "s"}. Review before publishing.`
                            : "No draft ranking yet. Review first."}
                    </span>
                </div>
                {error ? <p className="mt-2 text-[12px] font-semibold text-[#b34c4c]">{error}</p> : null}
            </section>

            <section className="overflow-hidden rounded-[22px] border border-[#dbe7e9] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbe7e9] px-4 py-3">
                    <div>
                        <h3 className="text-[15px] font-black">2 · Ranking review</h3>
                        <p className="text-[12px] text-[#6b7f87]">Nothing is published until you press Publish rankings.</p>
                    </div>
                    <input
                        value={batchName}
                        onChange={(e) => setBatchName(e.target.value)}
                        placeholder="Batch / badge title"
                        className="min-w-[220px] rounded-[10px] border border-[#dbe7e9] px-3 py-2 text-[12px]"
                    />
                </div>
                {!draft ? (
                    <div className="px-4 py-10 text-center text-[13px] text-[#6b7f87]">
                        <b className="mb-1 block text-[15px] text-[#173540]">Choose filters and review</b>
                        The ranking uses the live award total. Faculty CII is the tie-breaker, then verified hours.
                    </div>
                ) : ranked.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[13px] text-[#6b7f87]">
                        <b className="mb-1 block text-[15px] text-[#173540]">No eligible records</b>
                        Change the filters to include verified projects.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[980px]">
                            <div className="grid grid-cols-[70px_1.4fr_110px_90px_90px_110px_1.8fr_100px] gap-2 bg-[#f7fafb] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#70838a]">
                                <span>Rank</span><span>Project</span><span>National</span><span>CII</span><span>Trend</span><span>Best record</span><span>Why this place</span><span>{published ? "Published" : "Preview"}</span>
                            </div>
                            {ranked.map((card, index) => {
                                const history = cielHistory(card);
                                const previous = history.length ? history[history.length - 1] : null;
                                const move = previous ? previous.rank - (index + 1) : null;
                                const best = history.length ? Math.min(...history.map((badge) => badge.rank)) : null;
                                return (
                                    <div key={card.id} className="grid grid-cols-[70px_1.4fr_110px_90px_90px_110px_1.8fr_100px] items-start gap-2 border-t border-[#dbe7e9] px-3 py-3 text-[12px]">
                                        <b className="text-[16px] text-[#0e746c]">#{index + 1}</b>
                                        <div>
                                            <b>{card.project_title}</b>
                                            <div className="text-[11px] text-[#6b7f87]">{card.student_name} · {card.department} · {card.semester}</div>
                                        </div>
                                        <div>
                                            <b>{card.total}</b>
                                            <div className="text-[11px] text-[#6b7f87]">{nationalBand(card.total)}</div>
                                        </div>
                                        <div>
                                            <b>{card.cii ?? "—"}</b>
                                            <div className="text-[11px] text-[#6b7f87]">Faculty locked</div>
                                        </div>
                                        <div className="text-[12px] font-black">
                                            {move == null ? <span className="text-[#6b7c86]">New cohort</span> : move > 0 ? <span className="text-[#1d765d]">▲ {move}</span> : move < 0 ? <span className="text-[#b34c4c]">▼ {Math.abs(move)}</span> : <span className="text-[#6b7c86]">▬ same</span>}
                                        </div>
                                        <div className="text-[11px] text-[#6b7f87]">{best == null ? "No prior batch" : `Best #${best}`}</div>
                                        <p className="rounded-[11px] border border-[#dbe8e8] bg-[#f8fbfb] p-2 text-[11px] leading-relaxed text-[#3e575e]">
                                            {whyThisCommunityRank(card, index, ranked, avg)}
                                        </p>
                                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${published ? "bg-[#e8f5ef] text-[#1d765d]" : "bg-[#edf4fb] text-[#2f6a9c]"}`}>
                                            {published ? "PUBLISHED" : "REVIEW"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            <section className="overflow-hidden rounded-[22px] border border-[#dbe7e9] bg-white">
                <div className="border-b border-[#dbe7e9] px-4 py-3">
                    <h3 className="text-[15px] font-black">Published National Ranking batches</h3>
                    <p className="text-[12px] text-[#6b7f87]">Each publish adds a badge. A later run does not erase the earlier one.</p>
                </div>
                {batches.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[13px] text-[#6b7f87]">
                        <b className="mb-1 block text-[15px] text-[#173540]">No published batches yet</b>
                        Review a ranking and publish it.
                    </div>
                ) : (
                    <div className="grid gap-3 p-3 md:grid-cols-2">
                        {batches.map((batch) => (
                            <article key={batch.key} className="rounded-2xl border border-[#dbe7e9] p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="text-[13px] font-black">⚙️ {batch.label}</h4>
                                        <p className="text-[11px] text-[#6b7f87]">{batch.by || "CIEL PK"} · {new Date(batch.at).toLocaleString()}</p>
                                    </div>
                                    <span className="rounded-full bg-[#e8f5ef] px-2 py-1 text-[10px] font-black text-[#1d765d]">PUBLISHED</span>
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                                    <div><b className="block text-base">{batch.rows.length}</b>Projects</div>
                                    <div><b className="block text-base">#1</b>Top rank</div>
                                    <div><b className="block text-base">{batch.rows[0]?.badge.score ?? "—"}</b>Top grade</div>
                                </div>
                                <button type="button" onClick={() => setOpenBatchKey(batch.key)} className="mt-2 rounded-[9px] bg-[#eef3f4] px-2.5 py-1.5 text-[11px] font-black text-[#294a54]">
                                    View batch
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {rubricOpen ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setRubricOpen(false)} role="dialog">
                    <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-black">How this national rank is scored</h3>
                        <p className="mt-1 text-[12px] text-[#6b7f87]">
                            The number in the National column is the live award total. Faculty CII is shown beside it and only breaks ties. Publishing does not change the faculty score.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {COMMUNITY_AWARD_CRITERIA.map((item) => (
                                <div key={item.key} className="rounded-xl border border-[#dbe7e9] p-3">
                                    <div className="flex justify-between text-[12px] font-black"><span>{item.title}</span><span>{item.max} pts</span></div>
                                    <p className="mt-1 text-[11px] text-[#6b7f87]">{item.note}</p>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => setRubricOpen(false)} className="mt-4 rounded-[10px] bg-[#123f49] px-3 py-2 text-[12px] font-black text-white">Close</button>
                    </div>
                </div>
            ) : null}

            {openBatch ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpenBatchKey(null)} role="dialog">
                    <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-black">{openBatch.label}</h3>
                        <p className="mt-1 text-[12px] text-[#6b7f87]">Saved snapshot · {new Date(openBatch.at).toLocaleString()}</p>
                        <div className="mt-3 space-y-2">
                            {openBatch.rows.map((row) => (
                                <div key={row.card.id} className="rounded-xl border border-[#dbe7e9] px-3 py-2 text-[12px]">
                                    <b>#{row.badge.rank}</b> {row.card.project_title} · {row.badge.score}/100 · CII {row.card.cii ?? "—"}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => setOpenBatchKey(null)} className="mt-4 rounded-[10px] bg-[#123f49] px-3 py-2 text-[12px] font-black text-white">Close</button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function Select({
    label,
    value,
    onChange,
    options,
    all,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    all: string;
}) {
    return (
        <label className="grid gap-1 text-[10px] font-black uppercase tracking-wide text-[#5d7178]">
            {label}
            <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-[9px] border border-[#dbe7e9] bg-white px-2.5 py-2 text-[12px] font-semibold normal-case tracking-normal text-[#173540]">
                <option value="">{all}</option>
                {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </label>
    );
}
