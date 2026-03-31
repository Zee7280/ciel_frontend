"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
  Mail,
  ShieldCheck,
  ChevronRight,
  Info
} from "lucide-react";
import clsx from "clsx";

interface ReportSummaryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (facultyEmail: string) => void;
  isSubmitting?: boolean;
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

export default function ReportSummaryPopup({ isOpen, onClose, onApply, isSubmitting }: ReportSummaryPopupProps) {
  const [facultyEmail, setFacultyEmail] = useState("");
  const [step, setStep] = useState(1); // 1: Info, 2: Faculty Email

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onApply(facultyEmail);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-[2rem]">
        <div className="bg-indigo-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck className="w-32 h-32 rotate-12" />
          </div>
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-black tracking-tight">CIEL Reporting Framework</DialogTitle>
            <DialogDescription className="text-indigo-100 font-medium">
              Review the 11-section reporting structure required for project completion and HEC verification.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 no-scrollbar">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SECTIONS.map((section) => (
                  <div key={section.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-all hover:shadow-md group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <section.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Section {section.id}: {section.title}</h4>
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Faculty Supervisor Contact</h3>
                <p className="text-sm text-slate-500">Provide the official institutional email of your supervising faculty member for project approval (Optional).</p>
              </div>

              <div className="space-y-3 max-w-sm mx-auto">
                <Label htmlFor="facultyEmail" className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Institutional Email (Optional)</Label>
                <Input
                  id="facultyEmail"
                  type="email"
                  placeholder="supervisor@university.edu.pk"
                  value={facultyEmail}
                  onChange={(e) => setFacultyEmail(e.target.value)}
                  className="h-14 bg-white border-2 border-slate-100 focus:border-indigo-500 rounded-2xl font-bold text-base transition-all"
                />
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3 max-w-sm mx-auto">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider leading-relaxed">
                  Verification: CIEL will send an automated endorsement request to this email (if provided) upon your application.
                </p>
              </div>
            </form>
          )}
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-100 gap-3 sm:justify-between items-center sm:gap-0">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={onClose} className="text-slate-500 font-bold rounded-xl">Cancel</Button>
              <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                I Understand <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleBack} className="text-slate-500 font-bold rounded-xl">Back</Button>
              <Button 
                onClick={() => handleSubmit()} 
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-black text-xs uppercase tracking-widest disabled:bg-slate-200 transition-all shadow-lg shadow-indigo-100"
              >
                {isSubmitting ? "Submitting Application..." : "Confirm & Apply Now"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
