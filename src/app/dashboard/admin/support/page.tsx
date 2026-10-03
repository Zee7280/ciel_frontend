"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, LifeBuoy, Loader2, Mail, Pencil, Search, Ticket, Trash2, User } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/dashboard/student/report/components/ui/dialog";
import { Input } from "@/app/dashboard/student/report/components/ui/input";
import { Label } from "@/app/dashboard/student/report/components/ui/label";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";
import { toast } from "sonner";
import ConfirmModal from "@/app/dashboard/admin/_shared/ConfirmModal";

type AdminTab = "tickets" | "faqs";

type FaqItem = {
    id: string;
    question: string;
    answer: string;
    category?: string;
    /** undefined when the API does not expose the field. */
    published?: boolean;
    sortOrder?: number;
};

type AdminSupportTicket = {
    id: string | number;
    reference?: string;
    subject: string;
    category?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    description?: string;
    /** Admin reply / internal note (API field `adminReply` or `internalNote`). */
    adminReply?: string;
    /** True when the API payload carries a reply/note field at all (so saving it can work). */
    adminReplySupported?: boolean;
    studentName?: string;
    studentEmail?: string;
    studentId?: string | number;
};

function pickTicketList(payload: unknown): AdminSupportTicket[] {
    if (!payload || typeof payload !== "object") return [];
    const o = payload as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) return data as AdminSupportTicket[];
    if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (Array.isArray(d.tickets)) return d.tickets as AdminSupportTicket[];
        if (Array.isArray(d.items)) return d.items as AdminSupportTicket[];
    }
    if (Array.isArray(o.tickets)) return o.tickets as AdminSupportTicket[];
    return [];
}

function pickTicketOne(payload: unknown): AdminSupportTicket | null {
    if (!payload || typeof payload !== "object") return null;
    const o = payload as Record<string, unknown>;
    const data = o.data;
    if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (d.ticket && typeof d.ticket === "object") return normalizeAdminTicket(d.ticket as Record<string, unknown>);
        if (d.id != null || d.subject != null) return normalizeAdminTicket(d as Record<string, unknown>);
    }
    if (o.id != null || o.subject != null) return normalizeAdminTicket(o as Record<string, unknown>);
    return null;
}

function normalizeAdminTicket(raw: Record<string, unknown>): AdminSupportTicket {
    const student = raw.student && typeof raw.student === "object" ? (raw.student as Record<string, unknown>) : null;
    const user = raw.user && typeof raw.user === "object" ? (raw.user as Record<string, unknown>) : null;
    const fromNested = student || user;
    return {
        id: raw.id as string | number,
        reference: typeof raw.reference === "string" ? raw.reference : undefined,
        subject: String(raw.subject ?? ""),
        category: typeof raw.category === "string" ? raw.category : undefined,
        status: typeof raw.status === "string" ? raw.status : undefined,
        createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
        description: typeof raw.description === "string" ? raw.description : undefined,
        adminReply:
            typeof raw.adminReply === "string"
                ? raw.adminReply
                : typeof raw.internalNote === "string"
                  ? raw.internalNote
                  : undefined,
        adminReplySupported: "adminReply" in raw || "internalNote" in raw,
        studentName:
            typeof raw.studentName === "string"
                ? raw.studentName
                : fromNested
                  ? String(fromNested.name ?? fromNested.fullName ?? fromNested.displayName ?? "")
                  : undefined,
        studentEmail:
            typeof raw.studentEmail === "string"
                ? raw.studentEmail
                : fromNested
                  ? String(fromNested.email ?? "")
                  : undefined,
        studentId: (() => {
            const v = raw.studentId ?? fromNested?.id;
            if (typeof v === "string" || typeof v === "number") return v;
            return undefined;
        })(),
    };
}

