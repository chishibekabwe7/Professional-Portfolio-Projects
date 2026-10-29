const GITHUB_API_BASE = 'https://api.github.com'

export const fetchUserRepos = async (username) => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/users/${username}/repos`)
    if (!response.ok) throw new Error('Failed to fetch repos')
    return await response.json()
  } catch (error) {
    console.error('Error fetching repos:', error)
    throw error
  }
} 