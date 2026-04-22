"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ChevronDown,
    LifeBuoy,
    Loader2,
    Mail,
    MessageSquarePlus,
    Search,
    Ticket,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

type HelpTab = "faqs" | "my_tickets" | "submit" | "track";

type FaqItem = { id: string; question: string; answer: string; category?: string };

type SupportTicket = {
    id: string | number;
    reference?: string;
    subject: string;
    category?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    description?: string;
};



function pickTicketList(payload: unknown): SupportTicket[] {
    if (!payload || typeof payload !== "object") return [];
    const o = payload as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) return data as SupportTicket[];
    if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (Array.isArray(d.tickets)) return d.tickets as SupportTicket[];
        if (Array.isArray(d.items)) return d.items as SupportTicket[];
    }
    if (Array.isArray(o.tickets)) return o.tickets as SupportTicket[];
    return [];
}

function pickTicketOne(payload: unknown): SupportTicket | null {
    if (!payload || typeof payload !== "object") return null;
    const o = payload as Record<string, unknown>;
    const data = o.data;
    if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (d.ticket && typeof d.ticket === "object") return d.ticket as SupportTicket;
        if (d.id != null || d.subject != null) return d as SupportTicket;
    }
    if (o.id != null || o.subject != null) return o as SupportTicket;
    return null;
}

