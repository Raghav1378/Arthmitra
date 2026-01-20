"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Chat() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, is_local_only: false })
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      let aiMsgContent = '';
      setMessages(prev => [...prev, { role: 'bot', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.substring(6));
              
              if (event.content) {
                aiMsgContent += event.content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  // Ensure we are updating the bot message, not creating a new one
                  if (last && last.role === 'bot') {
                    return [...prev.slice(0, -1), { ...last, content: aiMsgContent }];
                  }
                  return prev;
                });
              } else if (event.error) {
                console.error("Agent Error:", event.error);
              }
            } catch (e) {
              // Silently handle partial chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 italic">Mitra AI</h3>
            <p className="text-xs text-emerald-400 font-medium">Hinglish Advisor Online</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
            <p className="max-w-[200px]">Namaste! Ask me about UPI security, taxes, or spending.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-cyan-600/30 text-cyan-400'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700 flex gap-2">
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75" />
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-900/50 border-t border-slate-800">
        <div className="relative">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your query (e.g., Ye UPI link safe hai?)..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          />
          <button 
            onClick={handleSend}
            className="absolute right-3 top-3 p-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
