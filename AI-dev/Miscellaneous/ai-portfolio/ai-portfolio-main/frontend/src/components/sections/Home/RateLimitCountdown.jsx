import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const RateLimitCountdown = ({ seconds }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  if (timeLeft <= 0) return null;

  return (
    <div className="flex items-center gap-2 mt-2 text-sm text-red-300">
      <Clock className="w-4 h-4" />
      <span>Try again in {timeLeft} seconds</span>
    </div>
  );
}; 