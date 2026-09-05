'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type AnimatedCounterProps = Readonly<{
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}>;

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      const counter = { val: 0 };
      gsap.to(counter, {
        val: value,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 90%',
          once: true,
        },
        onUpdate: () => {
          if (ref.current) {
            const formatted =
              decimals > 0
                ? counter.val.toFixed(decimals)
                : Math.floor(counter.val).toLocaleString('en-KE');
            ref.current.textContent = `${prefix}${formatted}${suffix}`;
          }
        },
      });
    },
    { scope: ref, dependencies: [value, suffix, prefix, decimals] },
  );

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
