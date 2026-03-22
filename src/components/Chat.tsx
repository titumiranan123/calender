import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { ChatMessage } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isTyping: boolean;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isTyping }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Chat handleSubmit called with:', input);
    if (input.trim() && !isTyping) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="w-[400px] bg-white rounded-2xl shadow-sm border border-black/5 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-black/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="font-semibold tracking-tight">AI Assistant</h3>
          <p className="text-xs text-black/40 font-medium">Ready to schedule your day</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <CalendarIcon size={48} strokeWidth={1} />
            <p className="text-sm max-w-[200px]">
              Tell me what you need to do today, and I'll handle the scheduling.
            </p>
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === 'user'
                    ? "bg-black text-white rounded-tr-none shadow-lg shadow-black/5"
                    : "bg-[#F3F4F6] text-black rounded-tl-none"
                )}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-black/30 font-mono mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <div className="flex items-center gap-2 text-black/40 text-xs font-medium animate-pulse">
            <Loader2 size={14} className="animate-spin" />
            AI is thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 border-t border-black/5">
        <div className="relative flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Tell me your goals for today..."
            className="w-full bg-[#F3F4F6] border-none rounded-xl py-4 pl-4 pr-12 text-sm focus:ring-2 focus:ring-black/5 transition-all outline-none resize-none max-h-32 overflow-y-auto"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 bottom-2 w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center disabled:opacity-20 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
