"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Search, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/utils';

interface UpiValidationResult {
  upi_id: string;
  risk_score: number;
  risk_level: string;
  reasons: string[];
  model_used: string;
}

export default function UPIValidator() {
  const [upiId, setUpiId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [result, setResult] = useState<UpiValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateUPI = async () => {
    if (!upiId.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/shield/validate-upi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upi_id: upiId, display_name: displayName || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.detail || 'Failed to validate UPI ID');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'low':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />;
      case 'low':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <Shield className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100">UPI Risk Validator</h3>
          <p className="text-xs text-slate-400">Check UPI IDs before making payments</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            UPI ID
          </label>
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && validateUPI()}
            placeholder="e.g., example@okicici"
            className="input-field"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Display Name (Optional)
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., John Doe"
            className="input-field"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={validateUPI}
          disabled={isLoading || !upiId.trim()}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Validate UPI ID
            </>
          )}
        </button>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 border rounded-xl ${getRiskColor(result.risk_level)}`}
            >
              <div className="flex items-start gap-3 mb-4">
                {getRiskIcon(result.risk_level)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">Risk: {result.risk_level}</h4>
                    <span className="text-2xl font-bold">{result.risk_score}</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">Score: 0-100</p>
                </div>
              </div>

              {result.reasons.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-semibold text-sm mb-2">Analysis:</h5>
                  <ul className="space-y-1 text-sm">
                    {result.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs opacity-60 mt-4">
                Model: {result.model_used}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}