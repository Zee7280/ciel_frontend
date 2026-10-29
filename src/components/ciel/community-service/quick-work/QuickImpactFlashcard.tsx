"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDisplayId } from "@/utils/displayIds";
import {
    activityLabel,
    formatHours,
    quickImpactFlashcard,
    quickImpactVerifyPath,
    shortDate,
    viewerRow,
    type QuickWorkLog,
} from "@/utils/quickWorkRules";
import QuickImpactCertificate from "./QuickImpactCertificate";
import "./quick-impact-flashcard.css";

/** Names shown before "+N more" (a log may have hundreds of students). */
const NAMES_FULL = 40;
const NAMES_COMPACT = 6;

/**
 * Quick Impact Flashcard (UN blue): activity, person-hours, students, people reached, evidence, SDG,
 * contribution, people & partnerships, evidence & ethics. It is a verified credential only once CIEL PK
 * has approved the log; before that it says so.
 */
export function QuickImpactFlashcard({ log, compact = false }: { log: QuickWorkLog; compact?: boolean }) {
    const card = quickImpactFlashcard(log);
    const limit = compact ? NAMES_COMPACT : NAMES_FULL;
    const names = card.names.slice(0, limit).join(" · ");
    const more = card.names.length - limit;
    return (
        <article className={`qif-card${compact ? " qif-card--compact" : ""}`}>
            <div className="qif-top">
                <div className="qif-eyebrow">
                    CIEL PK · Quick Community Impact · {card.published ? "Published & Verified" : "Preview / Not yet published"}
                </div>
                <h2 className="qif-title">{log.title || "Untitled community activity"}</h2>
                <p className="qif-sub">
                    {log.location || "Location pending"} · {shortDate(log.activityDate)} · {activityLabel(log) || "Service activity"}
                </p>
            </div>
            <div className="qif-metrics">
                <div>
                    <small>Person-hours</small>
                    <b>{formatHours(card.personMinutes)}h</b>
                </div>
                <div>
                    <small>Students</small>
                    <b>{card.students}</b>
                </div>
                <div>
                    <small>People reached</small>
                    <b>{card.peopleReached ?? "—"}</b>
                </div>
                <div>
                    <small>Evidence files</small>
                    <b>{card.evidenceCount}</b>
                </div>
            </div>
            <div className="qif-body">
                <h4>Sustainable Development Goals</h4>
                {card.sdg ? (
                    <span className="qif-sdg" style={{ background: card.sdgColor }}>
                        {card.sdg}
                    </span>
                ) : (
                    <p>SDG not selected.</p>
                )}
                <h4>Contribution</h4>
                <p>{log.summary || "Summary not completed yet."}</p>
                <h4>People &amp; partnerships</h4>
                <p>
                    {names}
                    {more > 0 ? ` · +${more} more` : ""}
                    <br />
                    Faculty: {log.facultyName || "Pending"}
                    {card.host ? (
                        <>
                            <br />
                            Host: {card.host}
                        </>
                    ) : null}
                    {card.partners.length ? (
                        <>
                            <br />
                            Partners: {card.partners.join(" · ")}
                        </>
                    ) : null}
                </p>
                <h4>Evidence &amp; ethics</h4>
                <p>
                    {card.evidenceCount} supporting item{card.evidenceCount === 1 ? "" : "s"} · Visible to: {log.visibility || "—"} ·{" "}
                    {log.consent ? "Consent confirmed" : "Consent not yet confirmed"}
                </p>
            </div>
            <div className="qif-footer">
                <span>{card.published ? "✓ Faculty verified · ✓ CIEL PK published" : "Draft / under review · not yet an approved credential"}</span>
                <b>{formatDisplayId(log.id, "QCI")}</b>
            </div>
        </article>
    );
}

const toolbarBtn = "rounded-lg border border-[#cbdfee] bg-white px-3.5 py-2 text-xs font-semibold text-[#155a8b] hover:bg-[#f3faff]";
const toolbarPrimary = "rounded-lg bg-[#287db8] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f6ca3]";

/** Fit the A4 certificate onto one printed page (same measure as the structured certificate). */
function applyCertificatePrintScale() {
    const cert = document.querySelector(".cii-certificate-print-root .certificate-one-page") as HTMLElement | null;
    if (!cert) return;
    const pageWidthPx = (210 / 25.4) * 96;
    const pageHeightPx = (297 / 25.4) * 96;
    const w = cert.offsetWidth;
    const h = cert.offsetHeight;
    if (w <= 0 || h <= 0) return;
    const scale = Math.min(pageWidthPx / w, pageHeightPx / h, 1) * 0.98;
    document.documentElement.style.setProperty("--cert-print-scale", String(scale));
}

