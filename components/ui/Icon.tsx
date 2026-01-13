// Temporary Icon component - Will be replaced with Flaticon uicons
// For now, using simple SVG shapes as placeholders

import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export default function Icon({ name, size = 24, className = '', color = 'currentColor' }: IconProps) {
  const icons: Record<string, JSX.Element> = {
    // Navigation Icons (Placeholders - will be replaced with Flaticon)
    'play': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M8 5v14l11-7z" fill={color} />
      </svg>
    ),
    'puzzle': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="3" width="8" height="8" fill={color} />
        <rect x="13" y="13" width="8" height="8" fill={color} />
      </svg>
    ),
    'learn': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 6h16M4 12h16M4 18h16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'watch': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
        <circle cx="12" cy="12" r="3" fill={color} />
      </svg>
    ),
    'news': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="2" />
        <path d="M7 9h10M7 13h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'social': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke={color} strokeWidth="2" />
        <circle cx="17" cy="11" r="3" stroke={color} strokeWidth="2" />
      </svg>
    ),
    'more': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="6" r="2" fill={color} />
        <circle cx="12" cy="12" r="2" fill={color} />
        <circle cx="12" cy="18" r="2" fill={color} />
      </svg>
    ),
    // Action Icons
    'settings': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
        <path d="M12 1v6m0 6v10M23 12h-6m-10 0H1" stroke={color} strokeWidth="2" />
      </svg>
    ),
    'search': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
        <path d="m21 21-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'copy': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth="2" />
      </svg>
    ),
    'link': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'close': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'check': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M20 6 9 17l-5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    // User Icons
    'user': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="8" r="5" stroke={color} strokeWidth="2" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2" stroke={color} strokeWidth="2" />
      </svg>
    ),
    'logout': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    // Game Icons
    'flag': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 22V4M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    'crown': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M2 18h20M4 12l4 4 4-8 4 8 4-4v6H4z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
  };

  return icons[name] || icons['more'];
}

// Export icon names for TypeScript autocomplete
export type IconName = keyof typeof icons;
