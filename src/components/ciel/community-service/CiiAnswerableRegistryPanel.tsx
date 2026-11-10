"use client";

import { useState } from "react";
import {
    CII_ANSWERABLE_REGISTRY_URL,
    groupByDimension,
    parseAnswerableRegistry,
    registrySummary,
    type AnswerableRegistry,
} from "@/utils/ciiAnswerableRegistry";

/**
 * R3 "CIEL-answerable question alignment": the curated candidate questions this kind of project can
 * answer, grouped by the CII dimension they inform. Reference only. It is loaded on first open, is
 * never part of the CII score, and shows no AI-proposed answers because the live scorer does not
 * return any yet. Nothing here can change a mark or the approval.
 */
export function CiiAnswerableRegistryPanel({ dimensionNames }: { dimensionNames: Record<string, string> }) {
    const [registry, setRegistry] = useState<AnswerableRegistry | null>(null);
    const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

    const load = () => {
        if (state !== "idle") return;
        setState("loading");
        fetch(CII_ANSWERABLE_REGISTRY_URL, { cache: "force-cache" })
            .then(async (res) => {
                if (!res.ok) throw new Error(String(res.status));
                const parsed = parseAnswerableRegistry(await res.json());
                if (!parsed) throw new Error("invalid");
                setRegistry(parsed);
                setState("ready");
            })
            .catch(() => setState("error"));
    };

    const summary = registry ? registrySummary(registry.items) : null;

    return (
        <details className="card registry-panel" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && load()} data-testid="answerable-registry">
            <summary>
                <b>CIEL-answerable question alignment</b> · reference only, separate from the CII marks
            </summary>
            {state === "loading" ? <p className="registry-note">Loading the curated question list…</p> : null}
            {state === "error" ? (
                <div className="banner red" role="alert">
                    The curated question list could not be loaded. Nothing about the review is affected.
                </div>
            ) : null}
            {registry && summary ? (
                <>
                    <p className="registry-note">
                        {registry.note} Version {registry.version}, drawn from {registry.questionBankVersion || "the 440-question bank"}. AI-proposed answers are not enabled on this server, so every
                        candidate below is <b>not assessed</b>. A high CII never establishes an answer, and institution-, department- and provider-specific questions are excluded.
                    </p>
                    <div className="registry-stats">
                        <span>
                            <b>{summary.candidates}</b> curated candidates
                        </span>
                        <span>
                            <b>{summary.project}</b> project questions
                        </span>
                        <span>
                            <b>{summary.portfolio}</b> portfolio aggregation (needs deduplicated approved records)
                        </span>
                    </div>
                    {groupByDimension(registry.items).map((group) => (
                        <div key={group.dimension} className="registry-group">
                            <h4>
                                {group.dimension} · {dimensionNames[group.dimension] || `Dimension ${group.dimension}`}
                            </h4>
                            <ul>
                                {group.items.map((q) => (
                                    <li key={q.id}>
                                        <code>{q.id}</code> <span className={q.scope === "portfolio" ? "tag warn" : "tag"}>{q.scope === "portfolio" ? "Portfolio" : "Project"}</span>{" "}
                                        <b>{q.question}</b>
                                        {q.minimumData ? <div className="registry-detail">Minimum data: {q.minimumData}</div> : null}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </>
            ) : null}
        </details>
    );
}
