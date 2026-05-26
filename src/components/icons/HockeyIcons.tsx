// Custom hockey-themed icons used in place of generic Heroicons where the
// hockey context adds identity. Stick to simple geometric shapes — busy line
// work fights the editorial type already on the page.

interface IconProps {
  className?: string;
}

export function PuckIcon({ className = '' }: IconProps) {
  // Side view of a hockey puck — two stacked ellipses give 3D depth.
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <ellipse cx="12" cy="9" rx="9" ry="2.6" />
      <path d="M3 9 V14" />
      <path d="M21 9 V14" />
      <path d="M3 14 a9 2.6 0 0 0 18 0" fill="currentColor" stroke="none" opacity="0.92" />
    </svg>
  );
}

export function FaceOffIcon({ className = '' }: IconProps) {
  // Center-ice face-off circle: outer ring + small center dot + crosshair.
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CrossedSticksIcon({ className = '' }: IconProps) {
  // Two crossed hockey sticks — a classic emblem.
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 3 L7 17 L3 17 L3 20" />
      <path d="M3 3 L17 17 L21 17 L21 20" />
    </svg>
  );
}

export function LakeCupIcon({ className = '' }: IconProps) {
  // Stylized tiered trophy in the spirit of the Stanley Cup — wide bowl on
  // top, four narrowing base tiers, broad plinth. Distinctive silhouette,
  // not a generic Heroicons trophy.
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {/* Bowl */}
      <path d="M7.5 2.5 H16.5 V6.5 C16.5 8.4 14.4 9.5 12 9.5 C9.6 9.5 7.5 8.4 7.5 6.5 Z" />
      {/* Tiered base — four rings, each slightly different width */}
      <rect x="9.5" y="10.2" width="5" height="1.3" rx="0.2" />
      <rect x="8.8" y="11.8" width="6.4" height="1.3" rx="0.2" />
      <rect x="9.3" y="13.4" width="5.4" height="1.3" rx="0.2" />
      <rect x="8.8" y="15"   width="6.4" height="1.3" rx="0.2" />
      {/* Plinth */}
      <rect x="6.5" y="16.8" width="11"  height="2.4" rx="0.3" />
      <rect x="5.5" y="19.6" width="13"  height="1.4" rx="0.3" />
    </svg>
  );
}

export function WhistleIcon({ className = '' }: IconProps) {
  // Referee whistle — for rules/regulations.
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="14" r="5.5" />
      <circle cx="9" cy="14" r="1" fill="currentColor" />
      <path d="M14.5 14 L20.5 14 L22 12 L22 16 L20.5 14" />
      <path d="M14 9 L20 5" />
    </svg>
  );
}
