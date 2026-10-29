"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Calendar, Clock, Globe, Lock, Tag, Target } from "lucide-react";
import "@/app/dashboard/student/report/components/certificate-print.css";
import "./quick-impact-flashcard.css";
import CertificateScaleShell from "@/app/dashboard/student/report/components/CertificateScaleShell";
import { activityLabel, formatHours, quickImpactVerifyPath, SDG_NAMES, shortDate, type QuickWorkLog, type QuickWorkParticipant } from "@/utils/quickWorkRules";

function CertFlourish() {
    return (
        <svg className="cert-flourish" viewBox="0 0 88 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path
                d="M44 2c-8 0-12 4-16 6-4 2-8 2-12 0M44 2c8 0 12 4 16 6 4 2 8 2 12 0M44 16c-3-2-6-3-10-3s-7 1-10 3M44 16c3-2 6-3 10-3s7 1 10 3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
            <circle cx="44" cy="9" r="2.5" fill="currentColor" />
        </svg>
    );
}

/** "29 OCT 2026" in PKT, the date CIEL PK gave final approval. */
function verifiedDate(iso: string | null): string {
    const d = iso ? new Date(iso) : null;
    if (!d || Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" }).toUpperCase();
}

/** Absolute verification URL for the QR code (needs the browser's origin, so only after mount). */
export function useQuickImpactVerifyUrl(code: string): string {
    const [url, setUrl] = useState("");
    useEffect(() => setUrl(`${window.location.origin}${quickImpactVerifyPath(code)}`), [code]);
    return url;
}

/**
 * CIEL PK Verified Impact Certificate for one student's Quick Community Impact (A4, same artwork as the
 * structured certificate): student, activity, their verified hours, university and verification date,
 * with the certificate ID and a QR code to the public check.
 */
export default function QuickImpactCertificate({
    log,
    holder,
    code,
}: {
    log: QuickWorkLog;
    holder: QuickWorkParticipant;
    code: string;
}) {
    const verifyUrl = useQuickImpactVerifyUrl(code);
    const host = verifyUrl ? new URL(verifyUrl).host : "www.cielpk.com";
    const credited = log.participants.filter((p) => p.present && p.minutes > 0).length;
    const sdg = Number(log.sdg);
    const sdgOk = Number.isInteger(sdg) && sdg >= 1 && sdg <= 17;
    const dated = verifiedDate(log.reviewedAt);

    return (
        <div className="certificate-print-shell flex justify-center p-4 print:p-0">
            <CertificateScaleShell>
                <div className="certificate-one-page mx-auto min-h-[297mm] w-[210mm] max-w-[210mm] break-inside-avoid shadow-2xl print:shadow-none">
                    <div className="cert-frame">
                        <div className="cert-corner cert-corner--tl" aria-hidden />
                        <div className="cert-corner cert-corner--tl-gold" aria-hidden />
                        <div className="cert-corner cert-corner--bl" aria-hidden />
                        <div className="cert-corner cert-corner--bl-gold" aria-hidden />
                        <div className="cert-corner cert-corner--br" aria-hidden />
                        <div className="cert-corner cert-corner--br-gold" aria-hidden />

                        <div className="cert-inner">
                            <div className="cert-logo-row">
                                <img src="/certificate-iel-pk-logo.png" alt="IEL" className="cert-logo-mark" width={1024} height={1024} />
                                <span className="cert-logo-pk">PK</span>
                            </div>

                            <h1 className="cert-title-main">Certificate</h1>
                            <p className="cert-title-sub">Of Verified Quick Community Impact</p>
                            <CertFlourish />

                            <p className="cert-intro">This is to certify that</p>
                            <p className="cert-project-title qci-cert-holder">{holder.name || holder.email}</p>
                            <p className="cert-intro">
                                {log.university ? `of ${log.university}` : ""}
                                {credited > 1 ? `, as a member of a ${credited}-student team,` : ""} contributed verified community service
                                to the Quick Community Impact activity
                            </p>
                            <p className="cert-project-title">&ldquo;{log.title || "Quick Community Impact"}&rdquo;</p>
                            <CertFlourish />

                            <div className="cert-metrics certificate-metrics-grid">
                                <div className="cert-metric certificate-metric-cell">
                                    <Clock className="cert-metric-icon" aria-hidden />
                                    <p className="cert-metric-label">Verified Hours</p>
                                    <p className="cert-metric-value">{formatHours(holder.minutes)}</p>
                                </div>
                                <div className="cert-metric certificate-metric-cell">
                                    <Calendar className="cert-metric-icon" aria-hidden />
                                    <p className="cert-metric-label">Activity Date</p>
                                    <p className="cert-metric-value cert-metric-value--sm">{shortDate(log.activityDate)}</p>
                                </div>
                                <div className="cert-metric certificate-metric-cell">
                                    <Tag className="cert-metric-icon" aria-hidden />
                                    <p className="cert-metric-label">Activity Type</p>
                                    <p className="cert-metric-value cert-metric-value--sm">{activityLabel(log) || "—"}</p>
                                </div>
                                <div className="cert-metric certificate-metric-cell">
                                    <Target className="cert-metric-icon" aria-hidden />
                                    <p className="cert-metric-label">SDG Alignment</p>
                                    <p className="cert-metric-value">{sdgOk ? `Goal ${sdg}` : "—"}</p>
                                    {sdgOk ? <p className="cert-metric-sdg-sub">{SDG_NAMES[sdg - 1]}</p> : null}
                                </div>
                            </div>

                            <p className="qci-cert-note">
                                Faculty verified · CIEL PK final approval on {dated}. Quick Community Impact is recorded separately from Structured
                                Community Service and does not count towards the 16-hour requirement, CII or rankings.
                            </p>

                            <div className="cert-footer-row">
                                <div className="cert-signature-block">
                                    <img src="/ciel-e-signature.png" alt="Registrar signature" className="cert-signature-img" width={118} height={34} />
                                    <div className="cert-signature-line" />
                                    <p className="cert-registrar-label">Registrar of Impact</p>
                                    <p className="cert-registrar-sub">Community Impact Lab (CIL)</p>
                                </div>
                                <div className="cert-date-block">
                                    <div className="cert-date-mark">
                                        <p className="cert-dated-value">{dated}</p>
                                        <Calendar className="cert-date-icon" aria-hidden />
                                    </div>
                                    <div className="cert-date-line" />
                                    <p className="cert-dated-label">Verified</p>
                                </div>
                            </div>

                            <div className="cert-verify-box">
                                <div className="cert-verify-shield" aria-hidden>
                                    <Lock className="cert-verify-shield-lock" strokeWidth={2.25} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="cert-verify-code-label">Certificate ID</p>
                                    <p className="cert-verify-code-value">{code}</p>
                                    <p className="cert-verify-hint">
                                        Scan the QR code or visit {host}/quick-impact/verify with this ID to verify authenticity.
                                    </p>
                                </div>
                                {verifyUrl ? (
                                    <div className="shrink-0 bg-white">
                                        <QRCode value={verifyUrl} size={76} level="M" />
                                    </div>
                                ) : (
                                    <div className="h-[76px] w-[76px] shrink-0 border border-dashed border-[#b67835]/50 bg-white/80" aria-hidden />
                                )}
                            </div>

                            <p className="cert-disclaimer">
                                This certificate is issued by Community Impact Lab (CIL) for Quick Community Impact verified by faculty and CIEL PK.
                            </p>
                            <p className="cert-website">
                                <Globe className="cert-website-icon" aria-hidden />
                                www.cielpk.com
                            </p>
                        </div>
                    </div>
                </div>
            </CertificateScaleShell>
        </div>
    );
}
