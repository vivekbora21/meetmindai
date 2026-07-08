"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers array with ellipses if needed
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first, last, current, and surrounding pages
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}>
      {/* Items status info */}
      <div className="text-xs text-slate-500 font-semibold">
        Showing <span className="text-[#0f766e] font-bold">{startItem}</span> to{" "}
        <span className="text-[#0f766e] font-bold">{endItem}</span> of{" "}
        <span className="text-slate-800 font-extrabold">{totalItems}</span> items
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[#0f766e] hover:border-[#0f766e]/30 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:border-slate-200 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Buttons */}
        {getPageNumbers().map((page, idx) => {
          if (page === "...") {
            return (
              <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs font-bold select-none">
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#0f766e] border-[#0f766e] text-white shadow-sm shadow-teal-600/10"
                  : "bg-white border-slate-200 text-slate-600 hover:text-[#0f766e] hover:border-[#0f766e]/30"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[#0f766e] hover:border-[#0f766e]/30 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:border-slate-200 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
