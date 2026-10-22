"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import "./ranking-studio.css";
import {
    FALLBACK_GROUPS,
    FALLBACK_LENSES,
    FILTER_TITLES,
    buildProjectStandings,
    fmtDate,
    fmtNum,
    groupTitle,
    metricBarPercent,
    metricDisplay,
    prettyFilterValue,
    standingLabel,
    type CustomWeights,
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
import { AllProjectsPanel, HistoryScreen, PackagesScreen, PublishedScreen, ReviewScreen, RulesScreen } from "./StudioScreens";

type Tab = "analyzer" | "review" | "packages" | "published" | "history" | "rules";

const PAGE_SIZE = 12;
const DEFAULT_WEIGHTS: CustomWeights = { impact: 35, sustain: 20, learning: 25, cii: 20 };

const LENS_GROUPS: Array<[string, string[]]> = [
    ["Overall", ["excellence", "cii", "custom"]],
    ["Evidence-based criteria", ["impact", "need", "sustain", "partner", "efficiency", "sdg", "scale", "learning"]],
    ["Reported measures", ["hours", "reach", "funds"]],
];

const MORE_FILTERS: Array<[keyof StudioFilters, string, string]> = [
    ["semester", "Semester", "semesters"],
    ["city", "City", "cities"],
    ["partner", "Partner / NGO", "partners"],
    ["activity", "Activity type", "activity types"],
    ["theme", "Impact theme", "themes"],
    ["ciiBadge", "CII badge", "badges"],
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

/** A text cell starting with = + - @ (or tab / CR) runs as a formula in Excel; prefix ' so it stays text. */
function csvCell(v: string | number): string {
    const s = typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v);
    return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(lines: Array<Array<string | number>>, filename: string) {
    const csv = lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    // Bumped on every definition change. A preview request that resolves after a change describes
    // the old definition, so it must not clear `dirty` (Publish stays blocked until a fresh run).
    const definitionVersion = useRef(0);
    // The exact body that produced the preview on screen; Publish sends this, never a newer one.
    const previewBody = useRef<Record<string, unknown> | null>(null);
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

    /** `override` lets a preset preview its new definition before React state has caught up. */
    const fetchPreview = useCallback(async (override?: Record<string, unknown>) => {
        const body = override ?? buildBody();
        const version = definitionVersion.current;
        const data = await api<StudioPreview>(`${studioBase}/preview`, { method: "POST", body: JSON.stringify(body) });
        setPreview(data);
        previewBody.current = body;
        const stillCurrent = definitionVersion.current === version;
        setDirty(!stillCurrent);
        setPage(0);
        if (stillCurrent && !nameTouched.current) setNameInput(data.result.name);
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

    const markDirty = () => {
        definitionVersion.current += 1;
        setDirty(true);
    };
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
        setSearch("");
        setPage(0);
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
        if (!preview || publishing || dirty || !previewBody.current) return;
        setPublishing(true);
        try {
            const out = await api<{ status: "published" | "unchanged"; publication: PublicationSummary }>(`${studioBase}/publish`, {
                method: "POST",
                body: JSON.stringify({ ...previewBody.current, name: nameInput.trim() || undefined }),
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

    // Escape closes the publish dialog first, then the drawer (same as the reference design).
    useEffect(() => {
        if (!publishOpen && !drawer) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (publishOpen) {
                if (!publishing) setPublishOpen(false);
            } else {
                setDrawer(null);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [publishOpen, drawer, publishing]);

    // ---------------------------------------------------------------------------------- derived
    const lenses = preview?.lenses?.length ? preview.lenses : FALLBACK_LENSES;
    const lensMeta = lenses.find((l) => l.key === lens) ?? lenses[0];
    const result = preview?.result ?? null;
    /** Units and titles of the rows on screen follow the lens they were calculated with, not the dropdown. */
    const resultLensMeta = (result && lenses.find((l) => l.key === result.lens)) || lensMeta;
    const groups = (preview?.groups?.length ? preview.groups : FALLBACK_GROUPS).filter(
        // A university studio only sees its own institution: comparing universities is meaningless there.
        (g) => role === "ciel_admin" || g.key !== "university",
    );
    const counts = preview?.counts;
    const options = preview?.options ?? {};
    const library = useMemo(() => preview?.packages ?? [], [preview]);
    const pkgById = useMemo(() => new Map(library.map((p) => [p.id, p])), [library]);
    /** Each project's standing in the preview on screen; one map for the panel, the drawer and the CSV. */
    const standings = useMemo(() => buildProjectStandings(preview?.result ?? null, library, dirty), [preview, library, dirty]);
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
    /**
     * Footer counts, kept apart. The server's `heldIds` mixes three cases: failed the package check
     * (`ready` false), waiting for the AI read, and no documented value for this measure. Eligible
     * projects missing from the rows sit in groups too small to rank.
     */
    const footer = useMemo(() => {
        if (!result) return null;
        const unread = new Set(result.unreadIds);
        const inRows = new Set(result.rows.flatMap((r) => r.projectIds ?? []));
        const failedCheck = (id: string) => pkgById.get(id)?.ready === false;
        return {
            gateHeld: result.heldIds.filter((id) => failedCheck(id)).length,
            unread: unread.size,
            noData:
                result.heldIds.filter((id) => !failedCheck(id) && !unread.has(id)).length +
                result.eligibleIds.filter((id) => !inRows.has(id)).length,
        };
    }, [result, pkgById]);
    const isProject = (result?.groupBy ?? "project") === "project";

    const latestYear = [...(options.year ?? [])].sort().pop();
    /** SDG 4 when the cohort has it, otherwise its most common primary SDG — the chip names the one used. */
    const presetSdg = useMemo(() => {
        const sdgs = options.sdg ?? [];
        const sdg4 = sdgs.find((v) => /^sdg\s*0?4\b/i.test(v.trim()));
        if (sdg4) return sdg4;
        const freq = new Map<string, number>();
        for (const p of library) if (p.sdg && sdgs.includes(p.sdg)) freq.set(p.sdg, (freq.get(p.sdg) ?? 0) + 1);
        return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? sdgs[0];
    }, [options.sdg, library]);
    const presetSkill = (options.skills ?? []).find((v) => /leadership/i.test(v));
    /** Presets replace the whole definition (latest year included) and preview it at once; AI reads stay on Run. */
    const applyPreset = (kind: "all" | "sdg" | "skill" | "university") => {
        if (busy || previewBusy) return;
        const nextFilters: StudioFilters = {};
        if (latestYear) nextFilters.year = latestYear;
        if (kind === "sdg" && presetSdg) nextFilters.sdg = presetSdg;
        if (kind === "skill" && presetSkill) nextFilters.skills = presetSkill;
        const nextLens = kind === "sdg" ? "sdg" : kind === "skill" ? "learning" : "excellence";
        const nextGroup = kind === "university" ? "university" : "project";
        setFilters(nextFilters);
        setWeights(DEFAULT_WEIGHTS);
        nameTouched.current = false;
        setNameInput("");
        setLens(nextLens);
        setGroupBy(nextGroup);
        setSearch("");
        markDirty();
        setPreviewBusy(true);
        void fetchPreview({ lens: nextLens, groupBy: nextGroup, filters: nextFilters, weights: DEFAULT_WEIGHTS })
            .catch((err) => toast.error(err instanceof Error ? err.message : "Could not preview this ranking."))
            .finally(() => setPreviewBusy(false));
    };

    const exportCsv = () => {
        if (!result || dirty) return;
        const header = ["Position", isProject ? "Project" : "Group", "Ranking label", "Metric", "Value", "Average approved CII", "Eligible projects", "Filters"];
        const fs = Object.entries(result.filters)
            .map(([k, v]) => `${FILTER_TITLES[k] || k}: ${prettyFilterValue(k, v as string | number)}`)
            .join("; ");
        const lines = [header, ...result.rows.map((r) => [r.rank, r.label, nameInput || result.name, resultLensMeta.title, r.metric.toFixed(2), r.cii == null ? "" : r.cii.toFixed(1), r.projectCount, fs])];
        downloadCsv(lines, "CIEL_PK_Ranking_Preview.csv");
    };

    /** Every approved package in this cohort — ranked, eligible-but-unranked and held — with the reason it is held. */
    const exportAllProjectsCsv = () => {
        // Ranks come from the preview on screen; a stale preview would mislabel "Ranked" projects.
        if (!library.length || dirty) return;
        const header = ["Project", "Project ID", "University", "Department", "SDG", "Date", "Approved CII", "Status", "Rank in current preview", "Reason / note"];
        const lines = [
            header,
            ...library.map((p) => [
                p.title,
                p.id,
                p.university,
                p.department,
                p.sdg,
                p.date,
                p.cii == null ? "" : p.cii.toFixed(1),
                standingLabel(standings.get(p.id)),
                (() => {
                    const st = standings.get(p.id);
                    return st?.kind === "ranked" || st?.kind === "in_group" ? st.rank : "";
                })(),
                p.reason,
            ]),
        ];
        downloadCsv(lines, "CIEL_PK_All_Projects.csv");
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
                        <div className="stat"><small>Published ranking views</small><b>{history.length >= 200 ? "200+" : history.length}</b><span>Retained separately</span></div>
                    </div>

                    <div className="sectiontitle">
                        <div>
                            <h2>Ranking Studio</h2>
                            <p>Select the audience, reporting period and evidence-backed result you want to compare.</p>
                        </div>
                        <div className="presetrow">
                            <button type="button" className="preset" disabled={busy || previewBusy} onClick={() => applyPreset("all")}>All projects{latestYear ? ` · ${latestYear}` : ""}</button>
                            {presetSdg ? (
                                <button type="button" className="preset" disabled={busy || previewBusy} onClick={() => applyPreset("sdg")}>{presetSdg} leaders</button>
                            ) : null}
                            {presetSkill ? (
                                <button type="button" className="preset" disabled={busy || previewBusy} onClick={() => applyPreset("skill")}>{presetSkill} skills</button>
                            ) : null}
                            {role === "ciel_admin" ? (
                                <button type="button" className="preset" disabled={busy || previewBusy} onClick={() => applyPreset("university")}>University standings</button>
                            ) : null}
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
                                    {groups.map((g) => (
                                        <option key={g.key} value={g.key}>
                                            {g.key === "project" ? g.title : `${groupTitle(g.key, g.title)} (average of projects)`}
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
                                {role === "ciel_admin" ? filterRow("university", "University", "universities") : null}
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
                                    <summary>More report filters ＋</summary>
                                    <div className="fieldgrid">
                                        {MORE_FILTERS.map(([k, label, plural]) => filterRow(k, label, plural))}
                                        <div className="field">
                                            <label htmlFor="rs-f-minhours">Min. verified hours</label>
                                            <input id="rs-f-minhours" type="number" min={0} placeholder="Any" value={filters.minHours ?? ""} onChange={(e) => changeFilter("minHours", e.target.value)} />
                                        </div>
                                        <div className="field">
                                            <label htmlFor="rs-f-mincii">Min. approved CII</label>
                                            <input id="rs-f-mincii" type="number" min={0} max={110} placeholder="Any" value={filters.minCii ?? ""} onChange={(e) => changeFilter("minCii", e.target.value)} />
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
                                        {filterRow("privacy", "Evidence classification", "classifications")}
                                    </div>
                                </details>
                            </div>

                            <div className="filter-section">
                                <strong>3. Title your ranking</strong>
                                <div className="field">
                                    <label htmlFor="rs-name">Name shown on the Impact Wall</label>
                                    <input id="rs-name" value={nameInput} maxLength={140} placeholder="Automatically generated from your criteria" onChange={(e) => { nameTouched.current = true; setNameInput(e.target.value); }} />
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
                                            ? `${counts.eligible} of ${counts.packages} approved packages pass the four-part gate; ${counts.held} are held until required material is complete (approval, CII lock, hours, consent, packet or evidence).`
                                            : "Checking packages…"}
                                        {counts && result && !dirty
                                            ? ` In this filtered cohort: ${counts.inRanking} included, ${counts.heldInSelection} held.`
                                            : ""}
                                    </span>
                                    <span className="actions">
                                        <span className={`labelchip ${dirty ? "gold" : ""}`}>{previewBusy ? "Working…" : dirty ? "Preview needs refresh" : "Latest analysis ready"}</span>
                                        <button type="button" className="btn sm" onClick={() => setTab("packages")}>Open package library →</button>
                                    </span>
                                </div>
                            </section>

                            <section className="panel">
                                <div className="rankingbar">
                                    <div>
                                        <span className="eyebrow" style={{ color: "var(--green)" }}>LIVE PREVIEW · {rubric}</span>
                                        <h3>{nameInput || result?.name || resultLensMeta.title}</h3>
                                        <p>
                                            {dirty
                                                ? "Filters changed. Run Ranking Analyzer to calculate a fresh ranking before publishing."
                                                : result
                                                  ? `${resultLensMeta.description || resultLensMeta.title} · ${isProject ? "Projects" : `Grouped by ${groupTitle(result.groupBy, groups.find((g) => g.key === result.groupBy)?.title).toLowerCase()}`} · ${result.rows.length} ranked ${isProject ? "projects" : "groups"}`
                                                  : "Run the analyzer to generate a ranking."}
                                        </p>
                                    </div>
                                    <div className="actions">
                                        <button type="button" className="btn" disabled={!result || dirty || !result.rows.length} onClick={exportCsv}>↓ Export CSV</button>
                                        <button type="button" className="btn" disabled={!library.length || dirty} onClick={exportAllProjectsCsv}>↓ Export all projects</button>
                                        <button type="button" className="btn gold" disabled={!canPublish} title={blockers[0] || (dirty ? "Run the analyzer first" : "")} onClick={() => setPublishOpen(true)}>{role === "ciel_admin" ? "Publish to all Impact Walls →" : "Publish to this university’s Impact Walls →"}</button>
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
                                            <option value="20">Top 20</option>
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
                                                            <strong>{metricDisplay(r.metric, resultLensMeta.kind)}</strong>
                                                            <span className="bar"><i style={{ width: `${metricBarPercent(r.metric, maxMetric, resultLensMeta.kind)}%` }} /></span>
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
                                                            ) : !result.rows.length && result.eligibleIds.length === 0 && result.heldReasons.length > 0 ? (
                                                                <><b>No eligible projects yet</b>{result.heldReasons.length} approved project{result.heldReasons.length === 1 ? " is" : "s are"} held for verification. See each one and the reason in All approved projects below.</>
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
                                        {footer ? (
                                            <>
                                                {`${footer.gateHeld} selected project${footer.gateHeld === 1 ? "" : "s"} require verification and are not ranked. Pending does not mean low performance.`}
                                                {footer.unread ? ` ${footer.unread} ${footer.unread === 1 ? "is" : "are"} waiting for the AI read.` : ""}
                                                {footer.noData ? ` ${footer.noData} eligible ${footer.noData === 1 ? "project has" : "projects have"} no value for this measure${isProject ? "" : " or belong to groups too small to rank"}.` : ""}
                                            </>
                                        ) : (
                                            "No ranking calculated yet."
                                        )}
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
                                            {result.heldReasons.length > 50 ? (
                                                <li className="muted">+{result.heldReasons.length - 50} more — see All approved projects below or Export all projects.</li>
                                            ) : null}
                                        </ul>
                                    </details>
                                ) : null}
                            </section>

                            <AllProjectsPanel
                                packages={library}
                                standings={standings}
                                onOpen={(id) => setDrawer({ kind: "project", id })}
                            />

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
                                            <b className="position">#1</b> <b>{nameInput || result?.name || resultLensMeta.title}</b>
                                            <br />
                                            <small>{isProject ? "Individual projects" : `Groups: ${groupTitle(result?.groupBy ?? "", groups.find((g) => g.key === result?.groupBy)?.title)}`} · {resultLensMeta.title}</small>
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
                    onCreate={() => setTab("analyzer")}
                    role={role}
                />
            )}
            {tab === "history" && (
                <HistoryScreen
                    items={history}
                    studioBase={studioBase}
                    lenses={lenses}
                    onShowProject={(id) => { setWallProject(id); setTab("published"); }}
                    onCreate={() => setTab("analyzer")}
                />
            )}
            {tab === "rules" && <RulesScreen criteria={preview?.criteria ?? run?.criteria ?? []} rubric={rubric} />}

            {drawer?.kind === "project" ? (
                <PackageDrawer
                    key={drawer.id}
                    projectId={drawer.id}
                    row={(runRowById.get(drawer.id) as RunRow | undefined) ?? null}
                    lib={pkgById.get(drawer.id) ?? null}
                    criteria={preview?.criteria ?? run?.criteria ?? []}
                    rubric={rubric}
                    standing={standings.get(drawer.id)}
                    previewName={dirty ? undefined : nameInput || result?.name}
                    studioBase={studioBase}
                    onClose={() => setDrawer(null)}
                />
            ) : null}
            {drawer?.kind === "group" && result ? (
                <GroupDrawer
                    row={result.rows.find((r) => r.id === drawer.id) ?? null}
                    result={result}
                    lensTitle={resultLensMeta.title}
                    kind={resultLensMeta.kind}
                    library={pkgById}
                    onOpenProject={(id) => setDrawer({ kind: "project", id })}
                    onClose={() => setDrawer(null)}
                />
            ) : null}
            {publishOpen && result ? (
                <PublishModal
                    name={nameInput || result.name}
                    result={result}
                    lensTitle={resultLensMeta.title}
                    role={role}
                    lastPublication={preview?.lastPublication ?? null}
                    busy={publishing}
                    audience={
                        role === "ciel_admin"
                            ? "Project flashcards on the CIEL PK, Faculty, Partner / NGO and University dashboards (respecting access controls)"
                            : "This university’s project flashcards on its University, Faculty and Partner dashboards (respecting access controls)"
                    }
                    onCancel={() => setPublishOpen(false)}
                    onConfirm={() => void confirmPublish()}
                />
            ) : null}
        </div>
    );
}
