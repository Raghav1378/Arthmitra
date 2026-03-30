"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Bot, Sparkles, Globe, ChevronDown, ChevronUp, ExternalLink, Cpu, Paperclip, Plus, X, History, Mic, MicOff, Download, FileText, Image as ImageIcon, Database, LineChart as ChartIcon } from "lucide-react";
import { getSessionId } from "@/lib/session";
import ChartRenderer from "./ChartRenderer";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "bot" | "error";
  content: string;
  id: string;
  modelName?: string;
  isDeepResearchResult?: boolean;
  sources?: Array<{title: string; url: string}>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const STREAM_URL = `${API_BASE}/chat/stream`;

// ─── Components ───────────────────────────────────────────────────────────────

function BlinkingCursor() {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      className="inline-block w-[2px] h-[1.1em] bg-cyan-400 ml-1 align-middle shadow-[0_0_8px_rgba(34,211,238,0.8)]"
      aria-hidden="true"
    />
  );
}

function TypingDots() {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
        <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5 bg-slate-800/50 backdrop-blur-sm px-5 py-3.5 rounded-2xl rounded-tl-none border border-slate-700/50 shadow-xl">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -5, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            className="w-1.5 h-1.5 bg-cyan-500 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);
  const [isDeepSearchEnabled, setIsDeepSearchEnabled] = useState(false);
  const [activeDocs, setActiveDocs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historyList, setHistoryList] = useState<{ id: string, title: string, timestamp: number }[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false); // ref mirror so callbacks always see latest

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastInputRef = useRef<string>("");
  const finalTranscriptRef = useRef<string>("");

  // Keep the ref in sync with state
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Good for English + Hinglish
        recognition.maxAlternatives = 1;
        
        recognition.onresult = (event: any) => {
          let interim = "";
          let finalText = "";
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript + " ";
            } else {
              interim += transcript;
            }
          }
          // Store finalized text so we don't lose it on restart
          if (finalText) {
            finalTranscriptRef.current += finalText;
          }
          setInput(lastInputRef.current + finalTranscriptRef.current + interim);
        };
        
        recognition.onend = () => {
          // If user still wants to record, auto-restart (browser killed it due to silence)
          if (isRecordingRef.current) {
            try { recognition.start(); } catch(e) {}
          } else {
            setIsRecording(false);
          }
        };

        recognition.onerror = (event: any) => {
          // 'no-speech' and 'aborted' are normal — auto-restart
          if (event.error === 'no-speech' || event.error === 'aborted') {
            // Will auto-restart via onend
            return;
          }
          // Real errors — stop recording
          console.warn('Speech recognition error:', event.error);
          isRecordingRef.current = false;
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      isRecordingRef.current = false;
      setIsRecording(false);
      recognitionRef.current?.stop();
    } else {
      // Snapshot existing text, reset final transcript accumulator
      lastInputRef.current = input + (input.length > 0 && !input.endsWith(' ') ? ' ' : '');
      finalTranscriptRef.current = "";
      isRecordingRef.current = true;
      setIsRecording(true);
      try {
        recognitionRef.current?.start();
      } catch(e) {
        // If it's already started, abort and retry
        try {
          recognitionRef.current?.stop();
          setTimeout(() => { try { recognitionRef.current?.start(); } catch(e2) {} }, 100);
        } catch(e2) {}
      }
    }
  }, [input, isRecording]);

  const handleDownloadReport = useCallback(() => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(6, 182, 212); // Cyan theme color
    doc.text("ArthMitra Financial Report", 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 28);
    doc.text(`Session ID: ${currentSessionId}`, 20, 32);
    
    doc.setDrawColor(200);
    doc.line(20, 38, 190, 38);
    
    let y = 50;
    messages.forEach((msg) => {
      if (y > 270) { doc.addPage(); y = 20; }
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(msg.role === 'user' ? 60 : 0);
      doc.text(msg.role.toUpperCase(), 20, y);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50);
      const content = msg.content.replace(/\[CHART:.*?\]/g, "[Interactive Chart omitted in PDF]");
      const lines = doc.splitTextToSize(content, 160);
      doc.text(lines, 24, y + 6);
      
      y += (lines.length * 5) + 15;
    });
    
    doc.save(`ArthMitra_Report_${currentSessionId.substring(0,6)}.pdf`);
  }, [messages, currentSessionId]);

  const saveToBackend = useCallback(async (sid: string, msgs: Message[]) => {
    if (!sid || msgs.length === 0) return;
    try {
      const title = msgs.find(m => m.role === 'user')?.content.substring(0, 30) + "..." || "New Chat";
      await fetch(`${API_BASE}/chats/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sid,
          title,
          timestamp: Date.now(),
          messages: msgs,
          user_id: "default_user"
        })
      });
      // Refresh history list
      const listRes = await fetch(`${API_BASE}/chats/list`);
      const hList = await listRes.json();
      setHistoryList(hList || []);
    } catch(e) {}
  }, []);

  // Initialize and load session history
  useEffect(() => {
    const sid = getSessionId();
    setCurrentSessionId(sid);
    
    const initHistory = async () => {
      try {
        // 1. Fetch chat sessions from backend
        const listRes = await fetch(`${API_BASE}/chats/list`);
        const hList = await listRes.json();
        setHistoryList(hList || []);
        
        // 2. Load the current chat content from backend
        const chatRes = await fetch(`${API_BASE}/chats/${sid}`);
        if (chatRes.ok) {
          const data = await chatRes.json();
          if (data.messages) setMessages(data.messages);
        } else {
          // If not on backend, check local storage (migration path)
          const localMsgs = JSON.parse(localStorage.getItem(`arthmitra_chat_${sid}`) || "[]");
          if (localMsgs.length > 0) {
            setMessages(localMsgs);
            // Save to backend immediately for migration
            await saveToBackend(sid, localMsgs);
          }
        }
      } catch(e) {}
    };

    initHistory();
  }, [saveToBackend]);

  // Save to backend on change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      // Small debounce could be added, but for now direct save
      const timeout = setTimeout(() => saveToBackend(currentSessionId, messages), 1000);
      return () => clearTimeout(timeout);
    }
  }, [messages, currentSessionId, saveToBackend]);

  // Load docs when session changes
  useEffect(() => {
    if (!currentSessionId) return;
    const fetchDocs = async () => {
      try {
        const res = await fetch(`${API_BASE}/documents/list?session_id=${currentSessionId}`);
        const data = await res.json();
        if (data.documents) setActiveDocs(data.documents);
      } catch (e) {}
    };
    fetchDocs();
  }, [currentSessionId]);

  const handleNewSession = useCallback(() => {
    const newSid = "sid_" + Math.random().toString(36).substring(2, 11);
    localStorage.setItem("arthmitra_session_id", newSid);
    setCurrentSessionId(newSid);
    setMessages([]);
    setActiveDocs([]);
    setExpandedSources({});
  }, []);

  const switchSession = useCallback(async (sid: string) => {
    localStorage.setItem("arthmitra_session_id", sid);
    setCurrentSessionId(sid);
    setExpandedSources({});
    try {
      const res = await fetch(`${API_BASE}/chats/${sid}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch { setMessages([]) }
  }, []);


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const uid = () => Math.random().toString(36).slice(2);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || isStreaming) return;

    const userMsg: Message = { role: "user", content: text, id: uid() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const currentIsDeep = isDeepSearchEnabled && isWebSearchEnabled;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text, 
          is_local_only: !isWebSearchEnabled, 
          deep_research: currentIsDeep,
          session_id: currentSessionId
        }),
        signal: controller.signal,

      });

      if (!response.ok) throw new Error(`${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      const botId = uid();
      setMessages((prev) => [...prev, { role: "bot", content: "", id: botId, isDeepResearchResult: currentIsDeep }]);

      let fullContent = "";
      let buffer = "";
      let streamStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const packet = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          
          if (packet.startsWith("data: ")) {
            const data = packet.slice(6).trim();
            if (data === "[DONE]") {
              setIsLoading(false);
              setIsStreaming(false);
              return;
            }
            try {
              const event = JSON.parse(data);
              
              // Sources metadata arrives before streaming begins
              if (event.sources) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId ? { ...m, sources: event.sources } : m
                  )
                );
              }
              
              if (event.token) {
                if (!streamStarted) {
                  streamStarted = true;
                  setIsLoading(false);
                  setIsStreaming(true);
                }
                fullContent += event.token;
                const latestModel = event.model;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId
                      ? { ...m, content: fullContent, modelName: latestModel || m.modelName }
                      : m
                  )
                );
              }
            } catch (e) {}
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => [...prev, { role: "error", content: `Failed: ${err.message}`, id: uid() }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [isLoading, isStreaming, isWebSearchEnabled, isDeepSearchEnabled, currentSessionId]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", currentSessionId);
    formData.append("filename", file.name);

    try {
      const res = await fetch(`${API_BASE}/documents/upload`, { method: "POST", body: formData });
      if (res.ok) {
        const listRes = await fetch(`${API_BASE}/documents/list?session_id=${currentSessionId}`);
        const listData = await listRes.json();
        if (listData.documents) setActiveDocs(listData.documents);
      }
    } catch {} finally { setIsUploading(false); }
  }, [currentSessionId]);

  const handleRemoveDocument = useCallback(async (filename: string) => {
    try {
      const res = await fetch(`${API_BASE}/documents/remove/${encodeURIComponent(filename)}?session_id=${currentSessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const listRes = await fetch(`${API_BASE}/documents/list?session_id=${currentSessionId}`);
        const listData = await listRes.json();
        setActiveDocs(listData.documents || []);
      }
    } catch {}
  }, [currentSessionId]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(input);
  }, [input, sendMessage]);

  const renderMessageContent = (msg: Message) => {
    const shouldShowSources = msg.isDeepResearchResult && msg.sources && msg.sources.length > 0;

    return (
      <div className="space-y-4 relative pb-2 overflow-hidden">
        <div className="whitespace-pre-wrap leading-relaxed">
          {(() => {
            const content = msg.content;
            const parts = [];
            let lastIdx = 0;
            
            let startIdx = content.indexOf("[CHART:");
            while (startIdx !== -1) {
              parts.push(<span key={`text-${lastIdx}`}>{content.slice(lastIdx, startIdx)}</span>);
              
              let jsonStartIdx = content.indexOf("{", startIdx);
              if (jsonStartIdx !== -1) {
                let bracketCount = 0;
                let jsonEndIdx = -1;
                
                for (let i = jsonStartIdx; i < content.length; i++) {
                  if (content[i] === "{") bracketCount++;
                  else if (content[i] === "}") bracketCount--;
                  
                  if (bracketCount === 0) {
                    jsonEndIdx = i;
                    break;
                  }
                }
                
                if (jsonEndIdx !== -1) {
                  const blockEndIdx = content.indexOf("]", jsonEndIdx);
                  if (blockEndIdx !== -1) {
                    const rawJson = content.slice(jsonStartIdx, jsonEndIdx + 1);
                    try {
                      const chartData = JSON.parse(rawJson);
                      parts.push(<ChartRenderer key={`chart-${startIdx}`} type={chartData.type} data={chartData.data} title={chartData.title} />);
                    } catch (e) {
                      parts.push(<div key={`err-${startIdx}`} className="my-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">Malformed Data Block</div>);
                    }
                    lastIdx = blockEndIdx + 1;
                  } else {
                    lastIdx = jsonEndIdx + 1;
                  }
                } else {
                  parts.push(<span key={`partial-${startIdx}`} className="text-cyan-500 animate-pulse text-[10px] px-2 italic uppercase tracking-widest font-black">Synthesizing...</span>);
                  lastIdx = jsonStartIdx + 1;
                }
              } else {
                lastIdx = startIdx + 7;
              }
              startIdx = content.indexOf("[CHART:", lastIdx);
            }
            parts.push(<span key="text-end">{content.slice(lastIdx)}</span>);
            return parts.length > 1 ? parts : msg.content;
          })()}
          {isStreaming && msg.id === messages[messages.length-1].id && msg.role === "bot" && <BlinkingCursor />}
        </div>
        
        {shouldShowSources && (
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <button 
              onClick={() => setExpandedSources(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
              className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-lg hover:bg-cyan-400/20 transition-all uppercase tracking-wider"
            >
              {expandedSources[msg.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Evidence ({msg.sources!.length})
            </button>
            <AnimatePresence>
              {expandedSources[msg.id] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-2">
                  {msg.sources!.map((s, idx) => (
                    <motion.div key={idx} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2.5 bg-slate-900/60 border border-slate-700/30 rounded-xl text-[11px] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all group">
                        <Globe className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="truncate flex-1 font-medium">{s.title || s.url}</span>
                        <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {msg.role === "bot" && (
          <div className={`mt-2 flex justify-end transition-opacity duration-1000 ${isStreaming && msg.id === messages[messages.length-1].id ? "opacity-30" : "opacity-100"}`}>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors">
              <Cpu className="w-3 h-3" />
              {msg.modelName || "Llama 3"}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full rounded-3xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-2xl overflow-hidden">
      
      {/* ─── Minimal Chat Header ─── */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all">
            <History className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Mitra AI</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                <span className="text-[10px] text-slate-500 font-semibold">Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { setIsWebSearchEnabled(!isWebSearchEnabled); if (isWebSearchEnabled) setIsDeepSearchEnabled(false); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${isWebSearchEnabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/[0.03] border-white/[0.06] text-slate-500"}`}>
            <Globe className="w-3 h-3" />
            {isWebSearchEnabled ? "Web" : "Local"}
          </button>
          <AnimatePresence>
            {isWebSearchEnabled && (
              <motion.button initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: "auto" }} exit={{ opacity: 0, scale: 0.9, width: 0 }} onClick={() => setIsDeepSearchEnabled(!isDeepSearchEnabled)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border overflow-hidden ${isDeepSearchEnabled ? "bg-violet-500/10 border-violet-500/20 text-violet-400" : "bg-white/[0.03] border-white/[0.06] text-slate-500"}`}>
                <Sparkles className="w-3 h-3" />
                Deep
              </motion.button>
            )}
          </AnimatePresence>
          <button onClick={handleNewSession} className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="New Chat">
            <Plus className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button onClick={handleDownloadReport} className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all" title="Export PDF">
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── History Drawer (slides down from top) ─── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-b border-white/[0.06] bg-white/[0.02] overflow-hidden"
          >
            <div className="p-4 max-h-48 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {historyList.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => { switchSession(item.id); setIsSidebarOpen(false); }}
                    className={`p-3 rounded-xl border text-left transition-all ${item.id === currentSessionId ? 'bg-violet-500/10 border-violet-500/20' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05]'}`}
                  >
                    <span className="text-[11px] font-bold text-slate-300 leading-tight line-clamp-1 block">{item.title}</span>
                    <span className="text-[9px] text-slate-600 mt-1 block">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </button>
                ))}
                {historyList.length === 0 && (
                  <p className="col-span-3 text-xs text-slate-600 text-center py-4">No chat history yet</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Message Area ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scroll-smooth custom-scrollbar">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center gap-6">
            {/* Iridescent Orb */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-300 to-cyan-400 opacity-40 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-violet-500/80 via-fuchsia-400/80 to-cyan-400/80 shadow-xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white/70" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-bold text-white/60">How can I help you today?</p>
              <p className="text-xs text-slate-500 max-w-xs">Example: "Explain SIP investment in simple terms" or "Check if this UPI link is safe"</p>
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === "user" ? "bg-violet-500/10" : "bg-cyan-500/10"}`}>
                  {msg.role === "user" ? <User className="w-4 h-4 text-violet-400" /> : <Bot className="w-4 h-4 text-cyan-400" />}
                </div>
                <div className={`px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed ${msg.role === "user" ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-tr-sm" : "bg-white/[0.04] text-slate-200 rounded-tl-sm border border-white/[0.06]"}`}>
                  {renderMessageContent(msg)}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && <TypingDots />}
      </div>

      {/* ─── Input Area (NanoAI style) ─── */}
      <div className="px-5 pb-5 pt-3 space-y-3">
        {/* Active Documents */}
        {activeDocs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {activeDocs.map((doc, i) => {
              const ext = doc.filename.split('.').pop()?.toLowerCase();
              const getIcon = () => {
                if (['pdf'].includes(ext)) return <FileText className="w-3 h-3" />;
                if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return <ImageIcon className="w-3 h-3" />;
                if (['csv', 'xlsx', 'xls'].includes(ext)) return <Database className="w-3 h-3" />;
                return <FileText className="w-3 h-3" />;
              };
              return (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[10px] text-slate-300 font-semibold whitespace-nowrap group">
                  <div className="text-cyan-400">{getIcon()}</div>
                  {doc.filename}
                  <button onClick={() => handleRemoveDocument(doc.filename)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"><X className="w-3 h-3" /></button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Main Input Bar */}
        <div className="relative flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-1 shadow-lg shadow-black/10 focus-within:border-violet-500/30 focus-within:shadow-violet-500/5 transition-all">
          <span className="text-slate-600 text-lg select-none">+</span>
          <input 
            id="chat-input" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} 
            placeholder={isUploading ? "Uploading file..." : 'Example: "Explain quantum computing in simple terms"'} 
            disabled={isLoading || isStreaming} 
            className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none" 
          />
          <button onClick={toggleRecording} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-white hover:bg-white/[0.06]'}`}>
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={handleSend} disabled={!input.trim() || isLoading} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-all disabled:opacity-30">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Contextual Action Chips (NanoAI style) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => { setIsDeepSearchEnabled(!isDeepSearchEnabled); if (!isWebSearchEnabled) setIsWebSearchEnabled(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${isDeepSearchEnabled ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-white/[0.02] border-white/[0.05] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'}`}
          >
            <Sparkles className="w-3 h-3" /> Deep Research
          </button>
          <button 
            onClick={() => {
              setInput("[CHART:{\"type\":\"bar\",\"title\":\"My Data\",\"data\":[{\"name\":\"A\",\"value\":10},{\"name\":\"B\",\"value\":20}]}]");
              setTimeout(() => { document.getElementById("chat-input")?.focus(); }, 100);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white/[0.02] border border-white/[0.05] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all"
          >
            <ChartIcon className="w-3 h-3" /> Chart
          </button>
          <button 
            onClick={() => { setIsWebSearchEnabled(!isWebSearchEnabled); if (isWebSearchEnabled) setIsDeepSearchEnabled(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${isWebSearchEnabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.02] border-white/[0.05] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'}`}
          >
            <Globe className="w-3 h-3" /> Search
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading || isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${activeDocs.length > 0 ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-white/[0.02] border-white/[0.05] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'}`}
          >
            <Paperclip className={`w-3 h-3 ${isUploading ? 'animate-bounce' : ''}`} /> Attach
          </button>
          <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls,.txt" />
        </div>
      </div>
    </div>
  );
}
