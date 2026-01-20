'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import Nav from './Nav';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-lake-blue-dark/95 backdrop-blur-sm border-b border-lake-blue-light/20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/images/lakelandcup_2.png"
              alt="Lakeland Cup"
              width={40}
              height={40}
              className="drop-shadow-md"
            />
            <span className="font-semibold text-lg text-lake-ice hidden sm:block">
              Lakeland Cup
            </span>
          </Link>

          {/* Desktop Navigation */}
          <Nav className="hidden md:flex" />

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-lake-ice/70 hover:text-lake-ice transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-lake-blue-light/20">
            <Nav className="flex flex-col space-y-2" onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        )}
      </div>
    </header>
  );
}
