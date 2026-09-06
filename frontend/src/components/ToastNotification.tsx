"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

export default function ToastNotification({
  type,
  message,
  duration = 3000,
  onClose,
}: Omit<ToastProps, 'id'>) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-700" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-700" />;
      case 'info':
        return <AlertCircle className="w-5 h-5 text-emerald-700" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-500/10';
      case 'error':
        return 'border-red-500/30 bg-red-500/10';
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10';
      case 'info':
        return 'border-emerald-500/30 bg-emerald-500/10';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          transition={{ duration: 0.2 }}
          className={`fixed top-4 left-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg ${getColors()}`}
        >
          {getIcon()}
          <span className="text-sm font-medium text-stone-100">{message}</span>
          <button
            onClick={handleClose}
            className="ml-2 p-1 hover:bg-ink-900/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-parchment-faint" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast Container Component
export function ToastContainer() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none">
      {/* Toasts will be rendered here */}
    </div>
  );
}