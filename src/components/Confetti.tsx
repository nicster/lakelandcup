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

export default function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Fire only once per session — repeat visits shouldn't keep raining confetti.
    if (sessionStorage.getItem('lakelandcup:champion-confetti-seen')) return;
    sessionStorage.setItem('lakelandcup:champion-confetti-seen', '1');

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
  }, []);

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
