import { motion } from 'framer-motion';
import { BookOpen, Brain, MessageSquareText } from 'lucide-react';
import { getContentConfig } from '../../../config/configLoader';

export const IntroSection = () => {
  const contentConfig = getContentConfig();
  const content = contentConfig?.intro || {
    cards: [],
    paragraphs: []
  };
  
  // Map of icon components by name
  const iconMap = {
    Brain,
    BookOpen,
    MessageSquareText
  };
  
  // Gradient classes for cards
  const gradientClasses = [
    "before:from-rose-500/10 before:via-purple-500/15 before:to-purple-500/10",
    "before:from-blue-500/10 before:via-cyan-500/15 before:to-blue-500/10",
    "before:from-emerald-500/10 before:via-teal-500/15 before:to-emerald-500/10"
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 md:mt-8 mb-4 md:mb-8">
      <div className="space-y-4 md:space-y-6">
        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {content.cards.map((card, index) => {
            const Icon = iconMap[card.icon] || Brain;
            const gradientClass = gradientClasses[index % gradientClasses.length];
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.2 }}
                className={`relative rounded-xl bg-black/10 overflow-hidden backdrop-blur-sm
                  before:absolute before:inset-0 before:bg-gradient-to-br ${gradientClass}
                  before:opacity-0 before:transition-opacity before:duration-500 before:ease-out before:blur-xl
                  hover:before:opacity-100 group`}
              >
                {/* Card content */}
                <div className="relative p-4 md:p-5 h-full flex flex-col items-center text-center">
                  <div className="mb-2 md:mb-4">
                    <Icon className="w-6 h-6 md:w-8 md:h-8 text-white/70 transition-colors duration-500 group-hover:text-white/90" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/80 mb-1 md:mb-2 transition-colors duration-500 group-hover:text-white/90">
                    {card.title}
                  </h3>
                  <p className="text-sm text-white/60 transition-colors duration-500 group-hover:text-white/80">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Content section */}
        <div className="text-center max-w-3xl mx-auto space-y-2 md:space-y-4">
          {content.paragraphs.map((paragraph, index) => (
            <p 
              key={index}
              className={index === 0 
                ? "text-base md:text-lg text-gray-300 leading-relaxed"
                : "text-sm md:text-base text-gray-400"}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}; 