"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { sdgData } from "@/utils/sdgData";
import { pakistaniUniversities } from "@/utils/universityData";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import ThesisCard from "@/components/ciel/ThesisCard";
import { TeamInviteBadge } from "@/components/ciel/TeamInviteBadge";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { CourseworkCrumb, CourseworkHero, HubBackButton } from "@/components/ciel/coursework/CourseworkHubChrome";
import {
    type FypEntry,
    type FypSectionSummaries,
    type FypTeamMember,
    EMPTY_FYP,
    mergeFypEntry,
    normalizeFypTeamMembers,
    groupFypDeliverablesByLabel,
} from "@/utils/fypTypes";
import {
    type FypV9FormState,
    type FypV9RouteKey,
    EMPTY_FYP_V9,
    FYP_V9_AREAS,
    FYP_V9_CONTRIB,
    FYP_V9_DELIVERABLES,
    FYP_V9_EVIDENCE,
    FYP_V9_IP,
    FYP_V9_LEVELS,
    FYP_V9_LIMITATIONS,
    FYP_V9_OPPORTUNITY,
    FYP_V9_PATHWAYS,
    FYP_V9_Q_ANALYSIS,
    FYP_V9_Q_SAMPLING,
    FYP_V9_QUAL_ANALYSIS,
    FYP_V9_QUAL_SAMPLING,
    FYP_V9_READINESS,
    FYP_V9_REVIEW_LABELS,
    FYP_V9_ROADMAPS,
    FYP_V9_ROUTE_KEYS,
    FYP_V9_ROUTES,
    FYP_V9_SKILLS,
    FYP_V9_STEP_NAMES,
    FYP_V9_SUSTAIN,
    FYP_V9_TO_MERIT_ROUTE,
    FYP_V9_VISIBILITY,
    FYP_V9_WHY,
    composeFypV9Summaries,
    effectiveSelect,
    suggestFypV9Routes,
} from "@/utils/fypV9Catalog";
import {
    Field,
    ChipGroup,
    SummaryBox,
    StepNav,
    fieldClass,
    toggleIn,
    hydrateV9,
} from "./FypV9FormUi";

function normalizeCountryCode(v?: string) {
    const d = String(v || "").replace(/\D/g, "").slice(0, 4);
    return d ? `+${d}` : "";
}
function normalizeLocalNumber(v?: string) {
    return String(v || "").replace(/\D/g, "").replace(/^0+/, "").slice(0, 15);
}
function emptyTeamMember(): FypTeamMember {
    return { name: "", rollNumber: "", email: "", whatsappCode: "+92", whatsappNumber: "" };
}

