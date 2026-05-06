'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  disabled?: boolean;
  onSendMessage: (content: string) => void;
}

export function ChatInput({ disabled, onSendMessage }: ChatInputProps) {
  const [input, setInput] = useState('');
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTypingChangeRef = useRef<((typing: boolean) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    if (onTypingChangeRef.current) {
      if (value.trim().length === 0) {
        onTypingChangeRef.current(false);
        if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
        return;
      }
      onTypingChangeRef.current(true);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = setTimeout(() => onTypingChangeRef.current?.(false), 1500);
    }
  }, []);

  const handleSend = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
    if (onTypingChangeRef.current) onTypingChangeRef.current(false);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
  }, [input, disabled, onSendMessage]);

  // Expose typing callbacks via ref so parent can attach handlers without re-renders.
  useEffect(() => {
    (window as any).__chatInputTypingHandlers = {
      setOnChange: (fn: (typing: boolean) => void) => { onTypingChangeRef.current = fn; },
    };
    return () => { delete (window as any).__chatInputTypingHandlers; };
  }, []);

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
