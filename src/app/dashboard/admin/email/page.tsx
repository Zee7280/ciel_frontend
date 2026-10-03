"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, Send, Loader2, Bold, Italic, Underline, List, ListOrdered, Link2, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { resolvePreferredApiV1Base } from "@/utils/backendApiV1Base";
import { getStoredCurrentUserEmail } from "@/utils/currentUser";
import ConfirmModal from "../_shared/ConfirmModal";
import { escapeHtml } from "../_shared/csv";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Input } from "@/app/dashboard/student/report/components/ui/input";
import { Label } from "@/app/dashboard/student/report/components/ui/label";

type RecipientUser = {
    id: number | string;
    name: string;
    email: string;
    role?: string;
};

function stripHtmlToText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .trim();
}

const MAX_RECIPIENTS = 200;
const CONFIRM_THRESHOLD = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_TAGS = new Set(["P", "BR", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "A", "DIV", "SPAN", "H1", "H2", "H3", "BLOCKQUOTE"]);

/** Allowlist sanitiser for the preview (no scripts, handlers, or unsafe URLs). */
function sanitizeHtml(html: string): string {
    if (typeof window === "undefined" || typeof DOMParser === "undefined") return escapeHtml(stripHtmlToText(html));
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    const walk = (node: Element) => {
        for (const child of Array.from(node.children)) {
            if (!ALLOWED_TAGS.has(child.tagName)) {
                if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH"].includes(child.tagName.toUpperCase())) {
                    child.remove();
                    continue;
                }
                walk(child);
                child.replaceWith(...Array.from(child.childNodes));
                continue;
            }
            for (const attr of Array.from(child.attributes)) {
                const keep = child.tagName === "A" && attr.name === "href" && /^(https?:|mailto:)/i.test(attr.value.trim());
                if (!keep) child.removeAttribute(attr.name);
            }
            if (child.tagName === "A") {
                child.setAttribute("target", "_blank");
                child.setAttribute("rel", "noopener noreferrer");
            }
            walk(child);
        }
    };
    walk(doc.body);
    return doc.body.innerHTML;
}

type SendSummary = { sent: number; failed: number; skipped: number };

