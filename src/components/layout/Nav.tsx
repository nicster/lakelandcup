'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavProps {
  className?: string;
  onItemClick?: () => void;
}

const navItems = [
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/history', label: 'History' },
  { href: '/rules', label: 'Rules' },
  { href: '/drafts', label: 'Drafts' },
  { href: '/protection', label: 'Protection' },
  { href: '/trades', label: 'Trades', disabled: true },
  { href: '/members', label: 'Members', disabled: true },
];

export default function Nav({ className = '', onItemClick }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className={`items-center gap-1 ${className}`}>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const baseClasses = 'px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] inline-flex items-center';

        if (item.disabled) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              className={`${baseClasses} text-lake-ice-muted cursor-not-allowed inline-flex items-center gap-1.5`}
            >
              {item.label}
              <span className="text-[10px] uppercase tracking-wider text-lake-ice-muted border border-lake-ice/30 rounded px-1 py-px">
                Soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={`${baseClasses} ${
              isActive
                ? 'bg-lake-blue-light/30 text-lake-gold'
                : 'text-lake-ice/70 hover:text-lake-ice hover:bg-lake-blue-light/20'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
