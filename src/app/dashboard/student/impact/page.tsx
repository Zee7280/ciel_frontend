"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../report/components/ui/card";
import { Badge } from "../report/components/ui/badge";
import { authenticatedFetch } from "@/utils/api";
import { Loader2 } from "lucide-react";

interface Activity {
    id: string;
    title: string;
    organization: string;
    date: string;
    hours: number;
    sdg: string;
    status: string;
}

interface ImpactStats {
    total_hours: number;
    hours_this_month: number;
    projects_completed: number;
    impact_score: number;
    impact_percentile: string;
    activities: Activity[];
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string" && v.trim() !== "") {
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
    }
    return 0;
}

function pickStr(obj: Record<string, unknown>, keys: string[], fallback = ""): string {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === "string" && v.trim() !== "") return v;
    }
    return fallback;
}

function normalizeActivity(row: Record<string, unknown>, index: number): Activity {
    return {
        id: pickStr(row, ["id", "recordId", "record_id"]) || String(index),
        title: pickStr(row, ["title", "name", "projectTitle", "project_title", "recordType", "record_type"]) || "Activity",
        organization: pickStr(row, [
            "organization",
            "orgName",
            "organization_name",
            "partnerName",
            "partner_name",
            "verifiedBy",
            "verified_by",
        ]),
        date: pickStr(row, [
            "date",
            "occurredAt",
            "occurred_at",
            "completedAt",
            "completed_at",
            "createdAt",
            "created_at",
        ]) || new Date().toISOString(),
        hours: pickNum(row, ["hours", "verifiedHours", "verified_hours", "totalHours", "total_hours"]),
        sdg: pickStr(row, ["sdg", "sdgGoal", "sdg_goal", "sdgCode", "sdg_code"]),
        status: pickStr(row, ["status", "recordStatus", "record_state", "record_status"], "verified"),
    };
}

function normalizeImpactPayload(payload: unknown): ImpactStats | null {
    if (!payload || typeof payload !== "object") return null;
    const root = payload as Record<string, unknown>;
    let raw: unknown = root.data;
    if (raw == null || typeof raw !== "object") {
        const r = root as Record<string, unknown>;
        const hasList = Array.isArray(r.activities ?? r.records ?? r.items ?? r.entries);
        const hasTotals = ["total_hours", "totalHours", "impact_score", "impactScore", "projects_completed", "projectsCompleted"].some(
            (k) => r[k] != null && r[k] !== "",
        );
        if (hasList || hasTotals) raw = root;
        else return null;
    }
    const o = raw as Record<string, unknown>;

    const activitiesRaw = o.activities ?? o.records ?? o.items ?? o.entries;
    const activities: Activity[] = Array.isArray(activitiesRaw)
        ? activitiesRaw.map((item, i) =>
              item && typeof item === "object" ? normalizeActivity(item as Record<string, unknown>, i) : normalizeActivity({}, i),
          )
        : [];

    return {
        total_hours: pickNum(o, ["total_hours", "totalHours"]),
        hours_this_month: pickNum(o, ["hours_this_month", "hoursThisMonth"]),
        projects_completed: pickNum(o, ["projects_completed", "projectsCompleted"]),
        impact_score: pickNum(o, ["impact_score", "impactScore", "ciiScore", "cii_score"]),
        impact_percentile: pickStr(o, ["impact_percentile", "impactPercentile", "percentileLabel", "percentile_label"], "Keep contributing!"),
        activities,
    };
}

export default function ImpactHistoryPage() {
    const [stats, setStats] = useState<ImpactStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                const timeoutDetails = new Promise<Response | null>((_, reject) => {
                    setTimeout(() => reject(new Error("Request timed out")), 10000);
                });

                const path = `/api/v1/students/impact/history`;

                const tryGet = authenticatedFetch(path, { method: "GET" });
                let res = (await Promise.race([tryGet, timeoutDetails])) as Response | null;

                if (res?.status === 405) {
                    const userStr = localStorage.getItem("user");
                    if (userStr) {
                        try {
                            const user = JSON.parse(userStr) as { id?: string };
                            res = await authenticatedFetch(path, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ student_id: user.id }),
                            });
                        } catch {
                            /* ignore */
                        }
                    }
                }

                if (isMounted && res && res.ok) {
                    const json = await res.json().catch(() => null);
                    const normalized = normalizeImpactPayload(json);
                    if (normalized) setStats(normalized);
                }
            } catch (error) {
                console.error("Error fetching impact history", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Impact History</h1>
                <p className="text-slate-500">Track your verified contributions and volunteering hours.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats?.total_hours || 0}</div>
                        <p className="text-xs text-green-600 mt-1">+{stats?.hours_this_month || 0} this month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Projects Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats?.projects_completed || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">Since Joining</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Impact Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-500">{stats?.impact_score?.toLocaleString() || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">{stats?.impact_percentile || "Keep contributing!"}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                    {!stats?.activities || stats.activities.length === 0 ? (
                        <p className="text-slate-500 text-sm py-4">No verified activities yet.</p>
                    ) : (
                        <div className="relative ml-4 space-y-0 before:absolute before:inset-0 before:ml-2 before:h-full before:w-0.5 before:-translate-x-px before:bg-slate-200 before:content-['']">
                            {stats.activities.map((activity, i) => (
                                <div key={activity.id || i} className="relative pb-8 pl-8 last:pb-0">
                                    <span
                                        className={`absolute left-0 top-1 h-4 w-4 rounded-full ring-4 ring-white ${i === 0 ? "bg-blue-600" : "bg-slate-300"}`}
                                    ></span>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 leading-none">{activity.title}</h4>
                                                {activity.organization ? (
                                                    <p className="text-xs text-slate-500 mt-1">Verified by {activity.organization}</p>
                                                ) : null}
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {new Date(activity.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">
                                                +{activity.hours} Hours
                                            </Badge>
                                            {activity.sdg ? (
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                                                    {activity.sdg}
                                                </Badge>
                                            ) : null}
                                            {activity.status ? (
                                                <Badge variant="outline" className="capitalize text-slate-600 border-slate-200">
                                                    {activity.status}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
