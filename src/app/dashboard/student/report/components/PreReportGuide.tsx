"use client";
import React from "react";
import { ChevronRight, Download } from "lucide-react";
import { Button } from "./ui/button";
import StudentCommunityGuide from "@/components/report/StudentCommunityGuide";

export default function PreReportGuide({ projectTitle, onStart }: { projectTitle?: string; onStart: () => void }) {
    const handleDownloadPdf = () => {
        window.print();
    };

    return (
        <div className="mx-auto max-w-[960px] py-4 animate-in fade-in duration-500">
            <div className="relative print:hidden">
                <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0e7d74] px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#0c6b64]"
                    >
                        <Download className="h-4 w-4 shrink-0" aria-hidden />
                        Download PDF
                    </button>
                </div>
            </div>

            {projectTitle ? (
                <p className="mb-1 text-center text-sm font-medium text-[#7a919a]">{projectTitle}</p>
            ) : null}

            <StudentCommunityGuide wizardStep={1} />

            <div className="flex justify-center pb-8 pt-4 print:hidden">
                <Button
                    onClick={onStart}
                    className="h-14 rounded-2xl bg-[#0e7d74] px-12 text-base font-black text-white shadow-xl shadow-teal-200 transition-all hover:bg-[#0c6b64]"
                >
                    I&apos;m Ready — Start My Report
                    <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
