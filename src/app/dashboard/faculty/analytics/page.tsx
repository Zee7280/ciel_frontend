"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/student/report/components/ui/card";
import { Users, Clock, Target, Award } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

export default function FacultyAnalyticsPage() {
    const sdgData = [
        { name: 'SDG 1', value: 12 },
        { name: 'SDG 4', value: 25 },
        { name: 'SDG 13', value: 18 },
        { name: 'SDG 3', value: 15 },
        { name: 'Others', value: 10 },
    ];

    const monthlyData = [
        { name: 'Sep', hours: 120 },
        { name: 'Oct', hours: 250 },
        { name: 'Nov', hours: 180 },
        { name: 'Dec', hours: 320 },
        { name: 'Jan', hours: 290 },
    ];

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#64748b'];

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 pb-20">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Department Impact Analytics</h1>
                <p className="text-slate-500">Track student engagement and SDG contribution.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: "Total Students", value: "142", icon: Users, color: "bg-blue-50 text-blue-600" },
                    { title: "Hours Contributed", value: "1,280", icon: Clock, color: "bg-purple-50 text-purple-600" },
                    { title: "Projects Completed", value: "85", icon: CheckCircle, color: "bg-green-50 text-green-600", iconC: CheckCircle }, // Fixed icon usage below
                    { title: "Avg Impact Score", value: "8.4/10", icon: Award, color: "bg-amber-50 text-amber-600" },
                ].map((stat, i) => (
                    <Card key={i}>
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>SDG Distribution</CardTitle>
                        <CardDescription>Which Global Goals are students targeting?</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sdgData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sdgData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Volunteer Hours (Monthly)</CardTitle>
                        <CardDescription>Total time contributed by department students.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function CheckCircle(props: any) {
    return <Target {...props} />
}
