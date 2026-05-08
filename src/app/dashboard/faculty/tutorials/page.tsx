import PlatformTutorialsPanel from "@/components/platform/PlatformTutorialsPanel";
import { GraduationCap } from "lucide-react";

export default function FacultyTutorialsPage() {
    return (
        <div className="p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-2 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-700 to-slate-900 text-white shadow-lg shadow-slate-900/15">
                        <GraduationCap className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Platform tutorial</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
                            Video guides published by CIEL administrators. Same content as shown to students and partners.
                        </p>
                    </div>
                </div>
            </div>
            <div className="mx-auto max-w-6xl">
                <PlatformTutorialsPanel visible />
            </div>
        </div>
    );
}
