import { useState, useEffect } from 'react'

export const useTypingEffect = (content, speed = 30) => {
  const [displayedContent, setDisplayedContent] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    if (!content) {
      setDisplayedContent('')
      setIsTyping(true)
      return
    }

    if (!isTyping) return

    let currentIndex = 0
    const textLength = content.length

    const typingInterval = setInterval(() => {
      currentIndex++
      if (currentIndex <= textLength) {
        setDisplayedContent(content.slice(0, currentIndex))
      } else {
        clearInterval(typingInterval)
        setIsTyping(false)
      }
    }, speed)

    return () => clearInterval(typingInterval)
  }, [content, isTyping, speed])

  return { displayedContent, isTyping, setIsTyping, setDisplayedContent }
} 