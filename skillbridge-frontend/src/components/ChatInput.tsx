'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  disabled?: boolean;
  onSendMessage: (content: string) => void;
  onTypingChange?: (typing: boolean) => void;
}

export function ChatInput({ disabled, onSendMessage, onTypingChange }: ChatInputProps) {
  const [input, setInput] = useState('');
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, []);

  const emitTyping = useCallback((typing: boolean) => {
    onTypingChange?.(typing);
  }, [onTypingChange]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    if (value.trim().length === 0) {
      emitTyping(false);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      return;
    }
    emitTyping(true);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => emitTyping(false), 1500);
  }, [emitTyping]);

  const handleSend = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
    emitTyping(false);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
  }, [input, disabled, onSendMessage, emitTyping]);

  return (
    <form onSubmit={handleSend} className="p-3 border-t border-border bg-surface flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={disabled}
        placeholder="Type a message…"
        className="input-base !rounded-lg flex-1"
      />
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="btn-primary !px-3 !py-2 flex items-center justify-center disabled:opacity-50"
        aria-label="Send"
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </form>
  );
}
