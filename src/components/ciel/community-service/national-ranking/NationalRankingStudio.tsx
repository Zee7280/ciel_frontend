"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import "./ranking-studio.css";
import {
    FILTER_TITLES,
    fmtDate,
    fmtNum,
    metricBarPercent,
    metricDisplay,
    prettyFilterValue,
    type CustomWeights,
    type LensMeta,
    type PackageRow,
    type ProjectRanking,
    type PublicationSummary,
    type RunPayload,
    type RunRow,
    type StudioFilters,
    type StudioPreview,
    type StudioRole,
} from "./studio-types";
import { PackageDrawer, GroupDrawer, PublishModal, FilterChips } from "./StudioParts";
import { HistoryScreen, PackagesScreen, PublishedScreen, ReviewScreen, RulesScreen } from "./StudioScreens";

type Tab = "analyzer" | "review" | "packages" | "published" | "history" | "rules";

const PAGE_SIZE = 12;
const DEFAULT_WEIGHTS: CustomWeights = { impact: 35, sustain: 20, learning: 25, cii: 20 };

/** Shown before the first preview arrives; the server's list (with descriptions) replaces it. */
const FALLBACK_LENSES: LensMeta[] = [
    { key: "excellence", title: "Overall Project Excellence", description: "", kind: "points", needsEvaluation: true },
    { key: "cii", title: "Approved CII Score", description: "", kind: "points", needsEvaluation: false },
];
const LENS_GROUPS: Array<[string, string[]]> = [
    ["Overall", ["excellence", "cii", "custom"]],
    ["Evidence-based criteria", ["impact", "need", "sustain", "partner", "efficiency", "sdg", "scale", "learning"]],
    ["Reported measures", ["hours", "reach", "funds"]],
];

const MORE_FILTERS: Array<[keyof StudioFilters, string, string]> = [
    ["semester", "Semester", "semesters"],
    ["city", "City", "cities"],
    ["partner", "Partner", "partners"],
    ["activity", "Activity", "activities"],
    ["theme", "Impact theme", "themes"],
    ["ciiBadge", "CII badge", "badges"],
    ["privacy", "Evidence class", "classes"],
];

function apiMessage(json: unknown, fallback: string): string {
    const m = (json as { message?: unknown } | null)?.message;
    if (Array.isArray(m)) return m.join(" ");
    return typeof m === "string" && m.trim() ? m : fallback;
}

class StudioApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

async function api<T>(url: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
    const res = await authenticatedFetch(
        url,
        init ? { headers: { "Content-Type": "application/json" }, ...init } : undefined,
        timeoutMs ? { timeoutMs } : undefined,
    );
    const json = await res?.json().catch(() => null);
    if (!res?.ok) throw new StudioApiError(apiMessage(json, "The request failed. Please try again."), res?.status ?? 0);
    return ((json as { data?: T } | null)?.data ?? json) as T;
}

