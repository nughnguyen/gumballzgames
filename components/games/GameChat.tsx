'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'me' | 'opponent' | 'system';
  text: string;
  timestamp: number;
}

interface GameChatProps {
  roomId: string;
  opponentName?: string;
}

export default function GameChat({ roomId, opponentName = 'Opponent' }: GameChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Add welcome message with tutorial on mount
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      sender: 'system',
      text: `📖 How to play:\n\n• Click once to preview your move\n• Click again to confirm placement\n• Drag to pan around the 100x100 board\n• Get 5 in a row to win!`,
      timestamp: Date.now(),
    };
    setMessages([welcomeMessage]);
  }, []); // Only run on mount

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'me',
        text: inputText.trim(),
        timestamp: Date.now(),
      };
      
      setMessages([...messages, newMessage]);
      setInputText('');
      
      // TODO: Broadcast message via Supabase Realtime
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h3 className="text-white font-semibold">Chat</h3>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isOpen ? '−' : '+'}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No messages yet</p>
                <p className="text-sm mt-2">Say hi to {opponentName}!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'system' 
                      ? 'justify-center' 
                      : message.sender === 'me' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`${
                      message.sender === 'system' 
                        ? 'w-full bg-accent-green/10 border border-accent-green/30 rounded-lg px-4 py-3'
                        : `max-w-[80%] rounded-lg px-4 py-2 ${
                            message.sender === 'me'
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-700 text-gray-100'
                          }`
                    }`}
                  >
                    <p className={`text-sm break-words whitespace-pre-line ${
                      message.sender === 'system' ? 'text-text-primary' : ''
                    }`}>
                      {message.text}
                    </p>
                    {message.sender !== 'system' && (
                      <p className="text-xs opacity-70 mt-1">{formatTime(message.timestamp)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                maxLength={200}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {inputText.length}/200 characters
            </p>
          </form>
        </>
      )}
    </div>
  );
}
