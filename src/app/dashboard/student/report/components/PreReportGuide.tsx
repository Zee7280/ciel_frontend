"use client";
import React from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import OnePageStudentGuide from "./OnePageStudentGuide";

export default function PreReportGuide({ projectTitle, onStart }: { projectTitle?: string; onStart: () => void }) {
    return (
        <div className="mx-auto max-w-[960px] animate-in fade-in duration-500">
            {projectTitle ? (
                <p className="mb-3 text-center text-sm font-medium text-[#7a919a]">{projectTitle}</p>
            ) : null}

            <OnePageStudentGuide />

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