export default function StudentHelpPage() {
    const [tab, setTab] = useState<HelpTab>("faqs");
    const [faqs, setFaqs] = useState<FaqItem[]>([]);

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [category, setCategory] = useState("account");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");

    const [trackQuery, setTrackQuery] = useState("");
    const [trackLoading, setTrackLoading] = useState(false);
    const [tracked, setTracked] = useState<SupportTicket | null>(null);

    const loadFaqs = useCallback(async () => {
        try {
            const res = await authenticatedFetch("/api/v1/student/support/faqs", {}, { redirectToLogin: false });
            if (!res?.ok) return;
            const body = (await res.json()) as { success?: boolean; data?: unknown };
            if (!body.success) return;
            const raw = (body.data as { items?: unknown; faqs?: unknown })?.items ?? (body.data as { faqs?: unknown })?.faqs ?? body.data;
            if (!Array.isArray(raw) || raw.length === 0) return;
            const mapped: FaqItem[] = raw.map((row: unknown, i: number) => {
                const r = row as Record<string, unknown>;
                return {
                    id: String(r.id ?? `faq-${i}`),
                    category: typeof r.category === "string" ? r.category : undefined,
                    question: String(r.question ?? r.title ?? ""),
                    answer: String(r.answer ?? r.body ?? r.content ?? ""),
                };
            });
            const valid = mapped.filter((x) => x.question && x.answer);
            if (valid.length) setFaqs(valid);
        } catch {
            /* keep defaults */
        }
    }, []);

    const loadTickets = useCallback(async () => {
        setTicketsLoading(true);
        try {
            const res = await authenticatedFetch("/api/v1/student/support/tickets", {}, { redirectToLogin: false });
            if (!res?.ok) {
                setTickets([]);
                return;
            }
            const body = await res.json();
            setTickets(pickTicketList(body));
        } catch {
            setTickets([]);
        } finally {
            setTicketsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadFaqs();
    }, [loadFaqs]);

    useEffect(() => {
        if (tab === "my_tickets") void loadTickets();
    }, [tab, loadTickets]);

    const tabs = useMemo(
        () =>
            [
                { id: "faqs" as const, label: "FAQs" },
                { id: "my_tickets" as const, label: "My tickets" },
                { id: "submit" as const, label: "Submit ticket" },
                { id: "track" as const, label: "Track ticket" },
            ] satisfies { id: HelpTab; label: string }[],
        [],
    );

    const submitTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        const s = subject.trim();
        const d = description.trim();
        if (s.length < 3) {
            toast.error("Please enter a short subject.");
            return;
        }
        if (d.length < 10) {
            toast.error("Please describe your issue in a few sentences (at least 10 characters).");
            return;
        }
        setSubmitting(true);
        try {
            const res = await authenticatedFetch(
                "/api/v1/student/support/tickets",
                { method: "POST", body: JSON.stringify({ category, subject: s, description: d }) },
                { redirectToLogin: true },
            );
            if (!res) return;
            if (res.status === 404 || res.status === 501) {
                toast.message("Ticketing API not available yet", {
                    description: "Email support@cielpk.com with the same details, or use the public contact page.",
                });
                return;
            }
            if (!res.ok) {
                toast.error("Could not submit ticket. Try again or email support.");
                return;
            }
            const body = (await res.json()) as { success?: boolean; data?: unknown; message?: string };
            if (body.success === false) {
                toast.error(body.message || "Request failed");
                return;
            }
            toast.success("Ticket submitted");
            setSubject("");
            setDescription("");
            const created = pickTicketOne(body);
            if (created?.reference) {
                toast.message(`Reference: ${created.reference}`, { description: "Save this to track your ticket." });
            }
            void loadTickets();
        } catch {
            toast.error("Network error while submitting.");
        } finally {
            setSubmitting(false);
        }
    };

    const trackTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        const q = trackQuery.trim();
        if (!q) {
            toast.error("Enter a ticket ID or reference.");
            return;
        }
        setTrackLoading(true);
        setTracked(null);
        try {
            const encoded = encodeURIComponent(q);
            const res = await authenticatedFetch(
                `/api/v1/student/support/tickets/${encoded}`,
                {},
                { redirectToLogin: false },
            );
            if (res?.ok) {
                const body = await res.json();
                const one = pickTicketOne(body);
                if (one) {
                    setTracked(one);
                    return;
                }
            }
            const res2 = await authenticatedFetch(
                `/api/v1/student/support/tickets/track?reference=${encoded}`,
                {},
                { redirectToLogin: false },
            );
            if (res2?.ok) {
                const body2 = await res2.json();
                const one2 = pickTicketOne(body2);
                if (one2) {
                    setTracked(one2);
                    return;
                }
            }
            toast.message("Ticket not found", {
                description: "Check the ID or reference, or open My tickets after the API is connected.",
            });
        } catch {
            toast.error("Could not look up ticket.");
        } finally {
            setTrackLoading(false);
        }
    };

    const formatWhen = (iso?: string) => {
        if (!iso) return "—";
        try {
            return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
        } catch {
            return "—";
        }
    };

    return (
        <div className="p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-6 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-700 to-slate-900 text-white shadow-lg shadow-slate-900/20">
                        <LifeBuoy className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Help &amp; Support</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
                            FAQs, submit a ticket, and track requests. For general enquiries you can also use the{" "}
                            <Link href="/contact" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                                contact page
                            </Link>
                            .
                        </p>
                    </div>
                </div>
                <a
                    href="mailto:support@cielpk.com"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                    <Mail className="h-4 w-4 text-slate-500" />
                    support@cielpk.com
                </a>
            </div>

            <div
                className="mb-8 inline-flex w-full max-w-4xl flex-wrap rounded-full bg-slate-100/90 p-1 ring-1 ring-slate-200/70"
                role="tablist"
                aria-label="Help sections"
            >
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                            tab === t.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80" : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="mx-auto max-w-4xl">
                {tab === "faqs" && (
                    <div className="space-y-3">
                        {faqs.map((item) => (
                            <details
                                key={item.id}
                                className="group rounded-xl border border-slate-200/80 bg-white shadow-sm open:shadow-md"
                            >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left font-semibold text-slate-900 sm:px-5 [&::-webkit-details-marker]:hidden">
                                    <span className="min-w-0">
                                        {item.category ? (
                                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
                                                {item.category}
                                            </span>
                                        ) : null}
                                        <span className="text-[15px] leading-snug sm:text-base">{item.question}</span>
                                    </span>
                                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                                </summary>
                                <div className="border-t border-slate-100 px-4 pb-4 pt-2 text-sm leading-relaxed text-slate-600 sm:px-5 sm:pb-5">
                                    {item.answer}
                                </div>
                            </details>
                        ))}
                    </div>
                )}

                {tab === "my_tickets" && (
                    <div>
                        {ticketsLoading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                                <p className="text-sm font-medium text-slate-500">Loading your tickets…</p>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                                    <Ticket className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">No tickets yet</h3>
                                <p className="mt-2 text-sm text-slate-500">
                                    When the support API is live, your requests will appear here. You can still email{" "}
                                    <span className="font-medium text-slate-700">support@cielpk.com</span>.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setTab("submit")}
                                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                >
                                    <MessageSquarePlus className="h-4 w-4" />
                                    Submit a ticket
                                </button>
                            </div>
                        ) : (
                            <ul className="space-y-3" role="list">
                                {tickets.map((tk) => (
                                    <li key={String(tk.id)}>
                                        <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                        {tk.reference || `Ticket #${tk.id}`}
                                                    </p>
                                                    <h3 className="mt-1 text-base font-semibold text-slate-900">{tk.subject}</h3>
                                                    {tk.category ? (
                                                        <p className="mt-1 text-xs text-slate-500">Category: {tk.category}</p>
                                                    ) : null}
                                                </div>
                                                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 ring-1 ring-slate-200/80">
                                                    {tk.status || "open"}
                                                </span>
                                            </div>
                                            <p className="mt-3 text-xs tabular-nums text-slate-400">
                                                Updated {formatWhen(tk.updatedAt || tk.createdAt)}
                                            </p>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {tab === "submit" && (
                    <form
                        onSubmit={(e) => void submitTicket(e)}
                        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8"
                    >
                        <h2 className="text-lg font-bold text-slate-900">Submit a ticket</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Describe your issue clearly. Our team or your institution&apos;s admin may respond depending on category.
                        </p>
                        <div className="mt-6 space-y-5">
                            <div>
                                <label htmlFor="ticket-category" className="block text-sm font-semibold text-slate-700">
                                    Category
                                </label>
                                <select
                                    id="ticket-category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="account">Account &amp; login</option>
                                    <option value="opportunity">Opportunities &amp; applications</option>
                                    <option value="project">Projects &amp; attendance</option>
                                    <option value="report">Impact report</option>
                                    <option value="messages">Messages &amp; notifications</option>
                                    <option value="billing">Billing / payments</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="ticket-subject" className="block text-sm font-semibold text-slate-700">
                                    Subject
                                </label>
                                <input
                                    id="ticket-subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    maxLength={200}
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Short summary"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label htmlFor="ticket-body" className="block text-sm font-semibold text-slate-700">
                                    Description
                                </label>
                                <textarea
                                    id="ticket-body"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={6}
                                    className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="What happened? What did you expect? Include links or IDs if relevant."
                                />
                            </div>
                        </div>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                                Submit
                            </button>
                        </div>
                    </form>
                )}

                {tab === "track" && (
                    <div className="space-y-6">
                        <form
                            onSubmit={(e) => void trackTicket(e)}
                            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8"
                        >
                            <h2 className="text-lg font-bold text-slate-900">Track a ticket</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Enter the ticket number or reference you received after submitting (once the API is connected).
                            </p>
                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1">
                                    <label htmlFor="track-input" className="block text-sm font-semibold text-slate-700">
                                        Ticket ID or reference
                                    </label>
                                    <input
                                        id="track-input"
                                        value={trackQuery}
                                        onChange={(e) => setTrackQuery(e.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="e.g. 4821 or CIEL-2026-AB12"
                                        autoComplete="off"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={trackLoading}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 sm:mb-0.5"
                                >
                                    {trackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    Look up
                                </button>
                            </div>
                        </form>

                        {tracked ? (
                            <article className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm sm:p-6">
                                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800/80">Ticket</p>
                                <h3 className="mt-1 text-lg font-bold text-slate-900">{tracked.subject}</h3>
                                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="font-medium text-slate-500">Reference</dt>
                                        <dd className="text-slate-900">{tracked.reference || String(tracked.id)}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-slate-500">Status</dt>
                                        <dd className="capitalize text-slate-900">{tracked.status || "open"}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-slate-500">Updated</dt>
                                        <dd className="tabular-nums text-slate-900">{formatWhen(tracked.updatedAt || tracked.createdAt)}</dd>
                                    </div>
                                    {tracked.description ? (
                                        <div className="sm:col-span-2">
                                            <dt className="font-medium text-slate-500">Description</dt>
                                            <dd className="mt-1 whitespace-pre-wrap text-slate-700">{tracked.description}</dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </article>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
