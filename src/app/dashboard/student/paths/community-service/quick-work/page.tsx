"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import QuickWorkDashboard from "./QuickWorkDashboard";
import QuickWorkLogForm from "./QuickWorkLogForm";

/** Quick Community Work: `?log=new|<id>` opens the four-step log; otherwise Quick Impact Log. */
function QuickWorkRoute() {
    const log = useSearchParams().get("log");
    return log ? <QuickWorkLogForm logId={log} /> : <QuickWorkDashboard />;
}

export default function QuickWorkPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-[#57706e]" />
                </div>
            }
        >
            <QuickWorkRoute />
        </Suspense>
    );
}
