"use client";

import Navbar from "@/components/Navbar";
import PartnersFooter from "@/components/PartnersFooter";
import FooterBanner from "@/components/FooterBanner";
import { MapPin, Users, Calendar, Target, ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Mock data - in production, fetch from API
const MOCK_PROJECTS = {
    "1": {
        id: 1,
        title: "Clean Water Initiative",
        org: "Water for Life",
        location: "Tharparkar, Sindh",
        status: "Active",
        volunteers: 45,
        hoursServed: 1200,
        startDate: "Jan 15, 2026",
        endDate: "Jun 30, 2026",
        description: "Installing solar-powered water pumps in remote villages to provide clean drinking water to over 5,000 residents.",
        category: "Infrastructure",
        sdgs: ["Clean Water and Sanitation", "Good Health and Well-being"],
        objectives: [
            "Install 10 solar-powered water pumps",
            "Train local technicians for maintenance",
            "Conduct water quality testing",
            "Educate communities on water conservation"
        ],
        impact: {
            beneficiaries: "5,000+ people",
            villages: "8 villages",
            pumps: "10 solar pumps"
        }
    },
    "2": {
        id: 2,
        title: "Tech Skills for Youth",
        org: "Digital Future",
        location: "Lahore, Punjab",
        status: "Recruiting",
        volunteers: 120,
        hoursServed: 3600,
        startDate: "Feb 1, 2026",
        endDate: "Apr 30, 2026",
        description: "A 3-month coding boot camp for underprivileged youth to cover basic web development skills including HTML, CSS, JavaScript, and React.",
        category: "Education",
        sdgs: ["Quality Education", "Decent Work and Economic Growth"],
        objectives: [
            "Train 200 students in web development",
            "Provide laptops and internet access",
            "Connect graduates with internship opportunities",
            "Build portfolio projects"
        ],
        impact: {
            students: "200 students",
            graduates: "150+ expected",
            placements: "80% placement target"
        }
    },
    "3": {
        id: 3,
        title: "Urban Forest Drive",
        org: "Green Pakistan",
        location: "Islamabad",
        status: "Completed",
        volunteers: 300,
        hoursServed: 2400,
        startDate: "Oct 1, 2025",
        endDate: "Dec 31, 2025",
        description: "Planting 10,000 trees in the capital city to combat urban heat islands and improve air quality.",
        category: "Environment",
        sdgs: ["Climate Action", "Life on Land"],
        objectives: [
            "Plant 10,000 native trees",
            "Create 5 urban green spaces",
            "Engage 500+ volunteers",
            "Monitor tree survival rates"
        ],
        impact: {
            trees: "10,000 trees planted",
            survival: "92% survival rate",
            co2: "500 tons CO2 absorbed/year"
        }
    }
};

export default function ProjectDetailsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const project = MOCK_PROJECTS[projectId as keyof typeof MOCK_PROJECTS];

    if (!project) {
        return (
            <main className="min-h-screen bg-slate-50 font-sans">
                <Navbar />
                <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">Project Not Found</h1>
                    <Link href="/projects" className="text-blue-600 hover:underline font-semibold">
                        ← Back to Projects
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 font-sans">
            <Navbar />

            {/* Header */}
            <section className="pt-32 pb-12 px-6 max-w-7xl mx-auto">
                <Link href="/projects" className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 font-semibold mb-6 transition-colors animate-fade-in-up">
                    <ArrowLeft className="w-4 h-4" /> Back to Projects
                </Link>

                <div className="flex flex-col lg:flex-row gap-8 items-start justify-between mb-8">
                    <div className="flex-1 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.status === 'Active' ? 'bg-green-100 text-green-700' :
                                    project.status === 'Recruiting' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-600'
                                }`}>
                                {project.status}
                            </span>
                            <span className="text-sm font-bold text-slate-400">{project.category}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">{project.title}</h1>
                        <p className="text-xl font-semibold text-blue-600 mb-4">{project.org}</p>
                        <p className="text-lg text-slate-600 leading-relaxed">{project.description}</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-w-[280px] animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <h3 className="font-bold text-slate-900 mb-4">Quick Stats</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-slate-400" />
                                <span className="text-sm text-slate-600">{project.location}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-slate-400" />
                                <span className="text-sm text-slate-600">{project.volunteers} Volunteers</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-slate-400" />
                                <span className="text-sm text-slate-600">{project.hoursServed.toLocaleString()} Hours</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-slate-400" />
                                <span className="text-sm text-slate-600">{project.startDate} - {project.endDate}</span>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
                            Join Project
                        </button>
                    </div>
                </div>
            </section>

            {/* Content Sections */}
            <section className="pb-20 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Objectives */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Target className="w-6 h-6 text-blue-600" /> Project Objectives
                            </h2>
                            <ul className="space-y-3">
                                {project.objectives.map((obj, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span className="text-slate-700">{obj}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Impact Metrics */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Expected Impact</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {Object.entries(project.impact).map(([key, value], index) => (
                                    <div key={index} className="text-center p-4 bg-slate-50 rounded-xl">
                                        <div className="text-3xl font-bold text-blue-600 mb-2">{value}</div>
                                        <div className="text-sm text-slate-500 capitalize">{key}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* SDGs */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                            <h3 className="font-bold text-slate-900 mb-4">Related SDGs</h3>
                            <div className="space-y-2">
                                {project.sdgs.map((sdg, index) => (
                                    <div key={index} className="px-3 py-2 bg-blue-50 rounded-lg text-sm font-medium text-blue-700">
                                        {sdg}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                            <h3 className="font-bold text-lg mb-2">Want to contribute?</h3>
                            <p className="text-blue-100 text-sm mb-4">Join our team and make a real difference in your community.</p>
                            <button className="w-full py-3 rounded-xl bg-white text-blue-600 font-bold hover:bg-blue-50 transition-all">
                                Get Involved
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <PartnersFooter />
            <FooterBanner />
        </main>
    );
}
