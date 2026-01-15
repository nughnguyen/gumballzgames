'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
  className?: string;
  isOpenMobile?: boolean; // Kept for mobile implementation if controlled externally
  onCloseMobile?: () => void;
}

const QUICK_ICONS = ['👍', '👋', '😂', '💀', '😱', '😡', '🤔', '🎉', '🚀', '🎯'];

export default function ChatPanel({
  messages,
  onSendMessage,
  currentUserId,
  className = '',
  isOpenMobile = false,
  onCloseMobile,
}: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false); // Collapsible State
  const [unreadCount, setUnreadCount] = useState(0);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom when messages change or panel opens
  useEffect(() => {
    if (isOpen || isOpenMobile) {
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isOpenMobile]);

  // Handle Unread Count
  useEffect(() => {
    if ((!isOpen && !isOpenMobile) && messages.length > lastMessageCountRef.current) {
        setUnreadCount(prev => prev + (messages.length - lastMessageCountRef.current));
    }
    if (isOpen || isOpenMobile) {
        setUnreadCount(0);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, isOpen, isOpenMobile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
      setShowIconPicker(false);
    }
  };

  const sendQuickIcon = (icon: string) => {
      onSendMessage(icon);
      setShowIconPicker(false);
  };

  return (
    <>
      {/* 
        Desktop Collapsible Toggle Button 
        Only visible on md+ screens where it's not fixed full height
      */}
      <button
         onClick={() => {
             setIsOpen(!isOpen);
             if (!isOpen) setUnreadCount(0);
         }}
         className={`
            hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full 
            items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-[var(--bg-primary)]
            ${isOpen 
                ? 'bg-red-500 text-white rotate-90' 
                : 'bg-[var(--accent-green)] text-white rotate-0'
            }
         `}
         title={isOpen ? "Close Chat" : "Open Chat"}
      >
         {isOpen ? <i className="fi fi-rr-cross"></i> : <i className="fi fi-rr-comment-alt"></i>}
         
         {/* Unread Badge */}
         {!isOpen && unreadCount > 0 && (
             <div className="absolute -top-2 -right-1 w-6 h-6 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--bg-primary)] animate-bounce shadow-lg">
                 {unreadCount > 9 ? '9+' : unreadCount}
             </div>
         )}
      </button>

      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 backdrop-blur-sm ${
          isOpenMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
      />

      {/* Chat Container */}
      <div className={`
        flex flex-col bg-[var(--bg-secondary)]/95 backdrop-blur-md border-l border-[var(--border-primary)]
        fixed inset-y-0 right-0 w-80 z-40 shadow-2xl transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)
        ${/* Mobile Logic */ isOpenMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${/* Desktop Collapsible Logic */ !isOpenMobile ? (isOpen ? 'md:translate-x-0' : 'md:translate-x-[150%]') : ''}
        md:top-24 md:bottom-24 md:right-6 md:h-auto md:w-80 md:rounded-2xl md:inset-auto md:border md:border-[var(--border-primary)]
        ${className}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--bg-secondary)]/50 shrink-0 md:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isOpen ? 'bg-[var(--accent-green)] text-white shadow-lg shadow-green-500/20' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                 <i className="fi fi-rr-comment-alt-middle"></i>
            </div>
            <div>
                 <h3 className="font-bold text-[var(--text-primary)] text-sm tracking-wide">COMMS CHANNEL</h3>
                 <div className="flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse shadow-[0_0_5px_var(--accent-green)]"></span>
                     <span className="text-[10px] text-[var(--text-tertiary)] font-mono uppercase">Online</span>
                 </div>
            </div>
          </div>
          {onCloseMobile && (
            <button 
                onClick={onCloseMobile} 
                className="md:hidden w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <i className="fi fi-rr-cross-small text-xl"></i>
            </button>
          )}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-primary)]/50 custom-scrollbar md:h-[400px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
              <div className="w-20 h-20 bg-[var(--bg-tertiary)]/30 rounded-full flex items-center justify-center mb-4 border border-[var(--border-primary)]">
                  <i className="fi fi-rr-comments text-3xl text-[var(--text-tertiary)]"></i>
              </div>
              <p className="text-[var(--text-secondary)] font-bold text-sm tracking-wide">SILENCE DETECTED</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Initiate communication protocol.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isSystem = msg.isSystem;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-4">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]/30 px-3 py-1 rounded-sm border border-[var(--border-primary)] tracking-widest backdrop-blur-sm text-center">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                    <div className={`flex items-end gap-2 max-w-[90%] group ${isMe ? 'flex-row-reverse' : ''}`}>
                         {/* Avatar */}
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-sm border border-white/10 ${isMe ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-blue)]'}`}>
                            {msg.senderName[0]?.toUpperCase()}
                        </div>
                        
                        <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                             {!isMe && <span className="text-[9px] text-[var(--text-tertiary)] ml-1 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{msg.senderName}</span>}
                             <div
                                className={`px-3 py-2 text-sm shadow-md transition-all hover:shadow-lg ${
                                    isMe
                                    ? 'bg-[var(--accent-green)]/90 text-white rounded-2xl rounded-tr-sm backdrop-blur-sm border border-green-400/20'
                                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-2xl rounded-tl-sm border border-[var(--border-primary)]'
                                }`}
                             >
                                <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                             </div>
                        </div>
                    </div>
                    <span className={`text-[9px] text-[var(--text-tertiary)] mt-1 px-1 font-mono opacity-50 ${isMe ? 'mr-9' : 'ml-9'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] md:rounded-b-2xl relative">
          
          {/* Icon Picker Popover */}
          <div className={`absolute bottom-full left-0 right-0 p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] transition-all duration-200 overflow-hidden shadow-xl ${showIconPicker ? 'h-auto opacity-100 visible translate-y-0' : 'h-0 opacity-0 invisible translate-y-4 pointer-events-none'}`}>
             <div className="grid grid-cols-5 gap-2">
                 {QUICK_ICONS.map(icon => (
                     <button 
                        key={icon}
                        onClick={() => sendQuickIcon(icon)}
                        className="text-xl hover:bg-[var(--bg-tertiary)] p-2 rounded-lg transition-colors hover:scale-110 active:scale-95 flex items-center justify-center"
                     >
                        {icon}
                     </button>
                 ))}
             </div>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-[var(--bg-primary)] p-1.5 rounded-xl border border-[var(--border-primary)] focus-within:border-[var(--accent-green)] focus-within:ring-1 focus-within:ring-[var(--accent-green)]/30 transition-all">
            <button
               type="button"
               onClick={() => setShowIconPicker(!showIconPicker)}
               className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${showIconPicker ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
            >
               <i className="fi fi-rr-smile text-lg"></i>
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none min-w-0"
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
