"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  ClipboardList,
  Users,
  Globe,
  Activity,
  Target,
  Package,
  Link,
  Image,
  Lightbulb,
  RefreshCw,
  FileText,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";

interface ReportSummaryPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: 1, title: "Participation & Identity", icon: Users, description: "Student details, team composition, and verified attendance logs." },
  { id: 2, title: "Project Context", icon: ClipboardList, description: "Problem statement, discipline relevance, and baseline evidence." },
  { id: 3, title: "SDG Mapping", icon: Globe, description: "Primary and secondary Sustainable Development Goals alignment." },
  { id: 4, title: "Activities & Outputs", icon: Activity, description: "Delivery mode, total sessions, and beneficiary details." },
  { id: 5, title: "Outcomes & Metrics", icon: Target, description: "Measurable changes, baseline vs endline data, and impact areas." },
  { id: 6, title: "Resources Used", icon: Package, description: "Financial and material resources utilized during implementation." },
  { id: 7, title: "Partnerships", icon: Link, description: "Collaborations with external organizations and formalization status." },
  { id: 8, title: "Photo & Video Evidence", icon: Image, description: "Visual proof of activities with ethical compliance checks." },
  { id: 9, title: "Reflection & Learning", icon: Lightbulb, description: "Personal and academic growth, competency scores, and insights." },
  { id: 10, title: "Sustainability", icon: RefreshCw, description: "Scaling potential, policy influence, and continuation plan." },
  { id: 11, title: "Intelligence Summary", icon: FileText, description: "AI-assisted executive overview of the entire project impact." },
];

export default function ReportSummaryPopup({ isOpen, onClose }: ReportSummaryPopupProps) {
  const handleUnderstand = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-[2rem]">
        <div className="bg-indigo-50/90 border-b border-indigo-100/80 p-8 text-slate-900 relative">
          <div className="absolute top-0 right-0 p-8 text-indigo-200/60">
            <ShieldCheck className="w-32 h-32 rotate-12" />
          </div>
          <DialogHeader className="relative z-10 space-y-2">
            <DialogTitle className="report-h3 !text-2xl font-black !text-slate-900 tracking-tight">
              CIEL Reporting Framework
            </DialogTitle>
            <DialogDescription className="text-slate-600 font-medium text-sm leading-relaxed">
              Review the 11-section reporting structure required for project completion and HEC verification.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 no-scrollbar">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-all hover:shadow-md group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <section.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Section {section.id}: {section.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
              <Info className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                <strong>Important:</strong> Once you apply, you will be required to maintain a verified attendance log for Section 1. Your report remains locked until CIEL and Faculty approval is secured.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-100 flex justify-center sm:justify-center">
          <Button
            type="button"
            onClick={handleUnderstand}
            className="bg-report-primary hover:opacity-90 text-white rounded-xl h-12 px-10 font-black text-xs uppercase tracking-widest flex items-center gap-2"
          >
            I Understand
            <ChevronRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
