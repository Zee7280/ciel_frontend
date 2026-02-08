import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}

export function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage
}: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    const startItem = itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = itemsPerPage && totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 text-sm text-slate-500">
            {totalItems && itemsPerPage ? (
                <div>
                    Showing <span className="font-bold text-slate-900">{startItem}</span> to <span className="font-bold text-slate-900">{endItem}</span> of <span className="font-bold text-slate-900">{totalItems}</span>
                </div>
            ) : (
                <div>
                    Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium active:translate-y-0.5"
                >
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium active:translate-y-0.5"
                >
                    Next <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