export default function AdminEmailPage() {
    const [subject, setSubject] = useState("");
    const [recipients, setRecipients] = useState<string[]>([]);
    const [toInput, setToInput] = useState("");
    const [messageHtml, setMessageHtml] = useState<string>("<p></p>");
    const [sending, setSending] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [summary, setSummary] = useState<SendSummary | null>(null);
    const [userQuery, setUserQuery] = useState("");
    const [users, setUsers] = useState<RecipientUser[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const editorRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const q = userQuery.trim();
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoadingUsers(true);
            try {
                const params = new URLSearchParams({ search: q, limit: "20" });
                const res = await authenticatedFetch(
                    `/api/v1/admin/users?${params.toString()}`,
                    { signal: controller.signal },
                    { redirectToLogin: false },
                );
                if (controller.signal.aborted) return;
                if (!res?.ok) {
                    setUsers([]);
                    return;
                }
                const data = await res.json();
                const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
                const mapped = list
                    .map((u) => ({
                        id: u.id,
                        name: (u.name || u.orgName || "Unknown user") as string,
                        email: u.email as string,
                        role: u.role as string | undefined,
                    }))
                    .filter((u) => typeof u.email === "string" && u.email.includes("@"))
                    .slice(0, 20);
                if (!controller.signal.aborted) setUsers(mapped);
            } catch {
                // aborted or network error: keep previous list
            } finally {
                if (!controller.signal.aborted) setLoadingUsers(false);
            }
        }, 300);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [userQuery]);

    const filteredUsers = users;
    const previewHtml = useMemo(() => sanitizeHtml(messageHtml), [messageHtml]);

    const addRecipient = (emailRaw: string) => {
        const email = emailRaw.trim();
        if (!email) return;
        if (!EMAIL_RE.test(email)) {
            toast.error("Enter a valid email address.");
            return;
        }
        if (recipients.length >= MAX_RECIPIENTS && !recipients.some((x) => x.toLowerCase() === email.toLowerCase())) {
            toast.error(`Maximum ${MAX_RECIPIENTS} recipients per send.`);
            return;
        }
        setRecipients((prev) => {
            const next = new Set(prev.map((x) => x.toLowerCase()));
            if (next.has(email.toLowerCase())) return prev;
            return [...prev, email];
        });
        setToInput("");
    };

    const removeRecipient = (email: string) => {
        setRecipients((prev) => prev.filter((x) => x.toLowerCase() !== email.toLowerCase()));
    };

    const exec = (command: string, value?: string) => {
        try {
            editorRef.current?.focus();
            document.execCommand(command, false, value);
            setMessageHtml(editorRef.current?.innerHTML || "<p></p>");
        } catch {
            // ignore
        }
    };

    const onEditorInput = () => {
        setMessageHtml(editorRef.current?.innerHTML || "<p></p>");
    };

    const validate = (to: string[]): { subjectClean: string; msgText: string } | null => {
        const subjectClean = subject.trim();
        const msgText = stripHtmlToText(messageHtml);
        if (to.length === 0) {
            toast.error("Add at least one recipient.");
            return null;
        }
        if (to.length > MAX_RECIPIENTS) {
            toast.error(`Too many recipients (${to.length}). Maximum is ${MAX_RECIPIENTS} per send.`);
            return null;
        }
        if (subjectClean.length < 2) {
            toast.error("Subject is required.");
            return null;
        }
        if (msgText.length < 2) {
            toast.error("Message is required.");
            return null;
        }
        return { subjectClean, msgText };
    };

    const onSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate(recipients)) return;
        if (recipients.length > CONFIRM_THRESHOLD) {
            setConfirmOpen(true);
            return;
        }
        void doSend(recipients, false);
    };

    const onSendTest = () => {
        const me = getStoredCurrentUserEmail();
        if (!me) {
            toast.error("Could not determine your email address. Please sign in again.");
            return;
        }
        if (!validate([me])) return;
        void doSend([me], true);
    };

    const doSend = async (to: string[], isTest: boolean) => {
        const checked = validate(to);
        if (!checked) return;
        const { subjectClean, msgText } = checked;
        const apiBase = resolvePreferredApiV1Base();
        const url = apiBase ? `${apiBase}/admin/email/send` : "/api/v1/admin/email/send";

        setSending(true);
        try {
            const fd = new FormData();
            for (const r of to) fd.append("to", r);
            fd.append("subject", subjectClean);
            fd.append("messageHtml", messageHtml);
            fd.append("messageText", msgText);
            if (imageFile) fd.append("image", imageFile);

            const res = await authenticatedFetch(
                url,
                {
                    method: "POST",
                    body: fd,
                },
                { redirectToLogin: true, timeoutMs: 60_000 },
            );
            if (!res?.ok) {
                const text = await res?.text?.().catch(() => "");
                toast.error(text?.slice(0, 240) || "Email send failed.");
                return;
            }
            const body = await res.json().catch(() => null);
            const src = (body && typeof body === "object" ? ((body as any).data ?? body) : {}) as Record<string, unknown>;
            const num = (v: unknown) => (Array.isArray(v) ? v.length : Number.isFinite(Number(v)) ? Number(v) : 0);
            const result: SendSummary = {
                sent: src.sent !== undefined ? num(src.sent) : to.length,
                failed: num(src.failed),
                skipped: num(src.skipped),
            };
            setSummary(result);
            if (result.failed > 0) toast.warning(`Sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}.`);
            else toast.success(isTest ? "Test email sent to you." : `Email sent (${result.sent}).`);
            if (isTest) return;
            setSubject("");
            setRecipients([]);
            setToInput("");
            setMessageHtml("<p></p>");
            if (editorRef.current) editorRef.current.innerHTML = "<p></p>";
            setImageFile(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Network error while sending.";
            toast.error(msg.slice(0, 240));
        } finally {
            setSending(false);
            setConfirmOpen(false);
        }
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-50/50 p-4 sm:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/25">
                            <Mail className="h-8 w-8" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Send Email</h1>
                            <p className="mt-2 max-w-3xl text-slate-600 sm:text-lg">
                                Compose and send professional emails to users. Messages are automatically formatted with the official CIEL PK template.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid min-w-0 gap-8 lg:grid-cols-[1fr_400px] xl:gap-12">
                    <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                                <Mail className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Compose Message</h2>
                        </div>
                        <form onSubmit={onSend} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="email-to" className="text-sm font-semibold text-slate-900">Recipients</Label>
                                <div className="mt-2 space-y-3">
                                    <div className="flex gap-2">
                                        <Input
                                            id="email-to"
                                            value={toInput}
                                            onChange={(e) => setToInput(e.target.value)}
                                            placeholder="Enter email address..."
                                            className="flex-1 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                            autoComplete="email"
                                        />
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => addRecipient(toInput)}
                                            className="shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    {recipients.length > 0 && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Selected Recipients ({recipients.length}/{MAX_RECIPIENTS})
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {recipients.map((r) => (
                                                    <span
                                                        key={r.toLowerCase()}
                                                        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 break-all"
                                                    >
                                                        {r}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeRecipient(r)} 
                                                            className="text-indigo-500 hover:text-indigo-700 transition-colors"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                        <span className="text-sm font-semibold text-slate-700">
                                            Pick from Users Directory
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium">
                                        {loadingUsers ? "Searching…" : `${users.length} shown (type to search)`}
                                    </span>
                                </div>
                                <Input
                                    id="user-search"
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    placeholder="Search by name or email address..."
                                    className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <div className="mt-3 max-h-72 space-y-1.5 overflow-auto pr-1">
                                    {filteredUsers.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-sm text-slate-500">No users match your search.</p>
                                        </div>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <button
                                                key={String(u.id)}
                                                type="button"
                                                onClick={() => addRecipient(u.email)}
                                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white px-3 py-3 text-left text-sm transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate font-semibold text-slate-900">
                                                        {u.name}
                                                    </span>
                                                    <span className="block truncate text-xs text-slate-500 mt-0.5">
                                                        {u.email}
                                                    </span>
                                                </span>
                                                {u.role ? (
                                                    <span className="shrink-0 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                                        {String(u.role).replace(/_/g, " ")}
                                                    </span>
                                                ) : null}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="email-subject" className="text-sm font-semibold text-slate-900">Subject Line</Label>
                            <Input
                                id="email-subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Important Platform Update - Action Required"
                                className="mt-2 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 text-base"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-semibold text-slate-900">Message Content</Label>
                            <p className="mt-1 text-sm text-slate-600">Compose your email content using the rich text editor below.</p>
                            <div className="mt-3 rounded-xl border border-slate-300 bg-white shadow-sm">
                                <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-gray-50 p-3">
                                    <button 
                                        type="button" 
                                        onClick={() => exec("bold")} 
                                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 transition-colors hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700" 
                                        title="Bold"
                                    >
                                        <Bold className="h-4 w-4" />
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => exec("italic")} 
                                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 transition-colors hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700" 
                                        title="Italic"
                                    >
                                        <Italic className="h-4 w-4" />
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => exec("underline")} 
                                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 transition-colors hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700" 
                                        title="Underline"
                                    >
                                        <Underline className="h-4 w-4" />
                                    </button>
                                    <div className="w-px bg-slate-300 mx-1"></div>
                                    <button 
                                        type="button" 
                                        onClick={() => exec("insertUnorderedList")} 
                                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 transition-colors hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700" 
                                        title="Bullet list"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => exec("insertOrderedList")} 
                                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 transition-colors hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700" 
                                        title="Numbered list"
                                    >
                                        <ListOrdered className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const href = window.prompt("Enter link URL (https://...)", "https://");
                                            if (href) exec("createLink", href);
                                        }}
                                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 transition-colors hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                                        title="Insert link"
                                    >
                                        <Link2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div
                                    ref={editorRef}
                                    contentEditable={true}
                                    onInput={onEditorInput}
                                    onBlur={onEditorInput}
                                    className="min-h-[240px] px-4 py-4 text-base text-slate-800 outline-none leading-relaxed focus:ring-0"
                                    spellCheck={true}
                                    suppressContentEditableWarning={true}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="email-image" className="text-sm font-semibold text-slate-900">Image Attachment</Label>
                            <p className="mt-1 text-sm text-slate-600">Optionally attach an image to your email (JPG, PNG, GIF - max 3 MB)</p>
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <Input
                                        id="email-image"
                                        type="file"
                                        accept="image/*"
                                        className="cursor-pointer border-slate-300 bg-white"
                                        onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                                    />
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                        <ImageIcon className="h-4 w-4" />
                                        Max 3 MB
                                    </div>
                                </div>
                                {imageFile && (
                                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-medium text-green-800">
                                                Attached: {imageFile.name}
                                            </span>
                                            <span className="text-xs text-green-600">
                                                ({(imageFile.size / 1024 / 1024).toFixed(1)} MB)
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                            <Button 
                                type="submit" 
                                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-3 text-base shadow-lg shadow-indigo-600/25 transition-all duration-200" 
                                disabled={sending}
                            >
                                {sending ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Sending Email...
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2">
                                        <Send className="h-5 w-5" />
                                        Send Email to Recipients
                                    </span>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="mt-3 w-full"
                                disabled={sending}
                                onClick={onSendTest}
                            >
                                Send test to me
                            </Button>
                            {summary ? (
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm" role="status">
                                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800"><b>{summary.sent}</b><br />sent</div>
                                    <div className="rounded-lg bg-red-50 p-2 text-red-800"><b>{summary.failed}</b><br />failed</div>
                                    <div className="rounded-lg bg-slate-100 p-2 text-slate-700"><b>{summary.skipped}</b><br />skipped</div>
                                </div>
                            ) : null}
                            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs text-amber-800">
                                    <span className="font-semibold">Note:</span> Emails are sent from{" "}
                                    <span className="font-mono bg-amber-100 px-1 py-0.5 rounded">admin@cielpk.com</span>{" "}
                                    using the official CIEL PK template. Ensure SMTP is properly configured.
                                </p>
                            </div>
                        </div>
                    </form>
                </section>

                    <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-8 lg:sticky lg:top-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                <Mail className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Email Preview</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-700">Subject Line</p>
                                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                        {subject.trim().length} chars
                                    </span>
                                </div>
                                <p className="text-base font-semibold text-slate-900 leading-relaxed">
                                    {subject.trim() || <span className="text-slate-400">No subject entered</span>}
                                </p>
                            </div>
                            
                            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-700">Message Content</p>
                                    {recipients.length > 0 && (
                                        <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full font-medium">
                                            {recipients.length} recipient{recipients.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <div
                                    className="prose prose-slate prose-sm max-w-none overflow-x-auto break-words rounded-lg border border-slate-100 bg-white p-4 text-slate-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{ 
                                        __html: messageHtml && messageHtml !== "<p></p>" 
                                            ? previewHtml 
                                            : "<p class='text-slate-400 italic'>Start typing your message above...</p>" 
                                    }}
                                />
                            </div>
                            
                            {imageFile && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                    <div className="flex items-center gap-2 text-blue-700">
                                        <ImageIcon className="h-4 w-4" />
                                        <span className="text-sm font-medium">Image Attachment</span>
                                    </div>
                                    <p className="mt-1 text-sm text-blue-600">{imageFile.name}</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
            <ConfirmModal
                open={confirmOpen}
                title={`Send to ${recipients.length} recipients?`}
                confirmLabel={`Send to ${recipients.length}`}
                busy={sending}
                onConfirm={() => doSend(recipients, false)}
                onCancel={() => setConfirmOpen(false)}
            >
                <p className="text-sm text-slate-600">
                    This email will be sent to {recipients.length} recipients with subject &quot;{subject.trim()}&quot;. This cannot be undone.
                </p>
            </ConfirmModal>
        </div>
    );
}

