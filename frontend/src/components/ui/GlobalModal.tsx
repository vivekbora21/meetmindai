"use client";

import React, { useState } from 'react';
import { useModalStore } from '@/store/useModalStore';
import { X, CheckCircle, AlertCircle, Info, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalModal() {
  const { isOpen, options, closeModal } = useModalStore();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (options.onConfirm) {
      setIsProcessing(true);
      try {
        await options.onConfirm();
      } finally {
        setIsProcessing(false);
        closeModal();
      }
    } else {
      closeModal();
    }
  };

  const handleCancel = () => {
    if (options.onCancel) {
      options.onCancel();
    }
    closeModal();
  };

  const icons = {
    info: <Info className="w-6 h-6 text-blue-500" />,
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
    error: <AlertCircle className="w-6 h-6 text-red-500" />,
    confirm: <HelpCircle className="w-6 h-6 text-yellow-500" />
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
          role="dialog"
          aria-modal="true"
        >
          <div className="p-5 flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {icons[options.type || 'info']}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {options.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {options.message}
              </p>
            </div>
            <button 
              onClick={handleCancel}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1"
              disabled={isProcessing}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-[var(--muted)]/50 px-5 py-4 flex justify-end gap-3 border-t border-[var(--border)]">
            {(options.type === 'confirm' || options.cancelText !== 'Cancel') && (
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--border)] transition-colors text-[var(--foreground)]"
              >
                {options.cancelText || 'Cancel'}
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center min-w-[80px]
                ${options.type === 'error' 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                  : options.type === 'confirm'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110'
                  : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110'
                }`}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                options.confirmText || 'OK'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
