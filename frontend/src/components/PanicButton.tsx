"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock } from 'lucide-react';

export default function PanicButton() {
  const [isTriggered, setIsTriggered] = useState(false);

  const handlePanic = () => {
    setIsTriggered(true);
    // In a real app, this would also lock state and disable inputs
    setTimeout(() => setIsTriggered(false), 5000);
  };

  return (
    <>
      <button 
        onClick={handlePanic}
        className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-500 px-6 py-2 rounded-full font-semibold transition-all flex items-center gap-2 group active:scale-95"
      >
        <AlertTriangle className="w-5 h-5 group-hover:animate-pulse" />
        Panic Mode
      </button>

      <AnimatePresence>
        {isTriggered && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/90 backdrop-blur-xl border-8 border-red-600 animate-pulse"
          >
            <motion.div 
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-center p-12 bg-black border-2 border-red-500 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.5)]"
            >
              <AlertTriangle className="w-24 h-24 text-red-500 mx-auto mb-6" />
              <h2 className="text-5xl font-black text-white mb-4 tracking-tighter">LOCKDOWN ACTIVE</h2>
              <p className="text-red-400 text-xl font-medium mb-8">All financial gateways and UPI inputs have been synchronized to SAFE-HOLD.</p>
              <div className="flex justify-center gap-4">
                <div className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  SYSTEM SECURE
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