/**
 * Full-screen flashcard with Print / Save PDF and, for the student's own approved record, the certificate
 * (View Certificate) and its public QR verification. One dialog: the certificate replaces the flashcard
 * view, so the two never print together.
 */
export function QuickImpactViewer({ log, onClose }: { log: QuickWorkLog; onClose: () => void }) {
    const [view, setView] = useState<"flash" | "certificate">("flash");
    const [mounted, setMounted] = useState(false);
    const panel = useRef<HTMLDivElement>(null);
    const holder = viewerRow(log);
    const code = log.status === "approved" ? log.certificate?.code ?? null : null;
    const canCertify = Boolean(code && holder);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
            previous?.focus?.();
        };
    }, [onClose]);

    useEffect(() => {
        panel.current?.querySelector<HTMLElement>("button, a")?.focus();
    }, [view, mounted]);

    // While the certificate is open, printing (button or Ctrl+P) prints the certificate alone.
    useEffect(() => {
        if (view !== "certificate") return;
        document.documentElement.classList.add("cii-certificate-printing");
        document.body.classList.add("cii-certificate-printing");
        return () => {
            document.documentElement.classList.remove("cii-certificate-printing");
            document.body.classList.remove("cii-certificate-printing");
            document.documentElement.style.removeProperty("--cert-print-scale");
        };
    }, [view]);

    useEffect(() => () => document.body.classList.remove("qif-printing"), []);

    const printFlashcard = () => {
        const done = () => {
            document.body.classList.remove("qif-printing");
            window.removeEventListener("afterprint", done);
        };
        document.body.classList.add("qif-printing");
        window.addEventListener("afterprint", done);
        window.print();
    };

    const printCertificate = () => {
        applyCertificatePrintScale();
        window.print();
    };

    if (!mounted) return null;

    const verify = code ? (
        <a href={quickImpactVerifyPath(code)} target="_blank" rel="noopener noreferrer" className={toolbarBtn}>
            Open QR Verification ↗
        </a>
    ) : null;

    if (view === "certificate" && canCertify && code && holder) {
        return createPortal(
            <div
                className="cii-certificate-print-root fixed inset-0 z-[110] overflow-y-auto bg-slate-900/60 p-3 sm:p-6 print:p-0"
                role="dialog"
                aria-modal="true"
                aria-label="Quick Community Impact certificate"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div ref={panel} className="mx-auto max-w-[900px]">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 print:hidden">
                        <button type="button" onClick={() => setView("flash")} className={toolbarBtn}>
                            ← Flashcard
                        </button>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={printCertificate} className={toolbarPrimary}>
                                Print / Save PDF
                            </button>
                            {verify}
                            <button type="button" onClick={onClose} className={toolbarBtn} aria-label="Close">
                                ✕
                            </button>
                        </div>
                    </div>
                    <QuickImpactCertificate log={log} holder={holder} code={code} />
                </div>
            </div>,
            document.body,
        );
    }

    return createPortal(
        <div
            className="qif-print-root fixed inset-0 z-[110] overflow-y-auto bg-[#04252b]/55 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Quick Impact Flashcard"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div ref={panel} className="mx-auto max-w-[790px]">
                <div className="qif-noprint mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2476ae]">Quick Impact Flashcard</p>
                        <p className="text-xs text-[#6f8fa5]">
                            {log.status === "approved"
                                ? "Verified publication · Faculty → CIEL PK final approval"
                                : "Preview: not published until faculty approval and CIEL PK final approval."}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={printFlashcard} className={toolbarBtn}>
                            Print / Save PDF
                        </button>
                        {canCertify ? (
                            <button type="button" onClick={() => setView("certificate")} className={toolbarPrimary}>
                                View Certificate
                            </button>
                        ) : null}
                        {verify}
                        <button type="button" onClick={onClose} className={toolbarBtn} aria-label="Close">
                            ✕
                        </button>
                    </div>
                </div>
                <QuickImpactFlashcard log={log} />
                {canCertify && code ? (
                    <p className="qif-noprint mt-3 rounded-xl bg-white/90 px-4 py-2.5 text-xs text-[#55758f]">
                        CIEL PK Verified Impact Certificate · ID <b className="font-mono text-[#155a8b]">{code}</b> · Student · Activity · Verified
                        hours · University · Verification date
                    </p>
                ) : null}
            </div>
        </div>,
        document.body,
    );
}
