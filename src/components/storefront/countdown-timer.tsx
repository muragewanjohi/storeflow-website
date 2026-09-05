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
      <Badge 
        variant="secondary" 
        className={`px-4 py-2 text-sm font-semibold ${className}`}
      >
        Sale Ended
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
      {showLabels && (
        <span className="text-sm font-semibold text-primary uppercase tracking-wide">
          Ends in:
        </span>
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        {timeLeft.days > 0 && (
          <>
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-lg px-3 sm:px-4 py-2 sm:py-3 min-w-[3.5rem] sm:min-w-[4rem] shadow-lg">
                <span className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums block text-center">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
              </div>
              {showLabels && (
                <span className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">
                  Days
                </span>
              )}
            </div>
            <span className="text-xl sm:text-2xl font-bold text-muted-foreground self-start mt-2 sm:mt-3">:</span>
          </>
        )}
        <div className="flex flex-col items-center">
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-lg px-3 sm:px-4 py-2 sm:py-3 min-w-[3.5rem] sm:min-w-[4rem] shadow-lg">
            <span className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums block text-center">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
          </div>
          {showLabels && (
            <span className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">
              Hours
            </span>
          )}
        </div>
        <span className="text-xl sm:text-2xl font-bold text-muted-foreground self-start mt-2 sm:mt-3">:</span>
        <div className="flex flex-col items-center">
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-lg px-3 sm:px-4 py-2 sm:py-3 min-w-[3.5rem] sm:min-w-[4rem] shadow-lg">
            <span className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums block text-center">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
          </div>
          {showLabels && (
            <span className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">
              Mins
            </span>
          )}
        </div>
        <span className="text-xl sm:text-2xl font-bold text-muted-foreground self-start mt-2 sm:mt-3">:</span>
        <div className="flex flex-col items-center">
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-lg px-3 sm:px-4 py-2 sm:py-3 min-w-[3.5rem] sm:min-w-[4rem] shadow-lg">
            <span className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums block text-center">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
          {showLabels && (
            <span className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">
              Secs
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
