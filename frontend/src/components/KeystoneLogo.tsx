import React from 'react';

interface KeystoneLogoProps {
  size?: number;
  title?: string;
}

// KEYSTONE mark: a house outline with a chimney, holding a bold "K".
// Lines use currentColor (navy on white, white on navy); the K's arm is primary blue.
// Same artwork as public/keystone-logo.svg (used as the favicon).
export const KeystoneLogo: React.FC<KeystoneLogoProps> = ({ size = 48, title = 'KEYSTONE' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title} style={{ display: 'block', flexShrink: 0 }}>
    {/* roof + walls */}
    <path d="M6 31 32 8l26 23" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 27v29h38V40" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* chimney */}
    <path d="M43 15V9h7v12.5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
    {/* K */}
    <rect x="21" y="27" width="8" height="25" rx="1.2" fill="currentColor" />
    <path d="M29 40.5 41.5 27h9.5L36.2 42.8z" fill="#075bb5" />
    <path d="M33.6 40.8 50.5 52H40.3l-10.6-7.6z" fill="currentColor" />
  </svg>
);
