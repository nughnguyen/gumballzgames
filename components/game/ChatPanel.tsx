'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
  className?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  currentUserId,
  className = '',
  isOpenMobile = false,
  onCloseMobile,
}: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpenMobile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          isOpenMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
      />

      {/* Chat Container */}
      <div className={`
        flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-primary)]
        md:relative md:w-80 md:translate-x-0 md:h-full md:z-0
        fixed inset-y-0 right-0 w-80 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${className}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-green)]/10 flex items-center justify-center">
                 <i className="fi fi-rr-comment-alt text-[var(--accent-green)]"></i>
            </div>
            <div>
                 <h3 className="font-bold text-[var(--text-primary)] text-sm">Game Chat</h3>
                 <div className="flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse"></span>
                     <span className="text-[10px] text-[var(--text-tertiary)]">Live</span>
                 </div>
            </div>
          </div>
          {onCloseMobile && (
            <button 
                onClick={onCloseMobile} 
                className="md:hidden w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"
            >
              <i className="fi fi-rr-cross-small text-xl"></i>
            </button>
          )}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-primary)] custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-50">
              <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-3">
                  <i className="fi fi-rr-comments text-2xl text-[var(--text-tertiary)]"></i>
              </div>
              <p className="text-[var(--text-secondary)] font-semibold">No messages yet</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Chat with other players here!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isSystem = msg.isSystem;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-3">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]/50 px-3 py-1 rounded-full border border-[var(--border-primary)] tracking-wide">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-slide-in opacity-0 fill-mode-forwards`}
                  style={{animation: 'fadeIn 0.3s ease-out forwards'}}
                >
                    <div className="flex items-end gap-2 max-w-[85%]">
                        {!isMe && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-blue-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-sm">
                            {msg.senderName[0]?.toUpperCase()}
                        </div>
                        )}
                        <div className="flex flex-col gap-1">
                             {!isMe && <span className="text-[10px] text-[var(--text-tertiary)] ml-1">{msg.senderName}</span>}
                             <div
                                className={`px-3 py-2 text-sm shadow-sm ${
                                    isMe
                                    ? 'bg-[var(--accent-green)] text-white rounded-2xl rounded-br-none'
                                    : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-2xl rounded-bl-none'
                                }`}
                             >
                                <p className="leading-relaxed">{msg.content}</p>
                             </div>
                        </div>
                    </div>
                    <span className={`text-[9px] text-[var(--text-tertiary)] mt-1 px-1 ${isMe ? 'mr-1' : 'ml-9'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)]">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-[var(--bg-primary)] p-1.5 rounded-xl border border-[var(--border-primary)] focus-within:border-[var(--accent-green)] focus-within:ring-1 focus-within:ring-[var(--accent-green)]/30 transition-all">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none min-w-0"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="w-9 h-9 flex items-center justify-center bg-[var(--accent-green)] text-white rounded-lg hover:brightness-110 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
            >
              <i className="fi fi-rr-paper-plane-top text-xs translate-x-px translate-y-px"></i>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
