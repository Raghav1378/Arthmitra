"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Send, User, Sparkles, Loader2, Square } from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "bot" | "error";
  content: string;
  modelName?: string;
}

const uid = () => Math.random().toString(36).slice(2);

const SUGGESTIONS = [
  "Review my subscriptions — what should I cancel?",
  "How are my savings goals going? Am I on track?",
  "What scam patterns appear in my scan history?",
  "Where can I find money to save every month?",
];

export default function Advisor() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setIsStreaming(false);
  };

  const send = async (text: string) => {
    text = text.trim();
    if (!text || isLoading || isStreaming) return;
    setInput("");
    setMessages(prev => [...prev, { id: uid(), role: "user", content: text }]);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${getApiBaseUrl()}/advisor/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages
            .filter(m => m.role === "user" || m.role === "bot")
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      const botId = uid();
      setMessages(prev => [...prev, { id: botId, role: "bot", content: "" }]);

      let full = "";
      let buffer = "";
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
              if (event.token) {
                setIsLoading(false);
                setIsStreaming(true);
                full += event.token;
                setMessages(prev => prev.map(m =>
                  m.id === botId ? { ...m, content: full, modelName: event.model || m.modelName } : m));
              }
            } catch { /* partial json, next chunk completes it */ }
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages(prev => [...prev, { id: uid(), role: "error", content: `Failed: ${err.message}. Is Ollama running? (ollama serve)` }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="p-2.5 rounded-xl bg-gold-500/15 border border-gold-500/25">
          <Brain className="w-6 h-6 text-gold-600" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-parchment tracking-tight">Advisor</h2>
          <p className="text-xs text-parchment-faint">Reads your subscriptions, goals & scam scans — local Ollama, private</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-70">
            <div className="p-5 rounded-3xl bg-gold-500/10 border border-gold-500/25">
              <Sparkles className="w-10 h-10 text-gold-600" />
            </div>
            <p className="text-sm text-parchment-dim text-center max-w-md">
              I can see your subscriptions, savings goals and scam scan history.
              Ask me anything about your money.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="px-4 py-2 rounded-xl bg-ink-900/[0.03] border border-ink-900/[0.08] text-xs text-parchment-dim hover:border-gold-500/40 hover:text-gold-600 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map(m => (
            <motion.div key={m.id} layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role !== "user" && (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  m.role === "error" ? "bg-red-500/15 text-red-500" : "bg-gold-500/15 text-gold-600"}`}>
                  {m.role === "error" ? <Square className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-gold-500/15 border border-gold-500/25 text-parchment"
                  : m.role === "error"
                  ? "bg-red-500/10 border border-red-500/30 text-red-400"
                  : "bg-ink-900/[0.04] border border-ink-900/[0.08] text-parchment-dim"}`}>
                {m.content || (isLoading ? <Loader2 className="w-4 h-4 animate-spin text-parchment-faint" /> : "")}
                {m.role === "bot" && m.content && m.modelName && !isStreaming && (
                  <p className="text-[10px] text-parchment-faint font-mono uppercase tracking-widest mt-2">via {m.modelName}</p>
                )}
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-ink-900/[0.05] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-parchment-faint" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2 shrink-0">
        <input
          className="input-field flex-1"
          placeholder="Ask about your money…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send(input)}
          disabled={isLoading || isStreaming}
        />
        {(isLoading || isStreaming)
          ? <button onClick={stop} className="px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all">
              <Square className="w-4 h-4" />
            </button>
          : <button onClick={() => send(input)} disabled={!input.trim()}
              className="px-4 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-600 hover:bg-gold-500/25 transition-all disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>}
      </div>
    </div>
  );
}
