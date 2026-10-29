import { motion } from 'framer-motion'

export const BlogSection = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[50vh]"
    >
      <h1 className="text-4xl font-bold mb-4">Blog</h1>
      <p className="text-gray-400">Coming Soon!</p>
    </motion.div>
  )
} 