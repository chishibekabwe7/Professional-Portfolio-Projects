import { motion } from 'framer-motion'
import { Terminal } from 'lucide-react'
import { ChatBox } from './ChatBox'
import { IntroSection } from './IntroSection'
import { getPersonalInfo } from '../../../config/configLoader'

export const HomeSection = () => {
  const personalInfo = getPersonalInfo();
  
  return (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center text-center"
    >
      <motion.div 
        className="mb-4 relative"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
      >
        <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-purple-500 relative">
          <img 
            src="/profile.jpg" 
            alt={personalInfo.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent" />
        </div>
        <motion.div 
          className="absolute -bottom-2 -right-2 w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-full flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Terminal className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent leading-relaxed px-4 py-1"
      >
        {personalInfo.name}
      </motion.h1>
      
      <IntroSection />

      <ChatBox />

    </motion.div>
  )
} 