export default function NationalRankingStudio({
    role,
    packagesEndpoint,
    analyzeEndpoint,
    publishEndpoint,
    reviewsEndpoint,
}: {
    role: StudioRole;
    packagesEndpoint: string;
    analyzeEndpoint: string;
    publishEndpoint: string;
    reviewsEndpoint: string;
}) {
    const studioBase = packagesEndpoint.replace(/\/packages$/, "/studio");

    const [tab, setTab] = useState<Tab>("analyzer");
    const [busy, setBusy] = useState(false);
    const [previewBusy, setPreviewBusy] = useState(false);
    /** The Studio endpoints answered 404: this frontend is newer than the backend it talks to. */
    const [studioUnavailable, setStudioUnavailable] = useState(false);
    const [packages, setPackages] = useState<PackageRow[]>([]);
    const [run, setRun] = useState<RunPayload | null>(null);
    const [cohortLabel, setCohortLabel] = useState(role === "ciel_admin" ? "National cohort" : "University cohort");
    const [log, setLog] = useState("Ready. Check the packages, then run the analyzer.");

    // ranking definition
    const [lens, setLens] = useState("excellence");
    const [groupBy, setGroupBy] = useState("project");
    const [filters, setFilters] = useState<StudioFilters>({});
    const [weights, setWeights] = useState<CustomWeights>(DEFAULT_WEIGHTS);
    const [nameInput, setNameInput] = useState("");
    const nameTouched = useRef(false);

    // preview + table
    const [preview, setPreview] = useState<StudioPreview | null>(null);
    const [dirty, setDirty] = useState(false);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [showCount, setShowCount] = useState("all");

    // overlays
    const [publishOpen, setPublishOpen] = useState(false);
    const [drawer, setDrawer] = useState<{ kind: "project" | "group"; id: string } | null>(null);
    const [publishing, setPublishing] = useState(false);

    // published / history
    const [history, setHistory] = useState<PublicationSummary[]>([]);
    const [wallProject, setWallProject] = useState("");
    const [wallRankings, setWallRankings] = useState<ProjectRanking[]>([]);

    const appendLog = (line: string) => setLog((prev) => `${prev}\n${new Date().toLocaleTimeString()} · ${line}`);

    // ---------------------------------------------------------------------------------- data
    const loadPackages = useCallback(async () => {
        const data = await api<{ packages?: PackageRow[]; cohortLabel?: string; run?: RunPayload | null }>(packagesEndpoint);
        setPackages(Array.isArray(data?.packages) ? data.packages : []);
        if (data?.cohortLabel) setCohortLabel(data.cohortLabel);
        if (data?.run?.runId) setRun(data.run);
        return data;
    }, [packagesEndpoint]);

    const buildBody = useCallback(
        (extra: Record<string, unknown> = {}) => ({ lens, groupBy, filters, weights, ...extra }),
        [lens, groupBy, filters, weights],
    );

    const fetchPreview = useCallback(async () => {
        const data = await api<StudioPreview>(`${studioBase}/preview`, { method: "POST", body: JSON.stringify(buildBody()) });
        setPreview(data);
        setDirty(false);
        setPage(0);
        if (!nameTouched.current) setNameInput(data.result.name);
        return data;
    }, [studioBase, buildBody]);

    const loadHistory = useCallback(async () => {
        try {
            setHistory(await api<PublicationSummary[]>(`${studioBase}/history`));
        } catch {
            /* history is informational; the studio keeps working without it */
        }
    }, [studioBase]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setPreviewBusy(true);
            try {
                const data = await loadPackages();
                if (cancelled) return;
                setLog(`Loaded ${data?.packages?.length ?? 0} approved packages from ${data?.cohortLabel || "Impact Wall"}.`);
                await fetchPreview();
                await loadHistory();
            } catch (err) {
                if (cancelled) return;
                if (err instanceof StudioApiError && err.status === 404) setStudioUnavailable(true);
                else toast.error(err instanceof Error ? err.message : "Could not load the Impact Wall packages.");
            } finally {
                if (!cancelled) setPreviewBusy(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // initial load only; later refreshes are explicit
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [packagesEndpoint]);

    const markDirty = () => setDirty(true);
    const changeFilter = (key: keyof StudioFilters, value: string) => {
        setFilters((prev) => {
            const next = { ...prev } as Record<string, unknown>;
            if (value === "") delete next[key];
            else if (key === "minHours" || key === "minCii") next[key] = Number(value);
            else next[key] = value;
            return next as StudioFilters;
        });
        markDirty();
    };

    const resetFilters = () => {
        setFilters({});
        setLens("excellence");
        setGroupBy("project");
        setWeights(DEFAULT_WEIGHTS);
        nameTouched.current = false;
        setNameInput("");
        markDirty();
    };

    // ---------------------------------------------------------------------------------- actions
    /** Reads packages with AI in short server calls until nothing is left (or no progress). */
    const runAiAnalysis = useCallback(async (): Promise<RunPayload | null> => {
        appendLog("Eligibility checks started.");
        appendLog(`${packages.length} approved packages sent. The server holds any that fail approval, hours or packet checks, and reuses earlier reads of unchanged packages.`);
        let runId: string | undefined;
        let lastAnalyzed = -1;
        let finalRun: RunPayload | null = null;
        for (let call = 1; call <= 40; call += 1) {
            const data = await api<RunPayload>(
                analyzeEndpoint,
                {
                    method: "POST",
                    body: JSON.stringify({
                        ...(runId ? { runId } : {}),
                        projects: packages.map((p) => ({ id: p.id, version: p.version })),
                    }),
                },
                295_000,
            );
            finalRun = data;
            runId = data.runId;
            setRun(data);
            const progress = data.progress;
            if (!progress || progress.remaining <= 0) break;
            appendLog(`Read ${progress.analyzed} of ${progress.total}. Continuing with ${progress.remaining} left…`);
            if (progress.analyzed <= lastAnalyzed) {
                appendLog("No further progress. Run the analyzer again to retry the rest.");
                break;
            }
            lastAnalyzed = progress.analyzed;
        }
        const ranked = finalRun?.rows?.filter((r) => r.status === "Ranked").length ?? 0;
        appendLog(`Validated ${ranked} ranked evaluations.`);
        return finalRun;
    }, [packages, analyzeEndpoint]);

    const runAnalyzer = async () => {
        if (busy || previewBusy) return;
        const lensMeta = (preview?.lenses ?? FALLBACK_LENSES).find((l) => l.key === lens);
        setPreviewBusy(true);
        try {
            let data = await fetchPreview();
            if (lensMeta?.needsEvaluation && data.result.unreadIds.length > 0) {
                setBusy(true);
                const finished = await runAiAnalysis();
                const left = finished?.progress?.remaining ?? 0;
                data = await fetchPreview();
                if (left > 0) toast.warning(`${left} package(s) are still unread. Run the analyzer again to continue.`);
            }
            toast.success(`Ranking calculated for ${data.result.eligibleIds.length} eligible project${data.result.eligibleIds.length === 1 ? "" : "s"}.`);
        } catch (err) {
            appendLog(err instanceof Error ? err.message : "Analysis failed.");
            toast.error(err instanceof Error ? err.message : "Analysis failed.");
        } finally {
            setBusy(false);
            setPreviewBusy(false);
        }
    };

    const recheckPackages = async () => {
        if (busy || previewBusy) return;
        setPreviewBusy(true);
        try {
            const data = await loadPackages();
            await fetchPreview();
            setLog(`Re-checked ${data?.packages?.length ?? 0} packages against approval, hours, packet and evidence-access rules.`);
            toast.success("Package check finished.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Package check failed.");
        } finally {
            setPreviewBusy(false);
        }
    };

    const confirmPublish = async () => {
        if (!preview || publishing) return;
        setPublishing(true);
        try {
            const out = await api<{ status: "published" | "unchanged"; publication: PublicationSummary }>(`${studioBase}/publish`, {
                method: "POST",
                body: JSON.stringify(buildBody({ name: nameInput.trim() || undefined })),
            });
            setPublishOpen(false);
            await loadHistory();
            toast.success(
                out.status === "unchanged"
                    ? "This ranking is already published with identical results."
                    : `Published “${out.publication.name}”${out.publication.revision > 1 ? ` (update ${out.publication.revision})` : ""}.`,
            );
            const firstProject = preview.result.rows[0]?.projectIds?.[0];
            if (firstProject) setWallProject(firstProject);
            setTab("published");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Publish failed.");
        } finally {
            setPublishing(false);
        }
    };

    const publishOfficial = async () => {
        if (!run?.runId) return;
        setBusy(true);
        try {
            const data = await api<{ snapshotId?: string }>(publishEndpoint, {
                method: "POST",
                body: JSON.stringify({ runId: run.runId }),
            });
            setRun((prev) => (prev ? { ...prev, published: true } : prev));
            toast.success(`Published snapshot ${data?.snapshotId || ""}`.trim());
            appendLog(`Published official snapshot ${data?.snapshotId}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Publish failed.");
        } finally {
            setBusy(false);
        }
    };

    const clearReview = async (itemId: string) => {
        if (!run?.runId) return;
        try {
            const data = await api<RunPayload>(reviewsEndpoint, {
                method: "POST",
                body: JSON.stringify({ runId: run.runId, itemId }),
            });
            setRun(data);
            await fetchPreview();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not clear review.");
        }
    };

    // published-on-the-wall view
    useEffect(() => {
        if (tab !== "published" || !wallProject) return;
        let cancelled = false;
        (async () => {
            try {
                const rows = await api<ProjectRanking[]>(`${studioBase}/project/${encodeURIComponent(wallProject)}`);
                if (!cancelled) setWallRankings(Array.isArray(rows) ? rows : []);
            } catch {
                if (!cancelled) setWallRankings([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [tab, wallProject, studioBase, history.length]);

    useEffect(() => {
        if (tab === "history") void loadHistory();
    }, [tab, loadHistory]);

    // ---------------------------------------------------------------------------------- derived
    const lenses = preview?.lenses ?? FALLBACK_LENSES;
    const lensMeta = lenses.find((l) => l.key === lens) ?? lenses[0];
    const result = preview?.result ?? null;
    const counts = preview?.counts;
    const options = preview?.options ?? {};
    const library = useMemo(() => preview?.packages ?? [], [preview]);
    const pkgById = useMemo(() => new Map(library.map((p) => [p.id, p])), [library]);
    const runRowById = useMemo(() => new Map((run?.rows ?? []).map((r) => [r.id, r])), [run]);
    const pendingReviews = preview?.pendingReviews ?? 0;
    const blockers = preview?.publishBlockers ?? [];
    const canPublish = Boolean(preview && result && result.rows.length && !dirty && !blockers.length && !previewBusy && !busy);

    const shownRows = useMemo(() => {
        if (!result) return [];
        const needle = search.trim().toLowerCase();
        const max = showCount === "all" ? Infinity : Number(showCount);
        return result.rows.filter((r) => r.rank <= max && (!needle || r.label.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle)));
    }, [result, search, showCount]);
    const pageCount = Math.max(1, Math.ceil(shownRows.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount - 1);
    const pageRows = shownRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
    const maxMetric = result?.rows.reduce((m, r) => Math.max(m, r.metric), 0) ?? 0;
    const isProject = (result?.groupBy ?? "project") === "project";

    const latestYear = [...(options.year ?? [])].sort().pop();
    const applyPreset = (kind: "all" | "sdg" | "skill" | "university") => {
        const nextFilters: StudioFilters = {};
        if (kind === "all" && latestYear) nextFilters.year = latestYear;
        if (kind === "skill") {
            const leadership = (options.skills ?? []).find((s) => /leadership/i.test(s)) ?? (options.skills ?? [])[0];
            if (leadership) nextFilters.skills = leadership;
        }
        setFilters(nextFilters);
        setWeights(DEFAULT_WEIGHTS);
        nameTouched.current = false;
        setNameInput("");
        setLens(kind === "sdg" ? "sdg" : kind === "skill" ? "learning" : "excellence");
        setGroupBy(kind === "university" ? "university" : "project");
        setDirty(true);
    };

    const exportCsv = () => {
        if (!result || dirty) return;
        const header = ["Position", isProject ? "Project" : "Group", "Ranking label", "Measure", "Value", "Average approved CII", "Eligible projects", "Filters"];
        const fs = Object.entries(result.filters)
            .map(([k, v]) => `${FILTER_TITLES[k] || k}: ${prettyFilterValue(k, v as string | number)}`)
            .join("; ");
        const lines = [header, ...result.rows.map((r) => [r.rank, r.label, nameInput || result.name, lensMeta.title, r.metric.toFixed(2), r.cii == null ? "" : r.cii.toFixed(1), r.projectCount, fs])];
        const csv = lines.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "CIEL_PK_Ranking_Preview.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const rankedCount = run?.rows?.filter((r) => r.status === "Ranked").length ?? 0;
    const reviewItems = run?.reviewItems ?? [];
    const openReviews = reviewItems.filter((i) => !i.cleared).length;
    const rubric = preview?.rubricVersion ?? run?.rubricVersion ?? "NPE-1.2";

    // ---------------------------------------------------------------------------------- render
    const filterRow = (key: keyof StudioFilters, label: string, plural: string) => (
        <div className="field" key={key}>
            <label htmlFor={`rs-f-${key}`}>{label}</label>
            <select id={`rs-f-${key}`} value={(filters[key] as string) ?? ""} onChange={(e) => changeFilter(key, e.target.value)}>
                <option value="">All {plural}</option>
                {(options[key] ?? []).map((v) => (
                    <option key={v} value={v}>
                        {v}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="rs">
            <nav className="rsnav" aria-label="Ranking studio sections">
                {(
                    [
                        ["analyzer", "AI Ranking Analyzer"],
                        ["review", `Review queue${openReviews ? ` (${openReviews})` : ""}`],
                        ["packages", "Combined packages"],
                        ["published", "Published rankings"],
                        ["history", "Ranking history"],
                        ["rules", "Ranking rules"],
                    ] as Array<[Tab, string]>
                ).map(([key, label]) => (
                    <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
                        {label}
                    </button>
                ))}
            </nav>

            {studioUnavailable ? (
                <div className="callout" role="alert" style={{ marginBottom: 14 }}>
                    <b>The Ranking Studio service is not available yet.</b> The server is still on an older version. Try again in a few minutes; nothing has been changed.
                </div>
            ) : null}

            {tab === "analyzer" && (
                <>
                    <div className="hero">
                        <div>
                            <div className="eyebrow">CIEL PK • Project excellence</div>
                            <h1>
                                Discover the best projects.
                                <br />
                                From every meaningful angle.
                            </h1>
                            <p>
                                {role === "ciel_admin"
                                    ? "Analyze complete approved project packages, rank by university, department, instructor, SDG, skill, period, impact and more, then publish clearly labelled results to every relevant stakeholder’s My Impact Wall."
                                    : "Analyze this university’s complete approved project packages and rank them from every meaningful angle. Only your institution’s projects are compared."}
                            </p>
                        </div>
                        <div className="heroright">
                            <b>4-part</b>
                            <small>COMPLETE PACKAGE</small>
                            <br />
                            <small>CHECK BEFORE RANKING</small>
                        </div>
                    </div>

                    <div className="steps">
                        {[
                            ["Retrieve packages", "From My Impact Wall"],
                            ["Check all four parts", "Hold incomplete files"],
                            ["Build & review rankings", "Every selected angle"],
                            ["Publish to Impact Walls", "Include filter + history"],
                        ].map(([title, sub], i) => (
                            <div className="step" key={title}>
                                <span className="stepnum">{i + 1}</span>
                                <div>
                                    <b>{title}</b>
                                    <small>{sub}</small>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="stats">
                        <div className="stat"><small>Approved project packages</small><b>{counts ? counts.packages : packages.length}</b><span>{cohortLabel}</span></div>
                        <div className="stat"><small>Four-part checks passed</small><b>{counts ? counts.eligible : "—"}</b><span>Eligible for ranking</span></div>
                        <div className="stat"><small>Requires verification</small><b>{counts ? counts.held : "—"}</b><span>Excluded until complete</span></div>
                        <div className="stat"><small>Current comparison</small><b>{counts ? counts.inRanking : "—"}</b><span>Selected eligible projects</span></div>
                        <div className="stat"><small>Published ranking views</small><b>{history.length}</b><span>Retained with history</span></div>
                    </div>

                    <div className="sectiontitle">
                        <div>
                            <h2>Ranking Studio</h2>
                            <p>Select the audience, reporting period and evidence-backed result you want to compare.</p>
                        </div>
                        <div className="presetrow">
                            <button type="button" className="preset" onClick={() => applyPreset("all")}>All projects{latestYear ? ` · ${latestYear}` : ""}</button>
                            <button type="button" className="preset" onClick={() => applyPreset("sdg")}>SDG leaders</button>
                            <button type="button" className="preset" onClick={() => applyPreset("skill")}>Leadership skills</button>
                            <button type="button" className="preset" onClick={() => applyPreset("university")}>University standings</button>
                        </div>
                    </div>

                    <div className="buildergrid">
                        <aside className="panel">
                            <div className="paneltitle">
                                1. Define your ranking
                                <button type="button" className="btn sm" onClick={resetFilters}>Clear all</button>
                            </div>
                            <p className="smallnote">Every selected filter becomes part of the ranking label stored on the flashcard.</p>
                            <div className="field">
                                <label htmlFor="rs-lens">Rank by</label>
                                <select id="rs-lens" value={lens} onChange={(e) => { setLens(e.target.value); markDirty(); }}>
                                    {LENS_GROUPS.map(([group, keys]) => (
                                        <optgroup key={group} label={group}>
                                            {keys.map((k) => {
                                                const l = lenses.find((x) => x.key === k);
                                                return l ? <option key={k} value={k}>{l.title}</option> : null;
                                            })}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label htmlFor="rs-group">Compare</label>
                                <select id="rs-group" value={groupBy} onChange={(e) => { setGroupBy(e.target.value); markDirty(); }}>
                                    {(preview?.groups ?? [{ key: "project", title: "Individual projects" }]).map((g) => (
                                        <option key={g.key} value={g.key}>
                                            {g.key === "project" ? g.title : `${g.title} (average of projects)`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {lens === "custom" ? (
                                <div className="metriccard">
                                    <b>Adjust your comparison weights</b>
                                    <p>Weights are normalized to 100%. These modify the new ranking only, never the approved CII score.</p>
                                    {(
                                        [
                                            ["impact", "Community Impact"],
                                            ["sustain", "Sustainability"],
                                            ["learning", "Learning & Skills"],
                                            ["cii", "Approved CII (locked)"],
                                        ] as Array<[keyof CustomWeights, string]>
                                    ).map(([k, label]) => (
                                        <div className="range-row" key={k}>
                                            <label htmlFor={`rs-w-${k}`}>{label}</label>
                                            <output>{weights[k]}</output>
                                            <input id={`rs-w-${k}`} type="range" min={0} max={100} step={5} value={weights[k]} onChange={(e) => { setWeights((w) => ({ ...w, [k]: Number(e.target.value) })); markDirty(); }} />
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            <div className="filter-section">
                                <strong>2. Choose who &amp; what to include</strong>
                                {filterRow("university", "University", "universities")}
                                <div className="fieldgrid">
                                    {filterRow("department", "Department", "departments")}
                                    {filterRow("instructor", "Instructor", "instructors")}
                                </div>
                                <div className="fieldgrid" style={{ marginTop: 10 }}>
                                    {filterRow("sdg", "SDG", "SDGs")}
                                    <div className="field">
                                        <label htmlFor="rs-f-skills">Skill</label>
                                        <select id="rs-f-skills" value={filters.skills ?? ""} onChange={(e) => changeFilter("skills", e.target.value)}>
                                            <option value="">All skills</option>
                                            {(options.skills ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="fieldgrid" style={{ marginTop: 10 }}>
                                    {filterRow("year", "Year", "years")}
                                    <div className="field">
                                        <label htmlFor="rs-f-month">Month</label>
                                        <select id="rs-f-month" value={filters.month ?? ""} onChange={(e) => changeFilter("month", e.target.value)}>
                                            <option value="">All months</option>
                                            {(options.month ?? []).map((v) => <option key={v} value={v}>{prettyFilterValue("month", v)}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="fieldgrid" style={{ marginTop: 10 }}>
                                    <div className="field">
                                        <label htmlFor="rs-f-from">From date</label>
                                        <input id="rs-f-from" type="date" value={filters.dateFrom ?? ""} onChange={(e) => changeFilter("dateFrom", e.target.value)} />
                                    </div>
                                    <div className="field">
                                        <label htmlFor="rs-f-to">To date</label>
                                        <input id="rs-f-to" type="date" value={filters.dateTo ?? ""} onChange={(e) => changeFilter("dateTo", e.target.value)} />
                                    </div>
                                </div>
                                <details className="advanced">
                                    <summary>More report filters</summary>
                                    <div className="fieldgrid">
                                        {MORE_FILTERS.map(([k, label, plural]) => filterRow(k, label, plural))}
                                        <div className="field">
                                            <label htmlFor="rs-f-minhours">Min. verified hours</label>
                                            <input id="rs-f-minhours" type="number" min={0} value={filters.minHours ?? ""} onChange={(e) => changeFilter("minHours", e.target.value)} />
                                        </div>
                                        <div className="field">
                                            <label htmlFor="rs-f-mincii">Min. approved CII</label>
                                            <input id="rs-f-mincii" type="number" min={0} max={110} value={filters.minCii ?? ""} onChange={(e) => changeFilter("minCii", e.target.value)} />
                                        </div>
                                        <div className="field">
                                            <label htmlFor="rs-f-team">Team size</label>
                                            <select id="rs-f-team" value={filters.teamSize ?? ""} onChange={(e) => changeFilter("teamSize", e.target.value)}>
                                                <option value="">Any size</option>
                                                <option value="1-3">1–3 students</option>
                                                <option value="4-6">4–6 students</option>
                                                <option value="7-10">7–10 students</option>
                                                <option value="11-999">11+ students</option>
                                            </select>
                                        </div>
                                    </div>
                                </details>
                            </div>

                            <div className="filter-section">
                                <strong>3. Title your ranking</strong>
                                <div className="field">
                                    <label htmlFor="rs-name">Name shown on the Impact Wall</label>
                                    <input id="rs-name" value={nameInput} placeholder="Automatically generated from your filters" onChange={(e) => { nameTouched.current = true; setNameInput(e.target.value); }} />
                                    <p className="smallnote" style={{ marginTop: 5 }}>e.g. Top Projects — SDG 4 — Lahore — 2026</p>
                                </div>
                                <div className="actionstack">
                                    <button type="button" className="btn" disabled={busy || previewBusy} onClick={() => void recheckPackages()}>✓ Recheck complete packages</button>
                                    <button type="button" className="btn primary" disabled={busy || previewBusy} onClick={() => void runAnalyzer()}>
                                        {busy ? "Reading packages…" : previewBusy ? "Calculating…" : "✦ Run Ranking Analyzer"}
                                    </button>
                                </div>
                                <p className="smallnote" style={{ marginTop: 8 }}>Preview first. Publishing requires a separate confirmation.</p>
                            </div>
                        </aside>

                        <div className="rightstack">
                            <section className="panel">
                                <div className="paneltitle">
                                    Source check · My Impact Wall <span className="labelchip">4 required components</span>
                                </div>
                                <p className="smallnote">Start with the approved Combined Package for every project, not only the flashcard. Actual originals and their hashes are validated on the server.</p>
                                <div className="sourcegrid" style={{ marginTop: 10 }}>
                                    {[
                                        ["01 · Original", "Project Flashcard", "Identity, CII, SDGs, period"],
                                        ["02 · All 9 sections", "Detailed Report", "Actions, outcomes, skills, resources"],
                                        ["03 · Approved", "System Analysis + CII", "Locked score, badges, limitations"],
                                        ["04 · Every required file", "Evidence Originals", "Receipt, image, PDF, privacy, hash"],
                                    ].map(([n, t, d]) => (
                                        <div className="sourcebox" key={n}>
                                            <div className="num">{n}</div>
                                            <b>{t}</b>
                                            <small>{d}</small>
                                        </div>
                                    ))}
                                </div>
                                <div className="statusline">
                                    <span>
                                        {counts
                                            ? `${counts.eligible} of ${counts.packages} approved packages pass the four-part gate; ${counts.held} are held for missing or unreadable material.`
                                            : "Checking packages…"}
                                    </span>
                                    <span className={`labelchip ${dirty ? "gold" : ""}`}>{previewBusy ? "Working…" : dirty ? "Preview needs refresh" : "Latest analysis ready"}</span>
                                </div>
                            </section>

                            <section className="panel">
                                <div className="rankingbar">
                                    <div>
                                        <span className="eyebrow" style={{ color: "var(--green)" }}>LIVE PREVIEW · {rubric}</span>
                                        <h3>{nameInput || result?.name || lensMeta.title}</h3>
                                        <p>
                                            {dirty
                                                ? "Filters changed. Run Ranking Analyzer to calculate a fresh ranking before publishing."
                                                : result
                                                  ? `${lensMeta.description || lensMeta.title} · ${isProject ? "Projects" : `Grouped by ${result.groupBy}`} · ${result.rows.length} ranked ${isProject ? "projects" : "groups"}`
                                                  : "Run the analyzer to generate a ranking."}
                                        </p>
                                    </div>
                                    <div className="actions">
                                        <button type="button" className="btn" disabled={!result || dirty || !result.rows.length} onClick={exportCsv}>↓ Export CSV</button>
                                        <button type="button" className="btn gold" disabled={!canPublish} title={blockers[0] || (dirty ? "Run the analyzer first" : "")} onClick={() => setPublishOpen(true)}>Publish to all Impact Walls →</button>
                                    </div>
                                </div>
                                {result ? <FilterChips filters={result.filters} /> : null}
                                {!dirty && blockers.length > 0 && result ? (
                                    <div className="callout" style={{ margin: "8px 0" }}>
                                        <b>Not ready to publish.</b> {blockers[0]}
                                        {pendingReviews > 0 ? (
                                            <>
                                                {" "}
                                                <button type="button" className="rowlink" onClick={() => setTab("review")}>Open review queue →</button>
                                            </>
                                        ) : null}
                                    </div>
                                ) : null}
                                <div className="toolbar" style={{ margin: "10px 0" }}>
                                    <div className="smallnote">
                                        {result ? `${shownRows.length} ranked ${isProject ? "projects" : "groups"} · ${result.eligibleIds.length} eligible project packages` : "No ranking calculated"}
                                    </div>
                                    <div className="actions">
                                        <label className="smallnote" htmlFor="rs-show">Show</label>
                                        <select id="rs-show" value={showCount} onChange={(e) => { setShowCount(e.target.value); setPage(0); }}>
                                            <option value="all">All</option>
                                            <option value="3">Top 3</option>
                                            <option value="10">Top 10</option>
                                            <option value="25">Top 25</option>
                                        </select>
                                        <input className="searchfield" style={{ width: 170 }} placeholder="Search results" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} aria-label="Search results" />
                                    </div>
                                </div>
                                <div className="tablewrap">
                                    <table className="table">
                                        <thead>
                                            {isProject ? (
                                                <tr><th>Rank</th><th>Approved project</th><th>University / SDG</th><th>Selected measure</th><th>Locked CII</th><th>Review package</th></tr>
                                            ) : (
                                                <tr><th>Rank</th><th>Ranked group</th><th>Eligible projects</th><th>Average measure</th><th>Mean approved CII</th><th>See composition</th></tr>
                                            )}
                                        </thead>
                                        <tbody>
                                            {pageRows.map((r) => {
                                                const p = pkgById.get(r.id);
                                                return (
                                                    <tr key={r.id}>
                                                        <td><span className="rank">#{r.rank}</span></td>
                                                        <td>
                                                            <span className="pname">{r.label}</span>
                                                            <span className="pmeta">{isProject ? `${r.id.slice(0, 8)} · ${fmtDate(p?.date ?? "")}` : `${result?.groupBy} · ${r.projectCount} included`}</span>
                                                        </td>
                                                        <td>
                                                            {isProject ? (
                                                                <>
                                                                    {p?.university ?? "—"}
                                                                    <br />
                                                                    {p?.sdg ? <span className="labelchip gray">{p.sdg}</span> : null}
                                                                </>
                                                            ) : (
                                                                <><strong>{r.projectCount}</strong> projects</>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <strong>{metricDisplay(r.metric, lensMeta.kind)}</strong>
                                                            <span className="bar"><i style={{ width: `${metricBarPercent(r.metric, maxMetric, lensMeta.kind)}%` }} /></span>
                                                        </td>
                                                        <td>{r.cii == null ? "—" : fmtNum(r.cii)} <span className="muted">/100</span></td>
                                                        <td>
                                                            <button type="button" className="btn sm" onClick={() => setDrawer({ kind: isProject ? "project" : "group", id: r.id })}>
                                                                {isProject ? "Open 4-part package" : "View projects"} →
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {!pageRows.length ? (
                                                <tr>
                                                    <td colSpan={6}>
                                                        <div className="empty">
                                                            {!result ? (
                                                                <><b>Nothing calculated yet</b>Press Run Ranking Analyzer.</>
                                                            ) : counts && counts.packages === 0 ? (
                                                                <><b>No approved packages yet</b>Approved projects with a locked CII appear here automatically.</>
                                                            ) : result.unreadIds.length > 0 && !result.rows.length ? (
                                                                <><b>Not read yet</b>{result.unreadIds.length} package{result.unreadIds.length === 1 ? " is" : "s are"} waiting for the AI read. Press Run Ranking Analyzer.</>
                                                            ) : (
                                                                <><b>No matches</b>Try different filters or search terms.</>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="toolbar" style={{ marginTop: 10 }}>
                                    <div className="smallnote">
                                        {result && result.heldReasons.length
                                            ? `${result.heldReasons.length} selected projects require verification and are not ranked. Pending does not mean low performance.`
                                            : "Every selected project is included."}
                                        {result && result.unreadIds.length ? ` ${result.unreadIds.length} are waiting for the AI read.` : ""}
                                    </div>
                                    <div className="pagination">
                                        <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>←</button>
                                        <span className="smallnote">Page {safePage + 1} of {pageCount}</span>
                                        <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>→</button>
                                    </div>
                                </div>
                                {result && result.heldReasons.length ? (
                                    <details className="advanced" style={{ marginTop: 10 }}>
                                        <summary>Why were {result.heldReasons.length} projects held?</summary>
                                        <ul className="reasonlist">
                                            {result.heldReasons.slice(0, 50).map((h) => (
                                                <li key={h.id}><b>{h.title}</b>: {h.reason}</li>
                                            ))}
                                        </ul>
                                    </details>
                                ) : null}
                            </section>

                            <section className="panel">
                                <div className="paneltitle">What will appear on each flashcard?</div>
                                <div className="two">
                                    <div>
                                        <p style={{ fontSize: 11, color: "var(--muted)" }}>
                                            Every published ranking has its own permanent label, scope, selection filters, position, comparator, publication date and trend. Multiple rankings are displayed together without overwriting one another.
                                        </p>
                                        {result ? <FilterChips filters={result.filters} /> : null}
                                    </div>
                                    <div className="goldpanel" style={{ marginTop: 0 }}>
                                        <small style={{ color: "#756240" }}>CIEL PK RANKINGS · ILLUSTRATIVE FLASHCARD ENTRY</small>
                                        <div style={{ marginTop: 6 }}>
                                            <b className="position">#1</b> <b>{nameInput || result?.name || lensMeta.title}</b>
                                            <br />
                                            <small>{isProject ? "Individual projects" : `Groups: ${result?.groupBy}`} · {lensMeta.title}</small>
                                            <br />
                                            <span className="labelchip gold">Latest publish date and movement</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="panel">
                                <div className="paneltitle">
                                    Analysis activity <span className="labelchip gray">{busy ? "Running" : run ? "Run ready" : "Not started"}</span>
                                </div>
                                <div className="logbox">{log}</div>
                            </section>
                        </div>
                    </div>
                </>
            )}

            {tab === "review" && (
                <ReviewScreen
                    run={run}
                    busy={busy}
                    rankedCount={rankedCount}
                    onClear={(id) => void clearReview(id)}
                    onPublishOfficial={() => void publishOfficial()}
                    onOpen={(id) => setDrawer({ kind: "project", id })}
                />
            )}
            {tab === "packages" && (
                <PackagesScreen packages={library} onOpen={(id) => setDrawer({ kind: "project", id })} onAnalyze={() => setTab("analyzer")} />
            )}
            {tab === "published" && (
                <PublishedScreen
                    packages={library}
                    projectId={wallProject}
                    onProject={setWallProject}
                    rankings={wallRankings}
                    onOpen={(id) => setDrawer({ kind: "project", id })}
                    role={role}
                />
            )}
            {tab === "history" && (
                <HistoryScreen
                    items={history}
                    studioBase={studioBase}
                    onShowProject={(id) => { setWallProject(id); setTab("published"); }}
                />
            )}
            {tab === "rules" && <RulesScreen criteria={preview?.criteria ?? run?.criteria ?? []} rubric={rubric} />}

            {drawer?.kind === "project" ? (
                <PackageDrawer
                    row={(runRowById.get(drawer.id) as RunRow | undefined) ?? null}
                    lib={pkgById.get(drawer.id) ?? null}
                    criteria={preview?.criteria ?? run?.criteria ?? []}
                    rubric={rubric}
                    onClose={() => setDrawer(null)}
                />
            ) : null}
            {drawer?.kind === "group" && result ? (
                <GroupDrawer
                    row={result.rows.find((r) => r.id === drawer.id) ?? null}
                    result={result}
                    lensTitle={lensMeta.title}
                    kind={lensMeta.kind}
                    library={pkgById}
                    onOpenProject={(id) => setDrawer({ kind: "project", id })}
                    onClose={() => setDrawer(null)}
                />
            ) : null}
            {publishOpen && result ? (
                <PublishModal
                    name={nameInput || result.name}
                    result={result}
                    lensTitle={lensMeta.title}
                    busy={publishing}
                    audience={role === "ciel_admin" ? "Student, Teammate, Faculty, Partner/NGO, University and CIEL PK Impact Wall (respecting access controls)" : "This university’s students, faculty and Impact Wall (respecting access controls)"}
                    onCancel={() => setPublishOpen(false)}
                    onConfirm={() => void confirmPublish()}
                />
            ) : null}
        </div>
    );
}
