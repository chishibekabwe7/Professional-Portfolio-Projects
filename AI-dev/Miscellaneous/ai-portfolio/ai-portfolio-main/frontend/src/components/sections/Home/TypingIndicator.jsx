import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';


export const TypingIndicator = ({ inline = false }) => {
  // If inline, render just the dots
  if (inline) {
    return (
      <span className="inline-flex gap-1 ml-1" data-testid="typing-indicator-inline">
        {[0, 0.15, 0.3].map((delay, i) => (
          <span
            key={i}
            className="w-1 h-1 bg-white rounded-full animate-bounce"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </span>
    );
  }

  // Otherwise render the full message bubble with avatar
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 justify-start mb-4"
      data-testid="ai-typing-indicator"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
        <Bot className="w-4 h-4 text-purple-400" />
      </div>
      <div className="flex flex-col items-start max-w-[80%]">
        <div className="rounded-2xl p-4 bg-gray-800/80 text-gray-200 w-full">
          <div className="flex items-center gap-2">
            <span className="inline-flex gap-1">
              {[0, 0.15, 0.3].map((delay, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 