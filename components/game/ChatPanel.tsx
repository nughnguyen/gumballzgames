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
        flex flex-col bg-secondary border-l border-border-primary 
        md:relative md:w-80 md:translate-x-0 md:h-auto md:z-0
        fixed inset-y-0 right-0 w-80 z-50 bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${className}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-border-primary flex items-center justify-between bg-secondary">
          <div className="flex items-center gap-2">
            <i className="fi fi-rr-comment-alt text-accent-green"></i>
            <h3 className="font-bold text-text-primary">Chat Room</h3>
          </div>
          {onCloseMobile && (
            <button onClick={onCloseMobile} className="md:hidden text-text-secondary hover:text-white">
              <i className="fi fi-rr-cross"></i>
            </button>
          )}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-primary/50">
          {messages.length === 0 ? (
            <div className="text-center text-text-tertiary mt-8">
              <p>No messages yet.</p>
              <p className="text-sm">Say hello to your opponent!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isSystem = msg.isSystem;

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="text-xs text-text-tertiary bg-secondary px-2 py-1 rounded-full border border-border-primary">
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
                  <div className="flex items-end gap-2 max-w-[85%]">
                    {!isMe && (
                      <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-xs text-accent-blue font-bold shrink-0 border border-accent-blue/30">
                        {msg.senderName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm break-words ${
                        isMe
                          ? 'bg-accent-green text-white rounded-br-none'
                          : 'bg-secondary border border-border-primary text-text-primary rounded-bl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                  <span className="text-[10px] text-text-tertiary mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border-primary bg-secondary">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent-green focus:ring-1 focus:ring-accent-green outline-none"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-accent-green text-white p-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <i className="fi fi-rr-paper-plane-top"></i>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