function pickFaqList(payload: unknown): FaqItem[] {
    if (!payload || typeof payload !== "object") return [];
    const o = payload as Record<string, unknown>;
    const data = o.data;
    const raw =
        (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).items)
            ? (data as Record<string, unknown>).items
            : null) ||
        (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).faqs)
            ? (data as Record<string, unknown>).faqs
            : null) ||
        (Array.isArray(data) ? data : null) ||
        (Array.isArray(o.items) ? o.items : null) ||
        [];
    if (!Array.isArray(raw)) return [];
    return raw.map((row: unknown, i: number) => {
        const r = row as Record<string, unknown>;
        return {
            id: String(r.id ?? `faq-${i}`),
            category: typeof r.category === "string" ? r.category : undefined,
            question: String(r.question ?? r.title ?? ""),
            answer: String(r.answer ?? r.body ?? r.content ?? ""),
            published:
                typeof r.isPublished === "boolean" ? r.isPublished : typeof r.published === "boolean" ? r.published : undefined,
            sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : undefined,
        };
    });
}

function pickTotal(payload: unknown): number | null {
    if (!payload || typeof payload !== "object") return null;
    const o = payload as Record<string, unknown>;
    const d = o.data && typeof o.data === "object" && !Array.isArray(o.data) ? (o.data as Record<string, unknown>) : null;
    for (const src of [d, o, d?.meta as Record<string, unknown> | undefined, o.meta as Record<string, unknown> | undefined]) {
        if (src && typeof src.total === "number") return src.total;
    }
    return null;
}

const PAGE_SIZE = 20;

const TICKET_STATUSES = ["open", "in_progress", "waiting_on_student", "resolved", "closed"] as const;

