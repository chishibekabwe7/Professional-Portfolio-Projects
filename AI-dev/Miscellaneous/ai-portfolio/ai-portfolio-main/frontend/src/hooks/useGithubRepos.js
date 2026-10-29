import { useState, useEffect } from 'react'
import { fetchUserRepos } from '../services/github'

export const useGithubRepos = (username, limit = 6) => {
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadRepos = async () => {
      try {
        const data = await fetchUserRepos(username)
        setRepos(data.filter(repo => !repo.fork).slice(0, limit))
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    
    loadRepos()
  }, [username, limit])

  return { repos, loading, error }
} 