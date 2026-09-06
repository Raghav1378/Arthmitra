"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, FileText, Image as ImageIcon, Database, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getSessionId } from "@/lib/session";

interface DocumentItem {
  filename: string;
  chunks: number;
  type: string;
  ingested_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function DocumentUploader() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteLabel, setPasteLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionId = getSessionId();

  // Load documents on mount
  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents/list?session_id=${sessionId}`);
      const data = await res.json();
      if (data.documents) {
        setDocs(data.documents);
      }
    } catch (e) {
      console.error("Failed to list documents", e);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showMessage("error", "File too large. Maximum size is 10MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);
    formData.append("filename", file.name);

    try {
      setUploadProgress(60);
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadProgress(100);

      if (res.ok) {
        showMessage("success", data.message);
        fetchDocs();
      } else {
        showMessage("error", data.detail || "Upload failed");
      }
    } catch (e: any) {
      showMessage("error", e.message || "Upload failed");
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setIsUploading(true);
    
    try {
      const res = await fetch(`${API_BASE}/documents/paste`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText, label: pasteLabel, session_id: sessionId }),
      });
      
      const data = await res.json();
      if (res.ok) {
        showMessage("success", data.message);
        setPasteText("");
        setPasteLabel("");
        setIsPasteModalOpen(false);
        fetchDocs();
      } else {
        showMessage("error", data.detail || "Failed to save text");
      }
    } catch (e: any) {
      showMessage("error", e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all your documents?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/documents/clear?session_id=${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showMessage("success", "All documents cleared.");
        setDocs([]);
      }
    } catch (e) {
      showMessage("error", "Failed to clear documents.");
    }
  };

  const handleRemove = async (filename: string) => {
    try {
      const res = await fetch(`${API_BASE}/documents/remove/${encodeURIComponent(filename)}?session_id=${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showMessage("success", `Removed ${filename}`);
        fetchDocs();
      }
    } catch (e) {
      showMessage("error", `Failed to remove ${filename}`);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === "pdf") return <FileText className="w-4 h-4 text-red-600" />;
    if (type === "image") return <ImageIcon className="w-4 h-4 text-blue-400" />;
    if (type === "tabular") return <Database className="w-4 h-4 text-emerald-700" />;
    return <FileText className="w-4 h-4 text-parchment-faint" />;
  };

  return (
    <div className="flex flex-col h-full bg-white/70 border border-ink-900/10 rounded-[2.5rem] overflow-hidden backdrop-blur-2xl shadow-xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-extrabold text-ink-950 text-lg tracking-tight">Your Documents</h3>
        <span className="text-xs text-parchment-faint font-mono bg-ink-900/[0.06] px-2 py-1 rounded-md">
          {sessionId.substring(0, 8)}...
        </span>
      </div>

      <div 
        onDrop={handleDrop} 
        onDragOver={handleDragOver}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
          ${isUploading ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-ink-900/15 bg-ink-900/[0.03] hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]'}
        `}
      >
        <Upload className={`w-10 h-10 mb-3 ${isUploading ? 'text-emerald-700 animate-bounce' : 'text-parchment-faint'}`} />
        <p className="text-sm font-medium text-parchment-dim text-center">
          {isUploading ? "Uploading..." : "Drop PDF, Image, CSV, Excel or Text file here"}
        </p>
        <p className="text-xs text-parchment-faint mt-2 text-center">Max size: 10MB</p>
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          disabled={isUploading}
          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls,.txt"
        />

        {isUploading && (
          <div className="w-full h-1.5 bg-ink-900/10 rounded-full mt-4 overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => setIsPasteModalOpen(true)}
          className="flex-1 py-2.5 bg-ink-900/[0.06] hover:bg-ink-900/[0.12] text-parchment-dim rounded-xl text-sm font-semibold transition-colors border border-ink-900/5"
        >
          Paste Text Instead
        </button>
        {docs.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl text-sm font-semibold transition-colors border border-red-500/20"
          >
            Clear All
          </button>
        )}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
              message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700' : 'bg-red-500/10 border border-red-500/20 text-red-600'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {docs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-stone-600 text-sm italic">
            No personal documents uploaded yet.
          </div>
        ) : (
          <AnimatePresence>
            {docs.map((doc) => (
              <motion.div 
                key={doc.filename}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-3 bg-ink-900/[0.04] rounded-xl border border-ink-900/5 group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-ink-900/[0.06] rounded-lg">
                    {getTypeIcon(doc.type)}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-sm font-medium text-parchment truncate">{doc.filename}</span>
                    <span className="text-[10px] text-emerald-700/80 uppercase tracking-widest">{doc.chunks} chunks</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemove(doc.filename)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-parchment-faint hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {isPasteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm flex flex-col z-50 p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-bold">Paste Custom Text</h4>
              <button onClick={() => setIsPasteModalOpen(false)} className="text-parchment-faint hover:text-ink-950"><X className="w-5 h-5"/></button>
            </div>
            <input 
              value={pasteLabel} onChange={(e) => setPasteLabel(e.target.value)} 
              placeholder="Label (e.g., 'Meeting Notes')" 
              className="w-full bg-white border border-ink-900/15 rounded-xl px-4 py-3 mb-4 text-ink-950 text-sm focus:border-emerald-500 outline-none"
            />
            <textarea 
              value={pasteText} onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your text content here..."
              className="w-full flex-1 bg-white border border-ink-900/15 rounded-xl p-4 text-ink-950 text-sm focus:border-emerald-500 outline-none resize-none"
            />
            <button 
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-ink-900/10 disabled:text-parchment-faint text-white rounded-xl font-bold transition-all"
            >
              Ingest Text
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
