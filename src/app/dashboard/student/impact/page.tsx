"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../report/components/ui/card";
import { Badge } from "../report/components/ui/badge";
import { authenticatedFetch } from "@/utils/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

export default function ImpactHistoryPage() {
    const [stats, setStats] = useState<ImpactStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                // Safety timeout
                const timeoutDetails = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Request timed out")), 10000);
                });

                const userStr = localStorage.getItem('user');
                if (!userStr) {
                    console.log("No user found in storage");
                    if (isMounted) setIsLoading(false);
                    return;
                }

                const user = JSON.parse(userStr);
                const fetchPromise = authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/impact/history`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student_id: user.id })
                });

                // Race fetch against timeout
                const res = await Promise.race([fetchPromise, timeoutDetails]) as Response | null;

                if (isMounted && res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setStats(data.data);
                    }
                }
            } catch (error) {
                console.error("Error fetching impact history", error);
                // Don't annoy user with toast on load if it's just empty
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchData();

        return () => { isMounted = false; };
    }, []);

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;
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
                    {(!stats?.activities || stats.activities.length === 0) ? (
                        <p className="text-slate-500 text-sm py-4">No verified activities yet.</p>
                    ) : (
                        <div className="relative ml-4 space-y-0 before:absolute before:inset-0 before:ml-2 before:h-full before:w-0.5 before:-translate-x-px before:bg-slate-200 before:content-['']">
                            {stats.activities.map((activity, i) => (
                                <div key={activity.id || i} className="relative pb-8 pl-8 last:pb-0">
                                    <span className={`absolute left-0 top-1 h-4 w-4 rounded-full ring-4 ring-white ${i === 0 ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 leading-none">{activity.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1">Verified by {activity.organization}</p>
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {new Date(activity.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">+{activity.hours} Hours</Badge>
                                            {activity.sdg && <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">{activity.sdg}</Badge>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
