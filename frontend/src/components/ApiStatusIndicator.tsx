"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/utils';

export type ApiStatus = 'connected' | 'disconnected' | 'connecting';

export default function ApiStatusIndicator() {
  const [status, setStatus] = useState<ApiStatus>('connecting');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkApiHealth = async () => {
    setStatus('connecting');
    try {
      const response = await fetch(`${getApiBaseUrl()}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch (error) {
      setStatus('disconnected');
    }
    setLastChecked(new Date());
  };

  useEffect(() => {
    checkApiHealth();

    // Check health every 30 seconds
    const interval = setInterval(checkApiHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-emerald-700 bg-emerald-500/20';
      case 'disconnected':
        return 'text-red-500 bg-red-500/20';
      case 'connecting':
        return 'text-amber-700 bg-amber-500/20 animate-pulse';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Backend Connected';
      case 'disconnected':
        return 'Backend Disconnected';
      case 'connecting':
        return 'Connecting...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor()}`}
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </motion.div>
  );
}