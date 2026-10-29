import { useState, useRef, useEffect } from 'react';
import { useStreamingChat } from '../../../hooks/useStreamingChat';
import { Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { getPersonalInfo } from '../../../config/configLoader';

export const ChatBox = () => {
  const [input, setInput] = useState('');
  const [userEngaged, setUserEngaged] = useState(false);
  const { messages, isLoading, error, sendMessage, stopAnswering } = useStreamingChat();
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const lastMessageCountRef = useRef(messages.length);
  
  const personalInfo = getPersonalInfo();
  const firstName = personalInfo?.name.split(' ')[0] || 'AI';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!userEngaged) {
      lastMessageCountRef.current = messages.length;
      return;
    }
    if (messages.length > lastMessageCountRef.current) {
      scrollToBottom();
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, userEngaged]);

  const handleSubmit = async (message) => {
    setUserEngaged(true);
    
    const chatRequest = {
      message,
      messages: messages.filter(msg => !msg.isTyping),
      session_id: localStorage.getItem('chatSessionId') || 'default-session',
      timestamp: Date.now() / 1000
    };

    await sendMessage(chatRequest);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900 rounded-2xl p-4 min-h-[400px] flex flex-col border border-purple-500/20 shadow-lg relative"
      >
        {/* Chat Header */}
        <motion.div 
          className="relative flex items-center justify-between p-2 sm:p-4 mb-4 overflow-hidden rounded-xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated background gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-transparent"
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Main content */}
          <div className="relative flex items-center gap-2 flex-shrink-0">
            {/* Animated robot icon */}
            <motion.div
              className="relative flex-shrink-0"
              whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50" />
              <div className="relative bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-xl shadow-lg shadow-purple-500/20">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </motion.div>

            {/* Title with sparkle */}
            <div className="flex items-center gap-1 sm:gap-2">
              <motion.h2 
                className="text-sm sm:text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {firstName}'s AI
              </motion.h2>
              <motion.div
                animate={{
                  rotate: [0, 20, -20, 0],
                  scale: [1, 1.2, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="flex-shrink-0"
              >
                <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 text-purple-400" />
              </motion.div>
            </div>
          </div>

          {/* Status indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 ml-2 sm:ml-4 flex-shrink-0"
          >
            <motion.div
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Online</span>
          </motion.div>
        </motion.div>

        {/* Messages container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[300px] scroll-smooth scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-gray-800/50 pr-4"
        >
          <AnimatePresence>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && !messages.some(msg => msg.isTyping) && (
              <TypingIndicator key="loading-indicator" />
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-red-400 mb-4 text-center bg-red-500/10 p-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input form */}
        <div className="relative z-10">
          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            onStop={stopAnswering}
          />
        </div>
      </motion.div>
    </div>
  );
}; 