export default function FypV9Workspace() {
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<FypEntry>(EMPTY_FYP);
    const [v9, setV9] = useState<FypV9FormState>(EMPTY_FYP_V9);
    const [step, setStep] = useState(0);
    const [editing, setEditing] = useState(false);
    const [review, setReview] = useState<{ accepted: boolean; edited: boolean; text: string }[]>(
        Array.from({ length: 7 }, () => ({ accepted: false, edited: false, text: "" })),
    );
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flashOpen, setFlashOpen] = useState(false);

    useEffect(() => {
        authenticatedFetch("/api/v1/paths/fyp-thesis", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) {
                    const data = mergeFypEntry(EMPTY_FYP, result.data as Partial<FypEntry>);
                    setEntry(data);
                    setV9(hydrateV9(data));
                    setStep(Math.min(7, data.stepCompleted ?? 0));
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const patchV9 = (patch: Partial<FypV9FormState>) => setV9((s) => ({ ...s, ...patch }));
    const pathwayStr = (id: string) => {
        const v = v9.pathway[id];
        return Array.isArray(v) ? "" : v || "";
    };
    const pathwayList = (id: string) => {
        const v = v9.pathway[id];
        return Array.isArray(v) ? v : [];
    };
    const setPathway = (id: string, value: string | string[]) => patchV9({ pathway: { ...v9.pathway, [id]: value } });

    const team = normalizeFypTeamMembers(entry.projectInfo?.teamMembers);
    const isTeam = v9.teamType === "Team / Group";
    const routeKey = v9.v9Route;
    const summaries = useMemo(
        () =>
            composeFypV9Summaries({
                title: entry.projectInfo?.title || entry.projectTitle || "",
                university: entry.projectInfo?.university || "",
                degree: entry.projectInfo?.degree || "",
                supervisor: entry.projectInfo?.supervisorName || "",
                teamNames: team.map((m) => m.name).filter(Boolean),
                v9,
            }),
        [entry.projectInfo, entry.projectTitle, team, v9],
    );

    useEffect(() => {
        if (step !== 7) return;
        setReview((prev) =>
            prev.map((r, i) => (!r.edited && !r.accepted ? { ...r, text: summaries[i] || "" } : r)),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const buildPatch = (sectionSummaries?: FypSectionSummaries): Partial<FypEntry> => {
        const routeTitle = routeKey ? FYP_V9_ROUTES[routeKey].title : undefined;
        const meritRoute = routeKey ? FYP_V9_TO_MERIT_ROUTE[routeKey] : undefined;
        const approaches: string[] = [];
        if (v9.hasQuant) approaches.push("Quantitative");
        if (v9.hasQual) approaches.push("Qualitative");
        if (v9.hasQuant && v9.hasQual) approaches.push("Mixed methods");
        const pathwayApproaches = pathwayList("rApproach");
        const methods = [...pathwayList("rMethods"), ...v9.evidence, v9.evidenceOther].filter(Boolean);
        const lim = effectiveSelect(v9.limitation, v9.limitationOther);
        // The merit model (frontend and backend) keys its evidence-quality scoring off one of 6 exact
        // canonical strings — the free-text validationSummary can never match one, which silently floors
        // the score and leaks the raw paragraph into the "evidenceStatus" badge shown on the flash card.
        // Derive the category from what was actually structured, in order of strength.
        const hasQuantRows = v9.hasQuant && v9.qRows.some((r) => r.a.trim() || r.b.trim() || r.c.trim());
        const hasQualRows = v9.hasQual && v9.qualRows.some((r) => r.a.trim() || r.b.trim() || r.c.trim());
        const evidenceStatus = hasQuantRows
            ? "Measured / tested result"
            : hasQualRows
              ? "Qualitative evidence"
              : v9.evidence.length
                ? "Estimated / projected"
                : v9.validationSummary.trim()
                  ? "Conceptual / proposed"
                  : undefined;
        const teamMembers = isTeam
            ? team.map((m) => ({
                  ...m,
                  whatsappCode: normalizeCountryCode(m.whatsappCode || "+92") || "+92",
                  whatsappNumber: normalizeLocalNumber(m.whatsappNumber),
              }))
            : entry.projectInfo?.teamMembers;
        const sdgEntries = (entry.sdgMapping?.entries || []).map((e) => ({
            ...e,
            how: e.how || v9.sdgHow || undefined,
        }));
        return {
            projectTitle: entry.projectInfo?.title || entry.projectTitle,
            projectInfo: {
                ...entry.projectInfo,
                v9Form: { ...v9 } as unknown as Record<string, unknown>,
                academicAreaKey: v9.academicAreaKey,
                academicArea: FYP_V9_AREAS[v9.academicAreaKey]?.label,
                discipline: effectiveSelect(v9.discipline, v9.disciplineOther),
                officialProgram: v9.officialProgram,
                academicLevel: effectiveSelect(v9.academicLevel, v9.academicLevelOther),
                teamType: v9.teamType,
                teamRole: v9.teamRole,
                v9Route: v9.v9Route || undefined,
                v9RouteOther: v9.v9RouteOther,
                leadRoute: meritRoute || entry.projectInfo?.leadRoute,
                projectType: routeTitle,
                projectTypes: routeTitle ? [routeTitle] : entry.projectInfo?.projectTypes,
                teamMembers,
            },
            background: {
                problem: v9.focus,
                whyUrgent: v9.why,
                whyUrgentOther: v9.whyOther,
                audience: v9.audience ? [v9.audience] : [],
                audienceOther: v9.audience,
            },
            objectivesInfo: {
                aim: v9.objective,
                objectives: [...v9.deliverables, v9.deliverableOther].filter(Boolean),
                scope: v9.focus,
            },
            methodology: {
                approaches: pathwayApproaches.length ? pathwayApproaches : approaches,
                methods,
                methodsOther: v9.evidenceOther || undefined,
                sampleScale: v9.qSample || pathwayStr("rData") || undefined,
                tools: v9.qSoftware || pathwayStr("rTools") || pathwayStr("sStack") || undefined,
            },
            findings: {
                findings: [v9.finding1, v9.finding2].filter(Boolean),
                measurableImpact: v9.qualityEvidence || v9.outcome,
                limitation: lim,
                limitationDetail: v9.limitationOther || undefined,
                evidenceStatus,
            },
            routeDetails: {
                ...entry.routeDetails,
                v9Pathway: v9.pathway,
                v9Roadmap: v9.roadmap,
            },
            sdgMapping: {
                entries: v9.sustain === "No defensible sustainability link" ? [] : sdgEntries,
                noSdgApplies: v9.sustain === "No defensible sustainability link",
            },
            reflectionInfo: {
                biggestLesson: v9.learned,
                hardestMoment: v9.challenge,
                skills: [...v9.skills, v9.skillOther].filter(Boolean),
                sustainabilityShift: v9.sustainReflection,
                whatsNext: v9.future,
            },
            repository: {
                externalLinks: v9.links,
                visibility: v9.visibility,
            },
            ...(sectionSummaries ? { sectionSummaries } : {}),
        };
    };

    const save = async (advanceTo?: number, sectionSummaries?: FypSectionSummaries, status?: "draft" | "submitted") => {
        setSaving(true);
        setError(null);
        const nextStep = advanceTo !== undefined ? Math.max(entry.stepCompleted, advanceTo) : entry.stepCompleted;
        const patch = buildPatch(sectionSummaries);
        try {
            const res = await authenticatedFetch(
                "/api/v1/paths/fyp-thesis",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        ...patch,
                        stepCompleted: nextStep,
                        ...(status ? { status } : {}),
                    }),
                },
                { redirectToLogin: false },
            );
            const result = res?.ok ? await res.json() : null;
            if (!result?.data) throw new Error("Could not save your progress");
            setEntry((e) => mergeFypEntry(e, result.data as Partial<FypEntry>));
            if (advanceTo !== undefined) setStep(Math.min(7, advanceTo));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save your progress");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const pickRoute = (k: FypV9RouteKey) => {
        const stages = FYP_V9_ROADMAPS[k].map(([stage, goal]) => ({ stage, goal }));
        patchV9({
            v9Route: k,
            deliverables: k === routeKey ? v9.deliverables : [],
            evidence: k === routeKey ? v9.evidence : [],
            roadmap: k === routeKey && v9.roadmap.length ? v9.roadmap : stages,
            pathway: k === routeKey ? v9.pathway : {},
        });
    };

    const updateTeam = (i: number, patch: Partial<FypTeamMember>) => {
        const next = [...(team.length ? team : [emptyTeamMember()])];
        const merged = { ...(next[i] ?? emptyTeamMember()), ...patch };
        if (patch.whatsappCode !== undefined) merged.whatsappCode = normalizeCountryCode(patch.whatsappCode) || "+92";
        if (patch.whatsappNumber !== undefined) merged.whatsappNumber = normalizeLocalNumber(patch.whatsappNumber);
        next[i] = merged;
        setEntry((e) => ({ ...e, projectInfo: { ...e.projectInfo, teamMembers: next } }));
    };

    const handleFile = async (file: File) => {
        setUploading(true);
        setError(null);
        try {
            const presignRes = await authenticatedFetch(
                "/api/v1/paths/evidence/presign",
                { method: "POST", body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) },
                { redirectToLogin: false },
            );
            const presign = presignRes?.ok ? await presignRes.json() : null;
            const { uploadUrl, publicUrl } = presign?.data ?? {};
            if (!uploadUrl || !publicUrl) throw new Error("Could not prepare the upload");
            const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
            if (!putRes.ok) throw new Error("Upload failed — please try again");
            const res = await authenticatedFetch(
                "/api/v1/paths/fyp-thesis/deliverables",
                { method: "POST", body: JSON.stringify({ label: file.name, fileUrl: publicUrl }) },
                { redirectToLogin: false },
            );
            const result = res?.ok ? await res.json() : null;
            if (result?.data?.deliverables) setEntry((e) => ({ ...e, deliverables: result.data.deliverables }));
        } catch {
            setError("Upload failed. Try again.");
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <WorkspaceSkeleton />;

    const isOwner = entry.isOwner !== false;
    const showCard = (entry.status === "submitted" && !editing) || !isOwner;
    const area = FYP_V9_AREAS[v9.academicAreaKey];
    const suggested = suggestFypV9Routes(v9.academicAreaKey, effectiveSelect(v9.discipline, v9.disciplineOther));
    const sustainRelevant = v9.sustain && v9.sustain !== "No defensible sustainability link" && v9.sustain !== "Not sure — request guidance";
    const acceptedCount = review.filter((r) => r.accepted).length;
    const groupedFiles = groupFypDeliverablesByLabel(entry.deliverables);
    const connectionReady = !!(
        entry.projectInfo?.university &&
        entry.projectInfo?.supervisorName &&
        entry.projectInfo?.supervisorEmail &&
        (!isTeam ||
            (team.length > 0 &&
                team.every(
                    (m) =>
                        m.name?.trim() &&
                        m.rollNumber?.trim() &&
                        m.email?.trim() &&
                        normalizeCountryCode(m.whatsappCode) &&
                        normalizeLocalNumber(m.whatsappNumber),
                )))
    );

    const goNext = async (n: number) => {
        await save(n);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const completeSectionOne = async () => {
        const missing = [
            !entry.projectInfo?.title && "FYP title",
            !entry.projectInfo?.university && "University",
            !v9.academicAreaKey && "Academic area",
            !effectiveSelect(v9.discipline, v9.disciplineOther) && "Discipline",
            !entry.projectInfo?.supervisorName && "Supervisor",
            !entry.projectInfo?.supervisorEmail && "Supervisor email",
            !routeKey && "Primary FYP route",
            routeKey === "other" && !v9.v9RouteOther.trim() && "Custom route description",
        ].filter(Boolean);
        if (missing.length) {
            setError(`Please complete: ${missing.join(", ")}`);
            return;
        }
        if (isTeam) {
            const members = team.length ? team : [];
            if (!members.length) {
                setError("Please add the group members.");
                return;
            }
            const incomplete = members.findIndex(
                (m) =>
                    !m.name?.trim() ||
                    !m.rollNumber?.trim() ||
                    !m.email?.trim() ||
                    !normalizeCountryCode(m.whatsappCode) ||
                    !normalizeLocalNumber(m.whatsappNumber),
            );
            if (incomplete >= 0) {
                setError(`Please complete Name, Roll No., Email, Country Code and WhatsApp Number for Group Member ${incomplete + 1}.`);
                return;
            }
            const badPhone = members.findIndex(
                (m) =>
                    !/^\+\d{1,4}$/.test(normalizeCountryCode(m.whatsappCode)) ||
                    normalizeLocalNumber(m.whatsappNumber).length < 6,
            );
            if (badPhone >= 0) {
                setError(`Please enter a valid country code (e.g. +92) and WhatsApp number for Group Member ${badPhone + 1}.`);
                return;
            }
        }
        setError(null);
        await goNext(1);
    };

    const submitRecord = async () => {
        const summariesOut: FypSectionSummaries = {
            project: review[0]?.text,
            background: review[1]?.text,
            objectives: review[2]?.text,
            methodology: review[3]?.text,
            findings: review[4]?.text,
            sdg: review[5]?.text,
            reflection: review[6]?.text,
        };
        const ok = await save(8, summariesOut, "submitted");
        if (ok) {
            setEditing(false);
            setFlashOpen(false);
        }
    };

    if (showCard) {
        return (
            <div className="mx-auto max-w-[1040px] pb-16">
                <CourseworkCrumb role="Student" pathLabel="Final Year Project (FYP)" view="Record" />
                <CourseworkHero
                    kicker="CIEL PK · ACADEMIC PATH · FINAL YEAR PROJECTS"
                    title="Your FYP record"
                    subtitle="Submitted to your supervisor. You can reopen it if they ask for revision."
                    gradient="linear-gradient(125deg,#0e2a3a,#322866 58%,#126783 120%)"
                    stats={[{ value: entry.supervisorApprovalStatus === "approved" ? "Approved" : "Submitted", label: "STATUS" }]}
                />
                <div className="mt-5">
                    <HubBackButton href="/dashboard/student/paths/fyp-thesis" label="← FYP hub" />
                </div>
                {!isOwner && (
                    <div className="mb-3 rounded-xl border border-[#cfe2ff] bg-[#eaf3ff] px-4 py-2.5 text-xs font-semibold text-[#355c88]">
                        👥 You&apos;re named as a co-author on this record — the lead author owns it and is the only one who can edit or submit changes.
                    </div>
                )}
                <ThesisCard entry={entry} defaultOpen />
                {isOwner && entry.status === "submitted" && (
                    <button type="button" onClick={() => { setReview(Array.from({ length: 7 }, () => ({ accepted: false, edited: false, text: "" }))); setEditing(true); setStep(0); }} className="mt-4 rounded-xl border border-[#e7eaf1] px-4 py-2.5 text-sm font-bold text-[#71809b]">
                        Edit this record
                    </button>
                )}
            </div>
        );
    }

    const pathway = routeKey ? FYP_V9_PATHWAYS[routeKey] : null;

    return (
        <div className="mx-auto max-w-[1040px] pb-24">
            <CourseworkCrumb role="Student" pathLabel="Final Year Project (FYP)" view="Build record" />
            <div className="mt-1">
                <HubBackButton href="/dashboard/student/paths/fyp-thesis" label="← FYP hub" />
            </div>
            <CourseworkHero
                kicker="CIEL PK · ACADEMIC PATH · FINAL YEAR PROJECTS"
                title="Final Year Projects — one record, the right route 🎓"
                subtitle="Whatever you create — thesis, prototype, product, software, collection, film, design or something new — CIEL builds your route, captures evidence and turns the work into a verified FYP Passport."
                gradient="linear-gradient(125deg,#0e2a3a,#322866 58%,#126783 120%)"
                stats={[
                    { value: `${entry.stepCompleted}/8`, label: "STEPS" },
                    { value: entry.status === "submitted" ? "Submitted" : "Draft", label: "STATUS" },
                ]}
            />
            <div className="mt-4 flex flex-wrap gap-1.5">
                {["HEC-wide discipline coverage", "Adaptive FYP routes", "Editable roadmap", "Quant + Qual evidence", "Carry-forward highlights", "Final AI flashcard"].map((p) => (
                    <span key={p} className="rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold text-[#0e2a3a]">{p}</span>
                ))}
            </div>

            <div className="mt-4 mb-[18px]">
                <div className="flex gap-1 overflow-x-auto py-[7px] pl-1 [scrollbar-width:thin]">
                    {FYP_V9_STEP_NAMES.map((name, i) => {
                        const active = i === step;
                        const done = i < entry.stepCompleted && !active;
                        return (
                            <button
                                key={name}
                                type="button"
                                onClick={() => i <= entry.stepCompleted && setStep(i)}
                                disabled={i > entry.stepCompleted}
                                title={name}
                                className={clsx(
                                    "relative min-w-16 flex-1 rounded-[11px] border px-1 py-[7px] text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-40",
                                    active
                                        ? "border-[#d5aa46] bg-black text-white shadow-[inset_0_0_0_1px_#d5aa46]"
                                        : done
                                          ? "border-black bg-black text-white"
                                          : "border-black bg-black text-white/70 hover:text-white",
                                )}
                            >
                                <div className="text-sm leading-none">{done ? "✓" : i + 1}</div>
                                <div className={clsx("mt-0.5 text-[9px] font-extrabold uppercase leading-tight tracking-wide", active ? "text-white" : "text-white/75")}>
                                    {name}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="mb-4 mt-2 rounded-[14px] border border-[#e7eaf1] bg-white px-3.5 py-2.5">
                <div className="flex items-center justify-between text-[11px] font-extrabold">
                    <span>✨ Your FYP story is taking shape</span>
                    <span className="text-[#71809b]">{step === 0 ? "Getting started" : `Step ${step + 1} of 8`}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf0f6]">
                    <i className="block h-full rounded-full bg-gradient-to-r from-[#6d4aff] via-[#09a6c7] to-[#169b62]" style={{ width: `${((step + 1) / 8) * 100}%` }} />
                </div>
            </div>

            {error ? <div className="mb-3 rounded-xl border border-[#f0d9b6] bg-[#fff7e8] px-3.5 py-2.5 text-xs text-[#7c561e]">{error}</div> : null}

            <div className="rounded-[18px] border border-[#e7eaf1] bg-white p-[22px] shadow-[0_4px_14px_rgba(14,42,58,.025)]">
                {step === 0 && (
                    <>
                        <p className="text-[9.5px] font-black tracking-[0.10em] text-[#6d4aff]">STEP 1 OF 8</p>
                        <h2 className="m-0 text-[17px] font-semibold">Project identity & route 🧭</h2>
                        <p className="mt-1 text-[12.5px] text-[#71809b]">Choose your academic area, discipline and the form of final work your programme expects.</p>
                        <div className="mt-3 flex gap-2 rounded-[11px] border border-[#e7eaf1] bg-[#f8fafc] px-3 py-2.5 text-[10.8px] leading-relaxed text-[#71809b]">
                            <span>🎓</span>
                            <div><b className="text-[#172033]">Broad national coverage:</b> academic areas follow HEC classifications. If your programme uses a different title, choose Other and type it.</div>
                        </div>
                        <Field label="Final Year Project title" required>
                            <input value={entry.projectInfo?.title ?? ""} onChange={(e) => setEntry((s) => ({ ...s, projectTitle: e.target.value, projectInfo: { ...s.projectInfo, title: e.target.value } }))} placeholder="Working or final project title" className={fieldClass} />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="University / Institution" required hint="Auto-fills from your account when available — you can still edit it.">
                                <SearchableSelect value={entry.projectInfo?.university ?? ""} onChange={(v) => setEntry((s) => ({ ...s, projectInfo: { ...s.projectInfo, university: v } }))} options={pakistaniUniversities} placeholder="Type your university" />
                            </Field>
                            <Field label="School / Faculty / Department (optional)">
                                <input value={entry.projectInfo?.school ?? ""} onChange={(e) => setEntry((s) => ({ ...s, projectInfo: { ...s.projectInfo, school: e.target.value } }))} placeholder="e.g. School of Business" className={fieldClass} />
                            </Field>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="Academic area" required>
                                <select value={v9.academicAreaKey} onChange={(e) => patchV9({ academicAreaKey: e.target.value, discipline: "" })} className={fieldClass}>
                                    <option value="">Select broad academic area…</option>
                                    {Object.entries(FYP_V9_AREAS).map(([k, a]) => (
                                        <option key={k} value={k}>{a.label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Specific discipline / programme field" required>
                                <select value={v9.discipline} disabled={!area} onChange={(e) => patchV9({ discipline: e.target.value })} className={fieldClass}>
                                    <option value="">{area ? "Select discipline…" : "Choose academic area first…"}</option>
                                    {(area?.disciplines || []).map((d) => <option key={d}>{d}</option>)}
                                </select>
                                {v9.discipline === "Other" ? <input value={v9.disciplineOther} onChange={(e) => patchV9({ disciplineOther: e.target.value })} placeholder="Enter your discipline" className={clsx(fieldClass, "mt-2")} /> : null}
                            </Field>
                            <Field label="Degree / programme title">
                                <input value={entry.projectInfo?.degree ?? ""} onChange={(e) => setEntry((s) => ({ ...s, projectInfo: { ...s.projectInfo, degree: e.target.value } }))} placeholder="e.g. BBA, BS Computer Science" className={fieldClass} />
                            </Field>
                        </div>
                        {area ? <div className="mt-2 rounded-[10px] border border-[#e7eaf1] bg-[#f7f8fc] px-3 py-2 text-[10.7px] text-[#53647f]"><b>{area.label}</b><br />{area.council}</div> : null}
                        <p className="mt-2 rounded-[11px] border border-[#f2dfb8] bg-[#fffaf0] px-3 py-2.5 text-[10.8px] leading-relaxed text-[#765b2c]"><b>Can&apos;t find the exact name?</b> Always preserve your university&apos;s exact programme title below.</p>
                        <Field label="Official programme / qualification name exactly as your university records it">
                            <input value={v9.officialProgram} onChange={(e) => patchV9({ officialProgram: e.target.value })} placeholder="e.g. BS Strategic Studies" className={fieldClass} />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="Academic level">
                                <select value={v9.academicLevel} onChange={(e) => patchV9({ academicLevel: e.target.value })} className={fieldClass}>
                                    <option value="">Select…</option>
                                    {FYP_V9_LEVELS.map((l) => <option key={l}>{l}</option>)}
                                </select>
                                {v9.academicLevel === "Other" ? <input value={v9.academicLevelOther} onChange={(e) => patchV9({ academicLevelOther: e.target.value })} className={clsx(fieldClass, "mt-2")} /> : null}
                            </Field>
                            <Field label="Graduation / completion year">
                                <input type="number" min={2020} max={2038} value={entry.projectInfo?.graduationYear ?? "2026"} onChange={(e) => setEntry((s) => ({ ...s, projectInfo: { ...s.projectInfo, graduationYear: e.target.value } }))} className={fieldClass} />
                            </Field>
                            <Field label="Project format">
                                <select
                                    value={v9.teamType}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        patchV9({ teamType: next });
                                        if (next === "Team / Group" && !normalizeFypTeamMembers(entry.projectInfo?.teamMembers).length) {
                                            setEntry((s) => ({
                                                ...s,
                                                projectInfo: { ...s.projectInfo, teamMembers: [emptyTeamMember(), emptyTeamMember()] },
                                            }));
                                        }
                                    }}
                                    className={fieldClass}
                                >
                                    <option>Individual</option>
                                    <option>Team / Group</option>
                                </select>
                            </Field>
                        </div>
                        {isTeam && (
                            <div className="mt-3 rounded-[14px] border border-[#ddd8ff] bg-gradient-to-br from-white to-[#faf8ff] p-3.5">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <div>
                                        <b className="text-xs">👥 Group members</b>
                                        <p className="text-[11px] text-[#71809b]">Add every group member so one shared FYP record connects the full team.</p>
                                    </div>
                                    <span className="rounded-full bg-[#f1edff] px-2 py-1 text-[9px] font-black text-[#6d4aff]">SHARED PROJECT RECORD</span>
                                </div>
                                {(team.length ? team : [emptyTeamMember(), emptyTeamMember()]).map((m, i) => (
                                    <div key={i} className="mb-2 grid gap-2 border-t border-dashed border-[#e7eaf1] pt-2 sm:grid-cols-2 lg:grid-cols-6">
                                        <div>
                                            <label className="mb-1 block text-[8.5px] font-black uppercase tracking-wide text-[#71809b]">Name *</label>
                                            <input value={m.name} onChange={(e) => updateTeam(i, { name: e.target.value })} placeholder="Full name" className={fieldClass} />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[8.5px] font-black uppercase tracking-wide text-[#71809b]">Roll No. *</label>
                                            <input value={m.rollNumber ?? ""} onChange={(e) => updateTeam(i, { rollNumber: e.target.value })} placeholder="Roll / student ID" className={fieldClass} />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[8.5px] font-black uppercase tracking-wide text-[#71809b]">Email *</label>
                                            <input type="email" value={m.email ?? ""} onChange={(e) => updateTeam(i, { email: e.target.value })} placeholder="student@university.edu.pk" className={fieldClass} />
                                            <TeamInviteBadge kind="fyp" entryId={entry.id} email={m.email} inviteStatus={m.inviteStatus} />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[8.5px] font-black uppercase tracking-wide text-[#71809b]">Country Code *</label>
                                            <input type="tel" inputMode="tel" maxLength={5} value={m.whatsappCode ?? "+92"} onChange={(e) => updateTeam(i, { whatsappCode: e.target.value })} placeholder="+92" className={clsx(fieldClass, "text-center font-extrabold")} />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[8.5px] font-black uppercase tracking-wide text-[#71809b]">WhatsApp Number *</label>
                                            <input type="tel" inputMode="numeric" maxLength={15} value={m.whatsappNumber ?? ""} onChange={(e) => updateTeam(i, { whatsappNumber: e.target.value })} placeholder="3001234567" className={fieldClass} />
                                        </div>
                                        <button
                                            type="button"
                                            title="Remove member"
                                            onClick={() => {
                                                const next = (team.length ? team : [emptyTeamMember(), emptyTeamMember()]).filter((_, j) => j !== i);
                                                setEntry((s) => ({ ...s, projectInfo: { ...s.projectInfo, teamMembers: next } }));
                                            }}
                                            className="self-end rounded-[9px] border border-[#efced4] bg-[#fff5f6] px-3 py-2.5 font-black text-[#b34d5c]"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setEntry((s) => ({ ...s, projectInfo: { ...s.projectInfo, teamMembers: [...normalizeFypTeamMembers(s.projectInfo?.teamMembers), emptyTeamMember()] } }))} className="mt-1 rounded-lg border border-[#cfc6ff] bg-[#f8f5ff] px-2.5 py-1.5 text-[10.5px] font-black text-[#5d45c8]">＋ Add another member</button>
                                <Field label="Your role / responsibility">
                                    <input value={v9.teamRole} onChange={(e) => patchV9({ teamRole: e.target.value })} placeholder="Your main contribution to the team" className={fieldClass} />
                                </Field>
                            </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Supervisor / faculty" required>
                                <input value={entry.projectInfo?.supervisorName ?? ""} onChange={(e) => setEntry((s) => ({ ...s, projectInfo: { ...s.projectInfo, supervisorName: e.target.value } }))} placeholder="Faculty supervisor name" className={fieldClass} />
                            </Field>
                            <Field label="Supervisor email" required>
                                <input type="email" value={entry.projectInfo?.supervisorEmail ?? ""} onChange={(e) => setEntry((s) => ({ ...s, projectInfo: { ...s.projectInfo, supervisorEmail: e.target.value } }))} placeholder="name@university.edu.pk" className={fieldClass} />
                            </Field>
                        </div>
                        <div className="mt-3 rounded-[14px] border border-[#cfe9df] bg-gradient-to-r from-[#f6fcf9] to-[#f5f9ff] p-3.5">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <b className="text-xs">🔗 Automatic Project Connections</b>
                                    <p className="text-[11px] text-[#71809b]">After Section 1 is completed, this FYP record becomes one connected workspace.</p>
                                </div>
                                <span className={clsx("rounded-full px-2 py-1 text-[9px] font-black", connectionReady ? "bg-[#dff5eb] text-[#167052]" : "bg-[#fff4da] text-[#8b5e10]")}>{connectionReady ? "Ready to connect" : "Complete Section 1"}</span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-4">
                                {[
                                    ["University", entry.projectInfo?.university || "Awaiting university"],
                                    ["Faculty", entry.projectInfo?.supervisorName || "Awaiting supervisor"],
                                    ["Group / Student", isTeam ? (team.map((m) => m.name).filter(Boolean).join(", ") || "Add group members") : "Individual project"],
                                    ["CIEL PK", "CIEL PK workspace"],
                                ].map(([k, v]) => (
                                    <div key={k} className="rounded-[10px] border border-[#e7eaf1] bg-white p-2">
                                        <div className="text-[8px] font-black uppercase tracking-wide text-[#71809b]">{k}</div>
                                        <div className="mt-0.5 text-[10.5px] font-extrabold leading-snug">{v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Field label="What is the PRIMARY form of your Final Year Project?" required hint="The route is based on what you finally produce — not simply your school name.">
                            {suggested.length ? (
                                <div className="mb-2">
                                    <p className="text-[10.5px] text-[#71809b]"><b>Likely routes for this area:</b> suggestions only.</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {suggested.map((k) => (
                                            <button key={k} type="button" onClick={() => pickRoute(k)} className="rounded-full border border-[#d8d0ff] bg-[#faf8ff] px-2.5 py-1 text-[10px] font-extrabold text-[#6048c6]">
                                                {FYP_V9_ROUTES[k].icon} {FYP_V9_ROUTES[k].title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {FYP_V9_ROUTE_KEYS.map((k) => {
                                    const r = FYP_V9_ROUTES[k];
                                    const sel = routeKey === k;
                                    return (
                                        <button key={k} type="button" onClick={() => pickRoute(k)} className={clsx("relative overflow-hidden rounded-[14px] border-[1.5px] p-3.5 text-left", sel ? "border-[#6d4aff] bg-gradient-to-b from-[#fbfaff] to-[#f4f0ff]" : "border-[#e7eaf1] bg-white hover:border-[#c7befd]")}>
                                            <span className={clsx("absolute bottom-0 left-0 top-0 w-1 bg-[#6d4aff]", sel ? "opacity-100" : "opacity-20")} />
                                            <div className="flex gap-3">
                                                <span className="text-[25px] leading-none">{r.icon}</span>
                                                <div>
                                                    <div className="text-[13px] font-black">{r.title}</div>
                                                    <div className="mt-0.5 text-[11.5px] leading-snug text-[#71809b]">{r.desc}</div>
                                                    <span className="mt-1.5 inline-block rounded-full bg-[#ece6ff] px-1.5 py-0.5 text-[9px] font-black text-[#6c58c8]">{r.tag}</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {routeKey === "other" ? <input value={v9.v9RouteOther} onChange={(e) => patchV9({ v9RouteOther: e.target.value })} placeholder="Describe your FYP route" className={clsx(fieldClass, "mt-2")} /> : null}
                            {routeKey ? <div className="mt-3 rounded-xl border border-[#cceede] bg-[#eaf8f2] px-3.5 py-2.5 text-[11.8px] text-[#276f53]"><b>{FYP_V9_ROUTES[routeKey].icon} Route selected:</b> {FYP_V9_ROUTES[routeKey].title}.</div> : null}
                        </Field>
                        <SummaryBox text={summaries[0]} />
                        <StepNav hideBack onNext={completeSectionOne} nextLabel="Connect project & build roadmap →" saving={saving} />
                    </>
                )}

                {step === 1 && (
                    <>
                        <p className="text-[9.5px] font-black tracking-[0.10em] text-[#6d4aff]">STEP 2 OF 8</p>
                        <h2 className="m-0 text-[17px] font-semibold">Purpose, brief & roadmap 🎯</h2>
                        <Field label="What is the central problem, question, brief or creative intention?" required>
                            <textarea rows={3} value={v9.focus} onChange={(e) => patchV9({ focus: e.target.value })} placeholder="In 2–4 lines, what are you trying to investigate, design, build, create, improve or solve?" className={fieldClass} />
                        </Field>
                        <Field label="Why does this work matter? (tap all that apply)">
                            <ChipGroup options={FYP_V9_WHY} selected={v9.why} onToggle={(v) => patchV9({ why: toggleIn(v9.why, v) })} otherValue={v9.whyOther} onOtherChange={(v) => patchV9({ whyOther: v })} />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Main objective / intended outcome">
                                <input value={v9.objective} onChange={(e) => patchV9({ objective: e.target.value })} placeholder="What should be achieved by the end?" className={fieldClass} />
                            </Field>
                            <Field label="Who is it for? (optional)">
                                <input value={v9.audience} onChange={(e) => patchV9({ audience: e.target.value })} placeholder="Users, audience, client, community…" className={fieldClass} />
                            </Field>
                        </div>
                        <Field label="What will you submit or produce?">
                            <ChipGroup options={routeKey ? FYP_V9_DELIVERABLES[routeKey] : FYP_V9_DELIVERABLES.other} selected={v9.deliverables} onToggle={(v) => patchV9({ deliverables: toggleIn(v9.deliverables, v) })} otherValue={v9.deliverableOther} onOtherChange={(v) => patchV9({ deliverableOther: v })} />
                        </Field>
                        <Field label="Your suggested project roadmap" hint="Edit stage names or descriptions so the roadmap matches what your department actually expects.">
                            <div className="space-y-2">
                                {(v9.roadmap.length
                                    ? v9.roadmap
                                    : (routeKey ? FYP_V9_ROADMAPS[routeKey] : FYP_V9_ROADMAPS.other).map(([stage, goal]) => ({ stage, goal }))
                                ).map((row, i) => {
                                    const road = v9.roadmap.length
                                        ? v9.roadmap
                                        : (routeKey ? FYP_V9_ROADMAPS[routeKey] : FYP_V9_ROADMAPS.other).map(([stage, goal]) => ({ stage, goal }));
                                    return (
                                    <div key={i} className="grid grid-cols-[38px_1fr] items-center gap-2 rounded-[11px] border border-[#e7eaf1] bg-[#fbfcfe] p-2 md:grid-cols-[38px_180px_1fr]">
                                        <div className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[#f1edff] text-[11px] font-black text-[#6d4aff]">{i + 1}</div>
                                        <input value={row.stage} onChange={(e) => patchV9({ roadmap: road.map((r, j) => (j === i ? { ...r, stage: e.target.value } : r)) })} className={fieldClass} />
                                        <input value={row.goal} onChange={(e) => patchV9({ roadmap: road.map((r, j) => (j === i ? { ...r, goal: e.target.value } : r)) })} className={clsx(fieldClass, "col-span-2 md:col-auto")} />
                                    </div>
                                    );
                                })}
                            </div>
                        </Field>
                        <SummaryBox text={summaries[1]} />
                        <StepNav onBack={() => setStep(0)} onNext={() => goNext(2)} nextLabel="Next → pathway questions" saving={saving} />
                    </>
                )}

                {step === 2 && (
                    <>
                        <p className="text-[9.5px] font-black tracking-[0.10em] text-[#6d4aff]">STEP 3 OF 8</p>
                        <h2 className="m-0 text-[17px] font-semibold">Your project pathway 🛠️</h2>
                        <p className="mt-1 text-[12.5px] text-[#71809b]">Only the pathway relevant to your selected FYP appears here.</p>
                        {!pathway ? (
                            <div className="rounded-xl border border-[#f0d9b6] bg-[#fff7e8] p-3 text-[11.8px] text-[#7c561e]">Please go back and select your primary FYP route first.</div>
                        ) : (
                            <div className="mt-3 rounded-[15px] border border-[#ded9ff] bg-[#fcfbff] p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <b className="text-[13.5px]">{pathway.title}</b>
                                    <span className="rounded-full bg-[#f1edff] px-2 py-0.5 text-[10px] font-black text-[#6245cf]">{pathway.tag}</span>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {pathway.fields.map((f) => (
                                        <div key={f.id} className={f.span === 1 ? "" : "sm:col-span-2"}>
                                            <Field label={f.label}>
                                                {f.kind === "textarea" ? (
                                                    <textarea rows={3} value={pathwayStr(f.id)} onChange={(e) => setPathway(f.id, e.target.value)} placeholder={f.placeholder} className={fieldClass} />
                                                ) : f.kind === "select" ? (
                                                    <>
                                                        <select value={pathwayStr(f.id)} onChange={(e) => setPathway(f.id, e.target.value)} className={fieldClass}>
                                                            <option value="">Select…</option>
                                                            {(f.options || []).map((o) => <option key={o}>{o}</option>)}
                                                        </select>
                                                        {f.otherId && pathwayStr(f.id) === "Other" ? <input value={pathwayStr(f.otherId)} onChange={(e) => setPathway(f.otherId!, e.target.value)} className={clsx(fieldClass, "mt-2")} /> : null}
                                                    </>
                                                ) : f.kind === "chips" ? (
                                                    <ChipGroup
                                                        options={f.options || []}
                                                        selected={pathwayList(f.id)}
                                                        onToggle={(v) => setPathway(f.id, toggleIn(pathwayList(f.id), v))}
                                                        otherValue={f.otherId ? pathwayStr(f.otherId) : undefined}
                                                        onOtherChange={f.otherId ? (val) => setPathway(f.otherId!, val) : undefined}
                                                    />
                                                ) : (
                                                    <input value={pathwayStr(f.id)} onChange={(e) => setPathway(f.id, e.target.value)} placeholder={f.placeholder} className={fieldClass} />
                                                )}
                                            </Field>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <SummaryBox text={summaries[2]} />
                        <StepNav onBack={() => setStep(1)} onNext={() => goNext(3)} nextLabel="Next →" saving={saving} />
                    </>
                )}

                {step === 3 && (
                    <>
                        <p className="text-[9.5px] font-black tracking-[0.10em] text-[#6d4aff]">STEP 4 OF 8</p>
                        <h2 className="m-0 text-[17px] font-semibold">Evidence, analysis & testing 🔎</h2>
                        <Field label="How did you evaluate, test or support your work?">
                            <ChipGroup options={routeKey ? FYP_V9_EVIDENCE[routeKey] : FYP_V9_EVIDENCE.other} selected={v9.evidence} onToggle={(v) => patchV9({ evidence: toggleIn(v9.evidence, v) })} otherValue={v9.evidenceOther} onOtherChange={(val) => patchV9({ evidenceOther: val })} />
                        </Field>
                        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border-[1.5px] border-[#e7eaf1] bg-[#fbfcfe] px-3 py-3">
                            <input type="checkbox" checked={v9.hasQuant} onChange={(e) => patchV9({ hasQuant: e.target.checked })} className="mt-0.5 accent-[#6d4aff]" />
                            <div><b className="text-[12.5px]">My project includes quantitative / numerical analysis</b><div className="text-[11px] text-[#71809b]">Surveys, experiments, measurements, financial analysis, model performance or user testing.</div></div>
                        </label>
                        {v9.hasQuant && (
                            <div className="mt-2 rounded-[15px] border border-[#ded9ff] bg-[#fcfbff] p-4">
                                <div className="mb-2 flex items-center gap-2"><b>📊 Quantitative analysis</b><span className="rounded-full bg-[#f1edff] px-2 py-0.5 text-[10px] font-black text-[#6245cf]">ONLY IF APPLICABLE</span></div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <Field label="Population / dataset / test universe"><input value={v9.qPopulation} onChange={(e) => patchV9({ qPopulation: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Sample / observations / test runs"><input value={v9.qSample} onChange={(e) => patchV9({ qSample: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Sampling / selection">
                                        <select value={v9.qSampling} onChange={(e) => patchV9({ qSampling: e.target.value })} className={fieldClass}>
                                            <option value="">Select…</option>
                                            {FYP_V9_Q_SAMPLING.map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                    </Field>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Key variables / measures / KPIs"><input value={v9.qVariables} onChange={(e) => patchV9({ qVariables: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Software / analysis tool"><input value={v9.qSoftware} onChange={(e) => patchV9({ qSoftware: e.target.value })} className={fieldClass} /></Field>
                                </div>
                                <Field label="Analysis used">
                                    <ChipGroup options={FYP_V9_Q_ANALYSIS} selected={v9.qAnalysis} onToggle={(v) => patchV9({ qAnalysis: toggleIn(v9.qAnalysis, v) })} otherValue={v9.qAnalysisOther} onOtherChange={(val) => patchV9({ qAnalysisOther: val })} />
                                </Field>
                                <Field label="Key numerical result(s)">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-[11px]">
                                        <thead><tr className="bg-[#f8f9fc] text-[9.5px] uppercase text-[#71809b]"><th className="border border-[#e7eaf1] p-2 text-left">Measure / test</th><th className="border border-[#e7eaf1] p-2 text-left">Result</th><th className="border border-[#e7eaf1] p-2 text-left">Interpretation</th></tr></thead>
                                        <tbody>
                                            {v9.qRows.map((row, i) => (
                                                <tr key={i}>
                                                    {(["a", "b", "c"] as const).map((k) => (
                                                        <td key={k} className="border border-[#e7eaf1] p-1"><input value={row[k]} onChange={(e) => patchV9({ qRows: v9.qRows.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)) })} className={fieldClass} /></td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                </Field>
                                <button type="button" onClick={() => patchV9({ qRows: [...v9.qRows, { a: "", b: "", c: "" }] })} className="mt-2 text-[11px] font-black text-[#6d4aff]">+ add another numerical result</button>
                            </div>
                        )}
                        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border-[1.5px] border-[#e7eaf1] bg-[#fbfcfe] px-3 py-3">
                            <input type="checkbox" checked={v9.hasQual} onChange={(e) => patchV9({ hasQual: e.target.checked })} className="mt-0.5 accent-[#6d4aff]" />
                            <div><b className="text-[12.5px]">My project includes qualitative / interpretive evidence</b><div className="text-[11px] text-[#71809b]">Interviews, observation, textual/visual analysis, critique or open-ended feedback.</div></div>
                        </label>
                        {v9.hasQual && (
                            <div className="mt-2 rounded-[15px] border border-[#ded9ff] bg-[#fcfbff] p-4">
                                <div className="mb-2 flex items-center gap-2"><b>💬 Qualitative / interpretive evidence</b><span className="rounded-full bg-[#f1edff] px-2 py-0.5 text-[10px] font-black text-[#6245cf]">ONLY IF APPLICABLE</span></div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Data / participants / material"><input value={v9.qualData} onChange={(e) => patchV9({ qualData: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Analysis approach">
                                        <select value={v9.qualAnalysis} onChange={(e) => patchV9({ qualAnalysis: e.target.value })} className={fieldClass}>
                                            <option value="">Select…</option>
                                            {FYP_V9_QUAL_ANALYSIS.map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Participant / case selection">
                                        <select value={v9.qualSampling} onChange={(e) => patchV9({ qualSampling: e.target.value })} className={fieldClass}>
                                            <option value="">Select…</option>
                                            {FYP_V9_QUAL_SAMPLING.map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Software / coding / analysis tool (optional)"><input value={v9.qualSoftware} onChange={(e) => patchV9({ qualSoftware: e.target.value })} className={fieldClass} /></Field>
                                </div>
                                <Field label="Key qualitative themes / insights">
                                <div>
                                {v9.qualRows.map((row, i) => (
                                    <div key={i} className="mb-2 grid gap-2 sm:grid-cols-3">
                                        {(["a", "b", "c"] as const).map((k, ki) => (
                                            <input key={k} value={row[k]} onChange={(e) => patchV9({ qualRows: v9.qualRows.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)) })} placeholder={["Theme / insight", "Evidence / source", "What it means"][ki]} className={fieldClass} />
                                        ))}
                                    </div>
                                ))}
                                </div>
                                </Field>
                                <button type="button" onClick={() => patchV9({ qualRows: [...v9.qualRows, { a: "", b: "", c: "" }] })} className="text-[11px] font-black text-[#6d4aff]">+ add another qualitative theme</button>
                                <Field label="Headline qualitative insight (optional)"><input value={v9.qualInsight} onChange={(e) => patchV9({ qualInsight: e.target.value })} className={fieldClass} /></Field>
                            </div>
                        )}
                        {v9.hasQuant && v9.hasQual ? (
                            <Field label="How did the quantitative and qualitative evidence work together?">
                                <textarea rows={2} value={v9.mixedIntegration} onChange={(e) => patchV9({ mixedIntegration: e.target.value })} className={fieldClass} />
                            </Field>
                        ) : null}
                        <Field label="Overall validation / testing result">
                            <textarea rows={2} value={v9.validationSummary} onChange={(e) => patchV9({ validationSummary: e.target.value })} placeholder="In 1–3 lines, what evidence gave you confidence in the final work?" className={fieldClass} />
                        </Field>
                        <SummaryBox text={summaries[3]} />
                        <StepNav onBack={() => setStep(2)} onNext={() => goNext(4)} nextLabel="Next →" saving={saving} />
                    </>
                )}

                {step === 4 && (
                    <>
                        <p className="text-[9.5px] font-black tracking-[0.10em] text-[#6d4aff]">STEP 5 OF 8</p>
                        <h2 className="m-0 text-[17px] font-semibold">Final outcome, key findings & contribution ✨</h2>
                        <Field label="Describe your final outcome" required>
                            <textarea rows={3} value={v9.outcome} onChange={(e) => patchV9({ outcome: e.target.value })} placeholder="What did you finally discover, build, design, create, recommend, prove, improve or deliver?" className={fieldClass} />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Key finding / headline result 1"><input value={v9.finding1} onChange={(e) => patchV9({ finding1: e.target.value })} className={fieldClass} /></Field>
                            <Field label="Key finding / headline result 2 (optional)"><input value={v9.finding2} onChange={(e) => patchV9({ finding2: e.target.value })} className={fieldClass} /></Field>
                        </div>
                        <Field label="What is the main contribution?">
                            <ChipGroup options={FYP_V9_CONTRIB} selected={v9.contribution} onToggle={(v) => patchV9({ contribution: toggleIn(v9.contribution, v) })} otherValue={v9.contribOther} onOtherChange={(val) => patchV9({ contribOther: val })} />
                        </Field>
                        <Field label="Strongest evidence of quality"><input value={v9.qualityEvidence} onChange={(e) => patchV9({ qualityEvidence: e.target.value })} className={fieldClass} /></Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Main limitation / constraint">
                                <select value={v9.limitation} onChange={(e) => patchV9({ limitation: e.target.value })} className={fieldClass}>
                                    <option value="">Select…</option>
                                    {FYP_V9_LIMITATIONS.map((o) => <option key={o}>{o}</option>)}
                                </select>
                                {v9.limitation === "Other" ? <input value={v9.limitationOther} onChange={(e) => patchV9({ limitationOther: e.target.value })} className={clsx(fieldClass, "mt-2")} /> : null}
                            </Field>
                            <Field label="Future potential / next step"><input value={v9.future} onChange={(e) => patchV9({ future: e.target.value })} className={fieldClass} /></Field>
                        </div>
                        <SummaryBox text={summaries[4]} />
                        <StepNav onBack={() => setStep(3)} onNext={() => goNext(5)} nextLabel="Next →" saving={saving} />
                    </>
                )}

                {step === 5 && (
                    <>
                        <p className="text-[9.5px] font-black tracking-[0.10em] text-[#6d4aff]">STEP 6 OF 8</p>
                        <h2 className="m-0 text-[17px] font-semibold">Sustainability relevance 🌍</h2>
                        <p className="mt-1 text-[12.5px] text-[#71809b]">This is a separate classification — it does not determine the academic quality of your FYP.</p>
                        <Field label="How relevant is sustainability to this project?">
                            <ChipGroup options={FYP_V9_SUSTAIN} selected={v9.sustain ? [v9.sustain] : []} onToggle={(v) => patchV9({ sustain: v })} single />
                        </Field>
                        {sustainRelevant ? (
                            <>
                                <Field label="Briefly explain the sustainability connection"><input value={v9.sustainHow} onChange={(e) => patchV9({ sustainHow: e.target.value })} className={fieldClass} /></Field>
                                <Field label="Relevant SDGs — choose up to 3">
                                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                                        {sdgData.map((s) => {
                                            const picked = (entry.sdgMapping?.entries || []).some((e) => e.goalNumber === s.number);
                                            const locked = !picked && (entry.sdgMapping?.entries || []).length >= 3;
                                            return (
                                                <button key={s.number} type="button" disabled={locked} onClick={() => {
                                                    const cur = entry.sdgMapping?.entries || [];
                                                    const next = picked ? cur.filter((e) => e.goalNumber !== s.number) : cur.length >= 3 ? cur : [...cur, { goalNumber: s.number, targets: [] }];
                                                    setEntry((e) => ({ ...e, sdgMapping: { ...e.sdgMapping, entries: next, noSdgApplies: false } }));
                                                }} className={clsx("rounded-[10px] p-2 text-left text-[10px] font-extrabold text-white", picked ? "opacity-100 ring-2 ring-[#192438]" : locked ? "opacity-20" : "opacity-40")} style={{ background: s.color }}>
                                                    <strong className="block text-base">{s.number}</strong>{s.title}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Field>
                                <Field label="How do the selected SDGs relate to the work?"><input value={v9.sdgHow} onChange={(e) => patchV9({ sdgHow: e.target.value })} className={fieldClass} /></Field>
                            </>
                        ) : null}
                        {v9.sustain === "No defensible sustainability link" ? (
                            <div className="rounded-xl border border-[#f0d9b6] bg-[#fff7e8] p-3 text-[11.8px] text-[#7c561e]"><b>No defensible SDG link is acceptable.</b> Your project can still be academically excellent.</div>
                        ) : null}
                        <SummaryBox text={summaries[5]} />
                        <StepNav onBack={() => setStep(4)} onNext={() => goNext(6)} nextLabel="Next →" saving={saving} />
                    </>
                )}

                {step === 6 && (
                    <>
                        <p className="text-[9.5px] font-black tracking-[0.10em] text-[#6d4aff]">STEP 7 OF 8</p>
                        <h2 className="m-0 text-[17px] font-semibold">Reflection & learning 🪞</h2>
                        <Field label="What is the most important thing you learned from this FYP?"><input value={v9.learned} onChange={(e) => patchV9({ learned: e.target.value })} className={fieldClass} /></Field>
                        <Field label="What was the hardest challenge, and what did you change or learn because of it?"><input value={v9.challenge} onChange={(e) => patchV9({ challenge: e.target.value })} className={fieldClass} /></Field>
                        <Field label="Skills strengthened">
                            <ChipGroup options={FYP_V9_SKILLS} selected={v9.skills} onToggle={(v) => patchV9({ skills: toggleIn(v9.skills, v) })} otherValue={v9.skillOther} onOtherChange={(val) => patchV9({ skillOther: val })} />
                        </Field>
                        {sustainRelevant ? <Field label="Did sustainability change any project decision? (optional)"><input value={v9.sustainReflection} onChange={(e) => patchV9({ sustainReflection: e.target.value })} className={fieldClass} /></Field> : null}
                        <div className="mt-3 rounded-[15px] border border-[#dfe6f7] bg-gradient-to-br from-white to-[#f9fbff] p-4">
                            <h3 className="m-0 text-sm">💡 Turn the FYP into an opportunity (optional)</h3>
                            <p className="mt-1 text-[11.2px] text-[#71809b]">This does not affect your academic merit.</p>
                            <Field label="What would you like this project to lead to?">
                                <ChipGroup options={FYP_V9_OPPORTUNITY} selected={v9.opportunities} onToggle={(v) => patchV9({ opportunities: toggleIn(v9.opportunities, v) })} otherValue={v9.opportunityOther} onOtherChange={(val) => patchV9({ opportunityOther: val })} />
                            </Field>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Commercialisation / external-readiness stage">
                                    <select value={v9.readiness} onChange={(e) => patchV9({ readiness: e.target.value })} className={fieldClass}>
                                        <option value="">Select if relevant…</option>
                                        {FYP_V9_READINESS.map((o) => <option key={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="What could an external user/client value? (optional)"><input value={v9.valueOffer} onChange={(e) => patchV9({ valueOffer: e.target.value })} className={fieldClass} /></Field>
                            </div>
                            <Field label="IP / confidentiality check">
                                <select value={v9.ipStatus} onChange={(e) => patchV9({ ipStatus: e.target.value })} className={fieldClass}>
                                    <option value="">Select if relevant…</option>
                                    {FYP_V9_IP.map((o) => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                        </div>
                        <SummaryBox text={summaries[6]} />
                        <StepNav onBack={() => setStep(5)} onNext={() => goNext(7)} nextLabel="Review & submit →" saving={saving} />
                    </>
                )}

                {step === 7 && (
                    <>
                        <p className="text-[9.5px] font-black tracking-[0.10em] text-[#6d4aff]">STEP 8 OF 8</p>
                        <h2 className="m-0 text-[17px] font-semibold">Evidence, AI review & repository 📦</h2>
                        <div className="mt-3 rounded-2xl border border-[#d9def0] bg-gradient-to-br from-white to-[#f8fbff] p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="m-0 text-sm">📎 Evidence Locker</h3>
                                    <p className="mt-1 text-[10.8px] text-[#71809b]">Optional but recommended — images, reports, decks, datasets, portfolios.</p>
                                </div>
                                <span className="rounded-full bg-[#eaf8f3] px-2 py-1 text-[9px] font-black text-[#0d7f61]">OPTIONAL · RECOMMENDED</span>
                            </div>
                            <label className="mt-3 block cursor-pointer rounded-[13px] border-[1.5px] border-dashed border-[#b8c3df] bg-[#fbfcff] p-4 text-center hover:border-[#6d4aff] hover:bg-[#f1edff]">
                                <span className="text-2xl">＋</span>
                                <b className="mt-1 block text-xs">{uploading ? "Uploading…" : "Add evidence files"}</b>
                                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                            </label>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {groupedFiles.map((g) => (
                                    <a key={g.label} href={g.latest.fileUrl} target="_blank" rel="noreferrer" className="rounded-[13px] border border-[#e7eaf1] bg-white p-2.5 text-[10.8px] font-black">{g.label}</a>
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="External link(s) (optional)"><input value={v9.links} onChange={(e) => patchV9({ links: e.target.value })} placeholder="GitHub, portfolio, demo, film…" className={fieldClass} /></Field>
                            <Field label="Repository visibility">
                                <select value={v9.visibility} onChange={(e) => patchV9({ visibility: e.target.value })} className={fieldClass}>
                                    {FYP_V9_VISIBILITY.map((o) => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                        </div>
                        <h2 className="mt-6 text-[17px] font-semibold">✨ Review your AI section summaries</h2>
                        <p className="text-[12.5px] text-[#71809b]">Accept all seven, then preview the flashcard and submit to your supervisor.</p>
                        <div className="my-2 h-2 overflow-hidden rounded-full bg-[#edf0f5]"><i className="block h-full bg-gradient-to-r from-[#6d4aff] to-[#169b62]" style={{ width: `${(acceptedCount / 7) * 100}%` }} /></div>
                        <p className="text-right text-[10.5px] font-extrabold text-[#71809b]">{acceptedCount} of 7 accepted</p>
                        {review.map((r, i) => (
                            <div key={FYP_V9_REVIEW_LABELS[i]} className={clsx("mb-2 overflow-hidden rounded-xl border-[1.5px]", r.accepted ? "border-[#169b62]" : "border-[#e7eaf1]")}>
                                <div className={clsx("flex items-center gap-2 px-3 py-2", r.accepted ? "bg-[#eaf8f2]" : "bg-[#fbfcfe]")}>
                                    <b className="text-[11px]">{FYP_V9_REVIEW_LABELS[i]}</b>
                                    <span className={clsx("ml-auto rounded-full px-2 py-0.5 text-[9.5px] font-black", r.accepted ? "bg-[#169b62] text-white" : "bg-[#eceef3] text-[#71809b]")}>{r.accepted ? "✓ ACCEPTED" : "REVIEW"}</span>
                                </div>
                                <textarea rows={3} value={r.text.replace(/<[^>]*>/g, " ")} onChange={(e) => setReview((prev) => prev.map((x, j) => (j === i ? { ...x, text: e.target.value, edited: true, accepted: false } : x)))} className="w-full border-0 px-3 py-2 text-[12.3px] leading-relaxed outline-none" />
                                <div className="flex gap-1.5 px-3 pb-2.5">
                                    <button type="button" onClick={() => setReview((prev) => prev.map((x, j) => (j === i ? { ...x, accepted: true } : x)))} className="rounded-lg border border-[#169b62] px-2.5 py-1 text-[10.5px] font-extrabold text-[#169b62]">✓ Accept</button>
                                    <button type="button" onClick={() => setReview((prev) => prev.map((x, j) => (j === i ? { accepted: false, edited: false, text: summaries[i] || "" } : x)))} className="rounded-lg border border-[#e7eaf1] px-2.5 py-1 text-[10.5px] font-extrabold text-[#71809b]">↻ Reset</button>
                                </div>
                            </div>
                        ))}
                        <button type="button" disabled={acceptedCount < 7} onClick={() => setFlashOpen(true)} className="mt-2 w-full rounded-[11px] bg-[#6d4aff] py-3 text-[13px] font-black text-white disabled:opacity-40">All accepted → Preview final FYP flashcard</button>
                        {flashOpen ? (
                            <div className="mt-4">
                                <ThesisCard entry={{ ...entry, sectionSummaries: { project: review[0]?.text, background: review[1]?.text, objectives: review[2]?.text, methodology: review[3]?.text, findings: review[4]?.text, sdg: review[5]?.text, reflection: review[6]?.text } }} defaultOpen />
                                <button type="button" onClick={submitRecord} className="mt-3 w-full rounded-[11px] bg-[#6d4aff] py-3 text-[13px] font-black text-white">{saving ? "Submitting…" : "Submit FYP record + flashcard for verification →"}</button>
                            </div>
                        ) : null}
                        <div className="mt-4 flex justify-start">
                            <button type="button" onClick={() => setStep(6)} className="rounded-[11px] border border-[#e7eaf1] bg-white px-4 py-3 text-[13px] font-black text-[#71809b]">← Back</button>
                        </div>
                    </>
                )}
            </div>
            <p className="mt-3.5 text-center text-[10.5px] leading-relaxed text-[#71809b]">CIEL PK · Final Year Projects · Academic evaluation and official grading remain with the university / authorized faculty.</p>
        </div>
    );
}
