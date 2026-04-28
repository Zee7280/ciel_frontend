"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';
import { toast } from 'sonner';
import { 
    CreditCard, 
    Upload, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    ArrowLeft, 
    Copy, 
    Building2, 
    Info,
} from 'lucide-react';
import { Button } from '../report/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../report/components/ui/card';
import { Input } from '../report/components/ui/input';
import { FileUpload } from '../report/components/ui/file-upload';
import {
    fetchStudentManualPaymentHistory,
    type StudentManualPaymentHistoryRow,
} from '@/lib/student-manual-payment-history';
import { REPORTING_FEE_DISPLAY, REPORTING_FEE_PKR } from '@/config/reportingFee';
import { ManualPaymentHistorySection } from '../components/ManualPaymentHistorySection';

function PaymentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectId = searchParams.get('projectId');
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [projectDetails, setProjectDetails] = useState<any>(null);
    const [bankInfo, setBankInfo] = useState({
        bankName: "UNITED Bank Limited (UBL)",
        accountTitle: "CIEL International",
        accountNumber: "0374251663933",
        iban: "PK14UNIL0109000251663933",
        amount: REPORTING_FEE_DISPLAY,
    });
    const [proofFile, setProofFile] = useState<File | null>(null);
    /** PKR the student actually transferred (digits only in state). */
    const [paidAmountPkr, setPaidAmountPkr] = useState(String(REPORTING_FEE_PKR));
    const [paymentSubmitted, setPaymentSubmitted] = useState(false);
    const [manualPaymentHistory, setManualPaymentHistory] = useState<StudentManualPaymentHistoryRow[]>([]);
    const [manualPaymentHistoryLoading, setManualPaymentHistoryLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            router.push('/dashboard/student');
            return;
        }
        fetchProjectDetails();
    }, [projectId]);

    useEffect(() => {
        if (!projectId) return;
        let cancelled = false;
        (async () => {
            setManualPaymentHistoryLoading(true);
            const rows = await fetchStudentManualPaymentHistory();
            if (!cancelled) {
                setManualPaymentHistory(rows);
                setManualPaymentHistoryLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [projectId]);

    const fetchProjectDetails = async () => {
        try {
            setLoading(true);
            const res = await authenticatedFetch(`/api/v1/student/projects/${projectId}`);
            if (res && res.ok) {
                const data = await res.json();
                const project = data.data || data;
                setProjectDetails(project);

                // 🚀 Check report/payment status to potentially skip this page
                const storedUser = localStorage.getItem("ciel_user");
                if (storedUser) {
                    const userObj = JSON.parse(storedUser);
                    const studentId = userObj.id || userObj.studentId || userObj.userId;
                    
                    const reportsRes = await authenticatedFetch(`/api/v1/students/reports/check?studentId=${studentId}`);
                    if (reportsRes && reportsRes.ok) {
                        const reportsData = await reportsRes.json();
                        if (reportsData.success && Array.isArray(reportsData.data)) {
                            const report = reportsData.data.find((r: any) => 
                                (r.opportunityId || r.opportunity_id || r.projectId || r.project_id || r.project_title) === projectId
                            );
                            
                            if (report) {
                                const status = report.status || 'none';
                                if (status === 'paid' || status === 'verified') {
                                    // Already approved - go to summary
                                    router.replace(`/dashboard/student/report?projectId=${projectId}`);
                                    return;
                                } else if (status === 'payment_under_review') {
                                    // Already submitted - show success view
                                    setPaymentSubmitted(true);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching project:', error);
            toast.error('Failed to load project details');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const handleFileUpload = (files: File[]) => {
        if (files.length > 0) {
            setProofFile(files[0]);
        }
    };

    const handleSubmitPayment = async () => {
        if (!proofFile) {
            toast.error('Please upload a proof of payment slip');
            return;
        }

        const paidPkr = parseInt(paidAmountPkr.replace(/\D/g, ''), 10);
        if (!Number.isFinite(paidPkr) || paidPkr <= 0) {
            toast.error('Enter the amount you transferred (PKR)');
            return;
        }

        try {
            setSubmitting(true);
            
            // In a real app, use FormData for file upload
            const formData = new FormData();
            formData.append('projectId', projectId as string);
            formData.append('proof', proofFile);
            // So admin can show the paid amount (not only the standard fee). Backend should persist and return this field.
            formData.append('paid_amount', String(paidPkr));

            const res = await authenticatedFetch(`/api/v1/student/payments/submit`, {
                method: 'POST',
                // authenticatedFetch might need adjustment for FormData if it default set Content-Type to application/json
                body: formData 
            });

            if (res && res.ok) {
                setPaymentSubmitted(true);
                toast.success('Payment proof submitted successfully!');
                fetchStudentManualPaymentHistory().then(setManualPaymentHistory);
            } else {
                let msg = 'Failed to submit payment proof';
                if (res) {
                    const text = await res.text().catch(() => '');
                    if (text) {
                        try {
                            const data = JSON.parse(text) as { message?: string; error?: string };
                            msg = data.message || data.error || msg;
                        } catch {
                            msg = text.length > 200 ? `${text.slice(0, 200)}…` : text;
                        }
                    }
                }
                toast.error(msg);
            }
        } catch (error) {
            console.error('Payment submission error:', error);
            toast.error('Failed to submit payment proof');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (paymentSubmitted) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payment Proof Submitted!</h1>
                <p className="text-slate-500 font-medium max-w-md mx-auto">
                    Thank you! Our admin team will verify your payment slip. Once approved, you'll be able to download your certificate (cii) and final report.
                </p>
                <div className="pt-4 max-w-lg mx-auto text-left">
                    <ManualPaymentHistorySection
                        rows={manualPaymentHistory}
                        loading={manualPaymentHistoryLoading}
                        currentProjectId={projectId}
                    />
                </div>
                <div className="pt-8">
                    <Button onClick={() => router.push('/dashboard/student/projects')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-blue-200 transition-all">
                        Back to My Projects
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 -ml-2 text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Complete Payment</h1>
                    <p className="text-slate-500 font-medium">
                        Please transfer <span className="font-semibold text-slate-700">{REPORTING_FEE_DISPLAY}</span> per student to the account below and upload the proof.
                    </p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    <span className="font-black text-lg">{bankInfo.amount}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bank Details Card */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            Bank Account Details
                        </CardTitle>
                        <CardDescription className="text-slate-500">Transfer funds via IBFT, Mobile App, or Bank Deposit.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Bank Name</span>
                                <div className="flex items-center justify-between group">
                                    <span className="font-bold text-slate-900">{bankInfo.bankName}</span>
                                    <button onClick={() => handleCopy(bankInfo.bankName, 'Bank Name')} className="text-slate-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Account Title</span>
                                <div className="flex items-center justify-between group">
                                    <span className="font-bold text-slate-900">{bankInfo.accountTitle}</span>
                                    <button onClick={() => handleCopy(bankInfo.accountTitle, 'Account Title')} className="text-slate-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Account Number</span>
                                <div className="flex items-center justify-between group p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="font-mono font-bold text-slate-900 tracking-wider font-bold">{bankInfo.accountNumber}</span>
                                    <button onClick={() => handleCopy(bankInfo.accountNumber, 'Account Number')} className="text-blue-600 hover:text-blue-800 p-2 bg-white rounded-lg shadow-sm">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">IBAN</span>
                                <div className="flex items-center justify-between group p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="font-mono font-bold text-slate-900 tracking-wider text-xs">{bankInfo.iban}</span>
                                    <button onClick={() => handleCopy(bankInfo.iban, 'IBAN')} className="text-blue-600 hover:text-blue-800 p-2 bg-white rounded-lg shadow-sm">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                Please ensure the transfer is successful and you take a screenshot of the confirmation page or save the PDF receipt to upload.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Proof Upload Card */}
                <Card className="border-slate-200 shadow-sm flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <Upload className="w-5 h-5 text-blue-600" />
                            Upload Payment Proof
                        </CardTitle>
                        <CardDescription className="text-slate-500">Upload your transfer receipt or bank slip.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                Amount you transferred (PKR)
                            </label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                className="font-bold text-slate-900 border-slate-200"
                                placeholder={`e.g. ${REPORTING_FEE_PKR}`}
                                value={paidAmountPkr}
                                onChange={(e) => setPaidAmountPkr(e.target.value.replace(/\D/g, ''))}
                            />
                            <p className="text-[11px] text-slate-500 font-medium">
                                Must match the amount on your bank receipt. Defaults to the fee shown on the left if you paid that exact amount.
                            </p>
                        </div>
                        <div className="h-full min-h-[200px]">
                            <FileUpload
                                onChange={(e) => {
                                    const files = e.target.files;
                                    if (files && files.length > 0) {
                                        setProofFile(files[0]);
                                    }
                                }}
                                label="Upload JPEG, PNG or PDF (MAX. 5MB)"
                                accept="image/*,application/pdf"
                            />
                        </div>
                        {proofFile && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                                <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">{proofFile.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setProofFile(null)} className="text-slate-400 hover:text-red-500">
                                    Remove
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                        <Button 
                            onClick={handleSubmitPayment} 
                            disabled={!proofFile || submitting} 
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                        >
                            {submitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                            ) : (
                                "Submit Payment Proof"
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Project Summary */}
            <Card className="border-slate-100 bg-slate-50/50">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-xl text-blue-600 shadow-sm">
                            {(projectDetails?.title || "P").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paying for Report</p>
                            <h3 className="text-lg font-bold text-slate-900">{projectDetails?.title}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Due (per student)</p>
                            <p className="text-xl font-black text-slate-900">{bankInfo.amount}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-200 hidden md:block" />
                        <div className="flex items-center gap-2 text-slate-500 italic text-sm">
                            <AlertCircle className="w-4 h-4" />
                            Secure manual transfer
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ManualPaymentHistorySection
                rows={manualPaymentHistory}
                loading={manualPaymentHistoryLoading}
                currentProjectId={projectId}
            />
        </div>
    );
}

export default function StudentPaymentPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <PaymentContent />
        </Suspense>
    );
}
