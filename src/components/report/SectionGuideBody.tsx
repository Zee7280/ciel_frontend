"use client";

import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    FileText,
    GraduationCap,
    Info,
    Lightbulb,
    Search,
    Target,
    Trophy,
    XCircle,
} from "lucide-react";
import type { GuideBlock, GuideScoreTip, SectionGuideContent } from "./sectionGuideContent";

const SCORE_TIP_ICONS = [Target, CheckCircle2, BookOpen, Search, FileText] as const;

function ScoreTips({ title, tips }: { title: string; tips: GuideScoreTip[] }) {
    return (
        <section className="rounded-2xl border border-violet-100 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Trophy className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">{title}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {tips.map((tip, i) => {
                    const Icon = SCORE_TIP_ICONS[i % SCORE_TIP_ICONS.length];
                    return (
                        <div
                            key={tip.label}
                            className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-3 text-center"
                        >
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-sm">
                                {i + 1}
                            </span>
                            <Icon className="h-5 w-5 text-violet-600" aria-hidden />
                            <p className="text-[11px] font-semibold leading-snug text-slate-700 sm:text-xs">
                                {tip.label}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function GuideBlockView({ block }: { block: GuideBlock }) {
    if (block.type === "intro") {
        return (
            <div className="flex gap-3 rounded-2xl border border-violet-100 bg-violet-50/80 px-4 py-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
                    <Info className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm leading-relaxed text-slate-700">{block.text}</p>
            </div>
        );
    }

    if (block.type === "footer") {
        return (
            <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
                    <Info className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm font-medium leading-relaxed text-sky-950">{block.text}</p>
            </div>
        );
    }

    if (block.type === "callout") {
        const styles =
            block.variant === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-950"
                : block.variant === "warning"
                  ? "border-amber-100 bg-amber-50 text-amber-950"
                  : "border-sky-100 bg-sky-50 text-sky-950";
        return (
            <div className={`rounded-2xl border px-4 py-3.5 ${styles}`}>
                {block.title ? <p className="mb-1 text-xs font-bold uppercase tracking-wide opacity-80">{block.title}</p> : null}
                <p className="text-sm leading-relaxed">{block.text}</p>
            </div>
        );
    }

    if (block.type === "scoreTips") {
        return <ScoreTips title={block.title} tips={block.tips} />;
    }

    if (block.type === "examples") {
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Strong
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700">{block.strong}</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rose-800">
                        <XCircle className="h-3.5 w-3.5" /> Weak
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700">{block.weak}</p>
                    {block.weakWhy ? (
                        <p className="mt-2 text-xs font-medium text-rose-700">{block.weakWhy}</p>
                    ) : null}
                </div>
            </div>
        );
    }

    if (block.type === "avoidList") {
        return (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rose-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> {block.title ?? "Avoid"}
                </p>
                <ul className="space-y-1.5">
                    {block.items.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-slate-700">
                            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    if (block.type === "steps") {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-bold text-slate-900 sm:text-base">{block.title}</h3>
                <ol className="space-y-2.5">
                    {block.steps.map((step, i) => (
                        <li key={step} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                {i + 1}
                            </span>
                            <span>{step}</span>
                        </li>
                    ))}
                </ol>
            </section>
        );
    }

    // section
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    {block.code?.includes("2.3") || block.title.toLowerCase().includes("academic") ? (
                        <GraduationCap className="h-5 w-5" aria-hidden />
                    ) : block.title.toLowerCase().includes("evidence") ? (
                        <FileText className="h-5 w-5" aria-hidden />
                    ) : (
                        <Lightbulb className="h-5 w-5" aria-hidden />
                    )}
                </span>
                <div className="min-w-0">
                    {block.code ? (
                        <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">{block.code}</p>
                    ) : null}
                    <h3 className="text-sm font-bold text-slate-900 sm:text-base">{block.title}</h3>
                </div>
            </div>
            <ul className="space-y-2">
                {block.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
                        <span>{b}</span>
                    </li>
                ))}
            </ul>
            {block.avoid?.length ? (
                <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-rose-700">Avoid</p>
                    <ul className="space-y-1">
                        {block.avoid.map((a) => (
                            <li key={a} className="flex gap-2 text-xs text-rose-900 sm:text-sm">
                                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                {a}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {block.note ? (
                <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-sm text-sky-950">
                    <span className="font-bold text-sky-800">Note: </span>
                    {block.note}
                </div>
            ) : null}
            {block.tip ? (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                    <span className="font-bold text-amber-800">Tip: </span>
                    {block.tip}
                </div>
            ) : null}
        </section>
    );
}

export function SectionGuideBody({ content }: { content: SectionGuideContent }) {
    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-1 pb-1 sm:px-2">
            {content.blocks.map((block, i) => (
                <GuideBlockView key={`${block.type}-${i}`} block={block} />
            ))}
        </div>
    );
}