export default function AdminSupportPage() {
    const [tab, setTab] = useState<AdminTab>("tickets");

    const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [ticketsError, setTicketsError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    /** Total from the server; null when the API returns the full list unpaginated. */
    const [serverTotal, setServerTotal] = useState<number | null>(null);
    const [replyDraft, setReplyDraft] = useState("");

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [search, setSearch] = useState("");

    const [detailOpen, setDetailOpen] = useState(false);
    const [activeTicket, setActiveTicket] = useState<AdminSupportTicket | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [statusDraft, setStatusDraft] = useState("open");
    const [savingTicket, setSavingTicket] = useState(false);
    const [ticketDeletingId, setTicketDeletingId] = useState<string | number | null>(null);

    const [faqs, setFaqs] = useState<FaqItem[]>([]);
    const [faqsLoading, setFaqsLoading] = useState(false);
    const [faqsError, setFaqsError] = useState<string | null>(null);
    const [faqDialogOpen, setFaqDialogOpen] = useState(false);
    const [faqEditingId, setFaqEditingId] = useState<string | null>(null);
    const [faqCategory, setFaqCategory] = useState("");
    const [faqQuestion, setFaqQuestion] = useState("");
    const [faqAnswer, setFaqAnswer] = useState("");
    const [faqSaving, setFaqSaving] = useState(false);
    const [faqPublished, setFaqPublished] = useState(true);
    const [faqSortOrder, setFaqSortOrder] = useState("0");
    const [faqDeleting, setFaqDeleting] = useState<FaqItem | null>(null);
    const [faqDeleteBusy, setFaqDeleteBusy] = useState(false);
    const [ticketDeleting, setTicketDeleting] = useState<AdminSupportTicket | null>(null);

    const loadTickets = useCallback(async () => {
        setTicketsLoading(true);
        setTicketsError(null);
        try {
            const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
            if (statusFilter !== "all") qs.set("status", statusFilter);
            const res = await authenticatedFetch(`/api/v1/admin/support/tickets?${qs.toString()}`, {}, { redirectToLogin: false });
            if (!res?.ok) {
                setTickets([]);
                setServerTotal(null);
                setTicketsError("Could not load support tickets.");
                return;
            }
            const body = await res.json();
            const list = pickTicketList(body).map((t) => normalizeAdminTicket(t as unknown as Record<string, unknown>));
            setTickets(list);
            setServerTotal(pickTotal(body));
        } catch {
            setTickets([]);
            setServerTotal(null);
            setTicketsError("Failed to load tickets. Check your connection and retry.");
        } finally {
            setTicketsLoading(false);
        }
    }, [page, statusFilter]);

    const loadFaqs = useCallback(async () => {
        setFaqsLoading(true);
        setFaqsError(null);
        try {
            const res = await authenticatedFetch("/api/v1/admin/support/faqs", {}, { redirectToLogin: false });
            if (!res?.ok) {
                setFaqs([]);
                setFaqsError("Could not load FAQs.");
                return;
            }
            const body = await res.json();
            setFaqs(
                pickFaqList(body)
                    .filter((f) => f.question && f.answer)
                    .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0)),
            );
        } catch {
            setFaqs([]);
            setFaqsError("Failed to load FAQs. Check your connection and retry.");
        } finally {
            setFaqsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (tab === "tickets") void loadTickets();
    }, [tab, loadTickets]);

    useEffect(() => {
        if (tab === "faqs") void loadFaqs();
    }, [tab, loadFaqs]);

    const filteredTickets = useMemo(() => {
        const q = search.trim().toLowerCase();
        return tickets.filter((t) => {
            if (statusFilter !== "all" && (t.status || "open").toLowerCase() !== statusFilter.toLowerCase()) return false;
            if (!q) return true;
            const blob = [t.subject, t.reference, t.category, t.status, t.studentName, t.studentEmail, String(t.id)]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return blob.includes(q);
        });
    }, [tickets, search, statusFilter]);

    // When the API is not paginated it returns everything: slice client-side instead.
    const serverPaged = serverTotal !== null;
    const totalCount = serverPaged ? serverTotal : filteredTickets.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const visibleTickets = serverPaged ? filteredTickets : filteredTickets.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE);

    const openTicketDetail = async (row: AdminSupportTicket) => {
        setActiveTicket(row);
        setStatusDraft((row.status || "open").toLowerCase());
        setReplyDraft(row.adminReply || "");
        setDetailOpen(true);
        setDetailLoading(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/support/tickets/${encodeURIComponent(String(row.id))}`,
                {},
                { redirectToLogin: false },
            );
            if (res?.ok) {
                const body = await res.json();
                const one = pickTicketOne(body);
                if (one) {
                    setActiveTicket(one);
                    setStatusDraft((one.status || "open").toLowerCase());
                    setReplyDraft(one.adminReply || "");
                }
            }
        } catch {
            /* keep row snapshot */
        } finally {
            setDetailLoading(false);
        }
    };

    const replyKey = "adminReply";

    const saveTicket = async () => {
        if (!activeTicket) return;
        setSavingTicket(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/support/tickets/${encodeURIComponent(String(activeTicket.id))}`, {
                method: "PATCH",
                // Only send the reply field when the API exposes one (the whitelist pipe would reject/strip it otherwise).
                body: JSON.stringify({
                    status: statusDraft,
                    ...(activeTicket.adminReplySupported ? { [replyKey]: replyDraft.trim() } : {}),
                }),
            });
            if (!res?.ok) {
                toast.error("Failed to update ticket");
                return;
            }
            toast.success("Ticket updated");
            setDetailOpen(false);
            setActiveTicket(null);
            void loadTickets();
        } catch {
            toast.error("Network error");
        } finally {
            setSavingTicket(false);
        }
    };

    const deleteTicket = async (row: AdminSupportTicket) => {
        setTicketDeletingId(row.id);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/support/tickets/${encodeURIComponent(String(row.id))}`, {
                method: "DELETE",
            });
            if (!res?.ok) {
                toast.error("Failed to delete ticket");
                return;
            }
            toast.success("Ticket deleted");
            if (activeTicket && String(activeTicket.id) === String(row.id)) {
                setDetailOpen(false);
                setActiveTicket(null);
            }
            setTicketDeleting(null);
            void loadTickets();
        } catch {
            toast.error("Network error");
        } finally {
            setTicketDeletingId(null);
        }
    };

    const openFaqCreate = () => {
        setFaqEditingId(null);
        setFaqCategory("");
        setFaqQuestion("");
        setFaqAnswer("");
        setFaqPublished(true);
        setFaqSortOrder(String(faqs.reduce((m, f) => Math.max(m, f.sortOrder ?? 0), 0) + 1));
        setFaqDialogOpen(true);
    };

    const openFaqEdit = (f: FaqItem) => {
        setFaqEditingId(f.id);
        setFaqCategory(f.category || "");
        setFaqQuestion(f.question);
        setFaqAnswer(f.answer);
        setFaqPublished(f.published ?? true);
        setFaqSortOrder(String(f.sortOrder ?? 0));
        setFaqDialogOpen(true);
    };

    const saveFaq = async () => {
        const q = faqQuestion.trim();
        const a = faqAnswer.trim();
        if (q.length < 3 || a.length < 5) {
            toast.error("Question and answer are required.");
            return;
        }
        setFaqSaving(true);
        try {
            const payload = {
                question: q,
                answer: a,
                category: faqCategory.trim() || undefined,
                isPublished: faqPublished,
                sortOrder: Number.parseInt(faqSortOrder, 10) || 0,
            };
            const isEdit = faqEditingId != null;
            const url = isEdit ? `/api/v1/admin/support/faqs/${encodeURIComponent(faqEditingId)}` : "/api/v1/admin/support/faqs";
            const res = await authenticatedFetch(url, {
                method: isEdit ? "PATCH" : "POST",
                body: JSON.stringify(payload),
            });
            if (!res?.ok) {
                toast.error("Save failed");
                return;
            }
            toast.success(isEdit ? "FAQ updated" : "FAQ created");
            setFaqDialogOpen(false);
            void loadFaqs();
        } catch {
            toast.error("Network error");
        } finally {
            setFaqSaving(false);
        }
    };

    const deleteFaq = async (f: FaqItem) => {
        setFaqDeleteBusy(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/support/faqs/${encodeURIComponent(f.id)}`, { method: "DELETE" });
            if (!res?.ok) {
                toast.error("Delete failed");
                return;
            }
            toast.success("FAQ deleted");
            setFaqDeleting(null);
            void loadFaqs();
        } catch {
            toast.error("Network error");
        } finally {
            setFaqDeleteBusy(false);
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
        <div className="mx-auto max-w-7xl space-y-6 p-0 pb-20 sm:p-4">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg">
                        <LifeBuoy className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Help &amp; Support (admin)</h1>
                        <p className="mt-1 max-w-3xl text-sm text-slate-500 sm:text-base">
                            Student tickets inbox and published FAQs shown on the student Help page.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button variant={tab === "tickets" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setTab("tickets")}>
                    <Ticket className="mr-1.5 h-4 w-4" />
                    Tickets
                </Button>
                <Button variant={tab === "faqs" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setTab("faqs")}>
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    FAQs
                </Button>
            </div>

            {tab === "tickets" && (
                <>
                    {ticketsError ? (
                        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                            <span>{ticketsError}</span>
                            <Button type="button" size="sm" variant="outline" onClick={() => void loadTickets()}>
                                Retry
                            </Button>
                        </div>
                    ) : null}

                    <Card className="p-4 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div className="relative max-w-md flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search subject, reference, student…"
                                    className="pl-9"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Label className="sr-only" htmlFor="status-filter">
                                    Status
                                </Label>
                                <select
                                    id="status-filter"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
                                >
                                    <option value="all">All statuses</option>
                                    {TICKET_STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {s.replace(/_/g, " ")}
                                        </option>
                                    ))}
                                </select>
                                <Button type="button" variant="outline" size="sm" onClick={() => void loadTickets()} disabled={ticketsLoading}>
                                    Refresh
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {ticketsLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-24">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <p className="text-sm font-medium text-slate-500">Loading tickets…</p>
                        </div>
                    ) : ticketsError ? null : visibleTickets.length === 0 ? (
                        <Card className="py-16 text-center shadow-sm">
                            <Ticket className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                            <h3 className="mt-4 text-lg font-bold text-slate-900">No tickets</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                {tickets.length > 0 ? "Nothing matches your filters." : "No tickets yet."}
                            </p>
                        </Card>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                            <div className="hidden grid-cols-[1.2fr_1fr_0.7fr_0.9fr_auto] gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
                                <span>Ticket</span>
                                <span>Student</span>
                                <span>Status</span>
                                <span>Updated</span>
                                <span className="sr-only md:not-sr-only md:w-10 md:text-center">Actions</span>
                            </div>
                            <ul role="list">
                                {visibleTickets.map((t) => (
                                    <li key={String(t.id)} className="border-b border-slate-100 last:border-0">
                                        <div className="grid gap-3 px-4 py-4 transition hover:bg-slate-50/90 md:grid-cols-[1.2fr_1fr_0.7fr_0.9fr_auto] md:items-center md:gap-4">
                                            <button
                                                type="button"
                                                onClick={() => void openTicketDetail(t)}
                                                className="contents cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 md:rounded-md"
                                            >
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                        {t.reference || `#${t.id}`}
                                                    </p>
                                                    <p className="mt-0.5 font-semibold text-slate-900">{t.subject}</p>
                                                    {t.category ? (
                                                        <p className="mt-1 text-xs text-slate-500">Category: {t.category}</p>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-col gap-0.5 text-sm text-slate-600">
                                                    {t.studentName ? (
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                                            {t.studentName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                    {t.studentEmail ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs break-all">
                                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                            {t.studentEmail}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div>
                                                    <Badge variant="secondary" className="capitalize">
                                                        {(t.status || "open").replace(/_/g, " ")}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs tabular-nums text-slate-500">{formatWhen(t.updatedAt || t.createdAt)}</div>
                                            </button>
                                            <div className="flex justify-end md:justify-center">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="default"
                                                    title="Delete ticket"
                                                    disabled={ticketDeletingId !== null && String(ticketDeletingId) === String(t.id)}
                                                    className="shrink-0"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setTicketDeleting(t);
                                                    }}
                                                >
                                                    {ticketDeletingId != null && String(ticketDeletingId) === String(t.id) ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                                <span>
                                    Page {page} of {totalPages} · {totalCount} ticket{totalCount === 1 ? "" : "s"}
                                </span>
                                <div className="flex gap-2">
                                    <Button type="button" size="sm" variant="outline" disabled={page <= 1 || ticketsLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" disabled={page >= totalPages || ticketsLoading} onClick={() => setPage((p) => p + 1)}>
                                        Next <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {tab === "faqs" && (
                <>
                    {faqsError ? (
                        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                            <span>{faqsError}</span>
                            <Button type="button" size="sm" variant="outline" onClick={() => void loadFaqs()}>
                                Retry
                            </Button>
                        </div>
                    ) : null}

                    <div className="flex justify-end">
                        <Button type="button" size="sm" onClick={openFaqCreate}>
                            Add FAQ
                        </Button>
                    </div>

                    {faqsLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-24">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <p className="text-sm font-medium text-slate-500">Loading FAQs…</p>
                        </div>
                    ) : faqsError ? null : faqs.length === 0 ? (
                        <Card className="py-16 text-center shadow-sm">
                            <BookOpen className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                            <h3 className="mt-4 text-lg font-bold text-slate-900">No FAQs</h3>
                            <p className="mt-2 text-sm text-slate-500">Create your first FAQ for the student Help page.</p>
                            <Button type="button" className="mt-6" variant="secondary" onClick={openFaqCreate}>
                                Add FAQ
                            </Button>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {faqs.map((f) => (
                                <Card key={f.id} className="p-4 shadow-sm">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {f.category ? (
                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{f.category}</p>
                                                ) : null}
                                                {f.published !== undefined ? (
                                                    <Badge variant="secondary">{f.published ? "Published" : "Draft"}</Badge>
                                                ) : null}
                                                {f.sortOrder !== undefined ? (
                                                    <span className="text-xs text-slate-400">Order {f.sortOrder}</span>
                                                ) : null}
                                            </div>
                                            <h3 className="mt-1 font-semibold text-slate-900">{f.question}</h3>
                                            <p className="mt-2 line-clamp-3 text-sm text-slate-600">{f.answer}</p>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            <Button type="button" variant="outline" size="default" onClick={() => openFaqEdit(f)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button type="button" variant="outline" size="default" onClick={() => setFaqDeleting(f)}>
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Ticket</DialogTitle>
                        <DialogDescription>
                            {activeTicket?.reference || (activeTicket ? `#${activeTicket.id}` : "")}
                        </DialogDescription>
                    </DialogHeader>
                    {detailLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : activeTicket ? (
                        <div className="space-y-4 text-sm">
                            <div>
                                <p className="text-xs font-semibold text-slate-500">Subject</p>
                                <p className="font-medium text-slate-900">{activeTicket.subject}</p>
                            </div>
                            {activeTicket.description ? (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Description</p>
                                    <p className="whitespace-pre-wrap text-slate-700">{activeTicket.description}</p>
                                </div>
                            ) : null}
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="adm-ticket-status">Status</Label>
                                    <select
                                        id="adm-ticket-status"
                                        value={statusDraft}
                                        onChange={(e) => setStatusDraft(e.target.value)}
                                        className="mt-1.5 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
                                    >
                                        {TICKET_STATUSES.map((s) => (
                                            <option key={s} value={s}>
                                                {s.replace(/_/g, " ")}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Student</p>
                                    <p className="text-slate-800">{activeTicket.studentName || "—"}</p>
                                    <p className="text-xs text-slate-500">{activeTicket.studentEmail || ""}</p>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="adm-ticket-reply">Admin reply / internal note</Label>
                                <Textarea
                                    id="adm-ticket-reply"
                                    value={replyDraft}
                                    onChange={(e) => setReplyDraft(e.target.value)}
                                    rows={4}
                                    disabled={!activeTicket.adminReplySupported}
                                    placeholder={activeTicket.adminReplySupported ? "Write a reply or note…" : "Not supported by the ticket API yet."}
                                    className="mt-1.5"
                                />
                                {!activeTicket.adminReplySupported ? (
                                    <p className="mt-1 text-xs text-slate-500">Only the status is saved until the API exposes a reply field.</p>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
                            Close
                        </Button>
                        <Button type="button" onClick={() => void saveTicket()} disabled={savingTicket || !activeTicket}>
                            {savingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{faqEditingId ? "Edit FAQ" : "New FAQ"}</DialogTitle>
                        <DialogDescription>Published FAQs appear on the student Help page.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="faq-cat">Category (optional)</Label>
                            <Input
                                id="faq-cat"
                                value={faqCategory}
                                onChange={(e) => setFaqCategory(e.target.value)}
                                className="mt-1.5"
                                placeholder="e.g. Opportunities"
                            />
                        </div>
                        <div>
                            <Label htmlFor="faq-q">Question</Label>
                            <Input id="faq-q" value={faqQuestion} onChange={(e) => setFaqQuestion(e.target.value)} className="mt-1.5" />
                        </div>
                        <div>
                            <Label htmlFor="faq-a">Answer</Label>
                            <Textarea id="faq-a" value={faqAnswer} onChange={(e) => setFaqAnswer(e.target.value)} rows={5} className="mt-1.5" />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="faq-sort">Sort order</Label>
                                <Input id="faq-sort" type="number" value={faqSortOrder} onChange={(e) => setFaqSortOrder(e.target.value)} className="mt-1.5" />
                            </div>
                            <label className="flex items-center gap-2 pt-0 text-sm font-medium text-slate-700 sm:pt-7">
                                <input type="checkbox" checked={faqPublished} onChange={(e) => setFaqPublished(e.target.checked)} className="h-4 w-4" />
                                Published
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setFaqDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={() => void saveFaq()} disabled={faqSaving}>
                            {faqSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmModal
                open={ticketDeleting !== null}
                title="Delete ticket"
                tone="danger"
                confirmLabel="Delete"
                busy={ticketDeletingId !== null}
                onConfirm={() => (ticketDeleting ? deleteTicket(ticketDeleting) : undefined)}
                onCancel={() => setTicketDeleting(null)}
            >
                Delete ticket {ticketDeleting?.reference || (ticketDeleting ? `#${ticketDeleting.id}` : "")}? This cannot be undone.
            </ConfirmModal>
            <ConfirmModal
                open={faqDeleting !== null}
                title="Delete FAQ"
                tone="danger"
                confirmLabel="Delete"
                busy={faqDeleteBusy}
                onConfirm={() => (faqDeleting ? deleteFaq(faqDeleting) : undefined)}
                onCancel={() => setFaqDeleting(null)}
            >
                Delete &ldquo;{faqDeleting?.question}&rdquo;?
            </ConfirmModal>
        </div>
    );
}
