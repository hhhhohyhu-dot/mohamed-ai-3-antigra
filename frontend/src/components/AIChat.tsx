"use client";
import React, { useState } from 'react';
import { fetchChat } from '../services/api';
import { Send, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export const AIChat = ({ symbol, context }: { symbol: string, context: any }) => {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetchChat(symbol, userMsg, context);
      setMessages(prev => [...prev, { role: 'ai', content: res.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Error communicating with AI.' }]);
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col h-[500px]"
    >
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <MessageSquare className="mr-2 text-blue-400" /> Ask AI about {symbol}
      </h3>
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-10">Ask a question like "Is this a good time to buy?" or "What are the support levels?"</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-slate-800 mr-auto'}`}>
            <p className="text-sm">{msg.content}</p>
          </div>
        ))}
        {loading && <div className="text-slate-500 text-sm animate-pulse">AI is thinking...</div>}
      </div>
      <div className="flex space-x-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask a trading question..."
          className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition-colors flex items-center justify-center">
          <Send size={20} />
        </button>
      </div>
    </motion.div>
  );
};
