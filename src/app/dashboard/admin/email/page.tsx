"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, Send, Loader2, Bold, Italic, Underline, List, ListOrdered, Link2, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { resolvePreferredApiV1Base } from "@/utils/backendApiV1Base";
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

export default function AdminEmailPage() {
    const [subject, setSubject] = useState("");
    const [recipients, setRecipients] = useState<string[]>([]);
    const [toInput, setToInput] = useState("");
    const [messageHtml, setMessageHtml] = useState<string>("<p></p>");
    const [sending, setSending] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userQuery, setUserQuery] = useState("");
    const [users, setUsers] = useState<RecipientUser[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const editorRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoadingUsers(true);
            try {
                const res = await authenticatedFetch("/api/v1/admin/users", {}, { redirectToLogin: true });
                if (!res?.ok) return;
                const data = await res.json();
                const list: any[] =
                    Array.isArray(data) ? data : data?.success && Array.isArray(data.data) ? data.data : [];
                const mapped = list
                    .map((u) => ({
                        id: u.id,
                        name: (u.name || u.orgName || "Unknown user") as string,
                        email: u.email as string,
                        role: u.role as string | undefined,
                    }))
                    .filter((u) => typeof u.email === "string" && u.email.includes("@"));
                setUsers(mapped);
            } catch {
                // ignore
            } finally {
                setLoadingUsers(false);
            }
        };
        void load();
    }, []);

    const filteredUsers = useMemo(() => {
        const q = userQuery.trim().toLowerCase();
        if (!q) return users.slice(0, 50);
        return users
            .filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
            .slice(0, 50);
    }, [users, userQuery]);

    const addRecipient = (emailRaw: string) => {
        const email = emailRaw.trim();
        if (!email) return;
        if (!email.includes("@")) {
            toast.error("Enter a valid email address.");
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

    const onSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const subjectClean = subject.trim();
        const msgText = stripHtmlToText(messageHtml);
        if (recipients.length === 0) {
            toast.error("Add at least one recipient.");
            return;
        }
        if (subjectClean.length < 2) {
            toast.error("Subject is required.");
            return;
        }
        if (msgText.length < 2) {
            toast.error("Message is required.");
            return;
        }

        const apiBase = resolvePreferredApiV1Base();
        const url = apiBase ? `${apiBase}/admin/email/send` : "/api/v1/admin/email/send";

        setSending(true);
        try {
            const fd = new FormData();
            for (const r of recipients) fd.append("to", r);
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
            toast.success("Email sent.");
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
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8">
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

                <div className="grid gap-8 lg:grid-cols-[1fr_400px] xl:gap-12">
                    <section className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-900/5">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                                <Mail className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Compose Message</h2>
                        </div>
                        <form onSubmit={(e) => void onSend(e)} className="space-y-6">
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
                                                Selected Recipients ({recipients.length})
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {recipients.map((r) => (
                                                    <span
                                                        key={r.toLowerCase()}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700"
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
                                        {loadingUsers ? "Loading…" : `${users.length} users available`}
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
                                <div className="flex items-center gap-3">
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

                    <section className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-900/5 lg:sticky lg:top-8">
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
                                    className="prose prose-slate prose-sm max-w-none rounded-lg border border-slate-100 bg-white p-4 text-slate-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{ 
                                        __html: messageHtml && messageHtml !== "<p></p>" 
                                            ? messageHtml 
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
        </div>
    );
}

