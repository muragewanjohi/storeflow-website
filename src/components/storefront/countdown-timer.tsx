/**
 * Countdown Timer Component
 * 
 * Displays a countdown timer for sales with end dates
 * 
 * Phase 4: Storefront - Sales Implementation
 */

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface CountdownTimerProps {
  endDate: Date | string;
  className?: string;
  showLabels?: boolean;
}

export default function CountdownTimer({
  endDate,
  className = '',
  showLabels = true,
}: Readonly<CountdownTimerProps>) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
      };
    };

    // Calculate immediately
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (!timeLeft) {
    return null;
  }

  if (timeLeft.expired) {
    return (
      <Badge variant="outline" className={className}>
        Sale Ended
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabels && <span className="text-sm font-medium">Ends in:</span>}
      <div className="flex items-center gap-1">
        {timeLeft.days > 0 && (
          <>
            <div className="flex flex-col items-center bg-muted rounded px-2 py-1 min-w-[3rem]">
              <span className="text-2xl font-bold">{String(timeLeft.days).padStart(2, '0')}</span>
              {showLabels && <span className="text-xs text-muted-foreground">Days</span>}
            </div>
            <span className="text-xl font-bold">:</span>
          </>
        )}
        <div className="flex flex-col items-center bg-muted rounded px-2 py-1 min-w-[3rem]">
          <span className="text-2xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</span>
          {showLabels && <span className="text-xs text-muted-foreground">Hours</span>}
        </div>
        <span className="text-xl font-bold">:</span>
        <div className="flex flex-col items-center bg-muted rounded px-2 py-1 min-w-[3rem]">
          <span className="text-2xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</span>
          {showLabels && <span className="text-xs text-muted-foreground">Mins</span>}
        </div>
        <span className="text-xl font-bold">:</span>
        <div className="flex flex-col items-center bg-muted rounded px-2 py-1 min-w-[3rem]">
          <span className="text-2xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</span>
          {showLabels && <span className="text-xs text-muted-foreground">Secs</span>}
        </div>
      </div>
    </div>
  );
}
