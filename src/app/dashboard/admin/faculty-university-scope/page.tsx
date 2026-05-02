"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { GraduationCap, Loader2, Plus, Trash2, Link2 } from "lucide-react";

type ScopeRow = {
    id: string;
    faculty_user_id?: string;
    faculty_email?: string;
    faculty_name?: string;
    university_organization_id?: string;
    university_organization_name?: string;
    created_at?: string;
};

type AdminUser = {
    id: string;
    name?: string;
    email?: string;
    role?: string;
};

type AdminOrg = {
    id: string;
    name?: string;
    organization_type?: string;
    type?: string;
    orgType?: string;
};

function isUniversityOrg(org: AdminOrg): boolean {
    const t = String(org.organization_type || org.type || org.orgType || "").toLowerCase();
    return t.includes("university");
}

export default function AdminFacultyUniversityScopePage() {
    const [rows, setRows] = useState<ScopeRow[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [orgs, setOrgs] = useState<AdminOrg[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [facultyUserId, setFacultyUserId] = useState("");
    const [universityOrganizationId, setUniversityOrganizationId] = useState("");

    const loadAssignments = useCallback(async () => {
        const res = await authenticatedFetch(`/api/v1/admin/faculty-university-scope`);
        if (!res?.ok) {
            toast.error("Failed to load assignments");
            return;
        }
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : [];
        setRows(list);
    }, []);

    const loadLookups = useCallback(async () => {
        const [uRes, oRes] = await Promise.all([
            authenticatedFetch(`/api/v1/admin/users`),
            authenticatedFetch(`/api/v1/admin/organizations`),
        ]);
        if (uRes?.ok) {
            const j = await uRes.json();
            const raw = j?.data ?? j;
            const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
            setUsers(arr as AdminUser[]);
        }
        if (oRes?.ok) {
            const j = await oRes.json();
            let arr: AdminOrg[] = [];
            if (Array.isArray(j)) arr = j;
            else if (Array.isArray(j?.data)) arr = j.data;
            setOrgs(arr);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            await Promise.all([loadAssignments(), loadLookups()]);
            if (!cancelled) setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [loadAssignments, loadLookups]);

    const facultyOptions = useMemo(
        () => users.filter((u) => String(u.role || "").toLowerCase() === "faculty"),
        [users],
    );

    const universityOrgOptions = useMemo(() => orgs.filter(isUniversityOrg), [orgs]);

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!facultyUserId || !universityOrganizationId) {
            toast.error("Select faculty and university organization");
            return;
        }
        setSubmitting(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/faculty-university-scope`, {
                method: "POST",
                body: JSON.stringify({
                    facultyUserId,
                    universityOrganizationId,
                }),
            });
            const data = await res?.json().catch(() => ({}));
            if (!res?.ok) {
                toast.error(data?.message || data?.error || "Assignment failed");
                return;
            }
            toast.success("University scope assigned");
            setFacultyUserId("");
            setUniversityOrganizationId("");
            await loadAssignments();
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (fid: string) => {
        if (!confirm("Remove university-wide visibility for this faculty?")) return;
        const res = await authenticatedFetch(`/api/v1/admin/faculty-university-scope/${fid}`, {
            method: "DELETE",
        });
        const data = await res?.json().catch(() => ({}));
        if (!res?.ok) {
            toast.error(data?.message || data?.error || "Remove failed");
            return;
        }
        toast.success("Assignment removed");
        await loadAssignments();
    };

    return (
        <div className="relative p-0 lg:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl flex items-center gap-2">
                        <Link2 className="h-7 w-7 text-indigo-600" />
                        Faculty ↔ University scope
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Grant independent faculty visibility into student activity matched to a university organization (admin
                        only). Faculty role stays <code className="rounded bg-slate-100 px-1">faculty</code>; this adds delegated
                        scope only.
                    </p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-blue-600" />
                        New assignment
                    </h2>
                    <form onSubmit={handleAssign} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Faculty user</label>
                            <select
                                required
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                                value={facultyUserId}
                                onChange={(e) => setFacultyUserId(e.target.value)}
                            >
                                <option value="">Select faculty…</option>
                                {facultyOptions.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {(u.name || "—") + " · " + (u.email || u.id)}
                                    </option>
                                ))}
                            </select>
                            {facultyOptions.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">No faculty users in directory — check Users screen.</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">University organization</label>
                            <select
                                required
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                                value={universityOrganizationId}
                                onChange={(e) => setUniversityOrganizationId(e.target.value)}
                            >
                                <option value="">Select organization…</option>
                                {universityOrgOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {(o.name || o.id) +
                                            " · " +
                                            String(o.organization_type || o.type || o.orgType || "university")}
                                    </option>
                                ))}
                            </select>
                            {universityOrgOptions.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">
                                    No orgs typed as university — onboard one with type University or adjust org type in backend.
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {submitting ? "Saving…" : "Assign scope"}
                        </button>
                    </form>
                    <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                        Students are matched when their profile <strong>university</strong> or <strong>institution</strong> text
                        equals the organization name (normalized). Keep naming consistent.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm min-h-[280px]">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-indigo-600" />
                        Active assignments
                    </h2>
                    {loading ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="text-slate-500 text-sm">No assignments yet.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {rows.map((r) => (
                                <li key={r.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">{r.faculty_name || "Faculty"}</p>
                                        <p className="text-sm text-slate-500">{r.faculty_email}</p>
                                        <p className="text-sm text-indigo-700 mt-1">
                                            → {r.university_organization_name || r.university_organization_id}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => r.faculty_user_id && handleRemove(r.faculty_user_id)}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
