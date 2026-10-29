import { motion } from 'framer-motion'
import { Github } from 'lucide-react'
import { useGithubRepos } from '../../../hooks/useGithubRepos'

export const ProjectsSection = () => {
  const { repos, loading, error } = useGithubRepos('alonxt', 6)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error loading projects</div>

  return (
    <motion.div
      key="projects"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8 px-4 md:px-6"
    >
      {repos.map((repo, index) => (
        <motion.div
          key={repo.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group relative min-h-[200px] flex w-full"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent rounded-lg transform group-hover:scale-105 transition-transform" />
          <div className="relative p-4 md:p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm w-full flex flex-col">
            <h3 className="text-xl font-bold mb-2 truncate">{repo.name}</h3>
            <p className="text-gray-400 mb-4 flex-grow line-clamp-3 sm:line-clamp-2">
              {repo.description || 'No description available'}
            </p>
            <div className="flex items-center gap-4">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors inline-flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                <span>View Project</span>
              </a>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
} 