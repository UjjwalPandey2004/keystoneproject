import React, { useId } from 'react';

interface KeystoneLogoProps {
  size?: number;
  title?: string;
}

// KEYSTONE mark: a faceted hexagon (the keystone) carrying a geometric "K".
// The bolt where the K's strokes meet is a nod to field maintenance work.
// Same artwork as public/keystone-logo.svg (used as the favicon).
export const KeystoneLogo: React.FC<KeystoneLogoProps> = ({ size = 48, title = 'KEYSTONE' }) => {
  const id = useId().replace(/:/g, '');
  const fill = `ks-logo-fill-${id}`;
  const shine = `ks-logo-shine-${id}`;

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title} style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={fill} x1="8" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={shine} x1="32" y1="2" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M32 2.5 57.5 17.25v29.5L32 61.5 6.5 46.75v-29.5z" fill={`url(#${fill})`} />
      <path d="M32 2.5 57.5 17.25 32 32 6.5 17.25z" fill={`url(#${shine})`} />
      <path d="M32 61.5 57.5 46.75V32L32 46.5z" fill="#1e1b4b" fillOpacity="0.22" />
      <path d="M32 2.5 57.5 17.25v29.5L32 61.5 6.5 46.75v-29.5z" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="19" y="16" width="8.5" height="32" rx="1.5" fill="#0b1235" />
      <path d="M27.5 31.5 39.5 16h10L34 35.5z" fill="#0b1235" />
      <path d="M31.5 34 49.5 48h-10.5L27.5 38.5z" fill="#0b1235" />
      <circle cx="30.5" cy="34" r="3" fill="#ffffff" />
      <circle cx="30.5" cy="34" r="1.2" fill="#6366f1" />
    </svg>
  );
};
