import Link from "next/link";
import PlatformTutorialsPanel from "@/components/platform/PlatformTutorialsPanel";
import { PlayCircle } from "lucide-react";

export default function StudentTutorialsPage() {
    return (
        <div className="p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-slate-900 text-white shadow-lg shadow-slate-900/15">
                        <PlayCircle className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Platform tutorial</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
                            Learn how to use the platform — applications, attendance, reports, and more. You can also open
                            FAQs and tickets from{" "}
                            <Link href="/dashboard/student/help" className="font-semibold text-blue-600 hover:underline">
                                Help &amp; Support
                            </Link>
                            .
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
