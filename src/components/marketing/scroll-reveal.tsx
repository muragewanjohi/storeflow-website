'use client';

import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type ScrollRevealProps = Readonly<{
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  stagger?: number;
  childSelector?: string;
}>;

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  y = 48,
  stagger = 0.1,
  childSelector,
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const targets = childSelector
        ? containerRef.current?.querySelectorAll(childSelector)
        : containerRef.current;

      if (!targets) return;

      gsap.from(targets, {
        y,
        opacity: 0,
        duration: 1,
        delay,
        stagger: childSelector ? stagger : 0,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
