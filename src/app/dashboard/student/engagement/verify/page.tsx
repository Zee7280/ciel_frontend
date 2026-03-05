"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { useSearchParams } from "next/navigation";
import IdentityVerification from "../components/IdentityVerification";

export default function VerifyPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [project, setProject] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const projectIdFromUrl = searchParams.get('project') || searchParams.get('projectId');

    useEffect(() => {
        const init = async () => {
            try {
                if (projectIdFromUrl) {
                    const res = await authenticatedFetch(`/api/v1/student/projects/${projectIdFromUrl}`);
                    if (res && res.ok) {
                        const result = await res.json();
                        setProject(result.data || result);
                        return;
                    }
                }

                // Fallback: Fetch the most recent project the student applied to or joined
                const res = await authenticatedFetch(`/api/v1/student/projects`);
                if (res && res.ok) {
                    const result = await res.json();
                    if (result.success && result.data.length > 0) {
                        setProject(result.data[0]);
                    } else {
                        setError("You need to join a project before you can verify your identity.");
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load project details.");
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [projectIdFromUrl]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm mt-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Notice</h2>
                <p className="text-slate-500 font-medium mb-6">{error}</p>
                <Link href="/dashboard/student/browse">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                        Browse Projects
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-700">
            <Link href="/dashboard/student/engagement" className="group flex items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors mb-8 ml-4 max-w-6xl mx-auto">
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-xs font-black uppercase tracking-widest">Back to Overview</span>
            </Link>

            <IdentityVerification
                projectId={project.id}
                onSuccess={() => window.location.href = '/dashboard/student/engagement'}
            />
        </div>
    );
}

function Button({ children, className, onClick, ...props }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
