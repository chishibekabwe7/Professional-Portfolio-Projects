import { motion, AnimatePresence } from 'framer-motion';
import { Send, Square } from 'lucide-react';
import { getChatConfig } from '../../../config/configLoader';

export const ChatInput = ({ input, setInput, isLoading, onSubmit, onStop }) => {
  const chatConfig = getChatConfig();
  const placeholder = chatConfig?.inputPlaceholder || 'Ask me anything...';
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim());
    setInput('');
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-xl border border-purple-500/20"
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent text-white rounded-lg px-4 py-2 focus:outline-none placeholder-gray-400 overflow-hidden text-ellipsis whitespace-nowrap"
        disabled={isLoading}
      />
      
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.button
            key="stop"
            type="button"
            onClick={onStop}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 bg-gradient-to-r from-red-500/80 to-orange-500/80 text-white p-3 rounded-lg transition-all duration-200 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:from-red-500/90 hover:to-orange-500/90"
          >
            <Square className="w-5 h-5" />
          </motion.button>
        ) : (
          <motion.button
            key="send"
            type="submit"
            disabled={!input.trim()}
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: -180 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.form>
  );
}; 