"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Bot, Sparkles, RefreshCw, AlertTriangle, Globe, ChevronDown, ChevronUp, ExternalLink, FileText, Cpu, Paperclip, Plus, X, Image as ImageIcon, Database, CheckCircle2, History, Mic, MicOff, Download, PieChart as ChartIcon } from "lucide-react";
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

  const toggleRecording = () => {
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
  };

  const handleDownloadReport = () => {
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
  };

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
  }, []);

  const saveToBackend = async (sid: string, msgs: Message[]) => {
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
  };

  // Save to backend on change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      // Small debounce could be added, but for now direct save
      const timeout = setTimeout(() => saveToBackend(currentSessionId, messages), 1000);
      return () => clearTimeout(timeout);
    }
  }, [messages, currentSessionId]);

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

  const handleNewSession = () => {
    const newSid = "sid_" + Math.random().toString(36).substring(2, 11);
    localStorage.setItem("arthmitra_session_id", newSid);
    setCurrentSessionId(newSid);
    setMessages([]);
    setActiveDocs([]);
    setExpandedSources({});
  };

  const switchSession = async (sid: string) => {
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
    } catch(e) { setMessages([]) }
  };


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

  const handleFileUpload = async (file: File) => {
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
    } catch (e) {} finally { setIsUploading(false); }
  };

  const handleRemoveDocument = async (filename: string) => {
    try {
      const res = await fetch(`${API_BASE}/documents/remove/${encodeURIComponent(filename)}?session_id=${currentSessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const listRes = await fetch(`${API_BASE}/documents/list?session_id=${currentSessionId}`);
        const listData = await listRes.json();
        setActiveDocs(listData.documents || []);
      }
    } catch (e) {}
  };

  const handleSend = () => sendMessage(input);

  const renderMessageContent = (msg: Message) => {
    // Sources come from the SSE metadata event (msg.sources), NOT from response text
    const shouldShowSources = msg.isDeepResearchResult && msg.sources && msg.sources.length > 0;

    return (
      <div className="space-y-4 relative pb-2 overflow-hidden">
        <div className="whitespace-pre-wrap leading-relaxed">
          {(() => {
            const chartPattern = /\[CHART:({.*?})\]/g;
            const parts = [];
            let lastIdx = 0;
            let match;
            while ((match = chartPattern.exec(msg.content)) !== null) {
              parts.push(msg.content.slice(lastIdx, match.index));
              try {
                const chartData = JSON.parse(match[1]);
                parts.push(<ChartRenderer key={match.index} type={chartData.type} data={chartData.data} title={chartData.title} />);
              } catch (e) {
                parts.push(<div className="text-xs text-red-400 bg-red-400/10 p-2 rounded">Error rendering chart: Malformed data</div>);
              }
              lastIdx = chartPattern.lastIndex;
            }
            parts.push(msg.content.slice(lastIdx));
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
    <div className="flex h-[650px] bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      
      {/* Sidebar Panel */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }} 
            animate={{ width: 280, opacity: 1 }} 
            exit={{ width: 0, opacity: 0 }} 
            className="border-r border-white/5 bg-slate-950/50 flex flex-col overflow-hidden"
          >
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="font-extrabold text-white text-sm tracking-widest uppercase">History</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-all"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="p-4 space-y-3">
              <button onClick={handleNewSession} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-xl hover:bg-emerald-500/20 transition-all uppercase tracking-widest text-[11px] shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
              {messages.length > 0 && (
                <button onClick={handleDownloadReport} className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold rounded-xl hover:bg-cyan-500/20 transition-all uppercase tracking-widest text-[11px] shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <Download className="w-3.5 h-3.5" />
                  PDF Report
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
              {historyList.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => switchSession(item.id)}
                  className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${item.id === currentSessionId ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-50' : 'bg-white/[0.03] border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'}`}
                >
                  <span className="text-xs font-bold leading-tight truncate">{item.title}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all group shrink-0"
              >
                <History className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          <div>
            <h3 className="font-extrabold text-white text-lg tracking-tight italic">Mitra AI</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Hinglish Guardian</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => { setIsWebSearchEnabled(!isWebSearchEnabled); if (isWebSearchEnabled) setIsDeepSearchEnabled(false); }} className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 border ${isWebSearchEnabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-500 opacity-40"}`}>
            <Globe className="w-3.5 h-3.5" />
            {isWebSearchEnabled ? "Online" : "Offline"}
          </button>
          <AnimatePresence>
            {isWebSearchEnabled && (
              <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={() => setIsDeepSearchEnabled(!isDeepSearchEnabled)} className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 border ${isDeepSearchEnabled ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                <Sparkles className="w-3.5 h-3.5" />
                {isDeepSearchEnabled ? "Deep Search" : "Fast Search"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth custom-scrollbar">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400/40 gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center">
              <Sparkles className="w-10 h-10 opacity-20" />
            </div>
            <p className="max-w-[280px] text-center text-sm font-medium italic">"Financial security ka bharosa, Mitra AI ka saath." 👋</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`flex group ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-4 max-w-[90%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 border ${msg.role === "user" ? "bg-slate-800 border-white/5" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}>
                  {msg.role === "user" ? <User className="w-5 h-5 text-slate-500" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`px-5 py-4 rounded-3xl text-[14px] leading-relaxed tracking-wide shadow-2xl ${msg.role === "user" ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none" : "bg-slate-800/60 text-slate-200 rounded-tl-none border border-white/5 backdrop-blur-md"}`}>
                  {renderMessageContent(msg)}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && <TypingDots />}
      </div>

      <div className="p-6 bg-slate-950/40 border-t border-white/5 backdrop-blur-3xl">
        {activeDocs.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
            {activeDocs.map((doc, i) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }}
                key={i} 
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] text-cyan-400 font-bold whitespace-nowrap shadow-[0_0_10px_rgba(6,182,212,0.1)] group cursor-default"
                title={`Active Document: ${doc.filename} (${doc.type || 'File'}) - Integrated in context`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {doc.filename}
                <button 
                  onClick={() => handleRemoveDocument(doc.filename)}
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5 rounded-full hover:bg-cyan-500/20"
                  title="Remove Document from Context"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
        <div className="relative flex gap-3 max-w-5xl mx-auto">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading}
            className={`px-4 py-4 bg-slate-900/50 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all group ${activeDocs.length > 0 ? 'border-cyan-500/30 bg-cyan-500/5' : ''}`}
            title="Upload Document (PDF, Image, CSV, Text)"
          >
            <Paperclip className={`w-5 h-5 transition-all ${isUploading ? 'text-emerald-400 animate-bounce' : activeDocs.length > 0 ? 'text-cyan-400' : 'text-slate-400 group-hover:text-white'}`} />
          </button>

          <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls,.txt" />
          
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder={isUploading ? "Uploading file..." : "Ask Mitra... (Documents & Search active)"} disabled={isLoading || isStreaming} className="flex-1 bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white" />
          
          <button onClick={toggleRecording} className={`w-14 h-14 rounded-2xl border transition-all flex items-center justify-center outline-none ${isRecording ? 'bg-red-500/20 border-red-500 animate-pulse text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-slate-900/50 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button onClick={handleSend} disabled={!input.trim() || isLoading} className="px-6 py-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-xl shadow-cyan-500/20 active:scale-95 transition-all outline-none">
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
