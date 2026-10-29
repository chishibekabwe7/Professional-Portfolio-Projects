import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const useSession = () => {
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = () => {
    const existingSessionId = localStorage.getItem('chatSessionId');
    if (existingSessionId) {
      setSessionId(existingSessionId);
    } else {
      const newSessionId = uuidv4();
      localStorage.setItem('chatSessionId', newSessionId);
      setSessionId(newSessionId);
    }
  };

  const startNewSession = () => {
    const newSessionId = uuidv4();
    localStorage.setItem('chatSessionId', newSessionId);
    setSessionId(newSessionId);
    return newSessionId;
  };

  return { sessionId, startNewSession };
}; 