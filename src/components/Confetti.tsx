'use client';

import { useEffect, useState } from 'react';
import { lake } from '@/lib/colors';

// Celebratory palette — defending champion's accent colors plus a neutral.
const COLORS = [lake.goldBright, lake.blue, lake.ice];

interface Piece {
  id: number;
  left: string;
  width: string;
  height: string;
  color: string;
  fallDuration: string;
  swayDuration: string;
  delay: string;
  borderRadius: string;
}

interface ConfettiProps {
  /** Unique key (e.g. championship year) — confetti fires once per key, then
   *  stays quiet on revisits until the key changes (i.e. a new champion). */
  occasionId: string;
}

export default function Confetti({ occasionId }: ConfettiProps) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Fire once per occasion. Switching from session- to localStorage means
    // the user gets a new celebration when a new champion is crowned, even
    // months later — but doesn't get confetti on every refresh.
    const storageKey = `lakelandcup:champion-celebrated:${occasionId}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    setPieces(
      Array.from({ length: 72 }, (_, i) => ({
        id: i,
        left: `${rand(0, 100)}%`,
        width: `${rand(5, 10)}px`,
        height: `${rand(8, 16)}px`,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        fallDuration: `${rand(3.5, 6.5)}s`,
        swayDuration: `${rand(2, 4)}s`,
        delay: `${rand(0, 5)}s`,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }))
    );
  }, [occasionId]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            animationDuration: `${p.fallDuration}, ${p.swayDuration}`,
            animationDelay: `${p.delay}, ${p.delay}`,
            borderRadius: p.borderRadius,
          }}
        />
      ))}
    </div>
  );
}
